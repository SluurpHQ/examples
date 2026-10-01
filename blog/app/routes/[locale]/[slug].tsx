import { Body, getEntries, getEntry } from "sluurp/content";
import { LANGS, Shell, date } from "../../shell.tsx";

export default async function Post({ params }: { params: Record<string, string> }) {
  const post = await getEntry("articles", params.slug, { locale: params.locale });
  if (!post) return <Shell locale={params.locale}><h1>Not found</h1></Shell>;
  const root = post._of || post.id;
  const family = await getEntries("articles", { filter: `id = "${root}" || _of = "${root}"` });
  const others = family.items.filter((p) => p.id !== post.id);
  const tags = String(post.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  return (
    <Shell locale={params.locale}>
      <article class="grid gap-4">
        <h1 class="text-3xl font-bold">{post.title}</h1>
        <p class="text-sm text-muted-foreground">
          {date(post._published, params.locale)}
          {others.map((o) => <> · <a href={`/${o._locale}/${o._slug}`} hreflang={o._locale}>{(LANGS as Record<string, string>)[o._locale] ?? o._locale}</a></>)}
        </p>
        <div class="grid gap-3 leading-relaxed [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3">{Body(post.body)}</div>
        <p class="flex gap-2 text-sm">{tags.map((t) => <a href={`/${params.locale}?tag=${encodeURIComponent(t)}`}>#{t}</a>)}</p>
      </article>
    </Shell>
  );
}
