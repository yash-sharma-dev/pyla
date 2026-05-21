import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Settings, Users } from "lucide-react";

export const metadata: Metadata = { title: "Settings" };

const navItems = [
  { href: "/settings/team", label: "Team", icon: Users },
] as const;

/**
 * Shared layout for all /settings/* pages.
 * Renders a sidebar nav + main content area.
 * Protects all settings routes by checking auth here.
 *
 * @param children - The active settings sub-page
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Top bar ── */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-[hsl(var(--pyla))] transition-colors"
          >
            <span className="inline-block h-5 w-5 rounded-md bg-[hsl(var(--pyla))] text-center text-xs font-bold leading-5 text-white">
              P
            </span>
            Pyla
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </span>
          <div className="ml-auto text-xs text-muted-foreground">
            {user.email}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-8 px-4 py-8">
        {/* Sidebar */}
        <nav
          aria-label="Settings navigation"
          className="w-40 shrink-0 space-y-1"
        >
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
