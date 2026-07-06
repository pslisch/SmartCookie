import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Clock, Calendar, ShieldAlert, Check, RefreshCw, AlertCircle, Loader2, X } from 'lucide-react';

interface LearningGroup {
  id: string;
  name: string;
  isTemporary: boolean;
  expiresAt: string;
  reminderSentAt: string | null;
}

export const ExpiringGroupsTab: React.FC = () => {
  const { t } = useTranslation();
  const [expiringGroups, setExpiringGroups] = useState<LearningGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expiration extension state
  const [extendingGroupId, setExtendingGroupId] = useState<string | null>(null);
  const [newExtensionDate, setNewExtensionDate] = useState('');

  // CSRF token helpers
  const getCsrfToken = () => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const fetchExpiringGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learning-groups/expiring');
      if (!res.ok) throw new Error(t('organization.expiring.errors.failedToLoad'));
      const data = await res.json();
      setExpiringGroups(data);
    } catch (err: any) {
      setError(err.message || t('organization.expiring.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiringGroups();
  }, []);

  const handleExtendGroup = async (id: string) => {
    if (!newExtensionDate) return;

    setError(null);
    try {
      const res = await fetch(`/api/learning-groups/${id}/extend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify({ newExpiresAt: new Date(newExtensionDate).toISOString() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('organization.expiring.errors.failedToExtend'));
      }

      setExtendingGroupId(null);
      setNewExtensionDate('');
      fetchExpiringGroups();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6" id="expiring-groups-tab-container">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">{t('organization.expiring.title')}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('organization.expiring.description')}
            </p>
          </div>
          <button
            onClick={fetchExpiringGroups}
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition-colors"
            title={t('organization.expiring.refreshList')}
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-800 flex items-start space-x-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading && expiringGroups.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mr-2" />
            <span className="text-sm font-semibold text-slate-500">{t('organization.expiring.retrieving')}</span>
          </div>
        ) : expiringGroups.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
            <Check className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">{t('organization.expiring.noGroupsTitle')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('organization.expiring.noGroupsDesc')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expiringGroups.map((group) => {
              const expiresDate = new Date(group.expiresAt);
              const isExtending = extendingGroupId === group.id;

              // Calculate hours left
              const hoursLeft = Math.max(0, Math.ceil((expiresDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)));

              return (
                <div
                  key={group.id}
                  className="flex flex-col md:flex-row md:items-center justify-between border border-amber-200 bg-amber-50/10 rounded-2xl p-4 shadow-sm"
                  id={`expiring-row-${group.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-slate-800 text-sm">{group.name}</h4>
                      <span className="inline-flex items-center space-x-1 rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{t('organization.expiring.hoursRemaining', { count: hoursLeft })}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t('organization.expiring.expirationDate', { date: expiresDate.toLocaleString() })}</span>
                      </span>
                    </div>
                  </div>

                  {/* Extension Controls */}
                  <div className="mt-4 md:mt-0 flex items-center space-x-3 shrink-0">
                    {isExtending ? (
                      <div className="flex items-center space-x-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-inner">
                        <input
                          type="date"
                          value={newExtensionDate}
                          onChange={(e) => setNewExtensionDate(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none font-bold text-slate-700"
                          min={new Date().toISOString().split('T')[0]}
                        />
                        <button
                          onClick={() => handleExtendGroup(group.id)}
                          disabled={!newExtensionDate}
                          className="rounded-lg bg-emerald-50 p-1 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          title={t('organization.expiring.saveExtension')}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setExtendingGroupId(null)}
                          className="rounded-lg bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 transition-colors"
                          title={t('organization.expiring.cancel')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setExtendingGroupId(group.id);
                          // Default new date to 7 days from now
                          const defaultDate = new Date();
                          defaultDate.setDate(defaultDate.getDate() + 7);
                          setNewExtensionDate(defaultDate.toISOString().split('T')[0]);
                        }}
                        className="rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 px-4 py-2 text-xs font-bold text-indigo-700 shadow-sm transition-all"
                      >
                        {t('organization.expiring.extendBtn')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
