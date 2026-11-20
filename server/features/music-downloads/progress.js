export function progressLine(line) {
  const percent = /download:\s*(\d+(?:\.\d+)?)%/.exec(line);
  if (percent) return { progress: Math.min(75, Math.round(Number(percent[1]) * 0.75)) };
  const speed = /(?:at|speed:)\s*([\d.]+\s*[KMGT]?i?B\/s)/i.exec(line);
  const eta = /ETA\s+(\d{1,2}:\d{2}(?::\d{2})?)/i.exec(line);
  return { speed: speed?.[1] || '', eta: eta?.[1] || '' };
}
