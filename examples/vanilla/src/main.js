import "example-ui/layout.css";
import { mountVanillaDashboard } from "example-ui/vanilla-dashboard";
import "universa-ui/styles.css";

const root = document.getElementById("example-root");
if (!root) {
  throw new Error("Missing #example-root");
}

const cleanup = mountVanillaDashboard({
  root,
  frameworkId: "vanilla",
});

window.addEventListener("unload", cleanup);
