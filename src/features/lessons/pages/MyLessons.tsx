/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  AlertCircle,
  Search,
  Check,
  ExternalLink,
  Layers,
  Play
} from 'lucide-react';
import { ScormPlayer } from '../../content/components/ScormPlayer';

interface SourceOrgUnit {
  id: string;
  name: string;
}

interface SourceLearningGroup {
  id: string;
  name: string;
}

interface InstanceSource {
  id: string;
  sourceType: 'MANUAL' | 'ORGANIZATION_UNIT' | 'LEARNING_GROUP' | 'SELF_ASSIGNED' | 'MANDATORY' | 'API';
  sourceOrganizationUnitId: string | null;
  sourceOrganizationUnit: SourceOrgUnit | null;
  sourceLearningGroupId: string | null;
  sourceLearningGroup: SourceLearningGroup | null;
}

interface Lesson {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  completionRule: 'MARKED_COMPLETE' | 'QUIZ_PASSED' | 'MIN_SCORE' | 'ACKNOWLEDGEMENT' | 'CUSTOM';
  contentId?: string | null;
}

interface Assignment {
  id: string;
  lesson: Lesson;
}

interface UserAssignmentInstance {
  id: string;
  assignmentId: string;
  userId: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  dueDate: string | null;
  completedAt: string | null;
  progressPercent: number;
  sources: InstanceSource[];
  assignment: Assignment;
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export const MyLessons: React.FC = () => {
  const { t } = useTranslation();
  const [instances, setInstances] = useState<UserAssignmentInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [playingInstanceId, setPlayingInstanceId] = useState<string | null>(null);

  const fetchMyLessons = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/assignment-instances');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('myLessons.messages.fetchLessonsError'));
      }
      const data = await res.json();
      setInstances(data);
    } catch (err: any) {
      setError(err.message || t('myLessons.messages.fetchLessonsErr'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLessons();
  }, []);

  const handleMarkComplete = async (instanceId: string) => {
    setError('');
    setSuccess('');
    setIsActionLoading(instanceId);
    try {
      const res = await fetch(`/api/assignment-instances/${instanceId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('myLessons.messages.completeError'));
      }

      setSuccess(t('myLessons.messages.completeSuccess'));
      // Refresh local list
      await fetchMyLessons();
    } catch (err: any) {
      setError(err.message || t('myLessons.messages.completeErr'));
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleRemoveSelfAssignment = async (instanceId: string) => {
    if (!confirm(t('myLessons.removeSelfAssignConfirm'))) {
      return;
    }

    setError('');
    setSuccess('');
    setIsActionLoading(instanceId);
    try {
      const res = await fetch(`/api/assignments/self-assign/${instanceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('myLessons.messages.removeError'));
      }

      setSuccess(t('myLessons.messages.removeSuccess'));
      // Refresh local list
      await fetchMyLessons();
    } catch (err: any) {
      setError(err.message || t('myLessons.messages.removeErr'));
    } finally {
      setIsActionLoading(null);
    }
  };

  const isOverdue = (inst: UserAssignmentInstance) => {
    if (inst.status === 'COMPLETED' || !inst.dueDate) return false;
    return new Date(inst.dueDate) < new Date();
  };

  // Determine if instance is purely self-assigned and therefore removable
  const canRemove = (inst: UserAssignmentInstance) => {
    if (!inst.sources || inst.sources.length === 0) return false;
    // Removable ONLY if every single source is SELF_ASSIGNED
    return inst.sources.every((src) => src.sourceType === 'SELF_ASSIGNED');
  };

  // Filter lessons based on search and selected tab
  const filteredInstances = instances.filter((inst) => {
    const titleMatch = inst.assignment?.lesson?.title
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    if (!titleMatch) return false;

    if (activeFilter === 'IN_PROGRESS') {
      return inst.status !== 'COMPLETED';
    }
    if (activeFilter === 'COMPLETED') {
      return inst.status === 'COMPLETED';
    }

    return true;
  });

  if (playingInstanceId) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="playing-scorm-container">
        <ScormPlayer
          userAssignmentInstanceId={playingInstanceId}
          onClose={() => {
            setPlayingInstanceId(null);
            fetchMyLessons();
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6"
      id="my-lessons-root"
    >
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-card-border pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-heading font-sans">
            {t('myLessons.title')}
          </h1>
          <p className="text-sm text-text-muted mt-1 font-medium">
            {t('myLessons.subtitle')}
          </p>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2.5 rounded-xl border border-card-border bg-status-error-bg p-4 text-status-error-text shadow-sm"
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
            className="flex items-center space-x-2.5 rounded-xl border border-card-border bg-status-success-bg p-4 text-status-success-text shadow-sm"
          >
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action and Filter controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card-header-bg p-4 rounded-2xl border border-card-border">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder={t('myLessons.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-card-bg pl-10 pr-4 py-2 text-sm font-semibold text-text-body shadow-xs focus:border-link-primary focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-bg-subtle p-1 rounded-xl self-start md:self-auto">
          {(['ALL', 'IN_PROGRESS', 'COMPLETED'] as const).map((filter) => {
            let label = '';
            if (filter === 'ALL') label = t('myLessons.allFilter');
            else if (filter === 'IN_PROGRESS') label = t('myLessons.inProgressFilter');
            else if (filter === 'COMPLETED') label = t('myLessons.completedFilter');
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wide ${
                  activeFilter === filter
                    ? 'bg-card-bg text-text-heading shadow-sm'
                    : 'text-text-muted hover:text-text-heading'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary List Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-link-primary" />
          <p className="text-sm text-text-muted font-medium">{t('myLessons.loading')}</p>
        </div>
      ) : filteredInstances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-card-border bg-card-bg p-16 text-center text-text-muted">
          <BookOpen className="h-10 w-10 mx-auto text-text-muted mb-3" />
          <p className="text-base font-bold text-text-heading">{t('myLessons.noLessonsTitle')}</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            {searchTerm 
              ? t('myLessons.noLessonsQueryDesc')
              : t('myLessons.noLessonsDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstances.map((inst) => {
            const overdue = isOverdue(inst);
            const removable = canRemove(inst);
            const isCompleted = inst.status === 'COMPLETED';

            return (
              <div
                key={inst.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-card-bg p-5 shadow-xs hover:shadow-md transition-all gap-5 ${
                  overdue ? 'border-status-error-text/30 bg-status-error-bg/10' : 'border-card-border'
                }`}
                id={`lesson-card-${inst.id}`}
              >
                {/* Card Top: Header / Meta */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        isCompleted
                          ? 'bg-status-success-bg text-status-success-text border-card-border'
                          : overdue
                          ? 'bg-status-error-bg text-status-error-text border-card-border'
                          : 'bg-status-info-bg text-status-info-text border-card-border'
                      }`}
                    >
                      {isCompleted ? t('myLessons.completedStatus') : overdue ? t('myLessons.overdueStatus') : t('myLessons.inProgressStatus')}
                    </span>

                    {/* Sources Badge Row */}
                    <div className="flex flex-wrap gap-1 max-w-[60%] justify-end">
                      {inst.sources?.map((src) => {
                        let shortLabel: string = src.sourceType;
                        if (src.sourceType === 'SELF_ASSIGNED') shortLabel = t('myLessons.selfSource');
                        else if (src.sourceType === 'MANDATORY') shortLabel = t('myLessons.mandatorySource');
                        else if (src.sourceType === 'ORGANIZATION_UNIT') shortLabel = t('myLessons.deptSource');
                        else if (src.sourceType === 'LEARNING_GROUP') shortLabel = t('myLessons.groupSource');

                        return (
                          <span
                            key={src.id}
                            title={`Assigned via ${src.sourceType}`}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-bg-subtle text-text-muted border border-card-border"
                          >
                            {shortLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-text-heading text-base leading-tight font-sans">
                      {inst.assignment?.lesson?.title || t('myLessons.untitledLesson')}
                    </h3>
                    <p className="text-[10px] font-mono text-text-muted mt-1 uppercase tracking-wide flex items-center gap-1">
                      <Layers className="h-3 w-3 text-text-muted" />
                      {t('myLessons.ruleLabel', { rule: inst.assignment?.lesson?.completionRule || 'MARKED_COMPLETE' })}
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Progress / Actions */}
                <div className="space-y-4 pt-3 border-t border-card-border">
                  {/* Progress Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-text-muted">
                      <span>{t('myLessons.progressLabel')}</span>
                      <span className="text-text-heading font-mono">{inst.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-bg-subtle rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-status-success-text' : overdue ? 'bg-status-error-text' : 'bg-link-primary'
                        }`}
                        style={{ width: `${inst.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div className="flex flex-wrap justify-between items-center text-xs text-text-muted gap-2">
                    {inst.dueDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-text-muted" />
                        <span>{t('myLessons.dueDate', { date: new Date(inst.dueDate).toLocaleDateString() })}</span>
                      </span>
                    )}
                    {isCompleted && inst.completedAt && (
                      <span className="flex items-center gap-1 text-status-success-text font-semibold">
                        <Check className="h-3.5 w-3.5" />
                        <span>{t('myLessons.completedDate', { date: new Date(inst.completedAt).toLocaleDateString() })}</span>
                      </span>
                    )}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-2">
                    {/* Launch SCORM Player Action */}
                    {inst.assignment?.lesson?.contentId && (
                      <button
                        onClick={() => setPlayingInstanceId(inst.id)}
                        className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-btn-primary-bg hover:bg-btn-primary-hover text-btn-primary-text rounded-xl text-xs font-bold transition-colors shadow-sm"
                        id={`launch-scorm-btn-${inst.id}`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>
                          {isCompleted ? 'Replay' : inst.progressPercent > 0 ? 'Resume' : 'Launch'}
                        </span>
                      </button>
                    )}

                    {/* Mark Complete Action (only if rule is MARKED_COMPLETE) */}
                    {!isCompleted && inst.assignment?.lesson?.completionRule === 'MARKED_COMPLETE' && (
                      <button
                        onClick={() => handleMarkComplete(inst.id)}
                        disabled={isActionLoading !== null}
                        className="flex-1 flex items-center justify-center space-x-1 px-4 py-2.5 bg-status-success-text text-white rounded-xl text-xs font-bold hover:opacity-90 transition-colors shadow-sm disabled:opacity-50"
                        id={`mark-complete-btn-${inst.id}`}
                      >
                        {isActionLoading === inst.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>{t('myLessons.markCompleteBtn')}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Self Assignment Removal Action (ONLY shown/enabled for completely self-assigned instances) */}
                    {removable && (
                      <button
                        onClick={() => handleRemoveSelfAssignment(inst.id)}
                        disabled={isActionLoading !== null}
                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2.5 bg-card-bg text-status-error-text hover:text-status-error-text border border-card-border hover:bg-status-error-bg/50 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        title="Remove self-assignment"
                        id={`remove-self-assign-btn-${inst.id}`}
                      >
                        {isActionLoading === inst.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-status-error-text" />
                        ) : (
                          <>
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{t('myLessons.removeBtn')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
