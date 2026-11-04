// The 512px app icon for store listings (Google Connected Apps): the same
// monogram as the favicon. Run from the repo root: node scripts/icon-512.mjs
import { readFile, writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og.js";
import React from "react";
const dir = process.cwd();
const font = await readFile(`${dir}/node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff`);
const s = 512;
const el = React.createElement("div", { style: { display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#e1261c", color: "#fcfbf8", fontFamily: "Archivo Black", fontSize: s * 0.56, letterSpacing: -s * 0.03, paddingTop: s * 0.04 } }, "J!");
const r = new ImageResponse(el, { width: s, height: s, fonts: [{ name: "Archivo Black", data: font, weight: 400 }] });
await writeFile(`${dir}/launch/google/icon-512.png`, Buffer.from(await r.arrayBuffer()));
