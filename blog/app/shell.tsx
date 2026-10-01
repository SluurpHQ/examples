export const LANGS = { en: "English", fr: "Français" } as const;

export const Shell = ({ locale, children }: { locale: string; children?: unknown }) => (
  <div class="mx-auto grid max-w-2xl gap-8 px-4 py-10">
    <header class="flex items-baseline gap-4">
      <a href={`/${locale}`} class="text-lg font-semibold">Blog</a>
      <nav class="ml-auto flex gap-3 text-sm text-muted-foreground">
        {Object.entries(LANGS).map(([l, name]) => <a href={`/${l}`} aria-current={l === locale ? "page" : undefined}>{name}</a>)}
        <a href={`/${locale}/feed.xml`}>Feed</a>
      </nav>
    </header>
    <main class="grid gap-6">{children}</main>
  </div>
);

const MONTHS: Record<string, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
};

export const date = (at: unknown, locale: string) => {
  if (!at) return "";
  const d = new Date(String(at));
  const month = (MONTHS[locale] ?? MONTHS.en)[d.getUTCMonth()];
  return locale === "fr" ? `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}` : `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};
