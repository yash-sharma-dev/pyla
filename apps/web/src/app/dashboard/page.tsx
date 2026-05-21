import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCapsules } from "@pyla/supabase";
import CapsuleList from "./CapsuleList";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all accessible capsules (personal + team)
  const capsules = await listCapsules(supabase as any, { limit: 100 });

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Capsules</h1>
            <p className="text-muted-foreground mt-1">
              Manage and search your captured AI conversations.
            </p>
          </div>
          <SignOutButton />
        </div>

        <CapsuleList initialCapsules={capsules} />
      </div>
    </div>
  );
}
