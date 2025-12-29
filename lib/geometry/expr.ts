export type Expr =
  | { kind: 'const'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'add'; left: Expr; right: Expr }
  | { kind: 'sub'; left: Expr; right: Expr }
  | { kind: 'mul'; coeff: number; expr: Expr }

export const C = (v: number): Expr => ({ kind: 'const', value: v })
export const V = (n: string): Expr => ({ kind: 'var', name: n })
export const Add = (a: Expr, b: Expr): Expr => ({ kind: 'add', left: a, right: b })
export const Sub = (a: Expr, b: Expr): Expr => ({ kind: 'sub', left: a, right: b })
export const Mul = (k: number, e: Expr): Expr => ({ kind: 'mul', coeff: k, expr: e })
