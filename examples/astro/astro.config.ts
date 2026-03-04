import { defineConfig } from "astro/config";
import { example } from "example";

export default defineConfig({
  integrations: [example().astro()],
});
