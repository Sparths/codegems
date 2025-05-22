// components/UserProjectRequests.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  XCircle,
  Github,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProjectRequest {
  id: string;
  user_id: string;
  title: string;
  github_link: string;
  description: string;
  reason: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string | null;
  admin_notes: string | null;
}

const UserProjectRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ProjectRequest | null>(null);
  
// In components/UserProjectRequests.tsx - fetchRequests function

const fetchRequests = async () => {
  if (!user) return;
  
  setIsLoading(true);
  setError(null);
  
  try {
    console.log(`Fetching requests for user ID: ${user.id}`);
    
    const response = await fetch(`/api/project-requests?userId=${encodeURIComponent(user.id)}`);
    if (!response.ok) {
      throw new Error(`Error fetching requests: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Received ${data.length} project requests for user`, data);
    
    setRequests(data);
  } catch (err) {
    console.error('Error fetching project requests:', err);
    setError('Failed to load your project requests. Please try again later.');
  } finally {
    setIsLoading(false);
  }
};
  
  useEffect(() => {
    fetchRequests();
  }, [user, fetchRequests]);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/30">
            <Clock className="mr-1 h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border-green-500/30">
            <CheckCircle className="mr-1 h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30">
            <XCircle className="mr-1 h-3 w-3" />
            Declined
          </Badge>
        );
      default:
        return null;
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert className="bg-red-500/20 border-red-500 mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button 
          onClick={fetchRequests} 
          variant="outline" 
          className="mt-2 bg-slate-800 hover:bg-slate-700 text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </Alert>
    );
  }
  
  if (requests.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardContent className="pt-6 text-center">
          <p className="text-gray-400">You haven&apos;t submitted any project requests yet.</p>
          <Button
            onClick={() => window.location.href = '/request'}
            className="mt-4 bg-purple-500 hover:bg-purple-600 text-white"
          >
            Submit Your First Project
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Your Project Submissions</h2>
        <Button
          onClick={() => window.location.href = '/request'}
          className="bg-purple-500 hover:bg-purple-600 text-white"
          size="sm"
        >
          Submit New Project
        </Button>
      </div>
      
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="bg-slate-800/50 border-slate-700 text-white">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">{request.title}</CardTitle>
                  <CardDescription className="text-gray-400">
                    Submitted on {formatDate(request.created_at)}
                  </CardDescription>
                </div>
                {getStatusBadge(request.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-gray-400" />
                <a 
                  href={request.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                >
                  {request.github_link.replace('https://github.com/', '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              
              <p className="text-gray-300 line-clamp-2">{request.description}</p>
              
              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="outline"
                  className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                  size="sm"
                  onClick={() => setSelectedRequest(request)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Details
                </Button>
                
                {request.status === 'accepted' && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    +50 points earned
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Request Details Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedRequest.title}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Submitted on {formatDate(selectedRequest.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status:</span>
                {getStatusBadge(selectedRequest.status)}
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Github className="h-4 w-4 text-gray-400" />
                  <a 
                    href={selectedRequest.github_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-white font-medium mb-1">Description</h3>
                <p className="text-gray-300">{selectedRequest.description}</p>
              </div>
              
              <div>
                <h3 className="text-white font-medium mb-1">Why is it good?</h3>
                <p className="text-gray-300">{selectedRequest.reason}</p>
              </div>
              
              {selectedRequest.admin_notes && (
                <div className="border border-slate-700 rounded-md p-3 bg-slate-800/50">
                  <h3 className="text-white font-medium mb-1">Admin Notes</h3>
                  <p className="text-gray-300">{selectedRequest.admin_notes}</p>
                </div>
              )}
              
              {selectedRequest.status === 'accepted' && (
                <Alert className="bg-green-500/20 border-green-500">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertTitle>Project Accepted</AlertTitle>
                  <AlertDescription className="text-green-200">
                    Congratulations! You earned 50 points and the Explorer badge for this contribution.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                onClick={() => setSelectedRequest(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserProjectRequests;