/**
 * Country dropdown navigation component with search filtering
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { CountryMeta } from '../lib/types';
import type { MetricSlug } from '../lib/metrics';

export interface CountryDropdownProps {
  countries: CountryMeta[];
  currentCountry?: string;
  metric?: MetricSlug;
  variant?: 'header' | 'inline';
}

export function CountryDropdown({
  countries,
  currentCountry,
  metric = 'fertility',
  variant = 'header',
}: CountryDropdownProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter((c) =>
      c.name.toLowerCase().includes(query)
    );
  }, [countries, searchQuery]);

  // Get current country name for display
  const currentCountryName = useMemo(() => {
    if (!currentCountry) return null;
    const country = countries.find((c) => c.code === currentCountry);
    return country?.name ?? currentCountry;
  }, [countries, currentCountry]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
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

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredCountries.length]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const option = listRef.current.children[highlightedIndex] as HTMLElement;
      if (option) {
        option.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (code: string) => {
      window.location.href = `/${metric}/${code}`;
    },
    [metric]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          setHighlightedIndex(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredCountries.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
            handleSelect(filteredCountries[highlightedIndex].code);
          }
          break;
        case 'Tab':
          setIsOpen(false);
          setSearchQuery('');
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, filteredCountries, highlightedIndex, handleSelect]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const isInline = variant === 'inline';

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        className={`flex items-center gap-1 rounded cursor-pointer font-sans ${
          isInline
            ? 'inline-flex py-0.5 px-1.5 border border-transparent bg-transparent text-text hover:bg-bg hover:border-border'
            : 'py-1 px-2 border border-border bg-bg-alt text-text text-sm leading-[1.4] hover:border-primary'
        }`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        data-testid="country-dropdown-trigger"
      >
        <span>{currentCountryName ?? 'Go to country...'}</span>
        <span
          className={`text-[0.625rem] ml-0.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className={`absolute top-[calc(100%+4px)] min-w-[250px] max-h-[400px] bg-bg-alt border border-border rounded shadow-[0_4px_12px_var(--color-shadow)] z-[1000] overflow-hidden flex flex-col ${
            isInline ? 'left-0' : 'left-auto right-0'
          }`}
          role="listbox"
          aria-label="Select a country"
          data-testid="country-dropdown-menu"
        >
          <div className="p-2 border-b border-border">
            <input
              ref={searchInputRef}
              type="text"
              className="w-full py-1.5 px-2.5 border border-border rounded text-sm bg-bg text-text font-sans outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              data-testid="country-dropdown-search"
              aria-label="Search countries"
            />
          </div>

          {filteredCountries.length === 0 ? (
            <div className="p-3 text-center text-text-muted text-sm">No countries found</div>
          ) : (
            <ul className="flex-1 overflow-y-auto m-0 py-1 px-0 list-none" ref={listRef}>
              {filteredCountries.map((country, index) => {
                const isCurrent = country.code === currentCountry;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={country.code}
                    className={`py-2 px-3 cursor-pointer text-sm text-text bg-transparent transition-colors duration-100 hover:bg-bg ${
                      isHighlighted ? 'bg-bg' : ''
                    } ${isCurrent ? 'font-semibold text-primary' : ''}`}
                    onClick={() => handleSelect(country.code)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={isCurrent}
                    data-testid={`country-option-${country.code}`}
                  >
                    {country.name}
                    {isCurrent && ' (current)'}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="py-1.5 px-3 border-t border-border text-xs text-text-muted text-center">
            {filteredCountries.length === countries.length
              ? `${countries.length} countries`
              : `${filteredCountries.length} of ${countries.length} countries`}
          </div>
        </div>
      )}
    </div>
  );
}

export default CountryDropdown;
