"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  Gift,
  Star,
  MessageSquare,
  Search,
  TrendingUp,
  Shield,
  Code,
  Clock,
  User,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import supabase from "@/lib/supabase";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
}

interface BadgeDisplayProps {
  userBadges: string[];
  showUnearned?: boolean;
  size?: "sm" | "md" | "lg";
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  userBadges,
  showUnearned = false,
  size = "md",
}) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const { data, error } = await supabase
          .from('badges')
          .select('*');
        
        if (error) {
          console.error("Error fetching badges:", error);
          return;
        }
        
        setBadges(data || []);
      } catch (error) {
        console.error("Error fetching badges:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadges();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const getBadgeIcon = (iconName: string) => {
    const iconProps = {
      className:
        size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6",
    };

    switch (iconName) {
      case "Gift":
        return <Gift {...iconProps} />;
      case "Star":
        return <Star {...iconProps} />;
      case "MessageSquare":
        return <MessageSquare {...iconProps} />;
      case "Search":
        return <Search {...iconProps} />;
      case "Award":
        return <Award {...iconProps} />;
      case "TrendingUp":
        return <TrendingUp {...iconProps} />;
      case "Shield":
        return <Shield {...iconProps} />;
      case "Code":
        return <Code {...iconProps} />;
      case "Clock":
        return <Clock {...iconProps} />;
      case "User":
        return <User {...iconProps} />;
      case "BookOpen":
        return <BookOpen {...iconProps} />;
      case "MessageCircle":
        return <MessageCircle {...iconProps} />;
      default:
        return <Award {...iconProps} />;
    }
  };

  // Filter badges based on showUnearned
  const badgesToDisplay = showUnearned
    ? badges
    : badges.filter((badge) => userBadges.includes(badge.name));

  if (badgesToDisplay.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-400">No badges unlocked yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <TooltipProvider>
        {badgesToDisplay.map((badge) => {
          const isEarned = userBadges.includes(badge.name);

          return (
            <Tooltip key={badge.name} delayDuration={300}>
              <TooltipTrigger asChild>
                <div
                  className={`
                    ${
                      size === "sm"
                        ? "w-8 h-8 p-1.5"
                        : size === "lg"
                        ? "w-16 h-16 p-3"
                        : "w-12 h-12 p-2.5"
                    } 
                    ${
                      isEarned
                        ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white"
                        : "bg-slate-800/50 text-gray-400"
                    } 
                    rounded-lg flex items-center justify-center transition-transform hover:scale-110
                  `}
                >
                  {getBadgeIcon(badge.icon)}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-slate-800 border-slate-700 text-white p-4 max-w-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`${
                        isEarned ? "text-purple-400" : "text-gray-400"
                      }`}
                    >
                      {getBadgeIcon(badge.icon)}
                    </div>
                    <h4 className="font-semibold">{badge.name}</h4>
                  </div>
                  <p className="text-sm text-gray-300">{badge.description}</p>
                  <p className="text-xs text-purple-400">
                    +{badge.points} points
                  </p>
                  {!isEarned && showUnearned && (
                    <p className="text-xs italic text-gray-400 pt-1">
                      Not yet unlocked
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

export default BadgeDisplay;