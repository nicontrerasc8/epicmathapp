'use client'

import { useRouter } from 'next/navigation'

interface Game {
  id: string
  title: string
  description: string
}

export function GameCard({ game }: { game: Game }) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/student/play/${game.id}`)}
      className="bg-card p-6 rounded-xl border hover:bg-accent cursor-pointer transition-all shadow-md flex flex-col justify-between"
    >
      <h2 className="text-lg font-bold mb-2">{game.title}</h2>
      <p className="text-sm text-muted-foreground">{game.description}</p>
    </div>
  )
}
