"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  User,
  GraduationCap,
  Calendar,
  Building2,
  ArrowLeft,
  Settings,
  Mail,
  Target
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PageHeader,
  StatCard,
  StatCardGrid,
  StatusBadge,
  FullPageLoading,
  ErrorState
} from "@/components/dashboard/core"
import { getStudentDetailAction } from "../admin-actions"

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
}

export default function StudentDetail({ studentId }: StudentDetailProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ profile: Profile; memberships: Membership[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getStudentDetailAction(studentId)
        setData(result as any)
      } catch (e: any) {
        setError(e?.message ?? "Error cargando estudiante")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [studentId])

  if (loading) {
    return <FullPageLoading />
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estudiante"
          breadcrumbs={[
            { label: "Admin", href: "/dashboard/admin" },
            { label: "Estudiantes", href: "/dashboard/admin/students" },
            { label: "Detalle" },
          ]}
        />
        <ErrorState
          message={error || "No se encontró el estudiante"}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const { profile, memberships } = data
  const fullName = `${profile.first_name} ${profile.last_name}`.trim()
  const activeMemberships = memberships.filter((m) => m.active)
  const createdDate = new Date(profile.created_at).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title={fullName}
        description={`ID: ${profile.id.slice(0, 8)}...`}
        badge={{
          label: profile.active ? "Activo" : "Inactivo",
          variant: profile.active ? "success" : "default",
        }}
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Estudiantes", href: "/dashboard/admin/students" },
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
            <Button size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <StatCardGrid columns={3}>
        <StatCard
          title="Membresías Activas"
          value={activeMemberships.length}
          icon={GraduationCap}
          variant="primary"
        />
        <StatCard
          title="Total Membresías"
          value={memberships.length}
          icon={Building2}
          variant="default"
        />
        <StatCard
          title="Rol Global"
          value={profile.global_role || "—"}
          icon={User}
          variant="default"
        />
      </StatCardGrid>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Información del Perfil
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
              <dt className="text-muted-foreground">Rol Global</dt>
              <dd className="font-medium capitalize">{profile.global_role || "Sin rol"}</dd>
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

        {/* Memberships */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border bg-card p-5"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Membresías
          </h3>

          {memberships.length === 0 ? (
            <div className="py-8 text-center">
              <GraduationCap className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No tiene membresías registradas
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                Asignar a institución
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
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        Inst: {m.institution_id?.slice(0, 8) || "—"}
                        {m.classroom_id && ` • Aula: ${m.classroom_id.slice(0, 8)}`}
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
