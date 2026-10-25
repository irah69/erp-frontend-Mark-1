"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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


      </div>

      {/* Right: form panel */}
      <div className="relative flex items-center justify-center px-6 py-16 sm:px-12 lg:px-16 lg:py-10">
        {/* Back button for screens without the image panel */}


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
              {/* <label
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
              </label> */}
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



        </motion.div>
      </div>
    </main>
  );
}
