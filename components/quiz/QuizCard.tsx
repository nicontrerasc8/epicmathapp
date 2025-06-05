'use client'

import { useRouter } from 'next/navigation'

interface Quiz {
  id: string
  title: string
  description: string
}

interface QuizCardProps {
  quiz: Quiz
}

export function QuizCard({ quiz }: QuizCardProps) {
  const router = useRouter()

  return (
    <div
      className="bg-card p-5 rounded-xl border border-border shadow-md hover:bg-accent hover:scale-[1.02] transition-all cursor-pointer"
    
    >
      <h2 className="text-xl font-bold mb-2">{quiz.title}</h2>
      <p className="text-sm text-muted-foreground">{quiz.description}</p>
    </div>
  )
}
