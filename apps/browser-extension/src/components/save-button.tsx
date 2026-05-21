import type { ContentBundle } from "@pyla/core-schema";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSaveCapsule, type SaveState } from "~/hooks/use-save-capsule";
import { supabase } from "~/lib/supabase";

const MOTION = {
  instant: "100ms",
  fast: "150ms",
  normal: "250ms",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeIn: "cubic-bezier(0.55, 0, 1, 0.45)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

interface SaveButtonProps {
  /** The ContentBundle to save. If null the button renders as disabled. */
  bundle: ContentBundle | null;
  onToast: (data: {
    title: string;
    subtitle?: string;
    type: "success" | "error";
  }) => void;
}

/**
 * A cloud-save icon button that persists a ContentBundle as a Pyla Capsule
 * to Supabase. Sits alongside the clipboard CopyButton in the floating pill.
 *
 * - Disabled and shows a tooltip if the user is not authenticated.
 * - Transitions through idle → loading → success/error states with animation.
 */
export function SaveButton({ bundle, onToast }: SaveButtonProps) {
  const { state, save, error } = useSaveCapsule();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [iconAnimated, setIconAnimated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const prevStateRef = useRef<SaveState>("idle");

  // Check auth on mount
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
  }, []);

  // Icon animation on state change
  useEffect(() => {
    if (state === "success" || state === "error") {
      setIconAnimated(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIconAnimated(true));
      });
    }
  }, [state]);

  // Toast on state change
  useEffect(() => {
    if (prevStateRef.current === state) return;
    prevStateRef.current = state;

    if (state === "success") {
      onToast({ title: "Pyla · Capsule saved", type: "success" });
    } else if (state === "error" && error) {
      onToast({ title: "Pyla · Save failed", subtitle: error, type: "error" });
    }
  }, [state, error, onToast]);

  const handleClick = useCallback(async () => {
    if (!bundle) return;
    if (!isAuthenticated) {
      window.open("https://pyla-web.vercel.app/login", "_blank");
      return;
    }
    await save(bundle);
  }, [bundle, isAuthenticated, save]);

  const isIdle = state === "idle";
  const isLoading = state === "loading";
  const isDisabled = isLoading || !bundle;

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    padding: 0,
    border: "none",
    borderRadius: 8,
    background:
      hovered && isIdle ? "rgba(99, 102, 241, 0.10)" : "transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    color: saveIconColor(state, isAuthenticated),
    opacity: isDisabled ? 0.45 : isIdle && !hovered ? 0.7 : 1,
    transform:
      pressed && isIdle
        ? "scale(0.88)"
        : hovered && isIdle
          ? "scale(1.08)"
          : "scale(1)",
    transition: pressed
      ? `transform ${MOTION.instant} ${MOTION.easeIn}, opacity ${MOTION.fast} ${MOTION.easeOut}, color ${MOTION.fast} ${MOTION.easeOut}, background ${MOTION.fast} ${MOTION.easeOut}`
      : `transform ${MOTION.fast} ${MOTION.spring}, opacity ${MOTION.fast} ${MOTION.easeOut}, color ${MOTION.fast} ${MOTION.easeOut}, background ${MOTION.fast} ${MOTION.easeOut}`,
  };

  const tooltip = !isAuthenticated
    ? "Sign in to save as Capsule (Pyla)"
    : "Save as Capsule (Pyla)";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      disabled={isDisabled}
      title={tooltip}
      className="pyla-save-btn"
      style={buttonStyle}
    >
      <SaveIcon state={state} authenticated={isAuthenticated} animated={iconAnimated} />
    </button>
  );
}

function saveIconColor(state: SaveState, authenticated: boolean): string {
  if (!authenticated) return "currentColor";
  switch (state) {
    case "success":
      return "#059669";
    case "error":
      return "#dc2626";
    default:
      return "#6366f1"; // indigo — distinct from clipboard grey
  }
}

function SaveIcon({
  state,
  authenticated,
  animated,
}: {
  state: SaveState;
  authenticated: boolean;
  animated: boolean;
}) {
  if (state === "loading") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.2"
        />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    );
  }

  if (state === "success") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: animated ? "scale(1)" : "scale(0.5)",
          opacity: animated ? 1 : 0,
          transition: animated
            ? `transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 150ms ${MOTION.easeOut}`
            : "none",
        }}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  if (state === "error") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: animated ? "scale(1)" : "scale(0.5)",
          opacity: animated ? 1 : 0,
          transition: animated
            ? `transform ${MOTION.fast} ${MOTION.easeOut}, opacity ${MOTION.fast} ${MOTION.easeOut}`
            : "none",
        }}
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  // idle — cloud upload icon; greyed out if unauthenticated
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={authenticated ? 1 : 0.4}
    >
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}
