// Construit DalotPro en une page HTML autonome : node standalone/build.mjs <sortie.html>
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = process.argv[2] ?? path.join(here, "dist", "dalotpro.html");

const js = await build({
  entryPoints: [path.join(here, "app.tsx")],
  bundle: true, minify: true, write: false, format: "iife", target: "es2020", jsx: "automatic",
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
});
const cssSrc = readFileSync(path.join(here, "styles.css"), "utf8");
const css = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(cssSrc, { from: path.join(here, "styles.css") });

const html = `<title>DalotPro</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Calcul des dalots cadres — BAEL 91 mod. 99, Fascicule 61 titre II, contrôle Eurocode 2. Auteur : Moulo Jean Claude.">
<style>
/* Thème clair assumé (plans et notes sur fond blanc) : fond et couleurs posés explicitement. */
:root { --fond: #f8fafc; --texte: #0f172a; color-scheme: light; }
html, body { height: 100%; }
body { background: var(--fond); color: var(--texte); font-family: Arial, Helvetica, sans-serif; }
#dalotpro { min-height: 100%; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
${css.css}
</style>
<div id="dalotpro"></div>
<script>${js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>
`;
writeFileSync(out, html);
console.log(`${out} : ${(html.length / 1024).toFixed(0)} Ko`);
