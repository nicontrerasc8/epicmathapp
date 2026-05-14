export type TimedTask = {
  active?: boolean | null
  status?: string | null
  available_from?: string | null
  available_until?: string | null
}

export function getTaskWindowState(
  task: TimedTask,
  now = new Date(),
): "disabled" | "draft" | "upcoming" | "open" | "closed" {
  if (task.active === false || task.status === "archived") return "disabled"
  if (task.status !== "published") return "draft"

  const startsAt = task.available_from ? new Date(task.available_from) : null
  const endsAt = task.available_until ? new Date(task.available_until) : null

  if (startsAt && startsAt.getTime() > now.getTime()) return "upcoming"
  if (endsAt && endsAt.getTime() < now.getTime()) return "closed"
  return "open"
}

export function isTaskAvailableNow(task: TimedTask, now = new Date()) {
  return getTaskWindowState(task, now) === "open"
}

export function formatTaskDateTime(value: string | null) {
  if (!value) return "Sin fecha"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin fecha"

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function toDatetimeInputValue(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function fromDatetimeInputValue(value: string) {
  return value ? new Date(value).toISOString() : null
}
