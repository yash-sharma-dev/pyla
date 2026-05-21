import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  clean: true,
  dts: false,
  sourcemap: true,
  minify: false,
  noExternal: [/@pyla\//],
  outExtension() {
    return {
      js: ".js", // standard ESM since type: "module"
    };
  },
});
