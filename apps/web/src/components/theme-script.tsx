const script = `(function () {
  try {
    var stored = localStorage.getItem('tt-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();`;

/** Applique le thème avant hydratation pour éviter tout flash de couleur. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
