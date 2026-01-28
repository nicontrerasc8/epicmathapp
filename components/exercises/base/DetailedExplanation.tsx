'use client'

import { ReactNode } from 'react'
import { ShieldCheck, Timer } from 'lucide-react'

export type ExplanationStep = {
  title: string
  detail: ReactNode
  icon?: React.ComponentType<{ className?: string }>
  content?: ReactNode
  tip?: ReactNode
}

export function DetailedExplanation({
  title,
  steps,
  concluding,
}: {
  title?: string
  steps: ExplanationStep[]
  concluding?: ReactNode
}) {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {title && (
        <div className="rounded-xl border bg-card p-4">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {title}
          </div>
          <p className="text-muted-foreground">
            Cada paso tiene una meta clara: desde entender los datos hasta validar la respuesta final.
          </p>
        </div>
      )}

      {steps.map((step, index) => {
        const Icon = step.icon ?? (index === 1 ? Timer : ShieldCheck)
        return (
          <div key={`step-${index}`} className="rounded-xl border bg-card p-4">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {`Paso ${index + 1} · ${step.title}`}
            </div>
            <p className="text-muted-foreground">{step.detail}</p>
            {step.content && <div className="mt-2 rounded-lg border bg-background p-3 text-xs">{step.content}</div>}
            {step.tip && (
              <div className="mt-2 rounded-lg border border-dashed bg-background p-3 text-xs text-muted-foreground">
                <strong>Tip:</strong> {step.tip}
              </div>
            )}
          </div>
        )
      })}

      {concluding && (
        <div className="rounded-xl border bg-card p-4">
          <div className="font-semibold mb-2">Resumen final</div>
          <p className="text-muted-foreground">{concluding}</p>
        </div>
      )}
    </div>
  )
}
