import { ClassroomTaskManager } from "@/components/tasks/ClassroomTaskManager"

export default async function AdminClassroomTasksPage({
  params,
}: {
  params: Promise<{ classroomId: string }>
}) {
  const { classroomId } = await params
  return <ClassroomTaskManager classroomId={classroomId} owner="admin" />
}
