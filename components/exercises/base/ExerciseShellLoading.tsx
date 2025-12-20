'use client'

export function ExerciseShellLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-3xl bg-card border rounded-2xl p-6">
        <div className="h-6 w-40 bg-muted rounded mb-4 animate-pulse" />
        <div className="h-4 w-full bg-muted rounded mb-2 animate-pulse" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}
