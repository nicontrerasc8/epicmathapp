import { ClassroomTaskManager } from "@/components/tasks/ClassroomTaskManager"

export default async function TeacherClassroomTasksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ClassroomTaskManager classroomId={id} owner="teacher" />
}
