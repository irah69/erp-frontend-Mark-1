"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkSession, logout, type CurrentUser } from "../lib/auth";
import { useEffect, useState } from "react";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/students", label: "Students" },
  { href: "/users", label: "Users" },
  { href: "/login", label: "Login" },
];

export default function Navigation() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { void checkSession().then(setUser); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <nav className="navigation" aria-label="Main navigation">
      <Link className="brand" href="/dashboard">Student ERP</Link>
      <div className="navigation-links">
        {navigationItems.filter((item) => item.href === "/dashboard" || item.href === "/login" || user?.role_id === 1).map((item) => (
          <Link className="navigation-button" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
        <button className="navigation-button" type="button" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
