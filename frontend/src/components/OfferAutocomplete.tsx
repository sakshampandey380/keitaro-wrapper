import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, X, Loader2, Tag, Globe } from 'lucide-react';
import { Offer } from '../types';
import { api } from '../api';
import { useI18n } from '../i18n';

interface OfferAutocompleteProps {
  selectedOffer: Offer | null;
  onSelect: (offer: Offer | null) => void;
  placeholder?: string;
  excludeOfferIds?: number[];
  compact?: boolean;
}

export const OfferAutocomplete: React.FC<OfferAutocompleteProps> = ({
  selectedOffer,
  onSelect,
  placeholder,
  excludeOfferIds = [],
  compact = false,
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchOffers(query, 40);
        if (active) {
          setOffers(res);
        }
      } catch {
        if (active) setOffers([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOffers = offers.filter((o) => !excludeOfferIds.includes(o.id));

  if (selectedOffer && !compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm shrink-0">
            #{selectedOffer.id}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              {t.offerSelectedBadge}
            </div>
            <div className="truncate text-sm font-medium text-slate-900" title={selectedOffer.name}>
              {selectedOffer.name}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery('');
            setOpen(true);
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 min-h-[36px] shrink-0"
        >
          <X className="h-3.5 w-3.5" />
          {t.changeOffer}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={selectedOffer && compact ? `#${selectedOffer.id} — ${selectedOffer.name}` : query}
          onFocus={() => {
            if (selectedOffer && compact) {
              onSelect(null);
            }
            setOpen(true);
          }}
          onChange={(e) => {
            if (selectedOffer) onSelect(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder || t.offerSearchPlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px] transition-all"
        />
        {loading ? (
          <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-indigo-500" />
        ) : (query || selectedOffer) ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onSelect(null);
              setOpen(true);
            }}
            className="absolute right-2.5 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open && (
        <div className="absolute z-40 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
          {loading && filteredOffers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>{t.offerSearching}</span>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              {t.offerNoResults}
            </div>
          ) : (
            filteredOffers.map((offer) => {
              const isSelected = selectedOffer?.id === offer.id;
              const countries = Array.isArray(offer.country)
                ? offer.country.join(', ')
                : offer.country || '';
              return (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => {
                    onSelect(offer);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start justify-between gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold text-white">
                        #{offer.id}
                      </span>
                      {offer.group && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
                          <Tag className="h-2.5 w-2.5" />
                          {offer.group}
                        </span>
                      )}
                      {countries && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                          <Globe className="h-2.5 w-2.5" />
                          {countries}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-700 line-clamp-2 break-words">
                      {offer.name}
                    </p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-1" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
