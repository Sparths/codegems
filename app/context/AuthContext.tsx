"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";

interface AuthUser {
  token: string;
  id: string;
  username: string;
  displayName: string;
  email?: string;
  points: number;
  level: number;
  badges: string[];
  avatarUrl: string;
  authProvider?: string; // Track auth provider (github or legacy)
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGitHub: () => Promise<void>;
  loginWithCredentials: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateUser: (userData: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  // Function to convert Supabase user to our app user format
  const formatUser = async (supabaseUser: User): Promise<AuthUser | null> => {
    try {
      // First check if user exists in our database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error("Error fetching user data:", userError);
        console.error("Error details:", JSON.stringify(userError));
        return null;
      }

      // If user doesn't exist in our database, create it
      if (!userData) {
        console.log("Creating new user for Supabase Auth user:", supabaseUser.id);
        
        const githubUsername = supabaseUser.user_metadata.user_name || 
                               supabaseUser.user_metadata.preferred_username || 
                               `user_${Date.now()}`;
                               
        const displayName = supabaseUser.user_metadata.full_name || 
                            githubUsername;
                            
        const avatarUrl = supabaseUser.user_metadata.avatar_url || 
                         `https://api.dicebear.com/7.x/bottts/svg?seed=${githubUsername}`;
        
// In the formatUser function, when creating a new user:
const newUser = {
  id: supabaseUser.id,
  username: githubUsername,
  display_name: displayName,
  email: supabaseUser.email,
  // Set these to null explicitly for GitHub users
  password_hash: null,  
  salt: null,
  points: 10, // Starting points
  level: 1,
  badges: ["Newcomer"], // Newcomer badge
  created_at: new Date().toISOString(),
  avatar_url: avatarUrl,
  auth_provider: 'github',
};

        console.log("Attempting to create user with data:", JSON.stringify(newUser));

        // Use upsert instead of insert to handle potential race conditions
        const { error: insertError } = await supabase
          .from('users')
          .upsert(newUser, { 
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error("Error creating user:", insertError);
          console.error("Error details:", JSON.stringify(insertError));
          return null;
        }

        console.log("User created successfully:", newUser.id);

        // Add migration record
        try {
await supabase
  .from('auth_migrations')
  .upsert({
    user_id: supabaseUser.id,
    migrated: true,
    old_auth: false,
    migrated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id'
  });
            
          console.log("Migration record created");
        } catch (migrationError) {
          console.error("Error creating migration record:", migrationError);
          // Non-critical error, continue
        }

        // Check badges for new user
        try {
          await fetch("/api/users?action=check_badges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: supabaseUser.id }),
          });
          console.log("Badge check complete for new user");
        } catch (error) {
          console.error("Error checking badges:", error);
          // Non-critical error
        }

return {
  id: newUser.id,
  username: newUser.username,
  displayName: newUser.display_name,
  email: newUser.email,
  points: newUser.points,
  level: newUser.level,
  badges: newUser.badges,
  avatarUrl: newUser.avatar_url,
  authProvider: 'github', // This is just for the front-end, not stored in DB
};
      }

      // Return existing user data
      console.log("Found existing user:", userData.id);
return {
  id: userData.id,
  username: userData.username,
  displayName: userData.display_name,
  email: userData.email,
  points: userData.points || 0,
  level: userData.level || 1,
  badges: userData.badges || [],
  avatarUrl: userData.avatar_url,
  authProvider: 'github', // Just set to 'github' for Supabase users
};
    } catch (error) {
      console.error("Error formatting user:", error);
      console.error("Error details:", JSON.stringify(error));
      return null;
    }
  };

  // Legacy login with username/password
  const loginWithCredentials = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Call the legacy login endpoint
      const response = await fetch("/api/users?action=login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Login failed",
          description: errorData.error || "Invalid username or password",
          variant: "destructive",
        });
        return false;
      }
      
      const userData = await response.json();
      
      // Create a formatted user object
      const formattedUser: AuthUser = {
        id: userData.id,
        username: userData.username,
        displayName: userData.display_name,
        email: userData.email,
        points: userData.points || 0,
        level: userData.level || 1,
        badges: userData.badges || [],
        avatarUrl: userData.avatar_url,
        authProvider: 'legacy',
      };
      
      setUser(formattedUser);
      
      // Store in local storage for persistence
      localStorage.setItem("user", JSON.stringify(formattedUser));
      
      // Update auth migrations table to track this user
      try {
await supabase
  .from('auth_migrations')
  .upsert({
    user_id: formattedUser.id,
    migrated: false,
    old_auth: true,
    migrated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id'
  });
      } catch (error) {
        console.error("Error updating auth migrations:", error);
        // Non-critical error
      }
      
      toast({
        title: "Successfully signed in",
        description: `Welcome back, ${formattedUser.displayName}!`,
      });
      
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh user profile data
  const refreshUserProfile = async () => {
    if (!supabaseUser && !user) return;
    
    try {
      setIsLoading(true);
      
      if (supabaseUser) {
        // For Supabase Auth users
        const formattedUser = await formatUser(supabaseUser);
        if (formattedUser) {
          setUser(formattedUser);
          // Update local storage for consistency
          localStorage.setItem("user", JSON.stringify(formattedUser));
        }
      } else if (user && user.authProvider === 'legacy') {
        // For legacy auth users
        const response = await fetch(`/api/users?id=${user.id}`);
        if (response.ok) {
          const userData = await response.json();
          const updatedUser = {
            ...user,
            displayName: userData.display_name,
            points: userData.points,
            level: userData.level,
            badges: userData.badges,
            avatarUrl: userData.avatar_url,
          };
          setUser(updatedUser);
          // Update local storage
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

// Update user data - simplified version
const updateUser = async (userData: any): Promise<boolean> => {
  try {
    setIsLoading(true);
    
    if (!user) return false;
    
    // Only update display_name field
    const { error } = await supabase
      .from('users')
      .update({
        display_name: userData.displayName || user.displayName,
      })
      .eq('id', user.id);
      
    if (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
      return false;
    }
    
    // Refresh user data
    await refreshUserProfile();
    
    toast({
      title: "Profile updated",
      description: "Your display name has been successfully updated.",
    });
    
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    toast({
      title: "Error",
      description: "An unexpected error occurred.",
      variant: "destructive",
    });
    return false;
  } finally {
    setIsLoading(false);
  }
};

  // Initialize auth state on load
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        // Set up auth state change listener for Supabase Auth
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log("Auth state change:", event);
            
            if (session?.user) {
              setSupabaseUser(session.user);
              try {
                const formattedUser = await formatUser(session.user);
                if (formattedUser) {
                  setUser(formattedUser);
                  // Update localStorage for consistency
                  localStorage.setItem("user", JSON.stringify(formattedUser));
                }
              } catch (formatError) {
                console.error("Error formatting user after auth change:", formatError);
              }
            } else {
              // Only clear Supabase user, don't clear regular user 
              // (legacy users might still be logged in)
              setSupabaseUser(null);
              
              // Check if there's a legacy user in localStorage
              const storedUser = localStorage.getItem("user");
              if (storedUser) {
                try {
                  const userData = JSON.parse(storedUser);
                  if (userData.authProvider === 'legacy') {
                    // Keep the legacy user logged in
                    setUser(userData);
                  } else {
                    // If not a legacy user, clear it
                    setUser(null);
                    localStorage.removeItem("user");
                  }
                } catch (error) {
                  console.error("Error parsing stored user:", error);
                  localStorage.removeItem("user");
                  setUser(null);
                }
              } else {
                setUser(null);
              }
            }
          }
        );

        // Set initial user if session exists
        if (session?.user) {
          setSupabaseUser(session.user);
          try {
            const formattedUser = await formatUser(session.user);
            setUser(formattedUser);
            if (formattedUser) {
              localStorage.setItem("user", JSON.stringify(formattedUser));
            }
          } catch (error) {
            console.error("Error formatting initial user:", error);
          }
        } else {
          // Check for legacy user in localStorage
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              if (userData.authProvider === 'legacy') {
                // Restore legacy user
                setUser(userData);
              } else {
                localStorage.removeItem("user");
              }
            } catch (error) {
              console.error("Error parsing stored user:", error);
              localStorage.removeItem("user");
            }
          }
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login with GitHub
  const loginWithGitHub = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("GitHub login error:", error);
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Failed to sign in with GitHub",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (user?.authProvider === 'github') {
        // Supabase Auth logout
        await supabase.auth.signOut();
        setUser(null);
        setSupabaseUser(null);
        localStorage.removeItem("user");
      } else if (user?.authProvider === 'legacy') {
        // Legacy logout
        localStorage.removeItem("user");
        setUser(null);
      }
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      
      router.push('/');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isAuthenticated: !!user,
        isLoading,
        loginWithGitHub,
        loginWithCredentials,
        logout,
        refreshUserProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};