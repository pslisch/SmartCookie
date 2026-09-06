import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { User, LogOut, Briefcase, Network, UserCheck, Mail, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from './AppGate';

export interface ProfileFieldResponse {
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
  value: string | null;
}

interface QuickProfileProps {
  onClose: () => void;
  onOpenFullProfile: () => void;
}

export function QuickProfile({ onClose, onOpenFullProfile }: QuickProfileProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileFieldResponse[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/profile/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch profile');
      })
      .then((data) => {
        if (active) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load profile for QuickProfile:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const getFieldValue = (key: string) => {
    if (!profile) return null;
    const field = profile.find((f) => f.fieldKey === key);
    return field?.value || null;
  };

  const getCustomFieldValueByName = (nameMatch: string) => {
    if (!profile) return null;
    const field = profile.find(
      (f) => f.name.toLowerCase().replace(/\s+/g, '') === nameMatch.toLowerCase().replace(/\s+/g, '')
    );
    return field?.value || null;
  };

  const firstName = getFieldValue('firstName');
  const lastName = getFieldValue('lastName');
  const email = getFieldValue('email') || user?.username; // Fallback to username/email
  const profilePicture = getFieldValue('profilePicture');

  // Compute clean display name
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.username || '';

  // Initials
  const initials = (
    (firstName?.[0] || '') + (lastName?.[0] || '')
  ).toUpperCase() || user?.username?.[0]?.toUpperCase() || '?';

  // Dynamic checks for Job Title, Department, Manager custom fields
  const jobTitle = getCustomFieldValueByName('Job Title') || getCustomFieldValueByName('JobTitle');
  const department = getCustomFieldValueByName('Department');
  const manager = getCustomFieldValueByName('Manager');

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <div
      className="absolute right-0 mt-2 w-80 rounded-2xl border border-card-border bg-card-bg p-5 shadow-xl ring-1 ring-black/5 z-50 animate-fadeIn"
      id="quick-profile-card"
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center text-text-muted" id="quick-profile-loader">
          <Loader2 className="h-6 w-6 animate-spin text-link-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header with Avatar and Name */}
          <div className="flex items-center space-x-3.5 pb-3 border-b border-card-border">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={fullName}
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-full object-cover border border-card-border"
                id="quick-profile-avatar-img"
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full bg-btn-primary-bg text-sm font-bold text-text-inverse shadow-inner"
                id="quick-profile-avatar-initials"
              >
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-text-heading truncate" id="quick-profile-name">
                {fullName}
              </h4>
              <p className="text-xs text-text-muted font-medium truncate" id="quick-profile-role">
                {user?.roleName || 'Learner'}
              </p>
            </div>
          </div>

          {/* User Custom and System Information */}
          <div className="space-y-2.5 text-xs text-text-body">
            {email && (
              <div className="flex items-center space-x-2.5 text-text-muted" id="quick-profile-email-row">
                <Mail className="h-4 w-4 text-text-muted shrink-0" />
                <span className="truncate text-text-body font-medium">{email}</span>
              </div>
            )}

            {jobTitle && (
              <div className="flex items-center space-x-2.5 text-text-muted" id="quick-profile-jobtitle-row">
                <Briefcase className="h-4 w-4 text-text-muted shrink-0" />
                <span className="truncate text-text-body font-medium">
                  {jobTitle}
                </span>
              </div>
            )}

            {department && (
              <div className="flex items-center space-x-2.5 text-text-muted" id="quick-profile-department-row">
                <Network className="h-4 w-4 text-text-muted shrink-0" />
                <span className="truncate text-text-body font-medium">
                  {department}
                </span>
              </div>
            )}

            {manager && (
              <div className="flex items-center space-x-2.5 text-text-muted" id="quick-profile-manager-row">
                <UserCheck className="h-4 w-4 text-text-muted shrink-0" />
                <span className="truncate text-text-body font-medium">
                  {manager}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-1.5 border-t border-card-border">
            <button
              onClick={() => {
                onClose();
                onOpenFullProfile();
              }}
              className="flex w-full items-center justify-between rounded-xl bg-card-header-bg px-3.5 py-2.5 text-xs font-semibold text-text-body hover:bg-status-info-bg hover:text-link-primary transition-all duration-150 group"
              id="quick-profile-goto-full-btn"
            >
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-text-muted group-hover:text-link-primary" />
                <span>{t('profile.openFullProfile')}</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-link-primary transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-status-error-text hover:bg-status-error-bg transition-all duration-150"
              id="quick-profile-logout-btn"
            >
              <LogOut className="h-4 w-4 text-status-error-text shrink-0" />
              <span>{t('profile.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
