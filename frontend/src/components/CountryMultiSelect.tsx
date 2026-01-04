/**
 * Multi-select country dropdown for the Compare Countries feature.
 * Based on CountryDropdown but with checkbox selection and chips display.
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { CountryMeta } from '../lib/types';

export interface CountryMultiSelectProps {
  countries: CountryMeta[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxDisplay?: number;
}

export function CountryMultiSelect({
  countries,
  selected,
  onChange,
  maxDisplay = 5,
}: CountryMultiSelectProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter((c) => c.name.toLowerCase().includes(query));
  }, [countries, searchQuery]);

  // Get selected country objects
  const selectedCountries = useMemo(() => {
    return selected
      .map((code) => countries.find((c) => c.code === code))
      .filter((c): c is CountryMeta => c !== undefined);
  }, [countries, selected]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (code: string) => {
      if (selected.includes(code)) {
        onChange(selected.filter((c) => c !== code));
      } else {
        onChange([...selected, code]);
      }
    },
    [selected, onChange]
  );

  const handleRemove = useCallback(
    (code: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(selected.filter((c) => c !== code));
    },
    [selected, onChange]
  );

  const handleSelectAll = useCallback(() => {
    const allCodes = filteredCountries.map((c) => c.code);
    const newSelected = new Set([...selected, ...allCodes]);
    onChange(Array.from(newSelected));
  }, [filteredCountries, selected, onChange]);

  const handleClearAll = useCallback(() => {
    // Clear only visible (filtered) countries, or all if no filter
    if (searchQuery.trim()) {
      const filteredCodes = new Set(filteredCountries.map((c) => c.code));
      onChange(selected.filter((c) => !filteredCodes.has(c)));
    } else {
      onChange([]);
    }
  }, [filteredCountries, searchQuery, selected, onChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    },
    []
  );

  // Determine which chips to show
  const visibleChips = selectedCountries.slice(0, maxDisplay);
  const remainingCount = selectedCountries.length - maxDisplay;

  return (
    <div className="relative flex flex-col gap-2" ref={containerRef}>
      {/* Selected countries as chips */}
      {selectedCountries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleChips.map((country) => (
            <span key={country.code} className="inline-flex items-center gap-1 py-1 px-2 bg-primary text-white rounded-full text-[0.8125rem] font-medium">
              {country.name}
              <button
                type="button"
                className="inline-flex items-center justify-center w-4 h-4 p-0 border-0 bg-white/20 text-white rounded-full cursor-pointer text-[10px] leading-none hover:bg-white/40"
                onClick={(e) => handleRemove(country.code, e)}
                aria-label={`Remove ${country.name}`}
              >
                ✕
              </button>
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="inline-flex items-center py-1 px-2 bg-bg-alt border border-border rounded-full text-[0.8125rem] text-text-muted">
              +{remainingCount} more
            </span>
          )}
        </div>
      )}

      {/* Trigger button */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          className="flex items-center gap-1 py-2 px-3 border border-border rounded bg-bg-alt text-text cursor-pointer text-sm font-sans leading-[1.4] hover:border-primary"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          data-testid="country-multiselect-trigger"
        >
          <span>
            {selected.length === 0
              ? 'Select countries...'
              : `${selected.length} selected`}
          </span>
          <span
            className={`text-[0.625rem] ml-0.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 min-w-[300px] max-w-[400px] max-h-[450px] bg-bg-alt border border-border rounded shadow-[0_4px_12px_var(--color-shadow)] z-[1000] overflow-hidden flex flex-col" role="listbox" aria-label="Select countries" data-testid="country-multiselect-menu">
          <div className="p-2 border-b border-border">
            <input
              ref={searchInputRef}
              type="text"
              className="w-full py-1.5 px-2.5 border border-border rounded text-sm bg-bg text-text font-sans outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              data-testid="country-multiselect-search"
              aria-label="Search countries"
            />
          </div>

          <div className="flex gap-2 p-2 border-b border-border">
            <button
              type="button"
              className="flex-1 py-1.5 px-3 border border-border rounded bg-bg text-text cursor-pointer text-[0.8125rem] font-sans hover:bg-bg-alt hover:border-primary"
              onClick={handleSelectAll}
            >
              Select All{searchQuery ? ' Visible' : ''}
            </button>
            <button
              type="button"
              className="flex-1 py-1.5 px-3 border border-border rounded bg-bg text-text cursor-pointer text-[0.8125rem] font-sans hover:bg-bg-alt hover:border-primary"
              onClick={handleClearAll}
            >
              Clear{searchQuery ? ' Visible' : ' All'}
            </button>
          </div>

          {filteredCountries.length === 0 ? (
            <div className="p-3 text-center text-text-muted text-sm">No countries found</div>
          ) : (
            <ul className="flex-1 overflow-y-auto m-0 py-1 px-0 list-none">
              {filteredCountries.map((country) => {
                const isSelected = selected.includes(country.code);

                return (
                  <li
                    key={country.code}
                    className="flex items-center gap-2 py-2 px-3 cursor-pointer text-sm text-text bg-transparent transition-colors duration-100 hover:bg-bg"
                    onClick={() => handleSelect(country.code)}
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`country-option-${country.code}`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-primary"
                      checked={isSelected}
                      onChange={() => handleSelect(country.code)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{country.name}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="py-1.5 px-3 border-t border-border text-xs text-text-muted text-center">
            {selected.length} of {countries.length} countries selected
          </div>
        </div>
      )}
    </div>
  );
}

export default CountryMultiSelect;
