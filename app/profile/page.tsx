"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BadgeDisplay from "@/components/BadgeDisplay";
import AuthenticationDialog from "@/components/AuthenticationDialog";
import { useRouter } from "next/navigation";
import {
  Award,
  Star,
  MessageSquare,
  TrendingUp,
  User,
  Mail,
  Camera,
  Check,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProfileStats {
  ratings: number;
  comments: number;
  submissions: number;
}

const UserProfile = () => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    ratings: 0,
    comments: 0,
    submissions: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
    } else if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email || "");
      setAvatarUrl(user.avatarUrl);

      // Fetch user stats
      const fetchStats = async () => {
        try {
          const [ratingsRes, commentsRes] = await Promise.all([
            fetch(`/api/ratings?userId=${user.id}`),
            fetch(`/api/comments?userId=${user.id}`),
          ]);

          const ratings = await ratingsRes.json();
          const comments = await commentsRes.json();

          setStats({
            ratings: ratings.length,
            comments: comments.length,
            submissions: 0, // TODO: Implement project submissions count
          });
        } catch (error) {
          console.error("Error fetching user stats:", error);
        }
      };

      fetchStats();
    }
  }, [isAuthenticated, user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage(null);

    if (!user) return;

    try {
      setIsUpdating(true);

      const updateData: any = {
        displayName,
      };

      // Only include email if it's changed
      if (email && email !== user.email) {
        updateData.email = email;
      }

      // Only include avatar if it's changed
      if (avatarUrl && avatarUrl !== user.avatarUrl) {
        updateData.avatarUrl = avatarUrl;
      }

      const success = await updateUser(updateData);

      if (success) {
        setUpdateMessage({
          type: "success",
          text: "Your profile has been successfully updated.",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setUpdateMessage({
        type: "error",
        text: "Error updating profile.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage(null);

    if (!user) return;

    if (newPassword !== confirmNewPassword) {
      setUpdateMessage({
        type: "error",
        text: "New passwords don't match.",
      });
      return;
    }

    try {
      setIsUpdating(true);

      // Send password change directly to API
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setUpdateMessage({
          type: "success",
          text: "Your password has been successfully updated.",
        });

        // Clear password fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        const errorData = await response.json();
        setUpdateMessage({
          type: "error",
          text: errorData.error || "Error updating password.",
        });
      }
    } catch (error) {
      console.error("Error updating password:", error);
      setUpdateMessage({
        type: "error",
        text: "Error updating password.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = () => {
    // For simplicity, we're just using a random avatar from DiceBear
    const newSeed = Math.random().toString(36).substring(2, 8);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${newSeed}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 mt-10">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Profile</h1>
            <p className="text-gray-400 mb-6">
              You need to be signed in to view your profile.
            </p>
            <Button
              onClick={() => setShowAuthDialog(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Sign In
            </Button>

            <AuthenticationDialog
              isOpen={showAuthDialog}
              onOpenChange={setShowAuthDialog}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const levelProgress = user.points % 100;
  const pointsToNextLevel = 100 - levelProgress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 mt-10">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-8">
            Your Profile
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="bg-slate-800/50 border-slate-700 text-white h-fit">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">
                    <User className="inline-block mr-2 text-purple-400" />
                    {user.displayName}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    @{user.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={user.displayName}
                          className="w-24 h-24 rounded-full"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                          <User className="h-12 w-12 text-slate-400" />
                        </div>
                      )}
                      <button
                        onClick={handleAvatarChange}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center"
                      >
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <Award className="text-yellow-500" />
                      <span className="font-bold">Level {user.level}</span>
                    </div>

                    <div className="text-sm text-gray-400 mb-2">
                      {user.points} points ({pointsToNextLevel} to Level{" "}
                      {user.level + 1})
                    </div>

                    <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${levelProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Star className="text-yellow-500 w-4 h-4" />
                        <span className="text-sm">Ratings</span>
                      </div>
                      <span className="font-semibold">{stats.ratings}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="text-blue-500 w-4 h-4" />
                        <span className="text-sm">Comments</span>
                      </div>
                      <span className="font-semibold">{stats.comments}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-green-500 w-4 h-4" />
                        <span className="text-sm">Submissions</span>
                      </div>
                      <span className="font-semibold">{stats.submissions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 text-white mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Your Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <BadgeDisplay userBadges={user.badges} />
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600 text-white"
                    onClick={() => router.push("/badges")}
                  >
                    View All Badges
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Card className="bg-slate-800/50 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription className="text-gray-400">
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="bg-slate-700 w-full grid grid-cols-2">
                      <TabsTrigger
                        value="profile"
                        className="data-[state=active]:bg-slate-900"
                      >
                        Profile
                      </TabsTrigger>
                      <TabsTrigger
                        value="security"
                        className="data-[state=active]:bg-slate-900"
                      >
                        Security
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="pt-6">
                      {updateMessage && (
                        <Alert
                          className={`${
                            updateMessage.type === "success"
                              ? "bg-green-500/20 border-green-500"
                              : "bg-red-500/20 border-red-500"
                          } mb-6`}
                        >
                          {updateMessage.type === "success" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <AlertTitle>
                            {updateMessage.type === "success"
                              ? "Success!"
                              : "Error"}
                          </AlertTitle>
                          <AlertDescription>
                            {updateMessage.text}
                          </AlertDescription>
                        </Alert>
                      )}

                      <form
                        onSubmit={handleProfileUpdate}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="displayName">Display Name</Label>
                          <Input
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Display name"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>

                        <div className="pt-4">
                          <Button
                            type="submit"
                            className="bg-purple-500 hover:bg-purple-600 text-white"
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <span className="flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Updating...
                              </span>
                            ) : (
                              "Update Profile"
                            )}
                          </Button>
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="security" className="pt-6">
                      {updateMessage && (
                        <Alert
                          className={`${
                            updateMessage.type === "success"
                              ? "bg-green-500/20 border-green-500"
                              : "bg-red-500/20 border-red-500"
                          } mb-6`}
                        >
                          {updateMessage.type === "success" ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <AlertTitle>
                            {updateMessage.type === "success"
                              ? "Success!"
                              : "Error"}
                          </AlertTitle>
                          <AlertDescription>
                            {updateMessage.text}
                          </AlertDescription>
                        </Alert>
                      )}

                      <form
                        onSubmit={handlePasswordUpdate}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">
                            Current Password
                          </Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Your current password"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmNewPassword">
                            Confirm New Password
                          </Label>
                          <Input
                            id="confirmNewPassword"
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) =>
                              setConfirmNewPassword(e.target.value)
                            }
                            placeholder="Confirm new password"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>

                        <div className="pt-4">
                          <Button
                            type="submit"
                            className="bg-purple-500 hover:bg-purple-600 text-white"
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <span className="flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Updating...
                              </span>
                            ) : (
                              "Change Password"
                            )}
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;