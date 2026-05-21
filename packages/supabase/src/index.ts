// Client factory
export { createSupabaseClient } from "./client";
export type { StorageAdapter, SupabaseClient } from "./client";

// Types
export type {
  Capsule,
  CapsuleVersion,
  CapsuleRow,
  CapsuleVersionRow,
  OrgRow,
  OrgMemberRow,
  Org,
  OrgMember,
  OrgRole,
  CreateCapsuleInput,
  UpdateCapsuleInput,
  Database,
} from "./types";
export { rowToCapsule, rowToCapsuleVersion, rowToOrgMember } from "./types";

// Capsule CRUD
export {
  createCapsule,
  getCapsule,
  listCapsules,
  updateCapsule,
  forkCapsule,
  deriveTitleFromBundle,
} from "./capsules";

// Auth
export {
  signInWithEmail,
  signInWithGoogle,
  signOut,
  getSession,
  onAuthChange,
} from "./auth";
export type { Unsubscribe } from "./auth";
