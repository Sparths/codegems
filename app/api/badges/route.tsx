import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

// Default badges to be created if none exist in the database
const defaultBadges = [
  {
    id: "newcomer",
    name: "Newcomer", // This will be used for lookups instead of id
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
];

// GET: Get all badges or a specific badge
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const badgeName = searchParams.get("name"); // Changed from badgeId to badgeName

  try {
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
          { status: 500 }
        );
      }
    }

    if (badgeName) {
      // Get a specific badge by name instead of id
      const { data: badge, error } = await supabase
        .from('badges')
        .select('*')
        .eq('name', badgeName) // Changed from 'id' to 'name'
        .single();
      
      if (error || !badge) {
        return NextResponse.json({ error: "Badge not found" }, { status: 404 });
      }
      
      return NextResponse.json(badge);
    }

    // Get all badges
    const { data: badges, error } = await supabase
      .from('badges')
      .select('*');
    
    if (error) {
      return NextResponse.json(
        { error: "Failed to get badges" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(badges);
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
    const body = await request.json();
    const { id, name, description, icon, points } = body;

    if (!id || !name || !description || !icon || !points) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if badge with this name already exists (changed from ID)
    const { data: existingBadge } = await supabase
      .from('badges')
      .select('name')
      .eq('name', name) // Changed from 'id' to 'name'
      .single();

    if (existingBadge) {
      return NextResponse.json(
        { error: "Badge with this name already exists" }, // Updated error message
        { status: 400 }
      );
    }

    // Create new badge
    const { error } = await supabase
      .from('badges')
      .insert({
        id,
        name,
        description,
        icon,
        points
      });

    if (error) {
      return NextResponse.json(
        { error: "Failed to create badge" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
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
    const body = await request.json();
    const { id, name, description, icon, points } = body;

    if (!name) { // Changed from requiring id to requiring name
      return NextResponse.json(
        { error: "Badge name is required" },
        { status: 400 }
      );
    }

    // Check if badge exists by name
    const { data: existingBadge, error: getError } = await supabase
      .from('badges')
      .select('*')
      .eq('name', name) // Changed from 'id' to 'name'
      .single();

    if (getError || !existingBadge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    // Prepare update object
    const updates: Record<string, any> = {};
    if (id) updates.id = id; // Now id can be updated
    if (description) updates.description = description;
    if (icon) updates.icon = icon;
    if (points) updates.points = points;

    // Update badge by name instead of id
    const { error: updateError } = await supabase
      .from('badges')
      .update(updates)
      .eq('name', name); // Changed from 'id' to 'name'

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update badge" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
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
  const { searchParams } = new URL(request.url);
  const badgeName = searchParams.get("name"); // Changed from badgeId to badgeName

  if (!badgeName) {
    return NextResponse.json(
      { error: "Badge name is required" }, // Updated error message
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from('badges')
      .delete()
      .eq('name', badgeName); // Changed from 'id' to 'name'

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete badge" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting badge:", error);
    return NextResponse.json(
      { error: "Failed to delete badge" },
      { status: 500 }
    );
  }
}