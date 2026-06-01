/**
 * Loading state for the /auth route group.
 * Shows a full-screen centered spinner while auth pages (login/register) load.
 */

import LoadingScreen from "~/app/_components/LoadingScreen";

export default function AuthLoading() {
  return <LoadingScreen />;
}
