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

const requiredColumns = ["email", "first_name", "last_name", "role", "institution_id"]
const optionalColumns = ["password", "classroom_id"]
const allowedRoles = ["student", "teacher"]

const columnAliases: Record<string, keyof Row> = {
  email: "email",
  password: "password",
  first_name: "first_name",
  firstname: "first_name",
  "first name": "first_name",
  last_name: "last_name",
  lastname: "last_name",
  "last name": "last_name",
  role: "role",
  institution_id: "institution_id",
  "institution id": "institution_id",
  classroom_id: "classroom_id",
  "classroom id": "classroom_id",
}

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")

export default function ImportUsersForm() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const downloadTemplate = () => {
    const headers = [...requiredColumns, ...optionalColumns]
    const sample = [
      {
        email: "estudiante@correo.com",
        password: "",
        first_name: "Nombre",
        last_name: "Apellido",
        role: "student",
        institution_id: "UUID_INSTITUCION",
        classroom_id: "UUID_AULA",
      },
    ]
    const ws = XLSX.utils.json_to_sheet(sample, { header: headers })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla")
    XLSX.writeFile(wb, "plantilla_estudiantes.xlsx")
  }

  const parseSheet = (data: ArrayBuffer) => {
    const wb = XLSX.read(data, { type: "array" })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as
      (string | number | boolean)[][]

    if (matrix.length < 2) {
      return { rows: [], errors: ["El archivo no tiene filas de datos."] }
    }

    const rawHeaders = matrix[0].map((header) => normalizeHeader(header))
    const indexToKey = rawHeaders.map((header) => {
      const key = columnAliases[header] || columnAliases[header.replace(/_/g, " ")]
      return key || null
    })

    const presentKeys = new Set(indexToKey.filter(Boolean))
    const missing = requiredColumns.filter((col) => !presentKeys.has(col))
    if (missing.length > 0) {
      return {
        rows: [],
        errors: [`Faltan columnas requeridas: ${missing.join(", ")}.`],
      }
    }

    const parsedRows: Row[] = []
    const parseErrors: string[] = []

    for (let i = 1; i < matrix.length; i += 1) {
      const row = matrix[i]
      const hasValues = row.some((cell) => String(cell ?? "").trim() !== "")
      if (!hasValues) continue

      const rowData: Partial<Row> = {}
      row.forEach((cell, index) => {
        const key = indexToKey[index]
        if (!key) return
        rowData[key] = String(cell ?? "").trim() as any
      })

      const rowErrors: string[] = []
      const email = String(rowData.email ?? "").trim().toLowerCase()
      const firstName = String(rowData.first_name ?? "").trim()
      const lastName = String(rowData.last_name ?? "").trim()
      const role = String(rowData.role ?? "").trim().toLowerCase()
      const institutionId = String(rowData.institution_id ?? "").trim()
      const classroomId = String(rowData.classroom_id ?? "").trim()
      const password = String(rowData.password ?? "").trim()

      if (!email) {
        rowErrors.push("email requerido")
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push("email invalido")
      }
      if (!firstName) rowErrors.push("first_name requerido")
      if (!lastName) rowErrors.push("last_name requerido")
      if (!institutionId) rowErrors.push("institution_id requerido")
      if (!role || !allowedRoles.includes(role)) {
        rowErrors.push("role debe ser student o teacher")
      }

      if (rowErrors.length > 0) {
        parseErrors.push(`Fila ${i + 1}: ${rowErrors.join(", ")}`)
        continue
      }

      parsedRows.push({
        email,
        first_name: firstName,
        last_name: lastName,
        role: role as Row["role"],
        institution_id: institutionId,
        classroom_id: classroomId || undefined,
        password: password || undefined,
      })
    }

    if (parsedRows.length === 0 && parseErrors.length === 0) {
      parseErrors.push("No se detectaron filas con datos validos.")
    }

    return { rows: parsedRows, errors: parseErrors }
  }

  const onFile = async (file: File) => {
    const data = await file.arrayBuffer()
    const parsed = parseSheet(data)
    setRows(parsed.rows)
    setErrors(parsed.errors)
    setResult(null)
    setFileName(file.name)
  }

  const submit = async () => {
    if (errors.length > 0 || rows.length === 0) return
    setLoading(true)
    const res = await importUsersAction(rows)
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          Descargar plantilla Excel
        </Button>
        <span className="text-xs text-muted-foreground">
          Columnas: {requiredColumns.join(", ")} (requeridas), {optionalColumns.join(", ")} (opcionales)
        </span>
      </div>

      <div className="space-y-2">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files && onFile(e.target.files[0])}
        />
        {fileName && (
          <div className="text-xs text-muted-foreground">
            Archivo: {fileName}
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {errors.slice(0, 6).map((err) => (
            <div key={err}>{err}</div>
          ))}
          {errors.length > 6 && (
            <div>Y {errors.length - 6} errores mas...</div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="text-sm text-muted-foreground">
            {rows.length} usuarios listos para importar
          </div>

          <Button onClick={submit} disabled={loading || errors.length > 0}>
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
