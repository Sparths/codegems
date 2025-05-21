// app/api/project-requests/route.tsx
import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { generateUUID } from "@/lib/utils-uuid";
import { createClient } from '@supabase/supabase-js';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL!;

// Admin Supabase client with service role to bypass RLS
// This requires adding SUPABASE_SERVICE_ROLE_KEY to your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminSupabase = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  supabase; // Fallback to regular client if no service key

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, githubLink, description, reason, userId } = body;

    console.log("Processing project request:", {
      title,
      githubLink,
      userId,
      descriptionLength: description?.length || 0,
      reasonLength: reason?.length || 0
    });

    // Validation
    if (!DISCORD_WEBHOOK_URL) {
      console.error("Discord webhook URL not configured");
      return NextResponse.json(
        { error: "Webhook URL not configured" },
        { status: 500 }
      );
    }

    if (!title || title.length > 100) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }

    if (!githubLink || !githubLink.startsWith("https://github.com/")) {
      return NextResponse.json(
        { error: "Invalid GitHub link" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // 1. Store in Supabase
    const requestId = generateUUID();
    const now = new Date().toISOString();
    
    const { error: insertError } = await supabase
      .from('project_requests')
      .insert({
        id: requestId,
        user_id: userId,
        title,
        github_link: githubLink,
        description,
        reason,
        status: 'pending',
        created_at: now
      });

    if (insertError) {
      console.error("Error storing project request:", insertError);
      return NextResponse.json(
        { error: "Failed to store project request" },
        { status: 500 }
      );
    }

    // 2. Send to Discord
    const discordMessage = {
      embeds: [
        {
          title: "🆕 New Project Request",
          color: 0x8d15cd,
          fields: [
            {
              name: "📝 Project Title",
              value: title || "Not provided",
            },
            {
              name: "🔗 GitHub Link",
              value: githubLink || "Not provided",
            },
            {
              name: "📋 Description",
              value: description?.substring(0, 1000) || "Not provided",
            },
            {
              name: "💡 Why is it good?",
              value: reason?.substring(0, 1000) || "Not provided",
            },
            {
              name: "🆔 Request ID",
              value: requestId,
            },
            {
              name: "👤 User ID",
              value: userId
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: "Codegems",
            icon_url: "https://www.codegems.xyz/icon.png",
          },
        },
      ],
    };

    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(discordMessage),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Discord API error:", errorText);
        // We continue even if Discord fails as we've stored in the database
      }
    } catch (discordError) {
      console.error("Error sending to Discord:", discordError);
      // We still return success as the DB operation worked
    }

    return NextResponse.json({ 
      success: true,
      requestId 
    });
  } catch (error) {
    console.error("Error processing project request:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

// app/api/project-requests/route.tsx
// Just the GET function needs to be fixed:

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const requestId = searchParams.get("id");
  const status = searchParams.get("status");
  const isAdmin = searchParams.get("admin") === "true";

  console.log("Project Requests API GET call with params:", { 
    userId, requestId, status, isAdmin 
  });

  try {
    // For admin requests, use admin client to bypass RLS
    if (isAdmin) {
      let query = adminSupabase.from('project_requests').select('*');
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (requestId) {
        query = query.eq('id', requestId);
      }
      
      // Sort by creation date, newest first
      query = query.order('created_at', { ascending: false });
      
      const { data: requests, error } = await query;
      
      if (error) {
        console.error("Admin query error:", error);
        return NextResponse.json(
          { error: "Failed to fetch project requests" },
          { status: 500 }
        );
      }
      
      console.log(`Found ${requests?.length || 0} project requests for admin`);
      return NextResponse.json(requests || []);
    } 
    // For user requests, make sure we use the regular client and proper filters
    else if (userId) {
      console.log(`Fetching requests for user ${userId}`);
      
      // Regular user query with RLS applied
      const { data: requests, error } = await supabase
        .from('project_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching user project requests:", error);
        return NextResponse.json(
          { error: "Failed to fetch project requests" },
          { status: 500 }
        );
      }

      console.log(`Found ${requests?.length || 0} project requests for user ${userId}`);
      return NextResponse.json(requests || []);
    } 
    // For single request lookup
    else if (requestId) {
      const { data: request, error } = await supabase
        .from('project_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        console.error("Error fetching project request:", error);
        return NextResponse.json(
          { error: "Failed to fetch project request" },
          { status: 500 }
        );
      }

      return NextResponse.json([request]);
    }
    
    // Default: return empty array for unspecified requests
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error in GET project-requests:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT: Update a project request status (admin only)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { requestId, status, adminNotes, adminId } = body;

    console.log("Updating project request:", { 
      requestId, status, adminId, 
      notesLength: adminNotes?.length || 0 
    });

    if (!requestId || !status || !adminId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!['pending', 'accepted', 'declined'].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Update the request using admin client to bypass RLS
    const now = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from('project_requests')
      .update({
        status,
        admin_notes: adminNotes || null,
        updated_at: now
      })
      .eq('id', requestId);

    if (updateError) {
      console.error("Error updating project request:", updateError);
      return NextResponse.json(
        { error: "Failed to update project request" },
        { status: 500 }
      );
    }

    // If request was accepted, get user info to award points and badges
    if (status === 'accepted') {
      const { data: request } = await adminSupabase
        .from('project_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();

      if (request) {
        console.log(`Awarding points to user ${request.user_id} for accepted project`);
        
        // Award points to the user
        const { data: userData, error: getUserError } = await adminSupabase
          .from('users')
          .select('points, badges')
          .eq('id', request.user_id)
          .single();

        if (!getUserError && userData) {
          // Update user points (+50 for accepted project)
          const { error: updateUserError } = await adminSupabase
            .from('users')
            .update({
              points: (userData.points || 0) + 50
            })
            .eq('id', request.user_id);
            
          if (updateUserError) {
            console.error("Error updating user points:", updateUserError);
          }

          // Check if user should get the "Explorer" badge
          if (!userData.badges?.includes("Explorer")) {
            const { error: updateBadgeError } = await adminSupabase
              .from('users')
              .update({
                badges: [...(userData.badges || []), "Explorer"]
              })
              .eq('id', request.user_id);
              
            if (updateBadgeError) {
              console.error("Error updating user badges:", updateBadgeError);
            }
          }

          // We'll rely on the next user login to trigger badge checking for level ups
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT project-requests:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}