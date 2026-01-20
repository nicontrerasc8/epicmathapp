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
  Shield,
  Sparkles,
  LineChart,
  GraduationCap,
  Lightbulb,
  Play,
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

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO SECTION - PROPUESTA DE VALOR CLARA */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-16 sm:pb-24">
          <motion.div
            className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge superior */}
            <motion.div variants={fadeUp} custom={0} className="inline-flex">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-bold border border-secondary/20">
                <Sparkles className="h-4 w-4" />
                +30% de mejora académica comprobada
              </div>
            </motion.div>

            {/* Headline principal */}
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight"
            >
              Tus ejercicios de matemáticas,
              <br />
              <span className="text-primary">digitalizados con IA</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto"
            >
              Plataforma gamificada que digitaliza <strong>el método que enseñas en clase</strong>.
              <br className="hidden sm:block" />
              Práctica autónoma, feedback paso a paso, dashboards con datos accionables.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
            >
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white text-base sm:text-lg px-8 py-6 h-auto font-bold shadow-xl group"
              >
                <Link href={`mailto:${CONTACT_EMAIL}`}>
                  Agendar demo institucional
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-primary/20 text-primary hover:bg-primary/5 text-base sm:text-lg px-8 py-6 h-auto font-bold"
              >
                <Link href="#como-funciona">
                  <Play className="mr-2 h-5 w-5" />
                  Ver cómo funciona
                </Link>
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="flex flex-wrap justify-center items-center gap-6 pt-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Datos protegidos</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span>Validado pedagógicamente</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>Respuesta en 24h</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* VALIDACIÓN SOCIAL - GANCHO EMOCIONAL TEMPRANO */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-secondary via-secondary/95 to-primary p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          {/* Decorative background */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          
          <div className="relative grid md:grid-cols-3 gap-8 items-center text-center">
            <div className="space-y-2">
              <div className="text-5xl sm:text-6xl font-black">+30%</div>
              <div className="text-lg sm:text-xl text-white/90">Mejora académica</div>
              <div className="text-sm text-white/70">vs. grupo control</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl sm:text-6xl font-black">100%</div>
              <div className="text-lg sm:text-xl text-white/90">Tu currícula</div>
              <div className="text-sm text-white/70">Ejercicios y método</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl sm:text-6xl font-black">0h</div>
              <div className="text-lg sm:text-xl text-white/90">Corrección manual</div>
              <div className="text-sm text-white/70">Ahorro de tiempo</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PROBLEMA - CONTEXTO ENLA */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 p-8 sm:p-12 lg:p-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Headline problema */}
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900">
                3 de cada 4 estudiantes no alcanzan
                <br />
                el nivel esperado en matemáticas
              </h2>
              <p className="text-lg sm:text-xl text-slate-600">
                Según la Evaluación Nacional de Logros de Aprendizaje (ENLA),
                el <strong>75% no llega al nivel satisfactorio</strong>.
              </p>
            </div>

            {/* Grid de consecuencias */}
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-red-600 rotate-180" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900">Brechas acumuladas</h3>
                <p className="text-slate-600 text-sm">
                  Los vacíos conceptuales se arrastran año tras año
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900">Desmotivación</h3>
                <p className="text-slate-600 text-sm">
                  La frustración constante aleja a los estudiantes
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900">Sobrecarga docente</h3>
                <p className="text-slate-600 text-sm">
                  Tiempo insuficiente para retroalimentación individual
                </p>
              </div>
            </div>

            {/* Transición a solución */}
            <div className="text-center pt-6">
              <p className="text-xl sm:text-2xl font-bold text-slate-900">
                LUDUS digitaliza la solución que ya conoces:
                <br />
                <span className="text-primary">más práctica + mejor feedback</span>
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CÓMO FUNCIONA EN 3 PASOS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
            Cómo funciona LUDUS
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Implementación simple, impacto medible
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {[
            {
              step: '01',
              icon: BookOpenCheck,
              title: 'Digitalizamos tus ejercicios',
              description: 'Envías tus ejercicios actuales y el procedimiento de resolución. Nuestra IA los convierte en formato interactivo.',
              color: 'primary',
            },
            {
              step: '02',
              icon: Zap,
              title: 'Estudiantes practican',
              description: 'Acceden desde cualquier dispositivo. Gamificación + feedback inmediato mantienen el compromiso alto.',
              color: 'secondary',
            },
            {
              step: '03',
              icon: LineChart,
              title: 'Tú decides con datos',
              description: 'Dashboard en tiempo real muestra quién necesita refuerzo y en qué temas específicos.',
              color: 'primary',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              {/* Step number */}
              <div className="absolute -top-4 -left-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white font-black text-2xl flex items-center justify-center shadow-lg">
                {item.step}
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-slate-100 h-full pt-12">
                <div className={`w-14 h-14 rounded-2xl bg-${item.color}/10 flex items-center justify-center mb-6`}>
                  <item.icon className={`h-7 w-7 text-${item.color}`} />
                </div>
                <h3 className="text-xl sm:text-2xl font-black mb-4">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PRODUCTO - 3 FEATURES CORE */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section id="producto" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="text-center mb-12 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
              La plataforma completa
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Tres componentes que transforman la práctica matemática
            </p>
          </motion.div>
        </div>

        <div className="space-y-24 sm:space-y-32">
          {/* FEATURE 1 - GAMIFICACIÓN */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-6 lg:pr-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                <Zap className="h-4 w-4" />
                GAMIFICACIÓN PEDAGÓGICA
              </div>
              
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
                Práctica autónoma que engancha
              </h3>
              
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Los estudiantes resuelven <strong>los mismos ejercicios de tu cuaderno</strong>,
                pero en un formato que los motiva a practicar más.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  {
                    title: 'Sistema de puntos y niveles',
                    desc: 'Progreso visible que refuerza el esfuerzo diario',
                  },
                  {
                    title: 'Repetición espaciada inteligente',
                    desc: 'Los conceptos difíciles vuelven automáticamente',
                  },
                  {
                    title: 'Ritmo personalizado',
                    desc: 'Cada estudiante avanza según su dominio real',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex gap-4 items-start"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-1">
                      <CheckCircle2 className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-bold text-base sm:text-lg mb-1">{item.title}</p>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              className="relative group"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-secondary/30 rounded-3xl blur-3xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-200">
                <img
                  src="/game.png"
                  alt="Interfaz gamificada de ejercicios matemáticos"
                  className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </motion.div>
          </motion.div>

          {/* FEATURE 2 - FEEDBACK PASO A PASO */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="relative group order-2 lg:order-1"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-secondary/30 to-primary/30 rounded-3xl blur-3xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-200">
                <img
                  src="/feedback.png"
                  alt="Feedback paso a paso personalizado"
                  className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </motion.div>

            <div className="space-y-6 lg:pl-8 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-bold border border-secondary/20">
                <Eye className="h-4 w-4" />
                APRENDIZAJE DEL ERROR
              </div>
              
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
                Feedback como si estuvieras al lado
              </h3>
              
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Cada solución replica <strong>exactamente el procedimiento que enseñas</strong>.
                Cuando hay error, el estudiante ve el paso correcto y entiende por qué.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  {
                    title: 'Tu método, digitalizado',
                    desc: '100% fiel a cómo enseñas en el aula',
                  },
                  {
                    title: 'Retroalimentación instantánea',
                    desc: 'Sin esperar corrección, sin frustración acumulada',
                  },
                  {
                    title: 'Comprensión profunda',
                    desc: 'Aprenden del error en el momento exacto',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex gap-4 items-start"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-base sm:text-lg mb-1">{item.title}</p>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* FEATURE 3 - DASHBOARD DOCENTE */}
          <motion.div
            className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-6 lg:pr-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                <BarChart3 className="h-4 w-4" />
                DECISIONES BASADAS EN DATOS
              </div>
              
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
                Dashboard que anticipa dificultades
              </h3>
              
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Visualiza el rendimiento por tema, identifica patrones de error
                y actúa <strong>antes de que las brechas se conviertan en fracaso</strong>.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  {
                    title: 'Alertas tempranas automáticas',
                    desc: 'Detecta qué conceptos necesitan refuerzo urgente',
                  },
                  {
                    title: 'Seguimiento individual y grupal',
                    desc: 'Ve el progreso de cada estudiante en tiempo real',
                  },
                  {
                    title: 'Cero corrección manual',
                    desc: 'Recupera horas semanales para enseñar mejor',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex gap-4 items-start"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-1">
                      <CheckCircle2 className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-bold text-base sm:text-lg mb-1">{item.title}</p>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              className="relative group"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-secondary/30 rounded-3xl blur-3xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-200">
                <img
                  src="/teacher.png"
                  alt="Dashboard de análisis para docentes"
                  className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* RESULTADOS MEDIDOS - REFORZADO */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-secondary via-primary to-secondary p-12 sm:p-16 lg:p-20 text-white shadow-2xl relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
          
          <div className="relative text-center space-y-8">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, type: 'spring' }}
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur mb-6">
                <TrendingUp className="h-10 w-10 text-white" />
              </div>
            </motion.div>

            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight">
              +30% de mejora académica
            </h2>
            
            <div className="max-w-3xl mx-auto space-y-4">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
Comparación directa con grupo control
</p>
<p className="text-lg sm:text-xl text-white/90 leading-relaxed">
Estudio piloto realizado en colegio privado de Lima Metropolitana
con 120 estudiantes durante 12 semanas.
</p>
</div>        <div className="grid sm:grid-cols-3 gap-6 pt-8 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-black mb-2">12 semanas</div>
            <div className="text-white/80">Duración del estudio</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-black mb-2">120</div>
            <div className="text-white/80">Estudiantes participantes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-black mb-2">+30%</div>
            <div className="text-white/80">Mejora vs. control</div>
          </div>
        </div>        <p className="text-sm sm:text-base text-white/70 pt-6 max-w-2xl mx-auto">
          * Medición basada en notas promedio de evaluaciones estandarizadas.
          Grupo experimental usó LUDUS 3 sesiones/semana, grupo control siguió metodología tradicional.
        </p>
      </div>
    </motion.div>
  </section>  {/* ═══════════════════════════════════════════════════════════ */}
  {/* BENEFICIOS DUALES - MEJORADO */}
  {/* ═══════════════════════════════════════════════════════════ */}
  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
    <div className="text-center mb-12 sm:mb-16">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
        Impacto medible para todos
      </h2>
      <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
        Beneficios concretos para estudiantes y docentes
      </p>
    </div>    <div className="grid lg:grid-cols-2 gap-8">
      {/* ESTUDIANTES */}
      <motion.div
        className="rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 p-8 sm:p-10 lg:p-12 shadow-lg relative overflow-hidden group hover:shadow-2xl transition-shadow duration-300"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors duration-500" />        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black">Para estudiantes</h3>
        </div>        <div className="space-y-6">
          {[
            {
              icon: Lightbulb,
              title: 'Comprensión profunda, no memorización',
              desc: 'Entienden el procedimiento completo, paso a paso',
            },
            {
              icon: Trophy,
              title: 'Confianza que crece con evidencia',
              desc: 'Ven su progreso en puntos, niveles y dominio de temas',
            },
            {
              icon: Target,
              title: 'Autonomía real desde casa',
              desc: 'Practican sin depender del horario del profesor',
            },
            {
              icon: CheckCircle2,
              title: 'Feedback sin espera ni frustración',
              desc: 'Corrección instantánea que enseña en el momento',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex gap-4 items-start bg-white/50 rounded-xl p-4 backdrop-blur-sm border border-primary/10"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-bold text-base sm:text-lg mb-1">{item.title}</p>
                <p className="text-muted-foreground text-sm sm:text-base">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>      {/* DOCENTES */}
      <motion.div
        className="rounded-3xl bg-gradient-to-br from-secondary/5 to-secondary/10 border-2 border-secondary/20 p-8 sm:p-10 lg:p-12 shadow-lg relative overflow-hidden group hover:shadow-2xl transition-shadow duration-300"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -z-10 group-hover:bg-secondary/10 transition-colors duration-500" />        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-secondary" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black">Para docentes</h3>
        </div>        <div className="space-y-6">
          {[
            {
              icon: Eye,
              title: 'Visibilidad total del aprendizaje',
              desc: 'Dashboard con rendimiento por tema y estudiante',
            },
            {
              icon: Target,
              title: 'Intervención antes del fracaso',
              desc: 'Alertas automáticas sobre dificultades recurrentes',
            },
            {
              icon: Clock,
              title: 'Horas recuperadas cada semana',
              desc: 'Cero tiempo en corrección manual de ejercicios',
            },
            {
              icon: Brain,
              title: 'Tu método escalado digitalmente',
              desc: 'La plataforma enseña exactamente como tú lo haces',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex gap-4 items-start bg-white/50 rounded-xl p-4 backdrop-blur-sm border border-secondary/10"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-base sm:text-lg mb-1">{item.title}</p>
                <p className="text-muted-foreground text-sm sm:text-base">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>  {/* ═══════════════════════════════════════════════════════════ */}
  {/* ADAPTACIÓN CURRICULAR - REFORZADO */}
  {/* ═══════════════════════════════════════════════════════════ */}
  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
    <motion.div
      className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 sm:p-14 lg:p-20 relative overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />      <div className="relative max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: 'spring' }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur mb-6">
              <BookOpenCheck className="h-10 w-10 text-white" />
            </div>
          </motion.div>          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-tight">
            100% adaptado a tu currícula
          </h2>          <p className="text-lg sm:text-xl lg:text-2xl text-white/80 leading-relaxed max-w-3xl mx-auto">
            LUDUS no impone ejercicios genéricos de internet.
            <br />
            <strong className="text-white">Digitalizamos exactamente lo que ya enseñas</strong>,
            con el procedimiento que tú defines.
          </p>
        </div>        <div className="grid md:grid-cols-3 gap-6 pt-8">
          {[
            {
              number: '1',
              title: 'Tus ejercicios',
              description: 'Del cuaderno o guía impresa al formato digital interactivo',
              icon: BookOpenCheck,
            },
            {
              number: '2',
              title: 'Tu procedimiento',
              description: 'Respetamos tu método de resolución al 100%, paso a paso',
              icon: Target,
            },
            {
              number: '3',
              title: 'Continuidad pedagógica',
              description: 'Entre clase presencial y práctica en casa, cero fricción',
              icon: CheckCircle2,
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/10 hover:bg-white/10 transition-colors duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary text-white font-black text-xl flex items-center justify-center">
                  {item.number}
                </div>
                <item.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-black text-xl sm:text-2xl mb-3 text-white">{item.title}</h3>
              <p className="text-white/70 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>        <div className="text-center pt-8">
          <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto">
            No necesitas cambiar tu planificación ni adoptar un sistema externo.
            LUDUS se adapta a ti, no al revés.
          </p>
        </div>
      </div>
    </motion.div>
  </section>  {/* ═══════════════════════════════════════════════════════════ */}
  {/* PARA QUIÉN */}
  {/* ═══════════════════════════════════════════════════════════ */}
  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
    <motion.div
      className="text-center max-w-4xl mx-auto space-y-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black">
        Para instituciones que buscan impacto medible
      </h2>      <div className="flex flex-wrap justify-center gap-4">
        {['Colegios privados', 'Academias', 'Centros educativos', 'Programas de refuerzo'].map((item, i) => (
          <motion.span
            key={i}
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            {item}
          </motion.span>
        ))}
      </div>      <p className="text-muted-foreground text-lg">
        Lima Metropolitana · Educación primaria · Matemáticas
      </p>
    </motion.div>
  </section>  {/* ═══════════════════════════════════════════════════════════ */}
  {/* CTA FINAL - OPTIMIZADO PARA CONVERSIÓN */}
  {/* ═══════════════════════════════════════════════════════════ */}
  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
    <motion.div
      className="rounded-3xl bg-gradient-to-br from-primary via-primary to-secondary p-10 sm:p-14 lg:p-20 text-center text-white shadow-2xl relative overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.05),transparent)]" />      <div className="relative max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: 'spring', delay: 0.2 }}
        >
          <Sparkles className="h-16 w-16 mx-auto mb-6 text-white" />
        </motion.div>        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-6 leading-tight">
          Digitaliza tu currícula de matemáticas
        </h2>        <p className="text-lg sm:text-xl lg:text-2xl mb-8 font-medium text-white/90 max-w-3xl mx-auto leading-relaxed">
          Agenda una demo personalizada. Te mostramos cómo LUDUS se adapta
          a <strong>tus ejercicios, tu método y tus objetivos pedagógicos</strong>.
        </p>        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button
            asChild
            size="lg"
            className="bg-white text-primary hover:bg-white/90 text-lg sm:text-xl px-10 py-7 h-auto font-black shadow-2xl group"
          >
            <Link href={`mailto:${CONTACT_EMAIL}`}>
              Solicitar demo institucional
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>        <div className="space-y-3 pt-8">
          <p className="text-white/90 text-base sm:text-lg flex items-center justify-center gap-2">
            <Clock className="h-5 w-5" />
            Respuesta garantizada en menos de 24 horas
          </p>
          <p className="text-white/70 text-sm sm:text-base">
            Contacto directo: <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-white transition-colors">{CONTACT_EMAIL}</a>
          </p>
        </div>        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span>Datos protegidos</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Sin compromiso</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Soporte dedicado</span>
          </div>
        </div>
      </div>
    </motion.div>
  </section>  {/* Footer simple */}
  <footer className="border-t border-slate-200 bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-sm text-muted-foreground">
      <p>© 2025 LUDUS · Plataforma educativa de matemáticas gamificada</p>
      <p className="mt-2">Lima, Perú · {CONTACT_EMAIL}</p>
    </div>
  </footer>
</div>
)
}