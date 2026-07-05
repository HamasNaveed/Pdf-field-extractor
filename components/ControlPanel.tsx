'use client';

import React, { useState, useEffect } from 'react';

interface ControlPanelProps {
  selectedFile: File | null;
  onResponse: (response: any) => void;
  onLoading: (loading: boolean) => void;
  extractedFields: Array<{ internalName: string; type: string }>;
}

export default function ControlPanel({
  selectedFile,
  onResponse,
  onLoading,
  extractedFields,
}: ControlPanelProps) {
  const [activeAction, setActiveAction] = useState<string>('info');
  const [fillJson, setFillJson] = useState<string>('{\n  "FieldName": "Value"\n}');

  // Autopopulate JSON fill template when fields are extracted!
  useEffect(() => {
    if (extractedFields && extractedFields.length > 0) {
      const templateObj: Record<string, any> = {};
      extractedFields.forEach(f => {
        if (f.type === 'checkbox') {
          templateObj[f.internalName] = false;
        } else {
          templateObj[f.internalName] = '';
        }
      });
      setFillJson(JSON.stringify(templateObj, null, 2));
    }
  }, [extractedFields]);

  const handleAction = async (action: string) => {
    if (!selectedFile) {
      alert('Please upload a PDF file first.');
      return;
    }

    onLoading(true);
    setActiveAction(action);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      if (action === 'fill') {
        // Enforce valid JSON structure
        let parsedJson = {};
        try {
          parsedJson = JSON.parse(fillJson);
        } catch {
          alert('Invalid JSON in Fill Data. Please verify structure.');
          onLoading(false);
          return;
        }
        formData.append('data', JSON.stringify(parsedJson));
      }

      const response = await fetch(`/api/${action}`, {
        method: 'POST',
        body: formData,
      });

      // Handle PDF binary downloads
      if (action === 'fill' || action === 'flatten') {
        if (response.ok && response.headers.get('content-type') === 'application/pdf') {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          const suffix = action === 'fill' ? 'filled' : 'flattened';
          const baseName = selectedFile.name.replace(/\.pdf$/i, '');
          a.download = `${baseName}_${suffix}.pdf`;
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          onResponse({
            success: true,
            message: `PDF successfully ${suffix} and downloaded.`,
            action,
            file: `${baseName}_${suffix}.pdf`,
          });
        } else {
          const errData = await response.json();
          onResponse(errData);
        }
      } else {
        // Standard JSON API responses
        const data = await response.json();
        onResponse(data);
      }
    } catch (error: any) {
      console.error(`Error running ${action}:`, error);
      onResponse({
        success: false,
        error: error?.message || 'Server request failed. Please check backend status.',
      });
    } finally {
      onLoading(false);
    }
  };

  const actionItems = [
    {
      id: 'info',
      title: '1. Inspect PDF Info',
      desc: 'Check encryption, AcroForm fields count, and detect XFA support.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'extract',
      title: '2. Extract Fields & Labels',
      desc: 'Retrieve names, types, bounding boxes, values, and detect nearby visual labels.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      ),
    },
    {
      id: 'validate',
      title: '3. Validate Form Rules',
      desc: 'Verify required fields, empty checkboxes, missing signatures, and date formats.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'fill',
      title: '4. Populate Form Fields',
      desc: 'Inject field values programmatically and export a filled PDF.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
    },
    {
      id: 'flatten',
      title: '5. Flatten Form Canvas',
      desc: 'Burn AcroForm annotations into visual layout and disable field editing.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
          PDF Actions Menu
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {actionItems.map(item => (
            <button
              key={item.id}
              disabled={!selectedFile}
              onClick={() => handleAction(item.id)}
              className={`w-full text-left p-4 rounded-xl flex items-start space-x-3 transition-all border ${
                !selectedFile
                  ? 'opacity-40 cursor-not-allowed border-transparent bg-white/2'
                  : activeAction === item.id
                  ? 'bg-violet-600/10 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                  : 'bg-white/3 border-white/5 text-white/80 hover:bg-white/5 hover:border-white/10 hover:text-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  activeAction === item.id ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/60'
                }`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.title}</p>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* JSON Edit area for fill command */}
      {selectedFile && activeAction === 'fill' && (
        <div className="space-y-2 animate-pulse-slow">
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center justify-between">
            <span>Fill Data Payload (JSON)</span>
            {extractedFields.length > 0 && (
              <span className="text-[10px] text-emerald-400 capitalize">
                Auto-imported {extractedFields.length} variables
              </span>
            )}
          </label>
          <textarea
            value={fillJson}
            onChange={e => setFillJson(e.target.value)}
            rows={8}
            className="w-full font-mono text-xs p-3 bg-black/40 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none text-violet-300 leading-normal"
          />
          <button
            onClick={() => handleAction('fill')}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Trigger Fill & Download PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
