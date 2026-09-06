import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle,
  Search,
  Loader2,
  RefreshCw,
  X,
  Type,
  Trash2,
  Shield,
} from 'lucide-react';
import { FontLibraryItem, AffectedThemeInfo } from '../types';
import { usePermission } from '../../../shared/hooks/usePermission';
import { FontReplacementModal } from './FontReplacementModal';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

export const FontLibrary: React.FC = () => {
  const canEdit = usePermission('theme', 'edit');

  const [fonts, setFonts] = useState<FontLibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    imported: Array<{ name: string; format: string }>;
    failed: Array<{ filename: string; reason: string }>;
  } | null>(null);

  // Deletion and replacement states
  const [deletingFontId, setDeletingFontId] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [replacementModalOpen, setReplacementModalOpen] = useState<boolean>(false);
  const [fontToDelete, setFontToDelete] = useState<FontLibraryItem | null>(null);
  const [affectedThemes, setAffectedThemes] = useState<AffectedThemeInfo[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFonts = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch('/api/fonts', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to load fonts (${res.status})`);
      }
      const data: FontLibraryItem[] = await res.json();
      setFonts(data);
    } catch (err: any) {
      console.error('[FontLibrary] Error fetching fonts:', err);
      setLoadError(err?.message || 'Failed to load font library.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  const handleDeleteFont = async (font: FontLibraryItem) => {
    if (font.isSystem) {
      setDeleteFeedback({
        type: 'error',
        message: 'System fonts (Inter) cannot be deleted under any circumstance.',
      });
      return;
    }

    try {
      setDeletingFontId(font.id);
      setDeleteFeedback(null);

      const res = await fetch(`/api/fonts/${font.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      const data = await res.json();

      if (res.status === 200) {
        setDeleteFeedback({
          type: 'success',
          message: `Font "${font.name || font.familyName}" deleted successfully.`,
        });
        await fetchFonts();
      } else if (res.status === 409) {
        // Font in use: trigger replacement modal with affected themes list
        setFontToDelete(font);
        setAffectedThemes(data.affectedThemes || []);
        setReplacementModalOpen(true);
      } else if (res.status === 403) {
        setDeleteFeedback({
          type: 'error',
          message: data.error || 'System fonts cannot be deleted.',
        });
      } else {
        setDeleteFeedback({
          type: 'error',
          message: data.error || 'Failed to delete font.',
        });
      }
    } catch (err: any) {
      console.error('[FontLibrary] Error deleting font:', err);
      setDeleteFeedback({
        type: 'error',
        message: err?.message || 'An error occurred while deleting the font.',
      });
    } finally {
      setDeletingFontId(null);
    }
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!canEdit) return;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadFeedback(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('fonts', file);
      });

      const csrfToken = getCsrfToken();
      const res = await fetch('/api/fonts', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed (${res.status})`);
      }

      const result = await res.json();
      setUploadFeedback(result);

      // Refresh font list if any fonts were imported
      if (result.imported && result.imported.length > 0) {
        await fetchFonts();
      }
    } catch (err: any) {
      console.error('[FontLibrary] Upload error:', err);
      setUploadFeedback({
        imported: [],
        failed: [{ filename: 'Batch Upload', reason: err.message || 'Network error during upload' }],
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(e.target.files);
    }
  };

  const filteredFonts = fonts.filter((f) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.familyName && f.familyName.toLowerCase().includes(q)) ||
      (f.format && f.format.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6" id="font-library-root">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-card-border">
        <div>
          <h2 className="text-xl font-bold text-text-heading font-sans" id="font-library-heading">
            Font Library
          </h2>
          <p className="text-sm text-text-muted mt-0.5 font-sans">
            Upload custom web fonts (TTF, OTF, WOFF, WOFF2) to apply across your organization's themes.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchFonts}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-card-border bg-card-bg text-text-body text-xs font-semibold hover:bg-card-header-bg transition-colors self-start sm:self-auto"
          title="Refresh fonts"
          id="refresh-fonts-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Upload Dropzone (Editable only) */}
      {canEdit ? (
        <div className="space-y-3" id="font-upload-container">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
              isDragging
                ? 'border-link-primary bg-link-primary/5 scale-[1.005]'
                : 'border-card-border hover:border-link-primary/60 bg-card-bg hover:bg-card-header-bg/40'
            }`}
            id="font-dropzone"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
              onChange={handleFileInputChange}
              className="hidden"
              id="font-file-input"
            />

            {uploading ? (
              <div className="flex flex-col items-center text-center space-y-2 py-4">
                <Loader2 className="h-10 w-10 text-link-primary animate-spin" />
                <p className="text-sm font-semibold text-text-heading font-sans">
                  Validating & Uploading Fonts...
                </p>
                <p className="text-xs text-text-muted font-sans">
                  Parsing font metadata and verifying web font compatibility.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-link-primary/10 text-link-primary mb-1">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-heading font-sans">
                    <span className="text-link-primary hover:underline">Click to upload</span> or drag and drop font files here
                  </p>
                  <p className="text-xs text-text-muted mt-1 font-sans">
                    Supported formats: <span className="font-semibold text-text-body">TTF, OTF, WOFF, WOFF2</span> (multiple files allowed, up to 25MB each)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Feedback (Success / Failures) */}
          {uploadFeedback && (
            <div className="space-y-2" id="font-upload-feedback">
              {uploadFeedback.imported.length > 0 && (
                <div className="flex items-start space-x-3 p-4 rounded-xl bg-status-success-bg border border-status-success-text/20 text-status-success-text">
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs font-sans">
                    <p className="font-bold text-sm">
                      Successfully imported {uploadFeedback.imported.length} font{uploadFeedback.imported.length > 1 ? 's' : ''}:
                    </p>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      {uploadFeedback.imported.map((item, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{item.name}</span> ({item.format})
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFeedback((prev) => prev ? { ...prev, imported: [] } : null)}
                    className="text-status-success-text/70 hover:text-status-success-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {uploadFeedback.failed.length > 0 && (
                <div className="flex items-start space-x-3 p-4 rounded-xl bg-status-error-bg border border-status-error-text/20 text-status-error-text">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs font-sans">
                    <p className="font-bold text-sm">
                      {uploadFeedback.failed.length} font{uploadFeedback.failed.length > 1 ? 's' : ''} could not be imported:
                    </p>
                    <ul className="mt-1 space-y-1">
                      {uploadFeedback.failed.map((item, idx) => (
                        <li key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                          <span className="font-semibold">{item.filename}:</span>
                          <span className="text-status-error-text/90">{item.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFeedback((prev) => prev ? { ...prev, failed: [] } : null)}
                    className="text-status-error-text/70 hover:text-status-error-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-card-border bg-card-bg text-xs text-text-muted font-sans">
          You have view-only access to the Font Library. Contact an administrator to upload custom fonts.
        </div>
      )}

      {/* Font Listing Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-bold text-text-heading font-sans">
            Installed Fonts ({fonts.length})
          </h3>
        </div>

        {fonts.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search fonts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-input-border bg-card-bg text-text-body placeholder:text-text-muted focus:outline-none focus:border-input-border-focus transition-colors"
              id="search-fonts-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-text-muted hover:text-text-heading"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Deletion feedback */}
      {deleteFeedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-sans ${
            deleteFeedback.type === 'success'
              ? 'bg-status-success-bg border-status-success-text/20 text-status-success-text'
              : 'bg-status-error-bg border-status-error-text/20 text-status-error-text'
          }`}
          id="font-delete-feedback"
        >
          <div className="flex items-center space-x-2.5">
            {deleteFeedback.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{deleteFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteFeedback(null)}
            className="text-current/70 hover:text-current ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Font List Display */}
      {loadError ? (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text" id="font-list-error">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-sans">{loadError}</p>
        </div>
      ) : loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-8" id="font-list-loading">
          <Loader2 className="h-7 w-7 animate-spin text-link-primary mb-2" />
          <p className="text-xs text-text-muted font-sans">Loading font library...</p>
        </div>
      ) : fonts.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-card-border rounded-2xl bg-card-bg p-10 text-center" id="font-list-empty">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card-header-bg text-text-muted mb-3">
            <Type className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-text-heading font-sans">No Custom Fonts Uploaded</h4>
          <p className="text-xs text-text-muted mt-1 max-w-sm font-sans">
            Your font library is currently empty. Upload TrueType or Web Open Font Format files to use custom typography in your themes.
          </p>
        </div>
      ) : filteredFonts.length === 0 ? (
        <div className="p-8 text-center border border-card-border rounded-xl bg-card-bg text-xs text-text-muted font-sans">
          No fonts found matching "{searchQuery}".
        </div>
      ) : (
        /* Strict Section 10 Table: Name + Format only, with Action column */
        <div className="rounded-2xl border border-card-border bg-card-bg overflow-hidden shadow-2xs" id="font-library-table-container">
          <table className="w-full text-left border-collapse text-xs font-sans" id="font-library-table">
            <thead>
              <tr className="border-b border-card-border bg-card-header-bg text-text-muted uppercase tracking-wider font-semibold">
                <th className="py-3 px-6">Font Name</th>
                <th className="py-3 px-6 text-center w-28">Format</th>
                {canEdit && <th className="py-3 px-6 text-right w-24">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border/60">
              {filteredFonts.map((font) => (
                <tr
                  key={font.id}
                  className="hover:bg-card-header-bg/40 transition-colors"
                  id={`font-row-${font.id}`}
                >
                  {/* Name only */}
                  <td className="py-3.5 px-6 font-semibold text-text-heading text-sm">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-text-muted shrink-0" />
                      <span>{font.name || font.familyName}</span>
                      {font.isSystem && (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-status-info-bg text-status-info-text border border-status-info-text/20">
                          <Shield className="h-3 w-3" />
                          <span>System</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Format only */}
                  <td className="py-3.5 px-6 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-card-header-bg border border-card-border text-text-body">
                      {font.format || 'TTF'}
                    </span>
                  </td>

                  {/* Actions column */}
                  {canEdit && (
                    <td className="py-3.5 px-6 text-right">
                      {font.isSystem ? (
                        <span
                          className="inline-flex items-center text-text-muted/60 text-xs cursor-not-allowed"
                          title="System fonts cannot be deleted"
                        >
                          Protected
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteFont(font)}
                          disabled={deletingFontId === font.id}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-text-muted hover:text-status-error-text hover:bg-status-error-bg/60 transition-colors disabled:opacity-50"
                          title={`Delete ${font.name || font.familyName}`}
                          id={`delete-font-${font.id}-btn`}
                          aria-label={`Delete ${font.name || font.familyName}`}
                        >
                          {deletingFontId === font.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-status-error-text" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Font Replacement Modal (shown when DELETE returns 409) */}
      <FontReplacementModal
        isOpen={replacementModalOpen}
        onClose={() => {
          setReplacementModalOpen(false);
          setFontToDelete(null);
          setAffectedThemes([]);
        }}
        fontToDelete={fontToDelete}
        affectedThemes={affectedThemes}
        availableFonts={fonts}
        onSuccess={() => {
          fetchFonts();
          setDeleteFeedback({
            type: 'success',
            message: `Font "${fontToDelete?.name || fontToDelete?.familyName}" replaced and deleted successfully across all affected themes.`,
          });
        }}
      />
    </div>
  );
};
