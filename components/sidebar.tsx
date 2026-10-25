"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelsTopLeft,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { checkSession, logout, type CurrentUser } from "../lib/auth";
import { getMyUserProfile, getUserProfileImage } from "../lib/api";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: number[];
};

const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [1, 2, 3, 4] },
  { href: "/students", label: "Students", icon: GraduationCap, roles: [1] },
  { href: "/staff", label: "Staff", icon: BriefcaseBusiness, roles: [1] },
  { href: "/class", label: "Classes", icon: PanelsTopLeft, roles: [1] },
  { href: "/academic", label: "Grades", icon: BookOpen, roles: [1] },
  { href: "/scheduling", label: "Scheduling", icon: CalendarRange, roles: [1] },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: [1] },
  { href: "/student-attendance", label: "My attendance", icon: ClipboardCheck, roles: [3] },
  { href: "/users", label: "Users", icon: UsersRound, roles: [1] },
  { href: "/schedule", label: "My schedule", icon: CalendarDays, roles: [2, 3] },
  { href: "/my-class", label: "My class", icon: PanelsTopLeft, roles: [2] },
  { href: "/staff-attendance", label: "Attendance", icon: ClipboardCheck, roles: [2] },
  { href: "/profile", label: "My profile", icon: UserRound, roles: [1, 2, 3, 4] },
];

const roleLabels: Record<number, string> = {
  1: "Administrator",
  2: "Staff",
  3: "Student",
  4: "Parent",
};

const PIN_KEY = "sidebar-pinned";

function Brand({ size = 40, collapsed = false }: { size?: number; collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      aria-label="Solvane Student ERP dashboard"
      className={`group flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
        collapsed ? "lg:gap-0" : ""
      }`}
    >
    <div
  className="relative shrink-0"
  style={{ width: size, height: size }}
>
  <Image
    src="/logo.png"
    alt="Solvane logo"
    fill
    priority
    sizes={`${size}px`}
    className="object-contain"
  />
</div>
      <span
        className={`flex min-w-0 flex-col gap-1 whitespace-nowrap transition-all duration-300 motion-reduce:transition-none ${
          collapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : ""
        }`}
      >
        <span className="truncate text-xl font-extrabold leading-none tracking-tight text-white">
          Solvane
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[1.6px] text-slate-400">
          Powered by <span className="font-extrabold text-slate-200">IRAH</span>
        </span>
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<{
    userId: number;
    url: string;
  } | null>(null);
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false); // desktop: keep expanded + push content
  const [peek, setPeek] = useState(false); // desktop: hover/focus expands as overlay
  const mobileOpen = Boolean(pathname && mobilePath === pathname);

  // Desktop is expanded when pinned or being hovered/focused
  const expanded = pinned || peek;
  const collapsed = !expanded;

  const hidden = pathname === "/login" || pathname?.startsWith("/login/");
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    try {
      setPinned(localStorage.getItem(PIN_KEY) === "true");
    } catch {}
  }, []);

  function togglePin() {
    setPinned((current) => {
      const next = !current;
      try {
        localStorage.setItem(PIN_KEY, String(next));
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    void checkSession().then((currentUser) => {
      if (!cancelled) setUser(currentUser);
    });
    return () => {
      cancelled = true;
    };
  }, [hidden, pathname]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (currentUserId === null) {
      return () => {
        cancelled = true;
      };
    }
    const activeUserId = currentUserId;

    async function loadProfileAvatar() {
      try {
        const profile = await getMyUserProfile();
        if (cancelled || profile.image_id === null) return;

        const image = await getUserProfileImage(profile.image_id);
        objectUrl = URL.createObjectURL(image);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
        } else {
          setProfileAvatar({ userId: activeUserId, url: objectUrl });
        }
      } catch (avatarError) {
        console.error("Unable to load the sidebar profile image.", avatarError);
      }
    }

    void loadProfileAvatar();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentUserId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobilePath(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobilePath(null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  async function handleLogout() {
    setMobilePath(null);
    try {
      await logout();
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }

  if (hidden || !user) return null;

  const links = navigationItems.filter((item) => item.roles.includes(user.role_id));
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);
  const displayName = user.username || user.email;
  const initials = displayName.slice(0, 1).toUpperCase();
  const avatarUrl =
    profileAvatar?.userId === user.id ? profileAvatar.url : null;
  const toggleMobile = () => setMobilePath((cur) => (cur === pathname ? null : pathname));

  // Classes that only apply on lg+ when the rail is collapsed
  const hideWhenCollapsed = collapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : "";

  return (
    <>
      {/* Mobile / tablet top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur-md lg:hidden">
        <Brand size={36} />
        <button
          type="button"
          onClick={toggleMobile}
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-300 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/70 active:scale-90"
        >
          <Menu
            size={22}
            className={`absolute transition-all duration-300 motion-reduce:transition-none ${
              mobileOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <X
            size={22}
            className={`absolute transition-all duration-300 motion-reduce:transition-none ${
              mobileOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            }`}
          />
        </button>
      </header>

      {/* Backdrop (mobile only) */}
      <button
        type="button"
        tabIndex={mobileOpen ? 0 : -1}
        aria-hidden={!mobileOpen}
        aria-label="Close navigation menu"
        onClick={() => setMobilePath(null)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar: drawer on mobile, collapsible rail on lg+ */}
      <aside
        id="app-sidebar"
        data-pinned={pinned}
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        onFocus={() => setPeek(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPeek(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col overflow-hidden border-r border-white/10 bg-slate-950 text-slate-300 transition-[transform,visibility,width,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:visible lg:translate-x-0 ${
          collapsed ? "lg:w-20" : "lg:w-72"
        } ${
          expanded && !pinned ? "lg:shadow-2xl lg:shadow-black/60" : "lg:shadow-none"
        } ${
          mobileOpen
            ? "translate-x-0 shadow-2xl shadow-black/60"
            : "-translate-x-full max-lg:invisible"
        }`}
      >
        {/* Soft brand glow */}
        {/* <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-violet-600/15 via-cyan-500/5 to-transparent"
        /> */}

        {/* Header: logo only when collapsed */}
        <div className="relative flex h-16 shrink-0 items-center justify-between gap-3 px-4 lg:h-24 lg:px-[18px]">
          <Brand size={44} collapsed={collapsed} />

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobilePath(null)}
            aria-label="Close navigation menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/70 active:scale-90 lg:hidden"
          >
            <X size={20} />
          </button>

          {/* Desktop pin / unpin */}
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={pinned}
            aria-label={pinned ? "Collapse sidebar" : "Pin sidebar open"}
            title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
            className={`hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 outline-none transition-all duration-300 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/70 active:scale-90 lg:grid ${
              collapsed ? "lg:pointer-events-none lg:w-0 lg:opacity-0" : ""
            }`}
          >
            {pinned ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav
          id="sidebar-links"
          aria-label="Main navigation"
          className="relative flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-4 pt-2 [scrollbar-color:#334155_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {/* Section label (expanded) / divider (collapsed) */}

<div
  className={`flex items-center justify-between px-3 pb-2 ${
    collapsed ? "lg:hidden" : ""
  }`}
>
  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
    {user.role_id === 1 ? "Workspace" : "Your workspace"}
  </p>

<p className="text-[10px] font-semibold text-white/60 [text-shadow:none] [filter:none]">
  {roleLabels[user.role_id] ?? "Account"}
</p>
</div>

          {collapsed && <div aria-hidden="true" className="mx-3 mb-3 hidden h-px bg-white/10 lg:block" />}

          {links.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobilePath(null)}
                style={{ transitionDelay: mobileOpen ? `${80 + index * 35}ms` : "0ms" }}
                className={`group relative flex items-center gap-3 rounded-xl px-[18px] py-3 text-sm font-medium outline-none transition-all duration-300 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 lg:py-2.5 ${
                  mobileOpen ? "" : "max-lg:-translate-x-3 max-lg:opacity-0"
                } ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 origin-center rounded-r-full bg-cyan-400 transition-transform duration-300 ${
                    active ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50"
                  }`}
                />

                <Icon
                  size={20}
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className={`shrink-0 transition-all duration-300 group-hover:scale-110 group-active:scale-95 ${
                    active ? "text-cyan-300" : "group-hover:text-cyan-300"
                  }`}
                />
                <span className="truncate whitespace-nowrap transition-all duration-300 group-hover:translate-x-0.5">
                  {item.label}
                </span>

                {active && (
                  <span
                    aria-hidden="true"
                    className={`ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.6)] ${
                      collapsed ? "lg:hidden" : ""
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Account */}
        <div className="relative shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div
            className={`flex items-center gap-3 rounded-xl bg-white/5 p-2 ring-1 ring-inset ring-white/5 transition-all duration-300 ${
              collapsed ? "lg:gap-0" : ""
            }`}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                aria-hidden="true"
                title={displayName}
                width={40}
                height={40}
                unoptimized
                className="size-10 shrink-0 rounded-xl object-cover shadow-md"
              />
            ) : (
              <span
                aria-hidden="true"
                title={displayName}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white"
              >
                {initials}
              </span>
            )}
            <span
              className={`flex min-w-0 flex-1 flex-col whitespace-nowrap transition-all duration-300 ${
                collapsed ? "lg:flex-none lg:w-0 lg:overflow-hidden lg:opacity-0" : ""
              }`}
            >
              <strong className="truncate text-sm font-semibold text-white">{displayName}</strong>
              <span className="truncate text-xs text-slate-400" title={user.email}>
                {user.email}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              tabIndex={collapsed ? -1 : 0}
              className={`group grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 outline-none transition-all duration-300 hover:bg-red-500/10 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-400/70 active:scale-90 ${hideWhenCollapsed}`}
            >
              <LogOut
                size={18}
                strokeWidth={1.9}
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}