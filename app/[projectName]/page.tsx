"use client";

import React from "react";
import ProjectDetailPage from "@/components/ProjectDetailPage";

interface ProjectPageProps {
  params: Promise<{
    projectName: string;
  }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  // Use React.use() for the Promise
  const resolvedParams = React.use(params);
  
  // Decode URL parameter
  const decodedProjectName = decodeURIComponent(resolvedParams.projectName);

  return <ProjectDetailPage projectName={decodedProjectName} />;
}