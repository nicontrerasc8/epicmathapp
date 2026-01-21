"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  User,
  GraduationCap,
  Calendar,
  Building2,
  ArrowLeft,
  Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  PageHeader,
  StatCard,
  StatCardGrid,
  StatusBadge,
  FullPageLoading,
  ErrorState
} from "@/components/dashboard/core"
import {
  getStudentDetailAction,
  listClassroomsAction,
  updateStudentAction
} from "../admin-actions"

interface StudentDetailProps {
  studentId: string
}

interface Profile {
  id: string
  first_name: string
  last_name: string
  global_role: string | null
  active: boolean
  created_at: string
}

interface Membership {
  id: string
  role: string
  institution_id: string | null
  classroom_id: string | null
  active: boolean
  created_at: string
  edu_institutions?: { id: string; name: string } | null
  edu_classrooms?: {
    id: string
    academic_year: number
    grade: string
    section?: string | null
  } | null
}

interface ClassroomOption {
  id: string
  institution_id: string | null
  academic_year: number
  grade: string
  section?: string | null
  active?: boolean
  edu_institutions?: { id: string; name: string; slug?: string | null } | null
}

function getPrimaryMembership(memberships: Membership[]) {
  const active = memberships.find((m) => m.active)
  return active || memberships[0]
}

function getMembershipGrade(m: Membership) {
  const grade = m.edu_classrooms?.grade || ""
  const section = m.edu_classrooms?.section || ""
  return `${grade} ${section}`.trim()
}

function getClassroomLabel(cls: ClassroomOption) {
  const grade = cls.grade || ""
  const section = cls.section || ""
  return `${grade} ${section}`.trim()
}

export default function StudentDetail({ studentId }: StudentDetailProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ profile: Profile; memberships: Membership[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([])
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    role: "student",
    classroomId: "",
    active: true,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getStudentDetailAction(studentId)
      setData(result as any)
    } catch (e: any) {
      setError(e?.message ?? "Error cargando usuario")
    } finally {
      setLoading(false)
    }
  }, [studentId])

  const loadClassrooms = useCallback(async () => {
    try {
      const result: any = await listClassroomsAction()
      const active = (result as ClassroomOption[]).filter((c) => c.active !== false)
      setClassrooms(active)
    } catch (e: any) {
      setFormError(e?.message ?? "Error cargando aulas")
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (editing && classrooms.length === 0) {
      loadClassrooms()
    }
  }, [editing, classrooms.length, loadClassrooms])

  const startEdit = () => {
    if (!data) return
    const primary = getPrimaryMembership(data.memberships)
    setForm({
      firstName: data.profile.first_name,
      lastName: data.profile.last_name,
      role: (data.profile.global_role as string) || "student",
      classroomId: primary?.classroom_id || "",
      active: Boolean(data.profile.active),
    })
    setFormError(null)
    setFormSuccess(null)
    setEditing(true)
  }

  const handleSave = async () => {
    if (!data) return
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("Completa nombre y apellido.")
      return
    }

    try {
      setSaving(true)
      setFormError(null)
      await updateStudentAction(data.profile.id, {
        first_name: form.firstName,
        last_name: form.lastName,
        classroom_id: form.classroomId || null,
        active: form.active,
        role: form.role as any,
      })
      setFormSuccess("Usuario actualizado.")
      setEditing(false)
      await fetchData()
    } catch (e: any) {
      setFormError(e?.message ?? "Error actualizando usuario")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FullPageLoading />
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Usuario"
          breadcrumbs={[
            { label: "Admin", href: "/dashboard/admin" },
            { label: "Usuarios", href: "/dashboard/admin/students" },
            { label: "Detalle" },
          ]}
        />
        <ErrorState
          message={error || "No se encontro el usuario"}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const { profile, memberships } = data
  const fullName = `${profile.first_name} ${profile.last_name}`.trim()
  const activeMemberships = memberships.filter((m) => m.active)
  const primaryMembership = getPrimaryMembership(memberships)
  const createdDate = new Date(profile.created_at).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-8">
      <PageHeader
        title={fullName}
        description={`ID: ${profile.id.slice(0, 8)}...`}
        badge={{
          label: profile.active ? "Activo" : "Inactivo",
          variant: profile.active ? "success" : "default",
        }}
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Usuarios", href: "/dashboard/admin/students" },
          { label: fullName },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/admin/students">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <Button size="sm" onClick={startEdit}>
              <Settings className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        }
      />

      <StatCardGrid columns={3}>
        <StatCard
          title="Membresias activas"
          value={activeMemberships.length}
          icon={GraduationCap}
          variant="primary"
        />
        <StatCard
          title="Total membresias"
          value={memberships.length}
          icon={Building2}
          variant="default"
        />
        <StatCard
          title="Rol global"
          value={profile.global_role || "Sin rol"}
          icon={User}
          variant="default"
        />
      </StatCardGrid>

      {formSuccess && !editing && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {formSuccess}
        </div>
      )}

      {editing && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Editar perfil</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="studentEditFirstName">Nombre</Label>
              <Input
                id="studentEditFirstName"
                value={form.firstName}
                onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentEditLastName">Apellido</Label>
              <Input
                id="studentEditLastName"
                value={form.lastName}
                onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentEditRole">Rol</Label>
              <select
                id="studentEditRole"
                value={form.role}
                onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="student">Estudiante</option>
                <option value="teacher">Profesor</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="studentEditClassroom">Aula</Label>
              <select
                id="studentEditClassroom"
                value={form.classroomId}
                onChange={(e) => setForm((s) => ({ ...s, classroomId: e.target.value }))}
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
                id="studentEditActive"
                checked={form.active}
                onCheckedChange={(val) => setForm((s) => ({ ...s, active: Boolean(val) }))}
              />
              <Label htmlFor="studentEditActive">Activo</Label>
            </div>
          </div>
          {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Informacion del perfil
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="font-medium">{profile.first_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Apellido</dt>
              <dd className="font-medium">{profile.last_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs">{profile.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Rol global</dt>
              <dd className="font-medium capitalize">{profile.global_role || "Sin rol"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Institucion</dt>
              <dd className="font-medium">
                {primaryMembership?.edu_institutions?.name || "Sin institucion"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Aula</dt>
              <dd className="font-medium">
                {primaryMembership?.edu_classrooms
                  ? `${getMembershipGrade(primaryMembership)}`
                  : "Sin asignar"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <StatusBadge active={profile.active} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Registrado</dt>
              <dd className="font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {createdDate}
              </dd>
            </div>
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border bg-card p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Membresias
          </h3>

          {memberships.length === 0 ? (
            <div className="py-8 text-center">
              <GraduationCap className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No tiene membresias registradas
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                Asignar a institucion
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium capitalize">{m.role}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <div>
                          Institucion: {m.edu_institutions?.name || m.institution_id?.slice(0, 8) || "Sin institucion"}
                        </div>
                        {m.edu_classrooms ? (
                          <div>
                            Aula: {getMembershipGrade(m)} - {m.edu_classrooms.academic_year}
                          </div>
                        ) : (
                          <div>Aula: Sin asignar</div>
                        )}
                      </div>
                    </div>
                    <StatusBadge active={m.active} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
