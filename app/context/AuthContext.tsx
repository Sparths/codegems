"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  points: number;
  level: number;
  badges: string[];
  avatarUrl: string;
  token?: string;
  tokenExpiration?: number;
}

// Extended interface for update operations with password change
interface UserUpdate extends Partial<User> {
  currentPassword?: string;
  newPassword?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (
    username: string,
    email: string,
    password: string,
    displayName?: string
  ) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: UserUpdate) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token expiration time (24 hours)
const TOKEN_EXPIRATION_TIME = 24 * 60 * 60 * 1000;

// Web Crypto API based hashing function
async function hashPassword(password: string, salt: string): Promise<string> {
  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);
  
  // Create a key from the password
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 1000,
      hash: 'SHA-512',
    },
    passwordKey,
    512 // 64 bytes (512 bits)
  );
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Generate a random salt
function generateSalt(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a proper UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Debug Supabase connection on initialization
  useEffect(() => {
    console.log('Supabase config:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 5) + '...'
    });
    
    const testSupabase = async () => {
      try {
        // Just test if we can connect at all
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .limit(1);
          
        console.log('Supabase connection test:', { 
          success: !error, 
          data: data ? 'Data received' : 'No data', 
          error: error?.message || 'None' 
        });
      } catch (err) {
        console.error('Supabase connection error:', err);
      }
    };
    
    testSupabase();
  }, []);

  // Load user from local storage on page load
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        
        // Check if token is expired
        if (userData.tokenExpiration && Date.now() > userData.tokenExpiration) {
          // Token expired, log out user
          localStorage.removeItem("user");
          setUser(null);
          toast({
            title: "Session expired",
            description: "Please sign in again.",
          });
        } else {
          setUser(userData);
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  // Login function using Supabase
  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Login attempt for username:', username);

      // Get the user by username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      console.log('User lookup result:', { 
        found: !!userData, 
        error: userError?.message || 'None'
      });

      if (userError || !userData) {
        toast({
          title: "Login failed",
          description: "Invalid username or password.",
          variant: "destructive",
        });
        return false;
      }

      // Verify password
      const hashedPassword = await hashPassword(password, userData.salt);
      console.log('Password verification:', { 
        matches: hashedPassword === userData.password_hash,
      });

      if (hashedPassword !== userData.password_hash) {
        toast({
          title: "Login failed",
          description: "Invalid username or password.",
          variant: "destructive",
        });
        return false;
      }

      // Format the user object to match our frontend structure
      const formattedUser: User = {
        id: userData.id,
        username: userData.username,
        displayName: userData.display_name,
        email: userData.email,
        points: userData.points || 0,
        level: userData.level || 1,
        badges: userData.badges || ["newcomer"],
        avatarUrl: userData.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        token: generateSalt(), // Simple token
        tokenExpiration: Date.now() + TOKEN_EXPIRATION_TIME
      };
      
      console.log('Login successful for user:', userData.username);
      
      setUser(formattedUser);
      localStorage.setItem("user", JSON.stringify(formattedUser));

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

  // Check token validity
  const checkTokenValidity = (): boolean => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        const tokenExpiration = userData.tokenExpiration;

        if (tokenExpiration && Date.now() > tokenExpiration) {
          // Token expired, log out user
          logout();
          toast({
            title: "Session expired",
            description: "Please sign in again.",
          });
          return false;
        }
        return true;
      } catch (error) {
        console.error("Error checking token validity:", error);
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    // Check token validity on component mount
    checkTokenValidity();
    
    // Set up interval to check token validity periodically (every 5 minutes)
    const intervalId = setInterval(checkTokenValidity, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const register = async (
    username: string,
    email: string,
    password: string,
    displayName?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Starting registration process for:', username);

      // Check if username exists (using different approach)
      const { count: usernameCount, error: usernameCountError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('username', username);

      console.log('Username check result:', { 
        count: usernameCount, 
        error: usernameCountError?.message || 'None' 
      });

      if (usernameCountError) {
        console.error("Error checking username:", usernameCountError);
        toast({
          title: "Registration failed",
          description: `Error checking username: ${usernameCountError.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (usernameCount && usernameCount > 0) {
        toast({
          title: "Registration failed",
          description: "Username already exists.",
          variant: "destructive",
        });
        return false;
      }

      // Check if email exists (using count approach)
      const { count: emailCount, error: emailCountError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('email', email);

      console.log('Email check result:', { 
        count: emailCount, 
        error: emailCountError?.message || 'None' 
      });

      if (emailCountError) {
        console.error("Error checking email:", emailCountError);
        toast({
          title: "Registration failed",
          description: `Error checking email: ${emailCountError.message}`,
          variant: "destructive",
        });
        return false;
      }

      if (emailCount && emailCount > 0) {
        toast({
          title: "Registration failed",
          description: "Email already exists.",
          variant: "destructive",
        });
        return false;
      }

      // Create password hash using Web Crypto API
      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);

      // Create user with UUID format ID
      const userId = generateUUID();
      const newUser = {
        id: userId,
        username,
        email,
        display_name: displayName || username,
        password_hash: passwordHash,
        salt,
        points: 10, // Starting points
        level: 1,
        badges: ["newcomer"], // Newcomer badge
        created_at: new Date().toISOString(),
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`, // Generated avatar
      };

      console.log('Attempting to insert user with UUID:', { 
        id: userId,
        username,
        email,
        display_name: displayName || username,
        // Don't log sensitive info
      });

      // Insert user into database
      const { error: insertError } = await supabase
        .from('users')
        .insert(newUser);

      if (insertError) {
        console.error("Error inserting user:", insertError);
        toast({
          title: "Registration failed",
          description: `Database error: ${insertError.message}`,
          variant: "destructive",
        });
        return false;
      }

      console.log('User registration successful');

      // Format the user object for the frontend
      const formattedUser: User = {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        email: newUser.email,
        points: newUser.points,
        level: newUser.level,
        badges: newUser.badges,
        avatarUrl: newUser.avatar_url,
        token: generateSalt(),
        tokenExpiration: Date.now() + TOKEN_EXPIRATION_TIME
      };
      
      setUser(formattedUser);
      localStorage.setItem("user", JSON.stringify(formattedUser));

      toast({
        title: "Registration successful",
        description: `Welcome, ${formattedUser.displayName}!`,
      });

      return true;
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const updateUser = async (userData: UserUpdate): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsLoading(true);

      // Check token validity before proceeding
      if (!checkTokenValidity()) {
        return false;
      }

      const updates: Record<string, any> = {};

      // Map user data to database column names
      if (userData.displayName) updates.display_name = userData.displayName;
      if (userData.email) updates.email = userData.email;
      if (userData.avatarUrl) updates.avatar_url = userData.avatarUrl;

      // Handle password update separately if provided
      if (userData.currentPassword && userData.newPassword) {
        // Get current user data for password verification
        const { data: currentUserData, error: userError } = await supabase
          .from('users')
          .select('salt, password_hash')
          .eq('id', user.id)
          .single();

        if (userError || !currentUserData) {
          toast({
            title: "Update failed",
            description: "Error verifying current password.",
            variant: "destructive",
          });
          return false;
        }

        // Verify current password
        const hashedCurrentPassword = await hashPassword(userData.currentPassword, currentUserData.salt);

        if (hashedCurrentPassword !== currentUserData.password_hash) {
          toast({
            title: "Update failed",
            description: "Current password is incorrect.",
            variant: "destructive",
          });
          return false;
        }

        // Create new password hash
        const newSalt = generateSalt();
        const newPasswordHash = await hashPassword(userData.newPassword, newSalt);

        updates.salt = newSalt;
        updates.password_hash = newPasswordHash;
      }

      // Update user in database
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        toast({
          title: "Update failed",
          description: "Error updating profile: " + updateError.message,
          variant: "destructive",
        });
        return false;
      }

      // Update the local user state with new values
      const updatedUser = {
        ...user,
        ...userData,
        tokenExpiration: user.tokenExpiration // Preserve token expiration
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      return true;
    } catch (error) {
      console.error("Update user error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
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