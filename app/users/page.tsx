"use client";

import { FormEvent, useEffect, useState } from "react";
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [selected, setSelected] = useState<User | null>(null);

  const [form, setForm] = useState<UserForm>(emptyForm);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load users and students."
      );
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
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load user."
      );
    }
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
      person_id: form.person_id
        ? Number(form.person_id)
        : undefined,
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

      setEditingId(null);
      setFormOpen(false);
      setForm(emptyForm);

      setStudentSearch("");
      setStaffSearch("");

      await loadUsers();
      await loadStaff();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: number) {
    if (!window.confirm("Delete this user?")) return;

    try {
      await apiRequest(`/api/users/${id}`, {
        method: "DELETE",
      });

      setSelected(null);

      await loadUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete user."
      );
    }
  }

  const filteredUsers = users.filter((user) =>
    `${user.username} ${user.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.roll_number}`
      .toLowerCase()
      .includes(studentSearch.toLowerCase())
  );

  const filteredStaff = staff.filter((member) =>
    `${member.name} ${member.number} ${member.id}`
      .toLowerCase()
      .includes(staffSearch.toLowerCase())
  );

  return (
    <section className="page-section admin-page">

      {/* PAGE HEADER */}
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Access management</p>

          <h1>Users</h1>

          <p>
            Manage accounts, roles, and student/staff relationships.
          </p>
        </div>

        <button
          className="action-button primary"
          type="button"
          onClick={openCreate}
        >
          + Add user
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {/* CREATE / EDIT USER FORM */}
      {formOpen && (
        <form
          className="editor-panel"
          onSubmit={saveUser}
        >
          <div className="panel-title">
            <div>
              <p className="eyebrow">
                {editingId ? "Update account" : "New account"}
              </p>

              <h2>
                {editingId ? "Edit user" : "Add user"}
              </h2>
            </div>

            <button
              className="close-button"
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormOpen(false);
                setForm(emptyForm);

                setStudentSearch("");
                setStaffSearch("");
              }}
            >
              ×
            </button>
          </div>

          <div className="form-grid">

            {/* EMAIL */}
            <label>
              Email

              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
              />
            </label>

            {/* USERNAME */}
            <label>
              Username

              <input
                required
                minLength={3}
                maxLength={50}
                value={form.username}
                onChange={(event) =>
                  setForm({
                    ...form,
                    username: event.target.value,
                  })
                }
              />
            </label>

            {/* PASSWORD */}
            <label>
              Password

              <input
                required
                minLength={8}
                maxLength={128}
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({
                    ...form,
                    password: event.target.value,
                  })
                }
                placeholder={
                  editingId
                    ? "Required for updates"
                    : "Minimum 8 characters"
                }
              />
            </label>

            {/* ROLE */}
            <label>
              Role

              <select
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
                <option value="student">
                  Student
                </option>

                <option value="staff">
                  Staff
                </option>

                <option value="admin">
                  Admin
                </option>
              </select>
            </label>

            {/* STUDENT FIELDS */}
            {form.role === "student" && (
              <>
                <label>
                  Search student

                  <input
                    value={studentSearch}
                    onChange={(event) =>
                      setStudentSearch(event.target.value)
                    }
                    placeholder="Name or roll number"
                  />
                </label>

                <label>
                  Student

                  <select
                    required
                    value={form.person_id}
                    onChange={(event) => {
                      const studentId =
                        event.target.value;

                      setForm({
                        ...form,
                        person_id: studentId,
                      });

                      setStudentSearch("");
                    }}
                  >
                    <option value="">
                      Select a student
                    </option>

                    {filteredStudents.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.name} —{" "}
                        {student.roll_number}{" "}
                        (ID: {student.id})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Person ID

                  <input
                    readOnly
                    value={form.person_id}
                    placeholder="Set by student selection"
                  />
                </label>
              </>
            )}

            {/* STAFF FIELDS */}
            {form.role === "staff" && (
              <>
                <label>
                  Search staff

                  <input
                    value={staffSearch}
                    onChange={(event) =>
                      setStaffSearch(event.target.value)
                    }
                    placeholder="Name, number or ID"
                  />
                </label>

                <label>
                  Staff

                  <select
                    required
                    value={form.person_id}
                    onChange={(event) => {
                      const staffId =
                        event.target.value;

                      setForm({
                        ...form,
                        person_id: staffId,
                      });

                      setStaffSearch("");
                    }}
                  >
                    <option value="">
                      Select a staff member
                    </option>

                    {filteredStaff
                      .filter(
                        (member) =>
                          member.status.toLowerCase() ===
                          "active"
                      )
                      .map((member) => (
                        <option
                          key={member.id}
                          value={member.id}
                        >
                          {member.name} —{" "}
                          {member.number}{" "}
                          (ID: {member.id})
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Person ID

                  <input
                    readOnly
                    value={form.person_id}
                    placeholder="Set by staff selection"
                  />
                </label>
              </>
            )}

          </div>

          {/* SAVE BUTTON */}
          <button
            className="action-button primary"
            disabled={saving}
            type="submit"
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Save changes"
              : "Create user"}
          </button>
        </form>
      )}

      {/* USERS TABLE */}
      <div className="data-panel">

        <div className="toolbar">
          <h2>
            All users{" "}
            <span>
              {users.length}
            </span>
          </h2>

          <input
            aria-label="Search users"
            placeholder="Search username or email"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        {loading ? (
          <p className="state-text">
            Loading users...
          </p>
        ) : filteredUsers.length === 0 ? (
          <p className="state-text">
            No users found.
          </p>
        ) : (
          <div className="table-scroll">

            <table className="data-table">

              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role ID</th>
                  <th>Person ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>

                    <td>
                      <button
                        className="table-link"
                        type="button"
                        onClick={() =>
                          viewUser(user.id)
                        }
                      >
                        {user.username}
                      </button>
                    </td>

                    <td>
                      {user.email}
                    </td>

                    <td>
                      {user.role_id}
                    </td>

                    <td>
                      {user.person_id ?? "—"}
                    </td>

                    <td>
                      <span
                        className={`status-pill ${
                          user.is_active
                            ? ""
                            : "inactive"
                        }`}
                      >
                        {user.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>

                      <button
                        className="small-button"
                        type="button"
                        onClick={() =>
                          openEdit(user)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="small-button danger"
                        type="button"
                        onClick={() =>
                          deleteUser(user.id)
                        }
                      >
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

      {/* USER DETAILS */}
      {selected && (
        <div className="detail-panel">

          <div className="panel-title">

            <div>
              <p className="eyebrow">
                User #{selected.id}
              </p>

              <h2>
                {selected.username}
              </h2>
            </div>

            <button
              className="close-button"
              type="button"
              onClick={() =>
                setSelected(null)
              }
            >
              ×
            </button>

          </div>

          <div className="detail-grid">

            <span>
              Email

              <strong>
                {selected.email}
              </strong>
            </span>

            <span>
              Role ID

              <strong>
                {selected.role_id}
              </strong>
            </span>

            <span>
              Person ID

              <strong>
                {selected.person_id ?? "—"}
              </strong>
            </span>

            <span>
              Status

              <strong>
                {selected.is_active
                  ? "Active"
                  : "Inactive"}
              </strong>
            </span>

          </div>

        </div>
      )}

    </section>
  );
}