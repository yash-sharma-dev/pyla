import { registerBuiltinPlugins, registerPlugin } from "@pyla/core-plugins";
import { gmailPlugin } from "~/plugins/gmail/plugin";
import {
  EXTENSION_RUNTIME_MESSAGE,
  isSupportedTabUrl,
} from "~/constants/extension-runtime";

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
