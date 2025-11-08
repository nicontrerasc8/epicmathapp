// src/lib/variantGuard.ts
import { z } from "zod";
import { Parser } from "expr-eval";

export const StepZ = z.object({
  text: z.string().min(1),
  formula: z.string().optional().default(""),
});
export const VariantAIDataZ = z.object({
  answer: z.object({ expr: z.string().min(1) }),
  solution: z.object({ steps: z.array(StepZ).min(3).max(5) }),
  difficulty: z.number().gte(-1).lte(1),
  hints: z.array(z.string()).optional(),
});
export type VariantAIData = z.infer<typeof VariantAIDataZ>;

export function safeEvalExpr(expr: string, VAL: Record<string, number>) {
  try {
    // Sustituye VAL.x por __x para aislar variables en expr-eval
    let normalized = expr;
    for (const k of Object.keys(VAL)) normalized = normalized.replaceAll(`VAL.${k}`, `__${k}`);
    const parser = new Parser({ allowMemberAccess: false });
    const ast = parser.parse(normalized);
    const scope: any = {};
    for (const k of Object.keys(VAL)) scope[`__${k}`] = VAL[k];
    const v = ast.evaluate(scope);
    return Number.isFinite(v) ? Number(v) : NaN;
  } catch {
    return NaN;
  }
}

export function lintVariantDefinition(
  allVars: {name:string, range:[number,number], unit?:string}[],
  def: {unknown:string; givens:string[]; params:any[]; units_out:string}
){
  const errors: string[] = [];
  const names = allVars.map(v=>v.name).filter(Boolean);
  if (!names.includes(def.unknown)) errors.push("La incógnita no es una variable válida.");
  if (def.givens.length < 2) errors.push("Debes proporcionar al menos 2 datos.");
  if (def.givens.includes(def.unknown)) errors.push("La incógnita no puede estar en los datos.");
  const set = new Set(def.givens);
  if (set.size !== def.givens.length) errors.push("Datos repetidos.");
  for (const p of def.params) {
    if (p.range[0] >= p.range[1]) errors.push(`Rango inválido en ${p.name}.`);
  }
  if (!def.units_out?.length) errors.push("Falta unidad de salida.");
  return { ok: errors.length === 0, errors };
}

export function autoQA(ai: VariantAIData, params: any[], sampleParams: (ps:any[])=>Record<string,number>) {
  const samples = 5;
  for (let i=0;i<samples;i++){
    const VAL = sampleParams(params);
    const v = safeEvalExpr(ai.answer.expr, VAL);
    if (!Number.isFinite(v)) return { ok:false, reason:"La expresión no produce un número finito." };
    if (Math.abs(v) > 1e9) return { ok:false, reason:"Resultado fuera de rango razonable." };
  }
  if (ai.solution.steps.length < 3) return { ok:false, reason:"Pocos pasos de solución." };
  return { ok:true };
}

export function variantSignature(topic:string, def:any, ai:VariantAIData){
  return [
    topic,
    def.unknown,
    def.givens.slice().sort().join(","),
    ai.answer.expr.replace(/\s+/g,"")
  ].join("|");
}
