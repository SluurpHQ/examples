/**
 * A TypeScript module, served as JavaScript.
 *
 * Nothing compiled this: the browser asked for `greeting.ts` and the server
 * answered with the JavaScript underneath it. The types are erased, not
 * checked — checking is the editor's job and CI's, where it can fail loudly,
 * rather than the request path's, where all it could do is make the page slow.
 */

export interface Visitor {
  name: string;
  returning?: boolean;
}

type Greeting = `Hello, ${string}`;

export const enum Mood {
  Warm,
  Formal,
}

export function greet(visitor: Visitor, mood: Mood = Mood.Warm): Greeting {
  const opening = mood === Mood.Warm ? "Hello" : "Good day";
  const who = visitor.returning ? `${visitor.name} (again)` : visitor.name;
  return `${opening}, ${who}` as Greeting;
}

export const TYPED_AT: string = new Date().toISOString();
