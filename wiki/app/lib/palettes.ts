const NICE: string[][] = [["69d2e7","a7dbd8","e0e4cc","f38630","fa6900"],["fe4365","fc9d9a","f9cdad","c8c8a9","83af9b"],["ecd078","d95b43","c02942","542437","53777a"],["556270","4ecdc4","c7f464","ff6b6b","c44d58"],["774f38","e08e79","f1d4af","ece5ce","c5e0dc"],["e8ddcb","cdb380","036564","033649","031634"],["490a3d","bd1550","e97f02","f8ca00","8a9b0f"],["594f4f","547980","45ada8","9de0ad","e5fcc2"],["00a0b0","6a4a3c","cc333f","eb6841","edc951"],["e94e77","d68189","c6a49a","c6e5d9","f4ead5"],["3fb8af","7fc7af","dad8a7","ff9e9d","ff3d7f"],["d9ceb2","948c75","d5ded9","7a6a53","99b2b7"],["ffffff","cbe86b","f2e9e1","1c140d","cbe86b"],["efffcd","dce9be","555152","2e2633","99173c"],["343838","005f6b","008c9e","00b4cc","00dffc"],["413e4a","73626e","b38184","f0b49e","f7e4be"],["ff4e50","fc913a","f9d423","ede574","e1f5c4"],["99b898","fecea8","ff847c","e84a5f","2a363b"],["655643","80bca3","f6f7bd","e6ac27","bf4d28"],["00a8c6","40c0cb","f9f2e7","aee239","8fbe00"],["351330","424254","64908a","e8caa4","cc2a41"],["554236","f77825","d3ce3d","f1efa5","60b99a"],["5d4157","838689","a8caba","cad7b2","ebe3aa"],["8c2318","5e8c6a","88a65e","bfb35a","f2c45a"],["fad089","ff9c5b","f5634a","ed303c","3b8183"],["ff4242","f4fad2","d4ee5e","e1edb9","f0f2eb"],["f8b195","f67280","c06c84","6c5b7b","355c7d"],["d1e751","ffffff","000000","4dbce9","26ade4"],["1b676b","519548","88c425","bef202","eafde6"],["5e412f","fcebb6","78c0a8","f07818","f0a830"],["bcbdac","cfbe27","f27435","f02475","3b2d38"],["452632","91204d","e4844a","e8bf56","e2f7ce"],["eee6ab","c5bc8e","696758","45484b","36393b"],["f0d8a8","3d1c00","86b8b1","f2d694","fa2a00"],["2a044a","0b2e59","0d6759","7ab317","a0c55f"],["f04155","ff823a","f2f26f","fff7bd","95cfb7"],["b9d7d9","668284","2a2829","493736","7b3b3b"],["bbbb88","ccc68d","eedd99","eec290","eeaa88"],["b3cc57","ecf081","ffbe40","ef746f","ab3e5b"],["a3a948","edb92e","f85931","ce1836","009989"],["300030","480048","601848","c04848","f07241"],["67917a","170409","b8af03","ccbf82","e33258"],["aab3ab","c4cbb7","ebefc9","eee0b7","e8caaf"],["e8d5b7","0e2430","fc3a51","f5b349","e8d5b9"],["ab526b","bca297","c5ceae","f0e2a4","f4ebc3"],["607848","789048","c0d860","f0f0d8","604848"],["b6d8c0","c8d9bf","dadabd","ecdbbc","fedcba"],["a8e6ce","dcedc2","ffd3b5","ffaaa6","ff8c94"],["3e4147","fffedf","dfba69","5a2e2e","2a2c31"],["fc354c","29221f","13747d","0abfbc","fcf7c5"]];

/** Sluurp's fifty liked palettes, as hex: `#rrggbb`. */
export const nicePalettes: string[][] = NICE.map((p) => p.map((c) => `#${c}`));

let own: string[][] = [];
let mixed = true;
let fallback: string[] | null = null;

/**
 * An app's say: its own palettes, whether Sluurp's stay beside them, and
 * its default — what shows before anybody chooses.
 */
export function configurePalettes(options: { own?: string[][]; mix?: boolean; default?: string[] }) {
  if (options.own) own = options.own.map((p) => p.map((c) => (c.startsWith("#") ? c : `#${c}`).toLowerCase()));
  if (options.mix !== undefined) mixed = options.mix;
  if (options.default) fallback = options.default;
}

/** Every palette on offer: the app's, then Sluurp's if it keeps them. */
export function palettes(): string[][] {
  return own.length && !mixed ? own : [...own, ...nicePalettes];
}

/** The app's default, if it named one. */
export const defaultPalette = (): string[] | null => fallback;

/**
 * A throw of the dice: a palette made, seven colours — or, one time in
 * five, one of those on offer, made up to seven — never `unlike` again.
 */
export function randomPalette(unlike?: string[], n = 7): string[] {
  for (let i = 0; i < 8; i++) {
    const all = palettes();
    const p = Math.random() < 0.2 && all.length ? completePalette(all[Math.floor(Math.random() * all.length)]!, n) : generatePalette(n);
    if (!unlike || p.join() !== unlike.join()) return p;
  }
  return generatePalette(n);
}

/* --------------------------------------------------------- generated
 *
 * Palettes made rather than chosen, as Coolors makes them — in OKLCH, where
 * equal steps look equal, and by the colour wheel's old rules:
 *
 * 1. a base hue, and the others placed by a harmony — analogous,
 *    complementary, split-complementary, triadic, tetradic;
 * 2. lightness spread from dark to light, so the colours are distinct in
 *    value as well as in hue, and read in grey;
 * 3. colourfulness kept moderate, higher in the middle lightnesses where a
 *    screen can show it and lower at the ends;
 * 4. every pair apart by a least distance in OKLab, so no two look alike.
 */

type Lch = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** `#rrggbb` as OKLab. */
export function oklab(hex: string): [number, number, number] {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return [0, 0, 0];
  const [r, g, b] = [m[1]!, m[2]!, m[3]!].map((x) => toLinear(parseInt(x, 16) / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s,
  ];
}

const toLch = ([L, a, b]: [number, number, number]): Lch => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];

/** `oklch(0.49 0.24 264)` as `#rrggbb`; anything else as it is. */
export function hexOfOklch(css: string): string {
  const m = css.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return css;
  return hexOf([Number(m[1]) / (m[2] ? 100 : 1), Number(m[3]), Number(m[4])]);
}

/** OKLCH as `#rrggbb`, its colourfulness lowered until the screen can show it. */
function hexOf([L, C, H]: Lch): string {
  // Down to no colour at all, which every lightness has, rather than stopping short of it.
  for (let c = C; c > -0.005; c -= 0.005) {
    c = Math.max(0, c);
    const a = c * Math.cos((H * Math.PI) / 180);
    const b = c * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    if (rgb.every((v) => v >= -0.0001 && v <= 1.0001)) {
      return `#${rgb.map((v) => Math.round(Math.max(0, Math.min(1, fromLinear(v))) * 255).toString(16).padStart(2, "0")).join("")}`;
    }
  }
  return "#808080";
}

/** How far apart two colours look: OKLab distance, ×100. */
export const distance = (a: string, b: string) => {
  const [x, y] = [oklab(a), oklab(b)];
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

/** The least distance any two colours of a palette keep. */
const APART = 12;

const HARMONIES: Record<string, number[]> = {
  analogous: [0, 30, -30, 60, -60, 15, -15],
  complementary: [0, 180, 20, 200, -20, 160, 0],
  split: [0, 150, 210, 30, 180, -30, 0],
  triadic: [0, 120, 240, 20, 140, 260, 0],
  tetradic: [0, 90, 180, 270, 45, 225, 0],
};

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const shuffle = <T>(list: T[]) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
};

/** Colourfulness for a lightness: most in the middle, where a screen has it. */
const chromaFor = (L: number, peak: number) => peak * (1 - Math.abs(L - 0.62) * 1.4);

/**
 * A palette made to be nice: `n` colours around a hue — random unless
 * given — by one of the wheel's harmonies, dark to light, every pair apart.
 */
export function generatePalette(n = 7, hue = rand(0, 360)): string[] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const scheme = HARMONIES[Object.keys(HARMONIES)[Math.floor(Math.random() * 5)]!]!;
    const peak = rand(0.1, 0.17);
    // Lightness spread evenly from dark to light, then jittered a little.
    const lights = Array.from({ length: n }, (_, i) => 0.3 + (0.62 * i) / Math.max(1, n - 1) + rand(-0.03, 0.03));
    const hues = shuffle(Array.from({ length: n }, (_, i) => hue + scheme[i % scheme.length]! + rand(-8, 8)));
    const out = lights.map((L, i) => hexOf([L, chromaFor(L, peak), (hues[i]! + 360) % 360]));
    if (out.every((a, i) => out.every((b, j) => i === j || distance(a, b) >= APART))) return out;
  }
  return generatePalette(n, rand(0, 360));
}

/**
 * One colour of a palette recreated — a throw of that colour's dice: at
 * about its lightness, so the palette keeps its range, in a hue the others
 * agree with, apart from every one of them.
 */
export function rerollColour(palette: string[], index: number): string {
  const others = palette.filter((_, i) => i !== index);
  const [L] = toLch(oklab(palette[index]!));
  const hues = others.map((c) => toLch(oklab(c))).filter(([, c]) => c > 0.03).map(([, , h]) => h);
  const base = hues.length ? hues[Math.floor(Math.random() * hues.length)]! : rand(0, 360);
  const offsets = [30, -30, 150, 180, 210, 120, -120, 60, -60];
  for (let attempt = 0; attempt < 60; attempt++) {
    const H = (base + offsets[Math.floor(Math.random() * offsets.length)]! + rand(-10, 10) + 360) % 360;
    const light = Math.max(0.25, Math.min(0.95, L + rand(-0.06, 0.06)));
    const c = hexOf([light, chromaFor(light, rand(0.09, 0.17)), H]);
    if (c !== palette[index] && others.every((o) => distance(o, c) >= APART)) return c;
  }
  return hexOf([L, chromaFor(L, 0.14), rand(0, 360)]);
}

/**
 * A palette made up to `n` colours: those given — any two too alike, the
 * later dropped — then others from the harmony of the most colourful one,
 * its complement first, across the lightnesses the given ones leave empty.
 */
export function completePalette(colours: string[], n = 7): string[] {
  const kept: string[] = [];
  for (const c of colours) if (kept.length < n && kept.every((k) => distance(k, c) >= APART)) kept.push(c);
  if (kept.length >= n) return kept;
  // The same colours are always made up to the same palette: its dice seeded
  // by what it was given, so a page re-rendered keeps its colours.
  let seed = [...kept.join("")].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const rand = (lo: number, hi: number) => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return lo + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (hi - lo);
  };
  const lch = kept.map((c) => toLch(oklab(c)));
  const lead = lch.reduce((best, x) => (x[1] > best[1] ? x : best), lch[0] ?? [0.6, 0.12, rand(0, 360)]);
  const around = [180, 150, 210, 30, -30, 120, 240, 90, 270];
  const peak = Math.max(0.09, Math.min(0.16, lead[1] || 0.12));
  for (let i = 0, tries = 0; kept.length < n && tries < 200; tries++) {
    // The lightness furthest from those already there.
    const taken = kept.map((c) => toLch(oklab(c))[0]);
    let L = 0.5;
    let far = -1;
    for (let x = 0.28; x <= 0.93; x += 0.05) {
      const d = Math.min(...taken.map((t) => Math.abs(t - x)), 1);
      if (d > far) (far = d), (L = x);
    }
    const H = (lead[2] + around[i % around.length]! + rand(-8, 8) + 360) % 360;
    const c = hexOf([L + rand(-0.02, 0.02), chromaFor(L, peak), H]);
    if (kept.every((k) => distance(k, c) >= APART)) kept.push(c);
    i++;
  }
  return kept;
}

/* ---------------------------------------------------------------- theme
 *
 * A palette as a whole theme, light and dark: the tokens every kit
 * component is rendered with. What hand-made themes do, done from colours
 * rather than picked from a list —
 *
 * - the neutrals (background, card, muted, border…) are near-grey, tinted
 *   faintly towards the palette's lead hue, as stone or zinc themes are;
 * - primary is the lead colour, its lightness moved until its label reads
 *   at 4.5 to 1 — white on it in light mode, near-black in dark;
 * - ring and the sidebar's primary follow it; chart-1…5 are the palette's
 *   colours at a lightness that reads on the background.
 */

/** A theme's tokens, by their names without the `--`, as `#rrggbb`. */
export type PaletteTheme = Record<string, string>;

const luminance = (hex: string) => {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return 0;
  const [r, g, b] = [m[1]!, m[2]!, m[3]!].map((x) => toLinear(parseInt(x, 16) / 255)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast of two colours, 1 to 21. */
export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

/** The palette's lead: its most colourful colour, or the one asked for. */
function leadOf(palette: string[], at?: number): Lch {
  const lch = palette.map((c) => toLch(oklab(c)));
  if (at != null && lch[at]) return lch[at];
  return lch.reduce((best, x) => (x[1] > best[1] ? x : best), lch[0] ?? [0.55, 0, 250]);
}

/** A colour moved in lightness, one way, until it reads against `on` at `ratio`. */
function readableOn([L, C, H]: Lch, on: string, ratio: number, darker: boolean): string {
  for (let l = L; l > 0.05 && l < 0.98; l += darker ? -0.01 : 0.01) {
    const c = hexOf([l, C, H]);
    if (contrast(c, on) >= ratio) return c;
  }
  return darker ? "#000000" : "#ffffff";
}

/** The theme a palette makes, for light or dark; `at` picks its lead colour. */
export function paletteTheme(palette: string[], mode: "light" | "dark", at?: number): PaletteTheme {
  const [lL, lC, h] = leadOf(palette, at);
  const tint = lC > 0.03 ? 1 : 0;
  const n = (L: number, c = 0.006) => hexOf([L, c * tint, h]);
  const dark = mode === "dark";
  const t: PaletteTheme = dark
    ? { background: n(0.16, 0.008), foreground: n(0.97, 0.004), card: n(0.2, 0.01), popover: n(0.2, 0.01), secondary: n(0.27, 0.012), muted: n(0.27, 0.012), accent: n(0.29, 0.014), "muted-foreground": n(0.72, 0.012), border: n(0.3, 0.012), input: n(0.34, 0.012), sidebar: n(0.2, 0.01), "sidebar-accent": n(0.27, 0.014), "sidebar-border": n(0.3, 0.012) }
    : { background: n(0.995, 0.003), foreground: n(0.17, 0.01), card: n(0.995, 0.003), popover: n(0.995, 0.003), secondary: n(0.96, 0.01), muted: n(0.96, 0.01), accent: n(0.95, 0.014), "muted-foreground": n(0.5, 0.014), border: n(0.91, 0.01), input: n(0.91, 0.01), sidebar: n(0.975, 0.006), "sidebar-accent": n(0.94, 0.014), "sidebar-border": n(0.91, 0.01) };
  for (const k of ["card", "popover", "secondary", "accent", "sidebar", "sidebar-accent"]) t[`${k}-foreground`] = t.foreground!;
  // Primary: the lead colour, as colourful as it is, only as light or dark as its label needs.
  const label = dark ? t.background! : "#ffffff";
  t.primary = readableOn([dark ? Math.max(lL, 0.7) : Math.min(lL, 0.6), Math.max(lC, 0.04 * tint), h], label, 4.5, !dark);
  t["primary-foreground"] = label;
  t.ring = t.primary;
  t["sidebar-primary"] = t.primary;
  t["sidebar-primary-foreground"] = label;
  t["sidebar-ring"] = t.primary;
  // Charts: each of the palette's colours, most colourful first, readable as a mark on the background.
  const marks = palette.map((c) => toLch(oklab(c))).sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < 5; i++) {
    const [L, C, H] = marks[i % Math.max(1, marks.length)] ?? [0.6, 0.12, (h + 72 * i) % 360];
    t[`chart-${i + 1}`] = readableOn([dark ? Math.max(L, 0.62) : Math.min(L, 0.72), C, H], t.background!, 3, !dark);
  }
  return t;
}

/** Which theme tokens each of a palette's colours makes (see `paletteTheme`), by index. */
export function paletteUses(palette: string[], at?: number): string[][] {
  const lch = palette.map((c) => toLch(oklab(c)));
  const lead = at != null && lch[at] ? at : lch.reduce((best, x, i) => (x[1] > lch[best]![1] ? i : best), 0);
  const uses: string[][] = palette.map(() => []);
  if (palette.length) uses[lead]!.push("primary", "ring", "sidebar-primary", "background tint");
  const byColour = lch.map((x, i) => [x[1], i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < 5 && k < byColour.length; k++) uses[byColour[k]![1]]!.push(`chart-${k + 1}`);
  return uses;
}

/** `#rrggbb` as an `H S% L%` triplet: its hue and saturation, to build near colours from. */
export function hslTriplet(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "0 0% 0%";
  const [r, g, b] = [m[1]!, m[2]!, m[3]!].map((x) => parseInt(x, 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d) hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const f = (v: number) => Math.round(v * 10) / 10;
  return `${f((hue * 60 + 360) % 360)} ${f(s * 100)}% ${f(l * 100)}%`;
}

/** Both themes as CSS — `:root` and `.dark`, in `oklch()` — to paste into another project using the same tokens. */
export function paletteCss(palette: string[], at?: number): string {
  const block = (sel: string, t: PaletteTheme) =>
    `${sel} {\n${Object.entries(t)
      .map(([k, v]) => {
        const [L, C, H] = toLch(oklab(v));
        return `  --${k}: oklch(${L.toFixed(3)} ${C.toFixed(3)} ${C < 0.002 ? 0 : H.toFixed(1)});`;
      })
      .join("\n")}\n}`;
  return `${block(":root", { radius: "", ...paletteTheme(palette, "light", at) }).replace("  --radius: oklch(0.000 0.000 0);", "  --radius: 0.625rem;")}\n\n${block(".dark", paletteTheme(palette, "dark", at))}\n`;
}

/** Where on a vibrancy slider, 0 to 100, a palette is as it was chosen. */
export const AS_CHOSEN = 75;

/**
 * A palette at a vibrancy, 0 to 100, as a vibrancy slider shows it: grey at
 * 0, each colour at its own lightness; pastel at 40 — light, softly
 * coloured; as chosen at 75; and at 100 as colourful as a screen shows at
 * each colour's own lightness — darkened, a yellow turns to mud. Hues are
 * kept all the way.
 */
export function vibrant(palette: string[], at: number): string[] {
  if (at === AS_CHOSEN) return palette;
  const mix = (a: number, b: number, s: number) => a + (b - a) * s;
  return palette.map((c) => {
    const [L, C, H] = toLch(oklab(c));
    const pastel: [number, number] = [mix(L, 0.87, 0.75), Math.min(C, 0.07)];
    let l: number;
    let ch: number;
    if (at <= 40) {
      const s = at / 40;
      [l, ch] = [mix(L, pastel[0], s), pastel[1] * s];
    } else if (at <= AS_CHOSEN) {
      const s = (at - 40) / (AS_CHOSEN - 40);
      [l, ch] = [mix(pastel[0], L, s), mix(pastel[1], C, s)];
    } else {
      const s = (at - AS_CHOSEN) / (100 - AS_CHOSEN);
      [l, ch] = [L, mix(C, Math.max(C * 1.6, 0.2), s)];
    }
    return hexOf([l, ch, H]);
  });
}

/** A saturation slider's top: 0 greys, 100 as vivid as it goes. */
export const SATURATION_MAX = 100;
/** Where on it a palette is as chosen: past it, up to two-thirds as vivid again. */
export const SATURATION_CHOSEN = 60;

/**
 * A palette at a saturation, 0 to SATURATION_MAX: greys at 0, each colour at
 * its own lightness; as chosen at SATURATION_CHOSEN; more vivid beyond, as far as a screen shows.
 */
export function saturate(palette: string[], at: number): string[] {
  if (at === SATURATION_CHOSEN) return palette;
  const s = Math.max(0, Math.min(SATURATION_MAX, at)) / SATURATION_CHOSEN;
  return palette.map((c) => {
    const [L, C, H] = toLch(oklab(c));
    return hexOf([L, C * s, H]);
  });
}

/** The track of a saturation slider: its lead colour from grey to as chosen. */
export function saturationTrack(palette: string[], at?: number): string {
  const lead = [palette[at ?? -1] ?? palette.reduce((best, c) => (toLch(oklab(c))[1] > toLch(oklab(best))[1] ? c : best), palette[0] ?? "#888888")];
  const chosen = (SATURATION_CHOSEN / SATURATION_MAX) * 100;
  return `linear-gradient(to right, ${saturate(lead, 0)[0]}, ${lead[0]} ${chosen}%, ${saturate(lead, SATURATION_MAX)[0]})`;
}

/** The track of a vibrancy slider for a palette: its lead colour from grey, through pastel, to vivid. */
export function vibrancyTrack(palette: string[], at?: number): string {
  const lead = [palette[at ?? -1] ?? palette.reduce((best, c) => (toLch(oklab(c))[1] > toLch(oklab(best))[1] ? c : best), palette[0] ?? "#888888")];
  const stops = [0, 20, 40, 60, AS_CHOSEN, 100].map((v) => `${vibrant(lead, v)[0]} ${v}%`);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

/**
 * The colours in some words, up to twelve, each once, as `#rrggbb` — from
 * whatever a palette site gives to copy:
 *
 * Coolors — `coolors.co/palette/264653-2a9d8f-…`, and its CSS, SCSS,
 * Tailwind and array exports — or hex codes, `rgb()` and `hsl()` anywhere.
 */
export function hexes(text: string): string[] {
  const out: string[] = [];
  const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
  {
    const found: [number, string][] = [];
    for (const m of text.matchAll(/(?:^|[^0-9a-z])#?([0-9a-f]{6})(?:[0-9a-f]{2})?(?![0-9a-z])/gi)) found.push([m.index!, `#${m[1]!.toLowerCase()}`]);
    for (const m of text.matchAll(/#([0-9a-f])([0-9a-f])([0-9a-f])(?![0-9a-z])/gi)) found.push([m.index!, `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toLowerCase()]);
    for (const m of text.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)) found.push([m.index!, hex(+m[1]!, +m[2]!, +m[3]!)]);
    for (const m of text.matchAll(/hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/gi)) {
      const [h, sat, l] = [+m[1]!, +m[2]! / 100, +m[3]! / 100];
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return 255 * (l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
      };
      found.push([m.index!, hex(f(0), f(8), f(4))]);
    }
    // In the order they were written, which is the palette's order.
    out.push(...found.sort((a, b) => a[0] - b[0]).map(([, c]) => c));
  }
  return [...new Set(out)].slice(0, 12);
}

/** The colours in some words, as `hexes` finds them. */
export async function paletteFrom(text: string): Promise<string[]> {
  return hexes(text);
}
