"use client";

import { useEffect, useState } from "react";
import StudentAttendance from "../../components/dashboards/student-attendance";
import { checkSession, type CurrentUser } from "../../lib/auth";
import Loader from "../../components/ui/loader";

export default function StudentAttendancePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void checkSession().then((currentUser) => {
      if (!cancelled) {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <Loader title="Loading your attendance..." subtitle="Checking your account" className="min-h-dvh" />;
  }
  if (!user) {
    return (
      <main className="min-h-dvh bg-slate-50 px-4 py-10 text-center text-sm text-red-700" role="alert">
        Please sign in to view your attendance.
      </main>
    );
  }
  if (Number(user.role_id) !== 3) {
    return (
      <main className="min-h-dvh bg-slate-50 px-4 py-10 text-center text-sm text-red-700" role="alert">
        This page is only available to student accounts.
      </main>
    );
  }

  return <StudentAttendance user={user} />;
}
