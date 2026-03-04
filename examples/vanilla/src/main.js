import { mountExampleDashboard } from "example-ui/dashboard-client";
import "example-ui/layout.css";

const root = document.getElementById("example-root");
if (!root) {
  throw new Error("Missing #example-root");
}

const cleanup = mountExampleDashboard({
  root,
  frameworkId: "vanilla",
});

window.addEventListener("unload", cleanup);
