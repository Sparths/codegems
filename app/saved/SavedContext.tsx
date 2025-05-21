"use client"
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SavedContextProps {
  savedProjects: string[];
  addProject: (project: string) => void;
  removeProject: (project: string) => void;
  clearAllSaved: () => void;
  isLoading: boolean;
}

const SavedContext = createContext<SavedContextProps | undefined>(undefined);

export const SavedProvider = ({ children }: { children: ReactNode }) => {
  const [savedProjects, setSavedProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch saved projects
  const fetchSavedProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated && user) {
        // Fetch from database for authenticated users
        const response = await fetch(`/api/saved-projects?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setSavedProjects(data);
        } else {
          console.error('Error fetching saved projects from API:', response.statusText);
          // Fallback to localStorage if API fails
          try {
            const stored = localStorage.getItem('savedProjects');
            setSavedProjects(stored ? JSON.parse(stored) : []);
          } catch (localError) {
            console.error('Error parsing saved projects from localStorage:', localError);
            setSavedProjects([]);
          }
        }
      } else {
        // Use localStorage for non-authenticated users
        try {
          const stored = localStorage.getItem('savedProjects');
          setSavedProjects(stored ? JSON.parse(stored) : []);
        } catch (error) {
          console.error('Error parsing saved projects from localStorage:', error);
          localStorage.removeItem('savedProjects');
          setSavedProjects([]);
        }
      }
    } catch (error) {
      console.error('Error fetching saved projects:', error);
      setSavedProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Initial load
  useEffect(() => {
    fetchSavedProjects();
  }, [fetchSavedProjects]);

  // Sync with localStorage for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated && typeof window !== 'undefined') {
      try {
        localStorage.setItem('savedProjects', JSON.stringify(savedProjects));
      } catch (error) {
        console.error('Error saving projects to localStorage:', error);
      }
    }
  }, [savedProjects, isAuthenticated]);

  // Listen for storage events to sync across tabs for non-authenticated users
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'savedProjects' && event.newValue !== null && !isAuthenticated) {
        try {
          setSavedProjects(JSON.parse(event.newValue));
        } catch (error) {
          console.error('Error parsing saved projects from storage event:', error);
        }
      }
    };

    if (typeof window !== 'undefined' && !isAuthenticated) {
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [isAuthenticated]);

  // Add project
  const addProject = useCallback(async (project: string) => {
    // Check if the project is already saved
    if (savedProjects.includes(project)) {
      return;
    }

    if (isAuthenticated && user) {
      // Save to database
      try {
        const response = await fetch('/api/saved-projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            projectName: project,
          }),
        });

        if (response.ok) {
          setSavedProjects((prev) => [...prev, project]);
          toast({
            title: "Project saved",
            description: "Project has been added to your saved list",
          });
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.error || "Failed to save project",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error saving project:', error);
        toast({
          title: "Error",
          description: "Failed to save project",
          variant: "destructive",
        });
      }
    } else {
      // Save to localStorage
      setSavedProjects((prev) => [...prev, project]);
    }
  }, [savedProjects, isAuthenticated, user, toast]);

  // Remove project
  const removeProject = useCallback(async (project: string) => {
    if (isAuthenticated && user) {
      // Remove from database
      try {
        const response = await fetch(`/api/saved-projects?userId=${user.id}&projectName=${encodeURIComponent(project)}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSavedProjects((prev) => prev.filter((p) => p !== project));
          toast({
            title: "Project removed",
            description: "Project has been removed from your saved list",
          });
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.error || "Failed to remove project",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error removing project:', error);
        toast({
          title: "Error", 
          description: "Failed to remove project",
          variant: "destructive",
        });
      }
    } else {
      // Remove from localStorage
      setSavedProjects((prev) => prev.filter((p) => p !== project));
    }
  }, [isAuthenticated, user, toast]);

  // Clear all saved projects
  const clearAllSaved = useCallback(async () => {
    if (isAuthenticated && user) {
      // Clear all saved projects from database
      // This would require a dedicated API endpoint which we haven't created
      // For now, let's just remove each project one by one
      try {
        const promises = savedProjects.map(project => 
          fetch(`/api/saved-projects?userId=${user.id}&projectName=${encodeURIComponent(project)}`, {
            method: 'DELETE',
          })
        );
        
        await Promise.all(promises);
        setSavedProjects([]);
        toast({
          title: "Projects cleared",
          description: "All projects have been removed from your saved list",
        });
      } catch (error) {
        console.error('Error clearing saved projects:', error);
        toast({
          title: "Error",
          description: "Failed to clear saved projects",
          variant: "destructive",
        });
      }
    } else {
      // Clear localStorage
      setSavedProjects([]);
      localStorage.removeItem('savedProjects');
    }
  }, [savedProjects, isAuthenticated, user, toast]);

  return (
    <SavedContext.Provider value={{ 
      savedProjects, 
      addProject, 
      removeProject,
      clearAllSaved,
      isLoading
    }}>
      {children}
    </SavedContext.Provider>
  );
};

export const useSaved = () => {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error("useSaved must be used within a SavedProvider");
  }
  return context;
};