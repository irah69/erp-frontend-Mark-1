"use client";

import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import { AlertCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "../../lib/api";

type Staff = {
  id: number;
  name: string;
  number: string;
  status: string;
  created_at: string;
};

type StaffForm = {
  name: string;
  number: string;
  status: string;
};

const emptyForm: StaffForm = {
  name: "",
  number: "",
  status: "active",
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
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 sm:text-sm";

/* panels: accent panels carry the left border, the data panel stays plain */
const plainPanel = "rounded-lg border border-slate-200 bg-white";
const accentPanel = `${plainPanel} border-l-4 border-l-indigo-600 p-4 sm:p-5`;

const statusClass = (status: string) =>
  status.toLowerCase() === "active"
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-slate-200 bg-slate-50 text-slate-600";

/* ---------- small pieces ---------- */

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-medium capitalize ${statusClass(status)}`}>
      {status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
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
  width = "sm:max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
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
        className={`max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-lg border border-slate-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-lg sm:pb-5 ${width}`}
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

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [toDelete, setToDelete] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function loadStaff() {
    setLoading(true);
    try {
      const data = await apiRequest<Staff[]>("/api/staff");
      setStaff(data);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load staff.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStaff();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function viewStaff(id: number) {
    try {
      const data = await apiRequest<Staff>(`/api/staff/${id}`);
      setSelected(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load staff member.");
    }
  }

  function closeForm() {
    setEditingId(null);
    setFormOpen(false);
    setForm(emptyForm);
  }

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
    setForm(emptyForm);
    setError("");
  }

  function openEdit(member: Staff) {
    setSelected(null);
    setEditingId(member.id);
    setFormOpen(true);
    setForm({
      name: member.name,
      number: member.number,
      status: member.status,
    });
    setError("");
  }

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name,
      number: form.number,
      status: form.status,
    };

    try {
      if (editingId !== null) {
        await apiRequest(`/api/staff/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/staff", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeForm();
      await loadStaff();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save staff member.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);

    try {
      await apiRequest(`/api/staff/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      setSelected(null);
      await loadStaff();
    } catch (requestError) {
      setToDelete(null);
      setError(requestError instanceof Error ? requestError.message : "Unable to delete staff member.");
    } finally {
      setDeleting(false);
    }
  }

  const filteredStaff = staff.filter((member) =>
    `${member.name} ${member.number}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="min-h-dvh bg-slate-50 font-[family-name:var(--font-charis-sil)] text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Staff</h1>
            <p className="mt-1 text-sm text-slate-600">Manage staff profiles and employment records.</p>
          </div>
          <button type="button" onClick={openCreate} className={`${buttonPrimary} w-full sm:w-auto`}>
            <Plus size={16} aria-hidden="true" /> Add staff
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
            <form className={accentPanel} onSubmit={saveStaff}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-base font-semibold">{editingId !== null ? "Edit staff" : "Add staff"}</h2>
                <button type="button" aria-label="Close form" onClick={closeForm} className={iconButton}>
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Name">
                  <input
                    required
                    className={inputClass}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </Field>
                <Field label="Number">
                  <input
                    required
                    className={inputClass}
                    value={form.number}
                    onChange={(event) => setForm({ ...form, number: event.target.value })}
                  />
                </Field>
                <Field label="Status">
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="submit" disabled={saving} className={`${buttonPrimary} w-full sm:w-auto`}>
                  {saving ? "Saving..." : editingId !== null ? "Save changes" : "Create staff"}
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
                  <p className="text-sm text-slate-500">Staff #{selected.id}</p>
                  <h2 className="truncate text-base font-semibold">{selected.name}</h2>
                </div>
                <button type="button" aria-label="Close details" onClick={() => setSelected(null)} className={iconButton}>
                  <X size={18} />
                </button>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">Number</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium">{selected.number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="mt-0.5 text-sm">
                    <StatusBadge status={selected.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Created</dt>
                  <dd className="mt-0.5 text-sm font-medium">{new Date(selected.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => openEdit(selected)} className={`${buttonPrimary} w-full sm:w-auto`}>
                  <Pencil size={16} aria-hidden="true" /> Edit staff
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

          {/* Staff list */}
          <div className={plainPanel}>
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold">
                All staff <span className="font-normal text-slate-500">({staff.length})</span>
              </h2>
              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  aria-label="Search staff"
                  placeholder="Search name or number"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">Loading staff...</p>
            ) : filteredStaff.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No staff found.</p>
            ) : (
              <>
                {/* Mobile: stacked rows */}
                <ul className="divide-y divide-slate-200 md:hidden">
                  {filteredStaff.map((member) => (
                    <li key={member.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => viewStaff(member.id)}
                            className={`block max-w-full truncate rounded text-left font-semibold text-slate-900 hover:text-indigo-600 ${focusRing}`}
                          >
                            {member.name}
                          </button>
                          <p className="text-sm text-slate-500">No. {member.number}</p>
                        </div>
                        <StatusBadge status={member.status} />
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        <span className="text-xs text-slate-500">Created </span>
                        {new Date(member.created_at).toLocaleDateString()}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button type="button" className={rowButton} onClick={() => openEdit(member)}>
                          <Pencil size={13} aria-hidden="true" /> Edit
                        </button>
                        <button type="button" className={rowButtonDanger} onClick={() => setToDelete(member)}>
                          <Trash2 size={13} aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* md+: table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5">Staff</th>
                        <th className="px-3 py-2.5">Number</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Created</th>
                        <th className="px-4 py-2.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredStaff.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => viewStaff(member.id)}
                              className={`max-w-[16rem] truncate rounded text-left font-medium text-slate-900 hover:text-indigo-600 ${focusRing}`}
                            >
                              {member.name}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{member.number}</td>
                          <td className="px-3 py-3">
                            <StatusBadge status={member.status} />
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button type="button" className={rowButton} onClick={() => openEdit(member)}>
                                Edit
                              </button>
                              <button type="button" className={rowButtonDanger} onClick={() => setToDelete(member)}>
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
      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete this staff member?">
        {toDelete && (
          <>
            <p className="text-sm text-slate-600">
              <strong className="font-semibold text-slate-900">{toDelete.name}</strong> will be permanently removed.
              This can&apos;t be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setToDelete(null)} className={`${buttonSecondary} w-full sm:w-auto`}>
                Cancel
              </button>
              <button type="button" disabled={deleting} onClick={confirmDelete} className={`${buttonDanger} w-full sm:w-auto`}>
                {deleting ? "Deleting..." : "Delete staff member"}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}