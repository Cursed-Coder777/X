/**
 * AuthGuard — protects pages that require authentication.
 *
 * Behaviour:
 *   - While session is loading: shows a pulsing X logo (loading state)
 *   - If unauthenticated: immediately redirects to /auth/login
 *   - If authenticated: renders children normally
 *
 * Usage:
 *   <AuthGuard>
 *     <ProtectedPage />
 *   </AuthGuard>
 */

"use client";

// NextAuth session hook to check authentication status
import { useSession } from "next-auth/react";
// Router for redirecting unauthenticated users
import { useRouter } from "next/navigation";
// Effect hook to perform the redirect
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  // status is "loading" | "authenticated" | "unauthenticated"
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login page when the session is confirmed absent
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // While the session is being loaded, show a centered pulsing X logo
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white animate-pulse" aria-label="Loading">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
    );
  }

  // Render children only when we have a valid session
  return session ? <>{children}</> : null;
}
