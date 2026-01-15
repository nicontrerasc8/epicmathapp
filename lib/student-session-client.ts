export type StudentSessionData = {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
  classroom_id: string | null
  institution_id: string | null
}

export const fetchStudentSession = async () => {
  const res = await fetch('/api/student/session', {
    method: 'GET',
    credentials: 'include',
  })
  if (!res.ok) {
    return null
  }
  const data = await res.json()
  return (data?.student as StudentSessionData) ?? null
}
