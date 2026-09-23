"use client";

import { FormEvent, useEffect, useState } from "react";
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

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
    setForm(emptyForm);
    setError("");
  }

  function openEdit(member: Staff) {
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

      setEditingId(null);
      setFormOpen(false);
      setForm(emptyForm);
      await loadStaff();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save staff member.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStaff(id: number) {
    if (!window.confirm("Delete this staff member?")) return;

    try {
      await apiRequest(`/api/staff/${id}`, { method: "DELETE" });
      setSelected(null);
      await loadStaff();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete staff member.");
    }
  }

  const filteredStaff = staff.filter((member) => `${member.name} ${member.number}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="page-section admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Directory</p>
          <h1>Staff</h1>
          <p>Manage staff profiles and employment records.</p>
        </div>
        <button className="action-button primary" type="button" onClick={openCreate}>+ Add staff</button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {formOpen && (
        <form className="editor-panel" onSubmit={saveStaff}>
          <div className="panel-title">
            <div>
              <p className="eyebrow">{editingId ? "Update record" : "New record"}</p>
              <h2>{editingId ? "Edit staff" : "Add staff"}</h2>
            </div>
            <button
              className="close-button"
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormOpen(false);
                setForm(emptyForm);
              }}
            >
              ×
            </button>
          </div>

          <div className="form-grid">
            <label>
              Name
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>

            <label>
              Number
              <input required value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} />
            </label>

            <label>
              Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <button className="action-button primary" disabled={saving} type="submit">
            {saving ? "Saving..." : editingId ? "Save changes" : "Create staff"}
          </button>
        </form>
      )}

      <div className="data-panel">
        <div className="toolbar">
          <h2>
            All staff <span>{staff.length}</span>
          </h2>
          <input
            aria-label="Search staff"
            placeholder="Search name or number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p className="state-text">Loading staff...</p>
        ) : filteredStaff.length === 0 ? (
          <p className="state-text">No staff found.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Number</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <button className="table-link" type="button" onClick={() => viewStaff(member.id)}>
                        {member.name}
                      </button>
                    </td>
                    <td>{member.number}</td>
                    <td>
                      <span className="status-pill">{member.status}</span>
                    </td>
                    <td>{new Date(member.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="small-button" type="button" onClick={() => openEdit(member)}>
                        Edit
                      </button>
                      <button className="small-button danger" type="button" onClick={() => deleteStaff(member.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="detail-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Staff #{selected.id}</p>
              <h2>{selected.name}</h2>
            </div>
            <button className="close-button" type="button" onClick={() => setSelected(null)}>
              ×
            </button>
          </div>

          <div className="detail-grid">
            <span>
              Number
              <strong>{selected.number}</strong>
            </span>
            <span>
              Status
              <strong>{selected.status}</strong>
            </span>
            <span>
              Created
              <strong>{new Date(selected.created_at).toLocaleDateString()}</strong>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
