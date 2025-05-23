import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { createSecureAdminToken, verifySecureAdminToken } from '@/lib/security/secure-token';
import { sanitizeInput } from '@/lib/security/sanitization';

// Admin verification with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminSupabase = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : 
  null;

// Get admin list from environment variables
const getAuthorizedAdmins = (): string[] => {
  const adminList = process.env.AUTHORIZED_ADMINS;
  if (!adminList) {
    console.error('AUTHORIZED_ADMINS environment variable not set');
    return [];
  }
  return adminList.split(',').map(admin => admin.trim());
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    console.log("Admin verification request for userId:", userId);

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const sanitizedUserId = sanitizeInput(userId);
    const authorizedAdmins = getAuthorizedAdmins();

    if (authorizedAdmins.length === 0) {
      return NextResponse.json(
        { error: "Admin configuration error" },
        { status: 500 }
      );
    }

    // First check if user ID is directly in the authorized list
    if (authorizedAdmins.includes(sanitizedUserId)) {
      console.log("User found in direct admin list:", sanitizedUserId);
      
      // Create secure admin session token
      const adminToken = createSecureAdminToken(sanitizedUserId);

      return NextResponse.json({
        success: true,
        isAdmin: true,
        userId: sanitizedUserId,
        adminToken: adminToken
      });
    }

    // Additional verification: check if user exists in the database
    if (adminSupabase) {
      try {
        console.log("Checking user in database:", sanitizedUserId);
        
        const { data: user, error } = await adminSupabase
          .from('users')
          .select('id, username, display_name')
          .eq('id', sanitizedUserId)
          .single();

        if (error) {
          console.error("Database query error:", error);
          return NextResponse.json(
            { error: "Database query failed" },
            { status: 500 }
          );
        }

        if (!user) {
          console.log("User not found in database");
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        console.log("Found user in database:", user);

        // Check if user ID, username, or display_name is in admin list
        const isAdmin = authorizedAdmins.includes(user.id) || 
                       authorizedAdmins.includes(user.username) ||
                       authorizedAdmins.includes(user.username.toLowerCase()) ||
                       authorizedAdmins.includes(user.display_name);

        if (isAdmin) {
          console.log("User verified as admin");
          
          // Create secure admin session token
          const adminToken = createSecureAdminToken(sanitizedUserId);

          return NextResponse.json({
            success: true,
            isAdmin: true,
            userId: sanitizedUserId,
            adminToken: adminToken
          });
        } else {
          console.log("User not in admin list:", {
            id: user.id,
            username: user.username,
            display_name: user.display_name
          });
          return NextResponse.json(
            { error: "Access denied - not in admin list" },
            { status: 403 }
          );
        }
      } catch (dbError) {
        console.error("Database verification error:", dbError);
        return NextResponse.json(
          { error: "Database verification failed" },
          { status: 500 }
        );
      }
    }

    // If no database available, fall back to direct check
    console.log("No database connection, user not in direct admin list");
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    );

  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET method to check current admin status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Check for admin token in Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const verification = verifySecureAdminToken(token);
      
      if (verification.isValid) {
        return NextResponse.json({
          isAdmin: true,
          userId: verification.userId
        });
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const sanitizedUserId = sanitizeInput(userId);
    const authorizedAdmins = getAuthorizedAdmins();
    
    // Quick check against admin list
    const isAdmin = authorizedAdmins.includes(sanitizedUserId);
    
    // If not found directly, check database
    if (!isAdmin && adminSupabase) {
      try {
        const { data: user, error } = await adminSupabase
          .from('users')
          .select('id, username, display_name')
          .eq('id', sanitizedUserId)
          .single();

        if (!error && user) {
          const dbIsAdmin = authorizedAdmins.includes(user.id) || 
                           authorizedAdmins.includes(user.username) ||
                           authorizedAdmins.includes(user.username.toLowerCase()) ||
                           authorizedAdmins.includes(user.display_name);
          
          return NextResponse.json({
            isAdmin: dbIsAdmin,
            userId: sanitizedUserId
          });
        }
      } catch (dbError) {
        console.error("Database check error:", dbError);
      }
    }

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