// components/Navbar.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Terminal,
  Home,
  Bookmark,
  Menu,
  X,
  Send,
  User,
  Trophy,
  Award,
  LogOut,
  ShieldAlert,
  FileText
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import AuthenticationDialog from "@/components/AuthenticationDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define owner ID - replace with your actual owner user ID
const OWNER_ID = "Sparths";

interface NavLinkProps {
  icon: React.ElementType;
  text: string;
  href: string;
  activeNav: string;
  setActiveNav: (id: string) => void;
}

const NavLink = ({
  icon: Icon,
  text,
  href,
  activeNav,
  setActiveNav,
}: NavLinkProps) => (
  <Link href={href}>
    <button
      onClick={() => setActiveNav(href)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${activeNav === href
          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white"
          : "text-gray-400 hover:text-white"
        }`}
    >
      <Icon
        className={`h-5 w-5 transition-transform duration-300 ${activeNav === href ? "scale-110" : ""
          }`}
      />
      <span className="hidden md:block">{text}</span>
    </button>
  </Link>
);

const Navbar = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("/");
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  
  // Check if user is the owner
  const isOwner = user && (user.id === OWNER_ID || user.username === OWNER_ID);

  useEffect(() => {
    setActiveNav(pathname);
  }, [pathname]);

  return (
    <nav className="fixed top-0 w-full bg-slate-900/90 backdrop-blur-lg border-b border-slate-700 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Terminal className="h-6 w-6 text-purple-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                Code Gems
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <NavLink
              icon={Home}
              text="Home"
              href="/"
              activeNav={activeNav}
              setActiveNav={setActiveNav}
            />
            <NavLink
              icon={Bookmark}
              text="Saved"
              href="/saved"
              activeNav={activeNav}
              setActiveNav={setActiveNav}
            />
            <NavLink
              icon={Send}
              text="Suggest Project"
              href="/request"
              activeNav={activeNav}
              setActiveNav={setActiveNav}
            />
            <NavLink
              icon={Trophy}
              text="Leaderboard"
              href="/leaderboard"
              activeNav={activeNav}
              setActiveNav={setActiveNav}
            />
            
            {isOwner && (
              <NavLink
                icon={ShieldAlert}
                text="Admin"
                href="/admin/project-requests"
                activeNav={activeNav}
                setActiveNav={setActiveNav}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="rounded-full p-2 bg-slate-800/80 border border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      {isAuthenticated && user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : null}
                      <span className="text-white text-sm hidden md:block pr-1">
                        {user?.displayName}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700 text-white">
                  <div className="flex items-center justify-between p-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.displayName}</span>
                      <span className="text-xs text-gray-400">
                        @{user?.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{user?.level}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer hover:bg-slate-700">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/profile?tab=my-requests">
                    <DropdownMenuItem className="cursor-pointer hover:bg-slate-700">
                      <FileText className="mr-2 h-4 w-4" />
                      <span>My Project Requests</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/badges">
                    <DropdownMenuItem className="cursor-pointer hover:bg-slate-700">
                      <Award className="mr-2 h-4 w-4" />
                      <span>Badges</span>
                    </DropdownMenuItem>
                  </Link>
                  {isOwner && (
                    <>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <Link href="/admin/project-requests">
                        <DropdownMenuItem className="cursor-pointer hover:bg-slate-700">
                          <ShieldAlert className="mr-2 h-4 w-4 text-purple-400" />
                          <span>Admin Panel</span>
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer hover:bg-slate-700 text-red-400 hover:text-red-300"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => setShowAuthDialog(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                Sign In
              </Button>
            )}

            <button
              className="md:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden transition-all duration-300 ${isMenuOpen
            ? "max-h-screen opacity-100 border-b border-slate-700"
            : "max-h-0 opacity-0 overflow-hidden"
          }`}
      >
        <div className="px-4 py-2 space-y-2">
          <NavLink
            icon={Home}
            text="Home"
            href="/"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          />
          <NavLink
            icon={Bookmark}
            text="Saved"
            href="/saved"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          />
          <NavLink
            icon={Send}
            text="Suggest Project"
            href="/request"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          />
          <NavLink
            icon={Trophy}
            text="Leaderboard"
            href="/leaderboard"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          />
          {isAuthenticated && (
            <>
              <NavLink
                icon={User}
                text="Profile"
                href="/profile"
                activeNav={activeNav}
                setActiveNav={setActiveNav}
              />
              <NavLink
                icon={FileText}
                text="My Project Requests"
                href="/profile?tab=my-requests"
                activeNav={activeNav}
                setActiveNav={setActiveNav}
              />
              <NavLink
                icon={Award}
                text="Badges"
                href="/badges"
                activeNav={activeNav}
                setActiveNav={setActiveNav}
              />
              {isOwner && (
                <NavLink
                  icon={ShieldAlert}
                  text="Admin Panel"
                  href="/admin/project-requests"
                  activeNav={activeNav}
                  setActiveNav={setActiveNav}
                />
              )}
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:text-red-300 cursor-pointer"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </div>
            </>
          )}
        </div>
      </div>

      <AuthenticationDialog
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </nav>
  );
};

export default Navbar;