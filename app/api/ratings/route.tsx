import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { generateUUID } from "@/lib/utils-uuid";

// GET: Get all ratings or filter by project or user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get("project");
  const userId = searchParams.get("userId");

  try {
    let query = supabase.from('ratings').select('*');

    if (projectName) {
      query = query.eq('project_name', projectName);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: ratings, error } = await query;

    if (error) {
      console.error("Error getting ratings:", error);
      return NextResponse.json(
        { error: "Failed to get ratings" },
        { status: 500 }
      );
    }

    return NextResponse.json(ratings || []);
  } catch (error) {
    console.error("Error getting ratings:", error);
    return NextResponse.json(
      { error: "Failed to get ratings" },
      { status: 500 }
    );
  }
}

// POST: Create a new rating or update an existing one
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectName, userId, rating, review } = body;

    // Validation
    if (!projectName || !userId || rating === undefined || rating === null) {
      return NextResponse.json(
        { error: "Missing required fields: projectName, userId, and rating are required" },
        { status: 400 }
      );
    }

    // Validate rating value
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    console.log(`Attempting to save rating: Project=${projectName}, User=${userId}, Rating=${rating}`);

    // Check if rating already exists
    const { data: existingRating, error: findError } = await supabase
      .from('ratings')
      .select('*')
      .eq('project_name', projectName)
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) {
      console.error("Error finding existing rating:", findError);
      return NextResponse.json(
        { error: "Failed to check for existing rating" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    if (existingRating) {
      console.log(`Updating existing rating with ID: ${existingRating.id}`);
      
      // Update existing rating
      const { error: updateError } = await supabase
        .from('ratings')
        .update({
          rating,
          review: review || existingRating.review,
          updated_at: now
        })
        .eq('id', existingRating.id);

      if (updateError) {
        console.error("Error updating rating:", updateError);
        return NextResponse.json(
          { error: `Failed to update rating: ${updateError.message}` },
          { status: 500 }
        );
      }
      
      console.log("Rating updated successfully");
      return NextResponse.json({ success: true, message: "Rating updated successfully" });
    } else {
      console.log("Creating new rating");
      
      // Create new rating
      const newRating = {
       id: generateUUID(), // Use UUID instead of timestamp
        project_name: projectName,
        user_id: userId,
        rating,
        review: review || "",
        created_at: now,
        updated_at: now
      };

      const { error: insertError } = await supabase
        .from('ratings')
        .insert(newRating);

      if (insertError) {
        console.error("Error creating rating:", insertError);
        return NextResponse.json(
          { error: `Failed to save rating: ${insertError.message}` },
          { status: 500 }
        );
      }

      console.log("New rating created successfully");

// Replace the badge check portion in app/api/ratings/route.tsx
// Find the section after successfully creating a rating

// Award points for new rating and check badges
try {
  // First update points
  const { data: userData, error: getUserError } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single();

  if (getUserError) {
    console.error("Error getting user data for points:", getUserError);
  } else if (userData) {
    const { error: updatePointsError } = await supabase
      .from('users')
      .update({
        points: (userData.points || 0) + 5
      })
      .eq('id', userId);
      
    if (updatePointsError) {
      console.error("Error updating user points:", updatePointsError);
    } else {
      console.log("User points updated successfully");
    }
  }
  
  // Now check for badges
  const badgeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/users?action=check_badges`, {
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
} catch (error) {
  console.error("Error awarding points/badges:", error);
  // Continue execution - points/badge award failure shouldn't stop the rating submission
}

      return NextResponse.json({ 
        success: true, 
        message: "Rating saved successfully",
        rating: newRating
      });
    }
  } catch (error) {
    console.error("Error saving rating:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to save rating: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE: Remove a rating
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const ratingId = searchParams.get("id");

  if (!ratingId) {
    return NextResponse.json(
      { error: "Rating ID is required" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('id', ratingId);

    if (error) {
      console.error("Error deleting rating:", error);
      return NextResponse.json(
        { error: `Failed to delete rating: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Rating deleted successfully" });
  } catch (error) {
    console.error("Error deleting rating:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to delete rating: ${errorMessage}` },
      { status: 500 }
    );
  }
}