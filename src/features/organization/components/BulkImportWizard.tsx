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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" id="bulk-import-modal">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-3xl w-full flex flex-col max-h-[85vh]" id="bulk-import-card">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900" id="bulk-import-title">
              {t('organization.bulkImport.title')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('organization.bulkImport.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Close"
            id="bulk-import-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0" id="bulk-import-content">
          {error && (
            <div className="mb-6 flex items-start space-x-3 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700" id="bulk-import-error">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Error</span>
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6" id="bulk-import-step-upload">
              {/* Template Download Block */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/40 to-indigo-50/20">
                <div className="flex items-start space-x-3.5">
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-600 mt-0.5">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {t('organization.bulkImport.downloadTemplate')}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mt-0.5">
                      Get the pre-formatted CSV template. It automatically includes columns for system requirements and any custom organization profile fields.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/10 shrink-0"
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
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
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
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                    <p className="text-sm font-bold text-slate-700">
                      {t('organization.bulkImport.validating')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="mx-auto rounded-full bg-slate-50 p-4 w-16 h-16 flex items-center justify-center text-slate-400">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        {t('organization.bulkImport.dropzoneText')}
                      </p>
                      <p className="text-xs text-slate-400">
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
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start space-x-3" id="validate-error-banner">
                  <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-red-950">
                      {t('organization.bulkImport.warningAllOrNothing')}
                    </h4>
                    <p className="text-xs text-red-700 leading-relaxed">
                      {t('organization.bulkImport.fixAllErrors')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-green-200 bg-green-50 flex items-start space-x-3" id="validate-success-banner">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-green-950">
                      {t('organization.bulkImport.allValid')}
                    </h4>
                    <p className="text-xs text-green-700 leading-relaxed">
                      {t('organization.bulkImport.allValidDesc')}
                    </p>
                  </div>
                </div>
              )}

              {/* Rows List */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider">
                  {t('organization.bulkImport.validatingTitle')}
                </h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto" id="validation-table">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-center">{t('organization.bulkImport.rowCol')}</th>
                        <th className="px-4 py-3">{t('organization.bulkImport.emailCol')}</th>
                        <th className="px-4 py-3 text-center">{t('organization.bulkImport.statusCol')}</th>
                        <th className="px-4 py-3">{t('organization.bulkImport.errorsCol')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {validationResults.map((res, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/50 ${!res.valid ? 'bg-red-50/10' : ''}`}
                        >
                          <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-500">{res.row}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900">{res.email || '-'}</td>
                          <td className="px-4 py-3.5 text-center">
                            {res.valid ? (
                              <span className="inline-flex items-center rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-2xs font-semibold text-green-700">
                                {t('organization.bulkImport.validBadge')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-2xs font-semibold text-red-700">
                                {t('organization.bulkImport.invalidBadge')}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-red-600 font-medium">
                            {res.errors && res.errors.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-0.5">
                                {res.errors.map((err, errIdx) => (
                                  <li key={errIdx}>{err}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
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
              <div className="rounded-full bg-green-50 p-4 border border-green-100 text-green-600 animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-lg font-extrabold text-slate-900">
                  {t('organization.bulkImport.successTitle')}
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('organization.bulkImport.successMessage', { count: importedCount })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 shrink-0 flex items-center justify-end space-x-3 bg-slate-50/50 rounded-b-2xl">
          {step === 'upload' && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              id="bulk-import-cancel"
            >
              {t('organization.usersTab.cancelBtn')}
            </button>
          )}

          {step === 'validate' && (
            <>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                id="bulk-import-back"
              >
                {t('organization.bulkImport.backToUploadBtn')}
              </button>

              <button
                disabled={loading || hasAnyErrors}
                onClick={handleConfirm}
                className={`flex items-center justify-center space-x-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-colors ${
                  hasAnyErrors
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10'
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
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-600/10"
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
