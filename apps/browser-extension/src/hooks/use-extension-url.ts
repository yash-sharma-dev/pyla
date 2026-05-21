import { useState, useEffect } from "react";
import { EXTENSION_WINDOW_EVENT } from "~/constants/extension-runtime";

export function useExtensionUrl() {
  const [url, setUrl] = useState(window.location.href);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ url: string }>).detail;
      setUrl(detail.url);
    };

    window.addEventListener(EXTENSION_WINDOW_EVENT.URL_CHANGE, handler);
    return () => {
      window.removeEventListener(EXTENSION_WINDOW_EVENT.URL_CHANGE, handler);
    };
  }, []);

  return url;
}
