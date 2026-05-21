import { registerBuiltinPlugins, registerPlugin } from "@pyla/core-plugins";
import { gmailPlugin } from "~/plugins/gmail/plugin";
import {
  EXTENSION_RUNTIME_MESSAGE,
  isSupportedTabUrl,
} from "~/constants/extension-runtime";
import { supabase } from "~/lib/supabase";

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

/**
 * Runs the full Google OAuth flow using chrome.identity (only available in
 * the background service worker) and bootstraps the Supabase session.
 * Returns { ok: true } on success, { ok: false, error: string } on failure.
 */
async function handleGoogleSignIn(): Promise<{ ok: boolean; error?: string }> {
  try {
    const redirectUrl = chrome.identity.getRedirectURL();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) throw error ?? new Error("No OAuth URL returned");

    const callbackUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: data.url, interactive: true },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!responseUrl) {
            reject(new Error("No response URL from OAuth flow"));
          } else {
            resolve(responseUrl);
          }
        },
      );
    });

    // Supabase appends tokens as hash fragments on the redirect URL.
    const params = new URLSearchParams(new URL(callbackUrl).hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) throw new Error("No tokens in OAuth callback");

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    if (sessionError) throw sessionError;

    // Sync the web app session by briefly opening the bridge page.
    const bridgeUrl = `https://pyla-web.vercel.app/auth/extension?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}`;
    const tab = await browser.tabs.create({ url: bridgeUrl, active: false });
    if (tab.id) {
      setTimeout(() => void browser.tabs.remove(tab.id!), 5000);
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sign-in failed";
    return { ok: false, error: msg };
  }
}

export default defineBackground(() => {
  // Handle sign-in requests from the popup.
  // chrome.identity is only available in the background service worker.
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === EXTENSION_RUNTIME_MESSAGE.SIGN_IN_GOOGLE) {
      return handleGoogleSignIn();
    }
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
