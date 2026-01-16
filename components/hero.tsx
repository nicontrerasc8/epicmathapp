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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-emerald-50/30">
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-12">
        <motion.div
          className="text-center max-w-4xl mx-auto space-y-8"
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold"
            variants={fadeUp}
            custom={0}
          >
            <Trophy className="h-4 w-4" />
            +30% de mejora académica medida
          </motion.div>

          <motion.h1
            className="text-6xl md:text-7xl font-black leading-[1.1] tracking-tight"
            variants={fadeUp}
            custom={1}
          >
            Resultados reales en
            <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              {' '}
              matemáticas y física
            </span>
          </motion.h1>

          <motion.p
            className="text-2xl text-slate-600 font-medium leading-relaxed"
            variants={fadeUp}
            custom={2}
          >
            Tu currícula digitalizada con el método de tu colegio.
            <br />
            <strong className="text-slate-800">Práctica guiada, comprensión profunda, datos medibles.</strong>
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            variants={fadeUp}
            custom={3}
          >
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 h-auto">
              <Link href={`mailto:${CONTACT_EMAIL}`}>
                Ver demo con tu currícula
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-2 border-blue-200 text-lg px-8 py-6 h-auto">
              <Link href="#producto">Cómo funciona</Link>
            </Button>
          </motion.div>

          <motion.div
            className="flex flex-wrap justify-center gap-8 pt-4 text-slate-600"
            variants={fadeUp}
            custom={4}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-medium">Matemática</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-medium">Física</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-medium">Finanzas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-medium">Razonamiento cuantitativo</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

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
            <p className="text-2xl text-slate-300 font-medium">
              Según ENLA, 3 de cada 4 estudiantes no logran los objetivos esperados.
            </p>
            <div className="grid md:grid-cols-3 gap-6 pt-6">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="text-4xl font-black text-emerald-400 mb-2">Brechas</div>
                <div className="text-slate-300">que se acumulan</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="text-4xl font-black text-emerald-400 mb-2">Desmotivación</div>
                <div className="text-slate-300">estudiantil creciente</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="text-4xl font-black text-emerald-400 mb-2">Sobrecarga</div>
                <div className="text-slate-300">docente constante</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section> */}

      {/* PRODUCTO - 3 SCREENSHOTS DESTACADOS */}
      <section id="producto" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black mb-4">
            La solución está en <span className="text-blue-600">tu método</span>
          </h2>
          <p className="text-2xl text-slate-600">
            Ejercicios de tu colegio, digitalizados con el procedimiento que enseñas en clase
          </p>
        </div>

        <div className="space-y-20">
          {/* FEATURE 1 - GAME */}
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                <Zap className="h-4 w-4" />
                PRÁCTICA ACTIVA
              </div>
              <h3 className="text-4xl font-black leading-tight">
                Ejercicios reales del colegio, gamificados
              </h3>
              <p className="text-xl text-slate-600 leading-relaxed">
                Los estudiantes resuelven problemas de tu currícula en formato interactivo.
                Puntos, niveles y seguimiento en tiempo real mantienen el compromiso alto.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
                  <span className="text-lg"><strong>Motivación constante:</strong> sistema de recompensas que impulsa la práctica diaria</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
                  <span className="text-lg"><strong>Repetición espaciada:</strong> los conceptos vuelven automáticamente para consolidar</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
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
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 rounded-3xl blur-3xl" />
              <img
                src="/game.png"
                alt="Interfaz gamificada de ejercicios"
                className="relative w-full rounded-2xl shadow-2xl border-4 border-white"
              />
            </motion.div>
          </motion.div>

          {/* FEATURE 2 - FEEDBACK */}
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
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
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 rounded-3xl blur-3xl" />
              <img
                src="/feedback.png"
                alt="Solución paso a paso personalizada"
                className="relative w-full rounded-2xl shadow-2xl border-4 border-white"
              />
            </motion.div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                <Eye className="h-4 w-4" />
                FEEDBACK INMEDIATO
              </div>
              <h3 className="text-4xl font-black leading-tight">
                Cada paso explicado, como en tu clase
              </h3>
              <p className="text-xl text-slate-600 leading-relaxed">
                La solución paso a paso replica exactamente el método que enseñas.
                Cuando hay error, el estudiante ve dónde falló y por qué.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                  <span className="text-lg"><strong>Procedimiento docente:</strong> respetamos tu forma de enseñar al 100%</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                  <span className="text-lg"><strong>Aprendizaje del error:</strong> cada equivocación genera comprensión inmediata</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                  <span className="text-lg"><strong>Menos frustración:</strong> guía automática cuando más se necesita</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* FEATURE 3 - TEACHER DASHBOARD */}
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-bold">
                <BarChart3 className="h-4 w-4" />
                DATOS ACCIONABLES
              </div>
              <h3 className="text-4xl font-black leading-tight">
                Dashboard docente: decisiones basadas en datos
              </h3>
              <p className="text-xl text-slate-600 leading-relaxed">
                Visualiza el rendimiento por tema, identifica dificultades recurrentes
                y actúa antes de que las brechas crezcan.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 shrink-0 mt-1" />
                  <span className="text-lg"><strong>Alertas tempranas:</strong> detecta qué conceptos necesitan refuerzo</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 shrink-0 mt-1" />
                  <span className="text-lg"><strong>Seguimiento individual:</strong> ve el progreso de cada estudiante en tiempo real</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 shrink-0 mt-1" />
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
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-3xl blur-3xl" />
              <img
                src="/teacher.png"
                alt="Dashboard de análisis para docentes"
                className="relative w-full rounded-2xl shadow-2xl border-4 border-white"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* RESULTADOS MEDIDOS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-emerald-600 to-blue-600 p-16 text-white shadow-2xl text-center"
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
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
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
            className="rounded-3xl bg-white border-2 border-blue-200 p-10 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <Users className="h-12 w-12 text-blue-600 mb-6" />
            <h3 className="text-3xl font-black mb-6">Para estudiantes</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Comprensión profunda</p>
                  <p className="text-slate-600">Entienden el procedimiento, no solo memorizan</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Confianza creciente</p>
                  <p className="text-slate-600">Ven avances claros y medibles cada semana</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Autonomía real</p>
                  <p className="text-slate-600">Practican desde casa con guía profesional</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Menos frustración</p>
                  <p className="text-slate-600">Feedback inmediato en cada ejercicio</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="rounded-3xl bg-white border-2 border-emerald-200 p-10 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <BarChart3 className="h-12 w-12 text-emerald-600 mb-6" />
            <h3 className="text-3xl font-black mb-6">Para docentes</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Visibilidad total</p>
                  <p className="text-slate-600">Dashboard con rendimiento por tema y estudiante</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Intervención temprana</p>
                  <p className="text-slate-600">Identificas dificultades antes de los exámenes</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Tiempo recuperado</p>
                  <p className="text-slate-600">Cero corrección manual, enfócate en enseñar</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Target className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-lg mb-1">Tu método escalado</p>
                  <p className="text-slate-600">Digitalizamos tu forma de enseñar</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ADAPTACIÓN CURRICULAR */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-blue-200 p-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <BookOpenCheck className="h-16 w-16 text-blue-600 mx-auto" />
            <h2 className="text-5xl font-black">
              100% adaptado a tu currícula
            </h2>
            <p className="text-2xl text-slate-700 leading-relaxed">
              LUDUS no impone contenidos genéricos. Tú entregas tus ejercicios,
              defines el método de resolución y nosotros lo digitalizamos.
            </p>
            <div className="grid md:grid-cols-3 gap-6 pt-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-100">
                <div className="font-black text-xl mb-2">Tus ejercicios</div>
                <p className="text-slate-600">Del cuaderno al formato digital</p>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-100">
                <div className="font-black text-xl mb-2">Tu procedimiento</div>
                <p className="text-slate-600">Respetamos tu método al 100%</p>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-blue-100">
                <div className="font-black text-xl mb-2">Continuidad total</div>
                <p className="text-slate-600">Entre clase y casa, sin fricción</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* PARA QUIÉN */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl font-black">Para instituciones que buscan impacto</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg shadow-lg">
              Colegios
            </span>
            <span className="px-8 py-4 rounded-full bg-emerald-600 text-white font-bold text-lg shadow-lg">
              Academias
            </span>
            <span className="px-8 py-4 rounded-full bg-purple-600 text-white font-bold text-lg shadow-lg">
              Centros educativos
            </span>
          </div>
        </div>
      </section>

      {/* CTA FINAL - POTENTE */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-emerald-600 p-16 text-center text-white shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-6xl font-black mb-6">
            Hablemos de tu currícula
          </h2>
          <p className="text-2xl mb-10 font-medium text-blue-100 max-w-3xl mx-auto">
            Agenda una demo personalizada. Te mostramos cómo LUDUS se adapta
            a tus ejercicios, tu método y tus resultados.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-blue-700 hover:bg-blue-50 text-xl px-10 py-7 h-auto font-bold shadow-xl"
          >
            <Link href={`mailto:${CONTACT_EMAIL}`}>
              Solicitar demo institucional
              <ArrowRight className="ml-3 h-6 w-6" />
            </Link>
          </Button>
          <p className="mt-8 text-blue-100 text-lg">
            <Clock className="inline h-5 w-5 mr-2" />
            Respuesta en menos de 24 horas
          </p>
          <p className="mt-3 text-sm text-blue-200">
            Contacto directo: {CONTACT_EMAIL}
          </p>
        </motion.div>
      </section>
    </div>
  )
}