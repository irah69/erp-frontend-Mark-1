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
import { ThemeSelector } from "./theme-provider";

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
  { href: "/exams", label: "Examinations", icon: BookOpen, roles: [1, 2, 3] },
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
        className={`flex min-w-0 flex-col gap-1 whitespace-nowrap ${
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
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const mobileOpen = Boolean(pathname && mobilePath === pathname);
  const expanded = pinned || hovered;
  const collapsed = !expanded;

  const hidden = pathname === "/login" || pathname?.startsWith("/login/");
  const currentUserId = user?.id ?? null;

  function togglePin() {
    setPinned((current) => !current);
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
      <header className="app-mobile-header fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950 px-4 lg:hidden">
        <Brand size={36} />
        <button
          type="button"
          onClick={toggleMobile}
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="relative grid h-11 w-11 place-items-center rounded-lg text-slate-300 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/70"
        >
          <Menu
            size={22}
            className={`absolute transition-opacity duration-150 ${
              mobileOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <X
            size={22}
            className={`absolute transition-opacity duration-150 ${
              mobileOpen ? "opacity-100" : "opacity-0"
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
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-150 motion-reduce:transition-none lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar: drawer on mobile, collapsible rail on lg+ */}
      <aside
        id="app-sidebar"
        data-pinned={pinned}
        data-expanded={expanded}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-white/10 bg-slate-950 text-slate-300 transition-[width,opacity] duration-200 motion-reduce:transition-none lg:visible lg:opacity-100 ${
          mobileOpen ? "visible opacity-100" : "pointer-events-none invisible opacity-0 lg:pointer-events-auto"
        }`}
      >
        {/* Header: logo only when collapsed */}
        <div className={`relative flex h-16 shrink-0 items-center justify-between gap-3 px-4 lg:h-24 lg:px-[18px] ${collapsed ? "lg:h-auto lg:flex-col lg:justify-start lg:gap-3 lg:px-2 lg:py-3" : ""}`}>
          <Brand size={36} collapsed={collapsed} />

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobilePath(null)}
            aria-label="Close navigation menu"
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-400 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/70 lg:hidden"
          >
            <X size={20} />
          </button>

          {/* Desktop pin / unpin */}
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={pinned}
            aria-label={pinned ? "Return sidebar to hover mode" : "Keep sidebar expanded"}
            title={pinned ? "Return to hover mode" : "Keep expanded"}
            className={`hidden h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${expanded ? "lg:grid" : ""}`}
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

          {links.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobilePath(null)}
                className={`group relative flex items-center gap-3 rounded-xl px-[18px] py-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-cyan-400/70 lg:py-2.5 ${collapsed ? "lg:justify-center lg:px-0" : ""} ${
                  mobileOpen ? "opacity-100" : "max-lg:opacity-0"
                } ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400 transition-opacity duration-150 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />

                <Icon
                  size={20}
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className={`shrink-0 transition-colors duration-150 ${
                    active ? "text-cyan-300" : "group-hover:text-cyan-300"
                  }`}
                />
                <span className={`truncate whitespace-nowrap ${collapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : ""}`}>
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
        <div className={`relative shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${collapsed ? "lg:hidden" : ""}`}>
          <div className={collapsed ? "lg:hidden" : ""}>
            <ThemeSelector />
          </div>
          <div
            className={`flex items-center gap-3 rounded-xl bg-white/5 p-2 ring-1 ring-inset ring-white/5 ${
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
              className={`flex min-w-0 flex-1 flex-col whitespace-nowrap ${
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
              className={`group grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-400 outline-none transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-400/70 ${hideWhenCollapsed}`}
            >
              <LogOut
                size={18}
                strokeWidth={1.9}
                aria-hidden="true"
                className=""
              />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
