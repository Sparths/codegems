'use client';

import { useSaved } from './SavedContext';
import { useAuth } from '@/app/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, GitFork, Tag, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AuthenticationDialog from "@/components/AuthenticationDialog";
import supabase from '@/lib/supabase';

interface Language {
  [key: string]: number;
}

interface Project {
  name: string;
  description: string;
  stars: string;
  forks: string;
  tags: string[];
  url: string;
  color?: string;
  languages: Language;
}

const languageColors: { [key: string]: string } = {
  Python: '#3572A5',
  TypeScript: '#2b7489',
  JavaScript: '#f1e05a',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Dockerfile: '#384d54',
  Ruby: '#701516',
  PowerShell: '#012456',
  AutoHotkey: '#6594b9',
  Svelte: '#ff3e00',
  SCSS: '#c6538c',
  Scheme: '#1e4aec',
  "Inno Setup": '#264b99',
  Batchfile: '#C1F12E',
  Makefile: '#427819',
  Jinja: '#a52a22',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  Kotlin: '#F18E33',
  Swift: '#ffac45',
  "C++": '#f34b7d',
  "C#": '#178600',
  "C": '#555555',
  PHP: '#4F5D95',
  Dart: '#00B4AB',
};

const LanguageBar = ({ languages }: { languages: Language }) => {
  const totalBytes = Object.values(languages).reduce((sum, value) => sum + value, 0);
  
  const percentages = Object.entries(languages).map(([name, bytes]) => ({
    name,
    percentage: (bytes / totalBytes) * 100
  })).sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Languages</h2>
      
      <TooltipProvider>
        <div className="h-2 w-full flex rounded-full overflow-hidden">
          {percentages.map(({ name, percentage }) => (
            <Tooltip key={name} delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: languageColors[name] || '#ededed'
                  }}
                  className="transition-opacity hover:opacity-80"
                />
              </TooltipTrigger>
              <TooltipContent 
                className="bg-slate-800 border-slate-700 text-white"
                side="top"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: languageColors[name] || '#ededed' }}
                  />
                  <span>{name}: {percentage.toFixed(1)}%</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      
      <div className="flex flex-wrap gap-4">
        {percentages
          .filter(({ percentage }) => percentage >= 2) 
          .map(({ name, percentage }) => (
            <div key={name} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: languageColors[name] || '#ededed' }}
              />
              <span className="font-medium text-white">{name}</span>
              <span className="text-gray-400">{percentage.toFixed(1)}%</span>
            </div>
          ))}
      </div>
    </div>
  );
};

function getRandomGradient() {
  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-green-400 to-blue-500',
    'from-yellow-400 to-orange-500',
  ];
  const randomIndex = Math.floor(Math.random() * colors.length);
  return `bg-gradient-to-br ${colors[randomIndex]}`;
}

export default function SavedPage() {
  const { removeProject, savedProjects, isLoading } = useSaved();
  const { isAuthenticated } = useAuth();
  const [savedProjectDetails, setSavedProjectDetails] = useState<Project[]>([]);
  const [showWarning, setShowWarning] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState<boolean>(false);

  useEffect(() => {
    const fetchSavedProjects = async () => {
      if (!isAuthenticated) {
        setSavedProjectDetails([]);
        return;
      }

      setError(null);
      
      try {
        if (savedProjects.length === 0) {
          setSavedProjectDetails([]);
          return;
        }

        // Fetch project details from Supabase
        const { data: allProjects, error } = await supabase
          .from('projects')
          .select('*')
          .in('name', savedProjects);

        if (error) {
          throw new Error(`Error fetching projects: ${error.message}`);
        }
        
        // Apply random gradients to projects
        const projectsWithColors = allProjects.map((project: Project) => ({
          ...project,
          color: getRandomGradient()
        }));
        
        setSavedProjectDetails(projectsWithColors);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setError('Failed to load saved projects. Please try again later.');
      }
    };

    fetchSavedProjects();
  }, [savedProjects, isAuthenticated]); 

  const handleRemove = (projectName: string) => {
    removeProject(projectName);
    setSavedProjectDetails((prevDetails) =>
      prevDetails.filter((project) => project.name !== projectName)
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Saved Projects
            </h1>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 max-w-xl mx-auto">
              <p className="text-gray-300 text-lg mb-6">
                You need to be signed in to save projects. Sign in to your account to save your favorite projects and access them from any device.
              </p>
              <Button
                onClick={() => setShowAuthDialog(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Save Projects
              </Button>
              
              <AuthenticationDialog
                isOpen={showAuthDialog}
                onOpenChange={setShowAuthDialog}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Saved Projects
            </h1>
            <div className="flex items-center justify-center mt-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Saved Projects
            </h1>
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 max-w-xl mx-auto">
              <p className="text-white">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="pt-24 p-8">
        <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Saved Projects
            </h1>
          </div>
          {savedProjectDetails.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No projects saved yet.</p>
              <p className="text-gray-400 mt-2">
                Explore projects and add them to your saved list!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedProjectDetails.map((project, index) => (
                <div
                  key={index}
                  className="group relative cursor-pointer"
                  onClick={() => window.location.href = `/${project.name}`}
                >
                  <div
                    className={`absolute inset-0 ${project.color} rounded-xl blur-md opacity-20 group-hover:opacity-30 transition-all duration-500`}
                  ></div>
                  <Card className="relative h-full bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all duration-500 backdrop-blur-sm transform-gpu hover:-translate-y-2 hover:scale-105">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:via-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                          {project.name}
                        </h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(project.name);
                          }}
                        >
                          Remove
                        </Button>
                      </div>

                      <p className="text-gray-300 mb-6">{project.description}</p>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {project.tags.map((tag, tagIndex) => (
                          <div
                            key={tagIndex}
                            className="bg-slate-700/50 text-gray-300 text-sm px-3 py-1 rounded-full flex items-center transform transition-all duration-300 hover:scale-105 hover:bg-slate-600/50"
                          >
                            <Tag className="h-3 w-3 mr-1.5" />
                            {tag}
                          </div>
                        ))}
                      </div>

                      <LanguageBar languages={project.languages} />

                      <div className="flex justify-start gap-6 text-sm text-gray-400 mt-6">
                        <span className="flex items-center">
                          <Star className="h-4 w-4 mr-1.5 text-yellow-500" />
                          {project.stars}
                        </span>
                        <span className="flex items-center">
                          <GitFork className="h-4 w-4 mr-1.5" />
                          {project.forks}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}