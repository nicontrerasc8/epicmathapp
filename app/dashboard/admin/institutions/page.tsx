import { createClient } from "@/utils/supabase/server"
import InstitutionsTable from "../ui/InstitutionsTable"

export default async function InstitutionsPage() {
    const supabase = await createClient()

    const { data } = await supabase
        .from("edu_institutions")
        .select("id, name, type, created_at")
        .order("created_at", { ascending: false })

    return <InstitutionsTable initialData={data || []} />
}
