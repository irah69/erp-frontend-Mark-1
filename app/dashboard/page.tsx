"use client";

import { useEffect, useState } from "react";
import AdminDashboard from "../../components/dashboards/admin-dashboard";
import ParentDashboard from "../../components/dashboards/parent-dashboard";
import StaffDashboard from "../../components/dashboards/staff-dashboard";
import StudentDashboard from "../../components/dashboards/student-dashboard";
import { checkSession, type CurrentUser } from "../../lib/auth";

const roleNames: Record<number, "admin" | "staff" | "student" | "parent"> = {
  1: "admin",
  2: "staff",
  3: "student",
  4: "parent",
};

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkSession().then(setUser).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <section className="page-section"><p className="state-text">Loading dashboard...</p></section>;
  if (!user) return <section className="page-section"><p className="alert error">Please sign in to access your dashboard.</p></section>;

  switch (roleNames[user.role_id]) {
    case "admin": return <AdminDashboard user={user} />;
    case "staff": return <StaffDashboard user={user} />;
    case "student": return <StudentDashboard user={user} />;
    case "parent": return <ParentDashboard user={user} />;
    default: return <section className="page-section"><p className="alert error">Your account does not have a supported dashboard role.</p></section>;
  }
}
