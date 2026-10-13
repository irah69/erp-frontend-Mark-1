"use client";

import Link from "next/link";
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
  PanelsTopLeft,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { checkSession, logout, type CurrentUser } from "../lib/auth";

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
  { href: "/users", label: "Users", icon: UsersRound, roles: [1] },
  { href: "/schedule", label: "My schedule", icon: CalendarDays, roles: [2, 3] },
  { href: "/staff-attendance", label: "Attendance", icon: ClipboardCheck, roles: [2] },
  { href: "/profile", label: "My profile", icon: UserRound, roles: [2, 3] },
];

const roleLabels: Record<number, string> = {
  1: "Administrator",
  2: "Staff",
  3: "Student",
  4: "Parent",
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const mobileOpen = Boolean(pathname && mobilePath === pathname);

  const hidden = pathname === "/login" || pathname?.startsWith("/login/");

  useEffect(() => {
    if (hidden) {
      return;
    }

    let cancelled = false;
    void checkSession().then((currentUser) => {
      if (!cancelled) setUser(currentUser);
    });

    return () => {
      cancelled = true;
    };
  }, [hidden, pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobilePath(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

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

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobilePath(null)}
        />
      )}

      <aside className={`app-sidebar${mobileOpen ? " app-sidebar-mobile-open" : ""}`}>

<div className="flex min-h-[100px] items-center justify-between gap-3 px-5 py-5">
  <Link
    href="/dashboard"
    className="group flex min-w-0 items-center gap-3.5 no-underline"
    aria-label="Solvane Student ERP dashboard"
  >
    <Image
      src="/logo.png"
      alt="Solvane logo"
      width={52}
      height={52}
      className="h-[52px] w-[52px] shrink-0 object-contain"
      priority
    />

    <span className="flex min-w-0 flex-col justify-center gap-1">
      <span className="text-[26px] font-extrabold leading-none tracking-tight">
        Solvane
      </span>

      <span className="text-[9px] font-semibold uppercase tracking-[1.6px] text-gray-500">
        Powered by <span className="font-extrabold text-grey-900">IRAH</span>
      </span>
    </span>
  </Link>

  <button
    type="button"
    className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100"
    onClick={() =>
      setMobilePath((currentPath) =>
        currentPath === pathname ? null : pathname
      )
    }
    aria-expanded={mobileOpen}
    aria-controls="sidebar-links"
    aria-label={
      mobileOpen ? "Close navigation menu" : "Open navigation menu"
    }
  >
    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
  </button>
</div>


        <div className="sidebar-user">
          <span className="sidebar-avatar" aria-hidden="true">{initials}</span>
          <span className="sidebar-user-details">
            <strong>{displayName}</strong>
            <span>{roleLabels[user.role_id] ?? "Account"}</span>
          </span>
        </div>

        <nav id="sidebar-links" className="sidebar-links" aria-label="Main navigation">
          <p className="sidebar-section-label">
            {user.role_id === 1 ? "Workspace" : "Your workspace"}
          </p>
          {links.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
                onClick={() => setMobilePath(null)}
              >
                <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                <span className="sidebar-link-label">{item.label}</span>
                {active && <span className="sidebar-active-indicator" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-account">
            <span className="sidebar-avatar sidebar-avatar-small" aria-hidden="true">{initials}</span>
            <span className="sidebar-user-details">
              <strong>{displayName}</strong>
              <span>{user.email}</span>
            </span>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={18} strokeWidth={1.9} aria-hidden="true" />
            <span className="sidebar-link-label">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
