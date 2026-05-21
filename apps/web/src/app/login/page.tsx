import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Pyla to access your Capsules.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo + headline */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg">
            <svg
              viewBox="0 0 512 512"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path
                d="M104 64C80 64 64 80 64 104L64 408C64 432 80 448 104 448L264 448L264 368L368 368L448 256L368 144L264 144L264 64Z"
                fill="white"
                opacity="0.95"
              />
              <rect x="116" y="200" width="136" height="24" rx="12" fill="white" opacity="0.4" />
              <rect x="116" y="244" width="108" height="24" rx="12" fill="white" opacity="0.3" />
              <rect x="116" y="288" width="124" height="24" rx="12" fill="white" opacity="0.2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome to Pyla
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to manage your AI context Capsules
          </p>
        </div>

        {/* Auth form */}
        <Suspense fallback={<div>Loading form...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
