import { example } from "example";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [example().vite(), solid()],
});
