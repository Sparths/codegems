// app/profile/page.tsx with Suspense boundary
"use client";

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import UserProfileContent from "./UserProfileContent";

// Loading component for Suspense fallback
const ProfileLoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-8">
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Loading Profile</h1>
        <p className="text-gray-400">Please wait while we load your profile...</p>
      </div>
    </div>
  </div>
);

const UserProfile = () => {
  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <UserProfileContent />
    </Suspense>
  );
};

export default UserProfile;