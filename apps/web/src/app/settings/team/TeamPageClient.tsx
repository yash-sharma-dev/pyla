"use client";

import React, { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createOrgAction,
  inviteMemberAction,
  removeMemberAction,
  updateRoleAction,
  type ActionResult,
} from "./actions";
import {
  Users,
  UserPlus,
  Trash2,
  Building2,
  ChevronDown,
  Crown,
  Shield,
  Eye,
  Loader2,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** An org the current user belongs to */
export interface OrgWithRole {
  id: string;
  name: string;
  createdAt: string;
  myRole: "owner" | "editor" | "viewer";
}

/** A hydrated member row (email resolved server-side) */
export interface MemberRecord {
  id: string;
  userId: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  createdAt: string;
}

export interface TeamPageClientProps {
  currentUserId: string;
  orgs: OrgWithRole[];
  /** members of the initially selected org */
  initialMembers: MemberRecord[];
  /** id of the initially active org (undefined if none) */
  initialOrgId: string | undefined;
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

const ROLES = ["owner", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number];

const roleLabel: Record<Role, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const roleBadgeVariant: Record<
  Role,
  "default" | "secondary" | "outline" | "destructive"
> = {
  owner: "default",
  editor: "secondary",
  viewer: "outline",
};

const RoleIcon: Record<Role, React.ElementType> = {
  owner: Crown,
  editor: Shield,
  viewer: Eye,
};

// ─── Small reusable components ────────────────────────────────────────────────

/**
 * Inline alert banner for action feedback.
 */
function Alert({
  result,
  onDismiss,
}: {
  result: ActionResult;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
        result.success
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      {result.success ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">
        {result.success ? "Done!" : result.error ?? "Something went wrong."}
      </span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-auto shrink-0 text-current opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Role selector — a simple native `<select>` styled to match shadcn/ui.
 */
function RoleSelect({
  value,
  onChange,
  id,
  disabled,
}: {
  value: Role;
  onChange: (r: Role) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Role)}
      className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {roleLabel[r]}
        </option>
      ))}
    </select>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Client shell for the /settings/team page.
 * Handles optimistic state via useTransition — no external state library needed.
 *
 * @param props - Org list, initial members, and the current user's ID
 */
export default function TeamPageClient({
  currentUserId,
  orgs,
  initialMembers,
  initialOrgId,
}: TeamPageClientProps) {
  const [activeOrgId, setActiveOrgId] = useState<string | undefined>(
    initialOrgId,
  );
  const [members, setMembers] = useState<MemberRecord[]>(initialMembers);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");

  // Create org form state
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const activeOrg = orgs.find((o) => o.id === activeOrgId);
  const isOwner = activeOrg?.myRole === "owner";

  /** Wraps an action, sets feedback, and re-fetches members if successful */
  async function runAction(
    action: (fd: FormData) => Promise<ActionResult>,
    fd: FormData,
  ) {
    startTransition(async () => {
      const result = await action(fd);
      setFeedback(result);
    });
  }

  // ── Invite handler ──────────────────────────────────────────────────────────
  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeOrgId) return;
    const fd = new FormData();
    fd.set("orgId", activeOrgId);
    fd.set("email", inviteEmail);
    fd.set("role", inviteRole);
    runAction(inviteMemberAction, fd).then(() => {
      setInviteEmail("");
    });
  }

  // ── Role change handler ─────────────────────────────────────────────────────
  function handleRoleChange(memberId: string, role: Role) {
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("role", role);
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
    );
    runAction(updateRoleAction, fd);
  }

  // ── Remove handler ──────────────────────────────────────────────────────────
  function handleRemove(memberId: string) {
    const fd = new FormData();
    fd.set("memberId", memberId);
    // Optimistic update
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    runAction(removeMemberAction, fd);
  }

  // ── Create org handler ──────────────────────────────────────────────────────
  function handleCreateOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", newOrgName);
    runAction(createOrgAction, fd).then(() => {
      setNewOrgName("");
      setShowCreateOrg(false);
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Feedback banner ── */}
      {feedback && (
        <Alert result={feedback} onDismiss={() => setFeedback(null)} />
      )}

      {/* ── Org selector / creator ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-[hsl(var(--pyla))]" />
              Your Organisations
            </CardTitle>
            <CardDescription className="mt-1">
              Select an org to manage its team members.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            id="create-org-toggle-btn"
            onClick={() => setShowCreateOrg((v) => !v)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Org
          </Button>
        </CardHeader>

        {showCreateOrg && (
          <CardContent className="border-t pt-4">
            <form
              id="create-org-form"
              onSubmit={handleCreateOrg}
              className="flex gap-2"
            >
              <Input
                id="new-org-name"
                placeholder="Acme Labs"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                required
                disabled={isPending}
                className="max-w-xs"
              />
              <Button
                type="submit"
                id="create-org-submit-btn"
                disabled={isPending || !newOrgName.trim()}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create
              </Button>
            </form>
          </CardContent>
        )}

        {orgs.length > 0 && (
          <CardContent className={showCreateOrg ? "pt-4" : "pt-0"}>
            <div className="flex flex-wrap gap-2">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  id={`org-tab-${org.id}`}
                  onClick={() => setActiveOrgId(org.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                    activeOrgId === org.id
                      ? "border-[hsl(var(--pyla))] bg-[hsl(var(--pyla))] text-white shadow-sm"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {org.name}
                  <Badge
                    variant={
                      activeOrgId === org.id ? "outline" : roleBadgeVariant[org.myRole]
                    }
                    className={
                      activeOrgId === org.id
                        ? "border-white/40 bg-white/20 text-white"
                        : ""
                    }
                  >
                    {roleLabel[org.myRole]}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        )}

        {orgs.length === 0 && !showCreateOrg && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You don&apos;t belong to any organisations yet. Create one above.
            </p>
          </CardContent>
        )}
      </Card>

      {/* ── Members section — only shown when an org is selected ── */}
      {activeOrg && (
        <>
          {/* Invite form — owners only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-4 w-4 text-[hsl(var(--pyla))]" />
                  Invite a Member
                </CardTitle>
                <CardDescription>
                  Add someone to <strong>{activeOrg.name}</strong> by their
                  Pyla email address.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  id="invite-member-form"
                  onSubmit={handleInvite}
                  className="flex flex-wrap items-end gap-3"
                >
                  <div className="flex-1 min-w-[200px]">
                    <label
                      htmlFor="invite-email"
                      className="mb-1.5 block text-xs font-medium text-muted-foreground"
                    >
                      Email address
                    </label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="teammate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="invite-role"
                      className="mb-1.5 block text-xs font-medium text-muted-foreground"
                    >
                      Role
                    </label>
                    <RoleSelect
                      id="invite-role"
                      value={inviteRole}
                      onChange={setInviteRole}
                      disabled={isPending}
                    />
                  </div>
                  <Button
                    type="submit"
                    id="invite-member-submit-btn"
                    disabled={isPending || !inviteEmail.trim()}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Send Invite
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Members table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-[hsl(var(--pyla))]" />
                Members
                <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {members.length}
                </span>
              </CardTitle>
              <CardDescription>
                {isOwner
                  ? "You can change roles or remove members below."
                  : "Your current role is " +
                    roleLabel[activeOrg.myRole] +
                    ". Contact an Owner to make changes."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  No members yet.
                </p>
              ) : (
                <ul className="divide-y divide-border" role="list">
                  {members.map((member) => {
                    const Icon = RoleIcon[member.role];
                    const isSelf = member.userId === currentUserId;
                    return (
                      <li
                        key={member.id}
                        className="flex flex-wrap items-center gap-4 px-6 py-4"
                      >
                        {/* Avatar + email */}
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--pyla)/0.12)] text-[hsl(var(--pyla))] text-sm font-semibold">
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {member.email}
                              {isSelf && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined{" "}
                              {new Date(member.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Role control */}
                        <div className="flex items-center gap-3">
                          {isOwner && !isSelf ? (
                            <RoleSelect
                              id={`role-select-${member.id}`}
                              value={member.role}
                              onChange={(r) => handleRoleChange(member.id, r)}
                              disabled={isPending}
                            />
                          ) : (
                            <Badge
                              variant={roleBadgeVariant[member.role]}
                              className="flex items-center gap-1"
                            >
                              <Icon className="h-3 w-3" />
                              {roleLabel[member.role]}
                            </Badge>
                          )}

                          {/* Remove button — owners only, not self */}
                          {isOwner && !isSelf && (
                            <Button
                              id={`remove-member-${member.id}-btn`}
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${member.email}`}
                              disabled={isPending}
                              onClick={() => handleRemove(member.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
