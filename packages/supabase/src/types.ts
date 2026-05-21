import type { ContentBundle } from "@pyla/core-schema";

// ─── Database row shapes (snake_case — matches Postgres columns) ──────────────

/** Raw row shape returned by Supabase for the `capsules` table */
export interface CapsuleRow {
  id: string;
  title: string;
  goals: string[];
  decisions: string[];
  messages: ContentBundle;
  attachments: string[];
  tags: string[];
  version: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  org_id: string | null;
}

/** Raw row shape for the `capsule_versions` table */
export interface CapsuleVersionRow {
  id: string;
  capsule_id: string;
  version: number;
  title: string;
  goals: string[];
  decisions: string[];
  messages: ContentBundle;
  attachments: string[];
  tags: string[];
  created_at: string;
  created_by: string | null;
}

/** The three access levels available within an organisation */
export type OrgRole = "owner" | "editor" | "viewer";

/** Raw row shape for the `orgs` table */
export interface OrgRow {
  id: string;
  name: string;
  created_at: string;
}

/** Raw row shape for the `org_members` table */
export interface OrgMemberRow {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

// ─── Application-level types (camelCase — used throughout the app) ────────────

/** A Pyla Capsule — the core portable context bundle */
export interface Capsule {
  id: string;
  title: string;
  goals: string[];
  decisions: string[];
  /** The captured AI conversation, typed as ContentBundle from core-schema */
  messages: ContentBundle;
  attachments: string[];
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  orgId: string | null;
}

/** A point-in-time snapshot of a Capsule */
export interface CapsuleVersion {
  id: string;
  capsuleId: string;
  version: number;
  title: string;
  goals: string[];
  decisions: string[];
  messages: ContentBundle;
  attachments: string[];
  tags: string[];
  createdAt: string;
  createdBy: string | null;
}

/** An organisation */
export interface Org {
  id: string;
  name: string;
  createdAt: string;
}

/** A member of an organisation */
export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
}

// ─── Input types for mutations ────────────────────────────────────────────────

/** Fields required to create a new Capsule */
export interface CreateCapsuleInput {
  title: string;
  messages: ContentBundle;
  goals?: string[];
  decisions?: string[];
  attachments?: string[];
  tags?: string[];
  orgId?: string;
}

/** Partial fields allowed when updating an existing Capsule */
export interface UpdateCapsuleInput {
  title?: string;
  goals?: string[];
  decisions?: string[];
  attachments?: string[];
  tags?: string[];
  orgId?: string | null;
}

// ─── Supabase Database generic (used by createClient<Database>) ───────────────

/** Minimal Database type consumed by the Supabase typed client */
export interface Database {
  public: {
    Tables: {
      capsules: {
        Row: CapsuleRow;
        Insert: Omit<CapsuleRow, "id" | "created_at" | "updated_at" | "version"> & {
          id?: string;
          version?: number;
        };
        Update: Partial<
          Omit<CapsuleRow, "id" | "created_at" | "user_id">
        >;
      };
      capsule_versions: {
        Row: CapsuleVersionRow;
        Insert: Omit<CapsuleVersionRow, "id" | "created_at"> & { id?: string };
        Update: never;
      };
      orgs: {
        Row: OrgRow;
        Insert: Omit<OrgRow, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<OrgRow, "id" | "created_at">>;
      };
      org_members: {
        Row: OrgMemberRow;
        Insert: Omit<OrgMemberRow, "id" | "created_at"> & { id?: string };
        Update: Partial<Pick<OrgMemberRow, "role">>;
      };
    };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps a raw Supabase CapsuleRow to the application-level Capsule type */
export function rowToCapsule(row: CapsuleRow): Capsule {
  return {
    id: row.id,
    title: row.title,
    goals: row.goals,
    decisions: row.decisions,
    messages: row.messages,
    attachments: row.attachments,
    tags: row.tags,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    orgId: row.org_id,
  };
}

/** Maps a raw Supabase CapsuleVersionRow to the application-level CapsuleVersion type */
export function rowToCapsuleVersion(row: CapsuleVersionRow): CapsuleVersion {
  return {
    id: row.id,
    capsuleId: row.capsule_id,
    version: row.version,
    title: row.title,
    goals: row.goals,
    decisions: row.decisions,
    messages: row.messages,
    attachments: row.attachments,
    tags: row.tags,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/** Maps a raw Supabase OrgMemberRow to the application-level OrgMember type */
export function rowToOrgMember(row: OrgMemberRow): OrgMember {
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at,
  };
}
