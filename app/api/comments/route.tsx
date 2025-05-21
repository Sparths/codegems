import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { generateUUID } from "@/lib/utils-uuid";


// GET: Fetch comments
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get("project");
  const userId = searchParams.get("userId");

  try {
    let query = supabase.from('comments').select('*');

    if (projectName) {
      query = query.eq('project_name', projectName);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error("Error getting comments:", error);
      return NextResponse.json(
        { error: `Failed to get comments: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(comments || []);
  } catch (error) {
    console.error("Error getting comments:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to get comments: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// POST: Create a new comment
export async function POST(request: Request) {
  
  try {
    const body = await request.json();
    const { projectName, userId, text, parentId } = body;

    console.log("Comment submission:", { projectName, userId, textLength: text?.length, parentId });

    // Validation
    if (!projectName || !projectName.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    if (!userId || !userId.trim()) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error("Error checking user:", userError);
      return NextResponse.json(
        { error: `User check failed: ${userError.message}` },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if parentId exists (if provided)
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .single();

      if (parentError && parentError.code !== 'PGRST116') {
        console.error("Error checking parent comment:", parentError);
        return NextResponse.json(
          { error: `Parent comment check failed: ${parentError.message}` },
          { status: 500 }
        );
      }

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    const commentId = generateUUID(); // Use UUID instead of timestamp + random string
    console.log(`Creating comment with ID: ${commentId}`);

    const newComment = {
      id: commentId,
      project_name: projectName,
      user_id: userId,
      text: text.trim(),
      parent_id: parentId || null,
      likes: [],
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('comments')
      .insert(newComment);

    if (insertError) {
      console.error("Error inserting comment:", insertError);
      return NextResponse.json(
        { error: `Failed to create comment: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log("Comment created successfully");

    // Replace the badge check portion in app/api/comments/route.tsx
// Find the section after successfully creating a comment

// Award points for new comment and check badges
try {
  // First update the points
  const { data: userData, error: getUserError } = await supabase
    .from('users')
    .select('points, badges')
    .eq('id', userId)
    .single();

  if (getUserError) {
    console.error("Error getting user data for points:", getUserError);
  } else if (userData) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        points: (userData.points || 0) + 2
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error("Error updating user points:", updateError);
    } else {
      console.log("User points updated successfully");
    }
  }
  
  // Now check for badges
  const badgeResponse = await fetch("/api/users?action=check_badges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: userId,
    }),
  });

  if (badgeResponse.ok) {
    const badgeData = await badgeResponse.json();
    
    if (badgeData.earnedBadges && badgeData.earnedBadges.length > 0) {
      console.log("Badges earned:", badgeData.earnedBadges.map((b: { name: any; }) => b.name).join(", "));
    }
    
    if (badgeData.levelUp) {
      console.log(`User leveled up to level ${badgeData.currentLevel}`);
    }
  } else {
    console.error("Error checking badges:", await badgeResponse.text());
  }
} catch (pointsError) {
  console.error("Error awarding points/badges:", pointsError);
  // Continue execution - points/badge award failure shouldn't stop comment submission
}

    return NextResponse.json(newComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create comment: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT: Update a comment (like/unlike/edit)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { commentId, userId, action, text } = body;

    console.log("Comment update:", { commentId, userId, action, textLength: text?.length });

    // Validation
    if (!commentId || !commentId.trim()) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    if (!userId || !userId.trim()) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!action || !["like", "unlike", "edit"].includes(action)) {
      return NextResponse.json(
        { error: "Valid action is required (like, unlike, or edit)" },
        { status: 400 }
      );
    }

    if (action === "edit" && (!text || !text.trim())) {
      return NextResponse.json(
        { error: "Comment text is required for edit action" },
        { status: 400 }
      );
    }

    // Get current comment
    const { data: comment, error: getCommentError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (getCommentError) {
      console.error("Error getting comment:", getCommentError);
      return NextResponse.json(
        { error: `Failed to get comment: ${getCommentError.message}` },
        { status: 500 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Handle different actions
    let updates = {};
    if (action === "like") {
      const likes = comment.likes || [];
      if (!likes.includes(userId)) {
        likes.push(userId);
      }
      updates = { likes };
    } else if (action === "unlike") {
      const likes = (comment.likes || []).filter((id: string) => id !== userId);
      updates = { likes };
    } else if (action === "edit") {
      // Verify the user is the author of the comment
      if (comment.user_id !== userId) {
        return NextResponse.json(
          { error: "Not authorized to edit this comment" },
          { status: 403 }
        );
      }
      
      updates = {
        text: text.trim(),
        edited: true,
        updated_at: new Date().toISOString()
      };
    }

    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating comment:", updateError);
      return NextResponse.json(
        { error: `Failed to update comment: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log("Comment updated successfully");
    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to update comment: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE: Delete a comment
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("id");
  const userId = searchParams.get("userId");

  if (!commentId || !userId) {
    return NextResponse.json(
      { error: "Comment ID and User ID are required" },
      { status: 400 }
    );
  }

  try {
    console.log(`Attempting to delete comment: ${commentId} by user: ${userId}`);
    
    // Check if comment exists and if user is the author
    const { data: comment, error: getCommentError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (getCommentError) {
      console.error("Error checking comment:", getCommentError);
      return NextResponse.json(
        { error: `Failed to check comment: ${getCommentError.message}` },
        { status: 500 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (comment.user_id !== userId) {
      return NextResponse.json(
        { error: "Not authorized to delete this comment" },
        { status: 403 }
      );
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error("Error deleting comment:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete comment: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Delete all replies to this comment
    try {
      await supabase
        .from('comments')
        .delete()
        .eq('parent_id', commentId);
    } catch (replyError) {
      console.error("Error deleting replies:", replyError);
      // Continue execution - we've already deleted the main comment
    }

    console.log("Comment deleted successfully");
    return NextResponse.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to delete comment: ${errorMessage}` },
      { status: 500 }
    );
  }
}