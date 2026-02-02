import { headers } from "next/headers"
import { notFound } from "next/navigation"
import type { Institution } from "@/types/institution"
import fs from "fs"
import path from "path"

const logoExtensions = ["png", "jpg", "jpeg", "svg", "webp"]

const resolveInstitutionLogo = (slug?: string | null) => {
  if (!slug) return null
  const base = path.join(process.cwd(), "public", "logos")
  for (const ext of logoExtensions) {
    const filename = `${slug}.${ext}`
    const fullPath = path.join(base, filename)
    if (fs.existsSync(fullPath)) {
      return `/logos/${filename}`
    }
  }
  return null
}

export const getInstitutionContext = async (): Promise<Institution | null> => {
  const headerStore = await headers()
  const id = headerStore.get("x-institution-id")
  if (!id) return null

  const slug = headerStore.get("x-institution-slug") || ""
  const name = headerStore.get("x-institution-name") || "Institucion"
  let logo_url = headerStore.get("x-institution-logo")
  if (!logo_url) {
    logo_url = resolveInstitutionLogo(slug)
  }
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
