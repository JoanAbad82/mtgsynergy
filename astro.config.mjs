import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import preact from "@astrojs/preact";

export default defineConfig({
  output: "static",
  outDir: "./dist",
  integrations: [mdx(), preact()],
});
