import StudentsTable from "../ui/StudentsTable";

export default function StudentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Estudiantes</h1>
        <p className="text-sm text-muted-foreground">
          Buscar, ver detalle y administrar membresías.
        </p>
      </div>

      <StudentsTable />
    </div>
  )
}
