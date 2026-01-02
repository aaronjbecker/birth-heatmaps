/**
 * Toggle component for switching between unified and per-country color scales.
 */
import React from 'react';
import type { ScaleMode } from '../lib/types';

export interface ScaleModeToggleProps {
  mode: ScaleMode;
  onChange: (mode: ScaleMode) => void;
  disabled?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px',
    backgroundColor: 'var(--color-bg-alt)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
  },
  button: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  buttonActive: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
};

const buttonStyles = `
  .scale-mode-button:hover:not(.active):not(:disabled) {
    background-color: var(--color-bg);
    color: var(--color-text);
  }
  .scale-mode-button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`;

export function ScaleModeToggle({
  mode,
  onChange,
  disabled = false,
}: ScaleModeToggleProps): React.ReactElement {
  return (
    <div style={styles.label}>
      <style>{buttonStyles}</style>
      <span>Color scale:</span>
      <div style={styles.container} data-testid="scale-mode-toggle">
        <button
          type="button"
          className={`scale-mode-button ${mode === 'unified' ? 'active' : ''}`}
          style={{
            ...styles.button,
            ...(mode === 'unified' ? styles.buttonActive : {}),
            ...(disabled ? styles.buttonDisabled : {}),
          }}
          onClick={() => onChange('unified')}
          disabled={disabled}
          aria-pressed={mode === 'unified'}
          data-testid="scale-mode-unified"
        >
          Unified
        </button>
        <button
          type="button"
          className={`scale-mode-button ${mode === 'per-country' ? 'active' : ''}`}
          style={{
            ...styles.button,
            ...(mode === 'per-country' ? styles.buttonActive : {}),
            ...(disabled ? styles.buttonDisabled : {}),
          }}
          onClick={() => onChange('per-country')}
          disabled={disabled}
          aria-pressed={mode === 'per-country'}
          data-testid="scale-mode-per-country"
        >
          Per-Country
        </button>
      </div>
    </div>
  );
}

export default ScaleModeToggle;
