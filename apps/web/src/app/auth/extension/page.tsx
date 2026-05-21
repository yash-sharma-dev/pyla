"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Bridge() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const next = params.get("next") ?? "/dashboard";

    if (access_token && refresh_token) {
      localStorage.setItem(
        "pyla-ext-tokens",
        JSON.stringify({ access_token, refresh_token }),
      );
      window.postMessage(
        { type: "PYLA_AUTH_TOKENS", access_token, refresh_token },
        window.location.origin,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(next as any);
  }, []);

  return null;
}

export default function AuthExtensionPage() {
  return (
    <Suspense>
      <Bridge />
    </Suspense>
  );
}
