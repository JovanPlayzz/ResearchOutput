import type { MetadataRoute } from "next";

// Lets phones add the portal to the home screen under its own name and icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StapL",
    short_name: "StapL",
    description: "A student portal for classes, announcements, calendar, grades, and to-dos.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4efe4",
    theme_color: "#f4efe4",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
