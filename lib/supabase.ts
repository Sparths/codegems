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
          password_hash: string
          salt: string
          points: number
          level: number
          badges: string[]
          created_at: string
          avatar_url: string
        }
        Insert: {
          id: string
          username: string
          email: string
          display_name: string
          password_hash: string
          salt: string
          points?: number
          level?: number
          badges?: string[]
          created_at?: string
          avatar_url?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          display_name?: string
          password_hash?: string
          salt?: string
          points?: number
          level?: number
          badges?: string[]
          created_at?: string
          avatar_url?: string
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
        }
        Insert: {
          name: string
          description: string
          stars: string
          forks: string
          tags: string[]
          url: string
          languages: Record<string, number>
        }
        Update: {
          name?: string
          description?: string
          stars?: string
          forks?: string
          tags?: string[]
          url?: string
          languages?: Record<string, number>
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
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;