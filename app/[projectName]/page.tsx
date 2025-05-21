"use client";

import React from "react";
import ProjectDetailPage from "@/components/ProjectDetailPage";

interface ProjectPageProps {
  params: {
    projectName: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  // Unwrap params with React.use()
  const unwrappedParams = React.use(params);
  
  // Decode URL parameter
  const decodedProjectName = decodeURIComponent(unwrappedParams.projectName);

  return <ProjectDetailPage projectName={decodedProjectName} />;
}