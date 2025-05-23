// =================================
// app/api/projects/route.tsx
// =================================

import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import path from 'path';
import fs from 'fs';
import { rateLimit, createRateLimitHeaders } from "@/lib/security/rate-limiter-config";
import { sanitizeInput, sanitizeURL } from "@/lib/security/sanitization";

// Default projects data to import if no projects exist
const importDefaultProjects = async () => {
  try {
    // Path to default projects JSON file
    const filePath = path.join(process.cwd(), 'data', 'projects.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const projects = JSON.parse(data);
      
      // Insert projects into Supabase
      const { error } = await supabase
        .from('projects')
        .insert(projects);
      
      if (error) {
        console.error("Error importing default projects:", error);
      }
    }
  } catch (error) {
    console.error("Error in importDefaultProjects:", error);
  }
};

// GET: Fetch all projects
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

    // Check if projects table is empty
    const { data: count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact' });
    
    // If no projects or error, import default data
    if (countError || !count || count.length === 0) {
      await importDefaultProjects();
    }
    
    // Fetch all projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*');
    
    if (error) {
      console.error("Error fetching projects:", error);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { 
          status: 500,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    return NextResponse.json(projects || [], {
      headers: createRateLimitHeaders(rateLimitResult)
    });
  } catch (error) {
    console.error("Error in GET /api/projects:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST: Add a new project
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
    const { name, description, stars, forks, tags, url, languages } = body;
    
    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedStars = sanitizeInput(stars || "0");
    const sanitizedForks = sanitizeInput(forks || "0");
    const sanitizedUrl = sanitizeURL(url);

    // Validate required fields
    if (!sanitizedName || !sanitizedDescription || !sanitizedUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Validate tags array
    const sanitizedTags = Array.isArray(tags) 
      ? tags.map(tag => sanitizeInput(tag)).filter(Boolean)
      : [];

    // Check if project with same name exists
    const { data: existingProject } = await supabase
      .from('projects')
      .select('name')
      .eq('name', sanitizedName)
      .single();
    
    if (existingProject) {
      return NextResponse.json(
        { error: "Project with this name already exists" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Insert new project
    const { error } = await supabase
      .from('projects')
      .insert({
        name: sanitizedName,
        description: sanitizedDescription,
        stars: sanitizedStars,
        forks: sanitizedForks,
        tags: sanitizedTags,
        url: sanitizedUrl,
        languages: languages || {}
      });
    
    if (error) {
      console.error("Error adding new project:", error);
      return NextResponse.json(
        { error: "Failed to add project" },
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
    console.error("Error in POST /api/projects:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT: Update an existing project
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
    const { name, description, stars, forks, tags, url, languages } = body;
    
    const sanitizedName = sanitizeInput(name);
    
    if (!sanitizedName) {
      return NextResponse.json(
        { error: "Project name is required" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Check if project exists
    const { data: existingProject, error: findError } = await supabase
      .from('projects')
      .select('name')
      .eq('name', sanitizedName)
      .single();
    
    if (findError || !existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { 
          status: 404,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Prepare update object
    const updates: Record<string, any> = {};
    if (description) updates.description = sanitizeInput(description);
    if (stars) updates.stars = sanitizeInput(stars);
    if (forks) updates.forks = sanitizeInput(forks);
    if (tags && Array.isArray(tags)) {
      updates.tags = tags.map(tag => sanitizeInput(tag)).filter(Boolean);
    }
    if (url) {
      const sanitizedUrl = sanitizeURL(url);
      if (sanitizedUrl) updates.url = sanitizedUrl;
    }
    if (languages) updates.languages = languages;
    
    // Update project
    const { error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('name', sanitizedName);
    
    if (updateError) {
      console.error("Error updating project:", updateError);
      return NextResponse.json(
        { error: "Failed to update project" },
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
    console.error("Error in PUT /api/projects:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a project
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
    const projectName = searchParams.get("name");
    const sanitizedProjectName = projectName ? sanitizeInput(projectName) : null;
    
    if (!sanitizedProjectName) {
      return NextResponse.json(
        { error: "Project name is required" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Delete project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('name', sanitizedProjectName);
    
    if (error) {
      console.error("Error deleting project:", error);
      return NextResponse.json(
        { error: "Failed to delete project" },
        { 
          status: 500,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    // Also delete related comments and ratings
    await supabase
      .from('comments')
      .delete()
      .eq('project_name', sanitizedProjectName);
    
    await supabase
      .from('ratings')
      .delete()
      .eq('project_name', sanitizedProjectName);
    
    return NextResponse.json(
      { success: true },
      { headers: createRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error("Error in DELETE /api/projects:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}