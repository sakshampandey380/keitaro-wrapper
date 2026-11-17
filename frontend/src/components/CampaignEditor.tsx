import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  RefreshCw,
  Search,
  ChevronDown,
  Database,
  Globe,
  Layers,
  Loader2,
  UploadCloud,
  XCircle,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Campaign, CampaignListItem, Stream } from '../types';
import { api } from '../api';
import { useI18n } from '../i18n';
import { StreamCard } from './StreamCard';

interface CampaignEditorProps {
  activeCampaign: Campaign | null;
  onCampaignLoaded: (campaign: Campaign) => void;
  refreshTrigger: number;
  onNotify: (type: 'success' | 'error' | 'info' | 'warning', title: string, desc?: string) => void;
}

export const CampaignEditor: React.FC<CampaignEditorProps> = ({
  activeCampaign,
  onCampaignLoaded,
  refreshTrigger,
  onNotify,
}) => {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeitaroId, setSelectedKeitaroId] = useState<number | null>(
    activeCampaign?.keitaro_id || null
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [fetchingStreams, setFetchingStreams] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCampaign) {
      setSelectedKeitaroId(activeCampaign.keitaro_id);
    }
  }, [activeCampaign]);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      setLoadingList(true);
      try {
        const list = await api.listCampaigns(searchQuery, 120);
        if (mounted) {
          setCampaigns(list);
          if (!selectedKeitaroId && list.length > 0 && !activeCampaign) {
            setSelectedKeitaroId(list[0].keitaro_id);
          }
        }
      } catch {
        // ignore list error silently
      } finally {
        if (mounted) setLoadingList(false);
      }
    }, 200);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, refreshTrigger]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleFetchStreams = async (targetKeitaroId?: number) => {
    const kid = targetKeitaroId ?? selectedKeitaroId;
    if (!kid) return;
    setFetchingStreams(true);
    try {
      const synced = await api.fetchCampaignStreams(kid);
      onCampaignLoaded(synced);
      onNotify('success', t.toastStreamsFetchedTitle, t.toastStreamsFetchedDesc);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setFetchingStreams(false);
    }
  };

  const handleStreamUpdated = (updatedStream: Stream) => {
    if (!activeCampaign) return;
    const updatedStreams = activeCampaign.streams.map((s) =>
      s.id === updatedStream.id ? updatedStream : s
    );
    onCampaignLoaded({
      ...activeCampaign,
      streams: updatedStreams,
    });
  };

  const dirtyStreams = activeCampaign
    ? activeCampaign.streams.filter((s) => s.is_dirty && s.has_offers)
    : [];

  const handlePushAllDirty = async () => {
    if (dirtyStreams.length === 0) return;
    setBulkBusy(true);
    try {
      for (const s of dirtyStreams) {
        const updated = await api.pushStreamToKeitaro(s.id);
        handleStreamUpdated(updated);
      }
      onNotify('success', t.toastStreamPushedTitle, t.toastStreamPushedDesc);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleCancelAllDirty = async () => {
    if (dirtyStreams.length === 0) return;
    setBulkBusy(true);
    try {
      for (const s of dirtyStreams) {
        const updated = await api.cancelStreamChanges(s.id);
        handleStreamUpdated(updated);
      }
      onNotify('info', t.toastStreamCancelledTitle, t.toastStreamCancelledDesc);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const selectedListItem =
    campaigns.find((c) => c.keitaro_id === selectedKeitaroId) ||
    (activeCampaign
      ? {
          keitaro_id: activeCampaign.keitaro_id,
          name: activeCampaign.name,
          alias: activeCampaign.alias,
          geo: activeCampaign.geo,
          is_local: true,
          dirty_streams_count: dirtyStreams.length,
          streams_count: activeCampaign.streams.length,
        }
      : null);

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      {/* Top Selector Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 px-5 py-5 sm:px-6 rounded-t-2xl text-white">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
              <Sliders className="h-3 w-3" />
              {t.editorBadge}
            </span>
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-mono text-slate-200">
              GET /campaigns/{'{id}'}/streams • PUT /streams/{'{id}'}
            </span>
          </div>
          <h2 className="mt-2.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            {t.editorTitle}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t.editorDesc}
          </p>
        </div>

        {/* Campaign Selector + Fetch Streams Button */}
        <div className="p-5 sm:p-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            {t.selectCampaignLabel}
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Custom Searchable Campaign Dropdown */}
            <div ref={dropdownRef} className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-slate-900 shadow-sm hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[46px]"
              >
                {selectedListItem ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white shrink-0">
                      #{selectedListItem.keitaro_id}
                    </span>
                    <span className="truncate font-semibold text-slate-900">
                      {selectedListItem.name}
                    </span>
                    {selectedListItem.is_local && (
                      <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 shrink-0">
                        <Database className="h-3 w-3" />
                        {t.localDbBadge}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">{t.campaignSearchPlaceholder}</span>
                )}
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              </button>

              {dropdownOpen && (
                <div className="absolute z-40 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5">
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.campaignSearchPlaceholder}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {loadingList && campaigns.length === 0 ? (
                      <div className="flex items-center justify-center py-6 text-xs text-slate-500 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      campaigns.map((c) => {
                        const isSelected = c.keitaro_id === selectedKeitaroId;
                        return (
                          <button
                            key={c.keitaro_id}
                            type="button"
                            onClick={() => {
                              setSelectedKeitaroId(c.keitaro_id);
                              setDropdownOpen(false);
                              handleFetchStreams(c.keitaro_id);
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-950 font-semibold'
                                : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-700">
                                  #{c.keitaro_id}
                                </span>
                                <span className="truncate font-semibold text-slate-900">
                                  {c.name}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                                {c.is_local ? (
                                  <span className="text-indigo-600 font-semibold">
                                    • {t.localDbBadge}
                                  </span>
                                ) : (
                                  <span>• {t.remoteKeitaroBadge}</span>
                                )}
                                {c.geo && <span>• Geo: {c.geo}</span>}
                                {c.dirty_streams_count > 0 && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.2 font-bold text-amber-800">
                                    {c.dirty_streams_count} {t.unpublishedStreamsCount}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Fetch Streams Button */}
            <button
              type="button"
              disabled={!selectedKeitaroId || fetchingStreams}
              onClick={() => handleFetchStreams()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 min-h-[46px] shrink-0 transition-all"
            >
              <RefreshCw
                className={`h-4 w-4 ${fetchingStreams ? 'animate-spin' : ''}`}
              />
              <span>
                {fetchingStreams ? t.fetchingStreamsBtn : t.fetchStreamsBtn}
              </span>
            </button>
          </div>

          {/* Active Campaign Metadata Bar */}
          {activeCampaign && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 border border-slate-200/80 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-500">
                  {t.campaignIdLabel}{' '}
                  <strong className="font-mono text-slate-900">
                    #{activeCampaign.keitaro_id}
                  </strong>
                </span>
                {activeCampaign.alias && (
                  <span className="text-slate-500">
                    • {t.aliasLabel}{' '}
                    <strong className="font-mono text-slate-800">
                      {activeCampaign.alias}
                    </strong>
                  </span>
                )}
                {activeCampaign.geo && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                    <Globe className="h-3 w-3" />
                    {t.geoTagLabel} {activeCampaign.geo}
                  </span>
                )}
              </div>
              <span className="font-semibold text-slate-600">
                {t.streamsFound}: {activeCampaign.streams.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Streams List or Empty State */}
      {!activeCampaign ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-800">
            {t.noCampaignSelectedTitle}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-slate-500">
            {t.noCampaignSelectedDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeCampaign.streams.map((stream) => (
            <StreamCard
              key={stream.id}
              stream={stream}
              onStreamUpdated={handleStreamUpdated}
              onNotify={onNotify}
            />
          ))}
        </div>
      )}

      {/* Sticky Mobile Bottom Action Bar when any stream has unpublished changes */}
      {dirtyStreams.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-amber-300 bg-amber-50/95 backdrop-blur-md px-4 py-3 shadow-2xl">
          <div className="mx-auto max-w-lg flex flex-col gap-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-950">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>
                {dirtyStreams.length} {t.mobileUnsavedBannerTitle}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={handleCancelAllDirty}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-300 min-h-[44px]"
              >
                <XCircle className="h-4 w-4 text-slate-500" />
                <span>{t.mobileCancelAllBtn}</span>
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={handlePushAllDirty}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow-md min-h-[44px]"
              >
                {bulkBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                <span>{t.mobilePushAllBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
