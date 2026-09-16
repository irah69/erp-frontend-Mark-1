"use client";

import { FormEvent, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, Mail, Loader2 } from "lucide-react";
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
    src: "/school2.jpg",
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
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 110, damping: 14 },
  },
};

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
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-6 sm:px-6 sm:py-10 lg:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl lg:min-h-[640px] lg:grid-cols-2 lg:rounded-3xl"
      >
        {/* Left: visual panel — hidden on small screens where vertical space is scarce */}
        <div className="relative hidden lg:block">
          <ImageSlider images={slides} interval={5500} />

          {/* <div className="absolute left-10 top-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              <span className="text-lg font-bold text-slate-950">S</span>
            </div>
            <span className="text-sm font-semibold tracking-wide text-white">
              Student ERP
            </span>
          </div> */}
        </div>

        {/* Right: form panel */}
        <div className="flex w-full items-center justify-center px-5 py-10 sm:px-10 sm:py-14 lg:px-14">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-sm"
          >
            {/* Compact brand mark for mobile/tablet, where the visual panel is hidden */}
            <motion.div
              variants={itemVariants}
              className="mb-8 flex items-center gap-3 lg:hidden"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                <span className="text-xl font-bold text-slate-950">S</span>
              </div>
              <span className="text-base font-semibold text-white">
                Student ERP
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mb-6 flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg shadow-slate-950/30">
                <span className="text-xl font-bold text-slate-950">S</span>
              </div>
              <div>
                <p className="text-base font-semibold tracking-wide text-white">
                  Student ERP
                </p>
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                  Campus Portal
                </p>
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              Welcome back
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-2 text-sm text-slate-400"
            >
              Sign in to access your dashboard.
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
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gmail.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-400 focus:ring-2 focus:ring-slate-700"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-slate-400 focus:ring-2 focus:ring-slate-700"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </motion.form>

            <motion.p
              variants={itemVariants}
              className="mt-8 text-xs text-slate-600"
            >
              Student ERP • Secure access
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}