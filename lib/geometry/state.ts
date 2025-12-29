import { LinearEquation } from './equation'

export type Step = {
  kind: 'given' | 'geometric' | 'algebra' | 'conclusion'
  rule: string
  description: string
  produces?: LinearEquation[]
}

export type GeometryState = {
  equations: LinearEquation[]
  knownValues: Map<string, number>
  facts: Set<string>
  steps: Step[]
}
