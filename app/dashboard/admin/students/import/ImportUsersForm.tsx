"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { importUsersAction } from "./import.actions"

type Row = {
  email: string
  password?: string
  first_name: string
  last_name: string
  role: "student" | "teacher"
  institution_id: string
  classroom_id?: string
}

export default function ImportUsersForm() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const onFile = async (file: File) => {
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Row>(ws)
    setRows(json)
  }

  const submit = async () => {
    setLoading(true)
    const res = await importUsersAction(rows)
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => e.target.files && onFile(e.target.files[0])}
      />

      {rows.length > 0 && (
        <>
          <div className="text-sm text-muted-foreground">
            {rows.length} usuarios detectados
          </div>

          <Button onClick={submit} disabled={loading}>
            {loading ? "Importando..." : "Importar usuarios"}
          </Button>
        </>
      )}

      {result && (
        <pre className="text-xs bg-muted p-3 rounded-xl max-h-60 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
