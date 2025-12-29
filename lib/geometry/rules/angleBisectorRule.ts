import { Rule } from '../rule'
import { LinearEquation } from '../equation'
import { angle } from '../geometry'

function parseBisectorFact(fact: string) {
  if (!fact.startsWith('bisectriz(') || !fact.endsWith(')')) return null
  const inside = fact.slice('bisectriz('.length, -1)
  const [A, B, C, D] = inside.split(',').map(s => s.trim())
  if (!A || !B || !C || !D) return null
  return { A, B, C, D }
}

export const AngleBisectorRule: Rule = {
  name: 'AngleBisector',

  apply(state) {
    const fact = Array.from(state.facts).find(f => f.startsWith('bisectriz('))
    if (!fact) return null

    const t = parseBisectorFact(fact)
    if (!t) return null

    const eq: LinearEquation = {
      left: angle(`∠${t.B}${t.A}${t.D}`),
      right: angle(`∠${t.D}${t.A}${t.C}`),
      origin: 'AngleBisector',
    }

    return {
      kind: 'geometric',
      rule: 'AngleBisector',
      description: `AD es bisectriz de ∠${t.B}${t.A}${t.C} ⇒ ∠${t.B}${t.A}${t.D} = ∠${t.D}${t.A}${t.C}.`,
      produces: [eq],
    }
  },
}
