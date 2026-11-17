import React, { useState, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Columns,
  Rocket,
  Sliders,
} from 'lucide-react';
import { Campaign, ToastMessage } from './types';
import { useI18n } from './i18n';
import { CampaignCreator } from './components/CampaignCreator';
import { CampaignEditor } from './components/CampaignEditor';

type ViewMode = 'split' | 'creator' | 'editor';

export const App: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (
      type: ToastMessage['type'],
      title: string,
      description?: string,
      actionLabel?: string,
      onAction?: () => void
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [
        ...prev.slice(-3),
        { id, type, title, description, actionLabel, onAction },
      ]);
      setTimeout(() => {
        dismissToast(id);
      }, 6500);
    },
    [dismissToast]
  );

  const handleCampaignCreated = (created: Campaign) => {
    setRefreshTrigger((n) => n + 1);
    setActiveCampaign(created);

    addToast(
      'success',
      `${t.toastCampaignCreatedTitle} (${created.name})`,
      t.toastCampaignCreatedDesc,
      t.toastOpenInEditorBtn,
      () => {
        setActiveCampaign(created);
        if (window.innerWidth < 1024) {
          setViewMode('editor');
        }
        const editorEl = document.getElementById('campaign-editor-panel');
        if (editorEl) {
          editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Executive Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 truncate">
                    {t.appTitle}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t.liveSandbox}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate hidden sm:block">
                  {t.appSubtitle}
                </p>
              </div>
            </div>

            {/* Right Controls: View Switcher + Bilingual Toggle (EN / RU) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Workspace View Switcher */}
              <div className="hidden md:flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    viewMode === 'split'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns className="h-3.5 w-3.5" />
                  <span>{t.tabSplit}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('creator')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    viewMode === 'creator'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Rocket className="h-3.5 w-3.5" />
                  <span>{t.tabCreator}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    viewMode === 'editor'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>{t.tabEditor}</span>
                </button>
              </div>

              {/* Sleek Bilingual Switcher Pill (🇬🇧 EN | 🇷🇺 RU) */}
              <div
                className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-inner"
                role="group"
                aria-label="Language switcher"
              >
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all min-h-[34px] ${
                    lang === 'en'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>EN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLang('ru')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all min-h-[34px] ${
                    lang === 'ru'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>🇷🇺</span>
                  <span>RU</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile View Tabs */}
          <div className="flex md:hidden items-center gap-1.5 pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                viewMode === 'split'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>{t.tabSplit}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('creator')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                viewMode === 'creator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>{t.tabCreator}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                viewMode === 'editor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{t.tabEditor}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">
              <CampaignCreator
                onCampaignCreated={handleCampaignCreated}
                onError={(msg) => addToast('error', t.toastErrorTitle, msg)}
              />
            </div>
            <div id="campaign-editor-panel" className="lg:col-span-7">
              <CampaignEditor
                activeCampaign={activeCampaign}
                onCampaignLoaded={setActiveCampaign}
                refreshTrigger={refreshTrigger}
                onNotify={(type, title, desc) => addToast(type, title, desc)}
              />
            </div>
          </div>
        ) : viewMode === 'creator' ? (
          <div className="mx-auto max-w-2xl">
            <CampaignCreator
              onCampaignCreated={handleCampaignCreated}
              onError={(msg) => addToast('error', t.toastErrorTitle, msg)}
            />
          </div>
        ) : (
          <div id="campaign-editor-panel" className="mx-auto max-w-4xl">
            <CampaignEditor
              activeCampaign={activeCampaign}
              onCampaignLoaded={setActiveCampaign}
              refreshTrigger={refreshTrigger}
              onNotify={(type, title, desc) => addToast(type, title, desc)}
            />
          </div>
        )}
      </main>

      {/* Floating Toast Notification Stack */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
        {toasts.map((toast) => {
          const iconMap = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
            info: <Info className="h-5 w-5 text-indigo-500 shrink-0" />,
            warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
          };
          return (
            <div
              key={toast.id}
              className="pointer-events-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-black/5 transition-all"
            >
              <div className="flex items-start gap-3">
                {iconMap[toast.type]}
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                      {toast.description}
                    </p>
                  )}
                  {toast.actionLabel && toast.onAction && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.onAction?.();
                        dismissToast(toast.id);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                    >
                      {toast.actionLabel}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
