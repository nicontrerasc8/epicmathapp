"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { Eye, Edit, Trash2, UserPlus, Download, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/utils/supabase/client"
import {
  PageHeader,
  FilterBar,
  useFilters,
  DataTable,
  StatusBadge,
  RowActionsMenu,
  type ColumnDef,
  type FilterConfig,
} from "@/components/dashboard/core"
import {
  listStudentsAction,
  listClassroomsAction,
  createStudentAction,
  updateStudentAction,
  deactivateStudentAction,
} from "../admin-actions"

// =====================
// Types
// =====================
type Student = {
  id: string
  first_name: string
  last_name: string
  full_name: string
  global_role: "student" | "teacher" | "admin" | null
  active: boolean
  created_at?: string
  edu_institution_members?: InstitutionMember[]
}

type InstitutionMember = {
  id: string
  role: string
  active: boolean
  institution_id: string | null
  edu_institutions?: { id: string; name: string } | null
  edu_classroom_members?:
    | {
        classroom_id: string
        edu_classrooms?: {
          id: string
          academic_year: number
          grade: string
          section?: string | null
        } | null
      }[]
    | {
        classroom_id: string
        edu_classrooms?: {
          id: string
          academic_year: number
          grade: string
          section?: string | null
        } | null
      }
    | null
}

type ClassroomOption = {
  id: string
  institution_id: string | null
  academic_year: number
  grade: string
  section?: string | null
  active?: boolean
  edu_institutions?: { id: string; name: string; slug?: string | null } | null
}

type BulkRow = {
  first_name: string
  last_name: string
  email: string
  password: string
  status: "pending" | "ok" | "error"
  message?: string
}

const pageSizeOptions = [10, 20, 50, 100]

function getPrimaryMembership(student: Student) {
  const members = student.edu_institution_members || []
  const active = members.find((m) => m.active)
  return active || members[0]
}

function getClassroomMemberships(member?: InstitutionMember) {
  const cms = member?.edu_classroom_members
  return Array.isArray(cms) ? cms : cms ? [cms] : []
}

function getPrimaryClassroom(member?: InstitutionMember) {
  return getClassroomMemberships(member)[0]
}

function getMembershipGrade(member?: InstitutionMember) {
  const primary = getPrimaryClassroom(member)
  if (!primary?.edu_classrooms) return ""
  const grade = primary.edu_classrooms.grade || ""
  const section = primary.edu_classrooms.section || ""
  return `${grade} ${section}`.trim()
}

function getClassroomLabel(cls: ClassroomOption) {
  const grade = cls.grade || ""
  const section = cls.section || ""
  return `${grade} ${section}`.trim()
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
  // alfanum + un toque de mezcla
  const a = Math.random().toString(36).slice(2)
  const b = Math.random().toString(36).toUpperCase().slice(2)
  return (a + b).slice(0, len)
}

// =====================
// Filter configuration
// =====================
const filterConfigs: FilterConfig[] = [
  {
    key: "search",
    type: "search",
    label: "Buscar",
    placeholder: "Buscar por nombre o ID...",
  },
  {
    key: "role",
    type: "select",
    label: "Rol",
    options: [
      { value: "student", label: "Estudiante" },
      { value: "teacher", label: "Profesor" },
    ],
  },
  {
    key: "active",
    type: "toggle",
    label: "Estado",
    options: [
      { value: "", label: "Todos" },
      { value: "true", label: "Activos" },
      { value: "false", label: "Inactivos" },
    ],
  },
]

// =====================
// Column definitions
// =====================
const columns: ColumnDef<Student>[] = [
  {
    key: "full_name",
    header: "Nombre",
    sortable: true,
    render: (_, row) => <div className="font-medium">{row.full_name}</div>,
  },
  {
    key: "role",
    header: "Rol",
    width: "120px",
    render: (_, row) => (
      <span className="text-sm capitalize">{row.global_role || "sin rol"}</span>
    ),
  },
  {
    key: "institution",
    header: "Institucion",
    render: (_, row) => {
      const member = getPrimaryMembership(row)
      return (
        <span className="text-sm">
          {member?.edu_institutions?.name || "Sin institucion"}
        </span>
      )
    },
  },
  {
    key: "grade",
    header: "Grado",
    render: (_, row) => {
      const member = getPrimaryMembership(row)
      return (
        <span className="text-sm">{getMembershipGrade(member) || "Sin grado"}</span>
      )
    },
  },
  {
    key: "academic_year",
    header: "Ano",
    width: "90px",
    render: (_, row) => {
      const member = getPrimaryMembership(row)
      return (
        <span className="text-xs text-muted-foreground">
          {getPrimaryClassroom(member)?.edu_classrooms?.academic_year || "—"}
        </span>
      )
    },
  },
  {
    key: "id",
    header: "ID",
    width: "200px",
    render: (value) => (
      <span className="font-mono text-xs text-muted-foreground">
        {value.slice(0, 8)}...
      </span>
    ),
  },
  {
    key: "active",
    header: "Estado",
    width: "120px",
    render: (value) => <StatusBadge active={value} />,
  },
]

// =====================
// Auth REST signup (NO cambia la sesión del admin)
// =====================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function authSignUpNoSession(email: string, password: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Faltan env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  const json: any = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      json?.msg ||
      json?.error_description ||
      json?.error ||
      "No se pudo crear el usuario en Auth"
    throw new Error(msg)
  }

  // json.user.id
  return json
}

export default function StudentsTable() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Student[]>([])
  const [filteredRows, setFilteredRows] = useState<Student[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [page, setPage] = useState(1)

  // create/edit single
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student",
    classroomId: "",
    active: true,
  })

  // BULK EXCEL
  const [showBulk, setShowBulk] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkFileName, setBulkFileName] = useState<string | null>(null)
  const [bulkClassroomId, setBulkClassroomId] = useState<string>("")
  const [bulkInstitutionId, setBulkInstitutionId] = useState<string | null>(null)
  const [bulkInstitutionSlug, setBulkInstitutionSlug] = useState<string>("academia")
  const [bulkPreview, setBulkPreview] = useState<BulkRow[]>([])
  const [bulkCreating, setBulkCreating] = useState(false)

  // Filters
  const { values, onChange, onClear } = useFilters({
    search: "",
    role: "",
    active: "",
  })

  // Fetch data
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data: any = await listStudentsAction(values.search || "", (values.role || "all") as any)
      setRows(data as Student[])
    } catch (e: any) {
      setError(e?.message ?? "Error cargando usuarios")
    } finally {
      setLoading(false)
    }
  }, [values.search, values.role])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // load classrooms for both create and bulk
  useEffect(() => {
    if (!showCreate && !showBulk) return
    const loadClassrooms = async () => {
      try {
        setCreateError(null)
        const data: any = await listClassroomsAction()
        const active = (data as ClassroomOption[]).filter((c) => c.active !== false)
        setClassrooms(active)
      } catch (e: any) {
        const msg = e?.message ?? "Error cargando aulas"
        setCreateError(msg)
        setBulkError(msg)
      }
    }
    loadClassrooms()
  }, [showCreate, showBulk])

  useEffect(() => {
    setPage(1)
  }, [values.search, values.role, values.active, pageSize])

  // Client-side filtering for active status
  useEffect(() => {
    let result = rows
    if (values.active === "true") result = result.filter((r) => r.active)
    else if (values.active === "false") result = result.filter((r) => !r.active)
    setFilteredRows(result)
  }, [rows, values.active])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  const isFiltered = Boolean(values.search || values.active)
  const emailInputValue = form.email.trim()

  const handleRowClick = (row: Student) => {
    router.push(`/dashboard/admin/students/${row.id}`)
  }

  // Row actions
  const renderRowActions = (row: Student) => (
    <RowActionsMenu
      actions={[
        {
          label: "Ver detalle",
          icon: <Eye className="w-4 h-4" />,
          onClick: () => router.push(`/dashboard/admin/students/${row.id}`),
        },
        {
          label: "Editar",
          icon: <Edit className="w-4 h-4" />,
          onClick: () => {
            const member = getPrimaryMembership(row)
            setEditId(row.id)
            setShowCreate(true)
            setCreateError(null)
            setCreateSuccess(null)
            setForm({
              firstName: row.first_name,
              lastName: row.last_name,
              email: "",
              password: "",
              role: row.global_role || "student",
              classroomId: getPrimaryClassroom(member)?.classroom_id || "",
              active: Boolean(row.active),
            })
          },
        },
        {
          label: "Eliminar",
          icon: <Trash2 className="w-4 h-4" />,
          variant: "destructive",
          onClick: async () => {
            const ok = window.confirm("¿Seguro que deseas desactivar este usuario?")
            if (!ok) return
            try {
              setCreateError(null)
              await deactivateStudentAction(row.id)
              await fetchStudents()
            } catch (e: any) {
              setCreateError(e?.message ?? "Error desactivando usuario")
            }
          },
        },
      ]}
    />
  )

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "student",
      classroomId: "",
      active: true,
    })
    setCreateError(null)
    setEditId(null)
  }

  const clearMessages = () => {
    setCreateError(null)
    setCreateSuccess(null)
  }

  const selectedClassroom = useMemo(
    () => classrooms.find((cls) => cls.id === form.classroomId),
    [classrooms, form.classroomId],
  )

  const suggestedInstitutionSlug = useMemo(() => {
    if (!selectedClassroom) return ""
    if (selectedClassroom.edu_institutions?.slug) {
      return selectedClassroom.edu_institutions.slug
    }
    return slugifyInstitution(selectedClassroom.edu_institutions?.name || "")
  }, [selectedClassroom])

  const suggestedEmail = useMemo(() => {
    if (
      !selectedClassroom ||
      !suggestedInstitutionSlug ||
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      return ""
    }
    const local = `${normalizeName(form.firstName)}.${normalizeName(form.lastName)}`.replace(
      /\.+/g,
      ".",
    )
    return `${local}@${suggestedInstitutionSlug}.ludus.edu`
  }, [form.firstName, form.lastName, selectedClassroom, suggestedInstitutionSlug])

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const emailValue = form.email.trim()
    const resolvedEmail = editId ? emailValue : emailValue || suggestedEmail

    if (!firstName || !lastName) {
      setCreateError("Completa nombre y apellido.")
      return
    }
    if (!editId && !resolvedEmail) {
      setCreateError("Completa el correo.")
      return
    }

    try {
      setCreating(true)
      if (editId) {
        await updateStudentAction(editId, {
          first_name: firstName,
          last_name: lastName,
          classroom_id: form.classroomId || null,
          active: form.active,
          role: form.role,
        })
        setCreateSuccess("Usuario actualizado.")
      } else {
        const result = await createStudentAction({
          email: resolvedEmail,
          password: form.password || undefined,
          first_name: firstName,
          last_name: lastName,
          role: form.role,
          classroom_id: form.classroomId || null,
        })
        const roleLabel = form.role === "teacher" ? "Profesor" : "Alumno"
        const passwordInfo = result?.password ? ` Password: ${result.password}` : ""
        setCreateSuccess(`${roleLabel} creado correctamente.${passwordInfo}`)
      }
      resetForm()
      await fetchStudents()
    } catch (e: any) {
      setCreateError(e?.message ?? "Error creando usuario")
    } finally {
      setCreating(false)
    }
  }

  // =====================
  // BULK helpers
  // =====================
  const resetBulk = () => {
    setBulkError(null)
    setBulkFileName(null)
    setBulkClassroomId("")
    setBulkInstitutionId(null)
    setBulkInstitutionSlug("academia")
    setBulkPreview([])
    setBulkCreating(false)
  }

  const onBulkSelectClassroom = (id: string) => {
    setBulkClassroomId(id)
    const cls = classrooms.find((c) => c.id === id)
    const instName = cls?.edu_institutions?.name || "Academia"
    setBulkInstitutionId(cls?.institution_id ?? null)
    setBulkInstitutionSlug(slugifyInstitution(instName))
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ first_name: "Juan", last_name: "Pérez" }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla")
    XLSX.writeFile(wb, "plantilla_alumnos.xlsx")
  }

  const exportPreviewExcel = () => {
    const cls = classrooms.find((c) => c.id === bulkClassroomId)
    const label = cls ? `${cls.edu_institutions?.name || "SinInstitucion"} - ${getClassroomLabel(cls)} - ${cls.academic_year}` : ""
    const payload = bulkPreview.map((r) => ({
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      password: r.password,
      classroom_id: bulkClassroomId,
      classroom_label: label,
      institution_slug: bulkInstitutionSlug,
    }))
    const ws = XLSX.utils.json_to_sheet(payload)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios")
    XLSX.writeFile(wb, `usuarios_${bulkInstitutionSlug}_${bulkClassroomId.slice(0, 6)}.xlsx`)
  }

  const parseExcel = async (file: File) => {
    setBulkError(null)
    setBulkFileName(file.name)

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" })

    // acepta: first_name/last_name o Nombre/Apellido
    const extracted = raw
      .map((r) => ({
        first_name: String(r.first_name || r.nombre || r.Nombre || "").trim(),
        last_name: String(r.last_name || r.apellido || r.Apellido || "").trim(),
      }))
      .filter((r) => r.first_name && r.last_name)

    if (!extracted.length) {
      setBulkError("No encontré filas. Asegúrate que el Excel tenga columnas first_name y last_name.")
      setBulkPreview([])
      return
    }

    const slug = bulkInstitutionSlug || "academia"
    const used = new Map<string, number>()

    const previewRows: BulkRow[] = extracted.map((r) => {
      const baseLocal = `${normalizeName(r.first_name)}.${normalizeName(r.last_name)}`.replace(/\.+/g, ".")
      const key = `${baseLocal}@${slug}`
      const n = (used.get(key) ?? 0) + 1
      used.set(key, n)

      const local = n === 1 ? baseLocal : `${baseLocal}.${n}`
      const email = `${local}@${slug}.ludus.edu`

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

  const createBulkUsers = async () => {
    setBulkError(null)

    if (!bulkClassroomId) {
      setBulkError("Selecciona un aula antes de crear.")
      return
    }
    if (!bulkInstitutionId) {
      setBulkError("El aula seleccionada no tiene institución asociada (institution_id).")
      return
    }
    if (!bulkPreview.length) {
      setBulkError("No hay preview cargado. Sube un Excel primero.")
      return
    }

    setBulkCreating(true)

    for (let i = 0; i < bulkPreview.length; i++) {
      const r = bulkPreview[i]

      // marca como “procesando”
      setBulkPreview((prev) =>
        prev.map((x, idx) =>
          idx === i ? { ...x, status: "pending", message: "Creando..." } : x
        )
      )

      try {
        // 1) Crear en Auth SIN cambiar la sesión del admin
        const signup = await authSignUpNoSession(r.email, r.password)
        const userId = signup?.user?.id as string | undefined
        if (!userId) throw new Error("Auth no devolvió user.id")

        // 2) Insert en edu_profiles (como admin/logueado actual)
        const { error: pErr } = await supabase.from("edu_profiles").insert({
          id: userId,
          first_name: r.first_name,
          last_name: r.last_name,
          global_role: "student",
          active: true,
        })
        if (pErr) throw new Error(`edu_profiles: ${pErr.message}`)

        // 3) Insert membresía
        const { data: member, error: mErr } = await supabase
          .from("edu_institution_members")
          .insert({
            profile_id: userId,
            institution_id: bulkInstitutionId,
            role: "student",
            active: true,
          })
          .select("id")
          .single()
        if (mErr) throw new Error(`membership: ${mErr.message}`)

        if (member?.id && bulkClassroomId) {
          const { error: cmErr } = await supabase
            .from("edu_classroom_members")
            .insert({
              institution_member_id: member.id,
              classroom_id: bulkClassroomId,
            })
          if (cmErr) throw new Error(`classroom_members: ${cmErr.message}`)
        }

        setBulkPreview((prev) =>
          prev.map((x, idx) =>
            idx === i ? { ...x, status: "ok", message: "OK" } : x
          )
        )
      } catch (e: any) {
        setBulkPreview((prev) =>
          prev.map((x, idx) =>
            idx === i ? { ...x, status: "error", message: e?.message ?? "Error" } : x
          )
        )
      }
    }

    setBulkCreating(false)
    await fetchStudents()
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Usuarios"
          description="Gestiona estudiantes y profesores de la plataforma"
        />
        <div className="rounded-xl border bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchStudents}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const closeCreateModal = () => {
    resetForm()
    clearMessages()
    setShowCreate(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description={loading ? "Cargando..." : `${filteredRows.length} usuarios`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowBulk(true)
                setBulkError(null)
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar Excel por aula
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setShowCreate(true)
                clearMessages()
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo
            </Button>
          </div>
        }
      />

      {/* ===================== BULK MODAL ===================== */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-base font-semibold">Importar estudiantes por Excel</div>
                <div className="text-sm text-muted-foreground">
                  Selecciona un aula, sube Excel (first_name, last_name) y verás el preview con correo/password dummy.
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowBulk(false)
                  resetBulk()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>Aula</Label>
                  <select
                    value={bulkClassroomId}
                    onChange={(e) => onBulkSelectClassroom(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Selecciona un aula…</option>
                    {classrooms.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.edu_institutions?.name || "Sin institucion"} - {getClassroomLabel(cls)} - {cls.academic_year}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-muted-foreground">
                    Dominio generado:{" "}
                    <span className="font-mono">{bulkInstitutionSlug}.ludus.edu</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Plantilla</Label>
                  <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar plantilla
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Columnas: <span className="font-mono">first_name</span>,{" "}
                    <span className="font-mono">last_name</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label>Archivo Excel</Label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (!bulkClassroomId) {
                        setBulkError("Primero selecciona un aula.")
                        e.target.value = ""
                        return
                      }
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
                  <Label>Exportar preview</Label>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={exportPreviewExcel}
                    disabled={!bulkPreview.length}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel con passwords
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Útil para entregar credenciales por aula.
                  </div>
                </div>
              </div>

              {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}

              {/* Preview */}
              <div className="rounded-xl border">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="text-sm font-medium">
                    Preview ({bulkPreview.length})
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={createBulkUsers}
                      disabled={bulkCreating || !bulkPreview.length}
                    >
                      {bulkCreating ? "Creando..." : "Crear usuarios"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBulkPreview([])}
                      disabled={bulkCreating}
                    >
                      Limpiar
                    </Button>
                  </div>
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
                            Sube un Excel para ver el preview (correo y password dummy).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulk(false)
                    resetBulk()
                  }}
                >
                  Cerrar
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Nota: esto crea usuarios en Auth por REST (<span className="font-mono">/auth/v1/signup</span>) para NO cambiar tu sesión de admin.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CREATE/EDIT SINGLE ===================== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-base font-semibold">
                  {editId ? "Editar usuario" : "Nuevo usuario"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Completa los datos para crear estudiante o profesor.
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={closeCreateModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 px-5 py-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="studentFirstName">Nombre</Label>
                  <Input
                    id="studentFirstName"
                    value={form.firstName}
                    onChange={(e) => setForm((s: any) => ({ ...s, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentLastName">Apellido</Label>
                  <Input
                    id="studentLastName"
                    value={form.lastName}
                    onChange={(e) => setForm((s: any) => ({ ...s, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="studentEmail">Correo</Label>
                    {!editId && suggestedEmail && emailInputValue !== suggestedEmail && (
                      <Button
                        variant="link"
                        size="sm"
                        type="button"
                        onClick={() =>
                          setForm((s: any) => ({ ...s, email: suggestedEmail }))
                        }
                      >
                        Usar sugerido
                      </Button>
                    )}
                  </div>
                  <Input
                    id="studentEmail"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s: any) => ({ ...s, email: e.target.value }))}
                    disabled={Boolean(editId)}
                  />
                  {!editId && suggestedEmail && (
                    <p className="text-xs text-muted-foreground">
                      Sugerido: <span className="font-mono">{suggestedEmail}</span>
                      {selectedClassroom && (
                        <> Institucion: {selectedClassroom.edu_institutions?.name || "Sin institucion"}</>
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentPassword">Password</Label>
                  <Input
                    id="studentPassword"
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm((s: any) => ({ ...s, password: e.target.value }))}
                    disabled={Boolean(editId)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentRole">Rol</Label>
                  <select
                    id="studentRole"
                    value={form.role}
                    onChange={(e) => setForm((s: any) => ({ ...s, role: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Profesor</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="studentClassroom">Aula</Label>
                  <select
                    id="studentClassroom"
                    value={form.classroomId}
                    onChange={(e) => setForm((s: any) => ({ ...s, classroomId: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Sin asignar</option>
                    {classrooms.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.edu_institutions?.name || "Sin institucion"} - {getClassroomLabel(cls)} - {cls.academic_year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Checkbox
                    id="studentActive"
                    checked={form.active}
                    onCheckedChange={(val) => setForm((s: any) => ({ ...s, active: Boolean(val) }))}
                  />
                  <Label htmlFor="studentActive">Activo</Label>
                </div>
              </div>

              {createError && <p className="text-sm text-destructive">{createError}</p>}
              {createSuccess && <p className="text-sm text-foreground">{createSuccess}</p>}
              <div className="text-xs text-muted-foreground">
                Supabase Auth se encarga de crear el usuario y se registran los datos en{" "}
                <span className="font-mono">edu_profiles</span> y{" "}
                <span className="font-mono">edu_institution_members</span>.
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? "Guardando..." : editId ? "Actualizar usuario" : "Crear usuario"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={closeCreateModal}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FilterBar filters={filterConfigs} values={values} onChange={onChange} onClear={onClear} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{filteredRows.length} resultados</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Items por pagina</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pagedRows}
        loading={loading}
        emptyState={{
          title: "usuarios",
          description: "Aún no hay usuarios registrados.",
        }}
        isFiltered={isFiltered}
        onClearFilters={onClear}
        pagination={{
          page,
          pageSize,
          total: filteredRows.length,
        }}
        onPageChange={setPage}
        selectable
        onRowClick={handleRowClick}
        rowActions={renderRowActions}
        bulkActions={[
          {
            label: "Exportar",
            icon: <Download className="w-4 h-4 mr-1" />,
            onClick: (ids) => console.log("Export:", ids),
          },
        ]}
      />
    </div>
  )
}
