/**
 * A wiki, and nothing else: Sluurp's pages with the defaults.
 *
 * The whole app is this file. Everything a page is — the tree, the editor,
 * the tables, covers, history, the book reader, the agent — is
 * `sluurp/pages`; what is here is what any app has to say for itself: its
 * client, who is signed in, its words, its addresses and a header to put
 * the pages in. No presets are given, so who reads a page is everyone
 * signed in, and who edits it is its own people.
 */

import { Sluurp } from "sluurp";
import { computed, signal } from "sluurp/reactive";
import { mount } from "sluurp/ui";
import { createI18n } from "sluurp/i18n";
import { Button } from "sluurp/kit/button.js";
import { Card } from "sluurp/kit/card.js";
import { Input } from "sluurp/kit/input.js";
import { Label } from "sluurp/kit/label.js";
import { Toaster, toast } from "sluurp/kit/sonner.js";
import { configurePages, PagesScreen } from "sluurp/pages";
import pagesWords from "sluurp/pages/words.json" with { type: "json" };
import own from "./i18n.json" with { type: "json" };

const sluurp = new Sluurp();
const i18n = createI18n({ table: { ...pagesWords, ...own, locales: own.locales }, storageKey: "wiki", appName: "Wiki" });
i18n.connect?.(sluurp);
const t = i18n.t;

/** Whoever is signed in. */
const me = signal<{ id: string } | null>(sluurp.authStore.isValid ? sluurp.authStore.record : null);

/** `#/pages/<detail>`: the one route there is. */
const hash = signal(location.hash);
addEventListener("hashchange", () => hash.set(location.hash));
const detail = computed(() => decodeURIComponent(hash().replace(/^#\/pages\/?/, "")) || null);
const href = (route: string, what?: string | null) => (what ? `#/${route}/${what}` : `#/${route}`);

configurePages({
  client: sluurp,
  me: () => me(),
  t: (key, vars) => t(key, vars),
  language: () => i18n.locale(),
  href,
  detail: () => detail(),
  notify: (message, options) =>
    toast.success(message, options?.undo ? { action: { label: t("pages.agent-undo"), onClick: options.undo } } : {}),
  complain: (error) => toast.error(String((error as { message?: string })?.message ?? error)),
  storageKey: "wiki",
});

function SignIn() {
  const email = signal("");
  const password = signal("");
  const wrong = signal(false);
  const submit = async (e: Event) => {
    e.preventDefault();
    wrong.set(false);
    try {
      const got = await sluurp.collection("users").authWithPassword(email(), password());
      me.set(got.record as { id: string });
    } catch {
      wrong.set(true);
    }
  };
  return (
    <div class="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-sm p-6">
        <form class="grid gap-4" onSubmit={submit}>
          <div class="grid gap-1">
            <h1 class="text-xl font-semibold">{t("wiki.sign-in")}</h1>
            <p class="text-sm text-muted-foreground">{t("wiki.sign-in-about")}</p>
          </div>
          <div class="grid gap-1.5">
            <Label for="email">{t("wiki.email")}</Label>
            <Input id="email" type="email" autocomplete="username" value={email} onInput={(e: Event) => email.set((e.target as HTMLInputElement).value)} />
          </div>
          <div class="grid gap-1.5">
            <Label for="password">{t("wiki.password")}</Label>
            <Input id="password" type="password" autocomplete="current-password" value={password} onInput={(e: Event) => password.set((e.target as HTMLInputElement).value)} />
          </div>
          {() => (wrong() ? <p class="text-sm text-destructive">{t("wiki.wrong")}</p> : "")}
          <Button type="submit">{t("wiki.sign-in")}</Button>
        </form>
      </Card>
    </div>
  );
}

function Wiki() {
  if (!location.hash.startsWith("#/pages")) location.hash = "#/pages";
  const { view, toolbar } = PagesScreen();
  return (
    <div class="min-h-svh">
      <header class="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
        <a href="#/pages" class="flex items-center gap-2 font-semibold">📚 {t("wiki.title")}</a>
        <span class="grow"></span>
        {toolbar()}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            sluurp.authStore.clear();
            me.set(null);
          }}
        >
          {t("wiki.sign-out")}
        </Button>
      </header>
      <main class="mx-auto w-full max-w-6xl p-4 md:p-8">{view()}</main>
    </div>
  );
}

mount(
  document.getElementById("app")!,
  () => (
    <>
      {() => (me() ? Wiki() : SignIn())}
      {Toaster().view()}
    </>
  ),
);
