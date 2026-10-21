/** An ordinary component, used the same way in a page or a client component. */
export function Title({ text }: { text: string }) {
  return <h1 className={text.length > 20 ? "title long" : "title"}>{text}</h1>;
}
