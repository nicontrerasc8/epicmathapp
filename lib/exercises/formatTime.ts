export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : `${ss}s`
}
