import { parse, format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import metadata from "../resources/metatags.json";
import { meta } from "@eslint/js";

export function timeToSeconds(timeStr) {
  const parts = timeStr.split(":").map(Number);

  if (parts.length === 3) {
    // hh:mm:ss
    const [hh, mm, ss] = parts;
    return hh * 3600 + mm * 60 + ss;
  } else if (parts.length === 2) {
    // mm:ss
    const [mm, ss] = parts;
    return mm * 60 + ss;
  } else {
    throw new Error("Formato no válido. Usa hh:mm:ss o mm:ss");
  }
}

/**
 * Input: array of objects { fecha: string, videos: Array }
 * "fecha" can be relative in Spanish (Hoy, ayer, lunes, etc.) or absolute ("2 may", "20 abril").
 *
 * Output: Array of week-groups:
 * [
 *   {
 *     name: "del dd 'de' MMM 'al' dd 'de' MMM",
 *     children: [
 *       { name: "Lunes", children: [ ...videos ] },
 *       ...
 *     ]
 *   }
 * ]
 */

const dayToEmoji = {
  domingo: "☀️",
  lunes: "😩",
  martes: "💪",
  miércoles: "🐪",
  jueves: "🫂",
  viernes: "🎉",
  sábado: "😎",
};

export function groupVideosByWeek(data) {
  const today = new Date();

  // 1) Normalización de duración
  function normalizeDuration(label) {
    if (typeof label !== "string") return 0;
    const name = label.trim().toUpperCase();
    if (name === "SHORTS") return "00:30";
    if (name === "EN DIRECTO" || name === "EN VIVO") return "05:00:00";
    return label;
  }

  function timeToSeconds(timeStr) {
    if (typeof timeStr !== "string" || !timeStr.includes(":")) {
      console.warn(`Duración inesperada: "${timeStr}". Se devolverá 0.`);
      return 0;
    }
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 3) {
      const [hh, mm, ss] = parts;
      return hh * 3600 + mm * 60 + ss;
    }
    if (parts.length === 2) {
      const [mm, ss] = parts;
      return mm * 60 + ss;
    }
    console.warn(
      `Formato no válido: "${timeStr}". Usa hh:mm:ss o mm:ss. Se devolverá 0.`
    );
    return 0;
  }

  // 2) Resolución de fechas
  function resolveDate(str) {
    const lower = String(str).toLowerCase();
    if (lower === "hoy") return today;
    if (lower === "ayer")
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1
      );

    const weekdays = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];
    const idx = weekdays.indexOf(lower);
    if (idx >= 0) {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      return new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + idx
      );
    }

    try {
      return parse(str, "d MMM", today, { locale: es });
    } catch (e) {
      console.warn(`No se pudo parsear la fecha "${str}".`);
      return null;
    }
  }

  // 3) Mapeo de tags a metatags
  function buildTagToMeta(metadata) {
    const tagToMeta = {};
    for (const [metaName, metaInfo] of Object.entries(metadata)) {
      for (const tag of metaInfo.tags) {
        tagToMeta[tag.toLowerCase()] = metaName;
      }
    }
    return tagToMeta;
  }

  const tagToMeta = buildTagToMeta(metadata);

  // 4) Aplanar y procesar videos
  const flat = [];
  data.forEach((dayEntry) => {
    const dt = resolveDate(dayEntry.fecha);
    if (!dt) return;

    dayEntry.videos.forEach((video) => {
      const norm = normalizeDuration(video.duracion);
      video.value = timeToSeconds(norm);
      video.name = video.titulo;
      video.metatag = tagToMeta[video.tag?.toLowerCase()] || "Otros";
      flat.push({ date: dt, video });
    });
  });

  // 5) Agrupar por fecha exacta
  const byDate = {};
  flat.forEach(({ date, video }) => {
    const key = format(date, "yyyy-MM-dd");
    if (!byDate[key]) byDate[key] = { date, videos: [] };
    byDate[key].videos.push(video);
  });

  // 6) Ordenar fechas y agrupar por semanas
  const dateKeys = Object.keys(byDate).sort();
  const weeksMap = {};

  dateKeys.forEach((key) => {
    const { date, videos } = byDate[key];
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const weekKey = `${format(weekStart, "yyyy-MM-dd")}|${format(
      weekEnd,
      "yyyy-MM-dd"
    )}`;

    if (!weeksMap[weekKey]) {
      weeksMap[weekKey] = { start: weekStart, end: weekEnd, days: {} };
    }

    const dayName = format(date, "EEEE", { locale: es });
    weeksMap[weekKey].days[dayName] = videos;
  });

  // Función para calcular el metatag más frecuente
  function getMostFrequentMetatag(videos) {
    const metaCount = {};

    videos.forEach((video) => {
      const meta = video.metatag;
      metaCount[meta] = (metaCount[meta] || 0) + 1;
    });

    return Object.entries(metaCount).reduce(
      (a, b) => (b[1] > a[1] ? b : a),
      ["Otros", 0]
    )[0];
  }

  // 7) Construir estructura final
  return Object.values(weeksMap).map((w) => {
    const dayEntries = Object.entries(w.days).map(([day, vids]) => {
      const dayLower = day.toLowerCase();
      const emoji = dayToEmoji[dayLower] || capitalize(dayLower);

      // Video más largo del día
      const topVideo = vids.reduce(
        (a, b) => (a.value > b.value ? a : b),
        vids[0]
      );

      // Agrupar por metatag
      const metaGroups = {};
      vids.forEach((video) => {
        const meta = video.metatag;
        if (!metaGroups[meta]) metaGroups[meta] = [];
        metaGroups[meta].push(video);
      });

      // Metatag más frecuente del día
      const dayMetatag = getMostFrequentMetatag(vids);

      const metaChildren = Object.entries(metaGroups).map(
        ([metaName, videos]) => {
          const metaTopVideo = videos.reduce(
            (a, b) => (a.value > b.value ? a : b),
            videos[0]
          );

          const emoji = metadata[metaName]?.emoji || metaName;
          const color = metadata[metaName]?.color || "#fff";

          return {
            name: emoji,
            thumbnail: metaTopVideo.thumbnail,
            metatag: color, // Seguimos guardando el metatag original
            children: videos,
          };
        }
      );
      return {
        name: emoji,
        thumbnail: topVideo.thumbnail,
        metatag: metadata[dayMetatag]?.color || dayMetatag,
        children: metaChildren,
      };
    });

    const allVideos = dayEntries.flatMap((d) =>
      d.children.flatMap((c) => c.children)
    );
    const weekTopVideo = allVideos.reduce(
      (a, b) => (a.value > b.value ? a : b),
      allVideos[0]
    );
    const weekMetatag = getMostFrequentMetatag(allVideos);

    const numDays = dayEntries.length;
    const weekEmoji = "📅".repeat(numDays);

    return {
      name: weekEmoji,
      thumbnail: weekTopVideo.thumbnail,
      metatag: metadata[weekMetatag]?.color || weekMetatag,
      children: dayEntries,
    };
  });
}

// Función auxiliar para capitalizar strings
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
