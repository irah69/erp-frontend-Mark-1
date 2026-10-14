"use client";

import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import Link from "next/link";
import { AlertCircle, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { apiRequest } from "../../lib/api";

type User = {
  id: number;
  email: string;
  username: string;
  person_id: number | null;
  role_id: number;
  is_active: boolean;
};

type Student = {
  id: number;
  name: string;
  roll_number: string;
  parent_name?: string | null;
  mobile_number?: string | null;
};

type Staff = {
  id: number;
  name: string;
  number: string;
  status: string;
  created_at?: string | null;
};

type UserForm = {
  email: string;
  password: string;
  username: string;
  role: string;
  person_id: string;
};

const emptyForm: UserForm = {
  email: "",
  password: "",
  username: "",
  role: "student",
  person_id: "",
};

/* ---------- shared style tokens ---------- */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1";

const buttonBase = `inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const buttonPrimary = `${buttonBase} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800`;
const buttonSecondary = `${buttonBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100`;
const buttonDanger = `${buttonBase} border-red-600 bg-red-600 text-white hover:bg-red-700 active:bg-red-800`;
const buttonDangerOutline = `${buttonBase} border-slate-300 bg-white text-red-600 hover:bg-red-50 active:bg-red-100`;

const rowButton = `inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 ${focusRing}`;
const rowButtonDanger = `inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 ${focusRing}`;

const iconButton = `-mr-1.5 -mt-1 shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`;

const inputClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 read-only:bg-slate-50 read-only:text-slate-500 sm:text-sm";

/* panels: accent panels carry the left border, the list panel stays plain */
const plainPanel = "rounded-lg border border-slate-200 bg-white";
const accentPanel = `${plainPanel} border-l-4 border-l-indigo-600 p-4 sm:p-5`;

/* ---------- small pieces ---------- */

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-xs font-medium ${
        active ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-lg border border-slate-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-lg sm:pb-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className={iconButton}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [selected, setSelected] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const [form, setForm] = useState<UserForm>(emptyForm);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);

    try {
      const [userData, studentData] = await Promise.all([
        apiRequest<User[]>("/api/users"),
        apiRequest<{ students: Student[] }>("/api/students"),
      ]);

      setUsers(userData);
      setStudents(studentData.students ?? []);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load users and students.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    try {
      const staffData = await apiRequest<Staff[]>("/api/staff");

      setStaff(staffData);
    } catch (requestError) {
      console.error("Error loading staff:", requestError);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
      void loadStaff();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function viewUser(id: number) {
    try {
      const data = await apiRequest<User>(`/api/users/${id}`);

      setSelected(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load user.");
    }
  }

  function closeForm() {
    setEditingId(null);
    setFormOpen(false);
    setForm(emptyForm);

    setStudentSearch("");
    setStaffSearch("");
  }

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
    setForm(emptyForm);

    setStudentSearch("");
    setStaffSearch("");

    setError("");
  }

  function openEdit(user: User) {
    setEditingId(user.id);
    setFormOpen(true);

    setForm({
      email: user.email,
      password: "",
      username: user.username,

      /*
       * Existing role mapping:
       * 1 = admin
       *
       * For Staff, your backend should return the correct role_id.
       * Until the exact staff role_id is confirmed, this keeps
       * the existing student/admin behavior unchanged.
       */
      role: user.role_id === 1 ? "admin" : "student",

      person_id: user.person_id ? String(user.person_id) : "",
    });

    setStudentSearch("");
    setStaffSearch("");

    setError("");
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const payload = {
      email: form.email,
      password: form.password,
      username: form.username,
      role: form.role,
      person_id: form.person_id ? Number(form.person_id) : undefined,
    };

    try {
      if (editingId) {
        await apiRequest(`/api/users/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeForm();

      await loadUsers();
      await loadStaff();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: number) {
    try {
      await apiRequest(`/api/users/${id}`, {
        method: "DELETE",
      });

      setSelected(null);

      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete user.");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    await deleteUser(toDelete.id);
    setToDelete(null);
    setDeleting(false);
  }

  const filteredUsers = users.filter((user) =>
    `${user.username} ${user.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.roll_number}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredStaff = staff.filter((member) =>
    `${member.name} ${member.number} ${member.id}`.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <section className="min-h-dvh bg-slate-50 font-[family-name:var(--font-charis-sil)] text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="mt-1 text-sm text-slate-600">Manage accounts, roles, and student/staff relationships.</p>
          </div>
          <button type="button" onClick={openCreate} className={`${buttonPrimary} w-full sm:w-auto`}>
            <Plus size={16} aria-hidden="true" /> Add user
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words">{error}</p>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
              className={`rounded p-0.5 hover:bg-red-100 ${focusRing}`}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {/* Create / edit */}
          {formOpen && (
            <form className={accentPanel} onSubmit={saveUser}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-base font-semibold">{editingId ? "Edit user" : "Add user"}</h2>
                <button type="button" aria-label="Close form" onClick={closeForm} className={iconButton}>
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Email">
                  <input
                    required
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </Field>

                <Field label="Username">
                  <input
                    required
                    minLength={3}
                    maxLength={50}
                    className={inputClass}
                    value={form.username}
                    onChange={(event) => setForm({ ...form, username: event.target.value })}
                  />
                </Field>

                <Field label="Password">
                  <input
                    required
                    minLength={8}
                    maxLength={128}
                    type="password"
                    className={inputClass}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder={editingId ? "Required for updates" : "Minimum 8 characters"}
                  />
                </Field>

                <Field label="Role">
                  <select
                    className={inputClass}
                    value={form.role}
                    onChange={(event) => {
                      const selectedRole = event.target.value;

                      setForm({
                        ...form,
                        role: selectedRole,
                        person_id: "",
                      });

                      setStudentSearch("");
                      setStaffSearch("");
                    }}
                  >
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>

                {/* Student fields */}
                {form.role === "student" && (
                  <>
                    <Field label="Search student">
                      <input
                        className={inputClass}
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Name or roll number"
                      />
                    </Field>

                    <Field label="Student">
                      <select
                        required
                        className={inputClass}
                        value={form.person_id}
                        onChange={(event) => {
                          const studentId = event.target.value;

                          setForm({
                            ...form,
                            person_id: studentId,
                          });

                          setStudentSearch("");
                        }}
                      >
                        <option value="">Select a student</option>
                        {filteredStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} — {student.roll_number} (ID: {student.id})
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Person ID">
                      <input
                        readOnly
                        className={inputClass}
                        value={form.person_id}
                        placeholder="Set by student selection"
                      />
                    </Field>
                  </>
                )}

                {/* Staff fields */}
                {form.role === "staff" && (
                  <>
                    <Field label="Search staff">
                      <input
                        className={inputClass}
                        value={staffSearch}
                        onChange={(event) => setStaffSearch(event.target.value)}
                        placeholder="Name, number or ID"
                      />
                    </Field>

                    <Field label="Staff">
                      <select
                        required
                        className={inputClass}
                        value={form.person_id}
                        onChange={(event) => {
                          const staffId = event.target.value;

                          setForm({
                            ...form,
                            person_id: staffId,
                          });

                          setStaffSearch("");
                        }}
                      >
                        <option value="">Select a staff member</option>
                        {filteredStaff
                          .filter((member) => member.status.toLowerCase() === "active")
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} — {member.number} (ID: {member.id})
                            </option>
                          ))}
                      </select>
                    </Field>

                    <Field label="Person ID">
                      <input
                        readOnly
                        className={inputClass}
                        value={form.person_id}
                        placeholder="Set by staff selection"
                      />
                    </Field>
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="submit" disabled={saving} className={`${buttonPrimary} w-full sm:w-auto`}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Create user"}
                </button>
                <button type="button" onClick={closeForm} className={`${buttonSecondary} w-full sm:w-auto`}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Details */}
          {selected && (
            <div className={accentPanel}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">User #{selected.id}</p>
                  <h2 className="truncate text-base font-semibold">{selected.username}</h2>
                </div>
                <button type="button" aria-label="Close details" onClick={() => setSelected(null)} className={iconButton}>
                  <X size={18} />
                </button>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">Email</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium">{selected.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Role ID</dt>
                  <dd className="mt-0.5 text-sm font-medium">{selected.role_id}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Person ID</dt>
                  <dd className="mt-0.5 text-sm font-medium">{selected.person_id ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="mt-0.5 text-sm">
                    <StatusBadge active={selected.is_active} />
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    openEdit(selected);
                  }}
                  className={`${buttonPrimary} w-full sm:w-auto`}
                >
                  <Pencil size={16} aria-hidden="true" /> Edit user
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(selected)}
                  className={`${buttonDangerOutline} w-full sm:w-auto`}
                >
                  <Trash2 size={16} aria-hidden="true" /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Users list */}
          <div className={plainPanel}>
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">
                All users <span className="font-normal text-slate-500">({users.length})</span>
              </h2>
              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  aria-label="Search users"
                  placeholder="Search username or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No users found.</p>
            ) : (
              <>
                {/* Mobile: stacked rows */}
                <ul className="divide-y divide-slate-200 md:hidden">
                  {filteredUsers.map((user) => (
                    <li key={user.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => viewUser(user.id)}
                            className={`block max-w-full truncate rounded text-left font-semibold text-slate-900 hover:text-indigo-600 ${focusRing}`}
                          >
                            {user.username}
                          </button>
                          <p className="truncate text-sm text-slate-500">{user.email}</p>
                        </div>
                        <StatusBadge active={user.is_active} />
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">Role ID</dt>
                          <dd>{user.role_id}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Person ID</dt>
                          <dd>{user.person_id ?? "—"}</dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex gap-2">
                        <Link href={`/users/${user.id}/profile`} className={rowButton}>
                          <UserRound size={13} aria-hidden="true" /> Profile
                        </Link>
                        <button type="button" className={rowButton} onClick={() => openEdit(user)}>
                          <Pencil size={13} aria-hidden="true" /> Edit
                        </button>
                        <button type="button" className={rowButtonDanger} onClick={() => setToDelete(user)}>
                          <Trash2 size={13} aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* md+: table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5">User</th>
                        <th className="px-3 py-2.5">Email</th>
                        <th className="px-3 py-2.5">Role ID</th>
                        <th className="px-3 py-2.5">Person ID</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => viewUser(user.id)}
                              className={`max-w-[14rem] truncate rounded text-left font-medium text-slate-900 hover:text-indigo-600 ${focusRing}`}
                            >
                              {user.username}
                            </button>
                          </td>
                          <td className="max-w-[16rem] truncate px-3 py-3 text-slate-600">{user.email}</td>
                          <td className="px-3 py-3 text-slate-600">{user.role_id}</td>
                          <td className="px-3 py-3 text-slate-600">{user.person_id ?? "—"}</td>
                          <td className="px-3 py-3">
                            <StatusBadge active={user.is_active} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Link href={`/users/${user.id}/profile`} className={rowButton}>
                                <UserRound size={13} aria-hidden="true" /> Profile
                              </Link>
                              <button type="button" className={rowButton} onClick={() => openEdit(user)}>
                                Edit
                              </button>
                              <button type="button" className={rowButtonDanger} onClick={() => setToDelete(user)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete this user?">
        {toDelete && (
          <>
            <p className="text-sm text-slate-600">
              <strong className="font-semibold text-slate-900">{toDelete.username}</strong> will be permanently
              removed. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setToDelete(null)} className={`${buttonSecondary} w-full sm:w-auto`}>
                Cancel
              </button>
              <button type="button" disabled={deleting} onClick={confirmDelete} className={`${buttonDanger} w-full sm:w-auto`}>
                {deleting ? "Deleting..." : "Delete user"}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}