// Types
export type {
  Plugin,
  PluginContext,
  PluginInjector,
  InjectorCallbacks,
  ThemeConfig,
} from "./types";

// Registry
export {
  registerPlugin,
  findPlugin,
  getAllPlugins,
  getAllHostPermissions,
  clearPlugins,
} from "./registry";

// Utils
export { generateId } from "./utils";

// Built-in plugins
export {
  registerBuiltinPlugins,
  chatgptPlugin,
  claudePlugin,
  deepseekPlugin,
  doubaoPlugin,
  geminiPlugin,
  githubPlugin,
  grokPlugin,
} from "./plugins";

// Host permissions constant (for WXT config)
import { chatgptPlugin } from "./plugins/chatgpt/plugin";
import { claudePlugin } from "./plugins/claude/plugin";
import { deepseekPlugin } from "./plugins/deepseek/plugin";
import { doubaoPlugin } from "./plugins/doubao/plugin";
import { geminiPlugin } from "./plugins/gemini/plugin";
import { githubPlugin } from "./plugins/github/plugin";
import { grokPlugin } from "./plugins/grok/plugin";
export const EXTENSION_HOST_PERMISSIONS = [
  ...chatgptPlugin.urls.hosts,
  ...claudePlugin.urls.hosts,
  ...deepseekPlugin.urls.hosts,
  ...doubaoPlugin.urls.hosts,
  ...geminiPlugin.urls.hosts,
  ...githubPlugin.urls.hosts,
  ...grokPlugin.urls.hosts,
];
