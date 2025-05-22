import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { generateUUID } from "@/lib/utils-uuid";
import { rateLimit, createRateLimitHeaders } from "@/lib/rate-limiter";

// Input validation and sanitization
const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters and trim
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent XSS
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

const validateComment = (text: string): boolean => {
  return text.length >= 1 && text.length <= 2000;
};

const validateProjectName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z0-9._-]+$/;
  return nameRegex.test(name) && name.length >= 1 && name.length <= 100;
};

const validateUserId = (userId: string): boolean => {
  // Basic UUID/user ID validation
  return userId.length >= 5 && userId.length <= 50;
};

// GET: Fetch comments
export async function GET(request: Request) {
  try {
    // Apply rate limiting with better limits
    const rateLimitResult = await rateLimit(request, 'comments');
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many requests", 
          retryAfter: rateLimitResult.reset 
        },
        { 
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': rateLimitResult.reset?.toString() || '300'
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get("project");
    const userId = searchParams.get("userId");

    // Validate and sanitize inputs
    const sanitizedProjectName = projectName ? sanitizeInput(projectName) : null;
    const sanitizedUserId = userId ? sanitizeInput(userId) : null;

    if (sanitizedProjectName && !validateProjectName(sanitizedProjectName)) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (sanitizedUserId && !validateUserId(sanitizedUserId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    let query = supabase.from('comments').select('*');

    if (sanitizedProjectName) {
      query = query.eq('project_name', sanitizedProjectName);
    }

    if (sanitizedUserId) {
      query = query.eq('user_id', sanitizedUserId);
    }

    // Limit results to prevent large data dumps
    query = query.limit(1000).order('created_at', { ascending: false });

    const { data: comments, error } = await query;

    if (error) {
      console.error("Error getting comments:", error);
      return NextResponse.json(
        { error: "Failed to get comments" },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(comments || [], { headers: rateLimitHeaders });
  } catch (error) {
    console.error("Error getting comments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new comment
export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'comments');
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many comments. Please wait before posting again.",
          retryAfter: rateLimitResult.reset 
        },
        { 
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': rateLimitResult.reset?.toString() || '300'
          }
        }
      );
    }

    const body = await request.json();
    const { projectName, userId, text, parentId } = body;

    // Validation
    if (!projectName || !userId || !text) {
      return NextResponse.json(
        { error: "Project name, user ID, and comment text are required" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Sanitize inputs
    const sanitizedProjectName = sanitizeInput(projectName);
    const sanitizedUserId = sanitizeInput(userId);
    const sanitizedText = sanitizeInput(text);
    const sanitizedParentId = parentId ? sanitizeInput(parentId) : null;

    // Validate inputs
    if (!validateProjectName(sanitizedProjectName)) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!validateUserId(sanitizedUserId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!validateComment(sanitizedText)) {
      return NextResponse.json(
        { error: "Comment must be between 1 and 2000 characters" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', sanitizedUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User authentication failed" },
        { status: 401, headers: rateLimitHeaders }
      );
    }

    // Check if parentId exists (if provided)
    if (sanitizedParentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', sanitizedParentId)
        .single();

      if (parentError || !parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404, headers: rateLimitHeaders }
        );
      }
    }

    // Check for recent comments to prevent spam (more lenient)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { data: recentComments, error: recentError } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', sanitizedUserId)
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (recentComments && recentComments.length >= 10) { // Increased from 5 to 10
      return NextResponse.json(
        { error: "Too many recent comments. Please wait before posting again." },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // Check for duplicate comments
    const { data: duplicateComment, error: duplicateError } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', sanitizedUserId)
      .eq('project_name', sanitizedProjectName)
      .eq('text', sanitizedText)
      .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString()); // Last minute

    if (duplicateComment && duplicateComment.length > 0) {
      return NextResponse.json(
        { error: "Duplicate comment detected" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const commentId = generateUUID();
    const newComment = {
      id: commentId,
      project_name: sanitizedProjectName,
      user_id: sanitizedUserId,
      text: sanitizedText,
      parent_id: sanitizedParentId,
      likes: [],
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('comments')
      .insert(newComment);

    if (insertError) {
      console.error("Error inserting comment:", insertError);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    // Award points and check badges
    try {
      // Update user points
      const { data: userData, error: getUserError } = await supabase
        .from('users')
        .select('points, badges')
        .eq('id', sanitizedUserId)
        .single();

      if (!getUserError && userData) {
        await supabase
          .from('users')
          .update({
            points: (userData.points || 0) + 2
          })
          .eq('id', sanitizedUserId);
      }

      // Check for badges (simplified)
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/users?action=check_badges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: sanitizedUserId,
        }),
      });
    } catch (error) {
      console.error("Error awarding points:", error);
      // Don't fail the comment creation if points award fails
    }

    return NextResponse.json(newComment, { headers: rateLimitHeaders });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a comment (like/unlike/edit)
export async function PUT(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'comments');
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { 
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': rateLimitResult.reset?.toString() || '60'
          }
        }
      );
    }

    const body = await request.json();
    const { commentId, userId, action, text } = body;

    // Validation
    if (!commentId || !userId || !action) {
      return NextResponse.json(
        { error: "Comment ID, user ID, and action are required" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Sanitize inputs
    const sanitizedCommentId = sanitizeInput(commentId);
    const sanitizedUserId = sanitizeInput(userId);
    const sanitizedAction = sanitizeInput(action);
    const sanitizedText = text ? sanitizeInput(text) : null;

    if (!["like", "unlike", "edit"].includes(sanitizedAction)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (sanitizedAction === "edit" && (!sanitizedText || !validateComment(sanitizedText))) {
      return NextResponse.json(
        { error: "Valid comment text is required for edit action" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Get current comment
    const { data: comment, error: getCommentError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', sanitizedCommentId)
      .single();

    if (getCommentError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    // Handle different actions
    let updates = {};
    if (sanitizedAction === "like") {
      const likes = comment.likes || [];
      if (!likes.includes(sanitizedUserId)) {
        likes.push(sanitizedUserId);
      }
      updates = { likes };
    } else if (sanitizedAction === "unlike") {
      const likes = (comment.likes || []).filter((id: string) => id !== sanitizedUserId);
      updates = { likes };
    } else if (sanitizedAction === "edit") {
      // Verify the user is the author
      if (comment.user_id !== sanitizedUserId) {
        return NextResponse.json(
          { error: "Not authorized to edit this comment" },
          { status: 403, headers: rateLimitHeaders }
        );
      }
      
      updates = {
        text: sanitizedText,
        edited: true,
        updated_at: new Date().toISOString()
      };
    }

    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', sanitizedCommentId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating comment:", updateError);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(updatedComment, { headers: rateLimitHeaders });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a comment
export async function DELETE(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'comments');
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { 
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': rateLimitResult.reset?.toString() || '60'
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!commentId || !userId) {
      return NextResponse.json(
        { error: "Comment ID and User ID are required" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Sanitize inputs
    const sanitizedCommentId = sanitizeInput(commentId);
    const sanitizedUserId = sanitizeInput(userId);

    // Check if comment exists and user is authorized
    const { data: comment, error: getCommentError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', sanitizedCommentId)
      .single();

    if (getCommentError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    if (comment.user_id !== sanitizedUserId) {
      return NextResponse.json(
        { error: "Not authorized to delete this comment" },
        { status: 403, headers: rateLimitHeaders }
      );
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', sanitizedCommentId);

    if (deleteError) {
      console.error("Error deleting comment:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    // Delete all replies to this comment
    try {
      await supabase
        .from('comments')
        .delete()
        .eq('parent_id', sanitizedCommentId);
    } catch (replyError) {
      console.error("Error deleting replies:", replyError);
      // Continue execution
    }

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}