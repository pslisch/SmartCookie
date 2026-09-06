import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ArrowRight,
  FileText
} from 'lucide-react';

interface RowResult {
  row: number;
  email: string;
  valid: boolean;
  errors: string[];
}

interface BulkImportWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportWizard: React.FC<BulkImportWizardProps> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Steps: 'upload' | 'validate' | 'success'
  const [step, setStep] = useState<'upload' | 'validate' | 'success'>('upload');
  const [validationResults, setValidationResults] = useState<RowResult[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract CSRF token from cookies
  const getCsrfToken = () => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/users/bulk-import/template');
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user_bulk_import_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error downloading template');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        handleValidate(droppedFile);
      } else {
        setError('Only .csv files are supported.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      handleValidate(selectedFile);
    }
  };

  const handleValidate = async (targetFile: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', targetFile);

      const res = await fetch('/api/users/bulk-import/validate', {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to validate CSV file.');
      }

      const data = await res.json();
      setValidationResults(data.results || []);
      setStep('validate');
    } catch (err: any) {
      setError(err.message || 'Error parsing or validating CSV file.');
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/users/bulk-import/confirm', {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: formData
      });

      if (res.status === 422) {
        const data = await res.json();
        setValidationResults(data.results || []);
        throw new Error(data.error || 'Validation failed on confirm step.');
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete import.');
      }

      const data = await res.json();
      setImportedCount(data.count || validationResults.filter(r => r.valid).length);
      setStep('success');
    } catch (err: any) {
      setError(err.message || t('organization.bulkImport.importError'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResults([]);
    setError(null);
    setStep('upload');
  };

  const hasAnyErrors = validationResults.some((r) => !r.valid);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg-overlay backdrop-blur-sm flex items-center justify-center p-4" id="bulk-import-modal">
      <div className="bg-card-bg rounded-2xl border border-card-border shadow-xl max-w-3xl w-full flex flex-col max-h-[85vh]" id="bulk-import-card">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-card-border shrink-0">
          <div>
            <h3 className="text-lg font-extrabold text-text-heading" id="bulk-import-title">
              {t('organization.bulkImport.title')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {t('organization.bulkImport.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:text-text-body hover:bg-card-header-bg transition-colors"
            aria-label="Close"
            id="bulk-import-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0" id="bulk-import-content">
          {error && (
            <div className="mb-6 flex items-start space-x-3 rounded-xl bg-status-error-bg border border-status-error-text/20 p-4 text-sm text-status-error-text" id="bulk-import-error">
              <AlertCircle className="h-5 w-5 text-status-error-text shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Error</span>
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6" id="bulk-import-step-upload">
              {/* Template Download Block */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-card-border bg-card-header-bg">
                <div className="flex items-start space-x-3.5">
                  <div className="rounded-xl bg-status-info-bg p-2 text-link-primary mt-0.5">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-heading">
                      {t('organization.bulkImport.downloadTemplate')}
                    </h4>
                    <p className="text-xs text-text-muted max-w-md mt-0.5">
                      Get the pre-formatted CSV template. It automatically includes columns for system requirements and any custom organization profile fields.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center justify-center space-x-2 rounded-xl bg-btn-primary-bg px-4 py-2 text-xs font-semibold text-btn-primary-text hover:bg-btn-primary-hover transition-colors shadow-sm shrink-0"
                  id="btn-download-template"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-input-border-focus bg-status-info-bg/50'
                    : 'border-card-border hover:border-input-border hover:bg-card-header-bg'
                }`}
                id="bulk-import-dropzone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />

                {loading ? (
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="h-10 w-10 text-link-primary animate-spin" />
                    <p className="text-sm font-bold text-text-body">
                      {t('organization.bulkImport.validating')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="mx-auto rounded-full bg-card-header-bg p-4 w-16 h-16 flex items-center justify-center text-text-muted">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-text-heading">
                        {t('organization.bulkImport.dropzoneText')}
                      </p>
                      <p className="text-xs text-text-muted">
                        {t('organization.bulkImport.dropzoneSubtext')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'validate' && (
            <div className="space-y-6" id="bulk-import-step-validate">
              {/* Warnings & Block messages */}
              {hasAnyErrors ? (
                <div className="p-4 rounded-xl border border-status-error-text/20 bg-status-error-bg flex items-start space-x-3" id="validate-error-banner">
                  <XCircle className="h-5 w-5 text-status-error-text shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-status-error-text">
                      {t('organization.bulkImport.warningAllOrNothing')}
                    </h4>
                    <p className="text-xs text-status-error-text leading-relaxed">
                      {t('organization.bulkImport.fixAllErrors')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-status-success-text/20 bg-status-success-bg flex items-start space-x-3" id="validate-success-banner">
                  <CheckCircle2 className="h-5 w-5 text-status-success-text shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-status-success-text">
                      {t('organization.bulkImport.allValid')}
                    </h4>
                    <p className="text-xs text-status-success-text leading-relaxed">
                      {t('organization.bulkImport.allValidDesc')}
                    </p>
                  </div>
                </div>
              )}

              {/* Rows List */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-text-muted uppercase tracking-wider">
                  {t('organization.bulkImport.validatingTitle')}
                </h4>
                <div className="border border-card-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto" id="validation-table">
                  <table className="min-w-full divide-y divide-card-border text-left text-xs">
                    <thead className="bg-card-header-bg text-text-muted font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-center">{t('organization.bulkImport.rowCol')}</th>
                        <th className="px-4 py-3">{t('organization.bulkImport.emailCol')}</th>
                        <th className="px-4 py-3 text-center">{t('organization.bulkImport.statusCol')}</th>
                        <th className="px-4 py-3">{t('organization.bulkImport.errorsCol')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border bg-card-bg">
                      {validationResults.map((res, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-card-header-bg ${!res.valid ? 'bg-status-error-bg/10' : ''}`}
                        >
                          <td className="px-4 py-3.5 text-center font-mono font-medium text-text-muted">{res.row}</td>
                          <td className="px-4 py-3.5 font-semibold text-text-heading">{res.email || '-'}</td>
                          <td className="px-4 py-3.5 text-center">
                            {res.valid ? (
                              <span className="inline-flex items-center rounded-full bg-status-success-bg border border-status-success-text/20 px-2 py-0.5 text-2xs font-semibold text-status-success-text">
                                {t('organization.bulkImport.validBadge')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-status-error-bg border border-status-error-text/20 px-2 py-0.5 text-2xs font-semibold text-status-error-text">
                                {t('organization.bulkImport.invalidBadge')}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-status-error-text font-medium">
                            {res.errors && res.errors.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-0.5">
                                {res.errors.map((err, errIdx) => (
                                  <li key={errIdx}>{err}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-text-muted font-normal">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-4" id="bulk-import-step-success">
              <div className="rounded-full bg-status-success-bg p-4 border border-status-success-text/20 text-status-success-text animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-lg font-extrabold text-text-heading">
                  {t('organization.bulkImport.successTitle')}
                </h4>
                <p className="text-sm text-text-muted leading-relaxed">
                  {t('organization.bulkImport.successMessage', { count: importedCount })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-card-border shrink-0 flex items-center justify-end space-x-3 bg-card-header-bg rounded-b-2xl">
          {step === 'upload' && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-text-body hover:text-text-heading hover:bg-card-header-bg rounded-xl transition-colors"
              id="bulk-import-cancel"
            >
              {t('organization.usersTab.cancelBtn')}
            </button>
          )}

          {step === 'validate' && (
            <>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 text-sm font-semibold text-text-body hover:text-text-heading hover:bg-card-header-bg rounded-xl transition-colors"
                id="bulk-import-back"
              >
                {t('organization.bulkImport.backToUploadBtn')}
              </button>

              <button
                disabled={loading || hasAnyErrors}
                onClick={handleConfirm}
                className={`flex items-center justify-center space-x-2 px-6 py-2.5 text-sm font-semibold rounded-xl shadow-sm transition-colors ${
                  hasAnyErrors
                    ? 'bg-bg-subtle text-text-muted cursor-not-allowed shadow-none'
                    : 'bg-btn-primary-bg hover:bg-btn-primary-hover text-btn-primary-text'
                }`}
                id="bulk-import-confirm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('organization.bulkImport.importing')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('organization.bulkImport.confirmImportBtn')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-6 py-2.5 text-sm font-semibold text-btn-primary-text bg-btn-primary-bg hover:bg-btn-primary-hover rounded-xl transition-colors shadow-sm"
              id="bulk-import-done"
            >
              {t('organization.bulkImport.doneBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
