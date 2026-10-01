// Generics — purely type-level, so they simply go.
export function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export class Box<T extends object> {
  constructor(private readonly value: T) {}
  get(): T { return this.value; }
}

// An enum is real code, so it is lowered rather than dropped.
export enum Level { Low = 1, High = 4 }
export const enum Inlined { A, B }
export function pick(l: Level): string { return l === Level.High ? "high" : "low"; }
export const inlined = Inlined.B;

// Namespaces are real code too.
export namespace Units {
  export const metre = 1;
  export function scale(n: number): number { return n * metre; }
}

// Parameter properties: `private name` declares AND assigns.
export class Person {
  constructor(public name: string, private age: number = 0) {}
  older(): number { return this.age + 1; }
}

// Overloads collapse to the implementation.
export function len(x: string): number;
export function len(x: unknown[]): number;
export function len(x: string | unknown[]): number { return x.length; }

// Abstract members, satisfies, non-null, definite assignment, accessors.
export abstract class Shape { abstract area(): number; }
export const config = { port: 8080 } satisfies Record<string, number>;
export function must(x: string | null): string { return x!; }
