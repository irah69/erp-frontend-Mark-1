"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { checkSession, logout, type CurrentUser } from "../lib/auth";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", adminOnly: false },
  { href: "/students", label: "Students", adminOnly: true },
  { href: "/scheduling", label: "Scheduling", adminOnly: true },
  { href: "/attendance", label: "Attendance", adminOnly: true },
  { href: "/users", label: "Users", adminOnly: true },
];

const HIDDEN_ON = ["/login"];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [open, setOpen] = useState(false);

  const hidden = HIDDEN_ON.some((path) => pathname === path || pathname?.startsWith(`${path}/`));

  // The navbar lives in the layout, so it is NOT remounted after login.
  // Re-check the session on every route change so links appear right after signing in.
  useEffect(() => {
    if (hidden) {
      setUser(null);
      return;
    }
    let cancelled = false;
    void checkSession()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, hidden]);

  // Close the mobile menu on navigation and on Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    setOpen(false);
    try {
      await logout();
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }

  if (hidden) return null;

  const links = navigationItems.filter((item) => !item.adminOnly || user?.role_id === 1);
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    [
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      isActive(href) ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100",
    ].join(" ");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4"
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            S
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">Student ERP</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={linkClass(item.href)}
            >
              {item.label}
            </Link>
          ))}

          <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden="true" />

          {user?.email && (
            <span className="mr-2 hidden max-w-[180px] truncate text-sm text-slate-500 lg:inline">
              {user.email}
            </span>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Sign out
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-800 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
        >
          <MenuToggleIcon open={open} />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden"
      >
        <div className="grid gap-1">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`${linkClass(item.href)} py-3 text-base`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3">
          {user?.email && <p className="truncate px-1 text-sm text-slate-500">{user.email}</p>}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function MenuToggleIcon({ open }: { open: boolean }) {
  const bar = "absolute left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-current transition-all duration-200";
  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <span className={`${bar} ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[5px]"}`} />
      <span className={`${bar} top-1/2 -translate-y-1/2 ${open ? "opacity-0" : "opacity-100"}`} />
      <span className={`${bar} ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-[14px]"}`} />
    </span>
  );
}