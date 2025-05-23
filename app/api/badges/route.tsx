// app/api/badges/route.tsx
import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { rateLimit, createRateLimitHeaders } from "@/lib/security/rate-limiter-config";
import { sanitizeInput } from "@/lib/security/sanitization";


const defaultBadges = [
  // Existing Badges
  {
    id: "newcomer",
    name: "Newcomer",
    description: "Create an account",
    icon: "Gift",
    points: 10,
  },
  {
    id: "first_rating",
    name: "Critic",
    description: "Give your first rating",
    icon: "Star",
    points: 20,
  },
  {
    id: "first_comment",
    name: "Commentator",
    description: "Write your first comment",
    icon: "MessageSquare",
    points: 20,
  },
  {
    id: "project_submitter",
    name: "Explorer",
    description: "Submit your first project",
    icon: "Search",
    points: 50,
  },
  {
    id: "rating_10",
    name: "Rating Master",
    description: "Give 10 ratings",
    icon: "Award",
    points: 100,
  },
  {
    id: "comment_10",
    name: "Discussion Master",
    description: "Write 10 comments",
    icon: "MessageCircle",
    points: 100,
  },
  {
    id: "level_5",
    name: "Advanced",
    description: "Reach level 5",
    icon: "TrendingUp",
    points: 100,
  },
  {
    id: "level_10",
    name: "Expert",
    description: "Reach level 10",
    icon: "Award",
    points: 150,
  },
  
  // New Project-related Badges
  {
    id: "project_curator",
    name: "Project Curator",
    description: "Submit 5 projects that get accepted",
    icon: "FolderPlus",
    points: 200,
  },
  {
    id: "discovery_guru",
    name: "Discovery Guru",
    description: "Submit 10 projects that get accepted",
    icon: "Compass",
    points: 500,
  },
  {
    id: "trending_finder",
    name: "Trending Finder",
    description: "Submit a project that gets 50+ saves",
    icon: "Trending",
    points: 300,
  },
  
  // New Ratings-related Badges
  {
    id: "review_expert",
    name: "Review Expert",
    description: "Write 25 ratings",
    icon: "Star",
    points: 200,
  },
  {
    id: "review_guru",
    name: "Review Guru",
    description: "Write 50 ratings",
    icon: "Stars",
    points: 400,
  },
  {
    id: "review_legend",
    name: "Review Legend",
    description: "Write 100 ratings",
    icon: "Crown",
    points: 1000,
  },
  {
    id: "detailed_reviewer",
    name: "Detailed Reviewer",
    description: "Write 10 ratings with text reviews",
    icon: "FileText",
    points: 150,
  },
  
  // New Comments-related Badges
  {
    id: "conversation_starter",
    name: "Conversation Starter",
    description: "Get 5 replies to your comments",
    icon: "MessageCircle",
    points: 100,
  },
  {
    id: "discussion_expert",
    name: "Discussion Expert",
    description: "Write 25 comments",
    icon: "MessageSquare",
    points: 200,
  },
  {
    id: "discussion_guru",
    name: "Discussion Guru",
    description: "Write 50 comments",
    icon: "MessageSquare",
    points: 400,
  },
  {
    id: "community_voice",
    name: "Community Voice",
    description: "Write 100 comments",
    icon: "MessageSquare",
    points: 1000,
  },
  
  // Activity-related Badges
  {
    id: "regular_visitor",
    name: "Regular Visitor",
    description: "Visit the site for 7 consecutive days",
    icon: "Calendar",
    points: 100,
  },
  {
    id: "platform_enthusiast",
    name: "Platform Enthusiast",
    description: "Perform any activity for 30 consecutive days",
    icon: "Calendar",
    points: 300,
  },
  {
    id: "early_adopter",
    name: "Early Adopter",
    description: "Be among the first 100 users",
    icon: "Zap",
    points: 200,
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "Account is older than 1 year",
    icon: "Clock",
    points: 250,
  },
  
  // Social-related Badges
  {
    id: "community_helper",
    name: "Community Helper",
    description: "Help 5 users by replying to their questions",
    icon: "HelpCircle",
    points: 150,
  },
  {
    id: "networking_pro",
    name: "Networking Pro",
    description: "Connect with 10 users through comments/interactions",
    icon: "Users",
    points: 200,
  },
  {
    id: "discord_joiner",
    name: "Discord Member",
    description: "Join the Discord community",
    icon: "MessageSquare",
    points: 50,
  },
  
  // Specialty-related Badges
  {
    id: "python_enthusiast",
    name: "Python Enthusiast",
    description: "Rate or comment on 5 Python projects",
    icon: "Code",
    points: 100,
  },
  {
    id: "javascript_wizard",
    name: "JavaScript Wizard",
    description: "Rate or comment on 5 JavaScript projects",
    icon: "Code",
    points: 100,
  },
  {
    id: "ai_navigator",
    name: "AI Navigator",
    description: "Rate or comment on 5 AI-related projects",
    icon: "Brain",
    points: 100,
  },
  {
    id: "tool_explorer",
    name: "Tool Explorer",
    description: "Rate or comment on projects in 5 different categories",
    icon: "Tool",
    points: 150,
  },
  
  // Milestone-related Badges
  {
    id: "bronze_milestone",
    name: "Bronze Milestone",
    description: "Reach level 15",
    icon: "Award",
    points: 200,
  },
  {
    id: "silver_milestone",
    name: "Silver Milestone",
    description: "Reach level 25",
    icon: "Award",
    points: 300,
  },
  {
    id: "gold_milestone",
    name: "Gold Milestone",
    description: "Reach level 50",
    icon: "Award",
    points: 500,
  },
  {
    id: "platinum_milestone",
    name: "Platinum Milestone",
    description: "Reach level 100",
    icon: "Award",
    points: 1000,
  },
];

interface BadgeUpdate {
  id?: string;
  description?: string;
  icon?: string;
  points?: number;
}

// GET: Get all badges or a specific badge
export async function GET(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'default');
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(rateLimitResult),
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const badgeName = searchParams.get("name");
    const sanitizedBadgeName = badgeName ? sanitizeInput(badgeName) : null;

    // Check if badges table is empty
    const { data: badgesCount, error: countError } = await supabase
      .from('badges')
      .select('id', { count: 'exact' });
    
    // If no badges or error, create default badges
    if (countError || !badgesCount || badgesCount.length === 0) {
      const { error: insertError } = await supabase
        .from('badges')
        .insert(defaultBadges);
      
      if (insertError) {
        console.error("Error creating default badges:", insertError);
        return NextResponse.json(
          { error: "Failed to create default badges" },
          { 
            status: 500,
            headers: createRateLimitHeaders(rateLimitResult)
          }
        );
      }
    }

    if (sanitizedBadgeName) {
      // Get a specific badge by name
      const { data: badge, error } = await supabase
        .from('badges')
        .select('*')
        .eq('name', sanitizedBadgeName)
        .single();
      
      if (error || !badge) {
        return NextResponse.json(
          { error: "Badge not found" }, 
          { 
            status: 404,
            headers: createRateLimitHeaders(rateLimitResult)
          }
        );
      }
      
      return NextResponse.json(badge, {
        headers: createRateLimitHeaders(rateLimitResult)
      });
    }

    // Get all badges
    const { data: badges, error } = await supabase
      .from('badges')
      .select('*');
    
    if (error) {
      return NextResponse.json(
        { error: "Failed to get badges" },
        { 
          status: 500,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    return NextResponse.json(badges, {
      headers: createRateLimitHeaders(rateLimitResult)
    });
  } catch (error) {
    console.error("Error getting badges:", error);
    return NextResponse.json(
      { error: "Failed to get badges" },
      { status: 500 }
    );
  }
}

// POST: Create a new badge (for admin purposes)
export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'default');
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(rateLimitResult),
          }
        }
      );
    }

    const body = await request.json();
    const { id, name, description, icon, points } = body;

    // Sanitize inputs
    const sanitizedId = sanitizeInput(id);
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedIcon = sanitizeInput(icon);

    if (!sanitizedId || !sanitizedName || !sanitizedDescription || !sanitizedIcon || !points) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Validate points is a number
    if (typeof points !== 'number' || points < 0) {
      return NextResponse.json(
        { error: "Points must be a positive number" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Check if badge with this name already exists
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('name')
      .eq('name', sanitizedName)
      .single();

    if (existingBadge) {
      return NextResponse.json(
        { error: "Badge with this name already exists" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Create new badge
    const { error } = await supabase
      .from('badges')
      .insert({
        id: sanitizedId,
        name: sanitizedName,
        description: sanitizedDescription,
        icon: sanitizedIcon,
        points
      });

    if (error) {
      console.error("Error creating badge:", error);
      return NextResponse.json(
        { error: "Failed to create badge" },
        { 
          status: 500,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error("Error creating badge:", error);
    return NextResponse.json(
      { error: "Failed to create badge" },
      { status: 500 }
    );
  }
}

// PUT: Update an existing badge
export async function PUT(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'default');
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(rateLimitResult),
          }
        }
      );
    }

    const body = await request.json();
    const { id, name, description, icon, points } = body;

    const sanitizedName = sanitizeInput(name);

    if (!sanitizedName) {
      return NextResponse.json(
        { error: "Badge name is required" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Check if badge exists by name
    const { data: existingBadge, error: getError } = await supabase
      .from('badges')
      .select('*')
      .eq('name', sanitizedName)
      .single();

    if (getError || !existingBadge) {
      return NextResponse.json(
        { error: "Badge not found" }, 
        { 
          status: 404,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Prepare update object
    const updates: BadgeUpdate = {};
    if (id) updates.id = sanitizeInput(id);
    if (description) updates.description = sanitizeInput(description);
    if (icon) updates.icon = sanitizeInput(icon);
    if (points && typeof points === 'number' && points >= 0) updates.points = points;

    // Update badge by name
    const { error: updateError } = await supabase
      .from('badges')
      .update(updates)
      .eq('name', sanitizedName);

    if (updateError) {
      console.error("Error updating badge:", updateError);
      return NextResponse.json(
        { error: "Failed to update badge" },
        { 
          status: 500,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error("Error updating badge:", error);
    return NextResponse.json(
      { error: "Failed to update badge" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a badge
export async function DELETE(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'default');
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(rateLimitResult),
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const badgeName = searchParams.get("name");
    const sanitizedBadgeName = badgeName ? sanitizeInput(badgeName) : null;

    if (!sanitizedBadgeName) {
      return NextResponse.json(
        { error: "Badge name is required" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    const { error } = await supabase
      .from('badges')
      .delete()
      .eq('name', sanitizedBadgeName);

    if (error) {
      console.error("Error deleting badge:", error);
      return NextResponse.json(
        { error: "Failed to delete badge" },
        { 
          status: 500,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error("Error deleting badge:", error);
    return NextResponse.json(
      { error: "Failed to delete badge" },
      { status: 500 }
    );
  }
}


