/**
 * LoadingScreen — a full-screen centered spinner overlay.
 *
 * Used as a route-level loading fallback (loading.tsx pages) and for
 * async data-fetching states in profile and other pages.
 * Semi-transparent dark background with a large spinning X-blue loader.
 */

import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <Loader2 className="animate-spin" size={100} style={{ color: "rgb(29,155,240)" }} />
    </div>
  );
}
