// A wiki, and nothing else: the Pages plugin with its defaults. Everything about the pages (the tree, the editor,
// tables, covers, history, the book reader, the agent) is the plugin's; this file gives what every app must: its
// client, who is signed in, its words, its addresses and a header around the pages.
import { useState, type FormEvent } from "react"
import { createRoot } from "react-dom/client"
import { Sluurp } from "@sluurp/client"
import { createI18n } from "@sluurp/client/i18n"
import { signal } from "@sluurp/twist/signals"
import { useSignal } from "@sluurp/react"
import { configurePages, pagesTranslations, PagesScreen, PagesToolbar } from "@sluurp-plugins/pages/client/index.ts"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toaster } from "@/components/ui/sonner"
import own from "./i18n.json"

const sluurp = new Sluurp()
const i18n = createI18n({ table: { ...pagesTranslations, ...own, locales: own.locales }, storageKey: "wiki", appName: "Wiki" })
i18n.connect(sluurp)
const t = i18n.t

const me = signal<{ id: string } | null>(sluurp.authStore.isValid ? (sluurp.authStore.record as { id: string }) : null)
const hash = signal(location.hash)
addEventListener("hashchange", () => hash.set(location.hash))

configurePages({
  client: sluurp,
  me: () => me(),
  t: (key, vars) => t(key, vars),
  language: () => i18n.locale(),
  href: (route, what) => (what ? `#/${route}/${what}` : `#/${route}`),
  detail: () => decodeURIComponent(hash().replace(/^#\/pages\/?/, "")) || null,
  notify: (message, options) => toast.success(message, options?.undo ? { action: { label: t("pages.agent-undo"), onClick: options.undo } } : {}),
  complain: (error) => toast.error(String((error as { message?: string })?.message ?? error)),
  storageKey: "wiki",
})

function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [wrong, setWrong] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setWrong(false)
    try {
      me.set((await sluurp.collection("users").authWithPassword(email, password)).record as { id: string })
    } catch {
      setWrong(true)
    }
  }
  return (
    <div className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-sm p-6">
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-1">
            <h1 className="text-xl font-semibold">{t("wiki.sign-in")}</h1>
            <p className="text-sm text-muted-foreground">{t("wiki.sign-in-about")}</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">{t("wiki.email")}</Label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">{t("wiki.password")}</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {wrong ? <p className="text-sm text-destructive">{t("wiki.wrong")}</p> : null}
          <Button type="submit">{t("wiki.sign-in")}</Button>
        </form>
      </Card>
    </div>
  )
}

function Wiki() {
  if (!location.hash.startsWith("#/pages")) location.hash = "#/pages"
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
        <a href="#/pages" className="flex items-center gap-2 font-semibold">📚 {t("wiki.title")}</a>
        <span className="grow" />
        <PagesToolbar />
        <Button variant="ghost" size="sm" onClick={() => (sluurp.authStore.clear(), me.set(null))}>
          {t("wiki.sign-out")}
        </Button>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <PagesScreen />
      </main>
    </div>
  )
}

function App() {
  const [who] = useSignal(me)
  return (
    <>
      {who ? <Wiki /> : <SignIn />}
      <Toaster />
    </>
  )
}

createRoot(document.getElementById("app")!).render(<App />)
