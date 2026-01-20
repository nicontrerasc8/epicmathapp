"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
    Users,
    FileQuestion,
    Target,
    ArrowRight,
    Settings,
    Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    PageHeader,
    StatCard,
    StatCardGrid,
    StatusBadge
} from "@/components/dashboard/core"

interface ClassroomData {
    id: string
    grade: string
    section?: string | null
    academic_year: number
    active: boolean
    classroom_code?: string | null
    edu_institutions: { id: string; name: string; type: string } | null
    memberCount: number
    exercisesCount: number
    accuracy: number
    totalExercises: number
}

// Quick link card
function QuickLinkCard({
    icon: Icon,
    title,
    description,
    href,
    count,
}: {
    icon: typeof Users
    title: string
    description: string
    href: string
    count?: number
}) {
    return (
        <Link href={href}>
            <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className="rounded-xl border bg-card p-4 hover:shadow-card-hover transition-normal group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium group-hover:text-primary transition-fast">
                                {title}
                            </h3>
                            {count !== undefined && (
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                    {count}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
            </motion.div>
        </Link>
    )
}

export default function ClassroomDetailClient({ data }: any) {
    const institutionName = data.edu_institutions?.name || "Sin institucion"
    const gradeLabel = `${data.grade}${data.section ? ` ${data.section}` : ""}`.trim()

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <PageHeader
                title={gradeLabel}
                description={`${institutionName} - Anio ${data.academic_year}`}
                badge={{
                    label: data.active ? "Activo" : "Inactivo",
                    variant: data.active ? "success" : "default",
                }}
                breadcrumbs={[
                    { label: "Admin", href: "/dashboard/admin" },
                    { label: "Aulas", href: "/dashboard/admin/classrooms" },
                    { label: gradeLabel },
                ]}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Configurar
                        </Button>
                    </div>
                }
            />

            {/* Stats */}
            <StatCardGrid columns={3}>
                <StatCard
                    title="Estudiantes"
                    value={data.memberCount}
                    icon={Users}
                    variant="primary"
                />
                <StatCard
                    title="Ejercicios"
                    value={data.exercisesCount}
                    icon={FileQuestion}
                    variant="default"
                />
                <StatCard
                    title="Precision (7 dias)"
                    value={data.accuracy}
                    suffix="%"
                    icon={Target}
                    variant={data.accuracy >= 70 ? "success" : data.accuracy >= 50 ? "warning" : "danger"}
                    trend={data.totalExercises > 0 ? {
                        value: data.accuracy >= 70 ? 5 : data.accuracy >= 50 ? 0 : -5,
                        label: `${data.totalExercises} ejercicios`
                    } : undefined}
                />
            </StatCardGrid>

            {/* Quick Links */}
            <section>
                <h2 className="text-lg font-semibold mb-4">Gestionar</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <QuickLinkCard
                        icon={Users}
                        title="Miembros"
                        description="Ver y gestionar estudiantes del aula"
                        href={`/dashboard/admin/classrooms/${data.id}/members`}
                        count={data.memberCount}
                    />
                    <QuickLinkCard
                        icon={FileQuestion}
                        title="Ejercicios"
                        description="Asignar ejercicios al aula"
                        href={`/dashboard/admin/classrooms/${data.id}/exercises`}
                        count={data.exercisesCount}
                    />
                </div>
            </section>

            {/* Info Card */}
            <section className="grid gap-4 lg:grid-cols-2">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border bg-card p-5"
                >
                    <h3 className="font-semibold mb-4">Informacion del Aula</h3>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Institucion</dt>
                            <dd className="font-medium">{institutionName}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Grado</dt>
                            <dd className="font-medium">{gradeLabel}</dd>
                        </div>
                        {data.classroom_code && (
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Codigo</dt>
                                <dd className="font-medium">{data.classroom_code}</dd>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Anio Academico</dt>
                            <dd className="font-medium flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {data.academic_year}
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Estado</dt>
                            <dd>
                                <StatusBadge active={data.active} />
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
                    <h3 className="font-semibold mb-4">Actividad Reciente</h3>
                    {data.totalExercises === 0 ? (
                        <div className="py-8 text-center">
                            <FileQuestion className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                                No hay ejercicios resueltos en los ultimos 7 dias
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Ejercicios esta semana</span>
                                <span className="font-semibold">{data.totalExercises}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Precision promedio</span>
                                <span className={`font-semibold ${data.accuracy >= 70 ? "text-secondary" :
                                        data.accuracy >= 50 ? "text-accent-foreground" : "text-destructive"
                                    }`}>
                                    {data.accuracy}%
                                </span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${data.accuracy}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className={`h-full rounded-full ${data.accuracy >= 70 ? "bg-secondary" :
                                            data.accuracy >= 50 ? "bg-accent" : "bg-destructive"
                                        }`}
                                />
                            </div>
                        </div>
                    )}
                </motion.div>
            </section>
        </div>
    )
}
