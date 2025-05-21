"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Github, LogIn, UserPlus, Mail, Lock, User, Award, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthDialogProps {
  trigger?: React.ReactNode;
  defaultTab?: "github" | "legacy" | "register";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AuthenticationDialog: React.FC<AuthDialogProps> = ({
  trigger,
  defaultTab = "github",
  isOpen,
  onOpenChange,
}) => {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const { loginWithGitHub, loginWithCredentials, isLoading } = useAuth();

  // Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register fields
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerDisplayName, setRegisterDisplayName] = useState("");
  
  // Field validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleGitHubLogin = async () => {
    try {
      setError(null);
      await loginWithGitHub();
    } catch (err) {
      setError("Failed to sign in with GitHub. Please try again.");
    }
  };

  const validateLogin = () => {
    const errors: Record<string, string> = {};
    
    if (!loginUsername.trim()) {
      errors.loginUsername = "Username is required";
    }
    
    if (!loginPassword) {
      errors.loginPassword = "Password is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLegacyLogin = async () => {
    if (!validateLogin()) return;
    
    try {
      setError(null);
      const success = await loginWithCredentials(loginUsername, loginPassword);
      
      if (success && onOpenChange) {
        onOpenChange(false);
      }
    } catch (err) {
      setError("Failed to sign in. Please check your credentials and try again.");
    }
  };

  // If Dialog is being controlled externally
  const dialogProps =
    isOpen !== undefined ? { open: isOpen, onOpenChange } : {};

  const content = (
    <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl">Sign in to Code Gems</DialogTitle>
        <DialogDescription className="text-gray-400">
          Sign in to rate projects, leave comments, and unlock badges.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert className="bg-red-500/20 border-red-500 mb-4">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setError(null);
          setValidationErrors({});
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 bg-slate-700">
          <TabsTrigger
            value="github"
            className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Github className="h-4 w-4 mr-2" /> GitHub
          </TabsTrigger>
          <TabsTrigger
            value="legacy"
            className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <LogIn className="h-4 w-4 mr-2" /> Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="github" className="py-4">
          <div className="space-y-6">
            <div className="bg-slate-700/50 rounded-lg p-3 flex items-start gap-2">
              <Award className="text-purple-400 h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                When you sign in with GitHub, you'll get your first badge and 10 points!
              </p>
            </div>

            <Button
              onClick={handleGitHubLogin}
              className="w-full bg-black hover:bg-gray-900 text-white border border-gray-600 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  Sign in with GitHub
                </span>
              )}
            </Button>
            
            <div className="text-center text-sm text-gray-400">
              <p>
                By signing in, you agree to our terms of service and privacy policy.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="legacy" className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Your username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                />
              </div>
              {validationErrors.loginUsername && (
                <p className="text-red-400 text-sm">{validationErrors.loginUsername}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                />
              </div>
              {validationErrors.loginPassword && (
                <p className="text-red-400 text-sm">{validationErrors.loginPassword}</p>
              )}
            </div>

            <Button
              onClick={handleLegacyLogin}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </span>
              )}
            </Button>
            
            <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-500/30">
              <p className="text-sm text-purple-300">
                <strong>New:</strong> Sign in with GitHub to enjoy a smoother experience!
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog {...dialogProps}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return <Dialog {...dialogProps}>{content}</Dialog>;
};

export default AuthenticationDialog;

