import { headers } from "next/headers"
import { notFound } from "next/navigation"
import type { Institution } from "@/types/institution"

export const getInstitutionContext = async (): Promise<Institution | null> => {
  const headerStore = await headers()
  const id = headerStore.get("x-institution-id")
  if (!id) return null

  const slug = headerStore.get("x-institution-slug") || ""
  const name = headerStore.get("x-institution-name") || "Institucion"
  const logo_url = headerStore.get("x-institution-logo")
  return {
    id,
    slug,
    name,
    logo_url: logo_url || null,
  }
}

export const requireInstitution = async (): Promise<Institution> => {
  const institution = await getInstitutionContext()
  if (!institution) notFound()
  return institution
}
