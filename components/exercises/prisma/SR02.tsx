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
  MARCO 01 — Diagonal y perímetro (Pitágoras)
  ✅ Ahora: diagonal = lado mayor + k, con k VARIABLE (no siempre 2)

  - Contextualizado con nombres
  - 1 intento, autocalifica al elegir opción
  - Diagrama grande en SVG (maqueta)
  - "Siguiente" genera otro (cambia P, k, nombres)
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

/* =========================
  Generación dinámica con solución entera
  Queremos:
    diagonal d = L + k   (k variable)
    lados: L (mayor), A (menor)
    Pitágoras: L^2 + A^2 = (L + k)^2  => A^2 = 2kL + k^2

  Construcción para que A sea entero:
    Elegimos k ∈ {1..8}
    Elegimos t entero y ponemos:
      A = k * t
      L = (k(t^2 - 1))/2   (debe ser entero => si k es impar, t debe ser impar)
    Entonces:
      A^2 = k^2 t^2
      2kL + k^2 = 2k * (k(t^2-1)/2) + k^2 = k^2(t^2-1) + k^2 = k^2 t^2 ✅
    Perímetro: P = 2(L + A)
========================= */

const NAME_POOL = [
  "Pepito",
  "Juanita",
  "Camila",
  "Diego",
  "Elena",
  "Fabián",
  "Valeria",
  "Matías",
  "Sofía",
  "Thiago",
  "Lucía",
  "Bruno",
  "Renata",
  "Gael",
  "Emilia",
  "Joaquín",
  "Abril",
  "Nicolás",
  "Aitana",
];

type ExData = {
  who: string;
  friend: string;

  L: number; // lado mayor
  A: number; // lado menor
  k: number; // diferencia (diagonal = L + k)
  d: number; // diagonal
  P: number; // perímetro

  options: Option[];
  signature: string;
};

function fmtSides(L: number, A: number) {
  return `${L} cm y ${A} cm`;
}

function buildExercise(excludeSigs: string[]): ExData {
  const [who, friend] = shuffle(NAME_POOL).slice(0, 2);

  // k variable (no siempre 2)
  const k = choice([1, 2, 3, 4, 5, 6, 7, 8]);

  // elijo t (controla tamaño). Si k impar, t debe ser impar para que L sea entero.
  const tCandidates = k % 2 === 1 ? [3, 5, 7] : [2, 3, 4, 5, 6, 7];
  const t = choice(tCandidates);

  let L = (k * (t * t - 1)) / 2;
  let A = k * t;

  // seguridad: que L sea realmente mayor que A (si cae al revés, lo ajusto intercambiando)
  // en esta construcción normalmente L > A para t>=3, pero por si acaso:
  if (A > L) {
    const tmp = L;
    L = A;
    A = tmp;
  }

  const d = L + k;
  const P = 2 * (L + A);

  const signature = `${who}-${friend}-k${k}-t${t}`;
  if (excludeSigs.includes(signature) && excludeSigs.length < 40) {
    return buildExercise(excludeSigs);
  }

  const correct = fmtSides(L, A);

  // distractores (válidos como "pares de lados", aunque no cumplan la condición)
  const d1 = fmtSides(L, clampInt(A + k, 1, 999));
  const d2 = fmtSides(clampInt(L + k, 1, 999), A);
  const d3 = fmtSides(A, L); // invertido (típico error)

  const values = shuffle(uniq([correct, d1, d2, d3])).slice(0, 4);
  while (values.length < 4) values.push(fmtSides(L + choice([-2, 2, 4]), Math.max(1, A + choice([-2, 2]))));

  const keys: OptionKey[] = shuffle(["A", "B", "C", "D"]);
  const options: Option[] = keys.map((key, i) => ({
    key,
    value: values[i],
    correct: values[i] === correct,
  }));

  return { who, friend, L, A, k, d, P, options, signature };
}

/* =========================
  SVG: Marco + diagonal
========================= */
type DiagramMode = "question" | "solution";

function MarcoDiagram({
  mode,
  L,
  A,
  k,
  d,
}: {
  mode: DiagramMode;
  L: number;
  A: number;
  k: number;
  d: number;
}) {
  const W = 980;
  const H = 520;

  // maqueta rectángulo
  const x0 = 140;
  const y0 = 110;
  const w = 700;
  const h = 290;

  // diagonal
  const x1 = x0;
  const y1 = y0 + h;
  const x2 = x0 + w;
  const y2 = y0;

  const labelL = mode === "solution" ? `${L} cm` : `x`;
  const labelA = mode === "solution" ? `${A} cm` : `a`;

  const labelD =
    mode === "solution"
      ? `${d} cm`
      : k === 1
        ? `x + 1`
        : `x + ${k}`;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Diagrama</div>
        <div className="text-xs text-muted-foreground">maqueta • no a escala</div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[520px] rounded-xl border bg-white"
        preserveAspectRatio="xMidYMid meet"
      >
        <text
          x={20}
          y={26}
          fill="#8a8a8a"
          fontSize={12}
          fontWeight={700}
          style={{ fontFamily: "ui-sans-serif, system-ui" }}
        >
          Marco rectangular (diagonal trazada)
        </text>

        {/* rectángulo */}
        <rect x={x0} y={y0} width={w} height={h} fill="none" stroke="#111827" strokeWidth={6} rx={8} />

        {/* diagonal */}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F43F5E" strokeWidth={6} />

        {/* labels */}
        <text
          x={x0 + w / 2}
          y={y0 + h + 48}
          textAnchor="middle"
          fontSize={22}
          fontWeight={900}
          fill="#111827"
          stroke="white"
          strokeWidth={9}
          paintOrder="stroke"
          style={{ fontFamily: "ui-sans-serif, system-ui" }}
        >
          {labelL}
        </text>

        <text
          x={x0 - 48}
          y={y0 + h / 2}
          textAnchor="middle"
          fontSize={22}
          fontWeight={900}
          fill="#111827"
          stroke="white"
          strokeWidth={9}
          paintOrder="stroke"
          style={{ fontFamily: "ui-sans-serif, system-ui" }}
        >
          {labelA}
        </text>

        <text
          x={x0 + w * 0.62}
          y={y0 + h * 0.38}
          textAnchor="middle"
          fontSize={22}
          fontWeight={900}
          fill="#111827"
          stroke="white"
          strokeWidth={9}
          paintOrder="stroke"
          style={{ fontFamily: "ui-sans-serif, system-ui" }}
        >
          {labelD}
        </text>

        {mode === "solution" && (
          <>
            <rect
              x={x0 - 6}
              y={y0 - 6}
              width={w + 12}
              height={h + 12}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={5}
              rx={10}
              opacity={0.45}
            />
            <text
              x={x0 + w * 0.62}
              y={y0 + h * 0.38 + 34}
              textAnchor="middle"
              fontSize={14}
              fontWeight={800}
              fill="#6B7280"
              stroke="white"
              strokeWidth={8}
              paintOrder="stroke"
              style={{ fontFamily: "ui-sans-serif, system-ui" }}
            >
              (d = L + {k})
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

/* ============================================================
  COMPONENT
============================================================ */
export default function Marco01({
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

    const questionLatex = `\\text{Hallar lados: }d=L+${ex.k},\\ P=${ex.P}`;
    const optionsLatex = ex.options
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((o) => `${o.key}.\\ ${o.value}`);

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: `${op.key}. ${op.value}`,
        correctAnswer: fmtSides(ex.L, ex.A),
        latex: questionLatex,
        options: optionsLatex,
        extra: {
          perimeter: ex.P,
          diagonalRelation: `d = L + ${ex.k}`,
          solution: { L: ex.L, A: ex.A, d: ex.d, k: ex.k },
          who: ex.who,
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

  // Resolución simbólica (adaptada a k variable)
  // Perímetro: 2(L + A) = P => L + A = S
  const S = ex.P / 2;

  // Pitágoras: L^2 + A^2 = (L + k)^2 => A^2 = 2kL + k^2 => A = sqrt(2kL + k^2)
  const s1 = `x + a = ${S}`;
  const s2 = `x^2 + a^2 = (x + ${ex.k})^2`;
  const s3 = `x^2 + a^2 = x^2 + ${2 * ex.k}x + ${ex.k * ex.k}\\ \\Rightarrow\\ a^2 = ${2 * ex.k}x + ${ex.k * ex.k}`;
  const s4 = `a = \\sqrt{${2 * ex.k}x + ${ex.k * ex.k}}`;
  const s5 = `x + \\sqrt{${2 * ex.k}x + ${ex.k * ex.k}} = ${S}`;
  const s6 = `\\sqrt{${2 * ex.k}x + ${ex.k * ex.k}} = ${S} - x`;
  const s7 = `${2 * ex.k}x + ${ex.k * ex.k} = (${S} - x)^2`;
  // Forma cuadrática: 0 = x^2 - (2S + 2k)x + (S^2 - k^2)
  const B = 2 * S + 2 * ex.k;
  const C = S * S - ex.k * ex.k;
  const s8 = `0 = x^2 - ${B}x + ${C}`;
  const s9 = `x = ${ex.L}\\ \\Rightarrow\\ a = ${S} - x = ${S} - ${ex.L} = ${ex.A}`;

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Marco 01 — Diagonal y perímetro"
        prompt={
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold">{ex.who}</span> está armando un marco de fotos rectangular.
              <span className="ml-2">
                <span className="font-semibold">{ex.friend}</span> le dice: “La diagonal mide{" "}
                <span className="font-semibold">{ex.k} cm</span> más que el lado mayor”.
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              El perímetro del marco mide <span className="font-semibold">{ex.P} cm</span>.
              <span className="ml-2 font-semibold">¿Cuánto miden los lados del marco?</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Pista: usa <b>perímetro</b> y el teorema de <b>Pitágoras</b> con la diagonal.
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
              <MarcoDiagram mode="solution" L={ex.L} A={ex.A} k={ex.k} d={ex.d} />

              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold mb-3">Resolución</div>

                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <div className="font-semibold text-foreground mb-1">Paso 1 — Usar el perímetro</div>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Tex tex={`2(x+a) = ${ex.P}\\ \\Rightarrow\\ ${s1}`} block />
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-foreground mb-1">Paso 2 — Pitágoras con la diagonal</div>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Tex tex={s2} block />
                      <Tex tex={s3} block />
                      <Tex tex={s4} block />
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-foreground mb-1">Paso 3 — Reemplazar y despejar</div>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Tex tex={s5} block />
                      <Tex tex={s6} block />
                      <Tex tex={s7} block />
                      <Tex tex={s8} block />
                      <Tex tex={s9} block />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-semibold text-foreground">Respuesta:</span>
                      <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base text-foreground">
                        {fmtSides(ex.L, ex.A)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Nota: el diagrama es referencial (no a escala). La respuesta sale por ecuaciones, no por medir.
                  </div>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="space-y-4">
          <MarcoDiagram mode="question" L={ex.L} A={ex.A} k={ex.k} d={ex.d} />

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
                    <div className="text-lg">
                      <Tex tex={op.value.replace(" cm", "\\text{ cm}").replace(" y ", "\\text{ y }")} />
                    </div>
                  </button>
                );
              })}
            </div>
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