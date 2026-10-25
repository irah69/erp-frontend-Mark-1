"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity, ArrowUpRight, BookOpen, CalendarDays, ClipboardCheck,
  GraduationCap, PanelsTopLeft, RefreshCw, UsersRound, type LucideIcon,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { CurrentUser } from "../../lib/auth";
import {
  apiRequest, getAttendanceRecords, getClassSessions, getSchedulingGrades, getSchedulingSections,
  getSchedulingStaff, getTimetables, type AttendanceRecord,
  type ClassSessionRecord, type GradeOption, type SectionOption, type StaffOption,
  type StudentRecord, type TimetableRecord,
} from "../../lib/api";
import { getExamResults, listExams, type ExamRecord, type ExamResultsResponse } from "../../lib/examApi";
import Loader from "../ui/loader";

type DashboardStudent = StudentRecord & {
  admission_date?: string | null;
  created_at?: string | null;
  grade?: string | null;
  section?: string | null;
};
type DashboardUser = { id: number; role_id: number; is_active: boolean };
type DashboardRole = { id: number; name?: string; role_name?: string };
type DashboardData = {
  students: DashboardStudent[];
  staff: StaffOption[];
  users: DashboardUser[];
  roles: DashboardRole[];
  grades: GradeOption[];
  sections: SectionOption[];
  sessions: ClassSessionRecord[];
  timetables: TimetableRecord[];
  exams: ExamRecord[];
  errors: string[];
};
type RangeKey = "7d" | "30d" | "month" | "custom";
type AttendancePoint = { date: string; label: string; rate: number; present: number; absent: number; late: number; total: number };
type PerformancePoint = { exam: string; grade: string; average: number; count: number; earned: number; possible: number; id: number };

const roleFallback: Record<number, string> = { 1: "Admin", 2: "Staff", 3: "Student", 4: "Parent" };
const chartColors = ["#607d75", "#a6b7ad", "#c79c67", "#8798a8", "#c77a70"];
const destinations: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/staff", label: "Staff", icon: UsersRound },
  { href: "/class", label: "Classes", icon: PanelsTopLeft },
  { href: "/academic", label: "Academics", icon: BookOpen },
  { href: "/scheduling", label: "Scheduling", icon: CalendarDays },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/exams", label: "Examinations", icon: Activity },
  { href: "/users", label: "User accounts", icon: UsersRound },
];

function localDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rangeBounds(range: RangeKey, from: string, to: string) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  if (range === "custom") return { from: from || localDate(end), to: to || localDate(end) };
  const start = new Date(end);
  if (range === "7d") start.setDate(start.getDate() - 6);
  else if (range === "30d") start.setDate(start.getDate() - 29);
  else start.setDate(1);
  return { from: localDate(start), to: localDate(end) };
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T, label: string, errors: string[]) {
  if (result.status === "fulfilled") return result.value;
  errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "Unable to load data."}`);
  return fallback;
}

async function loadCompleteExamResults(examId: number): Promise<ExamResultsResponse> {
  const first = await getExamResults(examId, 0, 500);
  const students = [...(first.students ?? [])];
  let offset = students.length;
  while (students.length > 0 && students.length % 500 === 0 && offset < 25_000) {
    const next = await getExamResults(examId, offset, 500);
    students.push(...(next.students ?? []));
    if (next.students.length < 500) break;
    offset += next.students.length;
  }
  return { ...first, students };
}

function Card({ title, action, className = "", children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`school-analytics-card ${className}`}>
      <div className="school-analytics-card-head"><h2>{title}</h2>{action}</div>
      {children}
    </section>
  );
}

function EmptyChart({ children = "No records for this selection." }: { children?: string }) {
  return <div className="school-chart-empty">{children}</div>;
}

function AdminDashboard({ user }: { user: CurrentUser }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState("");
  const [academicYear, setAcademicYear] = useState("all");
  const [gradeId, setGradeId] = useState("all");
  const [sectionId, setSectionId] = useState("all");
  const [examId, setExamId] = useState("");
  const [range, setRange] = useState<RangeKey>("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [resultsByExam, setResultsByExam] = useState<Record<number, ExamResultsResponse>>({});
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsErrors, setResultsErrors] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const examResultsRequests = useRef(new Map<number, Promise<ExamResultsResponse>>());

  useEffect(() => {
    let cancelled = false;
    const errors: string[] = [];
    void Promise.allSettled([
      apiRequest<{ students?: DashboardStudent[] } | DashboardStudent[]>("/api/students", { cache: "no-store" }),
      getSchedulingStaff(),
      apiRequest<DashboardUser[]>("/api/users", { cache: "no-store" }),
      apiRequest<DashboardRole[]>("/api/roles", { cache: "no-store" }),
      getSchedulingGrades(),
      getSchedulingSections(),
      getClassSessions(),
      getTimetables(),
      listExams({ limit: 100 }),
    ]).then((results) => {
      if (cancelled) return;
      const studentsResponse = settledValue(results[0] as PromiseSettledResult<{ students?: DashboardStudent[] } | DashboardStudent[]>, [], "Students", errors);
      const students = Array.isArray(studentsResponse) ? studentsResponse : studentsResponse.students ?? [];
      setData({
        students,
        staff: settledValue(results[1] as PromiseSettledResult<StaffOption[]>, [], "Staff", errors),
        users: settledValue(results[2] as PromiseSettledResult<DashboardUser[]>, [], "User accounts", errors),
        roles: settledValue(results[3] as PromiseSettledResult<DashboardRole[]>, [], "Roles", errors),
        grades: settledValue(results[4] as PromiseSettledResult<GradeOption[]>, [], "Classes", errors),
        sections: settledValue(results[5] as PromiseSettledResult<SectionOption[]>, [], "Sections", errors),
        sessions: settledValue(results[6] as PromiseSettledResult<ClassSessionRecord[]>, [], "Class sessions", errors),
        timetables: settledValue(results[7] as PromiseSettledResult<TimetableRecord[]>, [], "Timetables", errors),
        exams: settledValue(results[8] as PromiseSettledResult<ExamRecord[]>, [], "Examinations", errors),
        errors,
      });
    }).catch((error: unknown) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load the school dashboard.");
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setAttendanceLoading(true);
      setAttendanceError("");
      void getAttendanceRecords(academicYear === "all" ? undefined : academicYear)
        .then((records) => { if (!cancelled) setAttendance(records); })
        .catch((error: unknown) => { if (!cancelled) setAttendanceError(error instanceof Error ? error.message : "Unable to load attendance records."); })
        .finally(() => { if (!cancelled) setAttendanceLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [data, academicYear]);

  const years = useMemo(() => {
    if (!data) return [];
    return [...new Set([...data.grades.map((item) => item.academic_year), ...data.exams.map((item) => item.academic_year)].filter(Boolean))].sort().reverse();
  }, [data]);
  const availableGrades = useMemo(() => (data?.grades ?? []).filter((item) => academicYear === "all" || item.academic_year === academicYear), [data, academicYear]);
  const selectedGrade = availableGrades.find((item) => String(item.id) === gradeId);
  const availableSections = useMemo(() => {
    const gradeRows = availableGrades.filter((item) => gradeId === "all" || String(item.id) === gradeId);
    const ids = new Set(gradeRows.map((item) => item.section_id).filter((id): id is number => id != null));
    return (data?.sections ?? []).filter((item) => ids.has(item.id));
  }, [availableGrades, data, gradeId]);
  const filteredExams = useMemo(() => (data?.exams ?? []).filter((item) =>
    (academicYear === "all" || item.academic_year === academicYear) &&
    (gradeId === "all" || item.grade_id === Number(gradeId)) &&
    (sectionId === "all" || item.section_id === Number(sectionId))
  ), [data, academicYear, gradeId, sectionId]);
  const finalizedExams = useMemo(() => filteredExams
    .filter((item) => item.status === "completed" || item.status === "published")
    .sort((a, b) => b.end_date.localeCompare(a.end_date)), [filteredExams]);
  const resolvedExamId = filteredExams.some((item) => String(item.id) === examId)
    ? examId
    : String(finalizedExams[0]?.id ?? filteredExams[0]?.id ?? "");

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const requested = [...finalizedExams.slice(0, 6)];
    const selected = filteredExams.find((item) => String(item.id) === resolvedExamId);
    if (selected && !requested.some((item) => item.id === selected.id)) requested.unshift(selected);
    if (requested.length === 0) {
      const timer = window.setTimeout(() => {
        setResultsByExam({});
        setResultsErrors([]);
        setResultsLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    queueMicrotask(() => { if (!cancelled) setResultsLoading(true); });
    void Promise.allSettled(requested.map(async (exam) => {
      let request = examResultsRequests.current.get(exam.id);
      if (!request) {
        request = loadCompleteExamResults(exam.id);
        examResultsRequests.current.set(exam.id, request);
        void request.catch(() => examResultsRequests.current.delete(exam.id));
      }
      return [exam.id, await request] as const;
    }))
      .then((settled) => {
        if (!cancelled) {
          const successful = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
          const failures = settled.flatMap((result) => result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : "A result request failed."] : []);
          setResultsByExam(Object.fromEntries(successful));
          setResultsErrors(failures);
        }
      })
      .finally(() => { if (!cancelled) setResultsLoading(false); });
    return () => { cancelled = true; };
  }, [data, finalizedExams, filteredExams, resolvedExamId]);

  const bounds = rangeBounds(range, fromDate, toDate);
  const sessionById = useMemo(() => new Map((data?.sessions ?? []).map((session) => [session.id, session])), [data]);
  const timetableById = useMemo(() => new Map((data?.timetables ?? []).map((slot) => [slot.id, slot])), [data]);
  const attendanceRows = useMemo(() => attendance.flatMap((record) => {
    const session = sessionById.get(record.session_id);
    if (!session || session.session_date < bounds.from || session.session_date > bounds.to) return [];
    const slot = timetableById.get(session.timetable_id);
    if (!slot) return [];
    if (gradeId !== "all" && slot.grade_id !== Number(gradeId)) return [];
    if (sectionId !== "all" && slot.section_id !== Number(sectionId)) return [];
    return [{ record, session, slot }];
  }), [attendance, sessionById, timetableById, bounds.from, bounds.to, gradeId, sectionId]);

  const attendanceSummary = useMemo(() => attendanceRows.reduce((summary, row) => {
    summary.total += 1;
    const status = row.record.status.toUpperCase();
    if (status === "PRESENT") summary.present += 1;
    else if (status === "ABSENT") summary.absent += 1;
    else if (status === "LATE") summary.late += 1;
    else if (status === "EXCUSED") summary.excused += 1;
    return summary;
  }, { total: 0, present: 0, absent: 0, late: 0, excused: 0 }), [attendanceRows]);
  const attendanceRate = attendanceSummary.total
    ? ((attendanceSummary.present + attendanceSummary.late) / attendanceSummary.total) * 100
    : null;

  const dailyAttendance = useMemo(() => {
    const days = new Map<string, AttendancePoint>();
    for (const { record, session } of attendanceRows) {
      const point = days.get(session.session_date) ?? { date: session.session_date, label: new Date(`${session.session_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }), rate: 0, present: 0, absent: 0, late: 0, total: 0 };
      point.total += 1;
      if (record.status.toUpperCase() === "PRESENT") point.present += 1;
      else if (record.status.toUpperCase() === "ABSENT") point.absent += 1;
      else if (record.status.toUpperCase() === "LATE") point.late += 1;
      days.set(point.date, point);
    }
    return [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).map((point) => ({ ...point, rate: point.total ? ((point.present + point.late) / point.total) * 100 : 0 }));
  }, [attendanceRows]);

  const classAttendance = useMemo(() => {
    const groups = new Map<string, { name: string; present: number; late: number; total: number }>();
    for (const { record, slot } of attendanceRows) {
      const grade = availableGrades.find((item) => item.id === slot.grade_id);
      const section = (data?.sections ?? []).find((item) => item.id === slot.section_id);
      const name = `${grade?.grade ?? "Class"}${section?.section ? ` · ${section.section}` : ""}`;
      const group = groups.get(name) ?? { name, present: 0, late: 0, total: 0 };
      group.total += 1;
      if (record.status.toUpperCase() === "PRESENT") group.present += 1;
      if (record.status.toUpperCase() === "LATE") group.late += 1;
      groups.set(name, group);
    }
    return [...groups.values()].map((group) => ({ ...group, rate: group.total ? (group.present + group.late) / group.total * 100 : 0 })).sort((a, b) => a.rate - b.rate).slice(0, 10);
  }, [attendanceRows, availableGrades, data]);

  const selectedResult = resultsByExam[Number(resolvedExamId)];
  const subjectPerformance = useMemo(() => {
    const scores = new Map<string, { earned: number; possible: number; students: Set<number> }>();
    for (const student of selectedResult?.students ?? []) for (const subject of student.subjects ?? []) {
      if (subject.marks_obtained == null || subject.is_absent) continue;
      const group = scores.get(subject.subject_name) ?? { earned: 0, possible: 0, students: new Set<number>() };
      group.earned += Number(subject.marks_obtained) || 0;
      group.possible += Number(subject.max_marks) || 0;
      group.students.add(student.student_id);
      scores.set(subject.subject_name, group);
    }
    return [...scores.entries()].map(([subject, score]) => ({ subject, average: score.possible ? score.earned / score.possible * 100 : 0, students: score.students.size })).sort((a, b) => b.average - a.average);
  }, [selectedResult]);

  const examTrend: PerformancePoint[] = useMemo(() => finalizedExams.slice(0, 6).reverse().flatMap((exam) => {
    const results = resultsByExam[exam.id];
    if (!results?.students?.length) return [];
    let earned = 0;
    let possible = 0;
    let count = 0;
    for (const student of results.students) for (const subject of student.subjects ?? []) {
      if (subject.marks_obtained == null || subject.is_absent) continue;
      earned += Number(subject.marks_obtained) || 0;
      possible += Number(subject.max_marks) || 0;
      count += 1;
    }
    return possible ? [{ id: exam.id, exam: exam.name, grade: `${exam.grade ?? "Class"}${exam.section ? ` · ${exam.section}` : ""}`, average: earned / possible * 100, count, earned, possible }] : [];
  }), [finalizedExams, resultsByExam]);

  const classPerformance = useMemo(() => {
    const groups = new Map<string, { earned: number; possible: number; exam: string }>();
    for (const point of examTrend) {
      const group = groups.get(point.grade) ?? { earned: 0, possible: 0, exam: point.exam };
      group.earned += point.earned;
      group.possible += point.possible;
      groups.set(point.grade, group);
    }
    return [...groups.entries()].map(([grade, value]) => ({ grade, exam: value.exam, average: value.possible ? value.earned / value.possible * 100 : 0 })).sort((a, b) => b.average - a.average);
  }, [examTrend]);

  const enrollment = useMemo(() => {
    const now = new Date();
    const months: Array<{ month: string; count: number; key: string }> = [];
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: date.toLocaleDateString(undefined, { month: "short", year: "2-digit" }), key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, count: 0 });
    }
    const monthIndex = new Map(months.map((item, index) => [item.key, index]));
    for (const student of data?.students ?? []) {
      if (gradeId !== "all" && (!selectedGrade || !student.grade || student.grade !== selectedGrade.grade)) continue;
      const matchingSection = availableSections.find((section) => String(section.id) === sectionId);
      if (sectionId !== "all" && (!matchingSection || !student.section || student.section !== matchingSection.section)) continue;
      const date = student.admission_date ?? student.created_at;
      if (!date) continue;
      const key = date.slice(0, 7);
      const index = monthIndex.get(key);
      if (index !== undefined) for (let j = index; j < months.length; j += 1) months[j].count += 1;
    }
    return months;
  }, [data, gradeId, selectedGrade, availableSections, sectionId]);

  const activeUsers = (data?.users ?? []).filter((item) => item.is_active);
  const roleDistribution = useMemo(() => {
    const counts = new Map<number, number>();
    for (const account of activeUsers) counts.set(account.role_id, (counts.get(account.role_id) ?? 0) + 1);
    return [...counts.entries()].map(([id, value]) => ({ name: data?.roles.find((role) => role.id === id)?.name ?? data?.roles.find((role) => role.id === id)?.role_name ?? roleFallback[id] ?? `Role ${id}`, value })).sort((a, b) => b.value - a.value);
  }, [activeUsers, data]);
  const selectedExam = filteredExams.find((item) => String(item.id) === resolvedExamId);
  const resultAverage = useMemo(() => {
    let earned = 0;
    let possible = 0;
    let markedStudents = 0;
    for (const student of selectedResult?.students ?? []) {
      let studentHasMark = false;
      for (const subject of student.subjects ?? []) {
        if (subject.marks_obtained == null || subject.is_absent) continue;
        earned += Number(subject.marks_obtained) || 0;
        possible += Number(subject.max_marks) || 0;
        studentHasMark = true;
      }
      if (studentHasMark) markedStudents += 1;
    }
    return { average: possible ? earned / possible * 100 : null, markedStudents };
  }, [selectedResult]);

  if (!data && loadError) return <div className="school-dashboard-wrap"><div className="school-dashboard-error" role="alert">Dashboard data could not be loaded: {loadError}</div></div>;
  if (!data) return <Loader title="Loading school analytics..." subtitle="Preparing the latest school data" size="md" className="min-h-[50vh]" />;

  const rangeLabel = range === "custom" ? `${bounds.from} — ${bounds.to}` : range === "month" ? "This month" : `Last ${range === "7d" ? "7" : "30"} days`;
  const formatCount = (value: number) => new Intl.NumberFormat().format(value);
  const cards = [
    { label: "Attendance rate", value: attendanceLoading ? "—" : attendanceRate == null ? "—" : `${attendanceRate.toFixed(1)}%`, note: attendanceLoading ? "Loading attendance" : attendanceSummary.total ? `${formatCount(attendanceSummary.present)} present · ${formatCount(attendanceSummary.absent)} absent · ${formatCount(attendanceSummary.late)} late` : "No marked records in this period", icon: ClipboardCheck },
    { label: "Active accounts", value: formatCount(activeUsers.length), note: "Enabled login accounts · role mix below", icon: Activity },
    { label: "Exam average", value: resultsLoading ? "—" : resultAverage.average == null ? "—" : `${resultAverage.average.toFixed(1)}%`, note: selectedExam ? `${selectedExam.name} · ${formatCount(resultAverage.markedStudents)} students with marks` : "No completed exam result selected", icon: BookOpen },
  ];

  return (
    <section className="school-dashboard-wrap">
      <header className="school-dashboard-heading">
        <div>
          <p className="school-dashboard-eyebrow">School analytics</p>
          <h1>Good day, {user.username}</h1>
          <p className="school-dashboard-subtitle">A live overview of enrollment, attendance, and academic performance.</p>
        </div>
        <button type="button" className="school-refresh" onClick={() => { examResultsRequests.current.clear(); setRefreshKey((key) => key + 1); }} aria-label="Refresh dashboard data"><RefreshCw size={15} /> Refresh</button>
      </header>

      <div className="school-dashboard-filters" aria-label="Dashboard filters">
        <label><span>Period</span><select value={range} onChange={(event) => setRange(event.target.value as RangeKey)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="custom">Custom</option></select></label>
        {range === "custom" && <><label><span>From</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label><span>To</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></>}
        <label><span>Academic year</span><select value={academicYear} onChange={(event) => { setAcademicYear(event.target.value); setGradeId("all"); setSectionId("all"); }}><option value="all">All years</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <label><span>Class</span><select value={gradeId} onChange={(event) => { setGradeId(event.target.value); setSectionId("all"); }}><option value="all">All classes</option>{availableGrades.map((grade) => <option key={`${grade.id}-${grade.academic_year}`} value={grade.id}>{grade.grade}{grade.academic_year ? ` · ${grade.academic_year}` : ""}</option>)}</select></label>
        <label><span>Section</span><select value={sectionId} onChange={(event) => setSectionId(event.target.value)} disabled={availableSections.length === 0}><option value="all">All sections</option>{availableSections.map((section) => <option key={section.id} value={section.id}>{section.section}</option>)}</select></label>
        <label className="school-filter-exam"><span>Examination</span><select value={resolvedExamId} onChange={(event) => setExamId(event.target.value)}><option value="">Select an exam</option>{filteredExams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.grade}{exam.section ? ` ${exam.section}` : ""} · {exam.status}</option>)}</select></label>
      </div>

      {data.errors.length > 0 && <div className="school-dashboard-error" role="status">Some dashboard data could not be loaded: {data.errors.join(" · ")}</div>}
      {attendanceError && <div className="school-dashboard-error" role="alert">Attendance analytics unavailable: {attendanceError}</div>}
      {resultsErrors.length > 0 && <div className="school-dashboard-error" role="alert">Exam analytics unavailable: {resultsErrors.join(" · ")}</div>}

      <section className="school-kpi-grid" aria-label="Key performance indicators">
        <article className="school-kpi-card school-kpi-population">
          <div className="school-kpi-top"><span>School population</span><UsersRound size={16} aria-hidden="true" /></div>
          <div className="school-kpi-split">
            <div><span>Total students</span><strong>{formatCount(data.students.length)}</strong><small>{formatCount(data.students.filter((item) => item.status?.toLowerCase() === "active").length)} active</small></div>
            <div><span>Total staff</span><strong>{formatCount(data.staff.length)}</strong><small>{formatCount(data.staff.filter((item) => item.status?.toLowerCase() === "active").length)} active</small></div>
          </div>
        </article>
        {cards.map(({ label, value, note, icon: Icon }) => <article key={label} className="school-kpi-card"><div className="school-kpi-top"><span>{label}</span><Icon size={16} aria-hidden="true" /></div><strong>{value}</strong><p>{note}</p></article>)}
      </section>

      <section className="school-analytics-grid" aria-label="School analytics charts">
        <Card title="Attendance trend" className="school-card-wide" action={<span className="school-card-meta">{rangeLabel} · present + late / recorded</span>}>
          {attendanceLoading ? <Loader title="Loading attendance..." size="sm" className="school-chart-loader" /> : dailyAttendance.length ? <div className="school-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={dailyAttendance} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} minTickGap={24} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} unit="%" /><Tooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--foreground)" }} formatter={(value, name) => [name === "rate" ? `${Number(value).toFixed(1)}%` : value, name === "rate" ? "Attendance" : name]} /><Line type="monotone" dataKey="rate" name="rate" stroke={chartColors[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div> : <EmptyChart>{attendanceSummary.total ? "No attendance records match this date or class filter." : "No attendance records are available for this selection."}</EmptyChart>}
        </Card>

        <Card title="Attendance by class" action={<span className="school-card-meta">Lowest rates first</span>}>
          {attendanceLoading ? <Loader title="Loading classes..." size="sm" className="school-chart-loader" /> : classAttendance.length ? <div className="school-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={classAttendance} layout="vertical" margin={{ top: 2, right: 16, left: 0, bottom: 0 }}><CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" /><XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} unit="%" /><YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} /><Tooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--foreground)" }} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Attendance"]} /><Bar dataKey="rate" radius={[0, 5, 5, 0]} maxBarSize={18}>{classAttendance.map((entry, index) => <Cell key={entry.name} fill={entry.rate < 75 ? "#c77a70" : chartColors[index % chartColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyChart>Class-level attendance requires recorded sessions matched to a timetable.</EmptyChart>}
        </Card>

        <Card title="Academic performance trend" className="school-card-wide" action={<span className="school-card-meta">Mean of entered marks · up to 6 recent completed exams</span>}>
          {resultsLoading ? <Loader title="Loading exam results..." size="sm" className="school-chart-loader" /> : examTrend.length ? <div className="school-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={examTrend} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" /><XAxis dataKey="exam" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} interval="preserveStartEnd" /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} unit="%" /><Tooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--foreground)" }} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Average marks"]} labelFormatter={(label) => `${label} · ${examTrend.find((item) => item.exam === label)?.grade ?? ""}`} /><Line type="monotone" dataKey="average" stroke={chartColors[2]} strokeWidth={2.5} dot={{ r: 3, fill: chartColors[2] }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div> : <EmptyChart>{finalizedExams.length ? "No entered marks were returned for the recent exams." : "No completed or published exams match the selected filters."}</EmptyChart>}
        </Card>

        <Card title="Performance by class" action={<span className="school-card-meta">Recent completed results</span>}>
          {resultsLoading ? <Loader title="Loading class results..." size="sm" className="school-chart-loader" /> : classPerformance.length ? <div className="school-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={classPerformance} margin={{ top: 12, right: 8, left: -18, bottom: 12 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" /><XAxis dataKey="grade" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={42} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} unit="%" /><Tooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--foreground)" }} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Mean score"]} labelFormatter={(label) => `${label} · ${classPerformance.find((item) => item.grade === label)?.exam ?? ""}`} /><Bar dataKey="average" fill={chartColors[2]} radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div> : <EmptyChart>Class comparisons need recent exam marks across more than one class.</EmptyChart>}
        </Card>

        <Card title="Subject performance" action={<span className="school-card-meta">{selectedExam?.name ?? "Selected exam"}</span>}>
          {resultsLoading ? <Loader title="Loading subject marks..." size="sm" className="school-chart-loader" /> : subjectPerformance.length ? <div className="school-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={subjectPerformance} margin={{ top: 12, right: 8, left: -18, bottom: 12 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" /><XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={42} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} unit="%" /><Tooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--foreground)" }} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Mean score"]} /><Bar dataKey="average" fill={chartColors[0]} radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div> : <EmptyChart>Subject marks are not available for this exam.</EmptyChart>}
        </Card>

        <Card title="Student enrollment" action={<span className="school-card-meta">Rolling 12 months · admission date</span>}>
          {enrollment.some((item) => item.count > 0) ? <div className="school-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={enrollment} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} minTickGap={16} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 10 }} /><Tooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--foreground)" }} formatter={(value) => [value, "Enrolled students"]} /><Line type="monotone" dataKey="count" stroke={chartColors[3]} strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div> : <EmptyChart>Admission dates are not available for the rolling year.</EmptyChart>}
        </Card>

        <Card title="Active accounts by role" action={<span className="school-card-meta">Enabled accounts, not login activity</span>}>
          {roleDistribution.length ? <div className="school-role-chart"><div className="school-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={roleDistribution} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">{roleDistribution.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip contentStyle={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--foreground)" }} formatter={(value) => [value, "Accounts"]} /></PieChart></ResponsiveContainer></div><ul>{roleDistribution.map((entry, index) => <li key={entry.name}><span><i style={{ background: chartColors[index % chartColors.length] }} />{entry.name}</span><strong>{formatCount(entry.value)}</strong></li>)}</ul></div> : <EmptyChart>No active accounts were returned.</EmptyChart>}
        </Card>
      </section>

      <Card title="Administration shortcuts" className="school-shortcuts-card">
        <nav className="school-shortcuts" aria-label="Administration shortcuts">{destinations.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={16} aria-hidden="true" /><span>{label}</span><ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>
      </Card>
    </section>
  );
}

export default AdminDashboard;
