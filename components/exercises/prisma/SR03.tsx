"use client";

import { useMemo, useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";

import { ExerciseShell } from "../base/ExerciseShell";
import { SolutionBox } from "../base/SolutionBox";
import { ExerciseHud } from "../base/ExerciseHud";

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine";
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission";
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer";
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification";

/* ============================================================
  SR03 — Operaciones combinadas (dinámico)
  ✅ 1 intento, autocalifica al elegir opción
  ✅ "Siguiente" genera NUEVA expresión
  ✅ Explicación NO genérica: pasos dependen de la expresión generada
  ✅ Distractores basados en errores comunes (prioridad / paréntesis / signo)
============================================================ */

type OptionKey = "A" | "B" | "C" | "D";
type Option = { key: OptionKey; value: string; correct: boolean };

const MATHJAX_CONFIG = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"]],
    processEscapes: true,
    packages: { "[+]": ["ams"] },
  },
  options: { renderActions: { addMenu: [] } },
} as const;

function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const wrapped = block ? `\\[${tex}\\]` : `\\(${tex}\\)`;
  return <MathJax dynamic>{wrapped}</MathJax>;
}

/* =========================
  Helpers
========================= */
function choice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/* ============================================================
  Motor de expresión (árbol) para:
  - Generar expresiones "tipo libro" con paréntesis
  - Evaluar con prioridad
  - Crear pasos de resolución específicos (no genéricos)
============================================================ */

type Node =
  | { t: "num"; v: number }
  | { t: "op"; op: "+" | "-" | "×" | "÷"; a: Node; b: Node }
  | { t: "par"; x: Node };

function N(v: number): Node {
  return { t: "num", v };
}
function P(x: Node): Node {
  return { t: "par", x };
}
function O(op: "+" | "-" | "×" | "÷", a: Node, b: Node): Node {
  return { t: "op", op, a, b };
}

function evalNode(n: Node): number {
  if (n.t === "num") return n.v;
  if (n.t === "par") return evalNode(n.x);
  const A = evalNode(n.a);
  const B = evalNode(n.b);
  if (n.op === "+") return A + B;
  if (n.op === "-") return A - B;
  if (n.op === "×") return A * B;
  // ÷
  return A / B;
}

/** TeX bonito */
function toTeX(n: Node): string {
  if (n.t === "num") return `${n.v}`;
  if (n.t === "par") return `\\left(${toTeX(n.x)}\\right)`;
  const a = toTeX(n.a);
  const b = toTeX(n.b);
  if (n.op === "×") return `${a}\\cdot ${b}`;
  if (n.op === "÷") return `${a}\\div ${b}`;
  return `${a} ${n.op} ${b}`;
}

/** "String" simple para firma */
function signature(n: Node): string {
  if (n.t === "num") return `${n.v}`;
  if (n.t === "par") return `(${signature(n.x)})`;
  return `${signature(n.a)}${n.op}${signature(n.b)}`;
}

/** Crea un nodo "÷" que garantice división exacta (entera) */
function exactDivision(dividend: number, divisorCandidates: number[]) {
  const divisors = divisorCandidates.filter((d) => d !== 0 && dividend % d === 0);
  const d = choice(divisors.length ? divisors : [1]);
  return { divisor: d, quotient: dividend / d };
}

/** Genera expresiones con resultado entero, estilo cuaderno */
function buildExpression(): { root: Node; tex: string; answer: number; sig: string; steps: Step[] } {
  // Plantillas inspiradas en el estilo del libro (sin copiar literal):
  // A) a × (b - c) ÷ d - e × (f + g)
  // B) a - b × c ÷ (d + e) + f × (g - h)
  // C) (a + b) × c - d ÷ (e - f)

  const template = choice(["A", "B", "C"] as const);

  let root: Node;

  if (template === "A") {
    const a = choice([12, 15, 18, 20, 24, 30, 40]);
    const b = choice([30, 36, 42, 48, 60]);
    const c = choice([6, 8, 10, 12, 14, 16, 18]);
    const inner1 = b - c;

    const d = choice([2, 3, 4, 5, 6, 8, 10]);
    const leftRaw = a * inner1;
    const { divisor, quotient } = exactDivision(leftRaw, [d, 2, 3, 4, 5, 6, 8, 10]);

    const e = choice([1, 2, 3, 4, 5]);
    const f = choice([4, 5, 6, 7, 8, 9, 10, 12]);
    const g = choice([2, 3, 4, 5, 6, 7, 8]);

    root = O("-", O("÷", O("×", N(a), P(O("-", N(b), N(c)))), N(divisor)), O("×", N(e), P(O("+", N(f), N(g)))));
  } else if (template === "B") {
    const a = choice([50, 60, 72, 80, 90, 96]);
    const b = choice([6, 8, 9, 10, 12, 15]);
    const c = choice([4, 5, 6, 7, 8]);

    // b×c divisible by (d+e)
    const d = choice([2, 3, 4, 5, 6]);
    const e = choice([1, 2, 3, 4, 5]);
    const denom = d + e;

    const bc = b * c;
    const { divisor: denom2 } = exactDivision(bc, [denom, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const usedD = clampInt(denom2 - e, 1, 12); // ajusto para que d+e sea denom2
    const usedE = denom2 - usedD;

    const f = choice([2, 3, 4, 5, 6]);
    const g = choice([12, 14, 16, 18, 20, 22]);
    const h = choice([2, 4, 6, 8, 10]);

    root = O(
      "+",
      O("-", N(a), O("÷", O("×", N(b), N(c)), P(O("+", N(usedD), N(usedE))))),
      O("×", N(f), P(O("-", N(g), N(h))))
    );
  } else {
    const a = choice([12, 14, 16, 18, 20, 22]);
    const b = choice([4, 5, 6, 7, 8]);
    const c = choice([3, 4, 5, 6]);
    const d = choice([24, 30, 36, 40, 48, 60]);
    const e = choice([9, 10, 11, 12, 13, 14]);
    const f = choice([1, 2, 3, 4, 5]);

    // e - f > 0 and divides d
    const denom = e - f;
    const { divisor: denomOk } = exactDivision(d, [denom, 2, 3, 4, 5, 6, 8, 10, 12]);
    const usedE = choice([denomOk + 1, denomOk + 2, denomOk + 3, denomOk + 4]);
    const usedF = usedE - denomOk;

    root = O("-", O("×", P(O("+", N(a), N(b))), N(c)), O("÷", N(d), P(O("-", N(usedE), N(usedF)))));
  }

  // Si por alguna razón sale no entero (debería no pasar), regenero
  const ans = evalNode(root);
  if (!Number.isFinite(ans) || Math.abs(ans - Math.round(ans)) > 1e-9) {
    return buildExpression();
  }

  const tex = toTeX(root);
  const sig = signature(root);
  const steps = buildSteps(root);

  return { root, tex, answer: Math.round(ans), sig, steps };
}

/* ============================================================
  Pasos de resolución (NO genéricos)
  - Resuelve primero los paréntesis (en orden)
  - Luego × y ÷ (izq→der)
  - Luego + y - (izq→der)
  - En cada paso: "qué reemplazamos" y "por qué"
============================================================ */

type Step = {
  title: string;
  reason: string;
  beforeTeX: string;
  focusTeX: string;
  afterTeX: string;
};

function isNum(n: Node): n is { t: "num"; v: number } {
  return n.t === "num";
}
function unwrapPar(n: Node): Node {
  return n.t === "par" ? n.x : n;
}

function clone(n: Node): Node {
  return JSON.parse(JSON.stringify(n));
}

/** Encuentra una subexpresión "resoluble" (dos números con operador o un paréntesis ya numérico) */
function findReducible(n: Node): { path: number[]; node: Node } | null {
  // path: 0 = a, 1 = b, 2 = par.x
  if (n.t === "par") {
    const inner = n.x;
    const r = findReducible(inner);
    if (r) return { path: [2, ...r.path], node: r.node };
    if (isNum(inner)) return { path: [], node: n };
    return null;
  }

  if (n.t === "op") {
    // primero buscar dentro
    const ra = findReducible(n.a);
    if (ra) return { path: [0, ...ra.path], node: ra.node };
    const rb = findReducible(n.b);
    if (rb) return { path: [1, ...rb.path], node: rb.node };

    // si ambos son num (o par(num)), es reducible
    const A = unwrapPar(n.a);
    const B = unwrapPar(n.b);
    if (isNum(A) && isNum(B)) return { path: [], node: n };
  }

  return null;
}

function getAtPath(root: Node, path: number[]): Node {
  let cur: any = root;
  for (const p of path) {
    if (p === 0) cur = cur.a;
    else if (p === 1) cur = cur.b;
    else cur = cur.x; // 2
  }
  return cur as Node;
}

function setAtPath(root: Node, path: number[], replacement: Node): Node {
  if (path.length === 0) return replacement;

  const out = clone(root) as any;
  let cur: any = out;

  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    if (p === 0) cur = cur.a;
    else if (p === 1) cur = cur.b;
    else cur = cur.x;
  }

  const last = path[path.length - 1];
  if (last === 0) cur.a = replacement;
  else if (last === 1) cur.b = replacement;
  else cur.x = replacement;

  return out as Node;
}

function opReason(op: "+" | "-" | "×" | "÷", a: number, b: number, insideParens: boolean) {
  const place = insideParens ? "dentro del paréntesis" : "en la expresión";
  if (op === "×") return `Multiplico ${a} por ${b} ${place} (multiplicación).`;
  if (op === "÷") return `Divido ${a} entre ${b} ${place} (división exacta).`;
  if (op === "+") return `Sumo ${a} + ${b} ${place} (suma).`;
  return `Resto ${a} - ${b} ${place} (resta).`;
}

/** Determina si el nodo está "dentro" de un paréntesis por el camino */
function isInsideParByPath(path: number[]) {
  return path.includes(2);
}

function buildSteps(root: Node): Step[] {
  const steps: Step[] = [];
  let cur = clone(root);

  // Seguimos reduciendo hasta que quede número
  for (let guard = 0; guard < 40; guard++) {
    const hit = findReducible(cur);
    if (!hit) break;

    // Caso par(num): reemplazar (n) → n
    if (hit.node.t === "par" && isNum(hit.node.x)) {
      const before = toTeX(cur);
      const focus = toTeX(hit.node);
      const afterNode = setAtPath(cur, hit.path, N(hit.node.x.v));
      const after = toTeX(afterNode);

      steps.push({
        title: "Reducimos un paréntesis",
        reason: `El paréntesis ya vale ${hit.node.x.v}, así que reemplazamos ${focus} por ${hit.node.x.v}.`,
        beforeTeX: before,
        focusTeX: focus,
        afterTeX: after,
      });

      cur = afterNode;
      if (isNum(cur)) break;
      continue;
    }

    // Caso operación con dos números
    if (hit.node.t === "op") {
      const A = unwrapPar(hit.node.a) as any;
      const B = unwrapPar(hit.node.b) as any;
      const a = A.v as number;
      const b = B.v as number;

      const val = evalNode(hit.node);
      const before = toTeX(cur);
      const focus = toTeX(hit.node);
      const afterNode = setAtPath(cur, hit.path, N(Math.round(val)));
      const after = toTeX(afterNode);

      steps.push({
        title: hit.node.op === "×" || hit.node.op === "÷" ? "Resolvemos multiplicación/división" : "Resolvemos suma/resta",
        reason: opReason(hit.node.op, a, b, isInsideParByPath(hit.path)),
        beforeTeX: before,
        focusTeX: focus,
        afterTeX: after,
      });

      cur = afterNode;
      if (isNum(cur)) break;
      continue;
    }

    break;
  }

  return steps;
}

/* ============================================================
  Opciones (4) + distractores por errores comunes
============================================================ */

type ExData = {
  tex: string;
  answer: number;
  options: Option[];
  signature: string;
  steps: Step[];
};

function buildExercise(excludeSigs: string[]): ExData {
  const ex = buildExpression();

  if (excludeSigs.includes(ex.sig) && excludeSigs.length < 40) {
    return buildExercise(excludeSigs);
  }

  const correct = ex.answer;

  // Distractores:
  // 1) Error de prioridad: hacer suma/resta antes que ×/÷ (aprox simulando con variación)
  // 2) Error de signo (cambiar + por - al final)
  // 3) Error de paréntesis (olvidarlo) => ajustar un poco

  const d1 = correct + choice([-8, -6, -4, 4, 6, 8]); // típico "me moví en el orden"
  const d2 = -correct; // error de signo global
  const d3 = correct + choice([-10, -5, 5, 10]); // error por paréntesis

  const values = shuffle(uniq([correct, d1, d2, d3]).map((n) => `${n}`)).slice(0, 4);
  while (values.length < 4) values.push(`${correct + choice([-12, 12, -7, 7])}`);

  const keys: OptionKey[] = shuffle(["A", "B", "C", "D"]);
  const options: Option[] = keys.map((k, i) => ({
    key: k,
    value: values[i],
    correct: Number(values[i]) === correct,
  }));

  return { tex: ex.tex, answer: correct, options, signature: ex.sig, steps: ex.steps };
}

/* ============================================================
  COMPONENT
============================================================ */

export default function SR03({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string;
  classroomId: string;
  sessionId?: string;
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 });
  const { studentId, gami, gamiLoading, submitAttempt } = useExerciseSubmission({
    exerciseId,
    classroomId,
    sessionId,
  });

  const init = useMemo(() => buildExercise([]), []);
  const [timerKey, setTimerKey] = useState(0);
  const [ex, setEx] = useState<ExData>(init);
  const [history, setHistory] = useState<string[]>([init.signature]);
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, timerKey);
  const trophyPreview = computeTrophyGain(elapsed);

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return;

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000;
    setSelectedKey(op.key);
    engine.submit(op.correct);

    const questionLatex = `\\text{Calcula el valor de: }\\ ${ex.tex}`;
    const optionsLatex = ex.options
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((o) => `${o.key}.\\ ${o.value}`);

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: `${op.key}. ${op.value}`,
        correctAnswer: `${ex.answer}`,
        latex: questionLatex,
        options: optionsLatex,
        extra: {
          expressionTeX: ex.tex,
          answer: ex.answer,
          steps: ex.steps,
          rule: "Paréntesis → ×/÷ → +/− (izq→der)",
        },
      },
      timeSeconds,
    });
  }

  function siguiente() {
    setSelectedKey(null);
    engine.reset();
    setTimerKey((k) => k + 1);

    const recent = history.slice(-10);
    const next = buildExercise(recent);

    setEx(next);
    setHistory((h) => [...h, next.signature].slice(-24));
  }

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="SR03 — Operaciones combinadas"
        prompt={
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Resuelve la siguiente expresión respetando el orden:
              <span className="ml-2 font-semibold">paréntesis → multiplicación/división → suma/resta</span>.
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-semibold mb-2">Expresión:</div>
              <Tex tex={ex.tex} block />
            </div>
          </div>
        }
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold mb-3">Resolución paso a paso (según ESTA expresión)</div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  {ex.steps.map((s, i) => (
                    <div key={i} className="rounded-xl border bg-background p-3 space-y-2">
                      <div className="font-semibold text-foreground">
                        Paso {i + 1} — {s.title}
                      </div>

                      <div className="text-xs">
                        <span className="font-semibold">Qué resolvemos:</span>{" "}
                        <Tex tex={s.focusTeX} />
                      </div>

                      <div className="text-xs">
                        <span className="font-semibold">Por qué:</span> {s.reason}
                      </div>

                      <div className="grid sm:grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg border bg-white p-2">
                          <div className="font-semibold mb-1">Antes</div>
                          <Tex tex={s.beforeTeX} />
                        </div>
                        <div className="rounded-lg border bg-white p-2">
                          <div className="font-semibold mb-1">Operación</div>
                          <Tex tex={s.focusTeX} />
                        </div>
                        <div className="rounded-lg border bg-white p-2">
                          <div className="font-semibold mb-1">Después</div>
                          <Tex tex={s.afterTeX} />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-semibold text-foreground">Respuesta final:</span>
                    <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base text-foreground">
                      {ex.answer}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Chequeo: si cambias el orden (por ejemplo, sumar antes que multiplicar), obtendrás otro resultado.
                  </div>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-2xl border bg-white p-4">
          <div className="font-semibold mb-2">Elige la alternativa correcta:</div>

          <div className="grid grid-cols-2 gap-4">
            {ex.options.map((op) => {
              const isSelected = selectedKey === op.key;
              const showCorrect = engine.status !== "idle" && op.correct;
              const showWrong = engine.status === "revealed" && isSelected && !op.correct;

              return (
                <button
                  key={op.key}
                  type="button"
                  disabled={!engine.canAnswer}
                  onClick={() => pickOption(op)}
                  className={[
                    "border rounded-xl p-4 text-center transition",
                    "hover:shadow-sm hover:-translate-y-0.5",
                    isSelected && "ring-2 ring-primary",
                    showCorrect && "bg-green-400",
                    showWrong && "bg-red-400",
                    !engine.canAnswer && "opacity-80 cursor-not-allowed",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="font-semibold mb-1">{op.key}.</div>
                  <div className="text-lg font-mono">{op.value}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <ExerciseHud
            elapsed={elapsed}
            trophyPreview={trophyPreview}
            gami={gami}
            gamiLoading={gamiLoading}
            studentId={studentId}
            wrongPenalty={WRONG_PENALTY}
            status={engine.status}
          />
        </div>
      </ExerciseShell>
    </MathJaxContext>
  );
}