import { LayoutGrid, Link2, MoveHorizontal, Sparkles } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

const features = [
  { icon: LayoutGrid, label: 'Tableaux, listes et cartes clairs' },
  { icon: MoveHorizontal, label: 'Glisser-déposer fluide entre les listes' },
  { icon: Link2, label: 'Liez Trello pour importer vos tableaux' },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-dvh grid-cols-1 overflow-hidden bg-bg lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-brand/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-10 size-80 rounded-full bg-brand/10 blur-3xl"
        />
        <div className="relative z-10">
          <Logo />
        </div>
        <div className="relative z-10 max-w-sm">
          <h2 className="text-3xl font-semibold tracking-tight text-text">
            Vos tableaux, <span className="font-brand text-brand">au propre.</span>
          </h2>
          <p className="mt-3 text-md text-text-muted">
            Organisez vos projets dans une interface soignée, claire et rapide.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-base text-text">
                <span className="grid size-9 place-items-center rounded-md bg-brand/10 text-brand">
                  <Icon className="size-4" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-xs text-text-muted">
          TrellTech réplique l&apos;essentiel de Trello, en mieux rangé.
        </div>
      </aside>

      <section className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between p-5 sm:p-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="w-full max-w-md">
            <div className="animate-scale-in rounded-lg border border-border bg-surface p-6 shadow-md sm:p-8">
              <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
              <p className="mt-2 text-md text-text-muted">{subtitle}</p>
              {children}
            </div>
            <div className="mt-6 text-center text-sm text-text-muted">{footer}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
