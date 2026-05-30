/**
 * LoadingScreen — a full-screen centered spinner overlay.
 * Used by loading.tsx pages for route-level suspense fallbacks.
 * Semi-transparent black background with a large spinning X-blue loader icon.
 */
import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <Loader2 className="animate-spin" size={100} style={{ color: "rgb(29,155,240)" }} />
    </div>
  );
}
