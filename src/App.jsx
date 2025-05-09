import { useState } from "react";
import "./App.css";
import Treemap from "./Graph.jsx";
import data from "./resources/videos-scrap.json";
import sampleData from "./resources/sampleData.json";
import { timeToSeconds } from "../utils/tools.js";
import ZoomableTreemap from "./ZoomableTree.jsx";
import TreemapChart from "./ZoomableTree.jsx";
import { parse, format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

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

function groupVideosByWeek(data) {
  const today = new Date();

  // 1) Convert video.duracion to seconds, handling special labels
  function normalizeDuration(label) {
    if (typeof label !== "string") return 0;
    const name = label.trim().toUpperCase();
    if (name === "SHORTS") return "00:30"; // 30 seconds
    if (name === "EN DIRECTO" || name === "EN VIVO") return "05:00:00"; // assume 5h default
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

  // 2) Resolve Spanish date labels to Date objects
  function resolveDate(str) {
    const lower = String(str).toLowerCase();
    if (lower === "hoy") return today;
    if (lower === "ayer")
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1
      );
    // weekdays mapping
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
    // parse absolute Spanish date like "2 may", "20 abril"
    try {
      return parse(str, "d MMM", today, { locale: es });
    } catch (e) {
      console.warn(`No se pudo parsear la fecha "${str}".`);
      return null;
    }
  }

  // 3) Flatten all videos with resolved Date and computed seconds
  const flat = [];
  data.forEach((dayEntry) => {
    const dt = resolveDate(dayEntry.fecha);
    if (!dt) return;
    dayEntry.videos.forEach((video) => {
      const norm = normalizeDuration(video.duracion);
      video.value = timeToSeconds(norm);
      video.name = video.titulo;
      flat.push({ date: dt, video });
    });
  });

  // 4) Group by exact date (yyyy-MM-dd)
  const byDate = {};
  flat.forEach(({ date, video }) => {
    const key = format(date, "yyyy-MM-dd");
    if (!byDate[key]) byDate[key] = { date, videos: [] };
    byDate[key].videos.push(video);
  });

  // 5) Sort dates and group into weeks
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
    if (!weeksMap[weekKey])
      weeksMap[weekKey] = { start: weekStart, end: weekEnd, days: {} };
    const dayName = format(date, "EEEE", { locale: es });
    weeksMap[weekKey].days[dayName] = videos;
  });

  // 6) Build final structure
  return Object.values(weeksMap).map((w) => ({
    name: `del ${format(w.start, "d 'de' MMMM", { locale: es })} al ${format(
      w.end,
      "d 'de' MMMM",
      { locale: es }
    )}`,
    children: Object.entries(w.days).map(([day, vids]) => ({
      name: capitalize(day),
      children: vids,
    })),
  }));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function App() {
  let dataS = JSON.stringify(groupVideosByWeek(data), null, 2);
  dataS = JSON.parse(dataS);

  dataS = {
    name: "root",
    children: dataS,
  };

  console.log("dataS", dataS);
  return (
    <div className="w-full h-screen flex justify-center items-center bg-gray-100">
      <h1>Data from</h1>
      <ZoomableTreemap data={dataS} width={1154} height={1154} />
    </div>
  );
  //<Treemap data={dataS} width={1154} height={1154} />
}

export default App;
