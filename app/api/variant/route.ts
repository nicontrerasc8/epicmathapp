// =============================================
// File: app/api/variant/route.ts
// =============================================
import type { NextRequest } from "next/server";

export const runtime = "edge";

// Prompt mínimo: deja que el SCHEMA haga el trabajo pesado.
const SYSTEM_PROMPT =
  "Solo JSON válido según SCHEMA. Sin texto extra ni Markdown. Infieres 'unknown', 'units_out' y 'difficulty'. 'params' es array de {name, range}. 'answer.expr' usa VAL.* (JS). Fórmulas en LaTeX en solution.steps. Consistencia entre givens/params/expr.";

// Esquema de variante (mx.v3-like). Requiere unknown/units_out/difficulty, la IA debe inferirlos.
const VARIANT_SCHEMA: any = {
  type: "OBJECT",
  properties: {
    id: { type: "STRING" },
    difficulty: { type: "NUMBER" },
    params: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          range: {
            type: "ARRAY",
            items: { type: "NUMBER" },
            minItems: 2,
            maxItems: 2,
          },
        },
        required: ["name", "range"],
      },
      description: "Variables de muestreo con nombre y rango [min,max] en SI.",
    },
    givens: { type: "ARRAY", items: { type: "STRING" } },
    unknown: { type: "STRING" },
    units_out: { type: "STRING" },
    answer: {
      type: "OBJECT",
      properties: {
        expr: {
          type: "STRING",
          description:
            "Expresión JS; referenciar como VAL.x. Ej: 0.5*VAL.m*VAL.v**2",
        },
      },
      required: ["expr"],
    },
    solution: {
      type: "OBJECT",
      properties: {
        steps: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING" },
              formula: { type: "STRING" },
            },
            required: ["text", "formula"],
          },
        },
      },
    },
    // Opcional avanzado para subir el "calibre" sin romper compatibilidad
    attempts: {
      type: "OBJECT",
      properties: {
        max: { type: "NUMBER" },
        hints: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING" },
              after: { type: "NUMBER" },
            },
            required: ["text"],
          },
        },
        tolerance: {
          type: "OBJECT",
          properties: {
            abs: { type: "NUMBER" },
            rel: { type: "NUMBER" },
            decimals: { type: "NUMBER" },
          },
        },
        reveal_after: { type: "NUMBER" },
      },
    },
  },
  required: [
    "id",
    "difficulty",
    "params",
    "givens",
    "unknown",
    "units_out",
    "answer",
    "solution",
  ],
};

async function backoff<T>(fn: () => Promise<T>, max = 3, baseMs = 700) {
  let lastErr: any;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < max - 1) await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = "AIzaSyB7Zl08z6UzhetCatjolaqn6rFF6hQNZA0";
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Falta GEMINI_API_KEY en variables de entorno." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Falta 'prompt'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prompt de usuario ultracorto: la IA infiere unknown/units_out/difficulty.
    const USER_PROMPT = `Tema: ${prompt}\nGenera UNA variante completa consistente. Infieres unknown, units_out y difficulty.`;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      "gemini-2.5-flash-preview-09-2025:generateContent?key=" +
      apiKey;

    const payload = {
      contents: [{ parts: [{ text: USER_PROMPT }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: VARIANT_SCHEMA,
      },
    } as const;

    const res = await backoff(async () => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Gemini ${r.status}: ${t}`);
      }
      return r;
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return new Response(
        JSON.stringify({ error: "La IA no devolvió JSON en 'text'." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: "Respuesta no es JSON válido.", raw: text }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? "Error inesperado" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

