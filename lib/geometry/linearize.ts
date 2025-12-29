import { Expr } from './expr'

export function linearize(expr: Expr): {
  coeffs: Map<string, number>
  constant: number
} {
  const coeffs = new Map<string, number>()
  let constant = 0

  function walk(e: Expr, factor = 1) {
    switch (e.kind) {
      case 'const':
        constant += factor * e.value
        break
      case 'var':
        coeffs.set(e.name, (coeffs.get(e.name) ?? 0) + factor)
        break
      case 'add':
        walk(e.left, factor)
        walk(e.right, factor)
        break
      case 'sub':
        walk(e.left, factor)
        walk(e.right, -factor)
        break
      case 'mul':
        walk(e.expr, factor * e.coeff)
        break
    }
  }

  walk(expr)
  return { coeffs, constant }
}
