import { sveltekit } from "@sveltejs/kit/vite";
import { example } from "example";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [example().vite(), sveltekit()],
  server: {
    fs: {
      allow: ["../shared/ui/src", "../../packages/example/dist"],
    },
  },
});
