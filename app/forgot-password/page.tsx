"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not request a reset link.");
      setMessage(data.message || "If an account exists for that email, a reset link has been sent.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/login" className="text-sm font-semibold text-blue-700 hover:underline">Solvane ERP</Link>
        <h1 className="mt-7 text-2xl font-bold tracking-tight text-slate-900">Forgot your password?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter the email address on your account. If it matches, we will send you a reset link.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">Email address</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" placeholder="you@example.com" />
          </div>
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{loading ? "Sending..." : "Send reset link"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600"><Link href="/login" className="font-semibold text-blue-700 hover:underline">Back to sign in</Link></p>
      </section>
    </main>
  );
}
