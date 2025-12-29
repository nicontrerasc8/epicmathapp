import { GeometryState, Step } from './state'

export type Rule = {
  name: string
  apply(state: GeometryState): Step | null
}
