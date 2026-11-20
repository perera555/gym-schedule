import type { Metadata } from "next";
import ClientRoot from "@/components/ClientRoot";

export const metadata: Metadata = {
  title: "Admin · IronForge",
  description: "Manage members: add, edit, delete, attendance, backups and PDFs.",
};

export default function AdminPage() {
  return <ClientRoot section="admin" />;
}
