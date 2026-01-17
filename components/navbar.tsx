'use client'

import { usePathname } from 'next/navigation'
import LandingNavbar from '@/components/navbar-landing'
import StudentNavbar from '@/components/navbar-student'
import StaffNavbar from '@/components/navbar-staff'

export default function Navbar() {
  const pathname = usePathname()

  if (pathname.startsWith('/student')) {
    return <StudentNavbar />
  }

  if (pathname.startsWith('/dashboard')) {
    return <StaffNavbar />
  }

  return <LandingNavbar />
}
