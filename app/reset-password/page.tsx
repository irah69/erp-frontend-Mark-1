"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { API_BASE_URL } from "../../lib/api";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) {
      setError("This reset link is missing its token. Request a new link.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not reset your password.");
      setMessage(data.message || "Password updated. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Please request a new link and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/login" className="text-sm font-semibold text-blue-700 hover:underline">Solvane ERP</Link>
        <h1 className="mt-7 text-2xl font-bold tracking-tight text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your reset link is valid for 30 minutes and can only be used once.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">New password</label>
            <input id="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
            <p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-800">Confirm new password</label>
            <input id="confirm-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10" />
          </div>
          {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message} <Link href="/login" className="font-semibold underline">Sign in</Link></p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading || Boolean(message)} className="h-12 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{loading ? "Updating..." : "Reset password"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600"><Link href="/forgot-password" className="font-semibold text-blue-700 hover:underline">Request another reset link</Link></p>
      </section>
    </main>
  );
}
