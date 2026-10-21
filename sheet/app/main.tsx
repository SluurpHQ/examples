import { createRoot } from "react-dom/client"
import { Sheet } from "./sheet"

// Which sheet, and the name beside your pointer, from the address: `?sheet=plans&name=Ada`.
const params = new URLSearchParams(location.search)
createRoot(document.getElementById("app")!).render(
  <Sheet collection="cells" sheet={params.get("sheet") ?? "demo"} name={params.get("name") ?? undefined} resets={Number(params.get("resets")) || undefined} />,
)
