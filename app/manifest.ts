import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

// Lets phones save the shop to the home screen with the right name, icon and colours.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Thriftesque",
    short_name: "Thriftesque",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "browser",
    background_color: "#f4f7fb", // token-ok: --color-bg
    theme_color: "#d6f84c", // token-ok: --color-lime
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
