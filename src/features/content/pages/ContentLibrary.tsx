/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Archive,
  CheckCircle2,
  Folder,
  Tag,
  Globe,
  User,
  History,
  Download,
  RefreshCw,
  AlertCircle,
  X,
  Loader2,
  FileCheck,
  Eye
} from 'lucide-react';
import { usePreview } from '../../../shared/contexts/PreviewContext';
import { usePermission } from '../../../shared/hooks/usePermission';

interface ContentTag {
  id: string;
  tag: string;
}

interface ContentCategory {
  id: string;
  name: string;
}

interface Content {
  id: string;
  providerType: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  category: ContentCategory | null;
  author: string | null;
  language: string | null;
  version: number;
  contentGroupId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  storagePathZip: string;
  storagePathExtracted: string;
  launchFile: string;
  thumbnailPath: string | null;
  tags: ContentTag[];
  createdAt: string;
  updatedAt: string;
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export const ContentLibrary: React.FC = () => {
  const { t } = useTranslation();

  const { enterPreview, previewRoleId } = usePreview();
  const canPreview = usePermission('preview', 'use');
  const [learnerRole, setLearnerRole] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (canPreview) {
      fetch('/api/preview/eligible-roles')
        .then((res) => (res.ok ? res.json() : []))
        .then((roles: Array<{ id: string; name: string }>) => {
          const found = roles.find((r) => r.name.toLowerCase() === 'learner');
          if (found) {
            setLearnerRole(found);
          }
        })
        .catch((err) => console.error('Error finding Learner role:', err));
    }
  }, [canPreview]);

  // State
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering / Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Version History Modal
  const [historyGroupId, setHistoryGroupId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyVersions, setHistoryVersions] = useState<Content[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Fetch all content packages
  const fetchContents = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Fetch list from endpoint
      const response = await fetch('/api/content');
      if (!response.ok) {
        throw new Error('Failed to retrieve content list');
      }
      const data = await response.json();
      setContents(data);
    } catch (err: any) {
      setError(err.message || 'Error loading content packages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  // Actions
  const handlePublish = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/content/${id}/publish`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to publish content');
      }
      const updated = await response.json();
      setSuccess(`"${updated.title}" published successfully!`);
      fetchContents();
    } catch (err: any) {
      setError(err.message || 'Error publishing content');
    }
  };

  const handleArchive = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/content/${id}/archive`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to archive content');
      }
      const updated = await response.json();
      setSuccess(`"${updated.title}" archived successfully!`);
      fetchContents();
    } catch (err: any) {
      setError(err.message || 'Error archiving content');
    }
  };

  const handleRestore = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/content/${id}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ targetStatus: 'DRAFT' })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to restore content');
      }
      const updated = await response.json();
      setSuccess(`"${updated.title}" restored to Draft status!`);
      fetchContents();
    } catch (err: any) {
      setError(err.message || 'Error restoring content');
    }
  };

  // View version history
  const handleViewHistory = async (contentGroupId: string, title: string) => {
    setHistoryGroupId(contentGroupId);
    setHistoryTitle(title);
    setIsHistoryLoading(true);
    setHistoryVersions([]);
    try {
      const response = await fetch(`/api/content/${contentGroupId}/versions`);
      if (!response.ok) {
        throw new Error('Failed to retrieve version history');
      }
      const data = await response.json();
      setHistoryVersions(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching versions');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Download original ZIP file
  const handleDownload = (id: string, title: string) => {
    window.location.href = `/api/content/${id}/download`;
  };

  // Derive unique categories and tags from current packages list for local filtering
  const uniqueCategories = Array.from(
    new Map(
      contents
        .filter((c) => c.category)
        .map((c) => [c.category!.id, c.category!])
    ).values()
  );

  const uniqueTags = Array.from(
    new Set(contents.flatMap((c) => c.tags.map((t) => t.tag)))
  );

  // Apply filter calculations locally
  const filteredContents = contents.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory ? item.categoryId === selectedCategory : true;
    const matchesTag = selectedTag ? item.tags.some((t) => t.tag === selectedTag) : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;

    return matchesSearch && matchesCategory && matchesTag && matchesStatus;
  });

  return (
    <div className="space-y-6" id="scorm-content-library-root">
      {/* Notifications */}
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2.5 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700 shadow-sm"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700 shadow-sm"
          >
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search content packages by title, description, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 shadow-xs focus:border-blue-500 focus:outline-none"
              id="library-search-input"
            />
          </div>

          <div className="flex items-center gap-2">
            {canPreview && learnerRole && previewRoleId !== learnerRole.id && (
              <button
                onClick={() => enterPreview(learnerRole.id, learnerRole.name)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-750 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center"
                id="preview-as-learner-btn"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{t('preview.learnerShortcut')}</span>
              </button>
            )}

            <button
              onClick={fetchContents}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
              title="Reload content"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reload</span>
            </button>
          </div>
        </div>

        {/* Filter Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Tag
            </label>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Library Grid list */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-400 font-bold">Loading content library...</p>
        </div>
      ) : filteredContents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400 shadow-xs">
          <Folder className="h-10 w-10 mx-auto text-slate-300 mb-2.5" />
          <p className="text-sm font-bold">No content items found matching the selected criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="library-contents-grid">
          {filteredContents.map((item) => (
            <motion.div
              layout
              key={item.id}
              className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Header metadata */}
              <div className="p-5 flex-1 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                      item.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : item.status === 'ARCHIVED'
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Version {item.version}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-base leading-snug font-sans truncate">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="text-xs text-slate-500 mt-1.5 font-medium line-clamp-2">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1.5 italic font-medium">
                      No description provided.
                    </p>
                  )}
                </div>

                {/* Tags and Category */}
                <div className="space-y-1.5 border-t border-slate-50 pt-3">
                  {item.category && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                      <Folder className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item.category.name}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {item.author && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">
                        <User className="h-2.5 w-2.5" />
                        {item.author}
                      </span>
                    )}
                    {item.language && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded-md font-bold">
                        <Globe className="h-2.5 w-2.5" />
                        {item.language}
                      </span>
                    )}
                  </div>

                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {item.tags.map((tg) => (
                        <span
                          key={tg.id}
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md"
                        >
                          <Tag className="h-2.5 w-2.5 text-blue-400" />
                          {tg.tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleViewHistory(item.contentGroupId, item.title)}
                    className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:border-blue-200 shadow-2xs transition-colors"
                    title="View Version History"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(item.id, item.title)}
                    className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:border-slate-300 shadow-2xs transition-colors"
                    title="Download Original ZIP"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  {item.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePublish(item.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Publish</span>
                    </button>
                  )}

                  {item.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => handleArchive(item.id)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 bg-white border border-slate-200 hover:border-rose-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archive</span>
                    </button>
                  )}

                  {item.status === 'ARCHIVED' && (
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {historyGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  <span>Version History</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium truncate">
                  {historyTitle}
                </p>
              </div>
              <button
                onClick={() => setHistoryGroupId(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <p className="text-xs text-slate-400 font-bold">Fetching versions...</p>
                </div>
              ) : historyVersions.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-xs font-bold">No versions found.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
                  {historyVersions.map((ver) => (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-sm">
                            Version {ver.version}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                              ver.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : ver.status === 'ARCHIVED'
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                          >
                            {ver.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold">
                          Uploaded: {new Date(ver.createdAt).toLocaleString()}
                        </p>
                        {ver.author && (
                          <p className="text-[10px] text-slate-500 font-semibold">
                            Author: {ver.author}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {/* Compare is deferred, but we provide ZIP download for older packages */}
                        <button
                          onClick={() => handleDownload(ver.id, ver.title)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download ZIP</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MVP Notice */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>
                  <strong>MVP Note:</strong> Interactive visual differential comparison between versions is deferred. Older ZIP download is provided to compare package source trees manually.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setHistoryGroupId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
