'use client'

import { SumGame } from "@/components/sum/SumGame"


export default function PlayPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <SumGame />
    </div>
  )
}
