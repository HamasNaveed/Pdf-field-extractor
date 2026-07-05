'use client';

import React, { useState } from 'react';
import FileUploader from './FileUploader';
import ControlPanel from './ControlPanel';
import ResponseViewer from './ResponseViewer';

export default function Dashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [response, setResponse] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Extract variables when available to pass template keys to the Control Panel
  const extractedFields = response && response.fields ? response.fields : [];

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setResponse(null); // Clear previous responses on new uploads
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col space-y-8 px-4 sm:px-6 py-10 flex-1">
      {/* Visual Header */}
      <div className="flex flex-col space-y-2">
        <div className="inline-flex items-center space-x-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3 py-1 rounded-full text-xs font-semibold w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span>Next.js Vercel API Instance</span>
        </div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
          PDF Field Extraction Control Panel
        </h1>
        <p className="text-sm text-white/50 max-w-xl leading-relaxed">
          Production-ready developer sandbox to extract variables, visual coordinates, and bounding boxes for n8n API workflows.
        </p>
      </div>

      {/* Main Dashboard Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Configuration & Action Panel */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              Document Upload
            </h2>
            <FileUploader onFileSelect={handleFileSelect} selectedFile={selectedFile} />
          </div>

          <ControlPanel
            selectedFile={selectedFile}
            onResponse={setResponse}
            onLoading={setLoading}
            extractedFields={extractedFields}
          />
        </div>

        {/* Action Results Viewport */}
        <div className="lg:col-span-8 h-[650px] lg:h-[750px]">
          <ResponseViewer jsonResponse={response} loading={loading} />
        </div>
      </div>
    </div>
  );
}
