"use client";
import AuthGuard from "~/app/_components/AuthGuard";

export default function HomePage() {
  return (
    <AuthGuard>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Welcome to X Clone!</h1>
        {/* Tumhara dashboard / feed yahan */}
      </div>
    </AuthGuard>
  );
}