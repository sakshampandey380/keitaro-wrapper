import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Trash2,
  RotateCcw,
  UploadCloud,
  XCircle,
  Plus,
  Loader2,
  Ban,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Stream, StreamOffer, Offer } from '../types';
import { api } from '../api';
import { useI18n } from '../i18n';
import { OfferAutocomplete } from './OfferAutocomplete';

const BAR_COLORS = [
  'bg-indigo-600',
  'bg-violet-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
];

interface StreamCardProps {
  stream: Stream;
  onStreamUpdated: (updated: Stream) => void;
  onNotify: (type: 'success' | 'error' | 'info' | 'warning', title: string, desc?: string) => void;
}

export const StreamCard: React.FC<StreamCardProps> = ({
  stream,
  onStreamUpdated,
  onNotify,
}) => {
  const { t } = useI18n();
  const [selectedOfferToAdd, setSelectedOfferToAdd] = useState<Offer | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [editingShares, setEditingShares] = useState<Record<number, string>>({});

  // 1. Streams WITHOUT offers: compact ignored card (no redirect URLs or filters shown)
  if (!stream.has_offers) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-5 py-4 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500">
              <Ban className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-slate-400">
                  #{stream.keitaro_id}
                </span>
                <h4 className="text-sm font-bold text-slate-700 truncate">
                  {stream.name}
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t.redirectIgnoredSub}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600 shrink-0">
            <Ban className="h-3.5 w-3.5 text-slate-500" />
            {t.redirectIgnoredBadge}
          </span>
        </div>
      </div>
    );
  }

  const activeOffers = stream.offers.filter((o) => o.status === 'active');
  const removedOffers = stream.offers.filter((o) => o.status === 'removed');
  const totalActiveShare = activeOffers.reduce((acc, o) => acc + (o.share || 0), 0);

  const handleAddOffer = async () => {
    if (!selectedOfferToAdd) return;
    setBusyAction('add');
    try {
      const updated = await api.addOfferToStream(stream.id, {
        offer_id: selectedOfferToAdd.id,
        offer_name: selectedOfferToAdd.name,
      });
      setSelectedOfferToAdd(null);
      onStreamUpdated(updated);
      onNotify('info', t.toastOfferAddedTitle, t.toastOfferAddedDesc);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveOffer = async (so: StreamOffer) => {
    setBusyAction(`remove-${so.id}`);
    try {
      const updated = await api.removeOfferFromStream(stream.id, so.id);
      onStreamUpdated(updated);
      onNotify('warning', t.toastOfferRemovedTitle, t.toastOfferRemovedDesc);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRestoreOffer = async (so: StreamOffer) => {
    setBusyAction(`restore-${so.id}`);
    try {
      const updated = await api.restoreOfferInStream(stream.id, so.id);
      onStreamUpdated(updated);
      onNotify('info', t.toastOfferRestoredTitle, t.toastOfferRestoredDesc);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleTogglePin = async (so: StreamOffer) => {
    setBusyAction(`pin-${so.id}`);
    try {
      const nextPinned = !so.is_pinned;
      const updated = await api.pinOrUpdateOfferShare(stream.id, so.id, {
        is_pinned: nextPinned,
        share: so.share,
      });
      onStreamUpdated(updated);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleCommitCustomShare = async (so: StreamOffer, newShareVal: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newShareVal)));
    setBusyAction(`share-${so.id}`);
    try {
      const updated = await api.pinOrUpdateOfferShare(stream.id, so.id, {
        is_pinned: true,
        share: clamped,
      });
      setEditingShares((prev) => {
        const copy = { ...prev };
        delete copy[so.id];
        return copy;
      });
      onStreamUpdated(updated);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handlePushStream = async () => {
    setBusyAction('push');
    try {
      const updated = await api.pushStreamToKeitaro(stream.id);
      onStreamUpdated(updated);
      onNotify('success', t.toastStreamPushedTitle, t.toastStreamPushedDesc);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancelStream = async () => {
    setBusyAction('cancel');
    try {
      const updated = await api.cancelStreamChanges(stream.id);
      setEditingShares({});
      onStreamUpdated(updated);
      onNotify('info', t.toastStreamCancelledTitle, t.toastStreamCancelledDesc);
    } catch (err: any) {
      onNotify('error', t.toastErrorTitle, err?.message);
    } finally {
      setBusyAction(null);
    }
  };

  const activeOfferIds = activeOffers.map((o) => o.offer_id);

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-6 transition-all duration-300 ${
        stream.is_dirty
          ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300/50 shadow-md'
          : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
      }`}
    >
      {/* Stream Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/70">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-sm transition-colors ${
              stream.is_dirty
                ? 'bg-amber-500 text-white'
                : 'bg-indigo-600 text-white'
            }`}
          >
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                #{stream.keitaro_id}
              </span>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {stream.name}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span>
                {t.activeOffersCount}:{' '}
                <strong className="text-slate-800">{activeOffers.length}</strong>
              </span>
              {removedOffers.length > 0 && (
                <span>
                  • {t.removedOffersCount}:{' '}
                  <strong className="text-slate-600">{removedOffers.length}</strong>
                </span>
              )}
              <span>
                • {t.totalWeightLabel}{' '}
                <strong
                  className={
                    totalActiveShare === 100
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }
                >
                  {totalActiveShare}%
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge + Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {stream.is_dirty ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-500/40 animate-pulse-subtle">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              {t.unpublishedBadge}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {t.syncedBadge}
            </span>
          )}
        </div>
      </div>

      {/* Prominent Unpublished Action Bar (when stream.is_dirty is True) */}
      {stream.is_dirty && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-amber-100/90 border border-amber-300 px-4 py-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-950">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t.unpublishedBadge} — PUT /streams/{stream.keitaro_id}</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleCancelStream}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50 min-h-[44px] transition-all"
            >
              {busyAction === 'cancel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 text-slate-500" />
              )}
              <span>{busyAction === 'cancel' ? t.cancellingBtn : t.cancelChangesBtn}</span>
            </button>

            <button
              type="button"
              disabled={busyAction !== null || activeOffers.length === 0}
              onClick={handlePushStream}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 min-h-[44px] transition-all"
            >
              {busyAction === 'push' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              <span>{busyAction === 'push' ? t.pushingBtn : t.pushToKeitaroBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Multi-Segment Traffic Split Progress Bar */}
      {activeOffers.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
            <span>{t.trafficDistributionLabel}</span>
            <span>{totalActiveShare}%</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5 gap-0.5">
            {activeOffers.map((so, idx) => {
              const colorClass = BAR_COLORS[idx % BAR_COLORS.length];
              return (
                <div
                  key={so.id}
                  style={{ width: `${Math.max(so.share, 2)}%` }}
                  className={`${colorClass} h-full first:rounded-l-full last:rounded-r-full transition-all duration-500`}
                  title={`#${so.offer_id}: ${so.share}%`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Offer Rows List */}
      <div className="mt-4 space-y-2.5">
        {stream.offers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-xs text-slate-500">
            {t.noOffersInStream}
          </div>
        ) : (
          stream.offers.map((so, idx) => {
            const isRemoved = so.status === 'removed';
            const colorClass = BAR_COLORS[idx % BAR_COLORS.length];
            const draftShareStr =
              editingShares[so.id] !== undefined
                ? editingShares[so.id]
                : String(so.share);

            if (isRemoved) {
              // Greyed-out Removed Offer Row
              return (
                <div
                  key={so.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 opacity-60 text-slate-400 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-slate-300 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
                        #{so.offer_id}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        0%
                      </span>
                      <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        {t.archivedBadge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 line-through break-words">
                      {so.offer_name}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleRestoreOffer(so)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 opacity-100 min-h-[44px] shrink-0 transition-all"
                  >
                    {busyAction === `restore-${so.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    <span>{t.bringBackBtn}</span>
                  </button>
                </div>
              );
            }

            // Active Offer Row
            return (
              <div
                key={so.id}
                className={`rounded-xl border p-3.5 transition-all ${
                  so.is_pinned
                    ? 'border-indigo-300 bg-indigo-50/40 shadow-sm'
                    : 'border-slate-200/90 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left: Offer ID + Name + Status Badges */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-white">
                        #{so.offer_id}
                      </span>

                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-extrabold ${
                          so.is_pinned
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}
                      >
                        {so.share}%
                      </span>

                      {so.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                          <Lock className="h-3 w-3" />
                          {t.pinnedLabel}
                        </span>
                      )}

                      {!so.is_published && (
                        <span className="inline-flex items-center rounded-md bg-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          {t.newUnpublishedBadge}
                        </span>
                      )}

                      {so.is_published &&
                        so.published_share !== null &&
                        so.published_share !== undefined &&
                        so.published_share !== so.share && (
                          <span className="text-[11px] font-medium text-slate-400">
                            ({t.wasShareLabel} {so.published_share}%)
                          </span>
                        )}
                    </div>

                    <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-800 break-words leading-snug">
                      {so.offer_name}
                    </p>

                    {/* Individual Animated Percentage Bar */}
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        style={{ width: `${so.share}%` }}
                        className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                      />
                    </div>
                  </div>

                  {/* Right: Pin Lock + Weight Slider/Input + Remove Button */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Editable Weight Slider + Input */}
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-200/80 flex-1 sm:flex-initial">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Number(draftShareStr) || 0}
                        onChange={(e) => {
                          setEditingShares((prev) => ({
                            ...prev,
                            [so.id]: e.target.value,
                          }));
                        }}
                        onMouseUp={(e) =>
                          handleCommitCustomShare(
                            so,
                            Number((e.target as HTMLInputElement).value)
                          )
                        }
                        onTouchEnd={(e) =>
                          handleCommitCustomShare(
                            so,
                            Number((e.target as HTMLInputElement).value)
                          )
                        }
                        className="w-20 sm:w-24 accent-indigo-600 cursor-pointer"
                        title={t.pinWeightTooltip}
                      />
                      <div className="flex items-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={draftShareStr}
                          onChange={(e) =>
                            setEditingShares((prev) => ({
                              ...prev,
                              [so.id]: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            if (
                              editingShares[so.id] !== undefined &&
                              Number(editingShares[so.id]) !== so.share
                            ) {
                              handleCommitCustomShare(
                                so,
                                Number(editingShares[so.id])
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCommitCustomShare(so, Number(draftShareStr));
                            }
                          }}
                          className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                        />
                        <span className="ml-1 text-xs font-bold text-slate-500">%</span>
                      </div>
                    </div>

                    {/* Pin / Unpin Button */}
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => handleTogglePin(so)}
                      title={so.is_pinned ? t.unpinWeightTooltip : t.pinWeightTooltip}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all min-h-[44px] ${
                        so.is_pinned
                          ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {busyAction === `pin-${so.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : so.is_pinned ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">{t.pinnedLabel}</span>
                    </button>

                    {/* Remove Button */}
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => handleRemoveOffer(so)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200/80 hover:bg-rose-100 transition-all min-h-[44px]"
                    >
                      {busyAction === `remove-${so.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span>{t.removeOfferBtn}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Offer to Stream Footer */}
      <div className="mt-5 pt-4 border-t border-slate-200/70">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
          {t.addOfferSectionLabel}
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1">
            <OfferAutocomplete
              selectedOffer={selectedOfferToAdd}
              onSelect={setSelectedOfferToAdd}
              excludeOfferIds={activeOfferIds}
              compact
            />
          </div>
          <button
            type="button"
            disabled={!selectedOfferToAdd || busyAction !== null}
            onClick={handleAddOffer}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 min-h-[44px] shrink-0 transition-all"
          >
            {busyAction === 'add' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.addingOfferBtn}</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>{t.addOfferBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
