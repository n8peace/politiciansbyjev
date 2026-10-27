import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// The monogram: a red "J!" in the wordmark's face on the page's paper.
export async function mark(size: number, radius: number) {
  const archivo = await readFile(
    path.join(process.cwd(), "node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff"),
  );
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#e1261c",
          borderRadius: radius,
          color: "#fcfbf8",
          fontFamily: "Archivo Black",
          fontSize: size * 0.56,
          letterSpacing: -size * 0.03,
          paddingTop: size * 0.04,
        }}
      >
        J!
      </div>
    ),
    { width: size, height: size, fonts: [{ name: "Archivo Black", data: archivo, weight: 400, style: "normal" }] },
  );
}
