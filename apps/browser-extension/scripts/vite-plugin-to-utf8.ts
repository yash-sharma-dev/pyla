import { type PluginOption } from "vite";

const strToUtf8 = (str: string) =>
  str
    .split("")
    .map((ch) =>
      ch.charCodeAt(0) <= 0x7f
        ? ch
        : `\\u${`0000${ch.charCodeAt(0).toString(16)}`.slice(-4)}`,
    )
    .join("");

export const toUtf8 = (): PluginOption => ({
  name: "to-utf8",
  generateBundle(options, bundle) {
    for (const fileName in bundle) {
      if (bundle[fileName]?.type === "chunk") {
        const originalCode = bundle[fileName].code;
        const modifiedCode = strToUtf8(originalCode);
        bundle[fileName].code = modifiedCode;
      }
    }
  },
});
