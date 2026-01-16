'use client'

import { createContext, useContext } from 'react'
import type { Institution } from '@/types/institution'

const InstitutionContext = createContext<Institution | null>(null)

export function InstitutionProvider({
  institution,
  children,
}: {
  institution: Institution | null
  children: React.ReactNode
}) {
  return (
    <InstitutionContext.Provider value={institution}>
      {children}
    </InstitutionContext.Provider>
  )
}

export function useInstitution() {
  return useContext(InstitutionContext)
}
