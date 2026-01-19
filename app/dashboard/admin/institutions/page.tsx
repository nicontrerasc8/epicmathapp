import { createClient } from "@/utils/supabase/server"
import InstitutionsTable from "../ui/InstitutionsTable"
import { requireInstitution } from "@/lib/institution"
export default async function InstitutionsPage() {
    const supabase = await createClient()
    const institution = await requireInstitution()

    const { data } = await supabase
        .from("edu_institutions")
        .select("id, name, type, region, active, created_at, code, slug, domain, logo_url")
        .eq("id", institution.id)
        .order("created_at", { ascending: false })

    return <InstitutionsTable initialData={data || []} />
}
