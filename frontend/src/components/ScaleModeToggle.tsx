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

export function ScaleModeToggle({
  mode,
  onChange,
  disabled = false,
}: ScaleModeToggleProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <span>Color scale:</span>
      <div className="inline-flex items-center gap-1 p-0.5 bg-bg-alt border border-border rounded-md" data-testid="scale-mode-toggle">
        <button
          type="button"
          className={`py-1.5 px-3 border-0 rounded bg-transparent text-text-muted cursor-pointer text-[0.8125rem] font-sans font-medium transition-all duration-150 hover:bg-bg hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
            mode === 'unified' ? 'bg-primary text-white hover:bg-primary hover:text-white' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => onChange('unified')}
          disabled={disabled}
          aria-pressed={mode === 'unified'}
          data-testid="scale-mode-unified"
        >
          Unified
        </button>
        <button
          type="button"
          className={`py-1.5 px-3 border-0 rounded bg-transparent text-text-muted cursor-pointer text-[0.8125rem] font-sans font-medium transition-all duration-150 hover:bg-bg hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
            mode === 'per-country' ? 'bg-primary text-white hover:bg-primary hover:text-white' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
