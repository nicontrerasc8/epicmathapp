import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import TeacherShell from "./ui/TeacherShell"

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/sign-in")

    const { data: me } = await supabase
        .from("edu_profiles")
        .select("id, first_name, last_name, global_role, active")
        .eq("id", user.id)
        .single()

    if (!me?.active) redirect("/dashboard")
    // Note: We don't strictly check for 'teacher' global_role because admins might want to see teacher view,
    // or a user might be a teacher via membership. But for now let's assume if they are here they are teachers.

    const userName = `${me.first_name} ${me.last_name}`.trim()

    return <TeacherShell userName={userName}>{children}</TeacherShell>
}
