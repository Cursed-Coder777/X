/**
 * Loading state for the post detail page.
 * Shows a full-screen centered spinner while the post data loads.
 */
import LoadingScreen from "~/app/_components/LoadingScreen";

export default function PostLoading() {
  return <LoadingScreen />;
}
