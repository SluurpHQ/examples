import { getEntries } from "sluurp/content";
import { Shell, date } from "../../shell.tsx";

export default async function Posts({ params, query }: { params: Record<string, string>; query: Record<string, string> }) {
  const tag = query.tag ?? "";
  const posts = await getEntries("articles", { locale: params.locale, filter: tag ? `tags ~ ${JSON.stringify(tag)}` : "" });
  return (
    <Shell locale={params.locale}>
      <h1 class="text-3xl font-bold">{tag ? `#${tag}` : "Posts"}</h1>
      {posts.items.map((p) => (
        <article class="grid gap-1">
          <a href={`/${params.locale}/${p._slug}`} class="text-xl font-semibold">{p.title}</a>
          <p class="text-sm text-muted-foreground">{date(p._published, params.locale)}</p>
          <p>{p._seo?.description}</p>
        </article>
      ))}
    </Shell>
  );
}
