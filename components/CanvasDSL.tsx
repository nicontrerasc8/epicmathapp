// src/lib/canvasDsl.ts
import { z } from "zod";

const ColorZ = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional();
const AlignZ = z.enum(["left","center","right"]).optional();

const RectOpZ = z.object({
  op: z.literal("rect"), x: z.number(), y: z.number(),
  w: z.number().positive(), h: z.number().positive(),
  r: z.number().min(0).max(40).optional(),
  fill: ColorZ, stroke: ColorZ, lw: z.number().min(0).max(8).optional(),
});

const TextOpZ = z.object({
  op: z.literal("text"), x: z.number(), y: z.number(),
  text: z.string(), font: z.string().optional(),
  align: AlignZ, color: ColorZ,
});

const ArrowOpZ = z.object({
  op: z.literal("arrow"),
  x: z.number(), y: z.number(), x2: z.number(), y2: z.number(),
  color: ColorZ, lw: z.number().min(1).max(6).optional(), head: z.number().min(6).max(16).optional(),
});

const GridOpZ = z.object({
  op: z.literal("grid"),
  x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive(),
  step: z.number().positive().max(200), color: ColorZ, axis: z.boolean().optional().default(true),
});

const NumberLineOpZ = z.object({
  op: z.literal("numberline"),
  x: z.number(), y: z.number(), w: z.number().positive(),
  min: z.number(), max: z.number(), step: z.number().positive(), color: ColorZ,
});

const BarOpZ = z.object({
  op: z.literal("bar"),
  x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive(),
  label: z.string().optional(), fill: ColorZ,
});

const PieOpZ = z.object({
  op: z.literal("pie"),
  x: z.number(), y: z.number(), r: z.number().positive(),
  slices: z.array(z.object({
    value: z.number().gte(0),
    label: z.string().optional(),
    color: ColorZ,
  })),
});

export const CanvasDSLZ = z.object({
  kind: z.literal("canvas.v1"),
  width: z.number().positive().max(1200).default(720),
  height: z.number().positive().max(800).default(420),
  ops: z.array(z.discriminatedUnion("op", [
    RectOpZ, TextOpZ, ArrowOpZ, GridOpZ, NumberLineOpZ, BarOpZ, PieOpZ
  ])).max(150),
});

export type CanvasDSL = z.infer<typeof CanvasDSLZ>;

export function renderCanvasDSL(
  ctx: CanvasRenderingContext2D,
  dsl: CanvasDSL,
  VAL: Record<string, number | string>
) {
  const defaultStroke = "#E5E7EB";
  const defaultText = "#111827";
  const txtVAL = (t: string) => t.replace(/VAL\.([a-zA-Z0-9_]+)/g, (_, k) => String(VAL?.[k] ?? "?"));

  ctx.clearRect(0, 0, dsl.width, dsl.height);

  for (const op of dsl.ops) {
    switch (op.op) {
      case "rect": {
        ctx.save();
        if (op.fill) { ctx.fillStyle = op.fill; ctx.fillRect(op.x, op.y, op.w, op.h); }
        if (op.stroke || op.lw) {
          ctx.lineWidth = op.lw ?? 1;
          ctx.strokeStyle = op.stroke ?? defaultStroke;
          ctx.strokeRect(op.x, op.y, op.w, op.h);
        }
        ctx.restore();
        break;
      }
      case "text": {
        ctx.save();
        ctx.fillStyle = op.color ?? defaultText;
        ctx.font = op.font ?? "14px ui-sans-serif";
        ctx.textAlign = (op.align as CanvasTextAlign) ?? "left";
        ctx.fillText(txtVAL(op.text), op.x, op.y);
        ctx.restore();
        break;
      }
      case "arrow": {
        const color = op.color ?? defaultText;
        const lw = op.lw ?? 2;
        const head = op.head ?? 10;
        const dx = op.x2 - op.x, dy = op.y2 - op.y;
        const ang = Math.atan2(dy, dx);
        ctx.save();
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(op.x, op.y); ctx.lineTo(op.x2, op.y2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(op.x2, op.y2);
        ctx.lineTo(op.x2 - head*Math.cos(ang - Math.PI/6), op.y2 - head*Math.sin(ang - Math.PI/6));
        ctx.lineTo(op.x2 - head*Math.cos(ang + Math.PI/6), op.y2 - head*Math.sin(ang + Math.PI/6));
        ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case "grid": {
        ctx.save();
        const color = op.color ?? "#CBD5E1";
        ctx.strokeStyle = color; ctx.lineWidth = 1;
        for (let x = op.x; x <= op.x + op.w; x += op.step) {
          ctx.beginPath(); ctx.moveTo(x, op.y); ctx.lineTo(x, op.y + op.h); ctx.stroke();
        }
        for (let y = op.y; y <= op.y + op.h; y += op.step) {
          ctx.beginPath(); ctx.moveTo(op.x, y); ctx.lineTo(op.x + op.w, y); ctx.stroke();
        }
        if (op.axis) {
          ctx.strokeStyle = "#64748B"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(op.x, op.y + op.h); ctx.lineTo(op.x + op.w, op.y + op.h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(op.x, op.y); ctx.lineTo(op.x, op.y + op.h); ctx.stroke();
        }
        ctx.restore(); break;
      }
      case "numberline": {
        ctx.save();
        const color = op.color ?? defaultText;
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
        const y = op.y;
        ctx.beginPath(); ctx.moveTo(op.x, y); ctx.lineTo(op.x + op.w, y); ctx.stroke();
        const n = Math.floor((op.max - op.min) / op.step);
        for (let i = 0; i <= n; i++) {
          const t = op.min + i*op.step;
          const px = op.x + (i/n)*op.w;
          ctx.beginPath(); ctx.moveTo(px, y-6); ctx.lineTo(px, y+6); ctx.stroke();
          ctx.font = "12px ui-sans-serif"; ctx.textAlign = "center";
          ctx.fillText(String(t), px, y+18);
        }
        ctx.restore(); break;
      }
      case "bar": {
        ctx.save();
        ctx.fillStyle = (op.fill ?? "#3B82F6");
        ctx.fillRect(op.x, op.y - op.h, op.w, op.h);
        if (op.label) {
          ctx.fillStyle = defaultText; ctx.font = "12px ui-sans-serif"; ctx.textAlign = "center";
          ctx.fillText(op.label, op.x + op.w/2, op.y + 14);
        }
        ctx.restore(); break;
      }
      case "pie": {
        ctx.save();
        const total = op.slices.reduce((s, a)=>s+(a.value||0), 0) || 1;
        let start = -Math.PI/2;
        for (const s of op.slices) {
          const ang = (s.value/total) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(op.x, op.y);
          ctx.fillStyle = s.color ?? "#FACC15";
          ctx.arc(op.x, op.y, op.r, start, start + ang);
          ctx.closePath(); ctx.fill();
          start += ang;
        }
        ctx.restore(); break;
      }
    }
  }
}
