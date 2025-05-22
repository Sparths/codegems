"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  ThumbsUp,
  Edit,
  Trash2,
  Reply,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import supabase from "@/lib/supabase";

interface CommentSectionProps {
  projectName: string;
}

interface Comment {
  id: string;
  project_name: string;
  user_id: string;
  text: string;
  parent_id: string | null;
  likes: string[];
  created_at: string;
  edited?: boolean;
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

const CommentSection: React.FC<CommentSectionProps> = ({ projectName }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Load comments for this project
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/comments?project=${encodeURIComponent(projectName)}`);
        
        if (response.ok) {
          const commentsData = await response.json();
          
          // Extract unique user IDs
          const userIds : string[] = Array.from(new Set(commentsData.map((c: Comment) => c.user_id)));
          
          // Fetch user data for all comments in a single request
          const usersData = await fetchUserData(userIds);
       
          
          // Attach user data to comments
          const enhancedComments = commentsData.map((comment: Comment) => ({
            ...comment,
            user: usersData[comment.user_id]
          }));
          
          setComments(enhancedComments);
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [projectName]);

  const handleCommentSubmit = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Sign-in required",
        description: "You must be signed in to write a comment.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          userId: user.id,
          text: newComment,
        }),
      });

      if (response.ok) {
        const newCommentData = await response.json();

        // Create enhanced comment with user data
        const enhancedComment = {
          ...newCommentData,
          user: {
            id: user.id,
            username: user.username,
            display_name: user.displayName,
            avatar_url: user.avatarUrl
          }
        };

        // Add new comment to the list
        setComments((prev) => [enhancedComment, ...prev]);

        // Reset comment field
        setNewComment("");

        toast({
          title: "Comment sent",
          description: "Your comment has been successfully posted.",
        });

        // Check for badges
        try {
          const badgeResponse = await fetch("/api/users?action=check_badges", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
            }),
          });

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
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Error sending comment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!isAuthenticated || !user || !replyToComment) return;

    if (!replyText.trim()) {
      toast({
        title: "Empty reply",
        description: "Please enter a reply.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          userId: user.id,
          text: replyText,
          parentId: replyToComment,
        }),
      });

      if (response.ok) {
        const newReplyData = await response.json();

        // Create enhanced reply with user data
        const enhancedReply = {
          ...newReplyData,
          user: {
            id: user.id,
            username: user.username,
            display_name: user.displayName,
            avatar_url: user.avatarUrl
          }
        };

        // Add new reply to the list
        setComments((prev) => [...prev, enhancedReply]);

        // Reset reply form
        setReplyToComment(null);
        setReplyText("");

        toast({
          title: "Reply sent",
          description: "Your reply has been successfully posted.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Error sending reply.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting reply:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!isAuthenticated || !user || !editingComment) return;

    if (!editText.trim()) {
      toast({
        title: "Empty comment",
        description: "Please enter a comment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId: editingComment,
          userId: user.id,
          action: "edit",
          text: editText,
        }),
      });

      if (response.ok) {
        const updatedComment = await response.json();

        // Update comment in the list
        setComments((prev) =>
          prev.map((c) => (c.id === editingComment ? { ...updatedComment, user: c.user } : c))
        );

        // Reset edit form
        setEditingComment(null);
        setEditText("");

        toast({
          title: "Comment updated",
          description: "Your comment has been successfully updated.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Error updating comment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!isAuthenticated || !user || !commentToDelete) return;

    try {
      const response = await fetch(
        `/api/comments?id=${commentToDelete}&userId=${user.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Remove comment and all replies from the list
        setComments((prev) =>
          prev.filter(
            (c) => c.id !== commentToDelete && c.parent_id !== commentToDelete
          )
        );

        setShowDeleteDialog(false);
        setCommentToDelete(null);

        toast({
          title: "Comment deleted",
          description: "Your comment has been successfully deleted.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Error deleting comment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (commentId: string) => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Sign-in required",
        description: "You must be signed in to like a comment.",
        variant: "destructive",
      });
      return;
    }

    try {
      const comment = comments.find((c) => c.id === commentId);
      if (!comment) return;

      const action = comment.likes.includes(user.id) ? "unlike" : "like";

      const response = await fetch("/api/comments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId,
          userId: user.id,
          action,
        }),
      });

      if (response.ok) {
        const updatedComment = await response.json();

        // Update comment in the list
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...updatedComment, user: c.user } : c))
        );
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description:
            errorData.error ||
            `Error ${action === "like" ? "liking" : "unliking"} comment.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error liking comment:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Sort comments by creation date and group into threads
  const rootComments = comments
    .filter((c) => !c.parent_id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const getReplies = (commentId: string) => {
    return comments
      .filter((c) => c.parent_id === commentId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const commentUser = comment.user;

    return (
      <div
        key={comment.id}
        className={`${
          isReply ? "ml-8 mt-3" : "mt-4"
        } bg-slate-800/50 p-4 rounded-lg border border-slate-700`}
      >
        <div className="flex justify-between">
          <div className="flex items-center gap-3">
            {commentUser && (
              <>
                {commentUser.avatar_url ? (
                  <img
                    src={commentUser.avatar_url}
                    alt={commentUser.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : null}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {commentUser.display_name}
                    </span>
                    {comment.user_id === user?.id && (
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
              </>
            )}
          </div>

          {comment.user_id === user?.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-slate-800 border-slate-700 text-white"
              >
                <DropdownMenuItem
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditText(comment.text);
                  }}
                  className="cursor-pointer flex items-center gap-2 hover:bg-slate-700"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCommentToDelete(comment.id);
                    setShowDeleteDialog(true);
                  }}
                  className="cursor-pointer flex items-center gap-2 text-red-400 hover:bg-slate-700 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {editingComment === comment.id ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingComment(null);
                  setEditText("");
                }}
                className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={isSubmitting}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-gray-300">
              {comment.text}
              {comment.edited && (
                <span className="text-xs text-gray-400 ml-2">(edited)</span>
              )}
            </p>

            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => handleLike(comment.id)}
                className={`flex items-center gap-1 text-sm ${
                  user && comment.likes.includes(user.id)
                    ? "text-blue-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>
                  {comment.likes.length > 0 ? comment.likes.length : ""}
                </span>
              </button>

              {isAuthenticated && (
                <button
                  onClick={() => {
                    setReplyToComment(comment.id);
                    setReplyText("");
                  }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
                >
                  <Reply className="h-4 w-4" />
                  <span>Reply</span>
                </button>
              )}
            </div>
          </>
        )}

        {replyToComment === comment.id && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReplyToComment(null)}
                className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReplySubmit}
                disabled={isSubmitting}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                Reply
              </Button>
            </div>
          </div>
        )}

        {/* Show replies */}
        {getReplies(comment.id).map((reply) => renderComment(reply, true))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="text-purple-500" />
        <h3 className="text-lg font-semibold text-white">Discussion</h3>
      </div>

      {isAuthenticated ? (
        <div className="space-y-3">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-24 bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleCommentSubmit}
              disabled={isSubmitting}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isSubmitting ? "Sending..." : "Post Comment"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <p className="text-gray-300">
            Sign in to join the discussion.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          <p className="mt-2 text-gray-400">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-400">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rootComments.map((comment) => renderComment(comment))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this comment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommentSection;