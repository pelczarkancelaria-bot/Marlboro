'use client';

import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { firebaseUser, profile, signInWithGoogle, signOutUser, loading } = useAuth();

  if (loading) {
    return (
      <main className="page centered">
        <p>Ładowanie...</p>
      </main>
    );
  }

  if (!firebaseUser) {
    return (
      <main className="page centered">
        <section className="card auth-card">
          <h1>Marlboro</h1>
          <p>Zaloguj się kontem Google, aby przejść do aplikacji.</p>
          <button className="btn primary" onClick={signInWithGoogle}>
            Zaloguj przez Google
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Dashboard</h1>
        <p>Witaj, {profile?.displayName || firebaseUser.displayName || 'Użytkowniku'}.</p>
        <p>
          Twoja rola: <strong>{profile?.role ?? 'user'}</strong>
        </p>
        <p>Email: {firebaseUser.email}</p>
        <button className="btn" onClick={signOutUser}>
          Wyloguj
        </button>
      </section>
    </main>
  );
}
