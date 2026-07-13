import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Shield,
  Calendar,
  Clock,
  Key,
  Activity,
  Award,
  Building,
  Users,
  GitBranch,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface AccountInfo {
  userId: string;
  createdAt: string;
  lastLoginAt: string | null;
  loginProvider: string;
  status: string;
  role: string;
  organization: string;
  company: string;
  groups: string[];
  subgroups: string[];
}

export function AccountInformationTab() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccountInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/profile/me/account-info');
        if (!res.ok) {
          throw new Error('Failed to fetch account information.');
        }
        const data = await res.json();
        setInfo(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading account info.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccountInfo();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('profile.account.never');
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return t('profile.account.unknown');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-3" id="account-info-loading">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-500">Loading account information...</span>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3 max-w-lg mx-auto" id="account-info-error">
        <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
        <h4 className="text-sm font-bold text-red-900">Failed to Load Account Info</h4>
        <p className="text-xs text-red-700">{error || 'Could not fetch details.'}</p>
      </div>
    );
  }

  const items = [
    {
      id: 'userId',
      icon: <User className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.userId'),
      value: info.userId,
      className: 'font-mono text-xs select-all bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50',
    },
    {
      id: 'createdAt',
      icon: <Calendar className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.createdDate'),
      value: formatDate(info.createdAt),
    },
    {
      id: 'lastLogin',
      icon: <Clock className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.lastLogin'),
      value: formatDate(info.lastLoginAt),
    },
    {
      id: 'loginProvider',
      icon: <Key className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.loginProvider'),
      value: info.loginProvider,
    },
    {
      id: 'accountStatus',
      icon: <Activity className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.status'),
      value: (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          info.status === 'ACTIVE' 
            ? 'bg-green-50 text-green-700 border border-green-200/60' 
            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
        }`}>
          {info.status}
        </span>
      ),
    },
    {
      id: 'role',
      icon: <Shield className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.assignedRoles'),
      value: info.role,
    },
    {
      id: 'organization',
      icon: <Building className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.assignedOrganization'),
      value: info.organization,
    },
    {
      id: 'groups',
      icon: <Users className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.assignedGroups'),
      value: info.groups.length > 0 ? info.groups.join(', ') : t('profile.account.none'),
    },
    {
      id: 'subgroups',
      icon: <GitBranch className="h-4 w-4 text-slate-500" />,
      label: t('profile.account.assignedSubgroups'),
      value: info.subgroups.length > 0 ? info.subgroups.join(', ') : t('profile.account.none'),
    },
  ];

  return (
    <div className="space-y-6" id="account-info-container">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{t('profile.account.title')}</h3>
          <p className="text-xs text-slate-500">
            {t('profile.account.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6" id="account-info-fields-grid">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col space-y-1.5 pb-4 border-b border-slate-50 md:border-b-0"
            id={`account-field-wrapper-${item.id}`}
          >
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
              {item.icon}
              <span>{item.label}</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 pl-6">
              {typeof item.value === 'string' ? (
                <span className={item.className}>{item.value}</span>
              ) : (
                item.value
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
