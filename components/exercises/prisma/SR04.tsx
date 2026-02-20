/* SR04 — Líneas y puntos notables en el triángulo (dinámico, sin deformar figura)
   Requisitos que cumplo:
   ✅ misma estructura SR01/SR02
   ✅ NO cambia el triángulo (A,B,C fijos). Solo cambian datos y qué líneas se muestran.
   ✅ ejercicios VARIADOS: identificación + cálculo con ángulos/bisectrices/propiedades
   ✅ líneas NO se “salen”: dibujo recortado/segmentos dentro del triángulo
   ✅ no repite ejercicios: signature + history
*/
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
  Geometría básica (2D)
========================= */
type Pt = { x: number; y: number };

function add(a: Pt, b: Pt): Pt { return { x: a.x + b.x, y: a.y + b.y }; }
function sub(a: Pt, b: Pt): Pt { return { x: a.x - b.x, y: a.y - b.y }; }
function mul(a: Pt, k: number): Pt { return { x: a.x * k, y: a.y * k }; }
function dot(a: Pt, b: Pt) { return a.x * b.x + a.y * b.y; }
function cross(a: Pt, b: Pt) { return a.x * b.y - a.y * b.x; }
function len(a: Pt) { return Math.hypot(a.x, a.y); }
function norm(a: Pt) {
  const L = len(a) || 1;
  return { x: a.x / L, y: a.y / L };
}
function midpoint(a: Pt, b: Pt): Pt { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

function lineIntersection(p: Pt, r: Pt, q: Pt, s: Pt): Pt | null {
  // p + t r = q + u s
  const rxs = cross(r, s);
  if (Math.abs(rxs) < 1e-9) return null;
  const t = cross(sub(q, p), s) / rxs;
  return add(p, mul(r, t));
}

function footOfPerpendicular(p: Pt, a: Pt, b: Pt): Pt {
  // proyección de p sobre la recta ab
  const ab = sub(b, a);
  const t = dot(sub(p, a), ab) / (dot(ab, ab) || 1);
  return add(a, mul(ab, t));
}

function dist(a: Pt, b: Pt) { return len(sub(a, b)); }

/* =========================
  Triángulo base (NO cambia)
  Se verá siempre igual; solo cambian datos/etiquetas/lineas rojas.
========================= */
const A: Pt = { x: 140, y: 380 };
const B: Pt = { x: 420, y: 130 };
const C: Pt = { x: 720, y: 380 };

/* =========================
  Tipos de ejercicio SR04
========================= */
type ExKind =
  | "IDENT_MEDIANS"      // baricentro
  | "IDENT_BISECTORS"    // incentro
  | "IDENT_ALTITUDES"    // ortocentro
  | "IDENT_MEDIATRICES"  // circuncentro
  | "ANGLE_INCENTER";    // ángulo en el incentro usando A,B,C

type ExData = {
  kind: ExKind;

  // Texto/pregunta
  headerHint: string;
  questionLatex: string;

  // Datos (si aplica)
  angles?: { A: number; B: number; C: number }; // para ANGLE_INCENTER

  // Respuesta
  answerLabel: string;  // para identificaciones
  answerValue?: number; // para cálculos (x)

  // Opciones
  options: Option[];

  // Para que NO se repita
  signature: string;
};

/* =========================
  Generación: identificación
========================= */
const POINT_LABELS = {
  centroid: "Baricentro",
  incenter: "Incentro",
  orthocenter: "Ortocentro",
  circumcenter: "Circuncentro",
};

function buildIdentify(kind: ExKind, excludeSigs: string[]): ExData {
  // Variación: algunos ejercicios muestran además marcas (puntos medios / ángulos / perpendiculares)
  const variant = choice([1, 2, 3]);

  let answerLabel = "";
  let hint = "";
  let qLatex = "";

  if (kind === "IDENT_MEDIANS") {
    answerLabel = POINT_LABELS.centroid;
    hint = variant === 1 ? "Observa los puntos medios marcados y las líneas rojas desde los vértices." :
           variant === 2 ? "Las marcas en los lados indican puntos medios. Las líneas rojas llegan a esos puntos." :
                           "Fíjate: cada línea roja une un vértice con el punto medio del lado opuesto.";
    qLatex = `\\text{¿Qué nombre recibe el punto }K\\text{ (intersección de las medianas)?}`;
  }

  if (kind === "IDENT_BISECTORS") {
    answerLabel = POINT_LABELS.incenter;
    hint = variant === 1 ? "Observa las marcas de ángulos iguales en los vértices." :
           variant === 2 ? "Las líneas rojas dividen los ángulos en dos partes iguales." :
                           "Si cada línea roja biseca un ángulo, su intersección es un punto notable.";
    qLatex = `\\text{¿Qué nombre recibe el punto }K\\text{ (intersección de las bisectrices)?}`;
  }

  if (kind === "IDENT_ALTITUDES") {
    answerLabel = POINT_LABELS.orthocenter;
    hint = variant === 1 ? "Observa los cuadraditos de 90°: las líneas rojas son perpendiculares a un lado." :
           variant === 2 ? "Cada línea roja baja desde un vértice formando 90° con el lado opuesto." :
                           "Si se cruzan alturas, el punto de cruce tiene un nombre especial.";
    qLatex = `\\text{¿Qué nombre recibe el punto }K\\text{ (intersección de las alturas)?}`;
  }

  if (kind === "IDENT_MEDIATRICES") {
    answerLabel = POINT_LABELS.circumcenter;
    hint = variant === 1 ? "Las líneas rojas son perpendiculares a los lados y pasan por sus puntos medios." :
           variant === 2 ? "Las marcas indican puntos medios y los cuadrados indican perpendicularidad." :
                           "Si son mediatrices, su intersección es el centro de la circunferencia circunscrita.";
    qLatex = `\\text{¿Qué nombre recibe el punto }K\\text{ (intersección de las mediatrices)?}`;
  }

  const sig = `ID-${kind}-v${variant}`;
  if (excludeSigs.includes(sig) && excludeSigs.length < 80) {
    return buildIdentify(kind, excludeSigs);
  }

  const opts = buildPointOptions(answerLabel);

  return {
    kind,
    headerHint: hint,
    questionLatex: qLatex,
    answerLabel,
    options: opts,
    signature: sig,
  };
}

function buildPointOptions(correctLabel: string): Option[] {
  const all = [POINT_LABELS.incenter, POINT_LABELS.centroid, POINT_LABELS.orthocenter, POINT_LABELS.circumcenter];
  const values = shuffle(all);
  // aseguramos que estén las 4 (y 1 correcta)
  const keys: OptionKey[] = shuffle(["A", "B", "C", "D"]);
  return keys.map((k, i) => ({
    key: k,
    value: values[i],
    correct: values[i] === correctLabel,
  }));
}

/* =========================
  Generación: cálculo con incentro
  Propiedad: si K es incentro, entonces
  ∠A K B = 90° + ∠C/2
  ∠B K C = 90° + ∠A/2
  ∠C K A = 90° + ∠B/2
  (varía cuál se pide)
========================= */
function buildAngleIncenter(excludeSigs: string[]): ExData {
  // Genero ángulos interiores enteros “bonitos”
  // A y C entre 35..75, B sale por 180 - A - C, mantenemos B 30..100
  let angA = choice([35, 40, 45, 50, 55, 60, 65, 70, 75]);
  let angC = choice([35, 40, 45, 50, 55, 60, 65, 70, 75]);
  let angB = 180 - angA - angC;

  let guard = 0;
  while ((angB < 30 || angB > 100) && guard < 60) {
    angA = choice([35, 40, 45, 50, 55, 60, 65, 70, 75]);
    angC = choice([35, 40, 45, 50, 55, 60, 65, 70, 75]);
    angB = 180 - angA - angC;
    guard++;
  }

  const ask = choice<"AKB" | "BKC" | "CKA">(["AKB", "BKC", "CKA"]);
  const angles = { A: angA, B: angB, C: angC };

  let x = 0;
  let targetLatex = "";
  let usedHalf = 0;

  if (ask === "AKB") {
    usedHalf = angles.C;
    x = 90 + angles.C / 2;
    targetLatex = `x=\\angle AKB`;
  } else if (ask === "BKC") {
    usedHalf = angles.A;
    x = 90 + angles.A / 2;
    targetLatex = `x=\\angle BKC`;
  } else {
    usedHalf = angles.B;
    x = 90 + angles.B / 2;
    targetLatex = `x=\\angle CKA`;
  }

  // asegurar que sea entero (por eso elegimos pares)
  if (x % 1 !== 0) {
    // reintenta (pero por construcción debería salir .5 solo si usedHalf impar)
    return buildAngleIncenter(excludeSigs);
  }

  const sig = `ANG-A${angA}-B${angB}-C${angC}-ask${ask}`;
  if (excludeSigs.includes(sig) && excludeSigs.length < 100) {
    return buildAngleIncenter(excludeSigs);
  }

  const correct = x;

  // Distractores: 90 - half, 180 - correct, 90 + other/2
  const d1 = clampInt(90 - usedHalf / 2, 0, 180);
  const d2 = clampInt(180 - correct, 0, 180);
  const otherHalf =
    ask === "AKB" ? angles.A :
    ask === "BKC" ? angles.B :
    angles.C;
  const d3 = clampInt(90 + otherHalf / 2, 0, 180);

  const values = uniq([correct, d1, d2, d3]).slice(0, 4);
  while (values.length < 4) values.push(correct + choice([-20, -10, 10, 20]));

  const keys: OptionKey[] = shuffle(["A", "B", "C", "D"]);
  const options: Option[] = keys.map((k, i) => ({
    key: k,
    value: `${values[i]}°`,
    correct: values[i] === correct,
  }));

  const qLatex =
    `\\text{En }\\triangle ABC,\\ K\\text{ es el incentro.}\\ ` +
    `\\angle A=${angles.A}^\\circ,\\ \\angle B=${angles.B}^\\circ,\\ \\angle C=${angles.C}^\\circ.\\ ` +
    `\\text{Halla }${targetLatex}.`;

  const hint =
    ask === "AKB"
      ? "K es incentro: el ángulo entre bisectrices KA y KB depende de ∠C."
      : ask === "BKC"
        ? "K es incentro: el ángulo entre bisectrices KB y KC depende de ∠A."
        : "K es incentro: el ángulo entre bisectrices KC y KA depende de ∠B.";

  return {
    kind: "ANGLE_INCENTER",
    headerHint: hint,
    questionLatex: qLatex,
    angles,
    answerLabel: "Valor de x",
    answerValue: correct,
    options,
    signature: sig,
  };
}

function buildExercise(excludeSigs: string[]): ExData {
  const kind = choice<ExKind>([
    "IDENT_MEDIANS",
    "IDENT_BISECTORS",
    "IDENT_ALTITUDES",
    "IDENT_MEDIATRICES",
    "ANGLE_INCENTER",
  ]);

  if (kind === "ANGLE_INCENTER") return buildAngleIncenter(excludeSigs);
  return buildIdentify(kind, excludeSigs);
}

/* =========================
  Diagramas (SVG) — “limpio”, A,B,C fijos
  - Usamos clipPath para que las líneas rojas no se salgan del triángulo.
========================= */
type DiagramMode = "question" | "solution";

function TriangleDiagram({
  ex,
  mode,
}: {
  ex: ExData;
  mode: DiagramMode;
}) {
  const W = 980;
  const H = 520;

  // midpoints
  const M_AB = midpoint(A, B);
  const M_BC = midpoint(B, C);
  const M_CA = midpoint(C, A);

  // centroid
  const G = {
    x: (A.x + B.x + C.x) / 3,
    y: (A.y + B.y + C.y) / 3,
  };

  // incenter (peso por lados)
  const a = dist(B, C);
  const b = dist(A, C);
  const c = dist(A, B);
  const I = {
    x: (a * A.x + b * B.x + c * C.x) / (a + b + c),
    y: (a * A.y + b * B.y + c * C.y) / (a + b + c),
  };

  // orthocenter: intersección de 2 alturas
  const H_A = footOfPerpendicular(A, B, C);
  const H_B = footOfPerpendicular(B, A, C);
  const dirA = sub(H_A, A);
  const dirB = sub(H_B, B);
  const Oth = lineIntersection(A, dirA, B, dirB) ?? G;

  // circumcenter: intersección de 2 mediatrices
  const dirAB = sub(B, A);
  const dirBC = sub(C, B);
  const perpAB = { x: -dirAB.y, y: dirAB.x };
  const perpBC = { x: -dirBC.y, y: dirBC.x };
  const Circ = lineIntersection(M_AB, perpAB, M_BC, perpBC) ?? G;

  // qué punto K usamos según ejercicio
  const K =
    ex.kind === "IDENT_MEDIANS" ? G :
    ex.kind === "IDENT_BISECTORS" ? I :
    ex.kind === "IDENT_ALTITUDES" ? Oth :
    ex.kind === "IDENT_MEDIATRICES" ? Circ :
    I; // ANGLE_INCENTER usa incentro

  // líneas rojas según tipo
  const showMedians = ex.kind === "IDENT_MEDIANS";
  const showBisectors = ex.kind === "IDENT_BISECTORS" || ex.kind === "ANGLE_INCENTER";
  const showAltitudes = ex.kind === "IDENT_ALTITUDES";
  const showMediatrices = ex.kind === "IDENT_MEDIATRICES";

  // bisectrices (dirección = suma de unitarios de los lados desde el vértice)
  function bisectorRayFrom(V: Pt, P: Pt, Q: Pt) {
    const u1 = norm(sub(P, V));
    const u2 = norm(sub(Q, V));
    const dir = norm(add(u1, u2));
    // extend largo, clipPath recorta
    return { p: V, q: add(V, mul(dir, 900)) };
    // (queda dentro del triángulo por clip)
  }

  const bisA = bisectorRayFrom(A, B, C);
  const bisB = bisectorRayFrom(B, A, C);
  const bisC = bisectorRayFrom(C, A, B);

  // alturas: segmento desde vértice al pie
  const altA = { p: A, q: H_A };
  const altB = { p: B, q: H_B };
  const altC = { p: C, q: footOfPerpendicular(C, A, B) };

  // mediatrices: desde punto medio en dirección perpendicular (extend), recortado por clip + viewport
  function perpBisectorThrough(M: Pt, P: Pt, Q: Pt) {
    const d = sub(Q, P);
    const perp = norm({ x: -d.y, y: d.x });
    return { p: add(M, mul(perp, -900)), q: add(M, mul(perp, 900)) };
  }
  const pbAB = perpBisectorThrough(M_AB, A, B);
  const pbBC = perpBisectorThrough(M_BC, B, C);
  const pbCA = perpBisectorThrough(M_CA, C, A);

  // estilos
  const triStroke = "#111827";
  const red = "#F43F5E";

  const angleData = ex.angles;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Diagrama</div>
        <div className="text-xs text-muted-foreground">
          {ex.kind === "ANGLE_INCENTER" ? "Ángulos dados + bisectrices" : "Observa marcas y líneas"}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[520px] rounded-xl border bg-white"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="clipTri">
            <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} />
          </clipPath>
        </defs>

        {/* Triángulo base (SIEMPRE IGUAL) */}
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill="none"
          stroke={triStroke}
          strokeWidth={6}
          strokeLinejoin="round"
        />

        {/* Marcas de puntos medios (solo cuando corresponde) */}
        {(showMedians || showMediatrices) && (
          <>
            <circle cx={M_AB.x} cy={M_AB.y} r={6} fill="#111827" />
            <circle cx={M_BC.x} cy={M_BC.y} r={6} fill="#111827" />
            <circle cx={M_CA.x} cy={M_CA.y} r={6} fill="#111827" />

            {/* marquitas tipo “tick” */}
            <line x1={M_AB.x - 10} y1={M_AB.y - 8} x2={M_AB.x + 10} y2={M_AB.y + 8} stroke="#111827" strokeWidth={4} />
            <line x1={M_BC.x - 10} y1={M_BC.y - 8} x2={M_BC.x + 10} y2={M_BC.y + 8} stroke="#111827" strokeWidth={4} />
            <line x1={M_CA.x - 10} y1={M_CA.y - 8} x2={M_CA.x + 10} y2={M_CA.y + 8} stroke="#111827" strokeWidth={4} />
          </>
        )}

        {/* Cuadraditos 90° (alturas / mediatrices) */}
        {showAltitudes && (
          <>
            <rect x={H_A.x - 10} y={H_A.y - 10} width={16} height={16} fill="none" stroke="#111827" strokeWidth={4} />
            <rect x={H_B.x - 10} y={H_B.y - 10} width={16} height={16} fill="none" stroke="#111827" strokeWidth={4} />
          </>
        )}

        {showMediatrices && (
          <>
            <rect x={M_AB.x - 10} y={M_AB.y - 10} width={16} height={16} fill="none" stroke="#111827" strokeWidth={4} opacity={0.8} />
            <rect x={M_BC.x - 10} y={M_BC.y - 10} width={16} height={16} fill="none" stroke="#111827" strokeWidth={4} opacity={0.8} />
          </>
        )}

        {/* Líneas rojas (recortadas al triángulo) */}
        <g clipPath="url(#clipTri)">
          {/* Medianas */}
          {showMedians && (
            <>
              <line x1={A.x} y1={A.y} x2={M_BC.x} y2={M_BC.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
              <line x1={B.x} y1={B.y} x2={M_CA.x} y2={M_CA.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
              <line x1={C.x} y1={C.y} x2={M_AB.x} y2={M_AB.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
            </>
          )}

          {/* Bisectrices */}
          {showBisectors && (
            <>
              <line x1={bisA.p.x} y1={bisA.p.y} x2={bisA.q.x} y2={bisA.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
              <line x1={bisB.p.x} y1={bisB.p.y} x2={bisB.q.x} y2={bisB.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
              <line x1={bisC.p.x} y1={bisC.p.y} x2={bisC.q.x} y2={bisC.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
            </>
          )}

          {/* Alturas */}
          {showAltitudes && (
            <>
              <line x1={altA.p.x} y1={altA.p.y} x2={altA.q.x} y2={altA.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
              <line x1={altB.p.x} y1={altB.p.y} x2={altB.q.x} y2={altB.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
              <line x1={altC.p.x} y1={altC.p.y} x2={altC.q.x} y2={altC.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" />
            </>
          )}

          {/* Mediatrices */}
          {showMediatrices && (
            <>
              <line x1={pbAB.p.x} y1={pbAB.p.y} x2={pbAB.q.x} y2={pbAB.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" opacity={0.95} />
              <line x1={pbBC.p.x} y1={pbBC.p.y} x2={pbBC.q.x} y2={pbBC.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" opacity={0.95} />
              <line x1={pbCA.p.x} y1={pbCA.p.y} x2={pbCA.q.x} y2={pbCA.q.y} stroke={red} strokeWidth={6} strokeLinecap="round" opacity={0.95} />
            </>
          )}
        </g>

        {/* Punto K */}
        <circle cx={K.x} cy={K.y} r={10} fill="#22C55E" stroke="#111827" strokeWidth={4} />
        <text
          x={K.x + 14}
          y={K.y + 6}
          fontSize={18}
          fontWeight={900}
          fill="#111827"
          stroke="white"
          strokeWidth={8}
          paintOrder="stroke"
          style={{ fontFamily: "ui-sans-serif, system-ui" }}
        >
          K
        </text>

        {/* Vértices */}
        {[{ p: A, label: "A" }, { p: B, label: "B" }, { p: C, label: "C" }].map(({ p, label }) => (
          <g key={label}>
            <circle cx={p.x} cy={p.y} r={12} fill="#3B82F6" stroke="#111827" strokeWidth={4} />
            <text
              x={p.x + 14}
              y={p.y - 14}
              fontSize={18}
              fontWeight={900}
              fill="#111827"
              stroke="white"
              strokeWidth={8}
              paintOrder="stroke"
              style={{ fontFamily: "ui-sans-serif, system-ui" }}
            >
              {label}
            </text>
          </g>
        ))}

        {/* Ángulos dados (solo si ANGLE_INCENTER) */}
        {ex.kind === "ANGLE_INCENTER" && angleData && (
          <>
            <text
              x={A.x + 10}
              y={A.y + 34}
              fontSize={16}
              fontWeight={900}
              fill="#111827"
              stroke="white"
              strokeWidth={8}
              paintOrder="stroke"
              style={{ fontFamily: "ui-sans-serif, system-ui" }}
            >
              {angleData.A}°
            </text>
            <text
              x={B.x - 34}
              y={B.y - 18}
              fontSize={16}
              fontWeight={900}
              fill="#111827"
              stroke="white"
              strokeWidth={8}
              paintOrder="stroke"
              style={{ fontFamily: "ui-sans-serif, system-ui" }}
            >
              {angleData.B}°
            </text>
            <text
              x={C.x - 30}
              y={C.y + 34}
              fontSize={16}
              fontWeight={900}
              fill="#111827"
              stroke="white"
              strokeWidth={8}
              paintOrder="stroke"
              style={{ fontFamily: "ui-sans-serif, system-ui" }}
            >
              {angleData.C}°
            </text>

            {mode === "solution" && ex.answerValue != null && (
              <text
                x={K.x + 18}
                y={K.y + 32}
                fontSize={14}
                fontWeight={900}
                fill="#F43F5E"
                stroke="white"
                strokeWidth={8}
                paintOrder="stroke"
                style={{ fontFamily: "ui-sans-serif, system-ui" }}
              >
                x = {ex.answerValue}°
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

/* ============================================================
  COMPONENT
============================================================ */
export default function SR04_LineasYPuntosNotables({
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

    const questionLatex = ex.questionLatex;
    const optionsLatex = ex.options
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((o) => `${o.key}.\\ ${o.value.replace("°", "^\\circ")}`);

    const correctAnswer =
      ex.kind === "ANGLE_INCENTER"
        ? `${ex.answerValue}°`
        : ex.answerLabel;

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: `${op.key}. ${op.value}`,
        correctAnswer,
        latex: questionLatex,
        options: optionsLatex,
        extra: {
          kind: ex.kind,
          angles: ex.angles ?? null,
          rule:
            ex.kind === "ANGLE_INCENTER"
              ? "Si K es incentro: ∠AKB = 90° + ∠C/2 (análogas para las otras)."
              : "Identificar por marcas: medianas/puntos medios, bisectrices/ángulos iguales, alturas/90°, mediatrices/punto medio + perpendicular.",
        },
      },
      timeSeconds,
    });
  }

  function siguiente() {
    setSelectedKey(null);
    engine.reset();
    setTimerKey((k) => k + 1);

    const recent = history.slice(-18);
    const next = buildExercise(recent);

    setEx(next);
    setHistory((h) => [...h, next.signature].slice(-40));
  }

  // Resolución (NO genérica): depende del tipo
  const solutionBlocks = (() => {
    if (ex.kind === "ANGLE_INCENTER" && ex.angles && ex.answerValue != null) {
      const Aang = ex.angles.A;
      const Bang = ex.angles.B;
      const Cang = ex.angles.C;

      // Detectar cuál se pidió por el texto
      const asksAKB = ex.questionLatex.includes("\\angle AKB");
      const asksBKC = ex.questionLatex.includes("\\angle BKC");
      const asksCKA = ex.questionLatex.includes("\\angle CKA");

      const used = asksAKB ? Cang : asksBKC ? Aang : Bang;
      const usedName = asksAKB ? "C" : asksBKC ? "A" : "B";

      const s1 = `\\text{K es el incentro, así que el ángulo entre bisectrices cumple:}`;
      const s2 = asksAKB
        ? `\\angle AKB = 90^\\circ + \\frac{\\angle C}{2}`
        : asksBKC
          ? `\\angle BKC = 90^\\circ + \\frac{\\angle A}{2}`
          : `\\angle CKA = 90^\\circ + \\frac{\\angle B}{2}`;
      const s3 = `x = 90^\\circ + \\frac{${used}^\\circ}{2}`;
      const s4 = `x = 90^\\circ + ${used / 2}^\\circ = ${ex.answerValue}^\\circ`;

      return [
        <div key="sA" className="rounded-lg border bg-background p-3 space-y-2">
          <Tex tex={ex.questionLatex} block />
          <Tex tex={s1} block />
          <Tex tex={s2} block />
          <Tex tex={`\\text{Usamos }\\angle ${usedName}=${used}^\\circ.`} block />
          <Tex tex={s3} block />
          <Tex tex={s4} block />
        </div>,
      ];
    }

    // Identificación: explicación ajustada según marcas
    if (ex.kind === "IDENT_MEDIANS") {
      return [
        <div key="idM" className="rounded-lg border bg-background p-3 space-y-2">
          <Tex tex={`\\text{Las marcas indican puntos medios en los lados.}`} block />
          <Tex tex={`\\text{Cada línea roja une un vértice con el punto medio del lado opuesto: son medianas.}`} block />
          <Tex tex={`\\text{La intersección de las medianas es el Baricentro.}`} block />
        </div>,
      ];
    }

    if (ex.kind === "IDENT_BISECTORS") {
      return [
        <div key="idB" className="rounded-lg border bg-background p-3 space-y-2">
          <Tex tex={`\\text{Las marcas en los ángulos muestran que cada línea roja divide el ángulo en dos partes iguales.}`} block />
          <Tex tex={`\\text{Esas líneas son bisectrices.}`} block />
          <Tex tex={`\\text{La intersección de bisectrices es el Incentro.}`} block />
        </div>,
      ];
    }

    if (ex.kind === "IDENT_ALTITUDES") {
      return [
        <div key="idA" className="rounded-lg border bg-background p-3 space-y-2">
          <Tex tex={`\\text{Los símbolos de 90° indican perpendicularidad con el lado opuesto.}`} block />
          <Tex tex={`\\text{Cada línea roja es una altura (sale de un vértice y cae perpendicular).}`} block />
          <Tex tex={`\\text{La intersección de alturas es el Ortocentro.}`} block />
        </div>,
      ];
    }

    if (ex.kind === "IDENT_MEDIATRICES") {
      return [
        <div key="idMe" className="rounded-lg border bg-background p-3 space-y-2">
          <Tex tex={`\\text{Las marcas muestran puntos medios y perpendicularidad: son mediatrices de los lados.}`} block />
          <Tex tex={`\\text{La intersección de mediatrices es el Circuncentro.}`} block />
        </div>,
      ];
    }

    return [
      <div key="fallback" className="rounded-lg border bg-background p-3">
        <Tex tex={`\\text{Observa las marcas y determina qué líneas se están trazando.}`} block />
      </div>,
    ];
  })();

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="SR04 — Líneas y puntos notables en el triángulo"
        prompt={
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {ex.headerHint}
            </div>

            <div className="text-sm text-muted-foreground">
              <span className="font-semibold">
                <Tex tex={ex.questionLatex} />
              </span>
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
              <TriangleDiagram ex={ex} mode="solution" />

              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold mb-3">Resolución</div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  {solutionBlocks}

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-semibold text-foreground">Respuesta:</span>
                    <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base text-foreground">
                      {ex.kind === "ANGLE_INCENTER" ? `${ex.answerValue}°` : ex.answerLabel}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Nota: el triángulo se mantiene con la misma forma; solo cambian los datos y qué líneas se muestran.
                  </div>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="space-y-4">
          <TriangleDiagram ex={ex} mode="question" />

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
                    <div className="text-xl font-serif">{op.value}</div>
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