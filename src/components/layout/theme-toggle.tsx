'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';

/** Run in the document head before paint; explicit theme overrides the system. */
export const themeScript =
  "try{var t=localStorage.getItem('blogpost-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    const update = () =>
      setTheme(
        document.documentElement.dataset.theme === 'dark'
          ? 'dark'
          : document.documentElement.dataset.theme === 'light'
            ? 'light'
            : matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light',
      );
    update();
    const media = matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem('blogpost-theme', next);
    } catch {
      /* Theme still works for this page when storage is unavailable. */
    }
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
