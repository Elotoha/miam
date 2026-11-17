import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: { alias: { "~": new URL("./app", import.meta.url).pathname } },
  plugins: [
    cloudflare({ configPath: process.env.MIAM_WRANGLER_CONFIG, viteEnvironment: { name: "ssr" } }),
    reactRouter(),
    tailwindcss(),
  ],
});
