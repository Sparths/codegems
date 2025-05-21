import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertCircle } from "lucide-react";

const ProfileForm = () => {
  const { user, updateUser, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
    }
  }, [user]);

  const validateForm = () => {
    if (!displayName.trim()) {
      setFormError("Display name is required");
      return false;
    }
    
    setFormError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(null);
    setFormError(null);
    
    if (!validateForm()) return;
    
    try {
      const success = await updateUser({
        displayName: displayName
      });
      
      if (success) {
        setFormSuccess("Profile updated successfully");
      } else {
        setFormError("Failed to update profile. Please try again.");
      }
    } catch (error) {
      setFormError("An unexpected error occurred. Please try again later.");
      console.error("Profile update error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formSuccess && (
        <Alert className="bg-green-500/20 border-green-500 mb-4">
          <Check className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-200">
            {formSuccess}
          </AlertDescription>
        </Alert>
      )}
      
      {formError && (
        <Alert className="bg-red-500/20 border-red-500 mb-4">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            {formError}
          </AlertDescription>
        </Alert>
      )}
    
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-white">
          Display Name
        </Label>
        <Input
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your display name"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>
      
      <div className="pt-4">
        <Button
          type="submit"
          className="bg-purple-500 hover:bg-purple-600 text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Updating...
            </span>
          ) : (
            "Update Profile"
          )}
        </Button>
      </div>
    </form>
  );
};

export default ProfileForm;