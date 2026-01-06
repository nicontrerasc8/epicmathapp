import StudentDetail from "../../ui/StudentDetail";

export default function StudentDetailPage({ params }: { params: { studentId: string } }) {
    return <StudentDetail studentId={params.studentId} />
}
