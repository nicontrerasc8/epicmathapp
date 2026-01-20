"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
    Users,
    ArrowRight,
    TrendingUp,
} from "lucide-react"
import {
    PageHeader,
    StatCard,
    StatCardGrid
} from "@/components/dashboard/core"

interface TeacherClassroomHubProps {
    classroom: {
        id: string
        grade: string
        academic_year: number
        active: boolean
        institution: { name: string }
    }
    stats: {
        studentCount: number
        exerciseCount: number
        activeStudents: number
    }
}

function QuickActionCard({
    icon: Icon,
    title,
    description,
    href,
}: {
    icon: typeof Users
    title: string
    description: string
    href: string
}) {
    return (
        <Link href={href}>
            <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className="rounded-xl border bg-card p-4 hover:shadow-card-hover transition-normal group h-full"
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium group-hover:text-primary transition-fast">
                            {title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {description}
                        </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
            </motion.div>
        </Link>
    )
}

export default function TeacherClassroomHubClient({ classroom, stats }: TeacherClassroomHubProps) {
    const gradeLabel = `${classroom.grade}`

    return (
        <div className="space-y-8">
            <PageHeader
                title={gradeLabel}
                description={`${classroom.institution.name} - Anio ${classroom.academic_year}`}
                badge={{
                    label: classroom.active ? "Activo" : "Inactivo",
                    variant: classroom.active ? "success" : "default",
                }}
                breadcrumbs={[
                    { label: "Mis Clases", href: "/dashboard/teacher" },
                    { label: gradeLabel },
                ]}
            />

            <StatCardGrid columns={3}>
                <StatCard
                    title="Estudiantes"
                    value={stats.studentCount}
                    icon={Users}
                    variant="primary"
                />
                <StatCard
                    title="Activos"
                    value={stats.activeStudents}
                    icon={Users}
                    variant="success"
                />
                <StatCard
                    title="Ejercicios"
                    value={stats.exerciseCount}
                    icon={TrendingUp}
                    variant="default"
                />
            </StatCardGrid>

            <section>
                <h2 className="text-lg font-semibold mb-4">Gestion y Rendimiento</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                    <QuickActionCard
                        icon={TrendingUp}
                        title="Rendimiento Academico"
                        description="Ver estadisticas detalladas por estudiante y ejercicio"
                        href={`/dashboard/teacher/classroom/${classroom.id}/performance`}
                    />
                    <QuickActionCard
                        icon={Users}
                        title="Estudiantes"
                        description="Lista de estudiantes y perfiles"
                        href={`/dashboard/teacher/classroom/${classroom.id}/students`}
                    />
                </div>
            </section>
        </div>
    )
}
