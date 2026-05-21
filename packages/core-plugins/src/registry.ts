import type { Plugin } from "./types";

const plugins = new Map<string, Plugin>();

export function registerPlugin(plugin: Plugin): void {
  if (plugins.has(plugin.id)) {
    console.warn(`Plugin "${plugin.id}" already registered, skipping.`);
    return;
  }
  plugins.set(plugin.id, plugin);
}

export function findPlugin(url: string): Plugin | null {
  for (const plugin of plugins.values()) {
    if (plugin.urls.match(url)) return plugin;
  }
  return null;
}

export function getAllPlugins(): Plugin[] {
  return Array.from(plugins.values());
}

export function getAllHostPermissions(): string[] {
  return Array.from(plugins.values()).flatMap((p) => p.urls.hosts);
}

export function clearPlugins(): void {
  plugins.clear();
}
