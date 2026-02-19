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
  CARTESIANO 01 — Ubicaciones variables (puntos + nombres cambian)

  - Cada "Siguiente":
    ✅ se generan NUEVOS nombres
    ✅ se generan NUEVOS puntos (sin repetirse entre sí)
    ✅ se pregunta por 1 personaje al azar
    ✅ opciones (4) con 1 correcta + 3 distractores
  - 1 intento, autocalifica al elegir opción
  - SVG con puntos y etiquetas
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
function takeUnique<T>(arr: T[], n: number) {
  return shuffle(arr).slice(0, n);
}
function fmtPair(x: number, y: number) {
  return `(${x}, ${y})`;
}

/* =========================
  Generación dinámica
========================= */
type PersonPoint = { key: string; name: string; x: number; y: number };

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
  "Mía",
  "Danna",
  "Alonso",
  "Renata",
  "Gael",
  "Emilia",
  "Iker",
  "Daniela",
  "Martín",
  "Aitana",
  "Sebastián",
  "Isabella",
  "Joaquín",
  "Abril",
  "Nicolás",
  "Ana",
];

function buildPointPool(maxX: number, maxY: number) {
  const pts: Array<{ x: number; y: number }> = [];
  for (let x = 0; x <= maxX; x++) {
    for (let y = 0; y <= maxY; y++) {
      // evitamos que TODAS sean (0,0) y pegadas: pero lo dejamos permitido
      pts.push({ x, y });
    }
  }
  return pts;
}

type ExData = {
  people: PersonPoint[];
  target: PersonPoint;
  answer: string;
  options: Option[];
  signature: string; // para evitar repetidos
  maxX: number;
  maxY: number;
};

function buildExercise(excludeSigs: string[]): ExData {
  // Ajusta el rango como quieras (para primaria: pequeño y claro)
  const maxX = choice([3, 4, 5]); // cambia el "tamaño" del plano
  const maxY = choice([3, 4, 5, 6]);

  const pointPool = buildPointPool(maxX, maxY);

  // 6 personas como en tu ejemplo
  const nPeople = 6;

  // Nombres y puntos únicos
  const names = takeUnique(NAME_POOL, nPeople);
  const pts = takeUnique(pointPool, nPeople);

  // construyo personas
  const people: PersonPoint[] = names.map((name, i) => ({
    key: `${name}-${pts[i].x}-${pts[i].y}-${i}`,
    name,
    x: pts[i].x,
    y: pts[i].y,
  }));

  // evito repetir el MISMO set exacto (firma simple)
  const signature = people
    .map((p) => `${p.name}:${p.x},${p.y}`)
    .sort()
    .join("|");

  // si cae repetido reciente, reintenta
  if (excludeSigs.includes(signature) && excludeSigs.length < 30) {
    return buildExercise(excludeSigs);
  }

  // elijo target
  const target = choice(people);
  const answer = fmtPair(target.x, target.y);

  // distractores: coordenadas de otros
  const others = people
    .filter((p) => p.key !== target.key)
    .map((p) => fmtPair(p.x, p.y));
  const distractors = takeUnique(others, 3);

  const values = shuffle([answer, ...distractors]);
  const keys: OptionKey[] = shuffle(["A", "B", "C", "D"]);

  const options: Option[] = keys.map((k, i) => ({
    key: k,
    value: values[i],
    correct: values[i] === answer,
  }));

  return { people, target, answer, options, signature, maxX, maxY };
}

/* =========================
  SVG: Plano cartesiano
========================= */
type DiagramMode = "question" | "solution";

function CartesianoDiagram({
  people,
  maxX,
  maxY,
  mode,
  highlightKey,
}: {
  people: PersonPoint[];
  maxX: number;
  maxY: number;
  mode: DiagramMode;
  highlightKey?: string;
}) {
  const W = 760;
  const H = 560;

  // padding generoso para que se vea limpio
  const origin = { x: 90, y: 460 };
  const usableW = W - 140;
  const usableH = H - 120;

  const stepX = usableW / Math.max(1, maxX);
  const stepY = usableH / Math.max(1, maxY);
  const step = Math.min(stepX, stepY); // cuadrícula cuadrada

  const px = (x: number) => origin.x + x * step;
  const py = (y: number) => origin.y - y * step;

  const gridLinesX = Array.from({ length: maxX + 1 }, (_, i) => i);
  const gridLinesY = Array.from({ length: maxY + 1 }, (_, i) => i);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Plano cartesiano</div>
        <div className="text-xs text-muted-foreground">X primero, luego Y</div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[520px] rounded-xl border bg-white"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid */}
        {gridLinesX.map((x) => (
          <line
            key={`gx-${x}`}
            x1={px(x)}
            y1={py(0)}
            x2={px(x)}
            y2={py(maxY)}
            stroke="#E5E7EB"
            strokeWidth={2}
          />
        ))}
        {gridLinesY.map((y) => (
          <line
            key={`gy-${y}`}
            x1={px(0)}
            y1={py(y)}
            x2={px(maxX)}
            y2={py(y)}
            stroke="#E5E7EB"
            strokeWidth={2}
          />
        ))}

        {/* Axes */}
        <line
          x1={px(0)}
          y1={py(0)}
          x2={px(maxX) + 32}
          y2={py(0)}
          stroke="#111827"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line
          x1={px(0)}
          y1={py(0)}
          x2={px(0)}
          y2={py(maxY) - 32}
          stroke="#111827"
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* Arrow heads */}
        <path
          d={`M ${px(maxX) + 32} ${py(0)} L ${px(maxX) + 12} ${py(0) - 10} L ${
            px(maxX) + 12
          } ${py(0) + 10} Z`}
          fill="#111827"
        />
        <path
          d={`M ${px(0)} ${py(maxY) - 32} L ${px(0) - 10} ${py(maxY) - 12} L ${
            px(0) + 10
          } ${py(maxY) - 12} Z`}
          fill="#111827"
        />

        {/* Axis labels */}
        <text
          x={px(maxX) + 20}
          y={py(0) + 34}
          fontSize={18}
          fontWeight={900}
          fill="#111827"
          style={{ fontFamily: "ui-sans-serif, system-ui" }}
        >
          X
        </text>
        <text
          x={px(0) - 26}
          y={py(maxY) - 20}
          fontSize={18}
          fontWeight={900}
          fill="#111827"
          style={{ fontFamily: "ui-sans-serif, system-ui" }}
        >
          Y
        </text>

        {/* Tick labels */}
        {gridLinesX.map((x) => (
          <text
            key={`tx-${x}`}
            x={px(x)}
            y={py(0) + 28}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill="#6B7280"
            style={{ fontFamily: "ui-sans-serif, system-ui" }}
          >
            {x}
          </text>
        ))}
        {gridLinesY.map((y) => (
          <text
            key={`ty-${y}`}
            x={px(0) - 18}
            y={py(y) + 5}
            textAnchor="end"
            fontSize={14}
            fontWeight={700}
            fill="#6B7280"
            style={{ fontFamily: "ui-sans-serif, system-ui" }}
          >
            {y}
          </text>
        ))}

        {/* Points + names */}
        {people.map((p) => {
          const isHi = mode === "solution" && p.key === highlightKey;
          return (
            <g key={p.key}>
              {isHi && (
                <circle
                  cx={px(p.x)}
                  cy={py(p.y)}
                  r={16}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth={5}
                  opacity={0.85}
                />
              )}

              <circle
                cx={px(p.x)}
                cy={py(p.y)}
                r={8}
                fill="#F43F5E"
                stroke="#111827"
                strokeWidth={3}
              />

              <text
                x={px(p.x) + 12}
                y={py(p.y) - 12}
                fontSize={16}
                fontWeight={900}
                fill="#111827"
                stroke="white"
                strokeWidth={7}
                paintOrder="stroke"
                style={{ fontFamily: "ui-sans-serif, system-ui" }}
              >
                {p.name}
              </text>

              {isHi && (
                <text
                  x={px(p.x) + 12}
                  y={py(p.y) + 18}
                  fontSize={14}
                  fontWeight={800}
                  fill="#111827"
                  stroke="white"
                  strokeWidth={7}
                  paintOrder="stroke"
                  style={{ fontFamily: "ui-sans-serif, system-ui" }}
                >
                  {fmtPair(p.x, p.y)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================
  COMPONENT
============================================================ */
export default function Cartesiano01({
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

  const contextLines = ex.people.map((p) => `${p.name} está en la ubicación ${fmtPair(p.x, p.y)}.`);

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return;

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000;
    setSelectedKey(op.key);
    engine.submit(op.correct);

    const questionLatex = `\\text{¿En qué par ordenado está ${ex.target.name}?}`;
    const optionsLatex = ex.options
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((o) => `${o.key}.\\ ${o.value.replace("(", "\\left(").replace(")", "\\right)")}`);

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: `${op.key}. ${op.value}`,
        correctAnswer: ex.answer,
        latex: questionLatex,
        options: optionsLatex,
        extra: {
          target: ex.target.name,
          points: ex.people.map((p) => ({ name: p.name, x: p.x, y: p.y })),
          rule: "Leer X primero, luego Y",
          bounds: { maxX: ex.maxX, maxY: ex.maxY },
        },
      },
      timeSeconds,
    });
  }

  function siguiente() {
    setSelectedKey(null);
    engine.reset();
    setTimerKey((k) => k + 1);

    const recent = history.slice(-8);
    const next = buildExercise(recent);

    setEx(next);
    setHistory((h) => [...h, next.signature].slice(-16));
  }

  const s1 = `\\text{Ubico a }${ex.target.name}\\text{ en el plano.}`;
  const s2 = `\\text{Leo primero }x\\text{ (horizontal) y luego }y\\text{ (vertical).}`;
  const s3 = `\\Rightarrow\\ (${ex.target.x},\\ ${ex.target.y})`;

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Cartesiano 01 — Ubicaciones en el plano"
        prompt={
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              En un mapa cuadriculado (plano cartesiano), estos estudiantes están en distintas ubicaciones:
            </div>

            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {contextLines.map((t) => (
                <div key={t} className="rounded-xl border bg-white p-3">
                  {t}
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              Mirando el plano:{" "}
              <span className="font-semibold">¿en qué par ordenado está {ex.target.name}?</span>
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
              <CartesianoDiagram
                people={ex.people}
                maxX={ex.maxX}
                maxY={ex.maxY}
                mode="solution"
                highlightKey={ex.target.key}
              />

              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold mb-3">Resolución</div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-lg border bg-background p-3 space-y-2">
                    <Tex tex={s1} block />
                    <Tex tex={s2} block />
                    <Tex tex={s3} block />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-semibold text-foreground">Respuesta:</span>
                    <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base text-foreground">
                      {ex.answer}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Tip: En un par ordenado <b>(x, y)</b>, primero se avanza en <b>X</b> y luego en <b>Y</b>.
                  </div>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="space-y-4">
          <CartesianoDiagram
            people={ex.people}
            maxX={ex.maxX}
            maxY={ex.maxY}
            mode="question"
          />

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
                      <Tex tex={op.value.replace("(", "\\left(").replace(")", "\\right)")} />
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