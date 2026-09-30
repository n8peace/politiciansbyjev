import Pile from "@/app/components/Pile";
import { politicians, faceSrc } from "@/lib/politicians";

export default function Home() {
  const faces = politicians.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    img: faceSrc(p.id),
  }));
  return <Pile faces={faces} />;
}
