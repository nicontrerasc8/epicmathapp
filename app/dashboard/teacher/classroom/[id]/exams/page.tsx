import { redirect } from "next/navigation"

export default async function TeacherClassroomExamsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/teacher/classroom/${id}`)
}
