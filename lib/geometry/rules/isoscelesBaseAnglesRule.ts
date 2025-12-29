import { Rule } from '../rule'
import { LinearEquation } from '../equation'
import { angle } from '../geometry'

function parseIsoscelesFact(fact: string): { A: string; B: string; C: string } | null {
  if (!fact.startsWith('isosceles(') || !fact.endsWith(')')) return null
  const inside = fact.slice('isosceles('.length, -1)
  const parts = inside.split(',').map(s => s.trim())
  if (parts.length !== 3) return null
  return { A: parts[0], B: parts[1], C: parts[2] }
}

export const IsoscelesBaseAnglesRule: Rule = {
  name: 'IsoscelesBaseAngles',

  apply(state) {
    const isoFact = Array.from(state.facts).find(f => f.startsWith('isosceles('))
    if (!isoFact) return null
    const t = parseIsoscelesFact(isoFact)
    if (!t) return null

    const eq: LinearEquation = {
      left: angle(`∠${t.A}${t.B}${t.C}`),
      right: angle(`∠${t.B}${t.C}${t.A}`),
      origin: 'IsoscelesBaseAngles',
    }

    return {
      kind: 'geometric',
      rule: 'IsoscelesBaseAngles',
      description: `Triángulo isósceles ${t.A}${t.B}${t.C} (AB = AC) ⇒ ángulos de la base iguales: ∠${t.A}${t.B}${t.C} = ∠${t.B}${t.C}${t.A}.`,
      produces: [eq],
    }
  },
}
