/**
 * Nanostores for heatmap state that needs to be shared across components.
 *
 * Note: After the Svelte 5 refactor, most compare page state is managed locally
 * in ComparePageClient.svelte. This file now only contains stores needed for
 * cross-component synchronization within the heatmap visualization.
 */
import { atom } from 'nanostores';

// =====================================
// Hover Synchronization
// =====================================

/** Currently hovered cell value (for synchronized legend indicator across heatmaps) */
export const hoveredValueStore = atom<number | null>(null);
