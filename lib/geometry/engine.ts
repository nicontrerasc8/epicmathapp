import { Rule } from './rule'
import { Solver } from './solver'
import { GeometryState } from './state'

function eqKey(e: any) {
    // clave simple para evitar duplicados (suficiente por ahora)
    return `${e.origin}::${JSON.stringify(e.left)}=${JSON.stringify(e.right)}`
}

export class GeometryEngine {
    constructor(
        private rules: Rule[],
        private solver: Solver
    ) { }

    run(state: GeometryState) {
        const seen = new Set<string>()

        let applied = true
        while (applied) {
            applied = false

            for (const rule of this.rules) {
                const step = rule.apply(state)
                if (!step) continue

                if (step.produces) {
                    const allNew = step.produces.filter(e => !seen.has(eqKey(e)))
                    if (allNew.length === 0) continue

                    allNew.forEach(e => seen.add(eqKey(e)))
                    state.equations.push(...allNew)

                    state.steps.push({ ...step, produces: allNew })
                } else {
                    state.steps.push(step)
                }

                applied = true
            }
        }

        // Resolver al final (puedes también resolver por iteraciones si quieres)
        this.solver.solve(state.equations)

        this.solver.values.forEach((v, k) => {
            state.knownValues.set(k, v)
        })

    }
}
