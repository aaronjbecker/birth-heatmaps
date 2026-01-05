<script lang="ts">
  /**
   * Responsive navigation component with hamburger menu on mobile.
   * Desktop: Shows full navigation with logo, links, dropdown, and theme toggle.
   * Mobile: Shows logo and hamburger button; menu slides down when opened.
   */
  import { slide } from 'svelte/transition';
  import type { CountryMeta } from '../../lib/types';
  import CountryDropdown from './CountryDropdown.svelte';

  interface Props {
    countries: CountryMeta[];
    currentPath?: string;
  }

  const { countries, currentPath = '' }: Props = $props();

  let isMenuOpen = $state(false);
  let menuButtonRef = $state<HTMLButtonElement | null>(null);
  let menuRef = $state<HTMLDivElement | null>(null);
  let firstLinkRef = $state<HTMLAnchorElement | null>(null);

  // Navigation items
  const navItems = [
    { href: '/', label: 'Countries' },
    { href: '/compare', label: 'Compare' },
    { href: '/about', label: 'About' },
  ];

  // Check if a nav item is currently active
  function isActive(href: string): boolean {
    if (href === '/') {
      return currentPath === '/' || currentPath === '';
    }
    return currentPath.startsWith(href);
  }

  // Close menu on Escape key or click outside
  $effect(() => {
    if (!isMenuOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        isMenuOpen = false;
        menuButtonRef?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef &&
        !menuRef.contains(target) &&
        menuButtonRef &&
        !menuButtonRef.contains(target)
      ) {
        isMenuOpen = false;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });

  // Focus first link when menu opens
  $effect(() => {
    if (isMenuOpen && firstLinkRef) {
      // Small delay to ensure the menu is rendered
      requestAnimationFrame(() => {
        firstLinkRef?.focus();
      });
    }
  });

  // Close menu on route change
  $effect(() => {
    currentPath; // Track dependency
    isMenuOpen = false;
  });

  // Close menu on window resize to desktop size
  $effect(() => {
    if (!isMenuOpen) return;

    function handleResize() {
      // md breakpoint is 768px
      if (window.innerWidth >= 768) {
        isMenuOpen = false;
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  function handleNavClick() {
    isMenuOpen = false;
  }
</script>

<nav class="flex items-center justify-between w-full" aria-label="Main navigation">
  <!-- Logo and Site Title -->
  <a
    href="/"
    class="flex items-center gap-sm group"
    data-testid="nav-logo-link"
  >
    <slot name="logo" />
    <!-- Title hidden on mobile, visible on desktop -->
    <span class="hidden md:inline text-xl font-semibold text-text group-hover:text-primary transition-colors">
      Birth Heatmaps
    </span>
  </a>

  <!-- Desktop Navigation (hidden on mobile) -->
  <div class="hidden md:flex items-center gap-lg">
    <div class="flex items-center gap-md">
      {#each navItems as item}
        <a
          href={item.href}
          class="text-primary hover:underline {isActive(item.href) ? 'font-semibold' : ''}"
        >
          {item.label}
        </a>
      {/each}
      <CountryDropdown {countries} metric="fertility" variant="header" />
    </div>
    <!-- Theme toggle for desktop (hidden on mobile via parent) -->
    <slot name="theme-toggle" />
  </div>

  <!-- Mobile Controls (visible on mobile only) -->
  <div class="flex items-center gap-sm md:hidden">
    <!-- Theme toggle for mobile - use a separate slot -->
    <slot name="theme-toggle-mobile" />
    <button
      bind:this={menuButtonRef}
      type="button"
      class="flex items-center justify-center w-10 h-10 p-2 border border-border rounded-md bg-bg-alt text-text cursor-pointer hover:bg-bg hover:border-primary transition-colors"
      onclick={toggleMenu}
      aria-expanded={isMenuOpen}
      aria-controls="mobile-menu"
      aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
      data-testid="mobile-menu-button"
    >
      {#if isMenuOpen}
        <!-- X icon -->
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      {:else}
        <!-- Hamburger icon -->
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      {/if}
    </button>
  </div>
</nav>

<!-- Mobile Menu Drawer (positioned relative to header via BaseLayout) -->
{#if isMenuOpen}
  <div
    bind:this={menuRef}
    id="mobile-menu"
    class="absolute top-full left-0 right-0 bg-bg-alt border-b border-border shadow-lg z-50 md:hidden"
    transition:slide={{ duration: 150 }}
    data-testid="mobile-menu"
  >
    <div class="flex flex-col py-md px-md gap-sm max-w-container mx-auto">
      <!-- First nav item with ref for focus management -->
      <a
        bind:this={firstLinkRef}
        href={navItems[0].href}
        class="block py-sm px-md text-lg rounded-md transition-colors
          {isActive(navItems[0].href)
            ? 'font-semibold text-primary bg-bg'
            : 'text-text hover:text-primary hover:bg-bg'}"
        onclick={handleNavClick}
        data-testid="mobile-nav-{navItems[0].label.toLowerCase()}"
      >
        {navItems[0].label}
      </a>
      <!-- Remaining nav items -->
      {#each navItems.slice(1) as item}
        <a
          href={item.href}
          class="block py-sm px-md text-lg rounded-md transition-colors
            {isActive(item.href)
              ? 'font-semibold text-primary bg-bg'
              : 'text-text hover:text-primary hover:bg-bg'}"
          onclick={handleNavClick}
          data-testid="mobile-nav-{item.label.toLowerCase()}"
        >
          {item.label}
        </a>
      {/each}
      <div class="py-sm px-md">
        <span class="text-sm text-text-muted mb-xs block">Go to country:</span>
        <CountryDropdown {countries} metric="fertility" variant="inline" />
      </div>
    </div>
  </div>
{/if}
