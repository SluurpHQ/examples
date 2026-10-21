let loading: Promise<any> | null = null

/** The font files pdfmake has, by name, base64: `Roboto-Regular.ttf` and the rest. */
export const fontFiles: Record<string, string> = {}

/** pdfmake with its fonts, loaded once. */
export function pdfmake(): Promise<any> {
  loading ??= (async () => {
    const [made, fonts] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")])
    const pdf = (made as any).default ?? made
    const vfs = (fonts as any).default ?? fonts
    Object.assign(fontFiles, vfs)
    pdf.addVirtualFileSystem(vfs)
    return pdf
  })()
  return loading
}

/**
 * A font of the app's own, from a URL: `await addFont("Inter", { normal: "/fonts/Inter.ttf", bold:
 * "/fonts/Inter-Bold.ttf" })`, then `defaultStyle: { font: "Inter" }`. Roboto stays.
 */
export async function addFont(name: string, faces: { normal: string; bold?: string; italics?: string; bolditalics?: string }) {
  const pdf = await pdfmake()
  const files: Record<string, string> = {}
  const family: Record<string, string> = {}
  for (const [face, url] of Object.entries(faces)) {
    if (!url) continue
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
    let binary = ""
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    const file = `${name}-${face}.ttf`
    files[file] = btoa(binary)
    family[face] = file
  }
  pdf.addVirtualFileSystem(files)
  pdf.fonts = { ...(pdf.fonts ?? {}), [name]: { normal: family.normal, bold: family.bold ?? family.normal, italics: family.italics ?? family.normal, bolditalics: family.bolditalics ?? family.bold ?? family.normal } }
}

/** A title as a file name any system accepts: `Invoice 2026/01` → `Invoice 2026-01.pdf`. */
export function fileName(title: string) {
  return `${title.replace(/[\\/:*?"<>|]+/g, "-").trim() || "document"}.pdf`
}
