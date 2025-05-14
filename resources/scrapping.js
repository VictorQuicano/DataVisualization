(function () {
  const data = [];

  document.querySelectorAll("ytd-item-section-renderer").forEach((section) => {
    const titleElem = section.querySelector("#title");
    const fecha = titleElem ? titleElem.textContent.trim() : null;

    const videos = [];
    section.querySelectorAll("ytd-video-renderer").forEach((video) => {
      const tituloElem = video.querySelector(
        "#title-wrapper yt-formatted-string"
      );
      const thumbnailElem = video.querySelector("a#thumbnail img").src;
      const videoUrlElem = video.querySelector("a#video-title");
      const videoUrl = videoUrlElem ? videoUrlElem.href : null;
      const canalElem = video.querySelector(
        "ytd-channel-name #text-container a"
      );
      const overlay = video.querySelector(
        "ytd-thumbnail-overlay-time-status-renderer"
      );
      const badge = overlay ? overlay.querySelector("badge-shape") : null;
      const duracionText = overlay
        ? overlay.querySelector("div")?.textContent.trim()
        : null;

      videos.push({
        titulo: tituloElem ? tituloElem.textContent.trim() : null,
        thumbnail: thumbnailElem ?? null,
        videoUrl: videoUrl,
        canal: canalElem ? canalElem.textContent.trim() : null,
        duracion: duracionText,
      });
    });

    data.push({ fecha, videos });
  });

  // Descargar como archivo JSON
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "videos-scrap.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
})();
