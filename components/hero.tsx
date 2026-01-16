'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Trophy,
  Target,
  Zap,
  Eye,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
} from 'lucide-react'

const CONTACT_EMAIL = 'mateojordan97@gmail.com'

export default function Hero() {
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 0.1 * i, ease: 'easeOut' },
    }),
  }

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.7, ease: 'easeOut' },
    },
  }

  return (
    <div className="min-h-screen bg-background bg-gradient-to-b from-primary/5 via-background to-secondary/5">
      {/* HERO SECTION */}
     

      {/* PROBLEMA - IMPACTO DIRECTO */}
      {/* <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-12 text-white shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-5xl font-black">
              75% no alcanza el nivel en matemáticas
            </h2>
            <p className="text-2xl text-muted-foreground font-medium">
              Según ENLA, 3 de cada 4 estudiantes no logran los objetivos esperados.
            </p>
            <div className="grid md:grid-cols-3 gap-6 pt-6">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="text-4xl font-black text-secondary mb-2">Brechas</div>
                <div className="text-muted-foreground">que se acumulan</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="text-4xl font-black text-secondary mb-2">Desmotivación</div>
                <div className="text-muted-foreground">estudiantil creciente</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="text-4xl font-black text-secondary mb-2">Sobrecarga</div>
                <div className="text-muted-foreground">docente constante</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section> */}

      {/* PRODUCTO - 3 SCREENSHOTS DESTACADOS */}
      <section id="producto" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-black mb-4">
            La plataforma que potencia a tus <span className="text-primary">estudiantes</span>
          </h1>
          <p className="text-2xl text-muted-foreground">
            Ejercicios de tu colegio, digitalizados con el procedimiento que enseñas en clase
          </p>
        </div>

        <div className="space-y-20">
          {/* FEATURE 1 - GAME */}
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold">
                <Zap className="h-4 w-4" />
                PRÁCTICA ACTIVA
              </div>
              <h3 className="text-4xl font-black leading-tight">
                Ejercicios reales del colegio, gamificados
              </h3>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Los estudiantes resuelven problemas de tu currícula en formato interactivo.
                Puntos, niveles y seguimiento en tiempo real mantienen el compromiso alto.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-secondary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Motivación constante:</strong> sistema de recompensas que impulsa la práctica diaria</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-secondary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Repetición espaciada:</strong> los conceptos vuelven automáticamente para consolidar</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-secondary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Ritmo propio:</strong> cada estudiante avanza según su dominio real</span>
                </li>
              </ul>
            </div>
            <motion.div
              className="relative"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
              <img
                src="/game.png"
                alt="Interfaz gamificada de ejercicios"
                className="relative w-full rounded-2xl shadow-2xl border-4 border-white lg:scale-110 xl:scale-110 origin-center"
              />
            </motion.div>
          </motion.div>

          {/* FEATURE 2 - FEEDBACK */}
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="relative order-2 md:order-1"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-3xl blur-3xl" />
              <img
                src="/feedback.png"
                alt="Solución paso a paso personalizada"
                className="relative w-full rounded-2xl shadow-2xl border-4 border-white lg:scale-110 xl:scale-110 origin-center"
              />
            </motion.div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-bold">
                <Eye className="h-4 w-4" />
                FEEDBACK INMEDIATO
              </div>
              <h3 className="text-4xl font-black leading-tight">
                Cada paso explicado, como en tu clase
              </h3>
              <p className="text-xl text-muted-foreground leading-relaxed">
                La solución paso a paso replica exactamente el método que enseñas.
                Cuando hay error, el estudiante ve dónde falló y por qué.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Procedimiento docente:</strong> respetamos tu forma de enseñar al 100%</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Aprendizaje del error:</strong> cada equivocación genera comprensión inmediata</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Menos frustración:</strong> guía automática cuando más se necesita</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* FEATURE 3 - TEACHER DASHBOARD */}
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold">
                <BarChart3 className="h-4 w-4" />
                DATOS ACCIONABLES
              </div>
              <h3 className="text-4xl font-black leading-tight">
                Dashboard docente: decisiones basadas en datos
              </h3>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Visualiza el rendimiento por tema, identifica dificultades recurrentes
                y actúa antes de que las brechas crezcan.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Alertas tempranas:</strong> detecta qué conceptos necesitan refuerzo</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Seguimiento individual:</strong> ve el progreso de cada estudiante en tiempo real</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <span className="text-lg"><strong>Menos carga operativa:</strong> cero tiempo en corrección manual</span>
                </li>
              </ul>
            </div>
            <motion.div
              className="relative"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
              <img
                src="/teacher.png"
                alt="Dashboard de análisis para docentes"
                className="relative w-full rounded-2xl shadow-2xl border-4 border-white lg:scale-110 xl:scale-110 origin-center"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* RESULTADOS MEDIDOS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-secondary to-primary p-16 text-white shadow-2xl text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <TrendingUp className="h-16 w-16 mx-auto mb-6" />
          <h2 className="text-6xl font-black mb-6">+30% de mejora académica</h2>
          <p className="text-3xl mb-4 font-semibold">
            Comparación directa con grupo control
          </p>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Evidencia medida y verificable. No promesas, resultados reales que respaldan
            tu inversión educativa.
          </p>
        </motion.div>
      </section>

      {/* BENEFICIOS CONCRETOS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black mb-4">Impacto medible para todos</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            className="rounded-3xl bg-white border-2 border-primary/20 p-10 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <Users className="h-12 w-12 text-primary mb-6" />
            <h3 className="text-3xl font-black mb-6">Para estudiantes</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-secondary shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Comprensión profunda</p>
                  <p className="text-muted-foreground">Entienden el procedimiento, no solo memorizan</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-secondary shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Confianza creciente</p>
                  <p className="text-muted-foreground">Ven avances claros y medibles cada semana</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-secondary shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Autonomía real</p>
                  <p className="text-muted-foreground">Practican desde casa con guía profesional</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-secondary shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Menos frustración</p>
                  <p className="text-muted-foreground">Feedback inmediato en cada ejercicio</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="rounded-3xl bg-white border-2 border-secondary/20 p-10 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <BarChart3 className="h-12 w-12 text-secondary mb-6" />
            <h3 className="text-3xl font-black mb-6">Para docentes</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Visibilidad total</p>
                  <p className="text-muted-foreground">Dashboard con rendimiento por tema y estudiante</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Intervención temprana</p>
                  <p className="text-muted-foreground">Identificas dificultades antes de los exámenes</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Tiempo recuperado</p>
                  <p className="text-muted-foreground">Cero corrección manual, enfócate en enseñar</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Tu método escalado</p>
                  <p className="text-muted-foreground">Digitalizamos tu forma de enseñar</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ADAPTACIÃ“N CURRICULAR */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-background to-primary/5 border-2 border-primary/20 p-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <BookOpenCheck className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-5xl font-black">
              100% adaptado a tu currícula
            </h2>
            <p className="text-2xl text-muted-foreground leading-relaxed">
              Ludus no impone contenidos genéricos. Tú entregas tus ejercicios,
              defines el método de resolución y nosotros lo digitalizamos.
            </p>
            <div className="grid md:grid-cols-3 gap-6 pt-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-primary/10">
                <div className="font-black text-xl mb-2">Tus ejercicios</div>
                <p className="text-muted-foreground">Del cuaderno al formato digital</p>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-primary/10">
                <div className="font-black text-xl mb-2">Tu procedimiento</div>
                <p className="text-muted-foreground">Respetamos tu método al 100%</p>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-primary/10">
                <div className="font-black text-xl mb-2">Continuidad total</div>
                <p className="text-muted-foreground">Entre clase y casa, sin fricción</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* PARA QUIÃ‰N */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl font-black">Para instituciones que buscan impacto</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="px-8 py-4 rounded-full bg-primary text-white font-bold text-lg shadow-lg">
              Colegios
            </span>
            <span className="px-8 py-4 rounded-full bg-secondary text-white font-bold text-lg shadow-lg">
              Academias
            </span>
            <span className="px-8 py-4 rounded-full bg-primary text-white font-bold text-lg shadow-lg">
              Centros educativos
            </span>
          </div>
        </div>
      </section>

      {/* CTA FINAL - POTENTE */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-secondary p-16 text-center text-white shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-6xl font-black mb-6">
            Hablemos de tu currícula
          </h2>
          <p className="text-2xl mb-10 font-medium text-white/80 max-w-3xl mx-auto">
            Agenda una demo personalizada. Te mostramos cómo LUDUS se adapta
            a tus ejercicios, tu método y tus resultados.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-primary hover:bg-primary/5 text-xl px-10 py-7 h-auto font-bold shadow-xl"
          >
            <Link href={`mailto:${CONTACT_EMAIL}`}>
              Solicitar demo institucional
              <ArrowRight className="ml-3 h-6 w-6" />
            </Link>
          </Button>
          <p className="mt-8 text-white/80 text-lg">
            <Clock className="inline h-5 w-5 mr-2" />
            Respuesta en menos de 24 horas
          </p>
          <p className="mt-3 text-sm text-white/70">
            Contacto directo: {CONTACT_EMAIL}
          </p>
        </motion.div>
      </section>
    </div>
  )
}


