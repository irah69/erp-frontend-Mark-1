"use client";

import { useEffect, useState } from "react";
import ProfileEditor from "../../components/profile/profile-editor";
import Loader from "../../components/ui/loader";
import {
  getCurrentUser,
  getMyUserProfile,
  uploadUserProfileImage,
  updateMyUserProfile,
  type CurrentUserResponse,
  type UserProfile,
} from "../../lib/api";

const roleNames: Record<number, string> = {
  1: "Administrator",
  2: "Staff",
  3: "Student",
  4: "Parent",
};

export default function ProfilePage() {
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const [currentUser, userProfile] = await Promise.all([
          getCurrentUser(),
          getMyUserProfile(),
        ]);

        if (!cancelled) {
          setUser(currentUser);
          setProfile(userProfile);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <Loader title="Loading your profile…" subtitle="Retrieving your account details" className="min-h-dvh" />;
  }

  if (error || !profile || !user) {
    return (
      <main className="min-h-dvh bg-slate-50 px-4 py-10">
        <section role="alert" className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-white p-6 text-red-700">
          <h1 className="text-lg font-semibold">Unable to load profile</h1>
          <p className="mt-2 text-sm">{error || "Your profile could not be loaded."}</p>
        </section>
      </main>
    );
  }

  return (
    <ProfileEditor
      initialProfile={profile}
      title="My profile"
      subtitle={`${roleNames[user.role_id] ?? "Account"} · ${user.username} · ${user.email}`}
      canEdit={user.role_id === 1 || user.role_id === 2}
      canUploadImage={user.role_id === 1 || user.role_id === 2}
      onSave={updateMyUserProfile}
      onUploadImage={async (file) => {
        await uploadUserProfileImage(profile.user_id, file);
        return getMyUserProfile();
      }}
    />
  );
}
