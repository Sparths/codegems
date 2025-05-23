import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { generateUUID } from "@/lib/utils-uuid";
import { createClient } from '@supabase/supabase-js';
import { sanitizeInput, sanitizeURL } from "@/lib/security/sanitization";
import { verifySecureAdminToken } from "@/lib/security/secure-token";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Admin Supabase client with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminSupabase = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  supabase;

// Enhanced validation functions
const validateGitHubUrl = (url: string): boolean => {
  const sanitizedUrl = sanitizeURL(url);
  if (!sanitizedUrl) return false;
  
  const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/?$/;
  return githubRegex.test(sanitizedUrl);
};

const validateTitle = (title: string): boolean => {
  return title.length >= 3 && title.length <= 100;
};

const validateDescription = (description: string): boolean => {
  return description.length >= 10 && description.length <= 1000;
};

const validateReason = (reason: string): boolean => {
  return reason.length >= 10 && reason.length <= 1000;
};

// Secure admin verification
const verifyAdminAccess = async (request: Request): Promise<{
  isValid: boolean;
  user?: { id: string };
  error?: string;
}> => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false, error: 'Missing authorization header' };
    }

    const token = authHeader.substring(7);
    
    // Verify admin token using secure method
    const verification = verifySecureAdminToken(token);
    
    if (!verification.isValid) {
      return { isValid: false, error: verification.error || 'Invalid token' };
    }
    
    return { 
      isValid: true, 
      user: { id: verification.userId! }
    };
  } catch (error) {
    console.error("Admin verification error:", error);
    return { isValid: false, error: 'Verification failed' };
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, githubLink, description, reason, userId } = body;

    // Input validation
    if (!title || !githubLink || !description || !reason || !userId) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Sanitize inputs with enhanced sanitization
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedGithubLink = sanitizeURL(githubLink) || '';
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedReason = sanitizeInput(reason);
    const sanitizedUserId = sanitizeInput(userId);

    // Validate inputs
    if (!validateTitle(sanitizedTitle)) {
      return NextResponse.json(
        { error: "Title must be between 3 and 100 characters" },
        { status: 400 }
      );
    }

    if (!validateGitHubUrl(sanitizedGithubLink)) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL" },
        { status: 400 }
      );
    }

    if (!validateDescription(sanitizedDescription)) {
      return NextResponse.json(
        { error: "Description must be between 10 and 1000 characters" },
        { status: 400 }
      );
    }

    if (!validateReason(sanitizedReason)) {
      return NextResponse.json(
        { error: "Reason must be between 10 and 1000 characters" },
        { status: 400 }
      );
    }

    // Verify user exists and is authenticated
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', sanitizedUserId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User authentication failed" },
        { status: 401 }
      );
    }

    // Check for duplicate submissions
    const { data: existingRequest } = await supabase
      .from('project_requests')
      .select('id')
      .eq('user_id', sanitizedUserId)
      .eq('github_link', sanitizedGithubLink)
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { error: "You have already submitted this project" },
        { status: 400 }
      );
    }

    // Check recent submissions to prevent spam with per-user rate limiting
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentRequests } = await supabase
      .from('project_requests')
      .select('id')
      .eq('user_id', sanitizedUserId)
      .gte('created_at', oneHourAgo.toISOString());

    if (recentRequests && recentRequests.length >= 2) {
      return NextResponse.json(
        { error: "Too many recent submissions. Please wait before submitting another project." },
        { status: 429 }
      );
    }

    // Store in database
    const requestId = generateUUID();
    const now = new Date().toISOString();
    
    const { error: insertError } = await adminSupabase
      .from('project_requests')
      .insert({
        id: requestId,
        user_id: sanitizedUserId,
        title: sanitizedTitle,
        github_link: sanitizedGithubLink,
        description: sanitizedDescription,
        reason: sanitizedReason,
        status: 'pending',
        created_at: now
      });

    if (insertError) {
      console.error("Error storing project request:", insertError);
      return NextResponse.json(
        { error: "Failed to submit project request" },
        { status: 500 }
      );
    }

    // Send to Discord (if webhook is configured) - in try-catch to not fail main request
    if (DISCORD_WEBHOOK_URL) {
      try {
        const discordMessage = {
          embeds: [
            {
              title: "🆕 New Project Request",
              color: 0x8d15cd,
              fields: [
                {
                  name: "📝 Project Title",
                  value: sanitizedTitle.substring(0, 1000),
                },
                {
                  name: "🔗 GitHub Link",
                  value: sanitizedGithubLink,
                },
                {
                  name: "📋 Description",
                  value: sanitizedDescription.substring(0, 1000),
                },
                {
                  name: "💡 Why is it good?",
                  value: sanitizedReason.substring(0, 1000),
                },
                {
                  name: "👤 Submitted by",
                  value: userData.username,
                },
                {
                  name: "🆔 Request ID",
                  value: requestId,
                }
              ],
              timestamp: now,
              footer: {
                text: "Codegems",
                icon_url: "https://www.codegems.xyz/icon.png",
              },
            },
          ],
        };

        await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(discordMessage),
        });
      } catch (discordError) {
        console.error("Error sending to Discord:", discordError);
        // Continue execution - Discord notification failure shouldn't fail the request
      }
    }

    return NextResponse.json({ 
      success: true,
      requestId 
    });
  } catch (error) {
    console.error("Error processing project request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const requestId = searchParams.get("id");
    const status = searchParams.get("status");
    const isAdmin = searchParams.get("admin") === "true";

    // Validate and sanitize inputs
    const sanitizedUserId = userId ? sanitizeInput(userId) : null;
    const sanitizedRequestId = requestId ? sanitizeInput(requestId) : null;
    const sanitizedStatus = status ? sanitizeInput(status) : null;

    if (isAdmin) {
      // For admin requests, verify the admin token
      console.log("Admin request detected");
      
      const adminVerification = await verifyAdminAccess(request);
      if (!adminVerification.isValid) {
        return NextResponse.json(
          { error: adminVerification.error || "Admin access required" },
          { status: 403 }
        );
      }

      console.log("Admin verification passed, fetching all requests");

      let query = adminSupabase.from('project_requests').select('*');
      
      if (sanitizedStatus && ['pending', 'accepted', 'declined'].includes(sanitizedStatus)) {
        query = query.eq('status', sanitizedStatus);
      }
      
      if (sanitizedRequestId) {
        query = query.eq('id', sanitizedRequestId);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data: requests, error } = await query;
      
      if (error) {
        console.error("Admin query error:", error);
        return NextResponse.json(
          { error: "Failed to fetch project requests" },
          { status: 500 }
        );
      }
      
      console.log(`Returning ${requests?.length || 0} requests for admin`);
      return NextResponse.json(requests || []);
    } 
    else if (sanitizedUserId) {
      // Regular user query - only return their own requests
      const { data: requests, error } = await supabase
        .from('project_requests')
        .select('*')
        .eq('user_id', sanitizedUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching user project requests:", error);
        return NextResponse.json(
          { error: "Failed to fetch project requests" },
          { status: 500 }
        );
      }

      return NextResponse.json(requests || []);
    } 
    else if (sanitizedRequestId) {
      // Single request lookup (only for the owner)
      const { data: request, error } = await supabase
        .from('project_requests')
        .select('*')
        .eq('id', sanitizedRequestId)
        .single();

      if (error || !request) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }

      return NextResponse.json([request]);
    }
    
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error in GET project-requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { requestId, status, adminNotes } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status are required" },
        { status: 400 }
      );
    }

    // Verify admin access using secure token
    const adminVerification = await verifyAdminAccess(request);
    if (!adminVerification.isValid) {
      return NextResponse.json(
        { error: adminVerification.error || "Admin access required" },
        { status: 403 }
      );
    }

    // Sanitize inputs
    const sanitizedRequestId = sanitizeInput(requestId);
    const sanitizedStatus = sanitizeInput(status);
    const sanitizedAdminNotes = adminNotes ? sanitizeInput(adminNotes) : null;

    if (!['pending', 'accepted', 'declined'].includes(sanitizedStatus)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Update the request
    const now = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from('project_requests')
      .update({
        status: sanitizedStatus,
        admin_notes: sanitizedAdminNotes,
        updated_at: now
      })
      .eq('id', sanitizedRequestId);

    if (updateError) {
      console.error("Error updating project request:", updateError);
      return NextResponse.json(
        { error: "Failed to update project request" },
        { status: 500 }
      );
    }

    // Award points and badge if accepted
    if (sanitizedStatus === 'accepted') {
      const { data: request } = await adminSupabase
        .from('project_requests')
        .select('user_id')
        .eq('id', sanitizedRequestId)
        .single();

      if (request) {
        // Award points and Explorer badge
        const { data: userData } = await adminSupabase
          .from('users')
          .select('points, badges')
          .eq('id', request.user_id)
          .single();

        if (userData) {
          const updatedBadges = userData.badges?.includes("Explorer") 
            ? userData.badges 
            : [...(userData.badges || []), "Explorer"];

          await adminSupabase
            .from('users')
            .update({
              points: (userData.points || 0) + 50,
              badges: updatedBadges
            })
            .eq('id', request.user_id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT project-requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}