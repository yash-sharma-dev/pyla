import { redirect } from "next/navigation";

/**
 * /settings redirects to /settings/team — the only settings sub-page for now.
 */
export default function SettingsPage() {
  redirect("/settings/team");
}
