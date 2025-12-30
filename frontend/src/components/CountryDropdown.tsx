/**
 * Country dropdown navigation component with search filtering
 */
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { CountryMeta } from '../lib/types';

export interface CountryDropdownProps {
  countries: CountryMeta[];
  currentCountry?: string;
  metric?: 'fertility' | 'seasonality';
  variant?: 'header' | 'inline';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    backgroundColor: 'var(--color-bg-alt)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    lineHeight: 1.4,
  },
  triggerInline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    border: '1px solid transparent',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    lineHeight: 'inherit',
  },
  arrow: {
    fontSize: '0.625rem',
    marginLeft: '2px',
    transition: 'transform 0.15s ease',
  },
  arrowOpen: {
    transform: 'rotate(180deg)',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '250px',
    maxHeight: '400px',
    backgroundColor: 'var(--color-bg-alt)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    boxShadow: '0 4px 12px var(--color-shadow)',
    zIndex: 1000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  dropdownRight: {
    left: 'auto',
    right: 0,
  },
  searchContainer: {
    padding: '8px',
    borderBottom: '1px solid var(--color-border)',
  },
  searchInput: {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '0.875rem',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    outline: 'none',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    margin: 0,
    padding: '4px 0',
    listStyle: 'none',
  },
  option: {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    backgroundColor: 'transparent',
    transition: 'background-color 0.1s ease',
  },
  optionHighlighted: {
    backgroundColor: 'var(--color-bg)',
  },
  optionCurrent: {
    fontWeight: 600,
    color: 'var(--color-primary)',
  },
  noResults: {
    padding: '12px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
  },
  count: {
    padding: '6px 12px',
    borderTop: '1px solid var(--color-border)',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
  },
};

// Focus styles for the search input (pseudo-selectors need CSS string)
const dropdownStyles = `
  .country-dropdown-search:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
  .country-dropdown-trigger:hover {
    border-color: var(--color-primary);
  }
  .country-dropdown-trigger-inline:hover {
    background-color: var(--color-bg);
    border-color: var(--color-border);
  }
  .country-dropdown-option:hover {
    background-color: var(--color-bg);
  }
`;

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
  const triggerStyle = isInline ? styles.triggerInline : styles.trigger;
  const triggerClass = isInline
    ? 'country-dropdown-trigger-inline'
    : 'country-dropdown-trigger';

  return (
    <div style={styles.container} ref={containerRef}>
      <style>{dropdownStyles}</style>
      <button
        type="button"
        className={triggerClass}
        style={triggerStyle}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        data-testid="country-dropdown-trigger"
      >
        <span>{currentCountryName ?? 'Go to country...'}</span>
        <span
          style={{
            ...styles.arrow,
            ...(isOpen ? styles.arrowOpen : {}),
          }}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            ...styles.dropdown,
            ...(isInline ? {} : styles.dropdownRight),
          }}
          role="listbox"
          aria-label="Select a country"
          data-testid="country-dropdown-menu"
        >
          <div style={styles.searchContainer}>
            <input
              ref={searchInputRef}
              type="text"
              className="country-dropdown-search"
              style={styles.searchInput}
              placeholder="Search countries..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              data-testid="country-dropdown-search"
              aria-label="Search countries"
            />
          </div>

          {filteredCountries.length === 0 ? (
            <div style={styles.noResults}>No countries found</div>
          ) : (
            <ul style={styles.list} ref={listRef}>
              {filteredCountries.map((country, index) => {
                const isCurrent = country.code === currentCountry;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={country.code}
                    className="country-dropdown-option"
                    style={{
                      ...styles.option,
                      ...(isHighlighted ? styles.optionHighlighted : {}),
                      ...(isCurrent ? styles.optionCurrent : {}),
                    }}
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

          <div style={styles.count}>
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
