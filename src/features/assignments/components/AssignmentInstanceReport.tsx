/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  User, 
  Layers, 
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface UserInfo {
  id: string;
  username: string | null;
  email: string | null;
}

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
  createdAt: string;
}

interface ContentAttempt {
  id: string;
  attemptNumber: number;
  lessonStatus: string;
  scoreRaw: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  sessionTimeSeconds: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

interface UserAssignmentInstance {
  id: string;
  assignmentId: string;
  userId: string;
  user: UserInfo;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  dueDate: string | null;
  completedAt: string | null;
  progressPercent: number;
  sources: InstanceSource[];
  contentAttempts?: ContentAttempt[];
  assignment?: {
    lesson: {
      contentId: string | null;
    }
  };
}

interface AssignmentInstanceReportProps {
  assignmentId: string;
  assignmentTitle: string;
  onClose: () => void;
}

export const AssignmentInstanceReport: React.FC<AssignmentInstanceReportProps> = ({
  assignmentId,
  assignmentTitle,
  onClose,
}) => {
  const { t } = useTranslation();
  const [instances, setInstances] = useState<UserAssignmentInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInstances = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/assignments/${assignmentId}/instances`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || t('assignments.report.fetchError'));
        }
        const data = await response.json();
        setInstances(data);
      } catch (err: any) {
        setError(err.message || t('assignments.report.error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstances();
  }, [assignmentId, t]);

  // Source Type Formatter
  const renderSources = (sources: InstanceSource[]) => {
    if (!sources || sources.length === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
          {t('assignments.report.unknownSource')}
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {sources.map((src) => {
          let label: string = src.sourceType;
          let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';

          if (src.sourceType === 'SELF_ASSIGNED') {
            label = t('assignments.report.selfAssigned');
            colorClass = 'bg-teal-50 text-teal-700 border-teal-100';
          } else if (src.sourceType === 'MANDATORY') {
            label = t('assignments.report.mandatory');
            colorClass = 'bg-amber-50 text-amber-700 border-amber-100';
          } else if (src.sourceType === 'ORGANIZATION_UNIT' && src.sourceOrganizationUnit) {
            label = t('assignments.report.deptSource', { name: src.sourceOrganizationUnit.name });
            colorClass = 'bg-purple-50 text-purple-700 border-purple-100';
          } else if (src.sourceType === 'LEARNING_GROUP' && src.sourceLearningGroup) {
            label = t('assignments.report.groupSource', { name: src.sourceLearningGroup.name });
            colorClass = 'bg-blue-50 text-blue-700 border-blue-100';
          } else if (src.sourceType === 'MANUAL') {
            label = t('assignments.report.directManual');
            colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-100';
          }

          return (
            <span
              key={src.id}
              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${colorClass}`}
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  const isOverdue = (instance: UserAssignmentInstance) => {
    if (instance.status === 'COMPLETED' || !instance.dueDate) return false;
    return new Date(instance.dueDate) < new Date();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto"
      id="assignment-report-modal"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <span>{t('assignments.report.title')}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {t('assignments.report.lessonSubtitle', { title: assignmentTitle })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            id="close-report-btn"
            title={t('assignments.report.closeTooltip')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-slate-400 font-medium">{t('assignments.report.loading')}</p>
            </div>
          ) : error ? (
            <div className="flex items-center space-x-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          ) : instances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
              <User className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">{t('assignments.report.noInstances')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                <span>{t('assignments.report.userMergedSources')}</span>
                <span>{t('assignments.report.statusProgress')}</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl bg-white overflow-hidden shadow-xs">
                {instances.map((inst) => {
                  const overdue = isOverdue(inst);
                  return (
                    <div
                      key={inst.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 hover:bg-slate-50/40 transition-colors"
                    >
                      {/* Left: User & Sources */}
                      <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                            {inst.user.username?.charAt(0) || inst.user.email?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">
                              {inst.user.username || t('assignments.report.noUsername')}
                            </div>
                            <div className="text-xs text-slate-400">
                              {inst.user.email}
                            </div>
                          </div>
                        </div>

                        {/* Merged Sources - explicitly displaying all of them to prove acceptance */}
                        <div className="pl-10 flex flex-col gap-1">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {t('assignments.report.mergedSourcesTitle')}
                          </span>
                          {renderSources(inst.sources)}
                        </div>

                        {/* SCORM reporting details if SCORM-backed */}
                        {inst.assignment?.lesson?.contentId && (() => {
                          const attempts = inst.contentAttempts || [];
                          const attemptCount = attempts.length;
                          const latestAttempt = attempts[attempts.length - 1];
                          const lessonStatus = latestAttempt ? latestAttempt.lessonStatus : 'NOT STARTED';
                          const rawScore = latestAttempt ? latestAttempt.scoreRaw : null;
                          const scoreFormatted = rawScore !== null ? `${rawScore}` : 'N/A';
                          const totalSessionTime = attempts.reduce((sum, att) => sum + (att.sessionTimeSeconds || 0), 0);
                          
                          const formatTime = (seconds: number) => {
                            if (!seconds) return '0s';
                            const h = Math.floor(seconds / 3600);
                            const m = Math.floor((seconds % 3600) / 60);
                            const s = seconds % 60;
                            if (h > 0) return `${h}h ${m}m ${s}s`;
                            if (m > 0) return `${m}m ${s}s`;
                            return `${s}s`;
                          };

                          return (
                            <div className="pl-10 pt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 font-medium border-t border-slate-100 mt-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Attempts:</span>
                                <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{attemptCount}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Latest Status:</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                                  lessonStatus === 'PASSED' || lessonStatus === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : lessonStatus === 'FAILED'
                                    ? 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                }`}>
                                  {lessonStatus}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Score:</span>
                                <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{scoreFormatted}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Active Time:</span>
                                <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{formatTime(totalSessionTime)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right: Status, Progress, and Dates */}
                      <div className="flex flex-wrap items-center md:justify-end gap-x-6 gap-y-2 pl-10 md:pl-0">
                        {/* Dates */}
                        <div className="text-xs space-y-1 md:text-right">
                          {inst.dueDate && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {t('assignments.report.dueDate', { date: new Date(inst.dueDate).toLocaleDateString() })}
                              </span>
                              {overdue && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {t('assignments.report.overdue')}
                                </span>
                              )}
                            </div>
                          )}
                          {inst.completedAt && (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>
                                {t('assignments.report.completedDate', { date: new Date(inst.completedAt).toLocaleDateString() })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress */}
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>{t('assignments.report.progress')}</span>
                            <span className="text-slate-600">{inst.progressPercent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                inst.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${inst.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                              inst.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : inst.status === 'ACTIVE'
                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                : inst.status === 'SCHEDULED'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-slate-50 text-slate-500 border-slate-100'
                            }`}
                          >
                            {inst.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            {t('assignments.report.closeBtn')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
