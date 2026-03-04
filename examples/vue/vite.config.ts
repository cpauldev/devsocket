import vue from "@vitejs/plugin-vue";
import { example } from "example";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [example().vite(), vue()],
});
