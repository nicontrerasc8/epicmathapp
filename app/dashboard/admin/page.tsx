'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Plus, Trash2, RefreshCw } from 'lucide-react'

type RoleGlobal = 'student' | 'teacher' | 'admin'
type MemberRole = 'student' | 'teacher'
type BlockType = 'bimestre' | 'trimestre' | 'unidad' | 'semestre' | 'modulo' | 'bloque' | 'periodo'
type InstitutionType = 'academia' | 'colegio' | 'universidad'

type EduProfile = {
  id: string
  first_name: string
  last_name: string
  global_role: RoleGlobal | null
  active: boolean
  created_at?: string
}

type EduInstitution = {
  id: string
  name: string
  type: InstitutionType
  region: string | null
  active: boolean
  created_at?: string
}

type EduClassroom = {
  id: string
  institution_id: string | null
  grade: string
  section: string | null
  academic_year: number
  active: boolean
  created_at?: string
}

type EduArea = {
  id: string
  name: string
  active: boolean
  created_at?: string
}

type EduAcademicBlock = {
  id: string
  area_id: string | null
  name: string
  block_type: BlockType
  academic_year: number
  ordering: number | null
  active: boolean
  created_at?: string
}

type EduSubblock = {
  id: string
  block_id: string | null
  name: string
  ordering: number | null
  active: boolean
  created_at?: string
}

type EduTema = {
  id: string
  area_id: string | null
  subblock_id: string | null
  name: string
  grade: string
  ordering: number | null
  active: boolean
  created_at?: string
}

type EduExercise = {
  id: string
  exercise_type: string
  description: string | null
  active: boolean
  created_at?: string
}

type EduExerciseAssignment = {
  id: string
  exercise_id: string | null
  tema_id: string | null
  ordering: number | null
  config_override: any
  active: boolean
  created_at?: string
}

type EduMember = {
  id: string
  profile_id: string | null
  institution_id: string | null
  classroom_id: string | null
  role: MemberRole
  active: boolean
  created_at?: string
}

type EduClassroomTema = {
  id: string
  classroom_id: string | null
  tema_id: string | null
  ordering: number | null
  active: boolean
  created_at?: string
}

type EduClassroomTemaExercise = {
  id: string
  classroom_id: string | null
  tema_id: string | null
  exercise_id: string | null
  ordering: number | null
  active: boolean
  created_at?: string
}

type TabKey =
  | 'users'
  | 'institutions'
  | 'classrooms'
  | 'areas'
  | 'blocks'
  | 'subblocks'
  | 'temas'
  | 'exercises'
  | 'exercise-assignments'
  | 'assign-temas'
  | 'assign-exercises'
  | 'assign-users'

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ')
}

export default function AdminConsolePage() {
  const supabase = useMemo(() => createClient(), [])
  const [tab, setTab] = useState<TabKey>('users')

  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [profiles, setProfiles] = useState<EduProfile[]>([])
  const [institutions, setInstitutions] = useState<EduInstitution[]>([])
  const [classrooms, setClassrooms] = useState<EduClassroom[]>([])
  const [areas, setAreas] = useState<EduArea[]>([])
  const [blocks, setBlocks] = useState<EduAcademicBlock[]>([])
  const [subblocks, setSubblocks] = useState<EduSubblock[]>([])
  const [temas, setTemas] = useState<EduTema[]>([])
  const [exercises, setExercises] = useState<EduExercise[]>([])
  const [exerciseAssignments, setExerciseAssignments] = useState<EduExerciseAssignment[]>([])
  const [members, setMembers] = useState<EduMember[]>([])
  const [classroomTemas, setClassroomTemas] = useState<EduClassroomTema[]>([])
  const [classroomTemaExercises, setClassroomTemaExercises] = useState<EduClassroomTemaExercise[]>([])

  // -----------------------------
  // Guard admin
  // -----------------------------
  useEffect(() => {
    ;(async () => {
      try {
        setChecking(true)
        const { data: userRes } = await supabase.auth.getUser()
        const user = userRes?.user
        if (!user) {
          setIsAdmin(false)
          setChecking(false)
          return
        }

        const { data: me, error } = await supabase
          .from('edu_profiles')
          .select('id, global_role, active')
          .eq('id', user.id)
          .single()

        if (error || !me?.active) {
          setIsAdmin(false)
          setChecking(false)
          return
        }

        setIsAdmin(me.global_role === 'admin')
      } finally {
        setChecking(false)
      }
    })()
  }, [supabase])

  // -----------------------------
  // Load all data
  // -----------------------------
  const loadAll = async () => {
    setLoading(true)
    setMsg(null)

    const safe = async <T,>(fn: () => Promise<{ data: T | null; error: any }>, label: string) => {
      const { data, error } = await fn()
      if (error) throw new Error(`${label}: ${error.message ?? String(error)}`)
      return data
    }

    try {


    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message ?? 'Error cargando datos.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!checking && isAdmin) loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin])

  // -----------------------------
  // Helpers CRUD
  // -----------------------------
  const toastOk = (text: string) => setMsg({ type: 'ok', text })
  const toastErr = (text: string) => setMsg({ type: 'err', text })

  async function insertRow<T extends object>(table: string, payload: T) {
    setLoading(true)
    setMsg(null)
    try {
      const { data, error } = await supabase.from(table).insert(payload as any).select('*').single()
      if (error) throw error
      toastOk(`Creado en ${table}`)
      await loadAll()
      return data
    } catch (e: any) {
      toastErr(e?.message ?? `Error creando en ${table}`)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function updateRow<T extends object>(table: string, id: string, payload: T) {
    setLoading(true)
    setMsg(null)
    try {
      const { data, error } = await supabase.from(table).update(payload as any).eq('id', id).select('*').single()
      if (error) throw error
      toastOk(`Actualizado en ${table}`)
      await loadAll()
      return data
    } catch (e: any) {
      toastErr(e?.message ?? `Error actualizando en ${table}`)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function deleteRow(table: string, id: string) {
    setLoading(true)
    setMsg(null)
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      toastOk(`Eliminado de ${table}`)
      await loadAll()
    } catch (e: any) {
      toastErr(e?.message ?? `Error eliminando de ${table}`)
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------
  // Forms state
  // -----------------------------
  const [newProfile, setNewProfile] = useState<Partial<EduProfile>>({
    id: '',
    first_name: '',
    last_name: '',
    global_role: 'student',
    active: true,
  })

  const [newInstitution, setNewInstitution] = useState<Partial<EduInstitution>>({
    name: '',
    type: 'colegio',
    region: 'Lima',
    active: true,
  })

  const [newClassroom, setNewClassroom] = useState<Partial<EduClassroom>>({
    institution_id: '',
    grade: '1',
    section: 'A',
    academic_year: new Date().getFullYear(),
    active: true,
  })

  const [newArea, setNewArea] = useState<Partial<EduArea>>({
    name: '',
    active: true,
  })

  const [newBlock, setNewBlock] = useState<Partial<EduAcademicBlock>>({
    area_id: '',
    name: '',
    block_type: 'bimestre',
    academic_year: new Date().getFullYear(),
    ordering: 1,
    active: true,
  })

  const [newSubblock, setNewSubblock] = useState<Partial<EduSubblock>>({
    block_id: '',
    name: '',
    ordering: 1,
    active: true,
  })

  const [newTema, setNewTema] = useState<Partial<EduTema>>({
    area_id: '',
    subblock_id: '',
    name: '',
    grade: '1',
    ordering: 1,
    active: true,
  })

  const [newExercise, setNewExercise] = useState<Partial<EduExercise>>({
    id: '',
    exercise_type: '',
    description: '',
    active: true,
  })

  const [newExerciseAssignment, setNewExerciseAssignment] = useState<Partial<EduExerciseAssignment>>({
    exercise_id: '',
    tema_id: '',
    ordering: 1,
    config_override: null,
    active: true,
  })

  const [assignTema, setAssignTema] = useState<{
    classroom_id: string
    tema_id: string
    ordering: number
    active: boolean
  }>({
    classroom_id: '',
    tema_id: '',
    ordering: 1,
    active: true,
  })

  const [assignExercise, setAssignExercise] = useState<{
    classroom_id: string
    tema_id: string
    exercise_id: string
    ordering: number
    active: boolean
  }>({
    classroom_id: '',
    tema_id: '',
    exercise_id: '',
    ordering: 1,
    active: true,
  })

  const [assignUser, setAssignUser] = useState<{
    profile_id: string
    institution_id: string
    classroom_id: string
    role: MemberRole
    active: boolean
  }>({
    profile_id: '',
    institution_id: '',
    classroom_id: '',
    role: 'student',
    active: true,
  })

  // -----------------------------
  // Derived maps
  // -----------------------------
  const instMap = useMemo(() => new Map(institutions.map((i) => [i.id, i])), [institutions])
  const classroomMap = useMemo(() => new Map(classrooms.map((c) => [c.id, c])), [classrooms])
  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas])
  const blockMap = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks])
  const subblockMap = useMemo(() => new Map(subblocks.map((s) => [s.id, s])), [subblocks])
  const temaMap = useMemo(() => new Map(temas.map((t) => [t.id, t])), [temas])
  const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])

  // -----------------------------
  // UI
  // -----------------------------
  if (checking) {
    return (
      <div className="container py-10">
        <div className="rounded-2xl border border-border bg-card p-6">Verificando sesión…</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container py-10">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>No autorizado. Tu perfil no tiene global_role = admin.</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">SuperAdmin Console</h1>
          <p className="text-sm text-muted-foreground">CRUD completo de todas las tablas del sistema educativo.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadAll} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {loading ? 'Cargando…' : 'Refrescar'}
          </Button>
        </div>
      </div>

      {msg && (
        <div
          className={cx(
            'mb-5 rounded-xl border px-4 py-3 text-sm flex items-center gap-2',
            msg.type === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
          )}
        >
          {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Usuarios</TabButton>
        <TabButton active={tab === 'institutions'} onClick={() => setTab('institutions')}>Instituciones</TabButton>
        <TabButton active={tab === 'classrooms'} onClick={() => setTab('classrooms')}>Clases</TabButton>
        <TabButton active={tab === 'areas'} onClick={() => setTab('areas')}>Áreas</TabButton>
        <TabButton active={tab === 'blocks'} onClick={() => setTab('blocks')}>Bloques Académicos</TabButton>
        <TabButton active={tab === 'subblocks'} onClick={() => setTab('subblocks')}>Sub-bloques</TabButton>
        <TabButton active={tab === 'temas'} onClick={() => setTab('temas')}>Temas</TabButton>
        <TabButton active={tab === 'exercises'} onClick={() => setTab('exercises')}>Ejercicios</TabButton>
        <TabButton active={tab === 'exercise-assignments'} onClick={() => setTab('exercise-assignments')}>Ejercicios → Temas</TabButton>
        <TabButton active={tab === 'assign-temas'} onClick={() => setTab('assign-temas')}>Temas → Clases</TabButton>
        <TabButton active={tab === 'assign-exercises'} onClick={() => setTab('assign-exercises')}>Ejercicios → Clases</TabButton>
        <TabButton active={tab === 'assign-users'} onClick={() => setTab('assign-users')}>Usuarios → Clases</TabButton>
      </div>

      {/* Content */}
      {tab === 'users' && (
        <Section title="Usuarios (edu_profiles)">
          <div className="grid gap-3 md:grid-cols-5">
            <Input
              label="UUID (auth.users.id)"
              value={newProfile.id ?? ''}
              placeholder="UUID del usuario"
              onChange={(v) => setNewProfile((s) => ({ ...s, id: v }))}
            />
            <Input label="Nombre" value={newProfile.first_name ?? ''} onChange={(v) => setNewProfile((s) => ({ ...s, first_name: v }))} />
            <Input label="Apellido" value={newProfile.last_name ?? ''} onChange={(v) => setNewProfile((s) => ({ ...s, last_name: v }))} />
            <Select
              label="Rol global"
              value={(newProfile.global_role ?? 'student') as string}
              onChange={(v) => setNewProfile((s) => ({ ...s, global_role: v as RoleGlobal }))}
              options={[
                { value: 'student', label: 'student' },
                { value: 'teacher', label: 'teacher' },
                { value: 'admin', label: 'admin' },
              ]}
            />
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!newProfile.active}
                  onChange={(e) => setNewProfile((s) => ({ ...s, active: e.target.checked }))}
                />
                Activo
              </label>
              <Button
                className="ml-auto"
                onClick={() => {
                  const id = (newProfile.id ?? '').trim()
                  if (!id) return toastErr('Falta UUID del usuario.')
                  if (!newProfile.first_name?.trim()) return toastErr('Falta nombre.')
                  if (!newProfile.last_name?.trim()) return toastErr('Falta apellido.')
                  insertRow('edu_profiles', {
                    id,
                    first_name: newProfile.first_name.trim(),
                    last_name: newProfile.last_name.trim(),
                    global_role: newProfile.global_role ?? 'student',
                    active: newProfile.active ?? true,
                  })
                }}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left">
                  <th className="p-3">ID</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Activo</th>
                  <th className="p-3 w-[140px]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{p.id.slice(0, 8)}...</td>
                    <td className="p-3">{p.first_name} {p.last_name}</td>
                    <td className="p-3">
                      <select
                        className="rounded-md border border-border bg-input px-2 py-1"
                        value={(p.global_role ?? 'student') as string}
                        onChange={(e) => updateRow('edu_profiles', p.id, { global_role: e.target.value })}
                      >
                        <option value="student">student</option>
                        <option value="teacher">teacher</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) => updateRow('edu_profiles', p.id, { active: e.target.checked })}
                      />
                    </td>
                    <td className="p-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteRow('edu_profiles', p.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={5}>No hay perfiles.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab === 'institutions' && (
        <Section title="Instituciones (edu_institutions)">
          <div className="grid gap-3 md:grid-cols-4">
            <Input label="Nombre" value={newInstitution.name ?? ''} onChange={(v) => setNewInstitution((s) => ({ ...s, name: v }))} />
            <Select
              label="Tipo"
              value={(newInstitution.type ?? 'colegio') as string}
              onChange={(v) => setNewInstitution((s) => ({ ...s, type: v as InstitutionType }))}
              options={[
                { value: 'colegio', label: 'Colegio' },
                { value: 'academia', label: 'Academia' },
                { value: 'universidad', label: 'Universidad' },
              ]}
            />
            <Input label="Región" value={newInstitution.region ?? ''} onChange={(v) => setNewInstitution((s) => ({ ...s, region: v }))} />
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!newInstitution.active}
                  onChange={(e) => setNewInstitution((s) => ({ ...s, active: e.target.checked }))}
                />
                Activo
              </label>
              <Button
                className="ml-auto"
                onClick={() => {
                  if (!newInstitution.name?.trim()) return toastErr('Falta nombre.')
                  insertRow('edu_institutions', {
                    name: newInstitution.name.trim(),
                    type: newInstitution.type ?? 'colegio',
                    region: newInstitution.region?.trim() || null,
                    active: newInstitution.active ?? true,
                  })
                }}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear
              </Button>
            </div>
          </div>

          <ListTable
            rows={institutions}
            columns={[
              { key: 'name', label: 'Nombre' },
              { key: 'type', label: 'Tipo' },
              { key: 'region', label: 'Región' },
              { key: 'active', label: 'Activo', render: (r) => (r.active ? 'Sí' : 'No') },
            ]}
            onDelete={(id) => deleteRow('edu_institutions', id)}
            loading={loading}
          />
        </Section>
      )}

      {tab === 'classrooms' && (
        <Section title="Clases (edu_classrooms)">
          <div className="grid gap-3 md:grid-cols-5">
            <Select
              label="Institución"
              value={newClassroom.institution_id ?? ''}
              onChange={(v) => setNewClassroom((s) => ({ ...s, institution_id: v || null }))}
              options={[
                { value: '', label: 'Sin institución' },
                ...institutions.map((i) => ({ value: i.id, label: i.name })),
              ]}
            />
            <Input label="Grado" value={newClassroom.grade ?? ''} onChange={(v) => setNewClassroom((s) => ({ ...s, grade: v }))} />
            <Input label="Sección" value={newClassroom.section ?? ''} onChange={(v) => setNewClassroom((s) => ({ ...s, section: v }))} />
            <Input
              label="Año académico"
              value={String(newClassroom.academic_year ?? new Date().getFullYear())}
              onChange={(v) => setNewClassroom((s) => ({ ...s, academic_year: Number(v) || new Date().getFullYear() }))}
            />
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!newClassroom.active}
                  onChange={(e) => setNewClassroom((s) => ({ ...s, active: e.target.checked }))}
                />
                Activo
              </label>
              <Button
                className="ml-auto"
                onClick={() => {
                  if (!newClassroom.grade?.trim()) return toastErr('Falta grado.')
                  insertRow('edu_classrooms', {
                    institution_id: newClassroom.institution_id || null,
                    grade: newClassroom.grade.trim(),
                    section: newClassroom.section?.trim() || null,
                    academic_year: newClassroom.academic_year ?? new Date().getFullYear(),
                    active: newClassroom.active ?? true,
                  })
                }}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left">
                  <th className="p-3">Institución</th>
                  <th className="p-3">Grado</th>
                  <th className="p-3">Sección</th>
                  <th className="p-3">Año</th>
                  <th className="p-3">Activo</th>
                  <th className="p-3 w-[140px]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {classrooms.map((c) => {
                  const inst = c.institution_id ? instMap.get(c.institution_id) : null
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="p-3">{inst?.name ?? '—'}</td>
                      <td className="p-3">{c.grade}</td>
                      <td className="p-3">{c.section ?? '—'}</td>
                      <td className="p-3">{c.academic_year}</td>
<td className="p-3">
<input
type="checkbox"
checked={c.active}
onChange={(e) => updateRow('edu_classrooms', c.id, { active: e.target.checked })}
/>
</td>
<td className="p-3">
<Button variant="destructive" size="sm" onClick={() => deleteRow('edu_classrooms', c.id)} disabled={loading}>
<Trash2 className="h-4 w-4" />
</Button>
</td>
</tr>
)
})}
{classrooms.length === 0 && (
<tr>
<td className="p-3 text-muted-foreground" colSpan={6}>No hay clases.</td>
</tr>
)}
</tbody>
</table>
</div>
</Section>
)}
  {tab === 'areas' && (
    <Section title="Áreas (edu_areas)">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Nombre" value={newArea.name ?? ''} onChange={(v) => setNewArea((s) => ({ ...s, name: v }))} />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newArea.active}
              onChange={(e) => setNewArea((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>
          <Button
            className="ml-auto"
            onClick={() => {
              if (!newArea.name?.trim()) return toastErr('Falta nombre del área.')
              insertRow('edu_areas', {
                name: newArea.name.trim(),
                active: newArea.active ?? true,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear
          </Button>
        </div>
      </div>

      <ListTable
        rows={areas}
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'active', label: 'Activo', render: (r) => (r.active ? 'Sí' : 'No') },
        ]}
        onDelete={(id) => deleteRow('edu_areas', id)}
        loading={loading}
      />
    </Section>
  )}

  {tab === 'blocks' && (
    <Section title="Bloques Académicos (edu_academic_blocks)">
      <div className="grid gap-3 md:grid-cols-6">
        <Select
          label="Área"
          value={newBlock.area_id ?? ''}
          onChange={(v) => setNewBlock((s) => ({ ...s, area_id: v || null }))}
          options={[
            { value: '', label: 'Sin área' },
            ...areas.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <Input label="Nombre" value={newBlock.name ?? ''} onChange={(v) => setNewBlock((s) => ({ ...s, name: v }))} />
        <Select
          label="Tipo"
          value={newBlock.block_type ?? 'bimestre'}
          onChange={(v) => setNewBlock((s) => ({ ...s, block_type: v as BlockType }))}
          options={[
            { value: 'bimestre', label: 'Bimestre' },
            { value: 'trimestre', label: 'Trimestre' },
            { value: 'unidad', label: 'Unidad' },
            { value: 'semestre', label: 'Semestre' },
            { value: 'modulo', label: 'Módulo' },
            { value: 'bloque', label: 'Bloque' },
            { value: 'periodo', label: 'Periodo' },
          ]}
        />
        <Input
          label="Año"
          value={String(newBlock.academic_year ?? new Date().getFullYear())}
          onChange={(v) => setNewBlock((s) => ({ ...s, academic_year: Number(v) || new Date().getFullYear() }))}
        />
        <Input
          label="Orden"
          value={String(newBlock.ordering ?? 1)}
          onChange={(v) => setNewBlock((s) => ({ ...s, ordering: Number(v) || 1 }))}
        />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newBlock.active}
              onChange={(e) => setNewBlock((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>
          <Button
            className="ml-auto"
            onClick={() => {
              if (!newBlock.name?.trim()) return toastErr('Falta nombre del bloque.')
              insertRow('edu_academic_blocks', {
                area_id: newBlock.area_id || null,
                name: newBlock.name.trim(),
                block_type: newBlock.block_type ?? 'bimestre',
                academic_year: newBlock.academic_year ?? new Date().getFullYear(),
                ordering: newBlock.ordering ?? 1,
                active: newBlock.active ?? true,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-[1050px] w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">Área</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Año</th>
              <th className="p-3">Orden</th>
              <th className="p-3">Activo</th>
              <th className="p-3 w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => {
              const area = b.area_id ? areaMap.get(b.area_id) : null
              return (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-3">{area?.name ?? '—'}</td>
                  <td className="p-3">{b.name}</td>
                  <td className="p-3">{b.block_type}</td>
                  <td className="p-3">{b.academic_year}</td>
                  <td className="p-3">{b.ordering ?? '—'}</td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={b.active}
                      onChange={(e) => updateRow('edu_academic_blocks', b.id, { active: e.target.checked })}
                    />
                  </td>
                  <td className="p-3">
                    <Button variant="destructive" size="sm" onClick={() => deleteRow('edu_academic_blocks', b.id)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {blocks.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>No hay bloques.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  )}

  {tab === 'subblocks' && (
    <Section title="Sub-bloques (edu_academic_subblocks)">
      <div className="grid gap-3 md:grid-cols-4">
        <Select
          label="Bloque"
          value={newSubblock.block_id ?? ''}
          onChange={(v) => setNewSubblock((s) => ({ ...s, block_id: v || null }))}
          options={[
            { value: '', label: 'Sin bloque' },
            ...blocks.map((b) => ({ value: b.id, label: `${b.name} (${b.block_type})` })),
          ]}
        />
        <Input label="Nombre" value={newSubblock.name ?? ''} onChange={(v) => setNewSubblock((s) => ({ ...s, name: v }))} />
        <Input
          label="Orden"
          value={String(newSubblock.ordering ?? 1)}
          onChange={(v) => setNewSubblock((s) => ({ ...s, ordering: Number(v) || 1 }))}
        />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newSubblock.active}
              onChange={(e) => setNewSubblock((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>
          <Button
            className="ml-auto"
            onClick={() => {
              if (!newSubblock.name?.trim()) return toastErr('Falta nombre del sub-bloque.')
              insertRow('edu_academic_subblocks', {
                block_id: newSubblock.block_id || null,
                name: newSubblock.name.trim(),
                ordering: newSubblock.ordering ?? 1,
                active: newSubblock.active ?? true,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">Bloque</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Orden</th>
              <th className="p-3">Activo</th>
              <th className="p-3 w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {subblocks.map((sb) => {
              const block = sb.block_id ? blockMap.get(sb.block_id) : null
              return (
                <tr key={sb.id} className="border-t border-border">
                  <td className="p-3">{block ? `${block.name} (${block.block_type})` : '—'}</td>
                  <td className="p-3">{sb.name}</td>
                  <td className="p-3">{sb.ordering ?? '—'}</td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={sb.active}
                      onChange={(e) => updateRow('edu_academic_subblocks', sb.id, { active: e.target.checked })}
                    />
                  </td>
                  <td className="p-3">
                    <Button variant="destructive" size="sm" onClick={() => deleteRow('edu_academic_subblocks', sb.id)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {subblocks.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>No hay sub-bloques.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  )}

  {tab === 'temas' && (
    <Section title="Temas (edu_temas)">
      <div className="grid gap-3 md:grid-cols-6">
        <Select
          label="Área"
          value={newTema.area_id ?? ''}
          onChange={(v) => setNewTema((s) => ({ ...s, area_id: v || null }))}
          options={[
            { value: '', label: 'Sin área' },
            ...areas.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <Select
          label="Sub-bloque"
          value={newTema.subblock_id ?? ''}
          onChange={(v) => setNewTema((s) => ({ ...s, subblock_id: v || null }))}
          options={[
            { value: '', label: 'Sin sub-bloque' },
            ...subblocks.map((sb) => ({ value: sb.id, label: sb.name })),
          ]}
        />
        <Input label="Nombre" value={newTema.name ?? ''} onChange={(v) => setNewTema((s) => ({ ...s, name: v }))} />
        <Input label="Grado" value={newTema.grade ?? ''} onChange={(v) => setNewTema((s) => ({ ...s, grade: v }))} />
        <Input
          label="Orden"
          value={String(newTema.ordering ?? 1)}
          onChange={(v) => setNewTema((s) => ({ ...s, ordering: Number(v) || 1 }))}
        />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newTema.active}
              onChange={(e) => setNewTema((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>
          <Button
            className="ml-auto"
            onClick={() => {
              if (!newTema.name?.trim()) return toastErr('Falta nombre del tema.')
              if (!newTema.grade?.trim()) return toastErr('Falta grado.')
              insertRow('edu_temas', {
                area_id: newTema.area_id || null,
                subblock_id: newTema.subblock_id || null,
                name: newTema.name.trim(),
                grade: newTema.grade.trim(),
                ordering: newTema.ordering ?? 1,
                active: newTema.active ?? true,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-[1150px] w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">Área</th>
              <th className="p-3">Sub-bloque</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Grado</th>
              <th className="p-3">Orden</th>
              <th className="p-3">Activo</th>
              <th className="p-3 w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {temas.map((t) => {
              const area = t.area_id ? areaMap.get(t.area_id) : null
              const subblock = t.subblock_id ? subblockMap.get(t.subblock_id) : null
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3">{area?.name ?? '—'}</td>
                  <td className="p-3">{subblock?.name ?? '—'}</td>
                  <td className="p-3">{t.name}</td>
                  <td className="p-3">{t.grade}</td>
                  <td className="p-3">{t.ordering ?? '—'}</td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={t.active}
                      onChange={(e) => updateRow('edu_temas', t.id, { active: e.target.checked })}
                    />
                  </td>
                  <td className="p-3">
                    <Button variant="destructive" size="sm" onClick={() => deleteRow('edu_temas', t.id)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {temas.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>No hay temas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  )}

  {tab === 'exercises' && (
    <Section title="Ejercicios (edu_exercises)">
      <div className="grid gap-3 md:grid-cols-4">
        <Input
          label="ID del ejercicio"
          value={newExercise.id ?? ''}
          placeholder="ej: suma_basica_01"
          onChange={(v) => setNewExercise((s) => ({ ...s, id: v }))}
        />
        <Input
          label="Tipo"
          value={newExercise.exercise_type ?? ''}
          placeholder="ej: multiple_choice"
          onChange={(v) => setNewExercise((s) => ({ ...s, exercise_type: v }))}
        />
        <Input
          label="Descripción"
          value={newExercise.description ?? ''}
          onChange={(v) => setNewExercise((s) => ({ ...s, description: v }))}
        />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newExercise.active}
              onChange={(e) => setNewExercise((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>
          <Button
            className="ml-auto"
            onClick={() => {
              if (!newExercise.id?.trim()) return toastErr('Falta ID del ejercicio.')
              if (!newExercise.exercise_type?.trim()) return toastErr('Falta tipo de ejercicio.')
              insertRow('edu_exercises', {
                id: newExercise.id.trim(),
                exercise_type: newExercise.exercise_type.trim(),
                description: newExercise.description?.trim() || null,
                active: newExercise.active ?? true,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">ID</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Descripción</th>
              <th className="p-3">Activo</th>
              <th className="p-3 w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex) => (
              <tr key={ex.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{ex.id}</td>
                <td className="p-3">{ex.exercise_type}</td>
                <td className="p-3">{ex.description ?? '—'}</td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={ex.active}
                    onChange={(e) => updateRow('edu_exercises', ex.id, { active: e.target.checked })}
                  />
                </td>
                <td className="p-3">
                  <Button variant="destructive" size="sm" onClick={() => deleteRow('edu_exercises', ex.id)} disabled={loading}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {exercises.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>No hay ejercicios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  )}

  {tab === 'exercise-assignments' && (
    <Section title="Asignar Ejercicios a Temas (edu_exercise_assignments)">
      <div className="grid gap-3 md:grid-cols-4">
        <Select
          label="Ejercicio"
          value={newExerciseAssignment.exercise_id ?? ''}
          onChange={(v) => setNewExerciseAssignment((s) => ({ ...s, exercise_id: v }))}
          options={[
            { value: '', label: 'Elige ejercicio…' },
            ...exercises.map((ex) => ({ value: ex.id, label: `${ex.id} (${ex.exercise_type})` })),
          ]}
        />
        <Select
          label="Tema"
          value={newExerciseAssignment.tema_id ?? ''}
          onChange={(v) => setNewExerciseAssignment((s) => ({ ...s, tema_id: v }))}
          options={[
            { value: '', label: 'Elige tema…' },
            ...temas.map((t) => ({ value: t.id, label: `${t.grade} — ${t.name}` })),
          ]}
        />
        <Input
          label="Orden"
          value={String(newExerciseAssignment.ordering ?? 1)}
          onChange={(v) => setNewExerciseAssignment((s) => ({ ...s, ordering: Number(v) || 1 }))}
        />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newExerciseAssignment.active}
              onChange={(e) => setNewExerciseAssignment((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>
          <Button
            className="ml-auto"
            onClick={() => {
              if (!newExerciseAssignment.exercise_id) return toastErr('Elige un ejercicio.')
              if (!newExerciseAssignment.tema_id) return toastErr('Elige un tema.')
              insertRow('edu_exercise_assignments', {
                exercise_id: newExerciseAssignment.exercise_id,
                tema_id: newExerciseAssignment.tema_id,
                ordering: newExerciseAssignment.ordering ?? 1,
                config_override: null,
                active: newExerciseAssignment.active ?? true,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Asignar
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">Ejercicio</th>
              <th className="p-3">Tema</th>
              <th className="p-3">Orden</th>
              <th className="p-3">Activo</th>
              <th className="p-3 w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {exerciseAssignments.map((ea) => {
              const ex = ea.exercise_id ? exerciseMap.get(ea.exercise_id) : null
              const tema = ea.tema_id ? temaMap.get(ea.tema_id) : null
              return (
                <tr key={ea.id} className="border-t border-border">
                  <td className="p-3">{ex ? `${ex.id} (${ex.exercise_type})` : '—'}</td>
                  <td className="p-3">{tema ? `${tema.grade} — ${tema.name}` : '—'}</td>
                  <td className="p-3">{ea.ordering ?? '—'}</td>
                  <td className="p-3">{ea.active ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <Button variant="destructive" size="sm" onClick={() => deleteRow('edu_exercise_assignments', ea.id)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {exerciseAssignments.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>No hay asignaciones.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  )}

  {tab === 'assign-temas' && (
    <Section title="Asignar Temas a Clases (edu_classroom_temas)">
      <div className="grid gap-3 md:grid-cols-4">
        <Select
          label="Clase"
          value={assignTema.classroom_id}
          onChange={(v) => setAssignTema((s) => ({ ...s, classroom_id: v }))}
          options={[
            { value: '', label: 'Elige clase…' },
            ...classrooms.map((c) => {
              const inst = c.institution_id ? instMap.get(c.institution_id) : null
              const label = `${inst?.name ?? '—'} | ${c.grade}${c.section ? `-${c.section}` : ''} (${c.academic_year})`
              return { value: c.id, label }
            }),
          ]}
        />
        <Select
          label="Tema"
          value={assignTema.tema_id}
          onChange={(v) => setAssignTema((s) => ({ ...s, tema_id: v }))}
          options={[
            { value: '', label: 'Elige tema…' },
            ...temas.map((t) => ({ value: t.id, label: `${t.grade} — ${t.name}` })),
          ]}
        />
        <Input
          label="Orden"
          value={String(assignTema.ordering)}
          onChange={(v) => setAssignTema((s) => ({ ...s, ordering: Number(v) || 1 }))}
        />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={assignTema.active}
              onChange={(e) => setAssignTema((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>
          <Button
            className="ml-auto"
            onClick={() => {
              if (!assignTema.classroom_id) return toastErr('Elige una clase.')
              if (!assignTema.tema_id) return toastErr('Elige un tema.')
              insertRow('edu_classroom_temas', {
                classroom_id: assignTema.classroom_id,
                tema_id: assignTema.tema_id,
                ordering: assignTema.ordering,
                active: assignTema.active,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Asignar
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-[1050px] w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">Clase</th>
              <th className="p-3">Tema</th>
              <th className="p-3">Orden</th>
              <th className="p-3">Activo</th>
              <th className="p-3 w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {classroomTemas.map((ct) => {
              const c = ct.classroom_id ? classroomMap.get(ct.classroom_id) : null
              const inst = c?.institution_id ? instMap.get(c.institution_id) : null
              const t = ct.tema_id ? temaMap.get(ct.tema_id) : null
              const cLabel = c ? `${inst?.name ?? '—'} | ${c.grade}${c.section ? `-${c.section}` : ''} (${c.academic_year})` : '—'
              const tLabel = t ? `${t.grade} — ${t.name}` : '—'
              return (
                <tr key={ct.id} className="border-t border-border">
                  <td className="p-3">{cLabel}</td>
                  <td className="p-3">{tLabel}</td>
                  <td className="p-3">{ct.ordering ?? '—'}</td>
                  <td className="p-3">{ct.active ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <Button variant="destructive" size="sm" onClick={() => deleteRow('edu_classroom_temas', ct.id)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {classroomTemas.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>No hay asignaciones.</td>
              </tr>
            )}
          </tbody>
        </table>        
      </div>
    </Section>
  )}

  {tab === 'assign-exercises' && (
    <Section title="Asignar Ejercicios a Clases (edu_classroom_tema_exercises)">
      <div className="grid gap-3 md:grid-cols-5">
        <Select
          label="Clase"
          value={assignExercise.classroom_id}
          onChange={(v) => setAssignExercise((s) => ({ ...s, classroom_id: v }))}
          options={[
            { value: '', label: 'Elige clase…' },
            ...classrooms.map((c) => {
              const inst = c.institution_id ? instMap.get(c.institution_id) : null
              const label = `${inst?.name ?? '—'} | ${c.grade}${c.section ? `-${c.section}` : ''} (${c.academic_year})`
              return { value: c.id, label }
            }),
          ]}
        />

        <Select
          label="Tema"
          value={assignExercise.tema_id}
          onChange={(v) => setAssignExercise((s) => ({ ...s, tema_id: v }))}
          options={[
            { value: '', label: 'Elige tema…' },
            ...temas.map((t) => ({ value: t.id, label: `${t.grade} — ${t.name}` })),
          ]}
        />

        <Select
          label="Ejercicio"
          value={assignExercise.exercise_id}
          onChange={(v) => setAssignExercise((s) => ({ ...s, exercise_id: v }))}
          options={[
            { value: '', label: 'Elige ejercicio…' },
            ...exercises.map((ex) => ({ value: ex.id, label: `${ex.id} (${ex.exercise_type})` })),
          ]}
        />

        <Input
          label="Orden"
          value={String(assignExercise.ordering)}
          onChange={(v) => setAssignExercise((s) => ({ ...s, ordering: Number(v) || 1 }))}
        />

        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={assignExercise.active}
              onChange={(e) => setAssignExercise((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>

          <Button
            className="ml-auto"
            onClick={() => {
              if (!assignExercise.classroom_id) return toastErr('Elige una clase.')
              if (!assignExercise.tema_id) return toastErr('Elige un tema.')
              if (!assignExercise.exercise_id) return toastErr('Elige un ejercicio.')

              insertRow('edu_classroom_tema_exercises', {
                classroom_id: assignExercise.classroom_id,
                tema_id: assignExercise.tema_id,
                exercise_id: assignExercise.exercise_id,
                ordering: assignExercise.ordering,
                active: assignExercise.active,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Asignar
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">Clase</th>
              <th className="p-3">Tema</th>
              <th className="p-3">Ejercicio</th>
              <th className="p-3">Orden</th>
              <th className="p-3">Activo</th>
              <th className="p-3 w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {classroomTemaExercises.map((cte) => {
              const c = cte.classroom_id ? classroomMap.get(cte.classroom_id) : null
              const inst = c?.institution_id ? instMap.get(c.institution_id) : null
              const t = cte.tema_id ? temaMap.get(cte.tema_id) : null
              const ex = cte.exercise_id ? exerciseMap.get(cte.exercise_id) : null

              const cLabel = c
                ? `${inst?.name ?? '—'} | ${c.grade}${c.section ? `-${c.section}` : ''} (${c.academic_year})`
                : '—'
              const tLabel = t ? `${t.grade} — ${t.name}` : '—'
              const exLabel = ex ? `${ex.id} (${ex.exercise_type})` : (cte.exercise_id ?? '—')

              return (
                <tr key={cte.id} className="border-t border-border">
                  <td className="p-3">{cLabel}</td>
                  <td className="p-3">{tLabel}</td>
                  <td className="p-3">{exLabel}</td>
                  <td className="p-3">{cte.ordering ?? '—'}</td>
                  <td className="p-3">{cte.active ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteRow('edu_classroom_tema_exercises', cte.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}

            {classroomTemaExercises.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  No hay asignaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  )}

  {tab === 'assign-users' && (
    <Section title="Asignar Usuarios a Clases (edu_institution_members)">
      <div className="grid gap-3 md:grid-cols-5">
        <Select
          label="Usuario (perfil)"
          value={assignUser.profile_id}
          onChange={(v) => setAssignUser((s) => ({ ...s, profile_id: v }))}
          options={[
            { value: '', label: 'Elige usuario…' },
            ...profiles.map((p) => ({
              value: p.id,
              label: `${p.first_name} ${p.last_name} — ${p.global_role ?? '—'} (${p.id.slice(0, 6)}…)`,
            })),
          ]}
        />

        <Select
          label="Institución"
          value={assignUser.institution_id}
          onChange={(v) => setAssignUser((s) => ({ ...s, institution_id: v }))}
          options={[
            { value: '', label: 'Elige institución…' },
            ...institutions.map((i) => ({ value: i.id, label: i.name })),
          ]}
        />

        <Select
          label="Clase"
          value={assignUser.classroom_id}
          onChange={(v) => setAssignUser((s) => ({ ...s, classroom_id: v }))}
          options={[
            { value: '', label: 'Elige clase…' },
            ...classrooms.map((c) => {
              const inst = c.institution_id ? instMap.get(c.institution_id) : null
              const label = `${inst?.name ?? '—'} | ${c.grade}${c.section ? `-${c.section}` : ''} (${c.academic_year})`
              return { value: c.id, label }
            }),
          ]}
        />

        <Select
          label="Rol en clase"
          value={assignUser.role}
          onChange={(v) => setAssignUser((s) => ({ ...s, role: v as MemberRole }))}
          options={[
            { value: 'student', label: 'student' },
            { value: 'teacher', label: 'teacher' },
          ]}
        />

        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={assignUser.active}
              onChange={(e) => setAssignUser((s) => ({ ...s, active: e.target.checked }))}
            />
            Activo
          </label>

          <Button
            className="ml-auto"
            onClick={() => {
              if (!assignUser.profile_id) return toastErr('Elige usuario.')
              if (!assignUser.institution_id) return toastErr('Elige institución.')
              if (!assignUser.classroom_id) return toastErr('Elige clase.')

              insertRow('edu_institution_members', {
                profile_id: assignUser.profile_id,
                institution_id: assignUser.institution_id,
                classroom_id: assignUser.classroom_id,
                role: assignUser.role,
                active: assignUser.active,
              })
            }}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Asignar
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">Usuario</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Institución</th>
              <th className="p-3">Clase</th>
              <th className="p-3">Activo</th>
              <th className="p-3 w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const p = m.profile_id ? profileMap.get(m.profile_id) : null
              const inst = m.institution_id ? instMap.get(m.institution_id) : null
              const c = m.classroom_id ? classroomMap.get(m.classroom_id) : null
              const cInst = c?.institution_id ? instMap.get(c.institution_id) : null

              const userLabel = p ? `${p.first_name} ${p.last_name}` : (m.profile_id ?? '—')
              const instLabel = inst?.name ?? '—'
              const classLabel = c
                ? `${cInst?.name ?? '—'} | ${c.grade}${c.section ? `-${c.section}` : ''} (${c.academic_year})`
                : '—'

              return (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-3">{userLabel}</td>
                  <td className="p-3">{m.role}</td>
                  <td className="p-3">{instLabel}</td>
                  <td className="p-3">{classLabel}</td>
                  <td className="p-3">{m.active ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteRow('edu_institution_members', m.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}

            {members.length === 0 && (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  No hay miembros asignados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  )}
    </div>
  )
}

/* -----------------------------
   Small UI helpers
------------------------------ */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: any
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-xl border px-3 py-2 text-sm font-semibold transition',
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
      )}
      type="button"
    >
      {children}
    </button>
  )
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <input
        className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none focus:ring-2 ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <select
        className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none focus:ring-2 ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={`${o.value}-${o.label}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ListTable<T extends { id: string }>({
  rows,
  columns,
  onDelete,
  loading,
}: {
  rows: T[]
  columns: Array<{ key: keyof T; label: string; render?: (row: T) => any }>
  onDelete: (id: string) => void
  loading: boolean
}) {
  return (
    <div className="mt-5 overflow-auto rounded-xl border border-border bg-card">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="bg-muted">
          <tr className="text-left">
            {columns.map((c) => (
              <th key={String(c.key)} className="p-3">
                {c.label}
              </th>
            ))}
            <th className="p-3 w-[140px]">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              {columns.map((c) => (
                <td key={`${r.id}-${String(c.key)}`} className="p-3">
                  {c.render ? c.render(r) : (r[c.key] as any)?.toString?.() ?? '—'}
                </td>
              ))}
              <td className="p-3">
                <Button variant="destructive" size="sm" onClick={() => onDelete(r.id)} disabled={loading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td className="p-3 text-muted-foreground" colSpan={columns.length + 1}>
                No hay registros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
