// components/AuthenticationDialog.tsx

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
import { Button } from "@/components/ui/button";
import { AlertCircle, Github } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthDialogProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AuthenticationDialog: React.FC<AuthDialogProps> = ({
  trigger,
  isOpen,
  onOpenChange,
}) => {
  const [error, setError] = useState<string | null>(null);
  const { loginWithGitHub, isLoading } = useAuth();

  const handleGitHubLogin = async () => {
    try {
      setError(null);
      await loginWithGitHub();
    } catch (err) {
      setError("Failed to sign in with GitHub. Please try again.");
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

      <div className="space-y-6 py-4">
        <div className="bg-slate-700/50 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="text-blue-400 h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-300">
            When you sign in with GitHub, you&apos;ll get your first badge and 10 points!
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