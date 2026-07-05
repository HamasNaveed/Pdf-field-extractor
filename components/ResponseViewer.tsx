'use client';

import React, { useState, useMemo } from 'react';
import { PDFFieldData } from '../types';

interface ResponseViewerProps {
  jsonResponse: any | null;
  loading: boolean;
}

export default function ResponseViewer({ jsonResponse, loading }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<'table' | 'json'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [copied, setCopied] = useState(false);

  // Extract fields if available in response
  const fields: PDFFieldData[] = useMemo(() => {
    if (!jsonResponse || !jsonResponse.fields) return [];
    return jsonResponse.fields;
  }, [jsonResponse]);

  // Unique list of types present for filtering
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    fields.forEach(f => types.add(f.type));
    return Array.from(types);
  }, [fields]);

  // Filtered fields
  const filteredFields = useMemo(() => {
    return fields.filter(field => {
      const nameMatch = field.internalName.toLowerCase().includes(searchTerm.toLowerCase());
      const labelMatch = field.label?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      const matchesSearch = nameMatch || labelMatch;
      const matchesType = typeFilter === '' || field.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [fields, searchTerm, typeFilter]);

  const copyToClipboard = () => {
    if (!jsonResponse) return;
    navigator.clipboard.writeText(JSON.stringify(jsonResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    if (!jsonResponse) return;
    const blob = new Blob([JSON.stringify(jsonResponse, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = jsonResponse.fileName
      ? `${jsonResponse.fileName.replace(/\.pdf$/i, '')}_extract.json`
      : 'pdf_fields_extract.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel rounded-2xl w-full h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-4 bg-white/5">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'table'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Form Fields Table
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'json'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            JSON Response
          </button>
        </div>

        {jsonResponse && (
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 text-xs font-medium flex items-center space-x-1 transition-all"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={downloadJson}
              className="p-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 hover:text-violet-300 border border-violet-500/20 text-xs font-medium flex items-center space-x-1 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Download JSON</span>
            </button>
          </div>
        )}
      </div>

      {/* Main body viewport */}
      <div className="flex-1 overflow-auto p-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-white/70">Processing PDF document...</p>
            </div>
          </div>
        )}

        {!jsonResponse && !loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center py-20 text-white/30 space-y-3">
            <svg className="w-12 h-12 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-semibold">Ready to display results</p>
            <p className="text-xs max-w-xs leading-relaxed">
              Upload a PDF form and run actions to see parsed variables, coordinates, validation reports, or fill forms.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'table' && (
              <div className="flex flex-col h-full space-y-4">
                {/* Search & Filters */}
                {fields.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/40">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Search fields by internal name or label..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none text-white placeholder-white/30 transition-colors"
                      />
                    </div>
                    <select
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}
                      className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none text-white/80 transition-colors"
                    >
                      <option value="" className="bg-slate-900 text-white">All Field Types</option>
                      {availableTypes.map(t => (
                        <option key={t} value={t} className="bg-slate-900 text-white capitalize">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Table View */}
                {filteredFields.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-white/50 text-xs font-semibold uppercase border-b border-white/5">
                          <th className="px-4 py-3">Internal Name</th>
                          <th className="px-4 py-3">Label</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3 text-center">Page</th>
                          <th className="px-4 py-3 text-center">Required</th>
                          <th className="px-4 py-3">Value</th>
                          <th className="px-4 py-3">BBox (X, Y, W, H)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {filteredFields.map((field, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-violet-300 font-medium">
                              {field.internalName}
                            </td>
                            <td className="px-4 py-3 text-white/80">
                              {field.label ? (
                                <span className="bg-violet-950/30 text-violet-400 px-2 py-1 rounded-md text-xs font-medium border border-violet-500/10">
                                  {field.label}
                                </span>
                              ) : (
                                <span className="text-white/30 italic text-xs">null</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-white/5 px-2 py-0.5 rounded-full text-xs text-white/70 capitalize">
                                {field.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-white/60 font-semibold">{field.page}</td>
                            <td className="px-4 py-3 text-center">
                              {field.required ? (
                                <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-white/30 text-[10px] font-semibold uppercase px-2 py-0.5">
                                  No
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-[200px] truncate text-white/70 font-mono text-xs">
                              {field.currentValue !== '' ? (
                                <span className="text-emerald-400">{field.currentValue}</span>
                              ) : field.defaultValue !== '' ? (
                                <span className="text-white/40 italic">{field.defaultValue} (default)</span>
                              ) : (
                                <span className="text-white/20 italic">empty</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-white/50 font-mono text-xs whitespace-nowrap">
                              {field.rect ? (
                                <span>
                                  {field.rect.x}, {field.rect.y}, {field.rect.width}, {field.rect.height}
                                </span>
                              ) : (
                                <span>{field.x}, {field.y}, {field.width}, {field.height}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : fields.length > 0 ? (
                  <div className="text-center py-10 text-white/40 text-sm">
                    No fields match your filter settings.
                  </div>
                ) : (
                  <div className="text-white/80 p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="font-semibold mb-2">Summary Info</h3>
                    <pre className="font-mono text-xs overflow-auto text-violet-400">
                      {JSON.stringify(jsonResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'json' && (
              <div className="relative">
                <pre className="font-mono text-xs text-white/80 bg-black/30 p-4 rounded-xl border border-white/5 overflow-x-auto select-text leading-relaxed">
                  {JSON.stringify(jsonResponse, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
