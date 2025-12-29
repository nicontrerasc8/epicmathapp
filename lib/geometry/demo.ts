import { GeometryEngine } from './engine'
import { Solver } from './solver'
import { GeometryState } from './state'

import { IsoscelesBaseAnglesRule } from './rules/isoscelesBaseAnglesRule'
import { AngleBisectorRule } from './rules/angleBisectorRule'
import { ExteriorAngleRule } from './rules/exteriorAngleRule'

const state: GeometryState = {
  equations: [],
  knownValues: new Map(),
  facts: new Set([
    'isosceles(A,B,C)',
    'bisectriz(A,B,C,D)',
    'exterior(A,B,C,E)',
  ]),
  steps: [],
}

const engine = new GeometryEngine(
  [IsoscelesBaseAnglesRule, AngleBisectorRule, ExteriorAngleRule],
  new Solver()
)

engine.run(state)

console.log('STEPS:')
console.log(state.steps.map(s => s.description))

console.log('EQUATIONS:')
console.log(state.equations)

console.log('KNOWN:')
console.log(Array.from(state.knownValues.entries()))
