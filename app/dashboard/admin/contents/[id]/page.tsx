import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import ExercisesClient from "./exercises-client"

export default async function TemaDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const { data: tema } = await supabase
        .from("edu_temas")
        .select(`
            id,
            area:edu_areas ( name ),
            subblock:edu_academic_subblocks ( name )
        `)
        .eq("id", id)
        .single()

    if (!tema) notFound()

    const { data: exercises } = await supabase
        .from("edu_exercise_assignments")
        .select(`
            id,
            created_at,
            exercise:edu_exercises ( id, description, exercise_type )
        `)
        .eq("tema_id", id)
        .order("created_at", { ascending: false })

    const rows = (exercises || []).map((row: any) => {
        const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
        return {
            id: row.id,
            exercise_id: exercise?.id ?? null,
            description: exercise?.description ?? exercise?.id ?? "Sin descripcion",
            exercise_type: exercise?.exercise_type ?? "sin_tipo",
            created_at: row.created_at,
        }
    })

    return <ExercisesClient tema={tema} exercises={rows} />
}
