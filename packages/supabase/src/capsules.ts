import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Capsule,
  CapsuleRow,
  CreateCapsuleInput,
  Database,
  UpdateCapsuleInput,
} from "./types";
import { rowToCapsule } from "./types";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives a Capsule title from a ContentBundle.
 * Uses the first 60 characters of the first user-role message node.
 * Falls back to "Untitled Capsule" if no user message is found.
 *
 * @param messages - The ContentBundle to derive a title from
 * @returns A title string no longer than 60 characters
 */
export function deriveTitleFromBundle(
  messages: CreateCapsuleInput["messages"],
): string {
  const userParticipant = messages.participants.find(
    (p) => p.role === "user",
  );
  if (!userParticipant) return messages.title?.slice(0, 60) ?? "Untitled Capsule";

  const firstUserNode = messages.nodes.find(
    (n) => n.participantId === userParticipant.id,
  );
  if (!firstUserNode) return messages.title?.slice(0, 60) ?? "Untitled Capsule";

  const text = firstUserNode.content.trim().replace(/\s+/g, " ");
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

function assertNoError<T>(
  data: T | null,
  error: { message: string } | null,
  context: string,
): T {
  if (error) throw new Error(`[pyla/supabase] ${context}: ${error.message}`);
  if (data === null) throw new Error(`[pyla/supabase] ${context}: no data returned`);
  return data;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Creates a new Capsule for the currently authenticated user.
 *
 * The `title` field defaults to the first 60 characters of the first user message
 * if not explicitly provided.
 *
 * @param client - An authenticated Supabase client
 * @param input - The Capsule fields to persist
 * @returns The newly created Capsule
 * @throws If the user is not authenticated or the insert fails
 */
export async function createCapsule(
  client: SupabaseClient<Database>,
  input: CreateCapsuleInput,
): Promise<Capsule> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("[pyla/supabase] createCapsule: not authenticated");

  const title = input.title || deriveTitleFromBundle(input.messages);

  const { data, error } = await (client.from("capsules") as any)
    .insert({
      title,
      messages: input.messages as any,
      goals: input.goals ?? [],
      decisions: input.decisions ?? [],
      attachments: input.attachments ?? [],
      tags: input.tags ?? [],
      org_id: input.orgId ?? null,
      user_id: user.id,
    } as any)
    .select()
    .single();

  return rowToCapsule(assertNoError(data as CapsuleRow | null, error, "createCapsule"));
}

/**
 * Fetches a single Capsule by ID.
 * RLS ensures only the owner can retrieve it.
 *
 * @param client - An authenticated Supabase client
 * @param id - The UUID of the Capsule to retrieve
 * @returns The matching Capsule
 * @throws If the Capsule does not exist or the user lacks access
 */
export async function getCapsule(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Capsule> {
  const { data, error } = await (client.from("capsules") as any)
    .select()
    .eq("id", id)
    .single();

  return rowToCapsule(assertNoError(data as CapsuleRow | null, error, "getCapsule"));
}

/**
 * Lists Capsules owned by the currently authenticated user or an organization.
 * Ordered by most recently updated first.
 *
 * @param client - An authenticated Supabase client
 * @param opts.tag - Optional tag to filter by (case-sensitive, array-contains)
 * @param opts.orgId - Optional org ID to filter by. If explicitly null, fetches personal capsules. If omitted, fetches all accessible capsules.
 * @param opts.limit - Maximum number of results to return (default: 50)
 * @returns An array of Capsules, possibly empty
 */
export async function listCapsules(
  client: SupabaseClient<Database>,
  opts: { tag?: string; orgId?: string | null; limit?: number } = {},
): Promise<Capsule[]> {
  const { tag, orgId, limit = 50 } = opts;

  let query = (client.from("capsules") as any)
    .select()
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (orgId !== undefined) {
    if (orgId === null) {
      query = query.is("org_id", null);
    } else {
      query = query.eq("org_id", orgId);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`[pyla/supabase] listCapsules: ${error.message}`);

  return (data ?? []).map(rowToCapsule);
}

/**
 * Applies a partial update to an existing Capsule.
 * Automatically bumps `version` by 1 and saves a version snapshot beforehand.
 *
 * @param client - An authenticated Supabase client
 * @param id - The UUID of the Capsule to update
 * @param patch - The fields to update (all optional)
 * @returns The updated Capsule
 * @throws If the Capsule does not exist, the user lacks access, or the update fails
 */
export async function updateCapsule(
  client: SupabaseClient<Database>,
  id: string,
  patch: UpdateCapsuleInput,
): Promise<Capsule> {
  // Fetch current state so we can snapshot it before updating
  const current = await getCapsule(client, id);

  // Save a version snapshot of the current state
  await (client.from("capsule_versions") as any).insert({
    capsule_id: current.id,
    version: current.version,
    title: current.title,
    goals: current.goals,
    decisions: current.decisions,
    messages: current.messages as any,
    attachments: current.attachments,
    tags: current.tags,
  } as any);

  const { data, error } = await (client.from("capsules") as any)
    .update({
      ...patch,
      org_id: patch.orgId !== undefined ? patch.orgId : undefined,
      version: current.version + 1,
    } as any)
    .eq("id", id)
    .select()
    .single();

  return rowToCapsule(assertNoError(data as CapsuleRow | null, error, "updateCapsule"));
}

/**
 * Forks an existing Capsule into a new one owned by the calling user.
 *
 * The fork:
 * - Gets a new UUID and `version = 1`
 * - Has `" (fork)"` appended to the title
 * - Copies all content fields (goals, decisions, messages, etc.) verbatim
 * - Saves a version snapshot of the original before forking
 *
 * @param client - An authenticated Supabase client
 * @param id - The UUID of the Capsule to fork
 * @returns The newly created fork Capsule
 * @throws If the source Capsule does not exist, the user lacks access, or the insert fails
 */
export async function forkCapsule(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Capsule> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("[pyla/supabase] forkCapsule: not authenticated");

  const source = await getCapsule(client, id);

  // Snapshot the original version before forking
  await (client.from("capsule_versions") as any).insert({
    capsule_id: source.id,
    version: source.version,
    title: source.title,
    goals: source.goals,
    decisions: source.decisions,
    messages: source.messages as any,
    attachments: source.attachments,
    tags: source.tags,
    created_by: user.id,
  } as any);

  const { data, error } = await (client.from("capsules") as any)
    .insert({
      title: `${source.title} (fork)`,
      goals: source.goals,
      decisions: source.decisions,
      messages: source.messages as any,
      attachments: source.attachments,
      tags: source.tags,
      version: 1,
      user_id: user.id,
      org_id: null,
    } as any)
    .select()
    .single();

  return rowToCapsule(assertNoError(data as CapsuleRow | null, error, "forkCapsule"));
}
