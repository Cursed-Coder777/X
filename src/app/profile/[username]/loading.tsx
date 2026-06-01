/**
 * Loading state for the profile page (/profile/[username]).
 * Shows a full-screen centered spinner while the user data and posts load.
 * Used by Next.js as the Suspense fallback for this dynamic route.
 */

import LoadingScreen from "~/app/_components/LoadingScreen";

export default function ProfileLoading() {
  return <LoadingScreen />;
}
