"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/context/AuthContext";
import ErrorHandler from "@/components/ErrorHandler";
import supabase from "@/lib/supabase";

interface RatingSystemProps {
  projectName: string;
  onRatingSubmit?: () => void;
}

interface Rating {
  id: string;
  project_name: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
}

interface BadgeResponse {
  earnedBadges: Badge[];
  levelUp: boolean;
  currentLevel: number;
  currentPoints: number;
}

const RatingSystem: React.FC<RatingSystemProps> = ({
  projectName,
  onRatingSubmit,
}) => {
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [projectRatings, setProjectRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Function to fetch user data for a list of user IDs
  const fetchUserData = async (userIds: string[]) => {
    if (!userIds.length) return {};

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      
      if (error) {
        console.error("Error fetching user data:", error);
        return {};
      }

      const usersMap: Record<string, User> = {};
      data.forEach((userData: User) => {
        usersMap[userData.id] = userData;
      });

      return usersMap;
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      return {};
    }
  };

  // Function to fetch ratings
  const fetchRatings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/ratings?project=${encodeURIComponent(projectName)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ratings: ${response.status}`);
      }
      
      const ratings = await response.json();

      // Extract unique user IDs
      const userIds : string[] = Array.from(new Set(ratings.map((r: Rating) => r.user_id)));
      
      // Fetch user data for all ratings in a single request
      const usersData = await fetchUserData(userIds);

      
      // Attach user data to ratings
      const enhancedRatings = ratings.map((rating: Rating) => ({
        ...rating,
        user: usersData[rating.user_id]
      }));
      
      setProjectRatings(enhancedRatings);

      // Calculate average rating
      if (enhancedRatings.length > 0) {
        const sum = enhancedRatings.reduce(
          (total: number, r: Rating) => total + r.rating,
          0
        );
        setAverageRating(sum / enhancedRatings.length);
      } else {
        setAverageRating(null);
      }

      // Check if the current user has already rated
      if (isAuthenticated && user) {
        const userExistingRating = enhancedRatings.find(
          (r: Rating) => r.user_id === user.id
        );
        
        if (userExistingRating) {
          setExistingRating(userExistingRating);
          setUserRating(userExistingRating.rating);
          setReview(userExistingRating.review || "");
          setShowReviewForm(true);
        } else {
          setExistingRating(null);
          setUserRating(null);
          setReview("");
          setShowReviewForm(false);
        }
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
      setError("Failed to load ratings. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [projectName, isAuthenticated, user]);

  // Load ratings on component mount and when dependencies change
  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const handleRatingClick = (rating: number) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to rate projects.",
        variant: "destructive",
      });
      return;
    }

    setUserRating(rating);
    setShowReviewForm(true);
  };

  const handleRatingHover = (rating: number) => {
    setHoverRating(rating);
  };

  const handleRatingLeave = () => {
    setHoverRating(null);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to rate projects.",
        variant: "destructive",
      });
      return;
    }

    if (!userRating) {
      toast({
        title: "Rating required",
        description: "Please select a rating.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          userId: user.id,
          rating: userRating,
          review,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save rating");
      }

      toast({
        title: existingRating
          ? "Rating updated"
          : "Rating submitted",
        description: existingRating
          ? "Your rating has been successfully updated."
          : "Your rating has been successfully submitted.",
      });

      // Create a user object for the current user
      const currentUser = {
        id: user.id,
        username: user.username,
        display_name: user.displayName,
        avatar_url: user.avatarUrl
      };

      // Check for badges if this is a new rating
      if (!existingRating) {
        try {
          const badgeResponse = await fetch(
            "/api/users?action=check_badges",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: user.id,
              }),
            }
          );

          if (badgeResponse.ok) {
            const badgeData: BadgeResponse = await badgeResponse.json();

            if (badgeData.earnedBadges && badgeData.earnedBadges.length > 0) {
              badgeData.earnedBadges.forEach((badge: Badge) => {
                toast({
                  title: "New badge unlocked!",
                  description: `You've earned the "${badge.name}" badge: ${badge.description}`,
                });
              });
            }

            if (badgeData.levelUp) {
              toast({
                title: "Level up!",
                description: `Congratulations! You've reached level ${badgeData.currentLevel}.`,
              });
            }
          }
        } catch (badgeError) {
          console.error("Error checking badges:", badgeError);
          // Non-critical error, don't show to user
        }

        // Create a new rating object for immediate display
        const newRating = {
          id: `rating_${Date.now()}`,
          project_name: projectName,
          user_id: user.id,
          rating: userRating,
          review: review || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: currentUser
        };

        // Add to the existing ratings
        setProjectRatings(prev => {
          const updatedRatings = [...prev, newRating];
          
          // Recalculate average
          const sum = updatedRatings.reduce((total, r) => total + r.rating, 0);
          setAverageRating(sum / updatedRatings.length);
          
          return updatedRatings;
        });
        
        // Set as existing rating
        setExistingRating(newRating);
      } else {
        // Update existing rating
        setProjectRatings(prev => {
          const updatedRatings = prev.map(r => {
            if (r.id === existingRating.id) {
              return {
                ...r,
                rating: userRating,
                review: review || "",
                updated_at: new Date().toISOString()
              };
            }
            return r;
          });
          
          // Recalculate average
          const sum = updatedRatings.reduce((total, r) => total + r.rating, 0);
          setAverageRating(sum / updatedRatings.length);
          
          return updatedRatings;
        });
        
        // Update existing rating
        setExistingRating(prev => ({
          ...prev!,
          rating: userRating,
          review: review || "",
          updated_at: new Date().toISOString()
        }));
      }

      // Call the callback if provided
      if (onRatingSubmit) {
        onRatingSubmit();
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorHandler error={error} isLoading={isLoading} retry={fetchRatings}>
      <div className="space-y-4">
        <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex flex-col items-center sm:items-start">
            <h3 className="text-lg font-semibold text-white mb-2">
              Project Rating
            </h3>

            {averageRating !== null && (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.floor(averageRating)
                          ? "text-yellow-400 fill-yellow-400"
                          : star <= averageRating
                          ? "text-yellow-400 fill-yellow-400 opacity-50"
                          : "text-gray-400"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-white">
                  {averageRating.toFixed(1)} ({projectRatings.length}{" "}
                  {projectRatings.length === 1 ? "rating" : "ratings"})
                </span>
              </div>
            )}

            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => handleRatingHover(star)}
                  onMouseLeave={handleRatingLeave}
                  className="transition-transform hover:scale-110 p-1"
                  disabled={isSubmitting}
                >
                  <Star
                    className={`w-6 h-6 ${
                      (
                        hoverRating !== null
                          ? star <= hoverRating
                          : star <= (userRating || 0)
                      )
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-400"
                    }`}
                  />
                </button>
              ))}
            </div>

            {!isAuthenticated && (
              <p className="text-sm text-gray-400 mt-2">
                Sign in to rate this project.
              </p>
            )}
          </div>

          {existingRating && (
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <span className="text-sm text-gray-400">
                You&apos;ve already rated this project. You can edit your rating.
              </span>
            </div>
          )}
        </div>

        {showReviewForm && isAuthenticated && (
          <div className="mt-4 space-y-3">
            <Textarea
              placeholder="Write a comment about your rating (optional)"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="min-h-32 bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
              disabled={isSubmitting}
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {isSubmitting
                  ? "Submitting..."
                  : existingRating
                  ? "Update Rating"
                  : "Submit Rating"}
              </Button>
            </div>
          </div>
        )}

        {projectRatings.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">All Ratings</h3>

            <div className="space-y-4">
              {projectRatings
                .filter((r) => r.review) // Only show ratings with reviews
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((rating) => (
                  <div
                    key={rating.id}
                    className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {rating.user && (
                          <>
                            {rating.user.avatar_url ? (
                              <img
                                src={rating.user.avatar_url}
                                alt={rating.user.username}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : null}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">
                                  {rating.user.display_name}
                                </span>
                                {rating.user_id === user?.id && (
                                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= rating.rating
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-400"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <span className="text-sm text-gray-400">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {rating.review && (
                      <p className="mt-3 text-gray-300">{rating.review}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </ErrorHandler>
  );
};

export default RatingSystem;