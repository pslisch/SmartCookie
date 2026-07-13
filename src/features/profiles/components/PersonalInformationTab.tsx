import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { ProfileFieldInput, ProfileFieldDefinition } from '../../../shared/components/ProfileFieldInput';

interface ProfileFieldResponse {
  fieldDefinitionId: string;
  fieldKey?: string | null;
  name: string;
  description?: string | null;
  fieldType: string;
  required: boolean;
  visible: boolean;
  editableByUser: boolean;
  isSystemField: boolean;
  displayOrder: number;
  category: {
    id: string;
    name: string;
    displayOrder: number;
  } | null;
  value: string | null;
}

interface ProfileCompletionResponse {
  percentage: number;
  missingFields: Array<{
    id: string;
    fieldKey?: string | null;
    name: string;
    required: boolean;
  }>;
}

export function PersonalInformationTab() {
  const { t } = useTranslation();
  const [fields, setFields] = useState<ProfileFieldResponse[]>([]);
  const [completion, setCompletion] = useState<ProfileCompletionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Track field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const fetchProfileData = async () => {
    try {
      const [profileRes, completionRes] = await Promise.all([
        fetch('/api/profile/me'),
        fetch('/api/profile/me/completion'),
      ]);

      if (!profileRes.ok || !completionRes.ok) {
        throw new Error('Failed to load profile data');
      }

      const profileData = await profileRes.json();
      const completionData = await completionRes.json();

      setFields(profileData);
      setCompletion(completionData);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleFieldChange = (fieldId: string, val: string) => {
    setFields((prev) =>
      prev.map((f) => (f.fieldDefinitionId === fieldId ? { ...f, value: val } : f))
    );
  };

  const handleFieldError = (fieldId: string, errorMsg: string | null) => {
    setFieldErrors((prev) => ({ ...prev, [fieldId]: errorMsg }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there are any validation errors
    const hasErrors = Object.values(fieldErrors).some((err) => err !== null);
    if (hasErrors) {
      setError(t('profile.personal.errorAlert'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Exclude non-editable-by-user fields from being submitted if they shouldn't be
      // (Though the PUT /me route is secure on the backend, let's keep it safe)
      const editableFields = fields.filter((f) => f.editableByUser && f.visible);

      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: editableFields.map((f) => ({
            fieldDefinitionId: f.fieldDefinitionId,
            value: f.value,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      setSuccessMsg(t('profile.personal.successAlert'));
      // Refetch completion info
      const completionRes = await fetch('/api/profile/me/completion');
      if (completionRes.ok) {
        const completionData = await completionRes.json();
        setCompletion(completionData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size client-side (2MB limit)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(t('profile.personal.errorAlert'));
      return;
    }

    setUploadingPic(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/profile/picture', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload profile picture.');
      }

      const data = await res.json();
      
      // Update local field state for profilePicture field definition
      setFields((prev) =>
        prev.map((f) =>
          f.fieldKey === 'profilePicture' ? { ...f, value: data.profilePicturePath } : f
        )
      );

      setSuccessMsg(t('profile.personal.pictureSuccess'));
      // Refresh profile data completely to stay fully in sync
      await fetchProfileData();
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingPic(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center" id="personal-tab-loader">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Find system profilePicture field value
  const profilePictureField = fields.find((f) => f.fieldKey === 'profilePicture');
  const profilePictureVal = profilePictureField?.value || null;

  // Compute initials
  const firstNameField = fields.find((f) => f.fieldKey === 'firstName');
  const lastNameField = fields.find((f) => f.fieldKey === 'lastName');
  const firstName = firstNameField?.value || '';
  const lastName = lastNameField?.value || '';
  const initials = ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';

  // Filter only visible fields to display in form
  const visibleFields = fields.filter((f) => f.visible && f.fieldKey !== 'profilePicture');

  // Group fields by category
  const categoriesMap: Record<string, { name: string; displayOrder: number; fields: ProfileFieldResponse[] }> = {};

  visibleFields.forEach((field) => {
    const catId = field.category?.id || 'general';
    const catName = field.category?.name || 'General Information';
    const catOrder = field.category?.displayOrder ?? 999;

    if (!categoriesMap[catId]) {
      categoriesMap[catId] = {
        name: catName,
        displayOrder: catOrder,
        fields: [],
      };
    }
    categoriesMap[catId].fields.push(field);
  });

  // Sort categories by displayOrder
  const sortedCategories = Object.entries(categoriesMap)
    .map(([id, cat]) => ({ id, ...cat }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Sort fields inside each category by displayOrder
  sortedCategories.forEach((cat) => {
    cat.fields.sort((a, b) => a.displayOrder - b.displayOrder);
  });

  return (
    <div className="space-y-8" id="personal-information-tab">
      {/* Profile Completion Panel */}
      {completion && (
        <div
          className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/40 to-indigo-50/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          id="profile-completion-panel"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900" id="profile-completion-title">
              {t('profile.personal.strength')}
            </h4>
            <p className="text-xs text-slate-600" id="profile-completion-missing">
              {completion.percentage}%, {t('profile.personal.missing')}:{' '}
              {completion.missingFields.length > 0 ? (
                <span className="font-semibold text-slate-800">
                  {completion.missingFields.map((f) => f.name).join(', ')}
                </span>
              ) : (
                <span className="font-semibold text-green-600">{t('profile.personal.noRequiredMissing')}</span>
              )}
            </p>
          </div>
          <div className="w-full md:w-48 bg-slate-200/80 rounded-full h-2.5 overflow-hidden shrink-0">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${completion.percentage}%` }}
              id="profile-completion-progress"
            />
          </div>
        </div>
      )}

      {/* Notifications / Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center space-x-2.5 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700"
            id="personal-success-alert"
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center space-x-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700"
            id="personal-error-alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="space-y-8" id="personal-info-form">
        {/* Profile Picture Upload Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100">
          <div className="relative group self-start sm:self-center" id="avatar-container">
            {profilePictureVal ? (
              <img
                src={profilePictureVal}
                alt="Avatar"
                referrerPolicy="no-referrer"
                className="h-24 w-24 rounded-2xl object-cover border-2 border-slate-100 shadow-sm"
                id="avatar-image-display"
              />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-inner border border-blue-100"
                id="avatar-initials-display"
              >
                {initials}
              </div>
            )}
            <button
              type="button"
              disabled={uploadingPic}
              onClick={triggerFileSelect}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-colors disabled:opacity-50"
              id="avatar-upload-trigger-btn"
            >
              {uploadingPic ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              id="avatar-file-input"
            />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">{t('profile.personal.pictureTitle')}</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              {t('profile.personal.pictureDescription')}
            </p>
            <button
              type="button"
              disabled={uploadingPic}
              onClick={triggerFileSelect}
              className="mt-2 inline-flex items-center space-x-1.5 rounded-xl border border-slate-200/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              id="avatar-select-btn"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <span>{uploadingPic ? t('profile.personal.uploading') : t('profile.personal.chooseFile')}</span>
            </button>
          </div>
        </div>

        {/* Categories of Profile Fields */}
        <div className="space-y-8" id="profile-categories-list">
          {sortedCategories.map((category) => (
            <div key={category.id} className="space-y-4" id={`profile-cat-section-${category.id}`}>
              <h3 className="text-sm font-extrabold tracking-wider text-slate-400 uppercase">
                {category.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {category.fields.map((field) => (
                  <ProfileFieldInput
                    key={field.fieldDefinitionId}
                    field={field as any}
                    value={field.value || ''}
                    isOwner={true}
                    onChange={(val) => handleFieldChange(field.fieldDefinitionId, val)}
                    onError={(err) => handleFieldError(field.fieldDefinitionId, err)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div className="pt-5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm shadow-blue-600/10"
            id="personal-info-save-btn"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('profile.personal.saving')}</span>
              </>
            ) : (
              <span>{t('profile.personal.saveChanges')}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
