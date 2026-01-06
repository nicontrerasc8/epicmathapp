import ClassroomsTable from "../ui/ClassroomTable";

export default function ClassroomsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Clases</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona clases, grados, secciones y asignaciones.
        </p>
      </div>

      <ClassroomsTable />
    </div>
  )
}
