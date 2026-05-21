import { EXTENSION_HOST_PERMISSIONS } from "@pyla/core-plugins";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "wxt";
import { loadEnv } from "vite";
import { fileURLToPath } from "url";
import { resolve } from "path";
import { toUtf8 } from "./scripts/vite-plugin-to-utf8";

// Resolve to monorepo root (apps/browser-extension/ → ../../ = ctxport/)
const REPO_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

export default defineConfig({
  manifest: {
    name: "Pyla",
    description: "Capture AI conversations as structured bundles",
    version: "0.1.0",
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    permissions: ["activeTab", "storage", "cookies"],
    host_permissions: [...EXTENSION_HOST_PERMISSIONS, "https://mail.google.com/*", "https://pyla-web.vercel.app/*"],
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    action: {
      default_title: "Pyla",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png",
      },
    },
    commands: {
      "copy-current": {
        suggested_key: {
          default: "Alt+Shift+C",
          mac: "Alt+Shift+C",
        },
        description: "Copy current conversation",
      },
    },
  },
  srcDir: "src",
  outDir: "dist",
  modules: ["@wxt-dev/module-react"],
  vite: (env) => {
    const vars = loadEnv(env.mode ?? "production", REPO_ROOT, "");
    return {
      envDir: REPO_ROOT,
      define: {
        __SUPABASE_URL__: JSON.stringify(vars.VITE_SUPABASE_URL ?? ""),
        __SUPABASE_ANON_KEY__: JSON.stringify(vars.VITE_SUPABASE_ANON_KEY ?? ""),
      },
      plugins: [toUtf8(), tailwindcss(), tsconfigPaths()],
      resolve: {
        conditions: ["development", "import", "browser", "default"],
      },
      optimizeDeps: {
        exclude: ["@pyla/core-plugins", "@pyla/core-markdown"],
      },
      build: {
        sourcemap: false,
      },
    };
  },
});
