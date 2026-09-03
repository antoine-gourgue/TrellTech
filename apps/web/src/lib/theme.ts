export type Theme = 'light' | 'dark';

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  localStorage.setItem('tt-theme', theme);
}
