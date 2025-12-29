import { Expr } from './expr'

export type LinearEquation = {
  left: Expr
  right: Expr
  origin: string // nombre de la regla / fuente
}
