/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, AlertCircle, Eye, RefreshCw, X } from 'lucide-react';

interface ContentCategory {
  id: string;
  name: string;
}

interface ContentPackage {
  id: string;
  providerType: string;
  title: string;
  description: string | null;
  launchFile: string;
  version: number;
  author: string | null;
  language: string | null;
  category: ContentCategory | null;
}

interface ScormPreviewPlayerProps {
  contentId: string;
}

export const ScormPreviewPlayer: React.FC<ScormPreviewPlayerProps> = ({ contentId }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState<ContentPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Inject lightweight standalone stub SCORM 1.2 API for parent/top iframe lookup
    const inMemoryCmi: Record<string, string> = {
      'cmi.core.student_id': 'preview-user',
      'cmi.core.student_name': 'Preview Mode Learner',
      'cmi.core.lesson_status': 'incomplete',
      'cmi.core.lesson_location': '',
      'cmi.core.credit': 'no-credit',
      'cmi.core.entry': '',
      'cmi.core.score.raw': '',
      'cmi.core.score.min': '',
      'cmi.core.score.max': '',
      'cmi.core.total_time': '0000:00:00.00',
      'cmi.core.lesson_mode': 'browse',
      'cmi.core.exit': '',
      'cmi.core.session_time': '0000:00:00.00',
      'cmi.suspend_data': '',
      'cmi.comments': '',
      'cmi.comments_from_lms': '',
    };

    const stubScormApi = {
      LMSInitialize: (param: string) => {
        return 'true';
      },
      LMSFinish: (param: string) => {
        return 'true';
      },
      LMSGetValue: (element: string) => {
        return inMemoryCmi[element] ?? '';
      },
      LMSSetValue: (element: string, value: string) => {
        inMemoryCmi[element] = String(value);
        return 'true';
      },
      LMSCommit: (param: string) => {
        return 'true';
      },
      LMSGetLastError: () => {
        return '0';
      },
      LMSGetErrorString: (errorCode: string) => {
        return 'No error';
      },
      LMSGetDiagnostic: (errorCode: string) => {
        return 'No error';
      },
    };

    // Attach to window so child iframe can locate window.parent.API / window.top.API
    (window as any).API = stubScormApi;

    return () => {
      delete (window as any).API;
    };
  }, []);

  const fetchContent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t('previewPlayer.fetchError'));
      }
      const data = await res.json();
      setContent(data);
    } catch (err: any) {
      setError(err.message || t('previewPlayer.fetchError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contentId) {
      fetchContent();
    }
  }, [contentId]);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      window.location.href = '/#management';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white space-y-4" id="scorm-preview-loading">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-sm font-semibold text-slate-400">{t('previewPlayer.loadingPackage')}</p>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" id="scorm-preview-error">
        <div className="max-w-md w-full bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-sans">{t('previewPlayer.loadFailedTitle')}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{error || t('previewPlayer.packageNotFound')}</p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-sm rounded-xl transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('previewPlayer.closeBtn')}</span>
            </button>
            <button
              onClick={fetchContent}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{t('previewPlayer.tryAgainBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const launchUrl = `/content-files/${content.id}/${content.launchFile}`;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden" id="scorm-preview-player-root">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-6 py-3.5 border-b border-slate-800 text-slate-200 flex-shrink-0 z-10">
        <div className="flex items-center space-x-3.5 min-w-0">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 hover:text-white rounded-xl text-slate-400 transition-colors"
            title={t('previewPlayer.closeTooltip')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white font-sans truncate max-w-md">
                {content.title}
              </h1>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                v{content.version}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-amber-400/90 flex items-center gap-1.5 mt-0.5">
              <Eye className="h-3 w-3" />
              <span>{t('previewPlayer.nonTrackedNotice')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 text-amber-300">
            {t('previewPlayer.badgePreview')}
          </span>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-blue-500/30 bg-blue-500/10 text-blue-400">
            SCORM 1.2
          </span>
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-colors border border-slate-700"
          >
            <X className="h-3.5 w-3.5" />
            <span>{t('previewPlayer.closeBtn')}</span>
          </button>
        </div>
      </header>

      {/* Frame Container */}
      <main className="flex-1 bg-white relative">
        <iframe
          src={launchUrl}
          className="w-full h-full border-none absolute inset-0"
          title={t('previewPlayer.iframeTitle', { title: content.title })}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </main>
    </div>
  );
};
