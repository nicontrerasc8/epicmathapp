"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { CanvasDSLZ, renderCanvasDSL } from "@/components/CanvasDSL"
// arriba del archivo
import { safeEvalExpr, lintVariantDefinition, autoQA, variantSignature, VariantAIDataZ } from "@/components/variantGuard";

// DEBES añadir esto a tu <head> en el HTML principal:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">

/* **************************************************************************************
 * COMPONENTES DE SOPORTE (Helpers, API, y Renderers)
 * ************************************************************************************** */

const MODEL = "gemini-2.5-flash-preview-09-2025";
const API_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 40_000;
const MAX_RETRIES = 2;

// --- Prompts del Sistema para el Asistente ---

// Para generar SÓLO la solución, fórmula y dificultad de una variante
const SYSTEM_TEXT_SOLUTION = [
  "Responde SOLO con JSON válido, sin markdown.",
  "Tu trabajo es generar 'answer.expr' (JS), 'solution.steps' (LaTeX) y 'difficulty' (num) para un problema.",
  "Las variables dadas están en un objeto 'VAL'. Ejemplo: VAL.capital, VAL.tasa.",
  "La 'answer.expr' debe ser una sola línea de código JavaScript.",
  "Los 'solution.steps' deben ser entre 3 y 5 pasos, con 'text' (string) y 'formula' (string LaTeX).",
  "'difficulty' debe ser un número entre -1.0 (fácil) y 1.0 (difícil).",
].join(" ");

// Para generar SÓLO el script del canvas
const SYSTEM_TEXT_CANVAS = [
  "Responde SOLO con JSON válido, sin markdown.",
  `Debes devolver EXACTAMENTE un objeto con forma:
  {
    "kind":"canvas.v1",
    "width":720,
    "height":420,
    "ops":[ /* SOLO rect, text, arrow, grid, numberline, bar, pie */ ]
  }`,
  "No incluyas comentarios, HTML ni JS.",
  "Usa colores hex (#RRGGBB). Entre 10 y 120 elementos en total.",
  "Incluye elementos pedagógicos (ejes, etiquetas con VAL.*, flechas) y espacio visual para el razonamiento.",
].join(" ");


function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url: string, options: any, retries = MAX_RETRIES) {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(t);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        throw new Error("El servidor devolvió HTML (CORS/404/500). Revisa la URL o la key.");
      }
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      if (i < retries) await sleep(600 * (i + 1));
    }
  }
  throw lastErr;
}

function extractTextFromGemini(json: any) {
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

/**
 * GameRenderer (Implementación de soporte)
 */
// REEMPLAZA GameRenderer por esta versión basada en DSL JSON


const GameRenderer = ({ pregunta, valores }: { pregunta: any, valores: any }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasObj = useMemo(() => {
    try {
      const raw = pregunta?.dsl?.canvas;
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return CanvasDSLZ.parse(obj);
    } catch {
      return null;
    }
  }, [pregunta]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasObj) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvasDSL(ctx, canvasObj, valores || {});
  }, [canvasObj, valores]);

  if (!canvasObj) {
    return <div className="rounded-md border border-border bg-white p-4 text-sm text-muted-foreground">Sin vista previa (DSL inválido)</div>;
  }

  return (
    <canvas
      ref={canvasRef}
      width={canvasObj.width}
      height={canvasObj.height}
      className="rounded-lg border border-border bg-white max-w-full"
      style={{ width: canvasObj.width, height: canvasObj.height }}
    />
  );
};


// --- Helpers de tu archivo original ---
function sampleParams(params: any) {
  const out: any = {};
  for (const p of params || []) {
    const [min, max] = p.range;
    const rnd = min + Math.random() * (max - min);
    out[p.name] = Number(rnd.toFixed(2));
  }
  return out;
}



/**
 * PackPreviewCarousel
 * Muestra una vista previa del pack generado.
 */
function PackPreviewCarousel({ rawJson }: { rawJson: string }) {
  const [error, setError] = useState<any>(null);
  const [packs, setPacks] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    try {
      // Filtrar niveles deshabilitados antes de mostrar
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) throw new Error("JSON no es un array.");

      const enabledPacks = parsed.filter((p: any) => p.enabled && p.dsl.variants.length > 0);

      if (enabledPacks.length === 0) {
        throw new Error("No hay niveles habilitados con variantes para mostrar.");
      }

      setPacks(enabledPacks);
      setCurrent(0);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setPacks([]);
    }
  }, [rawJson]);

  if (error)
    return (
      <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-yellow-700">
        ⚠️ {error}
      </div>
    );

  if (!packs.length) return null;

  const lvl = packs[current];
  if (!lvl) return null;
  const variant = lvl?.dsl?.variants?.[0]; // Vista previa de la primera variante
  if (!variant)
    return (
      <div className="text-sm text-muted-foreground">
        No se encontraron variantes en el nivel seleccionado ({lvl.name}).
      </div>
    );

  // Usar los 'params' de la variante (que son {name, range})
  const sampled = sampleParams(variant.params);
  const VAL = { ...sampled };
  const correct = safeEvalExpr(variant.answer.expr, VAL);
  const steps = variant.solution?.steps || [];
  const units = variant.units_out || "";

  const prompt = `Calcula ${variant.unknown} (${units}). Datos: ${variant.givens
    .map((g: any) => `${g}=${VAL[g] !== undefined ? VAL[g] : '?'}`)
    .join(", ")}`;

  const goNext = () => setCurrent((c) => (c + 1) % packs.length);
  const goPrev = () => setCurrent((c) => (c - 1 + packs.length) % packs.length);

  return (
    <div className="relative bg-card rounded-2xl border border-border shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goPrev}
          className="text-sm px-3 py-1 border rounded-md hover:bg-muted"
        >
          ← Nivel anterior
        </button>
        <h3 className="font-semibold text-lg text-center">
          🎯 {lvl.name || `Nivel ${current + 1}`}
        </h3>
        <button
          onClick={goNext}
          className="text-sm px-3 py-1 border rounded-md hover:bg-muted"
        >
          Siguiente nivel →
        </button>
      </div>

      <p className="text-center text-lg mb-4">{prompt}</p>

      <div className="flex justify-center my-4">
        <GameRenderer
          pregunta={{ dsl: { canvas: lvl.dsl.canvas } }}
          valores={VAL}
        />

      </div>

      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-800 mb-2">Solución (Primeros 3 pasos):</p>
        <ul className="space-y-2 text-sm text-gray-700">
          {steps.slice(0, 3).map((s: any, i: number) => (
            <li key={i} className="border-b border-emerald-100 pb-1">
              <strong>Paso {i + 1}:</strong> {s.text}
              {s.formula && (
                <div className="bg-white rounded p-2 border mt-1 font-mono text-xs overflow-x-auto">
                  {s.formula}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 font-bold text-emerald-700">
          ✅ Resultado: {correct.toFixed(2)} {units}
        </div>
      </div>

      <div className="text-center mt-4 text-xs text-muted-foreground">
        {current + 1} / {packs.length} niveles
      </div>
    </div>
  );
}

// --- Componentes UI simples ---

const Input = React.forwardRef((props: any, ref: any) => (
  <input
    ref={ref}
    {...props}
    className={`w-full rounded-md border border-border bg-input p-3 ${props.className || ""}`}
  />
));
Input.displayName = 'Input'; // Añadir display name para evitar linting warnings

const Button = ({ children, className, ...props }: any) => (
  <button
    {...props}
    className={`rounded-lg py-2 px-4 font-semibold shadow ${className || ""}`}
  >
    {children}
  </button>
);

const IconButton = ({ children, className, ...props }: any) => (
  <button
    {...props}
    className={`rounded-full p-2 w-8 h-8 flex items-center justify-center text-sm ${className || ""}`}
  >
    {children}
  </button>
);

/* **************************************************************************************
 * NUEVO ASISTENTE DE GENERACIÓN DE PACKS (WIZARD)
 * ************************************************************************************** */

// --- Definiciones de datos por defecto ---

const newVariable = () => ({ name: "", range: [1, 10], unit: "" });
const newConstant = () => ({ name: "g", value: 9.8 });

// Esto crea una VARIANTE completa del DSL
const newVariant = (id: any, unknown: any, units_out: any, givens: any, params: any, aiData: any) => ({
  id,
  answer: aiData.answer, // { expr: "..." }
  givens, // ["v0", "h"]
  params, // [{name: "v0", range: [..]}, {name: "h", range: [..]}]
  unknown, // "R"
  attempts: {
    max: 4,
    hints: aiData.hints || [], // La IA podría generar pistas
    tolerance: { abs: 0.1, rel: 0.02, decimals: 2 },
    reveal_after: 3,
  },
  solution: aiData.solution, // { steps: [...] }
  units_out, // "m"
  difficulty: aiData.difficulty, // 0.5
  render_fill: {},
});

// Esto crea un NIVEL completo del DSL
const newLevel = (id: any, name: any, topic: any) => ({
  id,
  name,
  enabled: id === "nivel-1", // Básico habilitado por defecto
  dsl: {
    pva: {
      demote: { reveal_streak: 2 },
      mastery: { true_streak_for_level_up: 3 },
      quality_weights: { speed: 0.1, accuracy: 0.6, consistency: 0.3 },
      target_time_sec: 40,
    },
    topic,
    canvas: {
      width: 720,
      height: 420,
      script: "", // Vacío por defecto
    },
    schema: "mx.v3",
    display: {
      zoom: 1.0,
      canvas: { kind: "generic", width: 720, height: 420 },
    },
    variants: [], // Se llena con el generador
    units_out: "",
    // --- Campos extra para el UI (no van en el JSON final) ---
    _ui_variables: [newVariable()],
    _ui_constants: [newConstant()],
  },
});

// --- Componentes del Editor (UI Simplificada) ---

function VariableEditor({ variables, onChange }: { variables: any, onChange: any }) {
  const setVar = (i: number, field: string, value: any) => {
    const newVars = [...variables];
    newVars[i] = { ...newVars[i], [field]: value };
    onChange(newVars);
  };
  const setRange = (i: number, rIdx: number, value: any) => {
    const newVars = [...variables];
    const newRange = [...newVars[i].range];
    newRange[rIdx] = Number(value) || 0;
    newVars[i] = { ...newVars[i], range: newRange };
    onChange(newVars);
  };
  const addVar = () => onChange([...variables, newVariable()]);
  const delVar = (i: number) => onChange(variables.filter((_: any, idx: number) => idx !== i));

  return (
    <div className="space-y-2 p-3 bg-input rounded-md">
      {variables.map((v: any, i: number) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
          <Input placeholder="Nombre (ej: capital)" value={v.name} onChange={(e: any) => setVar(i, "name", e.target.value)} />
          <Input type="number" placeholder="Min" value={v.range[0]} onChange={(e: any) => setRange(i, 0, e.target.value)} />
          <Input type="number" placeholder="Max" value={v.range[1]} onChange={(e: any) => setRange(i, 1, e.target.value)} />
          <Input placeholder="Unidad (ej: m)" value={v.unit} onChange={(e: any) => setVar(i, "unit", e.target.value)} />
          <IconButton onClick={() => delVar(i)} className="bg-red-500 text-white hover:bg-red-600">-</IconButton>
        </div>
      ))}
      <Button onClick={addVar} className="bg-blue-500 text-white hover:bg-blue-600 text-sm">+ Añadir Variable</Button>
    </div>
  );
}

function ConstantEditor({ constants, onChange }: { constants: any, onChange: any }) {
  const setConst = (i: number, field: string, value: any) => {
    const newConsts = [...constants];
    newConsts[i] = { ...newConsts[i], [field]: value };
    onChange(newConsts);
  };
  const addConst = () => onChange([...constants, { name: "", value: 0 }]);
  const delConst = (i: number) => onChange(constants.filter((_: any, idx: number) => idx !== i));

  return (
    <div className="space-y-2 p-3 bg-input rounded-md">
      {constants.map((c: any, i: number) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input placeholder="Nombre (ej: g)" value={c.name} onChange={(e: any) => setConst(i, "name", e.target.value)} />
          <Input type="number" placeholder="Valor (ej: 9.8)" value={c.value} onChange={(e: any) => setConst(i, "value", e.target.value)} />
          <IconButton onClick={() => delConst(i)} className="bg-red-500 text-white hover:bg-red-600">-</IconButton>
        </div>
      ))}
      <Button onClick={addConst} className="bg-blue-500 text-white hover:bg-blue-600 text-sm">+ Añadir Constante</Button>
    </div>
  );
}

function VariantGenerator({ level, onGenerate, loading, apiKey }: { level: any, onGenerate: any, loading: any, apiKey: any }) {
  const [unknown, setUnknown] = useState<any>("");
  const [givens, setGivens] = useState<any[]>([]);

  const allVars = level.dsl._ui_variables.filter((v: any) => v.name);
  const varNames = allVars.map((v: any) => v.name);

  useEffect(() => {
    // Reset si las variables cambian
    setUnknown("");
    setGivens([]);
  }, [level.dsl._ui_variables]);

  const handleUnknownChange = (name: any) => {
    setUnknown(name);
    // Si 'h' es 'unknown', no puede ser 'given'
    setGivens((g: any) => g.filter((gName: any) => gName !== name));
  };

  const toggleGiven = (name: any) => {
    // No se puede dar si es la incógnita
    if (name === unknown) return;
    setGivens((g: any) => g.includes(name) ? g.filter((gName: any) => gName !== name) : [...g, name]);
  };

  const handleGenerateClick = () => {
    if (!unknown || givens.length === 0 || !apiKey) return;

    // El profesor define 'unknown' y 'givens'
    // 'params' son *todas* las variables que participan (unknown + givens)
    const participatingVarNames = [unknown, ...givens];
    const params = level.dsl._ui_variables
      .filter((v: any) => participatingVarNames.includes(v.name))
      .map((v: any) => ({ name: v.name, range: v.range })); // Formato DSL

    const unknownVar = level.dsl._ui_variables.find((v: any) => v.name === unknown);
    const units_out = unknownVar?.unit || "";

    onGenerate({ unknown, units_out, givens, params });
  };

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
      <h4 className="font-semibold text-blue-800">Generador de Preguntas (Variantes)</h4>
      <div>
        <label className="block text-sm font-medium mb-1">1. Elige la Incógnita (qué calcular)</label>
        <select
          value={unknown}
          onChange={(e) => handleUnknownChange(e.target.value)}
          className="w-full rounded-md border border-border bg-input p-3"
        >
          <option value="">Selecciona una variable...</option>
          {allVars.map((v: any, idx: any) => (
            <option key={idx} value={v.name}>{v.name} ({v.unit})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">2. Elige los Datos (qué entregar)</label>
        <div className="flex flex-wrap gap-2">
          {allVars.map((v: any) => (
            <label key={v.name} className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm cursor-pointer ${v.name === unknown ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                givens.includes(v.name) ? 'bg-blue-500 text-white' : 'bg-white border'
              }`}>
              <input
                type="checkbox"
                checked={givens.includes(v.name)}
                onChange={() => toggleGiven(v.name)}
                disabled={v.name === unknown}
                className="hidden"
              />
              {v.name}
            </label>
          ))}
        </div>
      </div>
      <Button
        onClick={handleGenerateClick}
        disabled={loading || !unknown || givens.length === 0 || !apiKey}
        className="bg-primary text-primary-foreground hover:opacity-90 disabled:bg-muted disabled:cursor-not-allowed"
      >
        {loading ? "Generando..." : "🚀 Generar esta Variante con IA"}
      </Button>
    </div>
  );
}

/**
 * Editor de Nivel (el contenido de cada Pestaña)
 */
function LevelEditor({ level, onUpdate, onGenerateVariant, onGenerateCanvas, onDeleteVariant, loadingStates, apiKey }: { level: any, onUpdate: any, onGenerateVariant: any, onGenerateCanvas: any, onDeleteVariant: any, loadingStates: any, apiKey: any }) {

  const handleUpdate = (field: string, value: any) => {
    onUpdate({ ...level, [field]: value });
  };

  const handleUpdateDsl = (field: string, value: any) => {
    onUpdate({ ...level, dsl: { ...level.dsl, [field]: value } });
  };

  const handleUpdateCanvasScript = (script: string) => {
    const newCanvas = { ...level.dsl.canvas, script };
    handleUpdateDsl("canvas", newCanvas);
  };

  // Obtener los valores para la vista previa del canvas
  const previewValores = useMemo(() => {
    const params = level.dsl.variants[0]?.params || level.dsl._ui_variables.map((v: any) => ({ name: v.name, range: v.range }));
    return sampleParams(params);
  }, [level.dsl.variants, level.dsl._ui_variables]);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-lg font-semibold">
          <input
            type="checkbox"
            className="w-5 h-5"
            checked={level.enabled}
            onChange={(e) => handleUpdate("enabled", e.target.checked)}
          />
          Habilitar Nivel: {level.name}
        </label>
      </div>

      {/* Si está deshabilitado, no mostrar el resto */}
      {!level.enabled && (
        <p className="text-muted-foreground">Habilita este nivel para configurarlo.</p>
      )}

      {level.enabled && (
        <div className="space-y-6 pl-8">
          {/* --- 1. Definición General --- */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">1. Definición General</h3>
            <label className="block text-sm font-medium">Nombre del Nivel</label>
            <Input
              placeholder="Nombre del Nivel (ej: Interés Simple)"
              value={level.name}
              onChange={(e: any) => handleUpdate("name", e.target.value)}
              className="text-lg font-bold"
            />
            <label className="block text-sm font-medium">Contexto (Topic)</label>
            <Input
              placeholder="Topic (ej: finanzas_basicas)"
              value={level.dsl.topic}
              onChange={(e: any) => handleUpdateDsl("topic", e.target.value)}
            />
          </div>

          {/* --- 2. Variables y Constantes --- */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">2. Variables y Constantes</h3>
            <label className="block text-sm font-medium">Variables (con rangos y unidades)</label>
            <VariableEditor
              variables={level.dsl._ui_variables}
              onChange={(vars: any) => handleUpdateDsl("_ui_variables", vars)}
            />
            <label className="block text-sm font-medium mt-4">Constantes (opcional)</label>
            <ConstantEditor
              constants={level.dsl._ui_constants}
              onChange={(consts: any) => handleUpdateDsl("_ui_constants", consts)}
            />
          </div>

          {/* --- 3. Generador de Variantes (Preguntas) --- */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">3. Generador de Preguntas (Variantes)</h3>
            <VariantGenerator
              level={level}
              onGenerate={(variantDef: any) => onGenerateVariant(variantDef)}
              loading={loadingStates.variant}
              apiKey={apiKey}
            />
            <h4 className="font-semibold text-md mt-4">Preguntas Generadas:</h4>
            <div className="space-y-2">
              {level.dsl.variants.length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no has generado preguntas para este nivel.</p>
              )}
              {level.dsl.variants.map((v: any, i: number) => (
                <div key={v.id} className="flex justify-between items-center bg-white p-3 rounded-md border">
                  <p>
                    <strong>{v.id}:</strong> Calcular <strong>{v.unknown}</strong> (dando {v.givens.join(", ")})
                  </p>
                  <IconButton
                    onClick={() => onDeleteVariant(i)}
                    className="bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    ✕
                  </IconButton>
                </div>
              ))}
            </div>
          </div>

          {/* --- 4. Editor de Canvas --- */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg">4. Visualización (Canvas)</h3>
            <Button
              onClick={onGenerateCanvas}
              disabled={loadingStates.canvas || !apiKey}
              className="bg-primary text-primary-foreground hover:opacity-90 disabled:bg-muted"
            >
              {loadingStates.canvas ? "Generando..." : "🚀 Generar Script de Canvas con IA"}
            </Button>
            <p className="text-xs text-muted-foreground">
              La IA usara el 'Contexto' y las 'Variables' para crear un script visual.
            </p>
            <textarea
              placeholder="El script de canvas generado por IA aparecerá aquí..."
              value={level.dsl.canvas.script}
              onChange={(e) => handleUpdateCanvasScript(e.target.value)}
              className="w-full rounded-md border border-border bg-input p-3 font-mono text-sm"
              rows={6}
            />
            <h4 className="text-sm font-medium">Vista Previa del Canvas</h4>
            <div className="flex justify-center bg-gray-100 p-2 rounded-md">
              <GameRenderer
                pregunta={level}
                valores={previewValores}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Componente Principal del Asistente (Wizard)
 */
export default function PackGeneratorWizard() {
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(true);
  const [pack, setPack] = useState<any[]>(() => [
    newLevel("nivel-1", "Nivel Básico", "general"),
    newLevel("nivel-2", "Nivel Medio", "general"),
    newLevel("nivel-3", "Nivel Avanzado", "general")
  ]);
  const [activeTab, setActiveTab] = useState(0); // 0, 1, 2
  const [error, setError] = useState<any>("");
  const [loadingStates, setLoadingStates] = useState<any>({}); // ej: { "0-canvas": true, "1-variant": true }

  // Cargar/guardar API key
  useEffect(() => {
    const saved = localStorage.getItem("gemini_api_key");
    if (saved) setApiKey(saved);
  }, []);
  useEffect(() => {
    if (remember) localStorage.setItem("gemini_api_key", apiKey || "");
    else localStorage.removeItem("gemini_api_key");
  }, [apiKey, remember]);

  const setLoading = (key: string, isLoading: boolean) => {
    setLoadingStates((prev: any) => ({ ...prev, [key]: isLoading }));
  };

  // --- Funciones de Mutación de State ---

  const updateLevel = (lIndex: number, newLevelData: any) => {
    const newPack = [...pack];
    newPack[lIndex] = newLevelData;

    // Sincronizar 'topic' si es el primer nivel
    if (lIndex === 0) {
      const newTopic = newPack[0].dsl.topic;
      newPack[1].dsl.topic = newTopic;
      newPack[2].dsl.topic = newTopic;
    }

    setPack(newPack);
  };

  const deleteVariant = (lIndex: number, vIndex: number) => {
    const newPack = [...pack];
    newPack[lIndex].dsl.variants = newPack[lIndex].dsl.variants.filter((_: any, i: number) => i !== vIndex);
    setPack(newPack);
  };

  // --- Funciones de IA ---

  const handleGenerateVariant = async (lIndex: number, variantDef: any) => {
  const level = pack[lIndex];
  const loadingKey = `${lIndex}-variant`;
  setLoading(loadingKey, true); setError("");

  // 1) Lint previo
  const allVars = level.dsl._ui_variables.filter((v:any)=>v.name);
  const lint = lintVariantDefinition(allVars, variantDef);
  if (!lint.ok) {
    setError(lint.errors.join("\n"));
    setLoading(loadingKey, false);
    return;
  }

  // 2) Pedimos 3 candidatos en UN SOLO JSON (array)
  const userPrompt = `
    Genera hasta 3 candidatos de solución para el problema:
    - Tópico: ${level.dsl.topic}
    - Incógnita: ${variantDef.unknown} (Unidad: ${variantDef.units_out})
    - Datos: ${variantDef.givens.join(", ")}
    - Constantes: ${level.dsl._ui_constants.map((c:any)=>`${c.name}=${c.value}`).join(", ")}
    - Variables (con rangos): ${variantDef.params.map((p:any)=>`${p.name} en [${p.range[0]}, ${p.range[1]}]`).join("; ")}
    Formato de respuesta (SOLO JSON):
    [
      { "answer": {"expr": "..."}, "solution": {"steps":[{ "text":"...", "formula":"..."}, ...]}, "difficulty": 0.0 },
      ...
    ]
  `;

  try {
    const url = `${API_BASE}?key=${encodeURIComponent(apiKey.trim())}`;
    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_TEXT_SOLUTION }] },
      generationConfig: { responseMimeType: "application/json" },
    };

    const data = await fetchJSON(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const txt = extractTextFromGemini(data);
    if (!txt) throw new Error("La IA no devolvió contenido JSON.");

    let arr = JSON.parse(txt);
    if (!Array.isArray(arr)) arr = [arr];

    // 3) Validación + Auto-QA + ranking por dificultad "target"
    const targetByLevel = (idx:number) => idx === 0 ? -0.4 : idx === 1 ? 0.0 : 0.4;
    const target = targetByLevel(lIndex);
    const okCandidates = [];

    for (const cand of arr) {
      let parsed;
      try { parsed = VariantAIDataZ.parse(cand); } catch { continue; }
      const qa = autoQA(parsed, variantDef.params, sampleParams);
      if (!qa.ok) continue;
      okCandidates.push({ parsed, score: Math.abs((parsed.difficulty ?? 0) - target) });
    }

    if (!okCandidates.length) throw new Error("Ningún candidato pasó verificación automática. Ajusta rangos o datos.");

    okCandidates.sort((a,b)=>a.score - b.score);
    const picked = okCandidates[0].parsed;

    // 4) Deduplicación frente a existentes
    const sigNew = variantSignature(level.dsl.topic, variantDef, picked);
    const existing = new Set<string>(
      level.dsl.variants.map((v:any)=> variantSignature(level.dsl.topic, {
        unknown:v.unknown, givens:v.givens, params:v.params, units_out:v.units_out
      }, { answer:v.answer, solution:v.solution, difficulty:v.difficulty }))
    );
    if (existing.has(sigNew)) throw new Error("Variante duplicada (misma firma). Cambia datos o rangos.");

    // 5) Construir y guardar
    const newVariantId = `var-${level.dsl.variants.length + 1}`;
    const fullVariant = newVariant(
      newVariantId,
      variantDef.unknown,
      variantDef.units_out,
      variantDef.givens,
      variantDef.params,
      picked
    );

    const newPack = [...pack];
    newPack[lIndex].dsl.variants = [...newPack[lIndex].dsl.variants, fullVariant];
    setPack(newPack);

  } catch (e:any) {
    setError(`Error Generando Variante: ${e.message}`);
  } finally {
    setLoading(loadingKey, false);
  }
};



  const handleGenerateCanvas = async (lIndex: number) => {
    const level = pack[lIndex];
    const loadingKey = `${lIndex}-canvas`;
    setLoading(loadingKey, true); setError("");

    const userPrompt = `
    Genera un canvas DSL para:
    - Tópico: ${level.dsl.topic}
    - Variables disponibles: ${level.dsl._ui_variables.map((p: any) => p.name).join(", ")}
    Debes referenciar valores de ejemplo con textos usando VAL.<nombre>.
  `;

    try {
      const url = `${API_BASE}?key=${encodeURIComponent(apiKey.trim())}`;
      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_TEXT_CANVAS }] },
        generationConfig: { responseMimeType: "application/json" },
      };

      const data = await fetchJSON(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = extractTextFromGemini(data);
      if (!txt) throw new Error("La IA no devolvió JSON.");
      const json = JSON.parse(txt);
      const parsed = CanvasDSLZ.parse(json); // validación dura

      const newPack = [...pack];
      newPack[lIndex].dsl.canvas = parsed;
      setPack(newPack);

    } catch (e: any) {
      setError(`Error Generando Canvas: ${e.message}`);
    } finally {
      setLoading(loadingKey, false);
    }
  };


  // --- Funciones de Output ---

  const finalJson = useMemo(() => {
    // Limpiar los campos _ui_ antes de exportar
    const cleanPack = pack.map((level: any) => {
      // Si no está habilitado, no lo incluimos o lo mandamos deshabilitado
      if (!level.enabled) {
        return { ...level, enabled: false, dsl: { variants: [] } }; // Mandar vacío
      }

      const { _ui_variables, _ui_constants, ...dsl } = level.dsl;
      return { ...level, dsl };
    });
    // .filter(level => level.enabled); // O filtrar

    return JSON.stringify(cleanPack, null, 2);
  }, [pack]);

  const copyOut = () => {
    navigator.clipboard.writeText(finalJson);
  };

  const downloadOut = () => {
    const blob = new Blob([finalJson], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pack-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const activeLevel = pack[activeTab];

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-5xl bg-card rounded-lg shadow p-6 border border-border">
        <h1 className="text-2xl font-bold text-foreground mb-2">🎒 Asistente de PACKs (Simple)</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Define tus variables, luego usa la IA para generar las preguntas (variantes) para cada nivel.
        </p>

        {/* API KEY */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Gemini API Key</label>
            <Input
              type="password"
              placeholder="Pega tu key..."
              value={apiKey}
              onChange={(e: any) => setApiKey(e.target.value)}
            />
          </div>
          <label className="flex items-end gap-2 text-sm text-foreground">
            <input type="checkbox" checked={remember} onChange={(e: any) => setRemember(e.target.checked)} />
            Recordar
          </label>
        </div>

        {/* Error global */}
        {error && (
          <div className="mt-3 rounded-md bg-red-100 text-red-700 border border-red-300 px-3 py-2 text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* TABS DE NIVELES */}
        <div className="border-b border-border mt-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {pack.map((level: any, lIndex: number) => (
              <button
                key={level.id}
                onClick={() => setActiveTab(lIndex)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === lIndex
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
              >
                {level.name} {level.enabled ? '✓' : ''}
              </button>
            ))}
          </nav>
        </div>

        {/* Editor de Nivel Activo */}
        <div className="mt-4">
          <LevelEditor
            key={activeLevel.id} // Forzar re-render al cambiar de tab
            level={activeLevel}
            onUpdate={(newLevelData: any) => updateLevel(activeTab, newLevelData)}
            onGenerateVariant={(variantDef: any) => handleGenerateVariant(activeTab, variantDef)}
            onGenerateCanvas={() => handleGenerateCanvas(activeTab)}
            onDeleteVariant={(vIndex: number) => deleteVariant(activeTab, vIndex)}
            loadingStates={{
              variant: loadingStates[`${activeTab}-variant`],
              canvas: loadingStates[`${activeTab}-canvas`],
            }}
            apiKey={apiKey}
          />
        </div>

        {/* Salida y Vista Previa */}
        <div className="mt-10 border-t pt-6">
          <h2 className="text-lg font-semibold mb-3 text-foreground">
            👀 Vista Previa (de la primera variante de cada nivel habilitado)
          </h2>
          <PackPreviewCarousel rawJson={finalJson} />
        </div>

        {/* SALIDA JSON */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Salida JSON</label>
            <div className="flex gap-2">
              <Button onClick={copyOut} className="border hover:bg-muted text-sm">Copiar</Button>
              <Button onClick={downloadOut} className="border hover:bg-muted text-sm">Descargar</Button>
            </div>
          </div>
          <textarea
            readOnly
            className="w-full rounded-md border border-green-300 bg-green-50 p-3 font-mono text-sm"
            style={{ minHeight: 400 }}
            value={finalJson}
          />
        </div>
      </div>
    </div>
  );
}
