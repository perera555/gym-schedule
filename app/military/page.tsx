import type { Metadata } from "next";
import ClientRoot from "@/components/ClientRoot";

export const metadata: Metadata = {
  title: "Military Calisthenics 21 · IronForge",
  description: "A separate 21-day military-style bodyweight program with 3D exercise videos and a voice coach.",
};

export default function MilitaryPage() {
  return <ClientRoot section="military" />;
}
