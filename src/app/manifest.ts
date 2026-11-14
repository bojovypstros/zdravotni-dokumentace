import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zdravotní dokumentace",
    short_name: "Zdraví",
    description:
      "Osobní zdravotní záznamník — lokální evidence, ne zdravotnický prostředek.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "cs",
    dir: "ltr",
    background_color: "#F3F6F9",
    theme_color: "#167c80",
    categories: ["health", "medical"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
