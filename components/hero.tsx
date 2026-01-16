'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LineChart, Calculator, BarChart3 } from 'lucide-react'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background text-foreground">
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-24 flex flex-col-reverse md:flex-row items-center justify-between gap-16">
        {/* Text */}
        <motion.div
          className="flex-1 text-center md:text-left space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-extrabold leading-tight">
            Ludus para{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              academias
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto md:mx-0">
            Plataforma para cursos de Matemática en academias y centros de preparación.
            Crea simulacros, analiza desempeño y potencia el aprendizaje visual de tus alumnos.
          </p>

          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3">
            <Button asChild size="lg">
              <Link href="#features">Ver funciones</Link>
            </Button>
          </div>

          <div className="flex gap-3 justify-center md:justify-start mt-4">
            <Badge>Simulacros</Badge>
            <Badge>Reportes</Badge>
            <Badge>Gráficos</Badge>
          </div>
        </motion.div>

      
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="max-w-6xl mx-auto px-6 py-20 space-y-16"
      >
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-2">Funciones principales</h2>
          <p className="text-muted-foreground">
            Diseñado para cursos intensivos, ciclos y simulacros.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          <FeatureCard
            icon={<Calculator className="h-5 w-5 text-primary" />}
            title="Genera simulacros en minutos"
            desc="Carga bancos de preguntas, define temas, niveles y variantes automáticas."
          />
          <FeatureCard
            icon={<LineChart className="h-5 w-5 text-secondary" />}
            title="Analiza el progreso real"
            desc="Revisa métricas por grupo, pregunta o tema. Exporta reportes en segundos."
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5 text-accent-foreground" />}
            title="Aprendizaje visual"
            desc="Gráficos interactivos y feedback inmediato que fortalecen la comprensión."
          />
        </div>
      </section>



     
    </div>
  )
}

/* --- Components --- */
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">{icon}<h3 className="font-semibold text-lg">{title}</h3></div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </motion.div>
  )
}

function CanvasCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col items-center"
    >
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="w-full h-48 flex items-center justify-center overflow-hidden">
        {children}
      </div>
    </motion.div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
      {children}
    </span>
  )
}

/* --- Canvas Visuals --- */
function CanvasParabola({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = (canvas.width = 400)
    const h = (canvas.height = compact ? 150 : 250)
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = -10; x <= 10; x += 0.1) {
      const y = x * x
      const px = w / 2 + x * 20
      const py = h - y * 10 - 40
      x === -10 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.fillStyle = '#F472B6'
    ctx.beginPath()
    ctx.arc(w / 2, h - 40, 6, 0, Math.PI * 2)
    ctx.fill()
  }, [compact])

  return <canvas ref={ref} className="max-w-full" />
}

function CanvasHistogram() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = (c.width = 400)
    const h = (c.height = 200)
    const data = [3, 6, 9, 7, 4]
    const bw = 50
    const max = Math.max(...data)
    data.forEach((v, i) => {
      const x = 40 + i * (bw + 20)
      const bh = (v / max) * 120
      ctx.fillStyle = '#3B82F6'
      ctx.fillRect(x, h - bh - 30, bw, bh)
    })
  }, [])
  return <canvas ref={ref} className="max-w-full" />
}

function CanvasFraction() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = (c.width = 300)
    const h = (c.height = 200)
    const parts = 4
    ctx.strokeStyle = '#111827'
    ctx.strokeRect(50, 50, 200, 100)
    ctx.fillStyle = '#3B82F6'
    for (let i = 0; i < 2; i++) ctx.fillRect(50 + (i * 200) / parts, 50, 200 / parts, 100)
    ctx.fillStyle = '#000'
    ctx.font = '16px sans-serif'
    ctx.fillText('2/4', 130, 180)
  }, [])
  return <canvas ref={ref} className="max-w-full" />
}
