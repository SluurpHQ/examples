/** An ordinary component: the same in a page, a component or an island. */
export function Title({ text }: { text: string }) {
  return <h1 class={["title", { long: text.length > 20 }]}>{text}</h1>;
}
