'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Link2 } from 'lucide-react';
import { LoginInput } from '@trelltech/shared';
import { ApiRequestError } from '@/lib/api';
import { useLogin, useMe } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/auth/auth-shell';
import { PasswordInput } from '@/components/auth/password-input';
import { useToast } from '@/components/ui/toast';

function messageForStatus(error: ApiRequestError): string {
  if (error.status === 401) return 'Email ou mot de passe incorrect.';
  if (error.status === 429) return 'Trop de tentatives. Réessayez dans quelques instants.';
  return error.message;
}

export function LoginView() {
  const router = useRouter();
  const toast = useToast();
  const { data: me, isSuccess } = useMe();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isSuccess && me) {
      router.replace('/');
    }
  }, [isSuccess, me, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = LoginInput.safeParse({ email, password });
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
      await login.mutateAsync(parsed.data);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const message = messageForStatus(error);
        setFormError(message);
        toast.error('Connexion impossible', message);
      } else {
        setFormError("Une erreur inattendue s'est produite.");
      }
    }
  }

  return (
    <AuthShell
      title="Connexion"
      subtitle="Entrez vos identifiants pour retrouver vos espaces de travail."
      footer={
        <>
          Pas de compte ?{' '}
          <Link href="/register" className="font-medium text-brand hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
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
        <PasswordInput
          label="Mot de passe"
          name="password"
          autoComplete="current-password"
          placeholder="Votre mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />

        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <Button type="submit" loading={login.isPending} className="mt-1 w-full" size="md">
          Se connecter
          {!login.isPending ? <ArrowRight className="size-4" aria-hidden /> : null}
        </Button>
      </form>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-text-muted">
        <Link2 className="size-3.5" aria-hidden />
        Vous lierez Trello depuis les réglages.
      </p>
    </AuthShell>
  );
}
