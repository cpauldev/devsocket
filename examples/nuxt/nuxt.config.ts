import { example } from "example";

export default defineNuxtConfig({
  ssr: false,
  modules: ["nuxt-lucide-icons", example().nuxt()],
  css: ["example-ui/layout.css", "universa-ui/styles.css"],
  build: {
    transpile: ["example-ui", "universa-ui"],
  },
  compatibilityDate: "2024-04-03",
  app: {
    head: {
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
});
