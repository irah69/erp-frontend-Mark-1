"use client";

import Image from "next/image";
import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, Upload, X, ZoomIn } from "lucide-react";
import {
  getUserProfileImage,
  type UserProfile,
  type UserProfileFields,
  type UserProfileUpdate,
} from "../../lib/api";

type TextField = Exclude<keyof UserProfileFields, "same_as_present_address" | "aadhaar_number">;
type EditableTextField = TextField;
type FormValues = Record<EditableTextField, string> & {
  same_as_present_address: boolean;
};

type ProfileEditorProps = {
  initialProfile: UserProfile;
  title?: string;
  subtitle?: string;
  canUploadImage: boolean;
  onSave: (update: UserProfileUpdate) => Promise<UserProfile>;
  onUploadImage: (file: File) => Promise<UserProfile>;
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
  canUploadImage,
  onSave,
  onUploadImage,
}: ProfileEditorProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState(() => toFormValues(initialProfile));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadedProfileImage, setLoadedProfileImage] = useState<{
    imageId: number;
    url: string;
  } | null>(null);
  const [imageLoadError, setImageLoadError] = useState<{
    imageId: number;
    message: string;
  } | null>(null);
  const [imageError, setImageError] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const cropPreviewUrlRef = useRef<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropSaving, setCropSaving] = useState(false);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (cropPreviewUrlRef.current) URL.revokeObjectURL(cropPreviewUrlRef.current);
  }, []);

  function clearCropSource() {
    if (cropPreviewUrlRef.current) URL.revokeObjectURL(cropPreviewUrlRef.current);
    cropPreviewUrlRef.current = null;
    setCropPreviewUrl(null);
    setCropSource(null);
  }

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const imageId = profile.image_id;

    if (imageId === null) {
      return () => {
        cancelled = true;
      };
    }

    void getUserProfileImage(imageId)
      .then((image) => {
        objectUrl = URL.createObjectURL(image);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
        } else {
          setLoadedProfileImage({ imageId, url: objectUrl });
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setImageLoadError({
            imageId,
            message:
              loadError instanceof Error
                ? loadError.message
                : "Unable to load the profile image.",
          });
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile.image_id]);

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

  function selectProfileImage(file: File | null) {
    if (!file) {
      setSelectedImage(null);
      setImageError("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setSelectedImage(null);
      setImageError("Choose a JPEG, PNG, GIF, or WebP image.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSelectedImage(null);
      setImageError("The image must be 5 MB or smaller.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    if (cropPreviewUrlRef.current) URL.revokeObjectURL(cropPreviewUrlRef.current);
    cropPreviewUrlRef.current = URL.createObjectURL(file);
    setCropPreviewUrl(cropPreviewUrlRef.current);
    setCropSource(file);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setImageError("");
  }

  function startCropDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!cropAreaRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: cropOffset.x,
      offsetY: cropOffset.y,
    };
  }

  function moveCropDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !cropAreaRef.current || !cropImageRef.current) return;
    const bounds = cropAreaRef.current.getBoundingClientRect();
    const image = cropImageRef.current;
    const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight) * cropZoom;
    const maxX = Math.max(0, (image.naturalWidth * scale - bounds.width) / 2);
    const maxY = Math.max(0, (image.naturalHeight * scale - bounds.height) / 2);
    setCropOffset({
      x: Math.max(-maxX, Math.min(maxX, dragRef.current.offsetX + event.clientX - dragRef.current.x)),
      y: Math.max(-maxY, Math.min(maxY, dragRef.current.offsetY + event.clientY - dragRef.current.y)),
    });
  }

  async function confirmCrop() {
    if (!cropSource || !cropImageRef.current || !cropAreaRef.current) return;
    setCropSaving(true);
    try {
      const image = cropImageRef.current;
      const bounds = cropAreaRef.current.getBoundingClientRect();
      const baseScale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
      const scale = baseScale * cropZoom;
      const side = Math.min(image.naturalWidth, image.naturalHeight) / cropZoom;
      const sourceX = Math.max(0, Math.min(image.naturalWidth - side, (image.naturalWidth - side) / 2 - cropOffset.x / scale));
      const sourceY = Math.max(0, Math.min(image.naturalHeight - side, (image.naturalHeight - side) / 2 - cropOffset.y / scale));
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare the cropped image.");
      context.drawImage(image, sourceX, sourceY, side, side, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Unable to crop this image.")), "image/jpeg", 0.92)
      );
      const name = cropSource.name.replace(/\.[^.]+$/, "") || "profile-photo";
      setSelectedImage(new File([blob], `${name}-cropped.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
      clearCropSource();
      if (imageInputRef.current) imageInputRef.current.value = "";
    } catch (cropError) {
      setImageError(cropError instanceof Error ? cropError.message : "Unable to crop this image.");
    } finally {
      setCropSaving(false);
    }
  }

  async function uploadImage() {
    if (!selectedImage) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(selectedImage.type)) {
      setImageError("Choose a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    if (selectedImage.size > 5 * 1024 * 1024) {
      setImageError("The image must be 5 MB or smaller.");
      return;
    }

    setUploadingImage(true);
    setImageError("");
    setNotice("");
    try {
      const updatedProfile = await onUploadImage(selectedImage);
      setProfile(updatedProfile);
      setForm(toFormValues(updatedProfile));
      setSelectedImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      setNotice("Your profile image has been updated.");
    } catch (uploadError) {
      setImageError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the profile image."
      );
    } finally {
      setUploadingImage(false);
    }
  }

  const displayName = profile.full_name?.trim() || title;
  const profileImageUrl =
    loadedProfileImage?.imageId === profile.image_id
      ? loadedProfileImage.url
      : null;
  const displayedImageError =
    imageLoadError?.imageId === profile.image_id
      ? imageLoadError.message
      : imageError;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-7 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        {cropSource && cropPreviewUrl && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4" role="dialog" aria-modal="true" aria-labelledby="profile-crop-title">
            <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
              <header className="mb-4 flex items-start justify-between gap-4">
                <div><h2 id="profile-crop-title" className="text-lg font-semibold text-slate-900">Adjust your photo</h2><p className="mt-1 text-sm text-slate-500">Drag to reposition, then zoom for a clean square crop.</p></div>
                <button type="button" onClick={() => { clearCropSource(); if (imageInputRef.current) imageInputRef.current.value = ""; }} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Cancel photo crop"><X size={18} /></button>
              </header>
              <div ref={cropAreaRef} onPointerDown={startCropDrag} onPointerMove={moveCropDrag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} className="relative mx-auto aspect-square w-full max-w-[320px] touch-none cursor-grab overflow-hidden rounded-full bg-slate-100 active:cursor-grabbing">
                <Image ref={cropImageRef} src={cropPreviewUrl} alt="Photo crop preview" fill unoptimized draggable={false} className="pointer-events-none select-none object-cover" style={{ transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})` }} />
              </div>
              <label className="mt-5 flex items-center gap-3 text-sm text-slate-700"><ZoomIn size={17} className="shrink-0 text-indigo-600" /><span className="sr-only">Zoom photo</span><input type="range" min="1" max="3" step="0.01" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} className="w-full accent-indigo-600" /><span className="w-10 text-right tabular-nums">{cropZoom.toFixed(1)}×</span></label>
              <footer className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => { clearCropSource(); if (imageInputRef.current) imageInputRef.current.value = ""; }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => void confirmCrop()} disabled={cropSaving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{cropSaving ? "Preparing…" : "Use this photo"}</button></footer>
            </section>
          </div>
        )}
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

        <section className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
              {profileImageUrl ? (
                <Image
                  src={profileImageUrl}
                  alt={`${displayName} profile`}
                  width={56}
                  height={56}
                  unoptimized
                  className="size-14 object-cover"
                />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{displayName}</h2>
              <p className="text-sm text-slate-500">User ID: {profile.user_id}</p>
            </div>
          </div>
          {editing && canUploadImage && (
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:max-w-sm">
              <label className="text-sm font-semibold text-slate-700" htmlFor="profile-image-file">
                Profile image
              </label>
              <input
                ref={imageInputRef}
                id="profile-image-file"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                disabled={uploadingImage}
                onChange={(event) =>
                  selectProfileImage(event.target.files?.[0] ?? null)
                }
                className="peer sr-only"
              />
              <label
                htmlFor="profile-image-file"
                className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 transition hover:border-indigo-400 hover:bg-indigo-50 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-600 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${focusRing}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                  <ImagePlus size={19} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800">
                    {selectedImage ? "Change photo" : "Choose a photo"}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {selectedImage
                      ? selectedImage.name
                      : "JPEG, PNG, GIF, or WebP · up to 5 MB"}
                  </span>
                </span>
                <Upload size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              </label>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs text-slate-500" aria-live="polite">
                  {selectedImage
                    ? `${(selectedImage.size / (1024 * 1024)).toFixed(2)} MB selected`
                    : "Select an image to update your profile photo."}
                </p>
                <button
                  type="button"
                  onClick={() => void uploadImage()}
                  disabled={!selectedImage || uploadingImage}
                  className={`shrink-0 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                >
                  {uploadingImage ? "Uploading…" : "Upload"}
                </button>
              </div>
            </div>
          )}
        </section>

        {displayedImageError && (
          <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {displayedImageError}
          </p>
        )}
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
