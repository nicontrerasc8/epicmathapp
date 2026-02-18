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
  ensureParentLinkAction,
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
  parent_first_name?: string
  parent_last_name?: string
  parent_email?: string
  status: "pending" | "ok" | "error"
  message?: string
}

const DEFAULT_PASSWORD = "123456"

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
    .replace(/[^a-z0-9\s]/g, "")
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

function getNameInitial(name: string) {
  const normalized = normalizeName(name)
  return normalized.slice(0, 1)
}

function buildEmailLocal(firstName: string, lastName: string) {
  const initial = getNameInitial(firstName)
  const last = normalizeName(lastName)
  if (!initial || !last) return ""
  return `${initial}${last}`
}

function buildStudentEmail(firstName: string, lastName: string, institutionSlug: string) {
  const local = buildEmailLocal(firstName, lastName)
  if (!local) return ""
  return `${local}@${institutionSlug}.ludus.edu`
}

function buildParentEmail(firstName: string, lastName: string, institutionSlug: string) {
  const local = buildEmailLocal(firstName, lastName)
  if (!local) return ""
  return `${local}@${institutionSlug}.ludus.edu`
}

function buildUniqueStudentEmail(
  firstName: string,
  lastName: string,
  institutionSlug: string,
  used: Map<string, number>,
) {
  const baseLocal = buildEmailLocal(firstName, lastName)
  if (!baseLocal) return ""
  const key = `${baseLocal}@${institutionSlug}`
  const count = (used.get(key) ?? 0) + 1
  used.set(key, count)
  const local = count === 1 ? baseLocal : `${baseLocal}${count}`
  return `${local}@${institutionSlug}.ludus.edu`
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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
    role: "student",
    classroomId: "",
    active: true,
    assignParent: false,
    parentFirstName: "",
    parentLastName: "",
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
  const [bulkRole, setBulkRole] = useState<"student" | "teacher">("student")
  const [bulkIncludeEmail, setBulkIncludeEmail] = useState(false)
  const [bulkIncludeParent, setBulkIncludeParent] = useState(false)

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
              role: row.global_role || "student",
              classroomId: getPrimaryClassroom(member)?.classroom_id || "",
              active: Boolean(row.active),
              assignParent: false,
              parentFirstName: "",
              parentLastName: "",
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
      role: "student",
      classroomId: "",
      active: true,
      assignParent: false,
      parentFirstName: "",
      parentLastName: "",
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

  const institutionSlug = useMemo(() => {
    if (selectedClassroom?.edu_institutions?.slug) {
      return selectedClassroom.edu_institutions.slug
    }
    if (selectedClassroom?.edu_institutions?.name) {
      return slugifyInstitution(selectedClassroom.edu_institutions.name)
    }
    const fallback = classrooms.find((cls) => cls.edu_institutions?.slug || cls.edu_institutions?.name)
    if (fallback?.edu_institutions?.slug) return fallback.edu_institutions.slug
    if (fallback?.edu_institutions?.name) return slugifyInstitution(fallback.edu_institutions.name)
    return "academia"
  }, [classrooms, selectedClassroom])

  const generatedEmail = useMemo(() => {
    return buildStudentEmail(form.firstName, form.lastName, institutionSlug)
  }, [form.firstName, form.lastName, institutionSlug])

  const generatedParentEmail = useMemo(() => {
    if (!form.assignParent || form.role !== "student") return ""
    return buildParentEmail(form.parentFirstName, form.parentLastName, institutionSlug)
  }, [form.assignParent, form.parentFirstName, form.parentLastName, form.role, institutionSlug])

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const resolvedEmail = buildStudentEmail(firstName, lastName, institutionSlug)
    const assignParent = form.role === "student" && form.assignParent
    const parentFirstName = form.parentFirstName.trim()
    const parentLastName = form.parentLastName.trim()

    if (!firstName || !lastName) {
      setCreateError("Completa nombre y apellido.")
      return
    }
    if (!editId && !resolvedEmail) {
      setCreateError("Completa nombre y apellido para generar el correo.")
      return
    }
    if (assignParent && (!parentFirstName || !parentLastName)) {
      setCreateError("Completa nombre y apellido del padre.")
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
          password: DEFAULT_PASSWORD,
          first_name: firstName,
          last_name: lastName,
          role: form.role,
          classroom_id: form.classroomId || null,
          parent: assignParent
            ? { first_name: parentFirstName, last_name: parentLastName }
            : null,
        })
        const roleLabel = form.role === "teacher" ? "Profesor" : "Alumno"
        const passwordInfo = result?.password
          ? ` Password: ${result.password}`
          : ` Password por defecto: ${DEFAULT_PASSWORD}`
        const parentInfo = result?.parent_warning
          ? ` Advertencia: ${result.parent_warning}`
          : ""
        setCreateSuccess(`${roleLabel} creado correctamente.${passwordInfo}${parentInfo}`)
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
    setBulkRole("student")
    setBulkIncludeEmail(false)
    setBulkIncludeParent(false)
  }

  const onBulkSelectClassroom = (id: string) => {
    setBulkClassroomId(id)
    const cls = classrooms.find((c) => c.id === id)
    setBulkInstitutionId(cls?.institution_id ?? null)
    if (cls?.edu_institutions?.slug) {
      setBulkInstitutionSlug(cls.edu_institutions.slug)
    } else {
      const instName = cls?.edu_institutions?.name || "Academia"
      setBulkInstitutionSlug(slugifyInstitution(instName))
    }
  }

  const downloadTemplate = () => {
    const sample: Record<string, string> = {
      nombre: "Juan",
      apellido: "Perez",
    }
    if (bulkRole === "student" && bulkIncludeParent) {
      sample.padre_nombre = "Carlos"
      sample.padre_apellido = "Perez"
    }
    if (bulkIncludeEmail) {
      sample.correo = "juan.perez@correo.com"
    }
    const ws = XLSX.utils.json_to_sheet([sample])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla")
    const roleLabel = bulkRole === "teacher" ? "profesores" : "estudiantes"
    const suffixParent =
      bulkRole === "student" && bulkIncludeParent ? "_con_padre" : ""
    const suffixEmail = bulkIncludeEmail ? "_con_correo" : ""
    const suffix = `${suffixParent}${suffixEmail}`
    XLSX.writeFile(wb, `plantilla_${roleLabel}${suffix}.xlsx`)
  }

  const exportPreviewExcel = () => {
    const cls = classrooms.find((c) => c.id === bulkClassroomId)
    const label = cls ? `${cls.edu_institutions?.name || "SinInstitucion"} - ${getClassroomLabel(cls)} - ${cls.academic_year}` : ""
    const payload = bulkPreview.map((r) => {
      const base: Record<string, string> = {
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        password: r.password,
        classroom_id: bulkClassroomId,
        classroom_label: label,
        institution_slug: bulkInstitutionSlug,
      }
      if (bulkRole === "student" && bulkIncludeParent) {
        base.parent_first_name = r.parent_first_name || ""
        base.parent_last_name = r.parent_last_name || ""
        base.parent_email = r.parent_email || ""
      }
      return base
    })
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

    const extracted = raw
      .map((r) => {
        const normalized = Object.fromEntries(
          Object.entries(r).map(([k, v]) => [String(k).trim().toLowerCase(), v]),
        )
        const rawEmail = String(
          normalized.email || normalized.correo || normalized.mail || "",
        )
          .trim()
          .toLowerCase()
        const parentFirstName = bulkIncludeParent
          ? String(
              normalized.padre_nombre ||
                normalized.nombre_padre ||
                normalized.parent_first_name ||
                normalized.parent_nombre ||
                "",
            ).trim()
          : ""
        const parentLastName = bulkIncludeParent
          ? String(
              normalized.padre_apellido ||
                normalized.apellido_padre ||
                normalized.parent_last_name ||
                normalized.parent_apellido ||
                "",
            ).trim()
          : ""
        return {
          first_name: String(normalized.first_name || normalized.nombre || "").trim(),
          last_name: String(normalized.last_name || normalized.apellido || "").trim(),
          email: rawEmail,
          parent_first_name: parentFirstName,
          parent_last_name: parentLastName,
        }
      })
      .filter((r) => r.first_name && r.last_name)

    if (!extracted.length) {
    const baseCols = bulkIncludeEmail
      ? "nombre, apellido y correo"
      : "nombre y apellido"
    const parentCols =
      bulkRole === "student" && bulkIncludeParent ? " + padre_nombre, padre_apellido" : ""
    const columnsLabel = `${baseCols}${parentCols}`
      setBulkError(
        `No encontre filas. Asegurate que el Excel tenga columnas ${columnsLabel}.`,
      )
      setBulkPreview([])
      return
    }

    const slug = bulkInstitutionSlug || "academia"
    const used = new Map<string, number>()
    const usedEmails = new Map<string, number>()

    const previewRows: BulkRow[] = extracted.map((r) => {
      let email = r.email
      let status: BulkRow["status"] = "pending"
      let message: string | undefined
      let parentFirstName = r.parent_first_name || ""
      let parentLastName = r.parent_last_name || ""
      let parentEmail = ""

      if (bulkRole !== "student" || !bulkIncludeParent) {
        parentFirstName = ""
        parentLastName = ""
      }

      if (bulkIncludeEmail) {
        const lowerEmail = email.toLowerCase()
        if (!lowerEmail || !isValidEmail(lowerEmail)) {
          status = "error"
          message = "Correo invalido"
        } else {
          const count = (usedEmails.get(lowerEmail) ?? 0) + 1
          usedEmails.set(lowerEmail, count)
          if (count > 1) {
            status = "error"
            message = "Correo duplicado"
          }
        }
        email = lowerEmail
      } else {
        email = buildUniqueStudentEmail(r.first_name, r.last_name, slug, used)
      }

      if (bulkRole === "student" && bulkIncludeParent) {
        if (!parentFirstName || !parentLastName) {
          if (status !== "error") {
            status = "error"
            message = "Padre requerido (nombre y apellido)"
          }
        } else {
          parentEmail = buildParentEmail(parentFirstName, parentLastName, slug)
          if (!parentEmail && status !== "error") {
            status = "error"
            message = "Correo del padre invalido"
          }
        }
      }

      return {
        first_name: r.first_name,
        last_name: r.last_name,
        email,
        password: DEFAULT_PASSWORD,
        parent_first_name: parentFirstName || "",
        parent_last_name: parentLastName || "",
        parent_email: parentEmail || "",
        status,
        message,
      }
    })

    setBulkPreview(previewRows)

    if (bulkIncludeEmail) {
      const invalidCount = previewRows.filter((r) => r.status === "error").length
      if (invalidCount > 0) {
        setBulkError(
          `Se detectaron ${invalidCount} filas con correos invalidos o duplicados.`,
        )
      }
    }
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

    const rowsToCreate = bulkPreview
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.status !== "error")

    if (!rowsToCreate.length) {
      setBulkError("No hay filas validas para crear. Corrige el Excel.")
      return
    }

    setBulkCreating(true)

    for (let i = 0; i < rowsToCreate.length; i++) {
      const { row: r, index } = rowsToCreate[i]

      // marca como “procesando”
      setBulkPreview((prev) =>
        prev.map((x, idx) =>
          idx === index ? { ...x, status: "pending", message: "Creando..." } : x
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
          global_role: bulkRole,
          active: true,
        })
        if (pErr) throw new Error(`edu_profiles: ${pErr.message}`)

        // 3) Insert membresía
        const { data: member, error: mErr } = await supabase
          .from("edu_institution_members")
          .insert({
            profile_id: userId,
            institution_id: bulkInstitutionId,
            role: bulkRole,
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

        if (
          bulkRole === "student" &&
          bulkIncludeParent &&
          r.parent_first_name &&
          r.parent_last_name
        ) {
          await ensureParentLinkAction({
            student_id: userId,
            parent_first_name: r.parent_first_name,
            parent_last_name: r.parent_last_name,
          })
        }

        setBulkPreview((prev) =>
          prev.map((x, idx) =>
            idx === index ? { ...x, status: "ok", message: "OK" } : x
          )
        )
      } catch (e: any) {
        setBulkPreview((prev) =>
          prev.map((x, idx) =>
            idx === index ? { ...x, status: "error", message: e?.message ?? "Error" } : x
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
              Importar usuarios por aula
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
                <div className="text-base font-semibold">
                  Importar {bulkRole === "teacher" ? "profesores" : "estudiantes"} por Excel
                </div>
                <div className="text-sm text-muted-foreground">
                  Selecciona un aula, sube Excel y veras el preview con correo y password 123456.
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Tipo de usuario</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={bulkRole === "student" ? "default" : "outline"}
                    onClick={() => setBulkRole("student")}
                  >
                    Estudiantes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={bulkRole === "teacher" ? "default" : "outline"}
                    onClick={() => {
                      setBulkRole("teacher")
                      if (!bulkIncludeEmail) {
                        setBulkIncludeEmail(true)
                        setBulkPreview([])
                        setBulkFileName(null)
                        setBulkError(null)
                      }
                      if (bulkIncludeParent) {
                        setBulkIncludeParent(false)
                        setBulkPreview([])
                        setBulkFileName(null)
                        setBulkError(null)
                      }
                    }}
                  >
                    Profesores
                  </Button>
                </div>
              </div>
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
                  {bulkIncludeEmail ? (
                    <div className="text-xs text-muted-foreground">
                      Se usaran los correos del Excel.
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Dominio generado:{" "}
                      <span className="font-mono">{bulkInstitutionSlug}.ludus.edu</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Plantilla</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="bulkIncludeEmail"
                      checked={bulkIncludeEmail}
                      onCheckedChange={(val) => {
                        setBulkIncludeEmail(Boolean(val))
                        setBulkPreview([])
                        setBulkFileName(null)
                        setBulkError(null)
                      }}
                    />
                    <Label htmlFor="bulkIncludeEmail" className="text-xs">
                      Incluir correo en plantilla
                    </Label>
                  </div>
                  {bulkRole === "student" && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="bulkIncludeParent"
                        checked={bulkIncludeParent}
                        onCheckedChange={(val) => {
                          setBulkIncludeParent(Boolean(val))
                          setBulkPreview([])
                          setBulkFileName(null)
                          setBulkError(null)
                        }}
                      />
                      <Label htmlFor="bulkIncludeParent" className="text-xs">
                        Incluir padre en plantilla
                      </Label>
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar plantilla
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Columnas: <span className="font-mono">nombre</span>,{" "}
                    <span className="font-mono">apellido</span>
                    {bulkRole === "student" && bulkIncludeParent && (
                      <>
                        , <span className="font-mono">padre_nombre</span>,{" "}
                        <span className="font-mono">padre_apellido</span>
                      </>
                    )}
                    {bulkIncludeEmail && (
                      <>
                        , <span className="font-mono">correo</span>
                      </>
                    )}
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
                      {bulkCreating ? "Creando..." : `Crear ${bulkRole === "teacher" ? "profesores" : "estudiantes"}`}
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
                        {bulkRole === "student" && bulkIncludeParent && (
                          <>
                            <th className="px-3 py-2">Padre</th>
                            <th className="px-3 py-2">Correo padre</th>
                          </>
                        )}
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
                          {bulkRole === "student" && bulkIncludeParent && (
                            <>
                              <td className="px-3 py-2">
                                {r.parent_first_name || r.parent_last_name
                                  ? `${r.parent_first_name ?? ""} ${r.parent_last_name ?? ""}`.trim()
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 font-mono">
                                {r.parent_email || "—"}
                              </td>
                            </>
                          )}
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
                              <td
                                className="px-3 py-6 text-muted-foreground"
                                colSpan={bulkRole === "student" && bulkIncludeParent ? 6 : 4}
                              >
                                Sube un Excel para ver el preview.
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
                  Completa nombre y apellido. El correo y password se generan automáticamente.
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
                  <Label htmlFor="studentEmail">Correo</Label>
                  <Input
                    id="studentEmail"
                    type="email"
                    value={generatedEmail}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentPassword">Password</Label>
                  <Input
                    id="studentPassword"
                    type="text"
                    value={DEFAULT_PASSWORD}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentRole">Rol</Label>
                  <select
                    id="studentRole"
                    value={form.role}
                    onChange={(e) =>
                      setForm((s: any) => {
                        const role = e.target.value
                        if (role !== "student") {
                          return {
                            ...s,
                            role,
                            assignParent: false,
                            parentFirstName: "",
                            parentLastName: "",
                          }
                        }
                        return { ...s, role }
                      })
                    }
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

                {!editId && form.role === "student" && (
                  <div className="flex items-center gap-2 md:col-span-4">
                    <Checkbox
                      id="studentAssignParent"
                      checked={form.assignParent}
                      onCheckedChange={(val) =>
                        setForm((s: any) => ({
                          ...s,
                          assignParent: Boolean(val),
                          parentFirstName: val ? s.parentFirstName : "",
                          parentLastName: val ? s.parentLastName : "",
                        }))
                      }
                    />
                    <Label htmlFor="studentAssignParent">
                      Asignar a padre
                    </Label>
                  </div>
                )}

                {!editId && form.role === "student" && form.assignParent && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="parentFirstName">Nombre del padre</Label>
                      <Input
                        id="parentFirstName"
                        value={form.parentFirstName}
                        onChange={(e) =>
                          setForm((s: any) => ({ ...s, parentFirstName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentLastName">Apellido del padre</Label>
                      <Input
                        id="parentLastName"
                        value={form.parentLastName}
                        onChange={(e) =>
                          setForm((s: any) => ({ ...s, parentLastName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="parentEmail">Correo del padre</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={generatedParentEmail}
                        readOnly
                      />
                    </div>
                  </>
                )}
              </div>

              {createError && <p className="text-sm text-destructive">{createError}</p>}
              {createSuccess && <p className="text-sm text-foreground">{createSuccess}</p>}
              <div className="text-xs text-muted-foreground">
                El correo se genera con inicial del nombre + apellido. Password por defecto: {DEFAULT_PASSWORD}.
              </div>
              {!editId && form.role === "student" && (
                <div className="text-xs text-muted-foreground">
                  Si asignas un padre, su correo tambien se genera con inicial del nombre + apellido.
                </div>
              )}
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
