"use client";

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface UpdaterStatus {
  queue: {
    isProcessing: boolean;
    lastRun: number;
    currentBatchSize: number;
  };
  rateLimit: {
    remaining: number;
    reset: number;
    lastChecked: number;
    resetTime: string | null;
  };
  statistics: {
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
    total: number;
  };
  projectsNeedingUpdate: number;
}

/**
 * Admin dashboard component for monitoring and controlling the project updater
 */
export default function AdminUpdaterDashboard() {
  const [status, setStatus] = useState<UpdaterStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  
  // Fetch status
  const fetchStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/projects/update');
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setError("Failed to fetch status. Server responded with an error.");
      }
    } catch (error) {
      setError("Failed to fetch status. Please check your network connection.");
      console.error("Error fetching status:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process updates manually
  const processUpdates = async (batchSize: number) => {
    try {
      setIsUpdating(true);
      setUpdateResult(null);
      
      const response = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ batchSize })
      });
      
      const result = await response.json();
      setUpdateResult(result);
      
      // Refresh status after update
      fetchStatus();
    } catch (error) {
      console.error("Error processing updates:", error);
      setError("Failed to process updates. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Format time function
  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert className="bg-red-500/20 border-red-500 mb-6">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button 
          onClick={fetchStatus} 
          variant="outline" 
          className="mt-2 bg-slate-800 hover:bg-slate-700 text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </Alert>
    );
  }
  
  if (!status) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No status data available</p>
        <Button 
          onClick={fetchStatus} 
          variant="outline" 
          className="mt-4 bg-slate-800 hover:bg-slate-700 text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rate Limit Card */}
        <Card className="bg-slate-800/50 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-blue-400" />
              GitHub API Rate Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Remaining Requests</p>
                <p className="text-2xl font-bold">
                  {status.rateLimit.remaining} / 60
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Resets At</p>
                <p>{status.rateLimit.resetTime ? new Date(status.rateLimit.resetTime).toLocaleString() : 'Unknown'}</p>
              </div>
              <div className="mt-2">
                <p className="text-gray-400 text-sm">Last Checked</p>
                <p>{formatTime(status.rateLimit.lastChecked)}</p>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full" 
                  style={{ width: `${(status.rateLimit.remaining / 60) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Update Queue Card */}
        <Card className="bg-slate-800/50 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="text-purple-400" />
              Update Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Status</p>
                <div className="flex items-center gap-1">
                  {status.queue.isProcessing ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400">Processing</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-yellow-400">Idle</span>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Last Run</p>
                <p>{status.queue.lastRun ? formatTime(status.queue.lastRun) : 'Never'}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Projects Needing Update</p>
                <p className="text-2xl font-bold">{status.projectsNeedingUpdate}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Current Batch Size</p>
                <p>{status.queue.currentBatchSize}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Statistics Card */}
        <Card className="bg-slate-800/50 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-400" />
              Update Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-green-400 font-medium">{status.statistics.completed}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-sm">In Progress</p>
                <p className="text-blue-400 font-medium">{status.statistics.in_progress}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-sm">Failed</p>
                <p className="text-red-400 font-medium">{status.statistics.failed}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-yellow-400 font-medium">{status.statistics.pending}</p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
                <p className="text-gray-400 text-sm">Total Projects</p>
                <p className="text-white font-medium">{status.statistics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Control Panel */}
      <Card className="bg-slate-800/50 border-slate-700 text-white">
        <CardHeader>
          <CardTitle>Control Panel</CardTitle>
          <CardDescription className="text-gray-400">
            Manually control the project update process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => processUpdates(1)}
              disabled={isUpdating || status.rateLimit.remaining < 2}
              className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Update Single Project
            </Button>
            
            <Button
              onClick={() => processUpdates(5)}
              disabled={isUpdating || status.rateLimit.remaining < 10}
              className="bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Update Batch (5)
            </Button>
            
            <Button
              onClick={fetchStatus}
              disabled={isUpdating}
              variant="outline"
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
        <CardFooter className="border-t border-slate-700 pt-4">
          {updateResult && (
            <Alert className={`w-full ${updateResult.success ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'}`}>
              {updateResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <AlertTitle>
                {updateResult.success ? 'Update Successful' : 'Update Failed'}
              </AlertTitle>
              <AlertDescription>
                {updateResult.message}
                {updateResult.processedCount !== undefined && (
                  <div className="mt-1">Processed {updateResult.processedCount} projects</div>
                )}
                {updateResult.rateLimitRemaining !== undefined && (
                  <div className="mt-1">Rate limit remaining: {updateResult.rateLimitRemaining}</div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}