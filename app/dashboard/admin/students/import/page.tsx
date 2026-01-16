import ImportUsersForm from "./ImportUsersForm"

export default function ImportUsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Carga masiva de usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Importa estudiantes desde Excel
        </p>
      </div>

      <ImportUsersForm />
    </div>
  )
}
