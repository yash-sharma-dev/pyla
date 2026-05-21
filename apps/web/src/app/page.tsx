import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0a0b", color: "#f9fafb" }}>

      {/* Nav */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight" style={{ color: "#f9fafb" }}>Pyla</span>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/yash-sharma-dev/pyla"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors"
              style={{ color: "#6b7280" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#f9fafb")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#6b7280")}
            >
              GitHub
            </a>
            <Link
              href="/login"
              className="text-sm transition-colors"
              style={{ color: "#6b7280" }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <h1
          className="font-bold tracking-tight mb-4"
          style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 1.15, letterSpacing: "-0.03em" }}
        >
          Never lose AI context again.
        </h1>
        <p className="mb-10 max-w-md" style={{ color: "#9ca3af", fontSize: "1.0625rem", lineHeight: 1.6 }}>
          Capture conversations from any AI tool, save them as portable Capsules, and inject them anywhere — instantly.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#6366f1", color: "#ffffff" }}
          >
            Install Chrome Extension
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#f9fafb", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            View Dashboard →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest mb-10 text-center" style={{ color: "#4b5563" }}>
            How it works
          </p>
          <div className="grid grid-cols-1 gap-px sm:grid-cols-3" style={{ backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "12px", overflow: "hidden" }}>
            {[
              {
                step: "01",
                title: "Capture",
                desc: "Open any AI conversation and click the Pyla extension to extract the full context.",
              },
              {
                step: "02",
                title: "Save",
                desc: "The conversation is bundled into a portable Capsule stored in your dashboard.",
              },
              {
                step: "03",
                title: "Inject",
                desc: "Paste the Capsule into any AI tool to resume exactly where you left off.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="px-8 py-8" style={{ backgroundColor: "#0a0a0b" }}>
                <span className="text-xs font-mono mb-3 block" style={{ color: "#4b5563" }}>{step}</span>
                <h3 className="font-semibold mb-2" style={{ fontSize: "1rem" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported platforms */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "#4b5563" }}>
            Works with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["ChatGPT", "Claude", "Gemini"].map((name) => (
              <span
                key={name}
                className="px-4 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#9ca3af",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-xs" style={{ color: "#374151" }}>© 2025 Pyla</span>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/yash-sharma-dev/pyla"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors"
              style={{ color: "#4b5563" }}
            >
              GitHub
            </a>
            <Link href="/login" className="text-xs transition-colors" style={{ color: "#4b5563" }}>
              Sign in
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
