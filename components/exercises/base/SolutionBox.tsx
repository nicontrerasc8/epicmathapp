'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function SolutionBox({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">✨</span>
        <p className="font-bold text-emerald-900">Solución</p>
      </div>
      {children}
    </motion.div>
  )
}


