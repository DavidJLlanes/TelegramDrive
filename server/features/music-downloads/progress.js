export function progressLine(line) {
  const percent = /download:\s*(\d+(?:\.\d+)?)%/.exec(line);
  const speed = /speed:\s*([\d.]+\s*[KMGT]?i?B\/s)/i.exec(line);
  const eta = /eta:\s*(\d{1,2}:\d{2}(?::\d{2})?)/i.exec(line);
  return {
    ...(percent ? { progress: Math.min(75, Math.round(Number(percent[1]) * 0.75)) } : {}),
    speed: speed?.[1] || '',
    eta: eta?.[1] || '',
  };
}
