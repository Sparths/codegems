// =================================
// app/api/saved-projects/route.tsx
// =================================

import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { rateLimit, createRateLimitHeaders } from "@/lib/security/rate-limiter-config";
import { sanitizeInput } from "@/lib/security/sanitization";

// Input validation
const validateUserId = (userId: string): boolean => {
  return userId.length >= 5 && userId.length <= 100;
};

const validateProjectName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z0-9._-]+$/;
  return nameRegex.test(name) && name.length >= 1 && name.length <= 100;
};

// GET: Fetch saved projects for a user
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
    const userId = searchParams.get("userId");
    const sanitizedUserId = userId ? sanitizeInput(userId) : null;

    if (!sanitizedUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    if (!validateUserId(sanitizedUserId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Get saved projects for the user
    const { data, error } = await supabase
      .from('saved_projects')
      .select('project_name')
      .eq('user_id', sanitizedUserId);

    if (error) {
      console.error("Error fetching saved projects:", error);
      return NextResponse.json(
        { error: "Failed to fetch saved projects" },
        { 
          status: 500,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Extract project names
    const projectNames = data.map(item => item.project_name);
    
    return NextResponse.json(projectNames, {
      headers: createRateLimitHeaders(rateLimitResult)
    });
  } catch (error) {
    console.error("Error in GET saved-projects:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST: Save a project
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
    const { userId, projectName } = body;
    
    // Sanitize inputs
    const sanitizedUserId = sanitizeInput(userId);
    const sanitizedProjectName = sanitizeInput(projectName);
    
    if (!sanitizedUserId || !sanitizedProjectName) {
      return NextResponse.json(
        { error: "User ID and Project Name are required" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Validate inputs
    if (!validateUserId(sanitizedUserId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    if (!validateProjectName(sanitizedProjectName)) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', sanitizedUserId)
      .single();
    
    if (userError || !user) {
      console.error("User not found:", userError);
      return NextResponse.json(
        { error: "User not found" },
        { 
          status: 404,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name')
      .eq('name', sanitizedProjectName)
      .single();
    
    if (projectError || !project) {
      console.error("Project not found:", projectError);
      return NextResponse.json(
        { error: "Project not found" },
        { 
          status: 404,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Save project
    const { error: saveError } = await supabase
      .from('saved_projects')
      .insert({
        user_id: sanitizedUserId,
        project_name: sanitizedProjectName
      });
    
    if (saveError) {
      // If unique constraint violated, project is already saved
      if (saveError.code === '23505') {
        return NextResponse.json(
          { success: true, message: "Project already saved" },
          { headers: createRateLimitHeaders(rateLimitResult) }
        );
      }
      
      console.error("Error saving project:", saveError);
      return NextResponse.json(
        { error: "Failed to save project" },
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
    console.error("Error in POST saved-projects:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a saved project
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
    const userId = searchParams.get("userId");
    const projectName = searchParams.get("projectName");
    
    const sanitizedUserId = userId ? sanitizeInput(userId) : null;
    const sanitizedProjectName = projectName ? sanitizeInput(projectName) : null;
    
    if (!sanitizedUserId || !sanitizedProjectName) {
      return NextResponse.json(
        { error: "User ID and Project Name are required" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Validate inputs
    if (!validateUserId(sanitizedUserId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    if (!validateProjectName(sanitizedProjectName)) {
      return NextResponse.json(
        { error: "Invalid project name" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    const { error } = await supabase
      .from('saved_projects')
      .delete()
      .eq('user_id', sanitizedUserId)
      .eq('project_name', sanitizedProjectName);
    
    if (error) {
      console.error("Error removing saved project:", error);
      return NextResponse.json(
        { error: "Failed to remove saved project" },
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
    console.error("Error in DELETE saved-projects:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}