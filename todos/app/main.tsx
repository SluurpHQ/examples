import { createRoot } from "react-dom/client"
import { Todos } from "./todos"

const resets = Number(new URLSearchParams(location.search).get("resets")) || undefined
createRoot(document.getElementById("app")!).render(<Todos resets={resets} />)
