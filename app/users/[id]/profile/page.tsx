"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProfileEditor from "../../../../components/profile/profile-editor";
import {
  getUserProfile,
  updateUserProfile,
  uploadUserProfileImage,
  type UserProfile,
} from "../../../../lib/api";
import { checkSession } from "../../../../lib/auth";

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const userIdParam = params.id;
  const userId = Number(userIdParam);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        if (!/^[1-9]\d*$/.test(userIdParam) || !Number.isSafeInteger(userId)) {
          throw new Error("The user ID is invalid.");
        }

        const currentUser = await checkSession();
        if (!currentUser) {
          throw new Error("Please sign in to view user profiles.");
        }
        if (currentUser.role_id !== 1 && currentUser.role_id !== 2) {
          throw new Error("Only administrators or assigned staff can view this profile.");
        }

        const userProfile = await getUserProfile(userId);
        if (!cancelled) setProfile(userProfile);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load user profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId, userIdParam]);

  if (loading || (!error && profile && profile.user_id !== userId)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 text-sm text-slate-600">
        Loading user profile…
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-dvh bg-slate-50 px-4 py-10">
        <section role="alert" className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-white p-6 text-red-700">
          <h1 className="text-lg font-semibold">Unable to load user profile</h1>
          <p className="mt-2 text-sm">{error || "The user profile could not be loaded."}</p>
        </section>
      </main>
    );
  }

  return (
    <ProfileEditor
      initialProfile={profile}
      title={profile.full_name?.trim() || `User #${profile.user_id}`}
      subtitle={`Student profile · User #${profile.user_id}`}
      canUploadImage
      onSave={(update) => updateUserProfile(profile.user_id, update)}
      onUploadImage={async (file) => {
        await uploadUserProfileImage(profile.user_id, file);
        return getUserProfile(profile.user_id);
      }}
    />
  );
}
