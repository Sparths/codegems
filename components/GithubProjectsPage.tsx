"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  GitFork,
  Search,
  Tag,
  ChevronLeft,
  ChevronRight,
  Heart,
  Github,
  Share2,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useSaved } from "@/app/saved/SavedContext";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AuthenticationDialog from "@/components/AuthenticationDialog";

const DiscordIcon = ({ className = "" }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="24"
    fill="currentColor"
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
);

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

interface SubmissionStatus {
  status: string;
  message: string;
}

const languageColors: { [key: string]: string } = {
  Ada: "#02f88c",
  Assembly: "#6E4C13",
  AutoHotkey: "#6594b9",
  Batchfile: "#C1F12E",
  C: "#555555",
  "C#": "#178600",
  "C++": "#f34b7d",
  Clojure: "#db5855",
  COBOL: "#4d41b1",
  CoffeeScript: "#244776",
  CSS: "#563d7c",
  D: "#ba595e",
  Dart: "#00B4AB",
  Dockerfile: "#384d54",
  Elixir: "#6e4a7e",
  Elm: "#60B5CC",
  Erlang: "#B83998",
  "F#": "#b845fc",
  Fortran: "#4d41b1",
  Go: "#00ADD8",
  Groovy: "#e69f56",
  Haskell: "#5e5086",
  HTML: "#e34c26",
  "Inno Setup": "#264b99",
  Java: "#b07219",
  JavaScript: "#f1e05a",
  Jinja: "#a52a22",
  Julia: "#a270ba",
  Kotlin: "#F18E33",
  LISP: "#3fb68b",
  Lua: "#000080",
  Makefile: "#427819",
  MATLAB: "#e16737",
  Nim: "#37775b",
  ObjectiveC: "#438eff",
  OCaml: "#3be133",
  Pascal: "#E3F171",
  Perl: "#0298c3",
  PHP: "#4F5D95",
  PowerShell: "#012456",
  Prolog: "#74283c",
  Python: "#3572A5",
  R: "#198CE7",
  Racket: "#3c5caa",
  Ruby: "#701516",
  Rust: "#dea584",
  Scala: "#c22d40",
  Scheme: "#1e4aec",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Smalltalk: "#596706",
  SQL: "#e38c00",
  Svelte: "#ff3e00",
  Swift: "#ffac45",
  Tcl: "#e4cc98",
  TypeScript: "#2b7489",
  V: "#5d87bd",
  Vala: "#fbe5cd",
  Verilog: "#b2b7f8",
  VHDL: "#adb2cb",
  Vue: "#41b883",
  WebAssembly: "#04133b",
  Zig: "#ec915c",
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

function getRandomGradient() {
  const colors = [
    "from-purple-500 to-pink-500",
    "from-blue-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-green-400 to-blue-500",
    "from-yellow-400 to-orange-500",
  ];
  return `bg-gradient-to-br ${
    colors[Math.floor(Math.random() * colors.length)]
  }`;
}

export default function GithubProjectsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const { savedProjects, addProject, removeProject } = useSaved();
  const [showDiscordDialog, setShowDiscordDialog] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>({
    status: "",
    message: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [projectRequest, setProjectRequest] = useState({
    title: "",
    githubLink: "",
    description: "",
    reason: "",
  });
  const [sortBy, setSortBy] = useState<SortOption>("none");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const projectsPerPage = 9;

  useEffect(() => {
    const fetchProjects = async () => {
      const response = await fetch("/api/projects");
      const data = await response.json();
      setProjects(
        data.map((project: Project) => ({
          ...project,
          color: getRandomGradient(),
        }))
      );
    };
    fetchProjects();
  }, []);
  
  type SortOption = "none" | "stars" | "forks";

  const sortProjects = (projects: Project[], sortBy: SortOption) => {
    if (sortBy === "none") return projects;

    return [...projects].sort((a, b) => {
      const aValue =
        parseFloat(a[sortBy].toLowerCase().replace(/[,k]/g, "")) *
        (a[sortBy].toLowerCase().includes("k") ? 1000 : 1);
      const bValue =
        parseFloat(b[sortBy].toLowerCase().replace(/[,k]/g, "")) *
        (b[sortBy].toLowerCase().includes("k") ? 1000 : 1);

      if (isNaN(aValue)) return 1;
      if (isNaN(bValue)) return -1;
      if (isNaN(aValue) && isNaN(bValue)) return 0;

      return bValue - aValue;
    });
  };
  
  const filteredProjects = sortProjects(
    projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        Object.keys(project.languages).some((lang) =>
          lang.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ),
    sortBy
  );

  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = filteredProjects.slice(
    indexOfFirstProject,
    indexOfLastProject
  );
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

  const handleCardClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleProjectRequest = async () => {
    if (
      !projectRequest.title.trim() ||
      !projectRequest.githubLink.trim() ||
      !projectRequest.description.trim() ||
      !projectRequest.reason.trim()
    ) {
      setSubmissionStatus({
        status: "error",
        message: "Please fill in all fields before submitting",
      });
      return;
    }

    setShowDiscordDialog(true);
  };

  const handleFinalSubmit = async () => {
    try {
      setSubmissionStatus({
        status: "loading",
        message: "Submitting your request...",
      });

      const response = await fetch("/api/project-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectRequest),
      });

      if (!response.ok) throw new Error("Failed to submit request");

      setSubmissionStatus({
        status: "success",
        message:
          "Thank you for contributing to the community! Your submission will be reviewed shortly.",
      });

      setProjectRequest({
        title: "",
        githubLink: "",
        description: "",
        reason: "",
      });
    } catch (error) {
      setSubmissionStatus({
        status: "error",
        message: "Failed to submit project request. Please try again.",
      });
      console.error("Failed to submit project request:", error);
    }
  };

  const handleDiscordJoin = () => {
    window.open("https://discord.gg/QtnFGDQj5S", "_blank");
    handleFinalSubmit();
  };

  const toggleSave = (projectName: string) => {
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
    
    const isSaved = savedProjects.includes(projectName);
    if (isSaved) {
      removeProject(projectName);
    } else {
      addProject(projectName);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="pt-24 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              Code Gems
            </h1>
            <p className="text-gray-400 text-xl mb-8">
              Discovering & Collecting Remarkable GitHub Projects
            </p>

            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search projects by name, description, tags or language..."
                className="pl-12 py-6 w-full bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex justify-end max-w-6xl mx-auto mb-8">
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem
                    value="none"
                    className="text-white hover:bg-slate-700"
                  >
                    No sorting
                  </SelectItem>
                  <SelectItem
                    value="stars"
                    className="text-white hover:bg-slate-700"
                  >
                    Most Stars
                  </SelectItem>
                  <SelectItem
                    value="forks"
                    className="text-white hover:bg-slate-700"
                  >
                    Most Forks
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {currentProjects.map((project) => {
              const isSaved = savedProjects.includes(project.name);
              return (
                <div
                  key={project.name}
                  className="group relative cursor-pointer"
                  onClick={() => router.push("/" + project.name)}
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
                          className={`text-gray-400 ${
                            isSaved ? "text-green-500" : "hover:text-white"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(project.name);
                          }}
                        >
                          {isSaved ? "Unsave" : "Save"}
                        </Button>
                      </div>
                      <p className="text-gray-300 mb-6">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {project.tags.map((tag, tagIndex) => (
                          <div
                            key={tagIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchTerm(tag);
                            }}
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
              );
            })}
          </div>

          <div className="flex justify-center gap-4 mb-16">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-gray-400 flex items-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="bg-slate-800/50 border-slate-700 h-fit">
              <CardHeader>
                <CardTitle className="text-white text-xl text-center">
                  Request a Project
                </CardTitle>
                <CardDescription className="text-gray-300 text-center">
                  Share an amazing project with the community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Project Title"
                  value={projectRequest.title}
                  onChange={(e) =>
                    setProjectRequest((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
                />

                <div className="flex items-center gap-2">
                  <Github className="text-white" />
                  <Input
                    placeholder="GitHub Link"
                    value={projectRequest.githubLink}
                    onChange={(e) =>
                      setProjectRequest((prev) => ({
                        ...prev,
                        githubLink: e.target.value,
                      }))
                    }
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
                  />
                </div>

                <Textarea
                  placeholder="What is this project about?"
                  value={projectRequest.description}
                  onChange={(e) =>
                    setProjectRequest((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
                />

                <Textarea
                  placeholder="Why do you think this is a good project?"
                  value={projectRequest.reason}
                  onChange={(e) =>
                    setProjectRequest((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
                />

                {submissionStatus.status && (
                  <Alert
                    className={`${
                      submissionStatus.status === "success"
                        ? "bg-green-500/20 border-green-500"
                        : submissionStatus.status === "error"
                        ? "bg-red-500/20 border-red-500"
                        : "bg-blue-500/20 border-blue-500"
                    } text-white border`}
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                      {submissionStatus.status === "success"
                        ? "Success!"
                        : submissionStatus.status === "error"
                        ? "Error"
                        : "Submitting..."}
                    </AlertTitle>
                    <AlertDescription>
                      {submissionStatus.message}
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  onClick={handleProjectRequest}
                  className="bg-purple-500 hover:bg-purple-600 text-white w-full flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Submit
                </Button>

                <div className="flex items-center justify-center gap-4 mt-4">
                  <Badge
                    variant="secondary"
                    className="bg-slate-700 text-gray-300"
                  >
                    <Star className="w-4 h-4 mr-1" /> Community Driven
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-slate-700 text-gray-300"
                  >
                    <Heart className="w-4 h-4 mr-1" /> Open Source
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 text-white h-fit lg:mt-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="text-purple-500" />
                  Community Guidelines
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Help us maintain a high-quality collection of projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-300">
                <div className="flex items-start gap-2">
                  <Check className="text-green-500 mt-1" />
                  <p>
                    Share projects that have made a significant impact on your
                    development workflow
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="text-green-500 mt-1" />
                  <p>
                    Include detailed descriptions to help others understand the
                    projects value
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="text-green-500 mt-1" />
                  <p>
                    Ensure the project is actively maintained and
                    well-documented
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-3">
                    What makes a good submission?
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <Check className="text-green-500 mt-1" />
                      <p>
                        Clear description of the projects purpose and benefits
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-green-500 mt-1" />
                      <p>Regular updates and active maintenance</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-green-500 mt-1" />
                      <p>Good documentation and examples</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-green-500 mt-1" />
                      <p>Responsive maintainers and community</p>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showDiscordDialog} onOpenChange={setShowDiscordDialog}>
        <AlertDialogContent className="bg-slate-800 text-white border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-2">
              <DiscordIcon className="text-purple-500 w-6 h-6" />
              Join Our Discord Community!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 space-y-4">
              <p>
                Dont miss updates about your submission! Join our vibrant
                Discord community to:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-1 shrink-0" />
                  Get notified when your project is reviewed
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-1 shrink-0" />
                  Connect with like-minded developers
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-1 shrink-0" />
                  Discover more amazing projects daily
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-green-500 mt-1 shrink-0" />
                  Share your knowledge and learn from others
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleFinalSubmit}
              className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600"
            >
              Submit Without Joining
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscordJoin}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Join Discord and Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Authentication Dialog */}
      <AuthenticationDialog
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </div>
  );
}