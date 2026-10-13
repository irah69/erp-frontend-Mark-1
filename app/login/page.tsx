"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "../../lib/api";
import { ImageSlider, SliderImage } from "../../components/image-slider";

const slides: SliderImage[] = [
  {
    src: "/school1.jpg",
    title: "Your semester, in one place",
    caption: "Attendance, marks, fees and timetable — always current.",
  },
  {
    src: "/school2.png",
    title: "Results the moment they publish",
    caption: "No queues, no notice boards. Internals land straight on your dashboard.",
  },
  {
    src: "/school3.jpg",
    title: "Faculty and students, same page",
    caption: "Announcements, assignments and approvals move in one thread.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 14, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 110, damping: 14 },
  },
};

/* Brand details — swap the logo file in /public and edit the text here */
const BRAND = {
  logo: "/logo1.png",
  name: "Solvane",
  tagline: "Powerd By IRAH",
};

const inputClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

const socialClass =
  "flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-900" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid email or password");
      }

      // Store JWT token
      localStorage.setItem("access_token", data.access_token);

      // Store user information
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh w-full bg-white lg:grid-cols-2">
      {/* Left: visual panel (desktop only) */}
      <div className="relative hidden bg-slate-900 lg:block lg:min-h-dvh">
        <ImageSlider images={slides} interval={5500} />

        <Link
          href="/"
          aria-label="Go back"
          className="absolute left-6 top-6 z-20 grid h-10 w-10 place-items-center rounded-full bg-slate-900/70 text-white backdrop-blur transition hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      {/* Right: form panel */}
      <div className="relative flex items-center justify-center px-6 py-16 sm:px-12 lg:px-16 lg:py-10">
        {/* Back button for screens without the image panel */}
        <Link
          href="/"
          aria-label="Go back"
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:left-8 sm:top-8 lg:hidden"
        >
          <ArrowLeft size={18} />
        </Link>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-sm"
        >
          {/* Brand: logo + name side by side, tagline underneath both */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3">
              <Image
                src={BRAND.logo}
                alt={`${BRAND.name} logo`}
                width={44}
                height={44}
                priority
                className="h-11 w-11 shrink-0 rounded-xl object-contain"
              />
              <span className="text-xl font-bold tracking-tight text-slate-900">
                {BRAND.name}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{BRAND.tagline}</p>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-3xl font-bold tracking-tight text-slate-900"
          >
            Welcome Back
          </motion.h1>

          <motion.p variants={itemVariants} className="mt-2 text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Sign up
            </Link>
          </motion.p>

          <motion.form
            variants={itemVariants}
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me / Forgot password */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="remember"
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"
              >
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-slate-400 accent-slate-900"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </motion.form>

          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="my-8 flex items-center gap-3"
            role="separator"
          >
            <span className="h-px flex-1 bg-slate-300" />
            <span className="text-sm text-slate-500">or</span>
            <span className="h-px flex-1 bg-slate-300" />
          </motion.div>


        </motion.div>
      </div>
    </main>
  );
}