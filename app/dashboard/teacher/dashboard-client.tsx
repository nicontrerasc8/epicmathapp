"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    School,
    Users,
    ChevronRight,
    GraduationCap,
    BookOpen,
    Calendar
} from "lucide-react"
import { PageHeader, StatCard, StatCardGrid } from "@/components/dashboard/core"

interface ClassroomCard {
    classroomId: string
    title: string
    subtitle: string
    gradeLabel: string
    institutionName: string
    academicYear: number
    memberCount?: number
}

interface TeacherDashboardClientProps {
    classrooms: ClassroomCard[]
}

export default function TeacherDashboardClient({ classrooms }: TeacherDashboardClientProps) {
    const router = useRouter()

    const grouped = useMemo(() => {
        const map = new Map<string, ClassroomCard[]>()
        for (const c of classrooms) {
            const key = c.institutionName
            map.set(key, [...(map.get(key) ?? []), c])
        }
        return Array.from(map.entries())
    }, [classrooms])

    return (
        <div className="space-y-8">
            <PageHeader
                title="Mis Clases"
                description="Gestiona tus aulas y estudiantes asignados"
            />


            {/* Classrooms List */}
            {classrooms.length === 0 ? (
                <div className="rounded-2xl border bg-card p-10 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <School className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No tienes clases asignadas</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Asegúrate de estar registrado como profesor en una institución y tener aulas asignadas.
                    </p>
                </div>
            ) : (
                <div className="space-y-10">
                    {grouped.map(([institutionName, list], groupIdx) => (
                        <motion.section
                            key={institutionName}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: groupIdx * 0.1 }}
                        >
                    

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {list.map((cls, i) => (
                                    <motion.div
                                        key={cls.classroomId}
                                        whileHover={{ y: -4 }}
                                        className="group relative bg-card border rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                                    <GraduationCap className="w-6 h-6" />
                                                </div>
                                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                                                    {cls.academicYear}
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                                                {cls.gradeLabel}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {cls.subtitle}
                                            </p>

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    <span>Estudiantes</span>
                                                </div>
                                                {/* Add more metrics here if available */}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => router.push(`/dashboard/teacher/classroom/${cls.classroomId}`)}
                                            className="mt-6 w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                        >
                                            Ver Aula <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.section>
                    ))}
                </div>
            )}
        </div>
    )
}
