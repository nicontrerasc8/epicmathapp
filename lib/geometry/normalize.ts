import { LinearEquation } from './equation'
import { linearize } from './linearize'

export type NormalizedEquation = {
  coeffs: Map<string, number>
  constant: number
  origin: string
}

/**
 * Lleva una ecuación del tipo:
 *    izquierda = derecha
 * a la forma normalizada:
 *    Σ(ai·xi) + constant = 0
 */
export function normalize(eq: LinearEquation): NormalizedEquation {
  const L = linearize(eq.left)
  const R:any = linearize(eq.right)

  // Copiamos coeficientes de la izquierda
  const coeffs = new Map<string, number>(L.coeffs)

  // Restamos los coeficientes de la derecha
  for (const [v, c] of R.coeffs.entries()) {
    coeffs.set(v, (coeffs.get(v) ?? 0) - c)
  }

  // Constante final
  const constant = L.constant - R.constant

  return {
    coeffs,
    constant,
    origin: eq.origin,
  }
}
