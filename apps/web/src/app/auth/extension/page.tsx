"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function Bridge() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    void (async () => {
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const next = params.get("next") ?? "/dashboard";

      if (access_token && refresh_token) {
        const supabase = createClient();
        await supabase.auth.setSession({ access_token, refresh_token });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(next as any);
    })();
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
