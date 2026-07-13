import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  User,
  Shield,
  Bell,
  Info,
  Award,
  Medal,
  Award as CertificateIcon,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../../shared/components/AppGate';
import { PersonalInformationTab } from '../components/PersonalInformationTab';
import { SecurityTab } from '../components/SecurityTab';
import { NotificationsTab } from '../components/NotificationsTab';
import { AccountInformationTab } from '../components/AccountInformationTab';

export enum ProfileTab {
  PERSONAL = 'personal',
  SECURITY = 'security',
  NOTIFICATIONS = 'notifications',
  ACCOUNT = 'account',
  CERTIFICATES = 'certificates',
  BADGES = 'badges',
}

export function FullProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>(ProfileTab.PERSONAL);

  const tabs = [
    {
      id: ProfileTab.PERSONAL,
      label: t('profile.tabs.personal'),
      icon: User,
    },
    {
      id: ProfileTab.SECURITY,
      label: t('profile.tabs.security'),
      icon: Shield,
    },
    {
      id: ProfileTab.NOTIFICATIONS,
      label: t('profile.tabs.notifications'),
      icon: Bell,
    },
    {
      id: ProfileTab.ACCOUNT,
      label: t('profile.tabs.account'),
      icon: Info,
    },
    {
      id: ProfileTab.CERTIFICATES,
      label: t('profile.tabs.certificates'),
      icon: Award,
    },
    {
      id: ProfileTab.BADGES,
      label: t('profile.tabs.badges'),
      icon: Medal,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="full-profile-container">
      {/* Page Header */}
      <div className="mb-8" id="profile-page-header">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          My Profile
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your personal information, security preferences, and view your achievements.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8" id="profile-content-layout">
        {/* Left Side: Navigation Tabs Sidebar */}
        <div className="w-full lg:w-64 shrink-0" id="profile-tabs-sidebar">
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 gap-1 scrollbar-none border-b lg:border-b-0 lg:border-r border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap text-left w-full ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                  id={`profile-tab-btn-${tab.id}`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-profile-tab-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md hidden lg:block"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="active-profile-tab-indicator-mobile"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full lg:hidden"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Tab Content Panel */}
        <div className="flex-1 min-w-0" id="profile-tab-content-panel">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm">
            {activeTab === ProfileTab.PERSONAL && (
              <div id="tab-content-personal" className="space-y-6">
                <PersonalInformationTab />
              </div>
            )}

            {activeTab === ProfileTab.SECURITY && (
              <div id="tab-content-security" className="space-y-6">
                <SecurityTab />
              </div>
            )}

            {activeTab === ProfileTab.NOTIFICATIONS && (
              <div id="tab-content-notifications">
                <NotificationsTab />
              </div>
            )}

            {activeTab === ProfileTab.ACCOUNT && (
              <div id="tab-content-account">
                <AccountInformationTab />
              </div>
            )}

            {activeTab === ProfileTab.CERTIFICATES && (
              <div id="tab-content-certificates" className="flex flex-col items-center justify-center min-h-[300px] text-center py-12">
                <div className="rounded-full bg-blue-50 p-4 mb-4">
                  <CertificateIcon className="h-10 w-10 text-blue-500" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  Certificates
                </h4>
                <p className="text-sm text-slate-500 max-w-sm">
                  {t('profile.noCertificates')}
                </p>
              </div>
            )}

            {activeTab === ProfileTab.BADGES && (
              <div id="tab-content-badges" className="flex flex-col items-center justify-center min-h-[300px]">
                <div className="rounded-full bg-amber-50 p-4 mb-4">
                  <Medal className="h-10 w-10 text-amber-500" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-1">
                  Badges & Achievements
                </h4>
                <p className="text-sm text-slate-500 max-w-sm">
                  {t('profile.noBadges')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
