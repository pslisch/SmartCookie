import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  BookOpen,
  Info,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Settings,
  Globe,
  Award,
  Check,
  FolderPlus,
  RefreshCw,
  XCircle,
  Clock,
  Layers
} from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';

interface ContentImportWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Lesson {
  id: string;
  title: string;
  contentId: string | null;
}

interface Category {
  id: string;
  name: string;
}

export const ContentImportWizard: React.FC<ContentImportWizardProps> = ({
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const hasImportPermission = usePermission('content', 'import');

  // Steps: 1 to 8
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Data fetching states
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  // Form Field States
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('en');
  const [tagsInput, setTagsInput] = useState('');

  const [versionBehavior, setVersionBehavior] = useState<'NEW' | 'REPLACE'>('NEW');
  const [existingContentGroupId, setExistingContentGroupId] = useState('');

  // Certificate Setting (5 options)
  const [certificateOption, setCertificateOption] = useState<'IGNORE' | 'USE_PACKAGE' | 'STORE' | 'ALLOW_DOWNLOAD' | 'SMARTCOOKIE_FUTURE'>('IGNORE');

  // Submit / Upload Progress States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Publish States
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  useEffect(() => {
    if (hasImportPermission) {
      fetchLessonsAndCategories();
    }
  }, [hasImportPermission]);

  const fetchLessonsAndCategories = async () => {
    setIsLoadingLessons(true);
    try {
      const lessonsRes = await fetch('/api/lessons');
      if (lessonsRes.ok) {
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData);
      }

      const categoriesRes = await fetch('/api/content/categories');
      if (categoriesRes.ok) {
        const catData = await categoriesRes.json();
        setCategories(catData);
      }
    } catch (err) {
      console.error('Failed to load pre-requisite wizard data', err);
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const getCookie = (name: string): string => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        setSelectedFile(file);
        if (!title) {
          // Auto-fill title from filename without extension
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Core Upload Logic (triggers on Step 7 transition/load)
  const handleUploadAndValidate = async () => {
    if (!selectedFile) {
      setUploadError('Please select a SCORM package ZIP file first.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setValidationResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('categoryId', categoryId);
    formData.append('author', author);
    formData.append('language', language);
    formData.append('versionBehavior', versionBehavior);
    formData.append('existingContentGroupId', existingContentGroupId);
    formData.append('certificateOption', certificateOption);

    if (tagsInput.trim()) {
      formData.append('tags', JSON.stringify(tagsInput.split(',').map((t) => t.trim()).filter(Boolean)));
    }

    try {
      const res = await fetch('/api/content/import', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server validation of the SCORM package failed.');
      }

      setValidationResult(data);

      // If a lesson selection was made, let's link the newly imported package contentId with the Lesson!
      if (selectedLessonId && data.contentId) {
        await fetch(`/api/lessons/${selectedLessonId}/content`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCookie('csrfToken'),
          },
          body: JSON.stringify({ contentId: data.contentId }),
        });
      }

      // Move to Step 8 on success
      setCurrentStep(8);
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during upload/validation.');
    } finally {
      setIsUploading(false);
    }
  };

  // Immediate Publish option on Step 8
  const handlePublishContent = async () => {
    if (!validationResult?.contentId) return;

    setIsPublishing(true);
    try {
      const res = await fetch(`/api/content/${validationResult.contentId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish SCORM package.');
      }

      setPublishSuccess(true);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to publish content.');
    } finally {
      setIsPublishing(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Allow passing without lesson or check lesson selection
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!selectedFile) {
        alert('Please select or upload a SCORM ZIP package first.');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!title.trim()) {
        alert('Please fill in a title for the package.');
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setCurrentStep(6);
    } else if (currentStep === 6) {
      setCurrentStep(7);
      // Automatically trigger upload & validation
      setTimeout(() => {
        handleUploadAndValidate();
      }, 300);
    }
  };

  const prevStep = () => {
    if (currentStep > 1 && currentStep < 8) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Gating Guard Check
  if (!hasImportPermission) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-100 shadow-xl p-8 text-center space-y-5" id="wizard-unauthorized">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-rose-50 text-rose-500">
          <XCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800">Permission Denied</h2>
          <p className="text-sm text-slate-500">
            You do not have the required <code>content:import</code> permission to access the SCORM Package Import Wizard.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-w-3xl mx-auto" id="scorm-import-wizard-container">
      {/* Wizard Track / Progress Bar */}
      <div className="bg-slate-950 px-8 py-5 border-b border-slate-800 flex justify-between items-center text-white">
        <div className="flex items-center space-x-3">
          <Layers className="h-5 w-5 text-blue-500" />
          <div>
            <h2 className="text-sm font-black font-sans uppercase tracking-wider">SCORM Import Wizard</h2>
            <p className="text-[10px] font-mono text-slate-500 font-semibold uppercase">Step {currentStep} of 8</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          Exit Wizard
        </button>
      </div>

      {/* Steps Visual Indicator */}
      <div className="flex bg-slate-50 border-b border-slate-100 px-8 py-3.5 overflow-x-auto gap-2">
        {Array.from({ length: 8 }).map((_, index) => {
          const stepNum = index + 1;
          const isActive = currentStep === stepNum;
          const isCompleted = currentStep > stepNum;
          return (
            <div key={stepNum} className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-blue-600 text-white font-black'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : stepNum}
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                {stepNum === 1
                  ? 'Intro'
                  : stepNum === 2
                  ? 'Lesson'
                  : stepNum === 3
                  ? 'ZIP'
                  : stepNum === 4
                  ? 'Metadata'
                  : stepNum === 5
                  ? 'Version'
                  : stepNum === 6
                  ? 'Certificate'
                  : stepNum === 7
                  ? 'Validating'
                  : 'Done'}
              </span>
              {stepNum < 8 && <span className="text-slate-300 font-mono text-[10px] mx-1">&rarr;</span>}
            </div>
          );
        })}
      </div>

      {/* Main Wizard Form Body */}
      <div className="p-8 min-h-[380px]">
        <AnimatePresence mode="wait">
          {/* STEP 1: WELCOME & OVERVIEW */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">SCORM Content Package Import</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Welcome to the multi-step content deployment wizard. This toolkit allows you to upload,
                  parse, validate, and associate industry-standard SCORM 1.2 elearning packages into your SmartCookie workspace.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4 text-blue-800">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-xs font-semibold leading-relaxed">
                  <p className="font-bold text-blue-900">Supported Packages & Requirements:</p>
                  <ul className="list-disc pl-4 space-y-1 text-blue-700 font-medium">
                    <li>Must be a valid ZIP archive format.</li>
                    <li>Must contain a top-level <code>imsmanifest.xml</code> metadata specification file.</li>
                    <li>Files should be compressed directly (not wrapped inside an outer sub-folder).</li>
                    <li>SCORM 1.2 packages only are supported for this MVP.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: LESSON SELECTION */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">Link to a Lesson Stub</h3>
                <p className="text-sm text-slate-500">
                  Select an existing Lesson Stub to link this SCORM content package to, or skip this step to upload as a general content package.
                </p>
              </div>

              {isLoadingLessons ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Target Lesson Stub
                  </label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Do Not Associate (Upload as General Asset) --</option>
                    {lessons.map((less) => (
                      <option key={less.id} value={less.id}>
                        {less.title} {less.contentId ? ' (Currently has package)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: ZIP UPLOAD */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">Select SCORM Zip File</h3>
                <p className="text-sm text-slate-500">
                  Choose or drag and drop your SCORM package ZIP archive.
                </p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-4 transition-all ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/20 scale-[1.01]'
                    : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/5'
                    : 'border-slate-200 hover:border-slate-350 bg-slate-50/20'
                }`}
              >
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
                  selectedFile ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Upload className="h-8 w-8" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-extrabold text-slate-800 truncate max-w-md">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-slate-700">Drag & Drop SCORM ZIP package here</p>
                    <p className="text-xs text-slate-400">or click below to browse local storage</p>
                  </div>
                )}

                <div className="pt-2">
                  <input
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    onChange={handleFileChange}
                    className="hidden"
                    id="scorm-file-input"
                  />
                  <label
                    htmlFor="scorm-file-input"
                    className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl cursor-pointer shadow-xs inline-block transition-colors"
                  >
                    {selectedFile ? 'Change File' : 'Browse Files'}
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: METADATA DETAILS */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800">SCORM Metadata Configuration</h3>
                <p className="text-sm text-slate-500">Provide the details for this package publication.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Package Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
                    placeholder="SCORM Title"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
                    placeholder="Brief description of course materials..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Author / Creator
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
                    placeholder="Author name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="en">English (en)</option>
                    <option value="de">German (de)</option>
                    <option value="fr">French (fr)</option>
                    <option value="es">Spanish (es)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
                    placeholder="compliance, security, 2026"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: VERSIONING PREFERENCE */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">Versioning Behavior</h3>
                <p className="text-sm text-slate-500">
                  Choose how the system handles the package if it is updating previous course materials.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setVersionBehavior('NEW')}
                  className={`text-left p-5 rounded-2xl border transition-all space-y-2 flex flex-col justify-between ${
                    versionBehavior === 'NEW'
                      ? 'border-blue-500 bg-blue-50/10 shadow-md ring-1 ring-blue-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FolderPlus className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">New Independent Package</h4>
                  <p className="text-xs text-slate-400">
                    Uploads this package as a brand new independent content asset in the database.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setVersionBehavior('REPLACE')}
                  className={`text-left p-5 rounded-2xl border transition-all space-y-2 flex flex-col justify-between ${
                    versionBehavior === 'REPLACE'
                      ? 'border-blue-500 bg-blue-50/10 shadow-md ring-1 ring-blue-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Overwrite Existing / Version Up</h4>
                  <p className="text-xs text-slate-400">
                    Overwrites or increments the version number of an existing content group package.
                  </p>
                </button>
              </div>

              {versionBehavior === 'REPLACE' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Existing Content Group ID
                  </label>
                  <input
                    type="text"
                    required
                    value={existingContentGroupId}
                    onChange={(e) => setExistingContentGroupId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none"
                    placeholder="Enter Content Group UUID to overwrite"
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 6: CERTIFICATE SETTING (5 options, ignore only functional) */}
          {currentStep === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">Package Certificate Configuration</h3>
                <p className="text-sm text-slate-500">
                  Select how package-level certificates should be handled upon successful SCORM completion.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'IGNORE',
                    title: 'Ignore package certificate',
                    desc: 'Default option. Bypasses package-level certificates and relies entirely on standard LMS progression tracking.',
                    isMVPActive: true,
                  },
                  {
                    id: 'USE_PACKAGE',
                    title: 'Use package certificate',
                    desc: 'Attempts to use the internal SCORM package-generated certificate if defined inside the course bundle (Inert for MVP).',
                    isMVPActive: false,
                  },
                  {
                    id: 'STORE',
                    title: 'Store certificate',
                    desc: 'Saves any package-delivered completion certificates to the student file-vault records upon completion (Inert for MVP).',
                    isMVPActive: false,
                  },
                  {
                    id: 'ALLOW_DOWNLOAD',
                    title: 'Allow download',
                    desc: 'Renders a download certificate link directly on the lesson player for the student after completing the package (Inert for MVP).',
                    isMVPActive: false,
                  },
                  {
                    id: 'SMARTCOOKIE_FUTURE',
                    title: 'SmartCookie certificate (future)',
                    desc: 'Uses the future SmartCookie native custom certificate template engine to issue a brand certificate (Inert for MVP).',
                    isMVPActive: false,
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCertificateOption(opt.id as any)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start justify-between ${
                      certificateOption === opt.id
                        ? 'border-blue-500 bg-blue-50/10 shadow-md ring-1 ring-blue-500'
                        : 'border-slate-150 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-800 text-sm leading-none">{opt.title}</span>
                        {!opt.isMVPActive && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-slate-100 text-slate-400 tracking-wider">
                            INERT
                          </span>
                        )}
                        {opt.isMVPActive && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100 tracking-wider">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">{opt.desc}</p>
                    </div>

                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      certificateOption === opt.id ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-300'
                    }`}>
                      {certificateOption === opt.id && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 7: UPLOADING & SERVER-SIDE VALIDATION */}
          {currentStep === 7 && (
            <motion.div
              key="step-7"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 space-y-6 text-center"
            >
              {isUploading ? (
                <>
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="h-14 w-14 animate-spin text-blue-600" />
                    <Upload className="absolute h-5 w-5 text-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-black text-slate-800 text-lg">Uploading & Validating</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Streaming SCORM package ZIP payload, extracting archives, and analyzing <code>imsmanifest.xml</code> structures...
                    </p>
                  </div>
                </>
              ) : uploadError ? (
                <>
                  <div className="h-14 w-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="h-7 w-7" />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h4 className="font-black text-slate-800 text-lg">Validation Failed</h4>
                    <p className="text-xs text-rose-600 bg-rose-50/50 p-3 rounded-xl border border-rose-100 leading-relaxed">
                      {uploadError}
                    </p>
                  </div>
                  <button
                    onClick={prevStep}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    Go Back & Correct
                  </button>
                </>
              ) : null}
            </motion.div>
          )}

          {/* STEP 8: COMPLETE & OPTIONAL PUBLISH */}
          {currentStep === 8 && (
            <motion.div
              key="step-8"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 text-center py-6"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                <CheckCircle className="h-8 w-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-2xl font-black text-slate-800 font-sans">Import Successful!</h3>
                <p className="text-sm text-slate-400 font-medium">
                  The SCORM package has been fully decompressed, parsed, and validated green on the server.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2.5 text-xs text-slate-500 font-medium">
                <div className="flex justify-between">
                  <span>Package ID:</span>
                  <span className="font-mono text-slate-700">{validationResult?.contentId?.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>Launch File:</span>
                  <span className="font-mono text-slate-700">{validationResult?.launchFile}</span>
                </div>
                {selectedLessonId && (
                  <div className="flex justify-between text-blue-600 font-semibold border-t border-slate-200/50 pt-2.5 mt-2.5">
                    <span>Associated LessonStub:</span>
                    <span>SUCCESSFULLY LINKED</span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-center gap-3 max-w-md mx-auto">
                {!publishSuccess ? (
                  <button
                    onClick={handlePublishContent}
                    disabled={isPublishing}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    <span>Publish Package Globally</span>
                  </button>
                ) : (
                  <div className="flex-1 py-3 px-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
                    <Check className="h-4 w-4" />
                    <span>Package Published Successfully!</span>
                  </div>
                )}

                <button
                  onClick={onSuccess}
                  className="flex-1 px-5 py-3.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-bold text-xs transition-colors"
                >
                  Close Wizard & Return
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation Bar */}
      {currentStep < 7 && (
        <div className="bg-slate-50 border-t border-slate-100 px-8 py-5 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-xs ${
              currentStep === 1 ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          <button
            onClick={nextStep}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <span>{currentStep === 6 ? 'Submit & Validate' : 'Next Step'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
