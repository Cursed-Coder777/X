/**
 * Login page — two-step authentication flow.
 * Step 1: Enter email or username (with disabled social provider buttons for UI).
 * Step 2: Enter password with show/hide toggle.
 *
 * Uses NextAuth signIn() with credentials provider on form submission.
 * On success, redirects to home. On error, displays error message.
 * Large X watermark on the right side (desktop only).
 */
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
  const [step, setStep] = useState<"identifier" | "password">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError("");
    setStep("password");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const res = await signIn("credentials", {
      email: identifier,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Wrong email, phone, or password.");
      setIsLoading(false);
    } else if (res?.ok) {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left: form area */}
      <div className="flex flex-col items-center min-h-screen w-[50%] justify-center">
        {/* X Logo */}
        <div className="mb-10">
          <svg viewBox="0 0 24 24" className="h-9 w-9 fill-white" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        <h1 className="text-[clamp(28px,3vw,40px)] font-extrabold leading-tight mb-8 tracking-tight">
          Happening now.
        </h1>

        {step === "identifier" ? (
          <>
            {/* Provider Buttons (UI only — no functionality yet) */}
            <div className="flex flex-col gap-3 w-full max-w-[300px]">
              <button
                type="button"
                className="opacity-30 flex items-center justify-center gap-3 w-full rounded-full border border-neutral-700 bg-white text-black font-semibold text-[15px] py-2.5 px-4 hover:bg-neutral-100 transition-colors"
              >
                {/* Phone icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                </svg>
                Continue with phone
              </button>

              <button
                type="button"
                className="opacity-30 flex items-center justify-center gap-3 w-full rounded-full border border-neutral-700 bg-white text-black font-semibold text-[15px] py-2.5 px-4 hover:bg-neutral-100 transition-colors"
              >
                {/* Google icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                className="opacity-30 flex items-center justify-center gap-3 w-full rounded-full border border-neutral-700 bg-white text-black font-semibold text-[15px] py-2.5 px-4 hover:bg-neutral-100 transition-colors"
              >
                {/* Apple icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Continue with Apple
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-neutral-800" />
                <span className="text-neutral-500 text-[15px]">or</span>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>

              {/* Email/username input */}
              <form onSubmit={handleContinue} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Email or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-sm bg-transparent border border-neutral-700 focus:border-[rgb(29,155,240)] text-white px-3 py-3.5 text-[17px] outline-none transition-colors placeholder:text-neutral-500"
                  required
                  autoComplete="username"
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  className="w-full rounded-full bg-neutral-200 text-black font-bold text-[17px] py-2.5 hover:bg-white transition-colors"
                >
                  Continue
                </button>
              </form>

              <p className="text-neutral-500 text-[13px] text-center mt-2">
                By continuing, you agree to our{" "}
                <Link href="#" className="underline">Terms of Service</Link>,{" "}
                <Link href="#" className="underline">Privacy Policy</Link>{" "}
                and{" "}
                <Link href="#" className="underline">Cookie Use</Link>.
              </p>

              <p className="text-[15px] mt-4">
                Don&apos;t have an account?{" "}
                <a href="/auth/register" className="font-bold hover:underline" style={{ color: "rgb(29,155,240)" }}>
                  Sign up
                </a>
              </p>
            </div>
          </>
        ) : (
          /* Step 2: password */
          <div className="flex flex-col gap-3 w-full max-w-[300px]">
            <p className="text-neutral-400 text-sm mb-1">Signing in as <strong className="text-white">{identifier}</strong></p>
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-sm bg-transparent border border-neutral-700 focus:border-[rgb(29,155,240)] text-white px-3 py-3.5 pr-12 text-[17px] outline-none transition-colors placeholder:text-neutral-500"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading || !password.trim()}
                className="w-full rounded-full bg-white text-black font-bold text-[17px] py-2.5 hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : "Log in"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("identifier"); setError(""); }}
                className="w-full rounded-full border border-neutral-700 text-white font-bold text-[17px] py-2.5 hover:bg-neutral-900 transition-colors"
              >
                Back
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Right: giant X watermark */}
      <div className="hidden lg:flex flex-1 items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-[min(550px,45vw)] h-[min(550px,45vw)] fill-neutral-900"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
    </div>
  );
}