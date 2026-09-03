import type { Metadata } from 'next';
import { RegisterView } from './register-view';

export const metadata: Metadata = {
  title: 'Créer un compte — TrellTech',
};

export default function RegisterPage() {
  return <RegisterView />;
}
