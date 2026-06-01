/**
 * Loading state for the post detail page (/post/[postId]).
 * Shows a full-screen centered spinner while the post and comments load.
 * Used by Next.js as the Suspense fallback for this dynamic route.
 */

import LoadingScreen from "~/app/_components/LoadingScreen";

export default function PostLoading() {
  return <LoadingScreen />;
}
