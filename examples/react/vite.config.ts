import react from "@vitejs/plugin-react";
import { example } from "example";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [example().vite(), react()],
});
