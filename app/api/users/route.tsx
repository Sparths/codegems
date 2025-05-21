import { NextResponse } from "next/server";
import crypto from "crypto";
import supabase from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  password_hash: string;
  salt: string;
  points: number;
  level: number;
  badges: string[];
  created_at: string;
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

const validatePassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return passwordRegex.test(password);
};

// GET: Retrieve users
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("id");
  const username = searchParams.get("username");
  const leaderboard = searchParams.get("leaderboard");

  try {
    if (userId) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error getting user by ID:", error);
        return NextResponse.json({ 
          error: `User not found: ${error.message}` 
        }, { status: 404 });
      }

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Don't return sensitive data
      const { password_hash, salt, ...userData } = user;
      return NextResponse.json(userData);
    }

    if (username) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', username)
        .single();

      if (error) {
        console.error("Error getting user by username:", error);
        return NextResponse.json({ 
          error: `User not found: ${error.message}` 
        }, { status: 404 });
      }

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { password_hash, salt, ...userData } = user;
      return NextResponse.json(userData);
    }

    if (leaderboard) {
      // Return leaderboard (Top 10 sorted by points)
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, display_name, points, badges, level, avatar_url')
        .order('points', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error getting leaderboard:", error);
        return NextResponse.json({ 
          error: `Failed to get leaderboard: ${error.message}` 
        }, { status: 500 });
      }

      return NextResponse.json(users || []);
    }

    // Return all users without sensitive data
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, display_name, points, badges, level, created_at, avatar_url');

    if (error) {
      console.error("Error getting all users:", error);
      return NextResponse.json({ 
        error: `Failed to get users: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error("Error in GET users route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      error: `Failed to get users: ${errorMessage}` 
    }, { status: 500 });
  }
}

// This updates the createUser function in app/api/users/route.tsx
// Find the part where it creates the new user object

// Create user (Registration)
export async function createUser(request: Request) {
  try {
    const body = await request.json();
    const { username, password, email, displayName } = body;

    console.log(`Registration attempt for username: ${username}, email: ${email}`);

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: "Password does not meet complexity requirements" },
        { status: 400 }
      );
    }

    if (!username || !password || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUsername, error: usernameError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (usernameError) {
      console.error("Error checking username:", usernameError);
      return NextResponse.json(
        { error: `Failed to check username: ${usernameError.message}` },
        { status: 500 }
      );
    }

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingEmail, error: emailError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (emailError) {
      console.error("Error checking email:", emailError);
      return NextResponse.json(
        { error: `Failed to check email: ${emailError.message}` },
        { status: 500 }
      );
    }

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Create password hash
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");

    // Ensure the newcomer badge is added
    const badges = ["newcomer"];
    
    const newUser = {
      id: `user_${Date.now()}`,
      username,
      email,
      display_name: displayName || username,
      password_hash: passwordHash,
      salt,
      points: 10, // Starting points
      level: 1,
      badges, // Newcomer badge
      created_at: new Date().toISOString(),
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`, // Generated avatar
    };

    console.log(`Creating new user with ID: ${newUser.id}, badges: ${newUser.badges.join(', ')}`);

    const { error: insertError } = await supabase.from('users').insert(newUser);

    if (insertError) {
      console.error("Error creating user:", insertError);
      return NextResponse.json(
        { error: `Failed to create user: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Return user without sensitive data
    const { password_hash: _, salt: __, ...userData } = newUser;
    console.log("User created successfully with badges:", userData.badges);
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error in createUser route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create user: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Login
export async function loginUser(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log(`Login attempt for username: ${username}`);

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error("Error finding user:", error);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const hashedPassword = crypto
      .pbkdf2Sync(password, user.salt, 1000, 64, "sha512")
      .toString("hex");

    if (hashedPassword !== user.password_hash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("Login successful");

    // Successful login, return user without sensitive data
    const { password_hash, salt, ...userData } = user;
    return NextResponse.json({
      ...userData,
      token: crypto.randomBytes(32).toString("hex"), // Simple session token
    });
  } catch (error) {
    console.error("Error in login route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      error: `Login failed: ${errorMessage}` 
    }, { status: 500 });
  }
}

// Update user
export async function updateUser(request: Request) {
  try {
    const body = await request.json();
    const { id, username, displayName, avatarUrl, email, currentPassword, newPassword } = body;

    console.log(`Update request for user ID: ${id}`);
    
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { data: user, error: getUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (getUserError) {
      console.error("Error getting user for update:", getUserError);
      return NextResponse.json({ 
        error: `User not found: ${getUserError.message}` 
      }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare update object
    const updates: Record<string, any> = {};

    // Update username if provided and different
    if (username && username !== user.username) {
      // Check if username is already taken by another user
      const { data: existingUser, error: checkUsernameError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', id)
        .maybeSingle();

      if (checkUsernameError) {
        console.error("Error checking username availability:", checkUsernameError);
        return NextResponse.json(
          { error: `Failed to check username: ${checkUsernameError.message}` },
          { status: 500 }
        );
      }

      if (existingUser) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 400 }
        );
      }

      console.log(`Updating username from ${user.username} to ${username}`);
      updates.username = username;
    }

    // Update modifiable fields
    if (displayName) updates.display_name = displayName;
    if (avatarUrl) updates.avatar_url = avatarUrl;

    // If email is being changed, check if it already exists
    if (email && email !== user.email) {
      const { data: existingEmail, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .maybeSingle();

      if (emailError) {
        console.error("Error checking email:", emailError);
        return NextResponse.json(
          { error: `Failed to check email: ${emailError.message}` },
          { status: 500 }
        );
      }

      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
      updates.email = email;
    }

    // If password is being changed
    if (currentPassword && newPassword) {
      const hashedCurrentPassword = crypto
        .pbkdf2Sync(currentPassword, user.salt, 1000, 64, "sha512")
        .toString("hex");

      if (hashedCurrentPassword !== user.password_hash) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Hash new password
      const newSalt = crypto.randomBytes(16).toString("hex");
      const newPasswordHash = crypto
        .pbkdf2Sync(newPassword, newSalt, 1000, 64, "sha512")
        .toString("hex");

      updates.password_hash = newPasswordHash;
      updates.salt = newSalt;
    }

    // Only proceed with update if there are changes
    if (Object.keys(updates).length === 0) {
      const { password_hash, salt, ...userData } = user;
      return NextResponse.json(userData);
    }

    console.log(`Updating user with changes: ${Object.keys(updates).join(', ')}`);

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json(
        { error: `Failed to update user: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Get updated user
    const { data: updatedUser, error: getUpdatedError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (getUpdatedError) {
      console.error("Error getting updated user:", getUpdatedError);
      return NextResponse.json(
        { error: `Failed to retrieve updated user: ${getUpdatedError.message}` },
        { status: 500 }
      );
    }

    console.log("User updated successfully");

    // Return updated user without sensitive data
    const { password_hash, salt, ...userData } = updatedUser;
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error in updateUser route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to update user: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// This replaces the checkBadges function in app/api/users/route.tsx

// Check badges
export async function checkBadges(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    console.log(`Checking badges for user: ${userId}`);

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error("Error getting user for badges:", userError);
      return NextResponse.json({ 
        error: `User not found: ${userError.message}` 
      }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all badges
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) {
      console.error("Error fetching badges:", badgesError);
      return NextResponse.json(
        { error: `Failed to fetch badges: ${badgesError.message}` },
        { status: 500 }
      );
    }

    if (!badges || badges.length === 0) {
      console.log("No badges found in the database");
      return NextResponse.json({
        earnedBadges: [],
        levelUp: false,
        currentLevel: user.level,
        currentPoints: user.points,
      });
    }

    const earnedBadges: Badge[] = [];
    let userBadges = [...(user.badges || [])];
    let currentPoints = user.points || 0;
    console.log(`Current badges: ${userBadges.join(', ')}`);
    console.log(`Current points: ${currentPoints}`);
    let pointsEarned = 0;

    // Ensure the newcomer badge is awarded
    const newcomerBadge = badges.find(b => b.id === "newcomer");
    if (!userBadges.includes("newcomer") && newcomerBadge) {
      console.log("Awarding newcomer badge");
      earnedBadges.push(newcomerBadge);
      userBadges.push("newcomer");
      pointsEarned += newcomerBadge.points;
    }

    // Check ratings count
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', userId);

    if (!ratingsError) {
      const ratingsCount = ratings?.length || 0;
      console.log(`User has ${ratingsCount} ratings`);

      // First rating badge
      const firstRatingBadge = badges.find(b => b.id === "first_rating");
      if (ratingsCount > 0 && !userBadges.includes("first_rating") && firstRatingBadge) {
        console.log("Awarding first_rating badge");
        earnedBadges.push(firstRatingBadge);
        userBadges.push("first_rating");
        pointsEarned += firstRatingBadge.points;
      }

      // 10 ratings badge
      const rating10Badge = badges.find(b => b.id === "rating_10");
      if (ratingsCount >= 10 && !userBadges.includes("rating_10") && rating10Badge) {
        console.log("Awarding rating_10 badge");
        earnedBadges.push(rating10Badge);
        userBadges.push("rating_10");
        pointsEarned += rating10Badge.points;
      }
    } else {
      console.error("Error checking ratings:", ratingsError);
    }

    // Check comments count
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', userId);

    if (!commentsError) {
      const commentsCount = comments?.length || 0;
      console.log(`User has ${commentsCount} comments`);

      // First comment badge
      const firstCommentBadge = badges.find(b => b.id === "first_comment");
      if (commentsCount > 0 && !userBadges.includes("first_comment") && firstCommentBadge) {
        console.log("Awarding first_comment badge");
        earnedBadges.push(firstCommentBadge);
        userBadges.push("first_comment");
        pointsEarned += firstCommentBadge.points;
      }

      // 10 comments badge
      const comment10Badge = badges.find(b => b.id === "comment_10");
      if (commentsCount >= 10 && !userBadges.includes("comment_10") && comment10Badge) {
        console.log("Awarding comment_10 badge");
        earnedBadges.push(comment10Badge);
        userBadges.push("comment_10");
        pointsEarned += comment10Badge.points;
      }
    } else {
      console.error("Error checking comments:", commentsError);
    }

    // Calculate level based on points
    const totalPoints = currentPoints + pointsEarned;
    const newLevel = Math.floor(totalPoints / 100) + 1;
    const levelUp = newLevel > user.level;
    console.log(`Points: ${totalPoints}, New level: ${newLevel}, Level up: ${levelUp}`);
    
    // Check for level badges
    if (newLevel >= 5 && !userBadges.includes("level_5")) {
      const level5Badge = badges.find(b => b.id === "level_5");
      if (level5Badge) {
        console.log("Awarding level_5 badge");
        earnedBadges.push(level5Badge);
        userBadges.push("level_5");
        pointsEarned += level5Badge.points;
      }
    }

    if (newLevel >= 10 && !userBadges.includes("level_10")) {
      const level10Badge = badges.find(b => b.id === "level_10");
      if (level10Badge) {
        console.log("Awarding level_10 badge");
        earnedBadges.push(level10Badge);
        userBadges.push("level_10");
        pointsEarned += level10Badge.points;
      }
    }

    // Update user if badges or points changed
    if (earnedBadges.length > 0 || levelUp) {
      console.log(`Updating user with ${earnedBadges.length} new badges, ${pointsEarned} points, level ${newLevel}`);
      console.log(`New badges list: ${userBadges.join(', ')}`);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          badges: userBadges,
          points: totalPoints,
          level: newLevel,
        })
        .eq('id', userId);

      if (updateError) {
        console.error("Error updating user badges:", updateError);
        // Continue execution - we should still return what badges were earned even if updating failed
      }
    }

    return NextResponse.json({
      earnedBadges,
      levelUp,
      currentLevel: newLevel,
      currentPoints: totalPoints,
    });
  } catch (error) {
    console.error("Error checking badges:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to check badges: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Single POST handler
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  switch (action) {
    case "login":
      return loginUser(request);
    case "check_badges":
      return checkBadges(request);
    default:
      return createUser(request);
  }
}

// PUT handler for updates
export async function PUT(request: Request) {
  return updateUser(request);
}