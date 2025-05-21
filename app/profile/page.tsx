// app/profile/page.tsx with project request tab
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BadgeDisplay from "@/components/BadgeDisplay";
import AuthenticationDialog from "@/components/AuthenticationDialog";
import UserProjectRequests from "@/components/UserProjectRequests";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  Star,
  MessageSquare,
  TrendingUp,
  User,
  Mail,
  Camera,
  Settings,
  FileText,
} from "lucide-react";
import ProfileForm from "@/components/ProfileForm";

interface ProfileStats {
  ratings: number;
  comments: number;
  submissions: number;
}

const UserProfile = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    ratings: 0,
    comments: 0,
    submissions: 0,
  });
  const [activeTab, setActiveTab] = useState<string>("profile");

  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
    } else if (user) {
      // Set active tab from URL parameter if present
      if (tabParam && ['profile', 'my-requests'].includes(tabParam)) {
        setActiveTab(tabParam);
      }

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
            submissions: 0, // Will be updated when we fetch project requests
          });
        } catch (error) {
          console.error("Error fetching user stats:", error);
        }
      };

      fetchStats();
    }
  }, [isAuthenticated, user, tabParam]);

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
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-24 h-24 rounded-full"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                          <User className="h-12 w-12 text-slate-400" />
                        </div>
                      )}
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
                        <FileText className="text-green-500 w-4 h-4" />
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
                  <Tabs 
                    defaultValue={activeTab} 
                    value={activeTab} 
                    onValueChange={(value) => {
                      setActiveTab(value);
                      router.push(`/profile?tab=${value}`);
                    }}
                  >
                    <TabsList className="bg-slate-700 w-full grid grid-cols-2">
                      <TabsTrigger
                        value="profile"
                        className="data-[state=active]:bg-slate-900"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Profile Settings
                      </TabsTrigger>
                      <TabsTrigger
                        value="my-requests"
                        className="data-[state=active]:bg-slate-900"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        My Project Requests
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="pt-6">
                      <ProfileForm />
                    </TabsContent>

                    <TabsContent value="my-requests" className="pt-6">
                      <UserProjectRequests />
                    </TabsContent>
                  </Tabs>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;