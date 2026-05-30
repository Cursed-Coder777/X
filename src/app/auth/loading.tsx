/**
 * Loading state for the auth route group.
 * Shows a full-screen centered spinner while the auth pages load.
 */
import LoadingScreen from "~/app/_components/LoadingScreen";

export default function AuthLoading() {
  return <LoadingScreen />;
}
