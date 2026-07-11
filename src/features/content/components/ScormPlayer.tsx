import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, AlertTriangle, ArrowLeft, Loader2, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { initializeScormApiBridge } from '../services/scormApiBridge.js';

interface ScormPlayerProps {
  userAssignmentInstanceId: string;
  onClose: () => void;
}

interface Lesson {
  id: string;
  title: string;
  completionRule: string;
  content: {
    id: string;
    launchFile: string;
    title: string;
  } | null;
}

interface Assignment {
  id: string;
  attemptLimit: number;
  lesson: Lesson;
}

interface UserAssignmentInstance {
  id: string;
  status: string;
  progressPercent: number;
  contentId?: string | null;
  content?: {
    id: string;
    launchFile: string;
    title: string;
  } | null;
  assignment: Assignment;
}

interface ContentAttempt {
  id: string;
  attemptNumber: number;
  lessonStatus: string;
  lessonLocation: string | null;
  suspendData: string | null;
  scoreRaw: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  objectives: Record<string, any> | null;
  interactions: Record<string, any> | null;
}

export const ScormPlayer: React.FC<ScormPlayerProps> = ({
  userAssignmentInstanceId,
  onClose,
}) => {
  const [instance, setInstance] = useState<UserAssignmentInstance | null>(null);
  const [attempts, setAttempts] = useState<ContentAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promptSelection, setPromptSelection] = useState<{
    incompleteAttempt: ContentAttempt;
    canRestart: boolean;
  } | null>(null);

  const [activeAttempt, setActiveAttempt] = useState<ContentAttempt | null>(null);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch assignment instance
      const instanceRes = await fetch(`/api/assignment-instances/${userAssignmentInstanceId}`);
      if (!instanceRes.ok) {
        const errData = await instanceRes.json();
        throw new Error(errData.error || 'Failed to load lesson details.');
      }
      const instanceData: UserAssignmentInstance = await instanceRes.json();
      setInstance(instanceData);

      if (!instanceData.content && !instanceData.assignment?.lesson?.content) {
        throw new Error('This lesson does not have any playable SCORM content package attached.');
      }

      // 2. Fetch attempt history
      const attemptsRes = await fetch(`/api/content-attempts/${userAssignmentInstanceId}`);
      if (!attemptsRes.ok) {
        const errData = await attemptsRes.json();
        throw new Error(errData.error || 'Failed to load lesson attempts.');
      }
      const attemptsData: ContentAttempt[] = await attemptsRes.json();
      setAttempts(attemptsData);

      // 3. Analyze attempts for incomplete one to resume
      const incomplete = attemptsData.find(
        (att) => !['COMPLETED', 'PASSED'].includes(att.lessonStatus)
      );

      const limit = instanceData.assignment.attemptLimit;
      const reachedLimit = limit > 0 && attemptsData.length >= limit;

      if (incomplete) {
        // We have an incomplete attempt to resume!
        // Can they restart? Only if they haven't reached the limit
        setPromptSelection({
          incompleteAttempt: incomplete,
          canRestart: !reachedLimit,
        });
      } else {
        // No incomplete attempt to resume.
        // If they reached the limit, block them
        if (reachedLimit) {
          setError(`You have reached the maximum allowed limit of ${limit} attempts for this lesson.`);
        } else {
          // Auto start a brand new attempt
          await handleStartNewAttempt(instanceData, attemptsData.length);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error initializing SCORM Player.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userAssignmentInstanceId]);

  const getCookie = (name: string): string => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };

  const handleStartNewAttempt = async (
    inst: UserAssignmentInstance,
    currentAttemptCount: number
  ) => {
    setIsLaunching(true);
    setError(null);
    try {
      const limit = inst.assignment.attemptLimit;
      if (limit > 0 && currentAttemptCount >= limit) {
        throw new Error(`Cannot start new attempt. Maximum limit of ${limit} attempts reached.`);
      }

      const res = await fetch('/api/content-attempts/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ userAssignmentInstanceId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initiate content attempt.');
      }

      const newAttempt: ContentAttempt = await res.json();
      launchAttempt(newAttempt, inst);
    } catch (err: any) {
      setError(err.message || 'Failed to start lesson.');
    } finally {
      setIsLaunching(false);
    }
  };

  const handleResumeAttempt = (attempt: ContentAttempt) => {
    if (!instance) return;
    setPromptSelection(null);
    launchAttempt(attempt, instance);
  };

  const handleRestartAttempt = async () => {
    if (!instance) return;
    setPromptSelection(null);
    await handleStartNewAttempt(instance, attempts.length);
  };

  const launchAttempt = (attempt: ContentAttempt, inst: UserAssignmentInstance) => {
    const content = inst.content || inst.assignment.lesson.content;
    if (!content) return;

    // Build the initial CMI object
    const initialCmi: Record<string, string> = {
      'cmi.core.lesson_status': attempt.lessonStatus.toLowerCase().replace('_', ' '),
      'cmi.core.lesson_location': attempt.lessonLocation || '',
      'cmi.core.score.raw': attempt.scoreRaw !== null ? String(attempt.scoreRaw) : '',
      'cmi.core.score.min': attempt.scoreMin !== null ? String(attempt.scoreMin) : '',
      'cmi.core.score.max': attempt.scoreMax !== null ? String(attempt.scoreMax) : '',
      'cmi.suspend_data': attempt.suspendData || '',
    };

    // Include objectives and interactions
    if (attempt.objectives) {
      Object.entries(attempt.objectives).forEach(([k, v]) => {
        initialCmi[k] = String(v);
      });
    }
    if (attempt.interactions) {
      Object.entries(attempt.interactions).forEach(([k, v]) => {
        initialCmi[k] = String(v);
      });
    }

    // Initialize the window.API bridge
    initializeScormApiBridge(attempt.id, initialCmi);

    // Set the launch URL
    const url = `/content-files/${content.id}/${content.launchFile}`;
    setActiveAttempt(attempt);
    setLaunchUrl(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4" id="scorm-player-loading">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Preparing your SCORM player...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-100 shadow-xl p-8 text-center space-y-6" id="scorm-player-error">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-rose-50 text-rose-500">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 font-sans">Launch Blocked</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to My Lessons</span>
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Resume or Restart selector screen
  if (promptSelection) {
    const { incompleteAttempt, canRestart } = promptSelection;
    const limit = instance?.assignment.attemptLimit || 0;

    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-100 shadow-xl p-8" id="scorm-player-prompt">
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 text-blue-600">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-800 font-sans">Resume Lesson?</h2>
            <p className="text-sm text-slate-400 font-medium">
              You have an incomplete attempt in progress.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs text-slate-500 mb-8">
          <div className="flex justify-between font-semibold">
            <span>Attempt Number:</span>
            <span className="font-mono text-slate-700">#{incompleteAttempt.attemptNumber}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Last Status:</span>
            <span className="font-mono text-slate-700 uppercase">{incompleteAttempt.lessonStatus}</span>
          </div>
          {incompleteAttempt.lessonLocation && (
            <div className="flex justify-between font-semibold">
              <span>Bookmark Location:</span>
              <span className="font-mono text-slate-700">{incompleteAttempt.lessonLocation}</span>
            </div>
          )}
          {limit > 0 && (
            <div className="flex justify-between font-semibold border-t border-slate-250/50 pt-2 mt-2">
              <span>Attempt Limit Usage:</span>
              <span className="text-amber-600 font-bold">
                {attempts.length} of {limit} used
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleResumeAttempt(incompleteAttempt)}
            disabled={isLaunching}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Resume (Recommended)</span>
          </button>

          {canRestart ? (
            <button
              onClick={handleRestartAttempt}
              disabled={isLaunching}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all shadow-xs"
            >
              {isLaunching ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              <span>Start New Attempt</span>
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium leading-normal">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span>Restart unavailable: max attempt limit reached.</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors underline"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    );
  }

  // Active playing view inside the iframe
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] w-full bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden" id="scorm-player-active">
      {/* Player Header Bar */}
      <div className="flex items-center justify-between bg-slate-950 px-6 py-4 border-b border-slate-800 text-slate-300">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 hover:text-white rounded-xl transition-colors"
            title="Exit Player"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-white font-sans truncate max-w-md">
              {instance?.assignment?.lesson?.title}
            </h2>
            <p className="text-[10px] font-mono text-slate-500 font-semibold uppercase tracking-wider">
              Attempt #{activeAttempt?.attemptNumber} • Active Session
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-400">
            SCORM 1.2
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg transition-colors border border-slate-750"
          >
            Exit & Save
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 bg-white relative">
        {launchUrl && (
          <iframe
            src={launchUrl}
            className="w-full h-full border-none absolute inset-0"
            title="SCORM Package Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
};
