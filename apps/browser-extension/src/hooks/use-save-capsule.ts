import type { ContentBundle } from "@pyla/core-schema";
import { useState, useCallback } from "react";
import { supabase } from "~/lib/supabase";

function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

export type SaveState = "idle" | "loading" | "success" | "error";

export interface SaveResult {
  capsuleId: string;
}

/**
 * Derives a Capsule title from a ContentBundle.
 * Uses the first 60 characters of the first user-role message node.
 * Falls back to the bundle title or "Untitled Capsule".
 */
function deriveTitleFromBundle(bundle: ContentBundle): string {
  const userParticipant = bundle.participants.find((p) => p.role === "user");
  if (!userParticipant) return bundle.title?.slice(0, 60) ?? "Untitled Capsule";

  const firstUserNode = bundle.nodes.find(
    (n) => n.participantId === userParticipant.id,
  );
  if (!firstUserNode) return bundle.title?.slice(0, 60) ?? "Untitled Capsule";

  const text = firstUserNode.content.trim().replace(/\s+/g, " ");
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

/**
 * React hook for saving a captured ContentBundle as a Pyla Capsule to Supabase.
 *
 * Usage:
 * ```ts
 * const { state, save, error } = useSaveCapsule();
 * await save(bundle);  // title derived automatically from first user message
 * await save(bundle, "My custom title");
 * ```
 *
 * @returns `{ state, save, result, error }`
 */
export function useSaveCapsule() {
  const [state, setState] = useState<SaveState>("idle");
  const [result, setResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (bundle: ContentBundle, title?: string): Promise<void> => {
      setState("loading");
      setError(null);
      setResult(null);

      try {
        if (!isExtensionContextValid()) {
          throw new Error("Extension context invalidated — please reload the page");
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const derivedTitle = title ?? deriveTitleFromBundle(bundle);

        const { data, error: insertError } = await supabase
          .from("capsules")
          .insert({
            title: derivedTitle,
            messages: bundle,
            goals: [],
            decisions: [],
            attachments: [],
            tags: bundle.tags ?? [],
            owner_id: user.id,
            org_id: null,
          })
          .select("id")
          .single();

        if (insertError) throw new Error(insertError.message);

        setResult({ capsuleId: (data as { id: string }).id });
        setState("success");

        setTimeout(() => {
          setState("idle");
          setResult(null);
        }, 2000);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to save capsule";
        setError(msg);
        setState("error");

        setTimeout(() => {
          setState("idle");
          setError(null);
        }, 3000);
      }
    },
    [],
  );

  return { state, save, result, error };
}
