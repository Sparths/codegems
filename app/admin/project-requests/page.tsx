"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Github,
  ExternalLink,
  Calendar,
  User as UserIcon,
  FilterX,
  Search,
  Shield,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from '@/components/ui/input';

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
  user?: {
    username: string;
    display_name: string;
  };
}

// Function to verify admin access
const verifyAdminAccess = async (userId: string, token: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
};

// Sanitize input to prevent XSS
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>]/g, '').trim();
};

const AdminProjectRequestsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ProjectRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  
  // For pagination
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 10;

  // Admin verification effect
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isAuthenticated || !user) {
        router.push('/');
        return;
      }

      // Check if user has admin privileges
      try {
        const response = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id })
        });

        if (response.ok) {
          setIsAdminVerified(true);
          fetchRequests();
        } else {
          setError('Access denied. Admin privileges required.');
          setTimeout(() => router.push('/'), 3000);
        }
      } catch (error) {
        console.error('Admin verification failed:', error);
        setError('Failed to verify admin access.');
        setTimeout(() => router.push('/'), 3000);
      }
    };

    checkAdminAccess();
  }, [isAuthenticated, user, router]);
  
  const fetchRequests = async () => {
    if (!isAdminVerified) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let url = `/api/project-requests?admin=true`;
      if (filterStatus !== 'all') {
        url += `&status=${encodeURIComponent(filterStatus)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user?.token || ''}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      let data = await response.json();
      
      // Fetch user info for each request
      const userInfoPromises = data.map(async (request: ProjectRequest) => {
        try {
          const userResponse = await fetch(`/api/users?id=${encodeURIComponent(request.user_id)}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            return {
              ...request,
              user: {
                username: userData.username,
                display_name: userData.display_name,
              }
            };
          }
          return request;
        } catch (err) {
          console.error(`Error fetching user for request ${request.id}:`, err);
          return request;
        }
      });
      
      data = await Promise.all(userInfoPromises);
      setRequests(data);
    } catch (err) {
      console.error('Error fetching project requests:', err);
      setError('Failed to load project requests');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdateStatus = async (status: 'accepted' | 'declined') => {
    if (!selectedRequest || !user || !isAdminVerified) return;
    
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      // Sanitize admin notes
      const sanitizedNotes = sanitizeInput(adminNotes);
      
      const response = await fetch('/api/project-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token || ''}`,
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          status,
          adminNotes: sanitizedNotes,
          adminId: user.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update project request');
      }
      
      // Update the local state
      setRequests(prev => 
        prev.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status, admin_notes: sanitizedNotes, updated_at: new Date().toISOString() } 
            : req
        )
      );
      
      // Close the dialog
      setSelectedRequest(null);
      setAdminNotes('');
      
    } catch (err) {
      console.error('Error updating project request:', err);
      setUpdateError('Failed to update project request');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleViewRequest = (request: ProjectRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Filter requests by search query
  const filteredRequests = requests.filter(request => {
    if (!searchQuery) return true;
    
    const query = sanitizeInput(searchQuery.toLowerCase());
    return (
      request.title.toLowerCase().includes(query) ||
      request.github_link.toLowerCase().includes(query) ||
      request.description.toLowerCase().includes(query) ||
      request.user?.username.toLowerCase().includes(query) ||
      request.user?.display_name.toLowerCase().includes(query)
    );
  });
  
  // Calculate pagination
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  
  // Access control check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-8">
        <div className="max-w-md mx-auto text-center py-12">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
          <p className="text-gray-400 mb-6">
            You must be signed in to access this page.
          </p>
          <Button 
            onClick={() => router.push('/')}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdminVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-8">
        <div className="max-w-md mx-auto text-center py-12">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You don't have permission to view this page.
          </p>
          {error && (
            <Alert className="bg-red-500/20 border-red-500 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button 
            onClick={() => router.push('/')}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <Button
            onClick={fetchRequests}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        {error && (
          <Alert className="bg-red-500/20 border-red-500 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex flex-1 gap-4">
            <div className="w-48">
              <Select 
                value={filterStatus} 
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white hover:bg-slate-700">All Requests</SelectItem>
                  <SelectItem value="pending" className="text-white hover:bg-slate-700">Pending</SelectItem>
                  <SelectItem value="accepted" className="text-white hover:bg-slate-700">Accepted</SelectItem>
                  <SelectItem value="declined" className="text-white hover:bg-slate-700">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title, user, or GitHub link..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white pl-10"
                maxLength={100}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-6 w-6 p-0 text-gray-400"
                  onClick={() => setSearchQuery('')}
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm text-gray-400">
              {filteredRequests.length} request{filteredRequests.length !== 1 && 's'}
            </span>
            <div className="flex gap-2 ml-4">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {requests.filter(r => r.status === 'pending').length} Pending
              </Badge>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {requests.filter(r => r.status === 'accepted').length} Accepted
              </Badge>
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {requests.filter(r => r.status === 'declined').length} Declined
              </Badge>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="bg-slate-800 w-full grid grid-cols-1 mb-6">
            <TabsTrigger value="list" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Request List
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            {currentRequests.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700 text-white">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400">No project requests found matching your criteria.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {currentRequests.map((request) => (
                  <Card 
                    key={request.id}
                    className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => handleViewRequest(request)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white">{request.title}</CardTitle>
                          <CardDescription className="text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> 
                            {formatDate(request.created_at)}
                            {request.updated_at && (
                              <span className="ml-2 text-xs">(Updated: {formatDate(request.updated_at)})</span>
                            )}
                          </CardDescription>
                        </div>
                        {request.status === 'pending' ? (
                          <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/30">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending Review
                          </Badge>
                        ) : request.status === 'accepted' ? (
                          <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border-green-500/30">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Accepted
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30">
                            <XCircle className="mr-1 h-3 w-3" />
                            Declined
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">
                          {request.user ? request.user.display_name : "Unknown User"}
                          {request.user && <span className="text-gray-500 text-sm ml-1">(@{request.user.username})</span>}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4 text-gray-400" />
                        <a 
                          href={request.github_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {request.github_link.replace('https://github.com/', '')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      
                      <p className="text-gray-300 line-clamp-2">{request.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + Math.max(1, currentPage - 2);
                    if (page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={
                          page === currentPage
                            ? "bg-purple-500 hover:bg-purple-600 text-white"
                            : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                        }
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Request Details Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedRequest.title}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Submitted on {formatDate(selectedRequest.created_at)} by {selectedRequest.user?.display_name || 'Unknown User'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status:</span>
                {selectedRequest.status === 'pending' ? (
                  <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/30">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending Review
                  </Badge>
                ) : selectedRequest.status === 'accepted' ? (
                  <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border-green-500/30">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Accepted
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30">
                    <XCircle className="mr-1 h-3 w-3" />
                    Declined
                  </Badge>
                )}
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
              
              <div>
                <h3 className="text-white font-medium mb-1">Admin Notes</h3>
                <p className="text-gray-400 text-sm mb-2">
                  These notes will be visible to the user who submitted the request.
                </p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for the user (optional)"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 min-h-32"
                  maxLength={1000}
                />
              </div>
              
              {updateError && (
                <Alert className="bg-red-500/20 border-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">
                    {updateError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
              <div className="flex gap-2">
                <Button 
                  onClick={() => setSelectedRequest(null)}
                  variant="outline"
                  className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                >
                  Cancel
                </Button>
              </div>
              
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleUpdateStatus('declined')}
                    className="bg-red-500 hover:bg-red-600 text-white flex-1 sm:flex-none"
                    disabled={isUpdating}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                  <Button 
                    onClick={() => handleUpdateStatus('accepted')}
                    className="bg-green-500 hover:bg-green-600 text-white flex-1 sm:flex-none"
                    disabled={isUpdating}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                </div>
              )}
              
              {selectedRequest.status !== 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleUpdateStatus('pending' as any)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    disabled={isUpdating}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Revert to Pending
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminProjectRequestsPage;