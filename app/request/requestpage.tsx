// app/request/requestpage.tsx
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Heart, Share2, Star, Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import AuthenticationDialog from '@/components/AuthenticationDialog';

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

const RequestPage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [projectRequest, setProjectRequest] = useState({
    title: '',
    githubLink: '',
    description: '',
    reason: ''
  });

  const [submissionStatus, setSubmissionStatus] = useState({
    status: '',
    message: ''
  });

  const [showDiscordDialog, setShowDiscordDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const handleProjectRequest = async () => {
    if (!isAuthenticated || !user) {
      setShowAuthDialog(true);
      return;
    }

    if (!projectRequest.title.trim() ||
      !projectRequest.githubLink.trim() ||
      !projectRequest.description.trim() ||
      !projectRequest.reason.trim()) {
      setSubmissionStatus({
        status: 'error',
        message: 'Please fill in all fields before submitting'
      });
      return;
    }

    setShowDiscordDialog(true);
  };

  const handleFinalSubmit = async () => {
    if (!isAuthenticated || !user) {
      setShowAuthDialog(true);
      return;
    }

    try {
      setSubmissionStatus({ status: 'loading', message: 'Submitting your request...' });

      const response = await fetch('/api/project-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectRequest,
          // Make sure user ID is properly formatted if needed
          userId: user.id.toString() // Convert to string if it's a UUID
        }),
      });

      if (!response.ok) throw new Error('Failed to submit request');

      const data = await response.json();

      setSubmissionStatus({
        status: 'success',
        message: 'Thank you for your submission! Your project request has been received and will be reviewed by our team. You can check the status in your profile.'
      });

      setProjectRequest({
        title: '',
        githubLink: '',
        description: '',
        reason: ''
      });

      // Redirect to the profile page after a short delay
      setTimeout(() => {
        router.push('/profile?tab=my-requests');
      }, 3000);

    } catch (error) {
      setSubmissionStatus({
        status: 'error',
        message: 'Failed to submit project request. Please try again.'
      });
      console.error('Error submitting project request:', error);
    }
  };

  const handleDiscordJoin = () => {
    window.open('https://discord.gg/QtnFGDQj5S', '_blank');
    handleFinalSubmit();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 mt-10">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Submit a Project</h1>
            <p className="text-gray-400 mb-6">You need to be signed in to submit projects.</p>

            <Button
              onClick={() => setShowAuthDialog(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Sign In
            </Button>

            <AuthenticationDialog
              isOpen={showAuthDialog}
              onOpenChange={setShowAuthDialog}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 mt-10">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-8">
            Submit a Project Request
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Community Guidelines Card */}
            <Card className="h-full bg-slate-800/50 border-slate-700 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Heart className="text-purple-500" />
                  Community Guidelines
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Help us maintain a high-quality collection of projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="text-green-500 mt-1 shrink-0" />
                    <p>Share projects that have made a significant impact on your development workflow</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="text-green-500 mt-1 shrink-0" />
                    <p>Include detailed descriptions to help others understand the project's value</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="text-green-500 mt-1 shrink-0" />
                    <p>Ensure the project is actively maintained and well-documented</p>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-lg font-semibold mb-3">What makes a good submission?</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <Check className="text-green-500 mt-1 shrink-0" />
                      <p>Clear description of the project's purpose and benefits</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-green-500 mt-1 shrink-0" />
                      <p>Regular updates and active maintenance</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-green-500 mt-1 shrink-0" />
                      <p>Good documentation and examples</p>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="text-green-500 mt-1 shrink-0" />
                      <p>Responsive maintainers and community</p>
                    </li>
                  </ul>
                </div>

                <div className="bg-purple-500/20 p-4 rounded-lg border border-purple-500/30">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Star className="text-yellow-400" />
                    Earn Rewards!
                  </h3>
                  <p className="text-gray-300">When your project suggestion is accepted, you'll earn:</p>
                  <ul className="mt-2 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="text-green-500 h-4 w-4" />
                      <span>50 points to level up</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="text-green-500 h-4 w-4" />
                      <span>The "Explorer" badge</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="text-green-500 h-4 w-4" />
                      <span>Recognition in our community</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Request Form Card */}
            <Card className="h-full bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-xl text-center">Project Details</CardTitle>
                <CardDescription className="text-gray-300 text-center">
                  Share an amazing project with the community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <Input
                    placeholder="Project Title"
                    value={projectRequest.title}
                    onChange={(e) => setProjectRequest(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
                  />

                  <div className="flex items-center gap-2">
                    <Github className="text-white shrink-0" />
                    <Input
                      placeholder="GitHub Link"
                      value={projectRequest.githubLink}
                      onChange={(e) => setProjectRequest(prev => ({ ...prev, githubLink: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400"
                    />
                  </div>

                  <Textarea
                    placeholder="What is this project about?"
                    value={projectRequest.description}
                    onChange={(e) => setProjectRequest(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400 min-h-24"
                  />

                  <Textarea
                    placeholder="Why do you think this is a good project?"
                    value={projectRequest.reason}
                    onChange={(e) => setProjectRequest(prev => ({ ...prev, reason: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-400 min-h-24"
                  />
                </div>

                {submissionStatus.status && (
                  <Alert className={`${submissionStatus.status === 'success' ? 'bg-green-500/20 border-green-500' :
                      submissionStatus.status === 'error' ? 'bg-red-500/20 border-red-500' :
                        'bg-blue-500/20 border-blue-500'
                    } text-white border`}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                      {submissionStatus.status === 'success' ? 'Success!' :
                        submissionStatus.status === 'error' ? 'Error' :
                          'Submitting...'}
                    </AlertTitle>
                    <AlertDescription>
                      {submissionStatus.message}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleProjectRequest}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center gap-2 mt-4"
                  disabled={submissionStatus.status === 'loading' || submissionStatus.status === 'success'}
                >
                  <Share2 className="w-4 h-4" />
                  Submit Project
                </Button>

                <div className="flex items-center justify-center gap-4 mt-4">
                  <Badge variant="secondary" className="bg-slate-700 text-gray-300">
                    <Star className="w-4 h-4 mr-1" /> Community Driven
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-700 text-gray-300">
                    <Heart className="w-4 h-4 mr-1" /> Open Source
                  </Badge>
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
                Don't miss updates about your submission! Join our vibrant Discord community to:
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
            <AlertDialogCancel onClick={handleFinalSubmit} className="bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
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

      <AuthenticationDialog
        isOpen={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </div>
  );
};

export default RequestPage;