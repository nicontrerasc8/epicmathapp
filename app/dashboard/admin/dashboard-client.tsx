"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
    Users,
    GraduationCap,
    Building2,
    BookOpen,
    Target,
    ArrowRight,
    TrendingUp,
    UserPlus,
    FileSpreadsheet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader, StatCard, StatCardGrid } from "@/components/dashboard/core"

interface Stats {
    students: number
    classrooms: number
    institutions: number
    temas: number
    recentExercises: number
    accuracy: number
}

interface RecentClassroom {
    id: string
    grade: string
    grade_id?: string | null
    academic_year: number
    active: boolean
    edu_institutions: { name: string } | null
    edu_institution_grades?: { name: string; code: string } | null
}

interface RecentStudent {
    id: string
    first_name: string
    last_name: string
    full_name: string
    created_at: string
}

interface AdminDashboardClientProps {
    stats: Stats
    recentClassrooms: RecentClassroom[]
    recentStudents: RecentStudent[]
}

// Quick action card component
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
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group rounded-xl border bg-card p-4 hover:shadow-card-hover transition-normal cursor-pointer"
            >
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium group-hover:text-primary transition-fast">
                            {title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {description}
                        </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
            </motion.div>
        </Link>
    )
}

// Fade in animation variants
const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1 },
    }),
}

function getRecentGradeLabel(cls: RecentClassroom) {
    const grade = cls.edu_institution_grades as any
    if (Array.isArray(grade)) {
        return grade[0]?.name || grade[0]?.code || cls.grade
    }
    return grade?.name || grade?.code || cls.grade
}

export default function AdminDashboardClient({
    stats,
    recentClassrooms,
    recentStudents,
}: any) {
    return (
        <div className="space-y-8">
            {/* Page Header */}
            <PageHeader
                title="Dashboard"
                description="Resumen general de la plataforma Ludus"
            />

            {/* Stats Grid */}
            <StatCardGrid columns={4}>
                <StatCard
                    title="Estudiantes"
                    value={stats.students}
                    icon={Users}
                    variant="primary"
                />
                <StatCard
                    title="Aulas Activas"
                    value={stats.classrooms}
                    icon={GraduationCap}
                    variant="success"
                />
                <StatCard
                    title="Instituciones"
                    value={stats.institutions}
                    icon={Building2}
                    variant="default"
                />
                <StatCard
                    title="Precisión (7 días)"
                    value={stats.accuracy}
                    suffix="%"
                    icon={Target}
                    variant={stats.accuracy >= 70 ? "success" : stats.accuracy >= 50 ? "warning" : "danger"}
                    trend={stats.recentExercises > 0 ? {
                        value: stats.accuracy >= 70 ? 5 : stats.accuracy >= 50 ? 0 : -5,
                        label: `${stats.recentExercises} ejercicios`
                    } : undefined}
                />
            </StatCardGrid>

            {/* Quick Actions */}
            <section>
                <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <QuickActionCard
                        icon={UserPlus}
                        title="Agregar Estudiante"
                        description="Registrar nuevo estudiante manualmente"
                        href="/dashboard/admin/students"
                    />
                    <QuickActionCard
                        icon={FileSpreadsheet}
                        title="Importar desde Excel"
                        description="Carga masiva de estudiantes"
                        href="/dashboard/admin/students/import"
                    />
                    <QuickActionCard
                        icon={GraduationCap}
                        title="Nueva Aula"
                        description="Crear un aula para una institución"
                        href="/dashboard/admin/classrooms"
                    />
                </div>
            </section>

            {/* Recent Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Classrooms */}
                <motion.section
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    variants={fadeIn}
                    className="rounded-2xl border bg-card p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Aulas Recientes</h2>
                        <Link href="/dashboard/admin/classrooms">
                            <Button variant="ghost" size="sm">
                                Ver todas <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>

                    {recentClassrooms.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No hay aulas registradas
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentClassrooms.map((cls:any, i:any) => (
                                <motion.div
                                    key={cls.id}
                                    custom={i + 1}
                                    variants={fadeIn}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <Link href={`/dashboard/admin/classrooms/${cls.id}`}>
                                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-fast">
                                            <div>
                                                <div className="font-medium">
                                            {`${getRecentGradeLabel(cls)}`}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {cls.edu_institutions?.name || "Sin institución"} • {cls.academic_year}
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.section>

                {/* Recent Students */}
                <motion.section
                    initial="hidden"
                    animate="visible"
                    custom={1}
                    variants={fadeIn}
                    className="rounded-2xl border bg-card p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Estudiantes Recientes</h2>
                        <Link href="/dashboard/admin/students">
                            <Button variant="ghost" size="sm">
                                Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>

                    {recentStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No hay estudiantes registrados
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentStudents.map((student:any, i:any) => (
                                <motion.div
                                    key={student.id}
                                    custom={i + 1}
                                    variants={fadeIn}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <Link href={`/dashboard/admin/students/${student.id}`}>
                                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-fast">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-primary">
                                                        {student.first_name[0]?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium">{student.full_name}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        {student.id.slice(0, 8)}...
                                                    </div>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.section>
            </div>
        </div>
    )
}
