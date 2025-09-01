// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
// Remix's official Vite plugin
import { vitePlugin as remix } from "@remix-run/dev";

function splitHosts(val?: string): string[] {
  if (!val) return [];
  return val
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function truthy(v: unknown): boolean {
  return String(v).toLowerCase() === "true" || String(v) === "1";
}

export default defineConfig(({ mode }) => {
  // Load any .env files too, but Railway-provided envs come via process.env
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  // 1) Compute allowed hosts from your environment
  // Prefer explicit allow-lists over disabling the check entirely.
  const allowSet = new Set<string>([
    ...splitHosts(env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS as string),
    ...splitHosts(env.VITE_ALLOWED_HOSTS as string),
    ...splitHosts(env.VITE_DEV_SERVER_ALLOWED_HOSTS as string),
  ]);

  // If HOST/VITE_HOST looks like a domain (not localhost/0.0.0.0), also allow it.
  const maybeHost = String(env.VITE_HOST || env.HOST || "");
  if (maybeHost && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(maybeHost)) {
    allowSet.add(maybeHost);
  }

  // Optional escape hatch (not recommended for public deployments)
  const disableHostCheck = truthy(env.DANGEROUSLY_DISABLE_HOST_CHECK);

  const allowedHosts: true | string[] =
    disableHostCheck ? true : Array.from(allowSet);

  // 2) Resolve host/port for dev & preview
  // Railway sets PORT; we fall back to VITE_PORT or sensible defaults.
  const devPort = Number(env.PORT || env.VITE_PORT || 5173);
  const previewPort = Number(env.PORT || env.VITE_PORT || 4173);

  // host: true => 0.0.0.0 bind (good for containers)
  const resolvedHost: string | boolean = env.VITE_HOST || env.HOST || true;

  // Optional HMR client port (useful when dev server is behind HTTPS proxy)
  const hmr =
    env.HMR_CLIENT_PORT && Number(env.HMR_CLIENT_PORT)
      ? { clientPort: Number(env.HMR_CLIENT_PORT) }
      : undefined;

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      remix(), // keep Remix first/early in the chain
    ],

    server: {
      host: resolvedHost,
      port: devPort,
      strictPort: true,
      allowedHosts,
      hmr,
    },

    preview: {
      host: resolvedHost,
      port: previewPort,
      strictPort: true,
      allowedHosts,
    },
  };
});
