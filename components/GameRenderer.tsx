// components/GameRenderer.tsx
// @ts-nocheck
'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

type Props = {
  pregunta?: any
  valores?: Record<string, any>
  zoomOverride?: number
}

export default function GameRenderer({ pregunta, valores = {}, zoomOverride }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const meta = (pregunta?.dsl || pregunta?.meta || {}) ?? {}
  const disp = meta.display || {}
  const c = meta.canvas || {}
  const baseW = disp.canvas?.width ?? c.width ?? 720
  const baseH = disp.canvas?.height ?? c.height ?? 420
  const zoom = zoomOverride ?? (disp.zoom ?? 1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const container = canvas.parentElement
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
      const cw = container?.clientWidth ?? baseW
      const scale = cw / baseW
      const ch = baseH * scale

      canvas.style.width = `${cw}px`
      canvas.style.height = `${ch}px`
      canvas.width = Math.round(baseW * dpr * scale * zoom)
      canvas.height = Math.round(baseH * dpr * scale * zoom)

      // Normaliza sistema de coordenadas a baseW x baseH
      ctx.setTransform(canvas.width / baseW, 0, 0, canvas.height / baseH, 0, 0)
      ctx.clearRect(0, 0, baseW, baseH)

      // Fondo sutil para legibilidad
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, baseW, baseH)

      // Grid opcional (c.grid = true)
      if (c.grid) {
        ctx.save()
        ctx.strokeStyle = '#F3F4F6'
        ctx.lineWidth = 1
        for (let x = 0; x <= baseW; x += 40) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, baseH)
          ctx.stroke()
        }
        for (let y = 0; y <= baseH; y += 40) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(baseW, y)
          ctx.stroke()
        }
        ctx.restore()
      }

      let script = c.script || ''
      if (!script) {
        ctx.fillStyle = '#6B7280'
        ctx.font = '14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
        ctx.fillText('(No hay script de renderizado)', 24, baseH / 2)
        return
      }

      try {
        // Soporta scripts con VAL.* y/o plantillas {{var}}
        let runnable = script
        const usesVAL = /(^|[^A-Za-z0-9_])VAL\./.test(script)
        if (!usesVAL) {
          for (const k in valores) {
            runnable = runnable.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(valores[k]))
          }
        }

        // Helpers gráficos básicos
        const helpers = `
          const drawArrow = (x1,y1,x2,y2,{color="#10B981",w=2,head=10}={})=>{
            ctx.save();
            ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=w;
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
            const a=Math.atan2(y2-y1,x2-x1);
            ctx.beginPath();
            ctx.moveTo(x2,y2);
            ctx.lineTo(x2-head*Math.cos(a-Math.PI/6),y2-head*Math.sin(a-Math.PI/6));
            ctx.lineTo(x2-head*Math.cos(a+Math.PI/6),y2-head*Math.sin(a+Math.PI/6));
            ctx.closePath(); ctx.fill();
            ctx.restore();
          };
          const roundedRect=(x,y,w,h,r=10)=>{
            ctx.beginPath();
            ctx.moveTo(x+r,y);
            ctx.arcTo(x+w,y,x+w,y+h,r);
            ctx.arcTo(x+w,y+h,x,y+h,r);
            ctx.arcTo(x,y+h,x,y,r);
            ctx.arcTo(x,y,x+w,y,r);
            ctx.closePath();
          };
        `

        const fn = new Function('ctx', 'canvas', 'VAL', helpers + runnable)
        fn(ctx, { width: baseW, height: baseH }, valores)

        if (c.debug) {
          ctx.save()
          ctx.fillStyle = 'rgba(17,24,39,.7)'
          ctx.fillRect(8, 8, 160, 40)
          ctx.fillStyle = '#fff'
          ctx.font = '12px ui-sans-serif, system-ui'
          ctx.fillText(`W×H: ${baseW}×${baseH}`, 16, 24)
          ctx.fillText(`DPR: ${Math.max(1, Math.floor(window.devicePixelRatio || 1))}`, 16, 40)
          ctx.restore()
        }
      } catch (e) {
        console.error('Canvas script error:', e)
        ctx.fillStyle = '#EF4444'
        ctx.font = '14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
        ctx.fillText('Error al renderizar canvas', 24, baseH / 2)
      }
    }

    // Dibuja al inicio y en resize
    draw()

    // ResizeObserver para layout responsive
    let ro: ResizeObserver | null = null
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => draw())
      if (canvas.parentElement) ro.observe(canvas.parentElement)
    } else {
      window.addEventListener('resize', draw)
    }

    return () => {
      if (ro && canvas.parentElement) ro.unobserve(canvas.parentElement)
      window.removeEventListener('resize', draw)
    }
  }, [baseW, baseH, c.script, c.grid, c.debug, zoom, JSON.stringify(valores)])

  return (
    <motion.div
      className="w-full flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto border border-muted rounded-xl bg-white shadow-sm"
      />
      {c.caption && (
        <p className="text-sm text-muted-foreground mt-2 text-center px-2">
          {c.caption}
        </p>
      )}
    </motion.div>
  )
}
