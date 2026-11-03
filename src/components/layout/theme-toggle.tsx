'use client';

import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/icon';
import { themeStorageKey, type Theme } from '@/lib/theme';

const themeChanged = 'blogpost:theme-changed';
function subscribe(onChange: () => void) {
  const media = matchMedia('(prefers-color-scheme: light)');
  const systemChanged = () => {
    if (document.documentElement.dataset.themePreference !== 'system') return;
    document.documentElement.dataset.theme = media.matches ? 'light' : 'dark';
    onChange();
  };
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== themeStorageKey && event.key !== null) return;
    const preference =
      event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system';
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme =
      preference === 'system' ? (media.matches ? 'light' : 'dark') : preference;
    onChange();
  };
  media.addEventListener('change', systemChanged);
  window.addEventListener('storage', storageChanged);
  window.addEventListener(themeChanged, onChange);
  return () => {
    media.removeEventListener('change', systemChanged);
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener(themeChanged, onChange);
  };
}
const snapshot = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const serverSnapshot = () => null;

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, snapshot, serverSnapshot);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.dataset.themePreference = next;
    try {
      localStorage.setItem(themeStorageKey, next);
    } catch {
      /* Theme still works for this page when storage is unavailable. */
    }
    window.dispatchEvent(new Event(themeChanged));
  }
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span className="theme-sun">
        <Icon name="sun" />
      </span>
      <span className="theme-moon">
        <Icon name="moon" />
      </span>
    </button>
  );
}
