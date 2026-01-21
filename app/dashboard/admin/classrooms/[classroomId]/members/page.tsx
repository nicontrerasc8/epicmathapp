"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  PageHeader,
  DataTable,
  StatusBadge,
  type ColumnDef
} from "@/components/dashboard/core"
import { useInstitution } from "@/components/institution-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as XLSX from "xlsx"
import {
  addMemberToClassroomAction,
  createStudentAction,
  listStudentsAction,
} from "../../../admin-actions"
import { importUsersAction } from "@/app/dashboard/admin/students/import/import.actions"

interface Member {
  id: string
  role: string
  active: boolean
  profile: {
    first_name: string
    last_name: string
    email: string
  }
}

type InstitutionMember = {
  id: string
  role: string
  active: boolean
  institution_id: string | null
  edu_classroom_members?:
    | {
        classroom_id: string
      }[]
    | {
        classroom_id: string
      }
    | null
}

type UserRow = {
  id: string
  first_name: string
  last_name: string
  global_role: "student" | "teacher" | "admin" | null
  active: boolean
  edu_institution_members?: InstitutionMember[]
}

type BulkRow = {
  first_name: string
  last_name: string
  email: string
  password: string
  status: "pending" | "ok" | "error"
  message?: string
}

const columns: ColumnDef<Member>[] = [
  {
    key: "name",
    header: "Nombre",
    render: (_, row) => (
      <div className="font-medium">
        {row.profile.first_name} {row.profile.last_name}
      </div>
    ),
  },
  {
    key: "role",
    header: "Rol",
    render: (val) => <span className="capitalize">{val}</span>,
  },
  {
    key: "active",
    header: "Estado",
    render: (val) => <StatusBadge active={val} />,
  },
]

function getPrimaryMembership(user: UserRow) {
  const members = user.edu_institution_members || []
  const active = members.find((m) => m.active)
  return active || members[0]
}

function getClassroomMemberships(member?: InstitutionMember) {
  const cms = member?.edu_classroom_members
  return Array.isArray(cms) ? cms : cms ? [cms] : []
}

function normalizeName(s: string) {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/\s+/g, "")
}

function slugifyInstitution(name: string) {
  const base = (name ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
  return base || "academia"
}

function generatePassword(len = 10) {
  const a = Math.random().toString(36).slice(2)
  const b = Math.random().toString(36).toUpperCase().slice(2)
  return (a + b).slice(0, len)
}

export default function ClassroomMembersPage() {
  const params = useParams()
  const classroomId = params.classroomId as string
  const institution = useInstitution()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState<"existing" | "new" | "bulk">("existing")
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchRole, setSearchRole] = useState<"student" | "teacher" | "all">("student")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<UserRow[]>([])

  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student",
  })
  const [creating, setCreating] = useState(false)

  const [bulkFileName, setBulkFileName] = useState<string | null>(null)
  const [bulkPreview, setBulkPreview] = useState<BulkRow[]>([])
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkCreating, setBulkCreating] = useState(false)

  const institutionSlug = useMemo(() => {
    if (institution?.slug) return institution.slug
    return slugifyInstitution(institution?.name || "")
  }, [institution?.name, institution?.slug])

  useEffect(() => {
    const fetchMembers = async () => {
      const supabase = createClient()
      let query = supabase
        .from("edu_classroom_members")
        .select(`
          edu_institution_members!inner (
            id,
            role,
            active,
            institution_id,
            profile:edu_profiles ( first_name, last_name, email )
          )
        `)
        .eq("classroom_id", classroomId)

      if (institution?.id) {
        query = query.eq("edu_institution_members.institution_id", institution.id)
      }

      const { data } = await query

      if (data) {
        setMembers(data.map((row: any) => {
          const member = Array.isArray(row.edu_institution_members)
            ? row.edu_institution_members[0]
            : row.edu_institution_members
          return {
            id: member.id,
            role: member.role,
            active: member.active,
            profile: member.profile
          }
        }))
      }
      setLoading(false)
    }
    fetchMembers()
  }, [classroomId, institution?.id])

  const reloadMembers = async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from("edu_classroom_members")
      .select(`
        edu_institution_members!inner (
          id,
          role,
          active,
          institution_id,
          profile:edu_profiles ( first_name, last_name, email )
        )
      `)
      .eq("classroom_id", classroomId)

    if (institution?.id) {
      query = query.eq("edu_institution_members.institution_id", institution.id)
    }

    const { data } = await query
    if (data) {
      setMembers(data.map((row: any) => {
        const member = Array.isArray(row.edu_institution_members)
          ? row.edu_institution_members[0]
          : row.edu_institution_members
        return {
          id: member.id,
          role: member.role,
          active: member.active,
          profile: member.profile
        }
      }))
    }
    setLoading(false)
  }

  const handleSearch = async () => {
    setSearching(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const data: any = await listStudentsAction(searchQuery, searchRole)
      setSearchResults((data ?? []) as UserRow[])
    } catch (err: any) {
      setActionError(err?.message ?? "No se pudieron cargar los usuarios.")
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddExisting = async (user: UserRow) => {
    const member = getPrimaryMembership(user)
    if (!member?.id) {
      setActionError("Este usuario no tiene membresia activa en la institucion.")
      return
    }
    try {
      setActionError(null)
      await addMemberToClassroomAction({
        institution_member_id: member.id,
        classroom_id: classroomId,
      })
      setActionSuccess("Miembro agregado al aula.")
      await reloadMembers()
    } catch (err: any) {
      setActionError(err?.message ?? "No se pudo agregar al aula.")
    }
  }

  const handleCreate = async () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) {
      setActionError("Completa nombre y apellido.")
      return
    }
    if (!createForm.email.trim()) {
      setActionError("Completa el correo.")
      return
    }

    try {
      setCreating(true)
      setActionError(null)
      const result = await createStudentAction({
        email: createForm.email.trim(),
        password: createForm.password.trim() || undefined,
        first_name: createForm.firstName.trim(),
        last_name: createForm.lastName.trim(),
        role: createForm.role as "student" | "teacher",
        classroom_id: classroomId,
      })
      const passwordInfo = result?.password ? ` Password: ${result.password}` : ""
      setActionSuccess(`Usuario creado y asignado.${passwordInfo}`)
      setCreateForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "student",
      })
      await reloadMembers()
    } catch (err: any) {
      setActionError(err?.message ?? "No se pudo crear el usuario.")
    } finally {
      setCreating(false)
    }
  }

  const parseExcel = async (file: File) => {
    setBulkError(null)
    setBulkFileName(file.name)

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" })

    const extracted = raw
      .map((r) => ({
        first_name: String(r.first_name || r.nombre || r.Nombre || "").trim(),
        last_name: String(r.last_name || r.apellido || r.Apellido || "").trim(),
      }))
      .filter((r) => r.first_name && r.last_name)

    if (!extracted.length) {
      setBulkError("No encontre filas. Usa columnas first_name y last_name.")
      setBulkPreview([])
      return
    }

    const used = new Map<string, number>()
    const previewRows: BulkRow[] = extracted.map((r) => {
      const baseLocal = `${normalizeName(r.first_name)}.${normalizeName(r.last_name)}`.replace(
        /\.+/g,
        ".",
      )
      const key = `${baseLocal}@${institutionSlug}`
      const n = (used.get(key) ?? 0) + 1
      used.set(key, n)

      const local = n === 1 ? baseLocal : `${baseLocal}.${n}`
      const email = `${local}@${institutionSlug}.ludus.edu`

      return {
        first_name: r.first_name,
        last_name: r.last_name,
        email,
        password: generatePassword(10),
        status: "pending",
      }
    })

    setBulkPreview(previewRows)
  }

  const createBulkStudents = async () => {
    if (!institution?.id) {
      setBulkError("No se encontro la institucion.")
      return
    }
    if (!bulkPreview.length) {
      setBulkError("No hay preview cargado.")
      return
    }

    setBulkCreating(true)
    setBulkError(null)
    try {
      const payload = bulkPreview.map((r) => ({
        email: r.email,
        password: r.password,
        first_name: r.first_name,
        last_name: r.last_name,
        role: "student" as const,
        institution_id: institution.id,
        classroom_id: classroomId,
      }))
      const report: any = await importUsersAction(payload as any)

      setBulkPreview((prev) =>
        prev.map((row) => {
          const failed = report?.failed?.find((f: any) => f.email === row.email)
          if (failed) {
            return { ...row, status: "error", message: failed.error }
          }
          const created = report?.created?.find((c: any) => c.email === row.email)
          return created
            ? { ...row, status: "ok", message: "OK" }
            : row
        })
      )
      await reloadMembers()
    } catch (err: any) {
      setBulkError(err?.message ?? "No se pudo importar.")
    } finally {
      setBulkCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Miembros del Aula"
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            Agregar miembros
          </Button>
        }
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Aulas", href: "/dashboard/admin/classrooms" },
          { label: "Detalle", href: `/dashboard/admin/classrooms/${classroomId}` },
          { label: "Miembros" },
        ]}
      />

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-base font-semibold">Agregar miembros</div>
                <div className="text-sm text-muted-foreground">
                  Puedes agregar usuarios existentes, crear nuevos o importar estudiantes.
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                Cerrar
              </Button>
            </div>

            <div className="border-b px-5 py-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={tab === "existing" ? "default" : "outline"}
                onClick={() => setTab("existing")}
              >
                Usuarios existentes
              </Button>
              <Button
                size="sm"
                variant={tab === "new" ? "default" : "outline"}
                onClick={() => setTab("new")}
              >
                Crear usuario
              </Button>
              <Button
                size="sm"
                variant={tab === "bulk" ? "default" : "outline"}
                onClick={() => setTab("bulk")}
              >
                Importar Excel (estudiantes)
              </Button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {actionError && <p className="text-sm text-destructive">{actionError}</p>}
              {actionSuccess && <p className="text-sm text-foreground">{actionSuccess}</p>}

              {tab === "existing" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Buscar por nombre</Label>
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Nombre o apellido"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <select
                        value={searchRole}
                        onChange={(e) => setSearchRole(e.target.value as any)}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="student">Estudiante</option>
                        <option value="teacher">Profesor</option>
                        <option value="all">Todos</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSearch} disabled={searching}>
                      {searching ? "Buscando..." : "Buscar"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {searchResults.length} resultados
                    </span>
                  </div>

                  <div className="rounded-xl border">
                    <div className="max-h-[360px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr className="text-left">
                            <th className="px-3 py-2">Nombre</th>
                            <th className="px-3 py-2">Rol</th>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2 w-[160px]">Accion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchResults.map((user) => {
                            const member = getPrimaryMembership(user)
                            const classroomIds = getClassroomMemberships(member).map((c) => c.classroom_id)
                            const alreadyInClass = classroomIds.includes(classroomId)
                            return (
                              <tr key={user.id} className="border-t">
                                <td className="px-3 py-2">
                                  {user.first_name} {user.last_name}
                                </td>
                                <td className="px-3 py-2 capitalize">{user.global_role || member?.role}</td>
                                <td className="px-3 py-2">
                                  <StatusBadge active={user.active} />
                                </td>
                                <td className="px-3 py-2">
                                  <Button
                                    size="sm"
                                    variant={alreadyInClass ? "outline" : "default"}
                                    disabled={alreadyInClass}
                                    onClick={() => handleAddExisting(user)}
                                  >
                                    {alreadyInClass ? "Ya asignado" : "Agregar"}
                                  </Button>
                                </td>
                              </tr>
                            )
                          })}
                          {!searchResults.length && (
                            <tr>
                              <td className="px-3 py-6 text-muted-foreground" colSpan={4}>
                                No hay resultados. Usa el buscador para listar usuarios.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {tab === "new" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={createForm.firstName}
                        onChange={(e) => setCreateForm((s) => ({ ...s, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido</Label>
                      <Input
                        value={createForm.lastName}
                        onChange={(e) => setCreateForm((s) => ({ ...s, lastName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Correo</Label>
                      <Input
                        value={createForm.email}
                        onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password (opcional)</Label>
                      <Input
                        value={createForm.password}
                        onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <select
                        value={createForm.role}
                        onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value }))}
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="student">Estudiante</option>
                        <option value="teacher">Profesor</option>
                      </select>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleCreate} disabled={creating}>
                    {creating ? "Creando..." : "Crear y asignar"}
                  </Button>
                </div>
              )}

              {tab === "bulk" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Archivo Excel</Label>
                      <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          parseExcel(f)
                        }}
                      />
                      {bulkFileName && (
                        <div className="text-xs text-muted-foreground">
                          Archivo: <span className="font-mono">{bulkFileName}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Dominio</Label>
                      <Input value={`${institutionSlug}.ludus.edu`} readOnly />
                    </div>
                  </div>

                  {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}

                  <div className="rounded-xl border">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <div className="text-sm font-medium">
                        Preview ({bulkPreview.length})
                      </div>
                      <Button
                        size="sm"
                        onClick={createBulkStudents}
                        disabled={bulkCreating || !bulkPreview.length}
                      >
                        {bulkCreating ? "Creando..." : "Crear estudiantes"}
                      </Button>
                    </div>
                    <div className="max-h-[360px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted">
                          <tr className="text-left">
                            <th className="px-3 py-2">Nombre</th>
                            <th className="px-3 py-2">Correo</th>
                            <th className="px-3 py-2">Password</th>
                            <th className="px-3 py-2 w-[160px]">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreview.map((r, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-3 py-2">
                                {r.first_name} {r.last_name}
                              </td>
                              <td className="px-3 py-2 font-mono">{r.email}</td>
                              <td className="px-3 py-2 font-mono">{r.password}</td>
                              <td className="px-3 py-2">
                                {r.status === "ok" ? (
                                  <span className="text-green-600">OK</span>
                                ) : r.status === "error" ? (
                                  <span className="text-destructive">
                                    Error{r.message ? `: ${r.message}` : ""}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {r.message || "Pendiente"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {!bulkPreview.length && (
                            <tr>
                              <td className="px-3 py-6 text-muted-foreground" colSpan={4}>
                                Sube un Excel para ver el preview.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={members}
        loading={loading}
        emptyState={{
          title: "miembros",
          description: "No hay miembros asignados a esta aula."
        }}
      />
    </div>
  )
}
