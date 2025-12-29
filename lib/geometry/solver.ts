import { LinearEquation } from './equation'
import { normalize, NormalizedEquation } from './normalize'

export class Solver {
  /** Valores ya resueltos: variable → número */
  values = new Map<string, number>()

  /** Pasos algebraicos (texto humano, para SolutionBox) */
  steps: string[] = []

  solve(equations: LinearEquation[]) {
    let changed = true

    while (changed) {
      changed = false

      for (const eq of equations) {
        const n: any = normalize(eq)

        // Queremos resolver: Σ(ai·xi) + constant = 0
        // Sustituimos variables ya conocidas
        let constant = n.constant
        const unknowns: Array<{ v: string; a: number }> = []

        for (const [v, a] of n.coeffs.entries()) {
          if (Math.abs(a) < 1e-9) continue

          const known = this.values.get(v)
          if (known !== undefined) {
            // ai·xi pasa al término independiente
            constant -= a * known
          } else {
            unknowns.push({ v, a })
          }
        }

        // Caso clave: una sola incógnita → se puede despejar
        if (unknowns.length === 1) {
          const { v, a } = unknowns[0]

          // a·v + constant = 0  ⇒  v = -constant / a
          const value = -constant / a

          if (!this.values.has(v)) {
            this.values.set(v, value)

            this.steps.push(
              `De ${eq.origin}: al despejar ${v}, se obtiene ${v} = ${value}.`
            )

            changed = true
          }
        }
      }
    }
  }
}
