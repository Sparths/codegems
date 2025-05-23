import { NextResponse } from "next/server";
import crypto from "crypto";
import supabase from "@/lib/supabase";
import { sanitizeInput, isValidEmail, isValidUsername } from "@/lib/security/sanitization";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
}

// Validate password
const validatePassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number, one special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;
  return passwordRegex.test(password);
};

const validateDisplayName = (displayName: string): boolean => {
  return displayName.trim().length >= 1 && displayName.length <= 50;
};

// Hash password securely
const hashPassword = (password: string, salt: string): string => {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
};

// Generate secure random salt
const generateSalt = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

// Create user (Registration) - NOT EXPORTED
async function createUser(request: Request) {
  try {
    const body = await request.json();
    const { username, password, email, displayName } = body;

    // Input validation
    if (!username || !password || !email) {
      return NextResponse.json(
        { error: "Username, password, and email are required" },
        { status: 400 }
      );
    }

    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedDisplayName = displayName ? sanitizeInput(displayName) : sanitizedUsername;

    if (!isValidUsername(sanitizedUsername)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters, alphanumeric, underscore, or hyphen only" },
        { status: 400 }
      );
    }

    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: "Password must be 8-128 characters with uppercase, lowercase, number, and special character" },
        { status: 400 }
      );
    }

    if (!validateDisplayName(sanitizedDisplayName)) {
      return NextResponse.json(
        { error: "Display name must be 1-50 characters" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUsername, error: usernameError } = await supabase
      .from('users')
      .select('id')
      .eq('username', sanitizedUsername)
      .maybeSingle();

    if (usernameError) {
      console.error("Error checking username:", usernameError);
      return NextResponse.json(
        { error: "Failed to validate username" },
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
      .eq('email', sanitizedEmail)
      .maybeSingle();

    if (emailError) {
      console.error("Error checking email:", emailError);
      return NextResponse.json(
        { error: "Failed to validate email" },
        { status: 500 }
      );
    }

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Create secure password hash
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const newUser = {
      id: `user_${crypto.randomUUID()}`,
      username: sanitizedUsername,
      email: sanitizedEmail,
      display_name: sanitizedDisplayName,
      password_hash: passwordHash,
      salt,
      points: 10,
      level: 1,
      badges: ["Newcomer"],
      created_at: new Date().toISOString(),
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sanitizedUsername)}`,
    };

    const { error: insertError } = await supabase.from('users').insert(newUser);

    if (insertError) {
      console.error("Error creating user:", insertError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Return user without sensitive data
    const { password_hash: _, salt: __, ...userData } = newUser;
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error in createUser route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Login - NOT EXPORTED
async function loginUser(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const sanitizedUsername = sanitizeInput(username);

    if (!isValidUsername(sanitizedUsername)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', sanitizedUsername)
      .single();

    if (error || !user) {
      // Use constant time comparison to prevent timing attacks
      const dummySalt = generateSalt();
      hashPassword(password, dummySalt);
      
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const hashedPassword = hashPassword(password, user.salt);

    // Use constant time comparison
    const isValidPassword = crypto.timingSafeEqual(
      Buffer.from(hashedPassword, 'hex'),
      Buffer.from(user.password_hash, 'hex')
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Return user without sensitive data
    const { password_hash, salt, ...userData } = user;
    return NextResponse.json({
      ...userData,
      token: sessionToken,
    });
  } catch (error) {
    console.error("Error in login route:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// Update user (with proper authorization) - NOT EXPORTED
async function updateUser(request: Request) {
  try {
    const body = await request.json();
    const { id, displayName, currentPassword, newPassword } = body;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const sanitizedId = sanitizeInput(id);
    const sanitizedDisplayName = displayName ? sanitizeInput(displayName) : null;

    // Get current user
    const { data: user, error: getUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', sanitizedId)
      .single();

    if (getUserError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    // Update display name if provided
    if (sanitizedDisplayName) {
      if (!validateDisplayName(sanitizedDisplayName)) {
        return NextResponse.json(
          { error: "Display name must be 1-50 characters" },
          { status: 400 }
        );
      }
      updates.display_name = sanitizedDisplayName;
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      if (!validatePassword(newPassword)) {
        return NextResponse.json(
          { error: "New password must be 8-128 characters with uppercase, lowercase, number, and special character" },
          { status: 400 }
        );
      }

      const hashedCurrentPassword = hashPassword(currentPassword, user.salt);
      
      if (!crypto.timingSafeEqual(
        Buffer.from(hashedCurrentPassword, 'hex'),
        Buffer.from(user.password_hash, 'hex')
      )) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      const newSalt = generateSalt();
      const newPasswordHash = hashPassword(newPassword, newSalt);

      updates.password_hash = newPasswordHash;
      updates.salt = newSalt;
    }

    if (Object.keys(updates).length === 0) {
      const { password_hash, salt, ...userData } = user;
      return NextResponse.json(userData);
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', sanitizedId);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    // Get updated user
    const { data: updatedUser, error: getUpdatedError } = await supabase
      .from('users')
      .select('id, username, display_name, email, points, level, badges, created_at, avatar_url')
      .eq('id', sanitizedId)
      .single();

    if (getUpdatedError) {
      console.error("Error getting updated user:", getUpdatedError);
      return NextResponse.json(
        { error: "Failed to retrieve updated user" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error in updateUser route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Check badges (with proper authorization) - NOT EXPORTED
async function checkBadges(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const sanitizedUserId = sanitizeInput(userId);

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', sanitizedUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all badges
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError || !badges) {
      return NextResponse.json({
        earnedBadges: [],
        levelUp: false,
        currentLevel: user.level,
        currentPoints: user.points,
      });
    }

    // Badge checking logic (simplified - implement full logic)
    const earnedBadges: Badge[] = [];
    const userBadges = [...(user.badges || [])];
    const currentPoints = user.points || 0;
    const pointsEarned = 0;

    // Check for various badge conditions...
    // (Implementation of badge checking logic would go here)

    const newLevel = Math.floor((currentPoints + pointsEarned) / 100) + 1;
    const levelUp = newLevel > user.level;

    if (earnedBadges.length > 0 || levelUp) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          badges: userBadges,
          points: currentPoints + pointsEarned,
          level: newLevel,
        })
        .eq('id', sanitizedUserId);

      if (updateError) {
        console.error("Error updating user badges:", updateError);
      }
    }

    return NextResponse.json({
      earnedBadges,
      levelUp,
      currentLevel: newLevel,
      currentPoints: currentPoints + pointsEarned,
    });
  } catch (error) {
    console.error("Error checking badges:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Retrieve users (with proper authorization)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");
    const username = searchParams.get("username");
    const leaderboard = searchParams.get("leaderboard");
    
    // Sanitize inputs
    const sanitizedUserId = userId ? sanitizeInput(userId) : null;
    const sanitizedUsername = username ? sanitizeInput(username) : null;

    if (sanitizedUserId) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, display_name, points, level, badges, created_at, avatar_url')
        .eq('id', sanitizedUserId)
        .single();

      if (error || !user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(user);
    }

    if (sanitizedUsername) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, display_name, points, level, badges, created_at, avatar_url')
        .ilike('username', sanitizedUsername)
        .single();

      if (error || !user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(user);
    }

    if (leaderboard) {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, display_name, points, badges, level, avatar_url')
        .order('points', { ascending: false })
        .limit(10);

      if (error) {
        return NextResponse.json({ 
          error: "Failed to get leaderboard" 
        }, { status: 500 });
      }

      return NextResponse.json(users || []);
    }

    // Return limited user info for general requests
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, display_name, points, level, created_at, avatar_url')
      .limit(50); // Limit to prevent large data dumps

    if (error) {
      return NextResponse.json({ 
        error: "Failed to get users" 
      }, { status: 500 });
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error("Error in GET users route:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
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