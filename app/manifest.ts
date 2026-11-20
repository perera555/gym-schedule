import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IronForge Gym Schedule",
    short_name: "IronForge",
    description: "Membership, 3-month gym phases, attendance and the Military Calisthenics 21 program with 3D workout videos.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#050810",
    theme_color: "#050810",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's workout", url: "/", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Military Calisthenics 21", short_name: "Military 21", url: "/military", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
