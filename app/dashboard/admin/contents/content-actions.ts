"use server"

import { createClient } from "@/utils/supabase/server"
import { requireInstitution } from "@/lib/institution"

// Academic blocks
export async function listAcademicBlocksAction() {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_academic_blocks")
        .select("id, name, block_type, academic_year, ordering, active, created_at")
        .eq("institution_id", institution.id)
        .order("academic_year", { ascending: false })
        .order("ordering", { ascending: true })
    if (error) throw new Error(error.message)
    return data || []
}

export async function createAcademicBlockAction(payload: {
    name: string
    block_type: string
    academic_year: number
    ordering?: number | null
    active: boolean
}) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_academic_blocks")
        .insert({ ...payload, institution_id: institution.id })
        .select("id, name, block_type, academic_year, ordering, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function updateAcademicBlockAction(id: string, payload: {
    name: string
    block_type: string
    academic_year: number
    ordering?: number | null
    active: boolean
}) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_academic_blocks")
        .update(payload)
        .eq("id", id)
        .eq("institution_id", institution.id)
        .select("id, name, block_type, academic_year, ordering, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function deleteAcademicBlockAction(id: string) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { error } = await supabase
        .from("edu_academic_blocks")
        .delete()
        .eq("id", id)
        .eq("institution_id", institution.id)
    if (error) throw new Error(error.message)
}

// Academic subblocks
export async function listAcademicSubblocksAction() {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_academic_subblocks")
        .select("id, block_id, name, ordering, active, created_at")
        .eq("institution_id", institution.id)
        .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
}

export async function createAcademicSubblockAction(payload: {
    block_id: string
    name: string
    ordering?: number | null
    active: boolean
}) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_academic_subblocks")
        .insert({ ...payload, institution_id: institution.id })
        .select("id, block_id, name, ordering, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function updateAcademicSubblockAction(id: string, payload: {
    block_id: string
    name: string
    ordering?: number | null
    active: boolean
}) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_academic_subblocks")
        .update(payload)
        .eq("id", id)
        .eq("institution_id", institution.id)
        .select("id, block_id, name, ordering, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function deleteAcademicSubblockAction(id: string) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { error } = await supabase
        .from("edu_academic_subblocks")
        .delete()
        .eq("id", id)
        .eq("institution_id", institution.id)
    if (error) throw new Error(error.message)
}

// Areas
export async function listAreasAction() {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_areas")
        .select("id, name, active, created_at")
        .eq("institution_id", institution.id)
        .order("name", { ascending: true })
    if (error) throw new Error(error.message)
    return data || []
}

export async function createAreaAction(payload: {
    name: string
    active: boolean
}) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_areas")
        .insert({ ...payload, institution_id: institution.id })
        .select("id, name, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function updateAreaAction(id: string, payload: {
    name: string
    active: boolean
}) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_areas")
        .update(payload)
        .eq("id", id)
        .eq("institution_id", institution.id)
        .select("id, name, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function deleteAreaAction(id: string) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { error } = await supabase
        .from("edu_areas")
        .delete()
        .eq("id", id)
        .eq("institution_id", institution.id)
    if (error) throw new Error(error.message)
}

// Temas
export async function listTemasAction() {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_temas")
        .select("id, area_id, subblock_id, ordering, active, created_at")
        .eq("institution_id", institution.id)
        .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
}

export async function createTemaAction(payload: {
    area_id: string
    subblock_id: string
    ordering?: number | null
    active: boolean
}) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_temas")
        .insert({ ...payload, institution_id: institution.id })
        .select("id, area_id, subblock_id, ordering, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function updateTemaAction(id: string, payload: {
    area_id: string
    subblock_id: string
    ordering?: number | null
    active: boolean
}) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { data, error } = await supabase
        .from("edu_temas")
        .update(payload)
        .eq("id", id)
        .eq("institution_id", institution.id)
        .select("id, area_id, subblock_id, ordering, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function deleteTemaAction(id: string) {
    const supabase = await createClient()
    const institution = await requireInstitution()
    const { error } = await supabase
        .from("edu_temas")
        .delete()
        .eq("id", id)
        .eq("institution_id", institution.id)
    if (error) throw new Error(error.message)
}

// Exercises
export async function listExercisesAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_exercises")
        .select("id, exercise_type, description, active, created_at")
        .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
}

export async function createExerciseAction(payload: {
    id: string
    exercise_type: string
    description?: string | null
    active: boolean
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_exercises")
        .insert(payload)
        .select("id, exercise_type, description, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function updateExerciseAction(id: string, payload: {
    exercise_type: string
    description?: string | null
    active: boolean
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_exercises")
        .update(payload)
        .eq("id", id)
        .select("id, exercise_type, description, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function deleteExerciseAction(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("edu_exercises")
        .delete()
        .eq("id", id)
    if (error) throw new Error(error.message)
}

// Exercise assignments (exercise -> tema)
export async function listExerciseAssignmentsAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_exercise_assignments")
        .select("id, exercise_id, tema_id, ordering, active, created_at")
        .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
}

export async function createExerciseAssignmentAction(payload: {
    exercise_id: string
    tema_id: string
    ordering?: number | null
    active: boolean
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_exercise_assignments")
        .insert(payload)
        .select("id, exercise_id, tema_id, ordering, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function updateExerciseAssignmentAction(id: string, payload: {
    exercise_id: string
    tema_id: string
    ordering?: number | null
    active: boolean
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_exercise_assignments")
        .update(payload)
        .eq("id", id)
        .select("id, exercise_id, tema_id, ordering, active, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function deleteExerciseAssignmentAction(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("edu_exercise_assignments")
        .delete()
        .eq("id", id)
    if (error) throw new Error(error.message)
}

// Classrooms (for assignments)
export async function listClassroomsAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_classrooms")
        .select("id, grade, academic_year, active, created_at")
        .order("academic_year", { ascending: false })
        .order("grade", { ascending: true })
    if (error) throw new Error(error.message)
    return data || []
}

// Classroom blocks (classroom -> block)
export async function listClassroomBlocksAction() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_classroom_blocks")
        .select("id, classroom_id, block_id, active, started_at, ended_at, created_at")
        .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
}

export async function createClassroomBlockAction(payload: {
    classroom_id: string
    block_id: string
    started_at?: string | null
    ended_at?: string | null
    active: boolean
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_classroom_blocks")
        .insert(payload)
        .select("id, classroom_id, block_id, active, started_at, ended_at, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function updateClassroomBlockAction(id: string, payload: {
    classroom_id: string
    block_id: string
    started_at?: string | null
    ended_at?: string | null
    active: boolean
}) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("edu_classroom_blocks")
        .update(payload)
        .eq("id", id)
        .select("id, classroom_id, block_id, active, started_at, ended_at, created_at")
        .single()
    if (error) throw new Error(error.message)
    return data
}

export async function deleteClassroomBlockAction(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("edu_classroom_blocks")
        .delete()
        .eq("id", id)
    if (error) throw new Error(error.message)
}
