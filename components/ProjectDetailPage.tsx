import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Star,
  GitFork,
  Tag,
  ExternalLink,
  Github,
  Bookmark,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useSaved } from "@/app/saved/SavedContext";
import RatingSystem from "@/components/RatingSystem";
import CommentSection from "@/components/CommentSection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/app/context/AuthContext";
import AuthenticationDialog from "@/components/AuthenticationDialog";
import supabase from "@/lib/supabase";

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
  languages: Language;
}

interface ProjectDetailPageProps {
  projectName: string;
}

const languageColors: { [key: string]: string } = {
  Python: "#3572A5",
  TypeScript: "#2b7489",
  JavaScript: "#f1e05a",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Dockerfile: "#384d54",
  Ruby: "#701516",
  PowerShell: "#012456",
  AutoHotkey: "#6594b9",
  Svelte: "#ff3e00",
  SCSS: "#c6538c",
  Scheme: "#1e4aec",
  "Inno Setup": "#264b99",
  Batchfile: "#C1F12E",
  Makefile: "#427819",
  Jinja: "#a52a22",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  Kotlin: "#F18E33",
  Swift: "#ffac45",
  "C++": "#f34b7d",
  "C#": "#178600",
  "C": "#555555",
  PHP: "#4F5D95",
  Dart: "#00B4AB",
};

const LanguageBar = ({ languages }: { languages: Language }) => {
  const totalBytes = Object.values(languages).reduce(
    (sum, value) => sum + value,
    0
  );

  const percentages = Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      percentage: (bytes / totalBytes) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);

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
                    backgroundColor: languageColors[name] || "#ededed",
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
                    style={{
                      backgroundColor: languageColors[name] || "#ededed",
                    }}
                  />
                  <span>
                    {name}: {percentage.toFixed(1)}%
                  </span>
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
                style={{ backgroundColor: languageColors[name] || "#ededed" }}
              />
              <span className="font-medium text-white">{name}</span>
              <span className="text-gray-400">{percentage.toFixed(1)}%</span>
            </div>
          ))}
      </div>
    </div>
  );
};

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectName,
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { savedProjects, addProject, removeProject } = useSaved();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  const isSaved = savedProjects.includes(projectName);

  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('name', projectName)
          .single();
        
        if (error) {
          throw new Error(`Failed to fetch project: ${error.message}`);
        }
        
        if (data) {
          setProject(data);
        } else {
          setError("Project not found");
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        setError("Failed to load project data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectName]);

  const toggleSave = () => {
    if (!isAuthenticated) {
      // Show authentication dialog if not logged in
      toast({
        title: "Sign in required",
        description: "You need to be signed in to save projects.",
        variant: "destructive",
      });
      setShowAuthDialog(true);
      return;
    }
    
    if (isSaved) {
      removeProject(projectName);
    } else {
      addProject(projectName);
    }
  };

  const goBack = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
            <p className="text-gray-400">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 mt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center py-20">
            <Alert className="bg-red-500/20 border-red-500 mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error || "Project not found"}
              </AlertDescription>
            </Alert>
            <Button onClick={goBack} className="bg-slate-800 hover:bg-slate-700 text-white">
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Project Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <h1 className="text-4xl font-bold text-white">{project.name}</h1>

              <div className="flex gap-3">
                <Button
                  onClick={toggleSave}
                  variant="outline"
                  className={`${
                    isSaved
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-slate-800 text-gray-300 border-slate-700"
                  } hover:bg-slate-700/80`}
                >
                  {isSaved ? (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <Bookmark className="mr-2 h-4 w-4" />
                  )}
                  {isSaved ? "Saved" : "Save"}
                </Button>

                <a href={project.url} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-slate-800 text-white hover:bg-slate-700/80 border border-slate-700">
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </Button>
                </a>
              </div>
            </div>

            <p className="text-gray-300 mt-4 text-lg">{project.description}</p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <div className="flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-full">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-300">{project.stars}</span>
              </div>

              <div className="flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-full">
                <GitFork className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300">{project.forks}</span>
              </div>

              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-full hover:bg-slate-700/80 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-blue-400" />
                <span className="text-gray-300">Open</span>
              </a>
            </div>
          </div>

          {/* Project Tags */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, index) => (
                <div
                  key={index}
                  className="bg-slate-800/80 text-gray-300 px-3 py-1 rounded-full flex items-center"
                >
                  <Tag className="h-3 w-3 mr-1.5" />
                  {tag}
                </div>
              ))}
            </div>
          </div>

          {/* Languages */}
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardContent className="p-6">
              <LanguageBar languages={project.languages} />
            </CardContent>
          </Card>

          {/* Rating System */}
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardContent className="p-6">
              <RatingSystem projectName={project.name} />
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <CommentSection projectName={project.name} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Authentication Dialog */}
      <AuthenticationDialog
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </div>
  );
};

export default ProjectDetailPage;