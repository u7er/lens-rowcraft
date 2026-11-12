import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import path from "node:path";

const output = process.argv[2] ?? "preview.html";
const js = await build({ entryPoints: ["preview/index.tsx"], bundle: true, write: false, minify: true, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
const css = await build({ entryPoints: ["src/editor-styles.ts"], bundle: true, write: false, format: "esm" });
const { editorCss } = await import(`data:text/javascript;base64,${Buffer.from(css.outputFiles[0].text).toString("base64")}`);
const tokens = { textColorPrimary: "lwr-text", textColorSecondary: "lwr-muted", contentColor: "lwr-surface", mainBackground: "lwr-fill", borderColor: "lwr-border", primary: "lwr-accent", tableBgcSelected: "lwr-hover", colorOk: "lwr-ok", colorError: "lwr-error" };
const themed = editorCss.replace(/--(textColorPrimary|textColorSecondary|contentColor|mainBackground|borderColor|primary|tableBgcSelected|colorOk|colorError)\b/g, (_, token) => `--${tokens[token]}`);
const template = await readFile("preview/fragment.html", "utf8");
const fragment = template.replace("<!--editor-css-->", `<style>${themed}</style>`).replace("<!--editor-script-->", `<script>${js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>`);
await writeFile(output, fragment);
console.log(pathToFileURL(path.resolve(output)).href, `${Buffer.byteLength(fragment)} bytes`);
