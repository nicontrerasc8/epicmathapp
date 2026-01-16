'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const CONTACT_EMAIL = 'mateojordan97@gmail.com'

export default function Hero() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f2e9,transparent_55%),linear-gradient(180deg,#fbfaf7,transparent_40%)] text-foreground">
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            LUDUS para ciencias numericas
          </p>
          <h1 className="text-5xl font-extrabold leading-tight">
            Tu curricula, ensenada con el metodo de tus docentes y recordada a largo plazo
          </h1>
          <p className="text-lg text-muted-foreground">
            LUDUS digitaliza los ejercicios de tu colegio y guia al estudiante paso a paso
            tal como se explica en clase. Practica repetida, comprension real y continuidad
            entre aula y hogar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg">
              <Link href={`mailto:${CONTACT_EMAIL}`}>Solicita una demo institucional</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#enfoque">Ver como funciona</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-3 py-1">Matematica</span>
            <span className="rounded-full border border-border px-3 py-1">Fisica</span>
            <span className="rounded-full border border-border px-3 py-1">Finanzas</span>
            <span className="rounded-full border border-border px-3 py-1">
              Razonamiento cuantitativo
            </span>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-white/70 p-6 shadow-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="text-sm text-muted-foreground mb-3">
            Vista previa de la experiencia
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-border p-4">
              <p className="text-sm font-semibold">Imagen: ejercicio con solucion paso a paso</p>
              <p className="text-xs text-muted-foreground">
                El estudiante ve cada paso del metodo docente, no solo la respuesta.
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-border p-4">
              <p className="text-sm font-semibold">Imagen: dashboard docente</p>
              <p className="text-xs text-muted-foreground">
                Rendimiento por tema y alertas tempranas de dificultades.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* PROBLEMA */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border bg-white/80 p-8 shadow-sm">
          <h2 className="text-3xl font-bold mb-3">El problema es real y medible</h2>
          <p className="text-lg text-muted-foreground">
            Segun la Evaluacion Nacional de Logros de Aprendizaje (ENLA), 3 de cada 4
            estudiantes a nivel nacional no alcanzan los niveles esperados en Matematica.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            La consecuencia es clara: brechas de comprension, desmotivacion y una carga
            docente creciente para corregir y recuperar contenidos.
          </p>
        </div>
      </section>

      {/* ENFOQUE */}
      <section id="enfoque" className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div>
          <h2 className="text-3xl font-bold mb-2">Nuestro enfoque pedagogico</h2>
          <p className="text-muted-foreground">
            Aplicamos principios basados en evidencia con un lenguaje simple y defendible.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Repeticion espaciada</h3>
            <p className="text-sm text-muted-foreground">
              Los conceptos vuelven en el tiempo para consolidar aprendizajes y evitar
              lagunas. El estudiante practica cuando corresponde, no solo cuando recuerda.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Aprendizaje basado en el error</h3>
            <p className="text-sm text-muted-foreground">
              Cada error genera una explicacion inmediata. El estudiante comprende el
              por que, corrige el proceso y avanza con confianza.
            </p>
          </div>
        </div>
      </section>

      {/* PRACTICA */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-start">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Asi se ve LUDUS en la practica</h2>
          <p className="text-muted-foreground">
            Los estudiantes resuelven ejercicios reales del colegio y reciben la solucion
            paso a paso tal como se ensena en clase.
          </p>
          <p className="text-sm text-muted-foreground">
            La explicacion inmediata reduce frustracion y refuerza el concepto en el
            momento justo.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-border p-5 bg-white/70">
            <p className="text-sm font-semibold">Imagen: ejercicios reales con guia visual</p>
            <p className="text-xs text-muted-foreground">
              Cada paso coincide con el procedimiento del docente.
            </p>
          </div>
          <div className="rounded-xl border border-dashed border-border p-5 bg-white/70">
            <p className="text-sm font-semibold">Imagen: solucion paso a paso automatica</p>
            <p className="text-xs text-muted-foreground">
              La plataforma refuerza conceptos de forma automatica.
            </p>
          </div>
        </div>
      </section>

      {/* CURRICULA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border bg-white/80 p-8 shadow-sm">
          <h2 className="text-3xl font-bold mb-3">Adaptacion total a tu curricula</h2>
          <p className="text-muted-foreground">
            LUDUS no impone contenidos. Tu equipo entrega sus ejercicios y define el
            metodo de resolucion. Nosotros lo digitalizamos y lo hacemos escalable.
          </p>
          <div className="mt-5 grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border p-4">
              Ejercicios 100% del colegio
            </div>
            <div className="rounded-xl border border-border p-4">
              Procedimiento docente respetado
            </div>
            <div className="rounded-xl border border-border p-4">
              Continuidad entre clase y casa
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS ESTUDIANTES */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10">
        <div className="rounded-2xl border border-border bg-white/80 p-8 shadow-sm">
          <h2 className="text-3xl font-bold mb-3">Beneficios para estudiantes</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>Comprension profunda del procedimiento, no solo del resultado.</li>
            <li>Confianza al ver avances claros y repetibles.</li>
            <li>Ritmo propio con practica desde casa.</li>
            <li>Menos frustracion al recibir guia inmediata.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-white/80 p-8 shadow-sm">
          <h2 className="text-3xl font-bold mb-3">Beneficios para docentes</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>Dashboard con rendimiento por tema y por estudiante.</li>
            <li>Identificacion rapida de dificultades recurrentes.</li>
            <li>Menos carga operativa en correccion y seguimiento.</li>
          </ul>
        </div>
      </section>

      {/* RESULTADOS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border bg-white/90 p-8 shadow-sm">
          <h2 className="text-3xl font-bold mb-3">Resultados medidos</h2>
          <p className="text-lg text-muted-foreground">
            +30% de mejora en el rendimiento academico en el grupo que utilizo LUDUS,
            comparado con un grupo control.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Evidencia clara para respaldar decisiones institucionales.
          </p>
        </div>
      </section>

      {/* PARA QUIEN */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border bg-white/80 p-8 shadow-sm">
          <h2 className="text-3xl font-bold mb-3">Para quien es LUDUS</h2>
          <p className="text-muted-foreground">
            Instituciones que buscan impacto real en ciencias numericas.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-border px-4 py-2">Colegios</span>
            <span className="rounded-full border border-border px-4 py-2">Academias</span>
            <span className="rounded-full border border-border px-4 py-2">
              Instituciones educativas
            </span>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-border bg-primary/10 p-10 text-center space-y-4">
          <h2 className="text-3xl font-bold">Una demo vale mas que mil promesas</h2>
          <p className="text-muted-foreground">
            Conversemos sobre tu curricula y veamos como LUDUS se adapta a tu institucion.
          </p>
          <div className="flex justify-center">
            <Button asChild size="lg">
              <Link href={`mailto:${CONTACT_EMAIL}`}>Agenda una demostracion</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Contacto directo: {CONTACT_EMAIL}
          </p>
        </div>
      </section>
    </div>
  )
}
