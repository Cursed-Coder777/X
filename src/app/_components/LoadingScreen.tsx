/**
 * LoadingScreen — a full-screen centered spinner overlay.
 * Used by loading.tsx pages for route-level suspense fallbacks.
 * Semi-transparent black background with a large spinning X-blue loader icon.
 */

// Spinner icon from Lucide
import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    // Full-screen fixed overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      {/* Large spinning icon in X brand blue */}
      <Loader2 className="animate-spin" size={100} style={{ color: "rgb(29,155,240)" }} />
    </div>
  );
}
