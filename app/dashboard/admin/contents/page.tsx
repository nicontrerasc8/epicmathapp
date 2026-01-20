import { createClient } from "@/utils/supabase/server"
import ContentsHierarchyClient from "./contents-hierarchy-client"
import { requireInstitution } from "@/lib/institution"

export default async function ContentsPage() {
    const supabase = await createClient()
    const institution = await requireInstitution()

    const [
        { data: institutions },
        { data: classrooms },
        { data: exercises },
        { data: assignments },
    ] = await Promise.all([
        supabase
            .from("edu_institutions")
            .select("id, name, type")
            .eq("id", institution.id)
            .order("name", { ascending: true }),
        supabase
            .from("edu_classrooms")
            .select("id, institution_id, grade, academic_year, active, created_at")
            .eq("institution_id", institution.id)
            .order("academic_year", { ascending: false })
            .order("grade", { ascending: true }),
        supabase
            .from("edu_exercises")
            .select("id, exercise_type, description, active, created_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_exercise_assignments")
            .select("classroom_id, exercise_id, ordering, active, created_at")
            .order("created_at", { ascending: false }),
    ])

    const classroomIds = (classrooms || []).map((c: any) => c.id)
    const filteredAssignments = classroomIds.length
        ? (assignments || []).filter((row: any) => classroomIds.includes(row.classroom_id))
        : []

    return (
        <ContentsHierarchyClient
            institutions={institutions || []}
            classrooms={classrooms || []}
            exercises={exercises || []}
            assignments={filteredAssignments}
        />
    )
}
