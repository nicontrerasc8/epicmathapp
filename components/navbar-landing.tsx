'use client'

import Link from 'next/link'
import { User } from 'lucide-react'

export default function LandingNavbar() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-2 px-6 py-2 font-medium text-primary border-2 border-primary rounded-full bg-white hover:bg-secondary hover:text-white transition-colors duration-300"
      >
        <User className="w-4 h-4" />
        Iniciar sesion
      </Link>
    </div>
  )
}
