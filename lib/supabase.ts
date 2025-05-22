import { createClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      project_requests: {
        Row: {
          id: string
          user_id: string
          title: string
          github_link: string
          description: string
          reason: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
          updated_at: string | null
          admin_notes: string | null
        }
        Insert: {
          id: string
          user_id: string
          title: string
          github_link: string
          description: string
          reason: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          updated_at?: string | null
          admin_notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          github_link?: string
          description?: string
          reason?: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
          updated_at?: string | null
          admin_notes?: string | null
        }
      }
      users: {
        Row: {
          id: string
          username: string
          email: string
          display_name: string
          password_hash: string | null
          salt: string | null
          points: number
          level: number
          badges: string[]
          created_at: string
          avatar_url: string
          auth_provider: string | null
        }
        Insert: {
          id: string
          username: string
          email: string
          display_name: string
          password_hash?: string | null
          salt?: string | null
          points?: number
          level?: number
          badges?: string[]
          created_at?: string
          avatar_url?: string
          auth_provider?: string | null
        }
        Update: {
          id?: string
          username?: string
          email?: string
          display_name?: string
          password_hash?: string | null
          salt?: string | null
          points?: number
          level?: number
          badges?: string[]
          created_at?: string
          avatar_url?: string
          auth_provider?: string | null
        }
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          points: number
        }
        Insert: {
          id: string
          name: string
          description: string
          icon: string
          points: number
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          points?: number
        }
      }
      projects: {
        Row: {
          name: string
          description: string
          stars: string
          forks: string
          tags: string[]
          url: string
          languages: Record<string, number>
          last_updated: string | null
        }
        Insert: {
          name: string
          description: string
          stars: string
          forks: string
          tags: string[]
          url: string
          languages: Record<string, number>
          last_updated?: string | null
        }
        Update: {
          name?: string
          description?: string
          stars?: string
          forks?: string
          tags?: string[]
          url?: string
          languages?: Record<string, number>
          last_updated?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          project_name: string
          user_id: string
          text: string
          parent_id: string | null
          likes: string[]
          created_at: string
          updated_at: string | null
          edited: boolean | null
        }
        Insert: {
          id: string
          project_name: string
          user_id: string
          text: string
          parent_id?: string | null
          likes?: string[]
          created_at?: string
          updated_at?: string | null
          edited?: boolean | null
        }
        Update: {
          id?: string
          project_name?: string
          user_id?: string
          text?: string
          parent_id?: string | null
          likes?: string[]
          created_at?: string
          updated_at?: string | null
          edited?: boolean | null
        }
      }
      ratings: {
        Row: {
          id: string
          project_name: string
          user_id: string
          rating: number
          review: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          project_name: string
          user_id: string
          rating: number
          review?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_name?: string
          user_id?: string
          rating?: number
          review?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      saved_projects: {
        Row: {
          user_id: string
          project_name: string
          created_at: string
        }
        Insert: {
          user_id: string
          project_name: string
          created_at?: string
        }
        Update: {
          user_id?: string
          project_name?: string
          created_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          username: string
          email: string
          is_admin: boolean
          admin_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          email: string
          is_admin?: boolean
          admin_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          is_admin?: boolean
          admin_level?: number
          created_at?: string
          updated_at?: string
        }
      }
      auth_migrations: {
        Row: {
          user_id: string
          migrated: boolean
          old_auth: boolean
          migrated_at: string
        }
        Insert: {
          user_id: string
          migrated?: boolean
          old_auth?: boolean
          migrated_at?: string
        }
        Update: {
          user_id?: string
          migrated?: boolean
          old_auth?: boolean
          migrated_at?: string
        }
      }
      project_updates: {
        Row: {
          project_name: string
          status: string
          last_attempted: string | null
          last_successful: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          project_name: string
          status?: string
          last_attempted?: string | null
          last_successful?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          project_name?: string
          status?: string
          last_attempted?: string | null
          last_successful?: string | null
          error?: string | null
          created_at?: string
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'codegems-client'
    }
  }
});

export default supabase;