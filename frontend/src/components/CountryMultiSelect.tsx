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

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  triggerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    backgroundColor: 'var(--color-bg-alt)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    lineHeight: 1.4,
  },
  arrow: {
    fontSize: '0.625rem',
    marginLeft: '2px',
    transition: 'transform 0.15s ease',
  },
  arrowOpen: {
    transform: 'rotate(180deg)',
  },
  chipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    borderRadius: '16px',
    fontSize: '0.8125rem',
    fontWeight: 500,
  },
  chipRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    padding: 0,
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '10px',
    lineHeight: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '300px',
    maxWidth: '400px',
    maxHeight: '450px',
    backgroundColor: 'var(--color-bg-alt)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    boxShadow: '0 4px 12px var(--color-shadow)',
    zIndex: 1000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
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
  actions: {
    display: 'flex',
    gap: '8px',
    padding: '8px',
    borderBottom: '1px solid var(--color-border)',
  },
  actionButton: {
    flex: 1,
    padding: '6px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    margin: 0,
    padding: '4px 0',
    listStyle: 'none',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--color-text)',
    backgroundColor: 'transparent',
    transition: 'background-color 0.1s ease',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: 'var(--color-primary)',
    cursor: 'pointer',
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
  moreChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    backgroundColor: 'var(--color-bg-alt)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
  },
};

const dropdownStyles = `
  .country-multiselect-search:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }
  .country-multiselect-trigger:hover {
    border-color: var(--color-primary);
  }
  .country-multiselect-option:hover {
    background-color: var(--color-bg);
  }
  .country-multiselect-action:hover {
    background-color: var(--color-bg-alt);
    border-color: var(--color-primary);
  }
  .country-multiselect-chip-remove:hover {
    background-color: rgba(255, 255, 255, 0.4);
  }
`;

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
    <div style={styles.container} ref={containerRef}>
      <style>{dropdownStyles}</style>

      {/* Selected countries as chips */}
      {selectedCountries.length > 0 && (
        <div style={styles.chipsContainer}>
          {visibleChips.map((country) => (
            <span key={country.code} style={styles.chip}>
              {country.name}
              <button
                type="button"
                className="country-multiselect-chip-remove"
                style={styles.chipRemove}
                onClick={(e) => handleRemove(country.code, e)}
                aria-label={`Remove ${country.name}`}
              >
                ✕
              </button>
            </span>
          ))}
          {remainingCount > 0 && (
            <span style={styles.moreChip}>+{remainingCount} more</span>
          )}
        </div>
      )}

      {/* Trigger button */}
      <div style={styles.triggerRow}>
        <button
          type="button"
          className="country-multiselect-trigger"
          style={styles.trigger}
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
            style={{
              ...styles.arrow,
              ...(isOpen ? styles.arrowOpen : {}),
            }}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={styles.dropdown} role="listbox" aria-label="Select countries" data-testid="country-multiselect-menu">
          <div style={styles.searchContainer}>
            <input
              ref={searchInputRef}
              type="text"
              className="country-multiselect-search"
              style={styles.searchInput}
              placeholder="Search countries..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              data-testid="country-multiselect-search"
              aria-label="Search countries"
            />
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              className="country-multiselect-action"
              style={styles.actionButton}
              onClick={handleSelectAll}
            >
              Select All{searchQuery ? ' Visible' : ''}
            </button>
            <button
              type="button"
              className="country-multiselect-action"
              style={styles.actionButton}
              onClick={handleClearAll}
            >
              Clear{searchQuery ? ' Visible' : ' All'}
            </button>
          </div>

          {filteredCountries.length === 0 ? (
            <div style={styles.noResults}>No countries found</div>
          ) : (
            <ul style={styles.list}>
              {filteredCountries.map((country) => {
                const isSelected = selected.includes(country.code);

                return (
                  <li
                    key={country.code}
                    className="country-multiselect-option"
                    style={styles.option}
                    onClick={() => handleSelect(country.code)}
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`country-option-${country.code}`}
                  >
                    <input
                      type="checkbox"
                      style={styles.checkbox}
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

          <div style={styles.count}>
            {selected.length} of {countries.length} countries selected
          </div>
        </div>
      )}
    </div>
  );
}

export default CountryMultiSelect;
