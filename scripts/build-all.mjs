import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";

function run(command, extra = {}) {
  execSync(command, { stdio: "inherit", ...extra });
}

run("npx vite build");
run("npm install", { cwd: "admin" });
run("npm run build", {
  cwd: "admin",
  env: { ...process.env, ADMIN_BASE: "/admin/" },
});

rmSync("dist/admin", { recursive: true, force: true });
cpSync("admin/dist", "dist/admin", { recursive: true });

if (existsSync("admin/public/assets")) {
  cpSync("admin/public/assets", "dist/assets", { recursive: true });
}
