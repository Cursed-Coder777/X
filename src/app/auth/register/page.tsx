/**
 * Registration page — route: /auth/register
 *
 * Collects name, email, username, and password to create a new account.
 * On successful signup via tRPC user.signup mutation, automatically logs
 * the user in via NextAuth credentials signIn and redirects to home.
 * Displays validation errors (e.g., duplicate username/email) from the API.
 *
 * Desktop: Large X watermark SVG on the right half of the screen.
 */

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Signup mutation — creates the user, then auto-logs in
  const signupMutation = api.user.signup.useMutation({
    onSuccess: async () => {
      setIsLoading(true);
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (res?.ok) {
        window.location.href = "/";
      } else {
        alert("Signup successful but auto-login failed. Please login manually.");
        window.location.href = "/auth/login";
      }
    },
    onError: (err) => {
      setError(err.message);
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    signupMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left: form area */}
      <div className="flex flex-col items-center justify-center min-h-screen w-full lg:w-1/2">
        {/* X logo */}
        <div className="mb-8">
          <svg viewBox="0 0 24 24" className="h-9 w-9 fill-white" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        <h1 className="text-[clamp(28px,3vw,40px)] font-extrabold leading-tight mb-6 tracking-tight">
          Join X today.
        </h1>

        {/* Registration form */}
        <div className="flex flex-col gap-3 w-full max-w-[300px] px-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-sm bg-transparent border border-neutral-700 focus:border-[rgb(29,155,240)] text-white px-3 py-3.5 text-[17px] outline-none transition-colors placeholder:text-neutral-500" required disabled={isLoading} />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-sm bg-transparent border border-neutral-700 focus:border-[rgb(29,155,240)] text-white px-3 py-3.5 text-[17px] outline-none transition-colors placeholder:text-neutral-500" required disabled={isLoading} />
            <input type="text" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-sm bg-transparent border border-neutral-700 focus:border-[rgb(29,155,240)] text-white px-3 py-3.5 text-[17px] outline-none transition-colors placeholder:text-neutral-500" required disabled={isLoading} />
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-sm bg-transparent border border-neutral-700 focus:border-[rgb(29,155,240)] text-white px-3 py-3.5 pr-12 text-[17px] outline-none transition-colors placeholder:text-neutral-500" required disabled={isLoading} />
              <button type="button" onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={isLoading}
              className="w-full rounded-full bg-white text-black font-bold text-[17px] py-2.5 hover:bg-neutral-200 transition-colors disabled:opacity-50">
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* OR divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-800" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-black px-2 text-neutral-500">or</span></div>
          </div>

          {/* Terms */}
          <p className="text-neutral-500 text-[13px] text-center">
            By signing up, you agree to our{" "}
            <Link href="#" className="underline">Terms of Service</Link>,{" "}
            <Link href="#" className="underline">Privacy Policy</Link> and{" "}
            <Link href="#" className="underline">Cookie Use</Link>.
          </p>

          {/* Link to login */}
          <p className="text-[15px] mt-2 text-center">
            Already have an account?{" "}
            <a href="/auth/login" className="font-bold hover:underline" style={{ color: "rgb(29,155,240)" }}>Sign in</a>
          </p>
        </div>
      </div>

      {/* Right: giant X watermark (desktop only) */}
      <div className="hidden lg:flex flex-1 items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-[min(550px,45vw)] h-[min(550px,45vw)] fill-neutral-900" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
    </div>
  );
}
