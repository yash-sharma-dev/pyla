"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Result shape returned by every Server Action */
export interface ActionResult {
  success: boolean;
  error?: string;
}

// ─── Create Org ───────────────────────────────────────────────────────────────

/**
 * Creates a new organisation for the current user.
 * The trigger `orgs_after_insert` automatically inserts the creator as 'owner'.
 *
 * @param formData - Must contain `name` field
 * @returns ActionResult
 */
export async function createOrgAction(
  formData: FormData,
): Promise<ActionResult> {
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { success: false, error: "Organisation name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await (supabase.from("orgs") as any).insert({ name });
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
}

// ─── Invite Member ────────────────────────────────────────────────────────────

/**
 * Looks up a user by email and inserts them into `org_members` with the given
 * role. Falls back to a graceful error if the email is not registered.
 *
 * @param formData - Must contain `orgId`, `email`, and `role` fields
 * @returns ActionResult
 */
export async function inviteMemberAction(
  formData: FormData,
): Promise<ActionResult> {
  const orgId = formData.get("orgId") as string | null;
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const role = formData.get("role") as string | null;

  if (!orgId) return { success: false, error: "No organisation selected." };
  if (!email) return { success: false, error: "Email is required." };
  if (!role) return { success: false, error: "Role is required." };
  if (!["owner", "editor", "viewer"].includes(role)) {
    return { success: false, error: "Invalid role." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  // Look up user by email through the admin RPC exposed in the migration
  const { data: targetUserId, error: lookupErr } = await (
    supabase.rpc as any
  )("get_user_id_by_email", { p_email: email });

  if (lookupErr || !targetUserId) {
    return {
      success: false,
      error: "No Pyla account found for that email address.",
    };
  }

  const { error } = await (supabase.from("org_members") as any).insert({
    org_id: orgId,
    user_id: targetUserId,
    role,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "That user is already a member." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/team");
  return { success: true };
}

// ─── Update Role ──────────────────────────────────────────────────────────────

/**
 * Changes the role of an existing org member.
 * Only org owners may call this (enforced by RLS `has_org_role` policy).
 *
 * @param formData - Must contain `memberId` and `role` fields
 * @returns ActionResult
 */
export async function updateRoleAction(
  formData: FormData,
): Promise<ActionResult> {
  const memberId = formData.get("memberId") as string | null;
  const role = formData.get("role") as string | null;

  if (!memberId) return { success: false, error: "Member ID is required." };
  if (!role || !["owner", "editor", "viewer"].includes(role)) {
    return { success: false, error: "Invalid role." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await (supabase.from("org_members") as any)
    .update({ role })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
}

// ─── Remove Member ────────────────────────────────────────────────────────────

/**
 * Removes a member from an org.
 * Only org owners may call this (enforced by RLS `has_org_role` policy).
 *
 * @param formData - Must contain `memberId` field
 * @returns ActionResult
 */
export async function removeMemberAction(
  formData: FormData,
): Promise<ActionResult> {
  const memberId = formData.get("memberId") as string | null;
  if (!memberId) return { success: false, error: "Member ID is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const { error } = await (supabase.from("org_members") as any)
    .delete()
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
}
