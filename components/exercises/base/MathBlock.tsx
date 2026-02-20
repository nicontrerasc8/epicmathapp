"use client"

import { MathJax, MathJaxContext } from "better-react-mathjax"

const MATHJAX_CONFIG = {
  loader: { load: ["input/tex", "output/chtml"] },
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"]],
    processEscapes: true,
    packages: { "[+]": ["ams"] },
  },
  options: {
    renderActions: { addMenu: [] },
  },
} as const

export function MathProvider({ children }: { children: React.ReactNode }) {
  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      {children}
    </MathJaxContext>
  )
}

export function MathTex({
  tex,
  block = false,
  className = "",
}: {
  tex: string
  block?: boolean
  className?: string
}) {
  const wrapped = block ? `\\[${tex}\\]` : `\\(\\displaystyle ${tex}\\)`
  return (
    <span className={className}>
      <MathJax dynamic inline={!block}>
        {wrapped}
      </MathJax>
    </span>
  )
}
