import { Rule } from '../rule'
import { LinearEquation } from '../equation'
import { Add } from '../expr'
import { angle } from '../geometry'

function parseExteriorFact(fact: string) {
  if (!fact.startsWith('exterior(') || !fact.endsWith(')')) return null
  const inside = fact.slice('exterior('.length, -1)
  const [A, B, C, D] = inside.split(',').map(s => s.trim())
  if (!A || !B || !C || !D) return null
  return { A, B, C, D }
}

export const ExteriorAngleRule: Rule = {
  name: 'ExteriorAngle',

  apply(state) {
    const fact = Array.from(state.facts).find(f => f.startsWith('exterior('))
    if (!fact) return null

    const t = parseExteriorFact(fact)
    if (!t) return null

    const eq: LinearEquation = {
      left: angle(`∠${t.D}${t.A}${t.C}`),
      right: Add(
        angle(`∠${t.A}${t.B}${t.C}`),
        angle(`∠${t.B}${t.C}${t.A}`)
      ),
      origin: 'ExteriorAngle',
    }

    return {
      kind: 'geometric',
      rule: 'ExteriorAngle',
      description: `Ángulo exterior en ${t.A}: ∠${t.D}${t.A}${t.C} = ∠${t.A}${t.B}${t.C} + ∠${t.B}${t.C}${t.A}.`,
      produces: [eq],
    }
  },
}
