import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Globe2,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldCheck,
  GitBranch,
  Layers,
  X,
  Plus,
} from 'lucide-react';
import { Offer, Campaign, KeitaroDefaults } from '../types';
import { api } from '../api';
import { useI18n } from '../i18n';
import { OfferAutocomplete } from './OfferAutocomplete';

const QUICK_GEOS = [
  { code: 'AU', flag: '🇦🇺', label: 'Australia' },
  { code: 'MX', flag: '🇲🇽', label: 'Mexico' },
  { code: 'RO', flag: '🇷🇴', label: 'Romania' },
  { code: 'US', flag: '🇺🇸', label: 'USA' },
  { code: 'IN', flag: '🇮🇳', label: 'India' },
  { code: 'PE', flag: '🇵🇪', label: 'Peru' },
  { code: 'CL', flag: '🇨🇱', label: 'Chile' },
  { code: 'DE', flag: '🇩🇪', label: 'Germany' },
  { code: 'BR', flag: '🇧🇷', label: 'Brazil' },
  { code: 'KZ', flag: '🇰🇿', label: 'Kazakhstan' },
];

interface CampaignCreatorProps {
  onCampaignCreated: (campaign: Campaign) => void;
  onError: (message: string) => void;
}

export const CampaignCreator: React.FC<CampaignCreatorProps> = ({
  onCampaignCreated,
  onError,
}) => {
  const { t } = useI18n();
  const [rawName, setRawName] = useState('');
  const [selectedGeos, setSelectedGeos] = useState<string[]>(['AU']);
  const [geoInput, setGeoInput] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [defaults, setDefaults] = useState<KeitaroDefaults | null>(null);

  useEffect(() => {
    api.getDefaults().then(setDefaults).catch(() => {});
  }, []);

  const computeFinalCampaignName = (input: string) => {
    const trimmed = input.trim();
    const prefix = 'test_pandey_';
    if (!trimmed) return `${prefix}promo1`;
    if (trimmed.toLowerCase().startsWith(prefix)) {
      return `${prefix}${trimmed.slice(prefix.length)}`;
    }
    return `${prefix}${trimmed}`;
  };

  const toggleGeo = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setSelectedGeos((prev) =>
      prev.includes(clean) ? prev.filter((c) => c !== clean) : [...prev, clean]
    );
  };

  const handleAddGeoInput = () => {
    const parts = geoInput
      .split(/[\s,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length >= 2 && s.length <= 3);
    if (parts.length > 0) {
      setSelectedGeos((prev) => {
        const next = [...prev];
        for (const p of parts) {
          if (!next.includes(p)) next.push(p);
        }
        return next;
      });
      setGeoInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawName.trim()) {
      onError(t.validationNameRequired);
      return;
    }

    // Also include any pending geoInput text
    const pendingGeos = geoInput
      .split(/[\s,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length >= 2 && s.length <= 3);
    const finalGeos = Array.from(new Set([...selectedGeos, ...pendingGeos]));

    if (finalGeos.length === 0) {
      onError(t.validationGeoRequired);
      return;
    }
    if (!selectedOffer) {
      onError(t.validationOfferRequired);
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createCampaign({
        name: rawName.trim(),
        geo: finalGeos,
        offer_id: selectedOffer.id,
        offer_name: selectedOffer.name,
      });
      setRawName('');
      setGeoInput('');
      onCampaignCreated(created);
    } catch (err: any) {
      onError(err?.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const finalNamePreview = computeFinalCampaignName(rawName);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-5 sm:px-6 rounded-t-2xl text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-400/30">
            <Sparkles className="h-3 w-3" />
            {t.creatorBadge}
          </span>
          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-mono text-indigo-200">
            POST /campaigns + /streams
          </span>
        </div>
        <h2 className="mt-2.5 text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Rocket className="h-5 w-5 text-indigo-400" />
          {t.creatorTitle}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {t.creatorDesc}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
        {/* 1. Campaign Name */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t.campaignNameLabel}
            </label>
            <span className="text-xs text-slate-500">
              {t.autoPrefixHint}{' '}
              <code className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono font-bold text-indigo-700">
                test_pandey_
              </code>
            </span>
          </div>
          <input
            type="text"
            value={rawName}
            onChange={(e) => setRawName(e.target.value)}
            placeholder={t.campaignNamePlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
          />
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 border border-slate-200/70">
            <span className="text-xs font-medium text-slate-500">
              {t.finalNamePreview}
            </span>
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 break-all">
              {finalNamePreview}
            </span>
          </div>
        </div>

        {/* 2. Geo Selector */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-indigo-600" />
              {t.geoLabel}
            </label>
            {selectedGeos.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-600">
                  {selectedGeos.length} {t.geoSelectedCount}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGeos([])}
                  className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors"
                >
                  {t.clearGeo}
                </button>
              </div>
            )}
          </div>

          {/* Selected Geo Chips + Custom Input */}
          <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedGeos.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
                >
                  {code}
                  <button
                    type="button"
                    onClick={() => toggleGeo(code)}
                    className="rounded-full p-0.5 hover:bg-indigo-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="flex flex-1 items-center min-w-[140px]">
                <input
                  type="text"
                  value={geoInput}
                  onChange={(e) => setGeoInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddGeoInput();
                    }
                  }}
                  onBlur={handleAddGeoInput}
                  placeholder={t.geoPlaceholder}
                  className="w-full border-0 bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {geoInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddGeoInput}
                    className="inline-flex items-center rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick-Select Geo Pills */}
          <div className="mt-2.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t.geoQuickSelect}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_GEOS.map((g) => {
                const active = selectedGeos.includes(g.code);
                return (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => toggleGeo(g.code)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all min-h-[34px] ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                    }`}
                  >
                    <span>{g.flag}</span>
                    <span>{g.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Offer Autocomplete */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            {t.initialOfferLabel}
          </label>
          <OfferAutocomplete
            selectedOffer={selectedOffer}
            onSelect={setSelectedOffer}
          />
        </div>

        {/* 4. Live Blueprint Preview */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {t.defaultsBoxTitle}
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              https://in.posdk.xyz/ • FORTESTS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white p-2 border border-slate-200/60">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                {t.defaultDomain}
              </span>
              <span className="font-semibold text-slate-800 truncate block">
                {defaults?.domain_name || 'in.posdk.xyz'}
              </span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-slate-200/60">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                {t.defaultGroup}
              </span>
              <span className="font-semibold text-slate-800 truncate block">
                {defaults?.group_name || 'FORTESTS'}
              </span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-slate-200/60">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                {t.defaultSource}
              </span>
              <span className="font-semibold text-slate-800 truncate block">
                {defaults?.traffic_source_name || 'FORTESTS'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <GitBranch className="h-3.5 w-3.5 text-amber-500" />
                {t.flow1PreviewTitle}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                {t.flow1PreviewDesc} (
                <span className="font-semibold text-slate-700">
                  {selectedGeos.join(', ') || '—'}
                </span>
                )
              </p>
            </div>
            <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/40 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                {t.flow2PreviewTitle}
              </div>
              <p className="mt-1 text-[11px] text-indigo-700/80 leading-snug truncate">
                {selectedOffer
                  ? `#${selectedOffer.id} (100%) — ${selectedOffer.name}`
                  : t.flow2PreviewDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none transition-all duration-200 min-h-[48px]"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t.creatingCampaignBtn}</span>
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              <span>{t.createCampaignBtn}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
