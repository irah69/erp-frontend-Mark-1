"use client";

import { FormEvent, useState } from "react";
import type { UserProfile, UserProfileFields, UserProfileUpdate } from "../../lib/api";

type TextField = Exclude<keyof UserProfileFields, "same_as_present_address" | "aadhaar_number">;
type EditableTextField = TextField;
type FormValues = Record<EditableTextField, string> & {
  same_as_present_address: boolean;
};

type ProfileEditorProps = {
  initialProfile: UserProfile;
  title?: string;
  subtitle?: string;
  onSave: (update: UserProfileUpdate) => Promise<UserProfile>;
};

const sections: { title: string; fields: { key: TextField; label: string; type?: string }[] }[] = [
  {
    title: "Personal details",
    fields: [
      { key: "full_name", label: "Full name" },
      { key: "gender", label: "Gender" },
      { key: "date_of_birth", label: "Date of birth", type: "date" },
      { key: "nationality", label: "Nationality" },
      { key: "mother_tongue", label: "Mother tongue" },
      { key: "religion", label: "Religion" },
      { key: "caste_category", label: "Caste category" },
      { key: "identification_mark_1", label: "Identification mark 1" },
      { key: "identification_mark_2", label: "Identification mark 2" },
    ],
  },
  {
    title: "Contact details",
    fields: [
      { key: "mobile_number", label: "Mobile number", type: "tel" },
      { key: "alternate_mobile_number", label: "Alternate mobile number", type: "tel" },
      { key: "email_address", label: "Email address", type: "email" },
    ],
  },
  {
    title: "Family details",
    fields: [
      { key: "father_name", label: "Father's name" },
      { key: "father_mobile_number", label: "Father's mobile number", type: "tel" },
      { key: "father_occupation", label: "Father's occupation" },
      { key: "mother_name", label: "Mother's name" },
      { key: "mother_mobile_number", label: "Mother's mobile number", type: "tel" },
      { key: "mother_occupation", label: "Mother's occupation" },
      { key: "spouse_guardian_name", label: "Spouse / guardian name" },
      { key: "spouse_guardian_mobile_number", label: "Spouse / guardian mobile", type: "tel" },
      { key: "annual_family_income", label: "Annual family income", type: "number" },
    ],
  },
  {
    title: "Present address",
    fields: [
      { key: "present_house_flat_number", label: "House / flat number" },
      { key: "present_street_locality", label: "Street / locality" },
      { key: "present_village_town_city", label: "Village / town / city" },
      { key: "present_mandal_sub_district", label: "Mandal / sub-district" },
      { key: "present_district", label: "District" },
      { key: "present_state", label: "State" },
      { key: "present_pin_code", label: "PIN code" },
      { key: "present_country", label: "Country" },
    ],
  },
  {
    title: "Permanent address",
    fields: [
      { key: "permanent_house_flat_number", label: "House / flat number" },
      { key: "permanent_street_locality", label: "Street / locality" },
      { key: "permanent_village_town_city", label: "Village / town / city" },
      { key: "permanent_mandal_sub_district", label: "Mandal / sub-district" },
      { key: "permanent_district", label: "District" },
      { key: "permanent_state", label: "State" },
      { key: "permanent_pin_code", label: "PIN code" },
      { key: "permanent_country", label: "Country" },
    ],
  },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1";
const inputClass =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-500";

function toFormValues(profile: UserProfile): FormValues {
  const values = {} as FormValues;

  for (const section of sections) {
    for (const field of section.fields) {
      values[field.key] = profile[field.key] ?? "";
    }
  }

  values.same_as_present_address = profile.same_as_present_address;
  return values;
}

function displayValue(value: string | null) {
  return value?.trim() || "Not provided";
}

export default function ProfileEditor({
  initialProfile,
  title = "My profile",
  subtitle,
  onSave,
}: ProfileEditorProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState(() => toFormValues(initialProfile));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function beginEditing() {
    setForm(toFormValues(profile));
    setError("");
    setNotice("");
    setEditing(true);
  }

  function cancelEditing() {
    setForm(toFormValues(profile));
    setError("");
    setEditing(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const update: UserProfileUpdate = {};

    for (const section of sections) {
      for (const field of section.fields) {
        const rawValue = form[field.key].trim();
        const nextValue = rawValue || null;
        const currentValue = profile[field.key] ?? null;

        if (field.key === "annual_family_income" && nextValue !== null) {
          const amount = Number(nextValue);
          if (!Number.isFinite(amount) || amount < 0) {
            setError("Annual family income must be a valid non-negative amount.");
            setSaving(false);
            return;
          }
          if (Number(currentValue) !== amount) {
            update.annual_family_income = amount;
          }
        } else if (nextValue !== currentValue) {
          update[field.key] = nextValue;
        }
      }
    }

    if (form.same_as_present_address !== profile.same_as_present_address) {
      update.same_as_present_address = form.same_as_present_address;
    }

    if (Object.keys(update).length === 0) {
      setNotice("There are no profile changes to save.");
      setSaving(false);
      return;
    }

    try {
      const updatedProfile = await onSave(update);
      setProfile(updatedProfile);
      setForm(toFormValues(updatedProfile));
      setEditing(false);
      setNotice("Your profile has been updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile.full_name?.trim() || title;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-7 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-indigo-700">Account</p>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {!editing && (
            <button
              type="button"
              onClick={beginEditing}
              className={`rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 ${focusRing}`}
            >
              Update profile
            </button>
          )}
        </header>

        <section className="mb-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{displayName}</h2>
            <p className="text-sm text-slate-500">User ID: {profile.user_id}</p>
          </div>
        </section>

        {error && (
          <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {notice}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold">{section.title}</h2>
              {section.title === "Permanent address" && (
                <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.same_as_present_address}
                    disabled={!editing}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        same_as_present_address: event.target.checked,
                      }))
                    }
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span>Permanent address is the same as my present address</span>
                </label>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map((field) => (
                  <label key={field.key} className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
                    {field.label}
                    {editing ? (
                      <input
                        type={field.type ?? "text"}
                        step={field.type === "number" ? "0.01" : undefined}
                        min={field.type === "number" ? "0" : undefined}
                        value={form[field.key]}
                        disabled={section.title === "Permanent address" && form.same_as_present_address}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    ) : (
                      <span className="min-h-10 break-words rounded-md bg-slate-50 px-3 py-2 text-slate-900">
                        {displayValue(profile[field.key])}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {section.title === "Permanent address" && form.same_as_present_address && editing && (
                <p className="mt-3 text-xs text-slate-500">
                  Saving the present address will also update the permanent address.
                </p>
              )}
            </section>
          ))}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">Account record</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Profile updated</dt>
                <dd className="mt-1 text-sm">
                  {profile.updated_at ? new Date(profile.updated_at).toLocaleString() : "Not available"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Aadhaar</dt>
                <dd className="mt-1 text-sm">{displayValue(profile.aadhaar_number)}</dd>
              </div>
            </dl>
          </section>

          {editing && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className={`rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${focusRing}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
