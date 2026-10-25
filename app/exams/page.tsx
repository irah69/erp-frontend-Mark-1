"use client";

import { useEffect, useState } from "react";
import AdminExam from "../../components/exams/admin-exam";
import StaffExam from "../../components/exams/staff-exam";
import StudentExam from "../../components/exams/student-exam";
import { checkSession, type CurrentUser } from "../../lib/auth";

export default function ExamsPage() {
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
    return <main className="min-h-dvh bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Loading examinations…</main>;
  }
  if (!user) {
    return <main className="min-h-dvh bg-slate-50 px-4 py-10 text-center text-sm text-red-700" role="alert">Please sign in to access examinations.</main>;
  }

  switch (Number(user.role_id)) {
    case 1:
      return <AdminExam />;
    case 2:
      return <StaffExam />;
    case 3:
      return user.person_id == null
        ? <main className="min-h-dvh bg-slate-50 px-4 py-10 text-center text-sm text-red-700" role="alert">Your student account is not linked to a student profile.</main>
        : <StudentExam user={user} />;
    default:
      return <main className="min-h-dvh bg-slate-50 px-4 py-10 text-center text-sm text-red-700" role="alert">This page is not available to your account role.</main>;
  }
}
