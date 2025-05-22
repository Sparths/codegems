import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Admin verification with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminSupabase = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  null;

// List of authorized admin user IDs/usernames
const AUTHORIZED_ADMINS = [
  'f8adc96a-496f-412b-af15-20bd3cd66b3c', 
];

// Input sanitization
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>]/g, '').trim();
};

export async function POST(request: Request) {
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

    // Check if user is in the authorized admins list
    if (!AUTHORIZED_ADMINS.includes(sanitizedUserId)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Additional verification: check if user exists in the database
    if (adminSupabase) {
      try {
        const { data: user, error } = await adminSupabase
          .from('users')
          .select('id, username')
          .eq('id', sanitizedUserId)
          .single();

        if (error || !user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        // Verify the user is in our admin list by username as well
        if (!AUTHORIZED_ADMINS.includes(user.id)) {
          return NextResponse.json(
            { error: "Access denied" },
            { status: 403 }
          );
        }
      } catch (dbError) {
        console.error("Database verification error:", dbError);
        return NextResponse.json(
          { error: "Verification failed" },
          { status: 500 }
        );
      }
    }

    // Create admin session record (optional)
    const adminSession = {
      userId: sanitizedUserId,
      timestamp: Date.now(),
      verified: true
    };

    return NextResponse.json({
      success: true,
      isAdmin: true,
      userId: sanitizedUserId,
      session: Buffer.from(JSON.stringify(adminSession)).toString('base64')
    });

  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: GET method to check current admin status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const sanitizedUserId = sanitizeInput(userId);
    const isAdmin = AUTHORIZED_ADMINS.includes(sanitizedUserId);

    return NextResponse.json({
      isAdmin,
      userId: sanitizedUserId
    });

  } catch (error) {
    console.error("Admin status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}