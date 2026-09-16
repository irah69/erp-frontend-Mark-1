"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { checkSession, logout, type CurrentUser } from "../lib/auth";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students" },
  { href: "/users", label: "Users" },
];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkSession().then(setUser);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Float + blur the bar once the page has moved a little
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the sheet on route change and on Escape
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.replace("/login");
  }

  const links = navigationItems.filter(
    (item) => item.href === "/dashboard" || user?.role_id === 1
  );

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header
      className={[
        "sticky top-0 z-50 mx-auto w-full max-w-6xl border-b border-transparent",
        "md:rounded-2xl md:border md:transition-all md:duration-300 md:ease-out",
        open
          ? "bg-slate-950"
          : scrolled
            ? "border-slate-800 bg-slate-950/80 backdrop-blur-lg md:top-4 md:max-w-5xl md:shadow-2xl md:shadow-black/40"
            : "md:border-transparent",
      ].join(" ")}
    >
      <nav
        aria-label="Main navigation"
        className={[
          "flex h-16 w-full items-center justify-between px-4 md:h-14",
          "md:transition-all md:duration-300 md:ease-out",
          scrolled ? "md:px-3" : "md:px-5",
        ].join(" ")}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-950">
            S
          </span>
          <span className="text-sm font-semibold tracking-tight text-black">
            Student ERP
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={[
                "rounded-xl border px-3 py-2 text-sm font-medium shadow-[0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                isActive(item.href)
                  ? "border-white/20 bg-white/12 text-black shadow-[0_12px_32px_rgba(255,255,255,0.12)]"
                  : "border-white/10 bg-white/5 text-black hover:bg-white/10 hover:text-black",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}

          <span className="mx-2 h-5 w-px bg-slate-800" aria-hidden="true" />

          {user?.email && (
            <span className="mr-1 hidden max-w-[180px] truncate text-sm text-black lg:inline">
              {user.email}
            </span>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm font-medium text-black shadow-[0_8px_24px_rgba(148,163,184,0.18)] backdrop-blur-xl transition-all duration-200 hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Sign out
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-black shadow-[0_8px_24px_rgba(148,163,184,0.18)] backdrop-blur-xl transition-all duration-200 hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:hidden"
        >
          <MenuToggleIcon open={open} />
        </button>
      </nav>

      {/* Mobile sheet */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col justify-between gap-4 border-t border-slate-800 bg-slate-950 p-4 md:hidden"
      >
        <div className="grid gap-1">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={[
                "rounded-xl border px-4 py-3 text-base font-medium shadow-[0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl transition-all duration-200",
                isActive(item.href)
                  ? "border-white/20 bg-white/12 text-black shadow-[0_12px_32px_rgba(255,255,255,0.12)]"
                  : "border-white/10 bg-white/5 text-black hover:bg-white/10",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
          {user?.email && (
            <p className="truncate px-1 text-sm text-black">{user.email}</p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-white/15 bg-white/10 py-3 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(148,163,184,0.22)] backdrop-blur-xl transition-all duration-200 hover:bg-white/15"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function MenuToggleIcon({ open }: { open: boolean }) {
  const bar =
    "absolute left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-current transition-all duration-300 ease-out";

  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <span
        className={`${bar} ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[6px]"}`}
      />
      <span
        className={`${bar} top-1/2 -translate-y-1/2 ${open ? "opacity-0" : "opacity-100"}`}
      />
      <span
        className={`${bar} ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-[13px]"}`}
      />
    </span>
  );
}