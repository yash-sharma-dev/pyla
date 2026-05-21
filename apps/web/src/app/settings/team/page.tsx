import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamPageClient, {
  type OrgWithRole,
  type MemberRecord,
} from "./TeamPageClient";

export const metadata: Metadata = { title: "Team Settings" };

// ─── Data helpers ─────────────────────────────────────────────────────────────

/**
 * Loads all orgs the current user belongs to, including their role in each.
 *
 * @param supabase - An authenticated Supabase server client
 * @param userId - The authenticated user's UUID
 * @returns Array of OrgWithRole
 */
async function loadOrgs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<OrgWithRole[]> {
  // Fetch the user's org memberships joined with org names
  const { data, error } = await (supabase.from("org_members") as any)
    .select("id, role, created_at, orgs(id, name, created_at)")
    .eq("user_id", userId);

  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    id: row.orgs.id as string,
    name: row.orgs.name as string,
    createdAt: row.orgs.created_at as string,
    myRole: row.role as OrgWithRole["myRole"],
  }));
}

/**
 * Loads all members of a given org, resolving each member's email via the
 * `get_member_emails` RPC helper (defined in the orgs migration).
 *
 * Falls back to userId as display if the RPC is unavailable.
 *
 * @param supabase - An authenticated Supabase server client
 * @param orgId - The org UUID to load members for
 * @returns Array of MemberRecord
 */
async function loadMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
): Promise<MemberRecord[]> {
  const { data, error } = await (supabase.from("org_members") as any)
    .select("id, user_id, role, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  // Resolve emails — use the auth admin RPC when available
  const members = data as Array<{
    id: string;
    user_id: string;
    role: MemberRecord["role"];
    created_at: string;
  }>;

  // Try to resolve emails in one RPC call
  const { data: emailRows } = await (supabase.rpc as any)(
    "get_member_emails",
    { p_org_id: orgId },
  );

  const emailMap = new Map<string, string>();
  if (Array.isArray(emailRows)) {
    for (const row of emailRows as { user_id: string; email: string }[]) {
      emailMap.set(row.user_id, row.email);
    }
  }

  return members.map((m) => ({
    id: m.id,
    userId: m.user_id,
    email: emailMap.get(m.user_id) ?? m.user_id,
    role: m.role,
    createdAt: m.created_at,
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Server Component for /settings/team.
 * Guards auth, loads orgs + members, then delegates rendering to the
 * interactive Client Component.
 */
export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgs = await loadOrgs(supabase, user.id);
  const initialOrgId = orgs[0]?.id;
  const initialMembers = initialOrgId
    ? await loadMembers(supabase, initialOrgId)
    : [];

  return (
    <TeamPageClient
      currentUserId={user.id}
      orgs={orgs}
      initialMembers={initialMembers}
      initialOrgId={initialOrgId}
    />
  );
}
