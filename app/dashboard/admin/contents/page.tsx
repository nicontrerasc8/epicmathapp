import { createClient } from "@/utils/supabase/server"
import ContentsAdminClient from "./contents-admin-client"

export default async function ContentsPage() {
    const supabase = await createClient()

    const [
        { data: blocks },
        { data: subblocks },
        { data: areas },
        { data: temas },
        { data: exercises },
        { data: assignments },
    ] = await Promise.all([
        supabase
            .from("edu_academic_blocks")
            .select("id, name, block_type, academic_year, ordering, active, created_at")
            .order("academic_year", { ascending: false })
            .order("ordering", { ascending: true }),
        supabase
            .from("edu_academic_subblocks")
            .select("id, block_id, name, ordering, active, created_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_areas")
            .select("id, name, active, created_at")
            .order("name", { ascending: true }),
        supabase
            .from("edu_temas")
            .select("id, area_id, subblock_id, ordering, active, created_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_exercises")
            .select("id, exercise_type, description, active, created_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("edu_exercise_assignments")
            .select("id, exercise_id, tema_id, ordering, active, created_at")
            .order("created_at", { ascending: false }),
    ])

    return (
        <ContentsAdminClient
            blocks={blocks || []}
            subblocks={subblocks || []}
            areas={areas || []}
            temas={temas || []}
            exercises={exercises || []}
            assignments={assignments || []}
        />
    )
}
