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
