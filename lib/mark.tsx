import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The "J!" mark for the favicon and home-screen icon.
export async function Mark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#e1261c",
        borderRadius: size >= 64 ? 0 : size * 0.22,
        color: "white",
        fontFamily: "Archivo Black",
        fontSize: size * 0.62,
        letterSpacing: -size * 0.03,
        paddingBottom: size * 0.04,
      }}
    >
      J!
    </div>
  );
}

export const markFont = async () => [
  {
    name: "Archivo Black",
    data: await readFile(join(process.cwd(), "assets", "ArchivoBlack-Regular.ttf")),
    weight: 400 as const,
    style: "normal" as const,
  },
];
