/**
 * AuthGuard — protects routes that require authentication.
 * If the user is unauthenticated, redirects to /auth/login.
 * Shows a loading indicator while the session is being fetched.
 * Renders children only when a valid session exists.
 */
"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-500">
        Loading...
      </div>
    );
  }

  return session ? <>{children}</> : null;
}