/**
 * Local: Vite user app. On Render: production dist server (Vite has no /admin routes).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const onRender = process.env.RENDER === "true";

if (onRender) {
  console.log("Render detected — serving production dist (Vite would send /admin to /login).");
  const child = spawn(process.execPath, ["scripts/serve-dist.mjs", "--force-serve"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
} else {
  const port = process.env.PORT || "5173";
  const child = spawn(
    "npx",
    ["vite", "--host", "0.0.0.0", "--port", String(port)],
    { cwd: root, stdio: "inherit", env: process.env, shell: true }
  );
  child.on("exit", (code) => process.exit(code ?? 1));
}
