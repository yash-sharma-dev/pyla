import { registerBuiltinPlugins, registerPlugin } from "@pyla/core-plugins";
import { gmailPlugin } from "~/plugins/gmail/plugin";
import {
  EXTENSION_RUNTIME_MESSAGE,
  isSupportedTabUrl,
} from "~/constants/extension-runtime";
import { supabase } from "~/lib/supabase";

const PYLA_WEB_ORIGIN = "https://pyla-web.vercel.app";

async function bootstrapSessionFromTab(tabId: number): Promise<void> {
  // Give the bridge page's useEffect time to write to localStorage.
  await new Promise<void>((r) => setTimeout(r, 800));
  try {
    const [result] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const v = window.localStorage.getItem("pyla-ext-tokens");
        if (v) window.localStorage.removeItem("pyla-ext-tokens");
        return v;
      },
    });
    const json = result?.result as string | null;
    if (!json) return;
    const { access_token, refresh_token } = JSON.parse(json) as {
      access_token: string;
      refresh_token: string;
    };
    await supabase.auth.setSession({ access_token, refresh_token });
  } catch {
    // Tab may have navigated away or script injection failed — ignore.
  }
}

// Must register plugins before isSupportedTabUrl can work
registerBuiltinPlugins();
registerPlugin(gmailPlugin);

async function sendMessageToTab(
  tabId: number,
  message: { type: string },
): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    // Content script not mounted in this tab
  }
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tabs[0] ?? null;
}

export default defineBackground(() => {
  // Watch for the /auth/extension bridge page and bootstrap the session.
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") return;
    if (!tab.url?.startsWith(`${PYLA_WEB_ORIGIN}/auth/extension`)) return;
    void bootstrapSessionFromTab(tabId);
  });

  // Toolbar icon click: copy current conversation
  browser.action.onClicked.addListener((tab) => {
    void (async () => {
      if (!tab.id || !isSupportedTabUrl(tab.url)) return;
      await sendMessageToTab(tab.id, {
        type: EXTENSION_RUNTIME_MESSAGE.COPY_CURRENT,
      });
    })();
  });

  // Keyboard shortcuts
  browser.commands.onCommand.addListener((command) => {
    void (async () => {
      const tab = await getActiveTab();
      if (!tab?.id || !isSupportedTabUrl(tab.url)) return;

      if (command === "copy-current") {
        await sendMessageToTab(tab.id, {
          type: EXTENSION_RUNTIME_MESSAGE.COPY_CURRENT,
        });
      }
    })();
  });
});
