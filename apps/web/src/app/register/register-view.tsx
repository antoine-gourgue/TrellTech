'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { RegisterInput } from '@trelltech/shared';
import { cn } from '@/lib/cn';
import { ApiRequestError } from '@/lib/api';
import { useMe, useRegister } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/auth/auth-shell';
import { PasswordInput } from '@/components/auth/password-input';
import { useToast } from '@/components/ui/toast';

type Strength = { level: 0 | 1 | 2 | 3; label: string; className: string };

function passwordStrength(password: string): Strength {
  if (password.length === 0) return { level: 0, label: '', className: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || (/[A-Za-z]/.test(password) && /\d/.test(password))) {
    score += 1;
  }
  if (score <= 1) return { level: 1, label: 'Faible', className: 'bg-danger' };
  if (score === 2) return { level: 2, label: 'Moyen', className: 'bg-brand' };
  return { level: 3, label: 'Fort', className: 'bg-success' };
}

function messageForStatus(error: ApiRequestError): string {
  if (error.status === 409) return 'Cet email est déjà utilisé.';
  if (error.status === 429) return 'Trop de tentatives. Réessayez dans quelques instants.';
  return error.message;
}

export function RegisterView() {
  const router = useRouter();
  const toast = useToast();
  const { data: me, isSuccess } = useMe();
  const register = useRegister();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const strength = useMemo(() => passwordStrength(password), [password]);

  useEffect(() => {
    if (isSuccess && me) {
      router.replace('/');
    }
  }, [isSuccess, me, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedName = fullName.trim();
    const parsed = RegisterInput.safeParse({
      email,
      password,
      fullName: trimmedName.length > 0 ? trimmedName : undefined,
    });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flattened.email?.[0],
        password: flattened.password?.[0],
      });
      return;
    }
    setFieldErrors({});

    try {
      await register.mutateAsync(parsed.data);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const message = messageForStatus(error);
        setFormError(message);
        toast.error('Inscription impossible', message);
      } else {
        setFormError("Une erreur inattendue s'est produite.");
      }
    }
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Quelques secondes suffisent pour démarrer vos tableaux."
      footer={
        <>
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label="Nom complet (optionnel)"
          type="text"
          name="fullName"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          required
        />
        <div className="flex flex-col gap-1.5">
          <PasswordInput
            label="Mot de passe"
            name="password"
            autoComplete="new-password"
            placeholder="Au moins 8 caractères"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            hint={!fieldErrors.password && password.length === 0 ? 'Minimum 8 caractères.' : undefined}
            required
          />
          {password.length > 0 && !fieldErrors.password ? (
            <div className="flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1" aria-hidden>
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={cn(
                      'flex-1 rounded-full transition-colors',
                      step <= strength.level ? strength.className : 'bg-border',
                    )}
                  />
                ))}
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-text-muted">
                {strength.label}
              </span>
            </div>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <Button type="submit" loading={register.isPending} className="mt-1 w-full" size="md">
          Créer mon compte
          {!register.isPending ? <ArrowRight className="size-4" aria-hidden /> : null}
        </Button>
      </form>
    </AuthShell>
  );
}
