import { createClient } from "@/utils/supabase/server"
import ContentsHierarchyClient from "./contents-hierarchy-client"
import { requireInstitution } from "@/lib/institution"

export default async function ContentsPage() {
    const supabase = await createClient()
    const institution = await requireInstitution()

    const [
        { data: institutions },
        { data: classrooms },
        { data: blocks },
        { data: subblocks },
        { data: areas },
        { data: temas },
        { data: exercises },
        { data: assignments },
        { data: classroomBlocks },
        { data: classroomTemaExercises },
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
            .from("edu_academic_blocks")
            .select("id, name, block_type, academic_year, ordering, active, created_at")
            .eq("institution_id", institution.id)
            .order("academic_year", { ascending: false })
            .order("ordering", { ascending: true }),
        supabase
            .from("edu_academic_subblocks")
            .select("id, block_id, name, ordering, active, created_at")
            .eq("institution_id", institution.id)
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_areas")
            .select("id, name, active, created_at")
            .eq("institution_id", institution.id)
            .order("name", { ascending: true }),
        supabase
            .from("edu_temas")
            .select("id, name, area_id, subblock_id, ordering, active, created_at")
            .eq("institution_id", institution.id)
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_exercises")
            .select("id, exercise_type, description, active, created_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_exercise_assignments")
            .select("exercise_id, tema_id, active, created_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_classroom_blocks")
            .select("classroom_id, block_id, active, started_at, ended_at, created_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_classroom_tema_exercises")
            .select("classroom_id, tema_id, exercise_id, active, created_at")
            .order("created_at", { ascending: false }),
    ])

    const classroomIds = (classrooms || []).map((c: any) => c.id)
    const filteredClassroomBlocks = classroomIds.length
        ? (classroomBlocks || []).filter((row: any) => classroomIds.includes(row.classroom_id))
        : []
    const filteredClassroomTemaExercises = classroomIds.length
        ? (classroomTemaExercises || []).filter((row: any) => classroomIds.includes(row.classroom_id))
        : []

    return (
        <ContentsHierarchyClient
            institutions={institutions || []}
            classrooms={classrooms || []}
            blocks={blocks || []}
            subblocks={subblocks || []}
            areas={areas || []}
            temas={temas || []}
            exercises={exercises || []}
            assignments={assignments || []}
            classroomBlocks={filteredClassroomBlocks}
            classroomTemaExercises={filteredClassroomTemaExercises}
        />
    )
}
