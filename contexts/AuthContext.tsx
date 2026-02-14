'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { Role, UserProfile } from '@/types/auth';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function resolveRole(email: string | null): Role {
  if (!email) return 'user';
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '';
  const admins = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase()) ? 'admin' : 'user';
}

async function syncUserDocument(user: User): Promise<UserProfile> {
  const role = resolveRole(user.email);
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const payload = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    role,
    lastLoginAt: serverTimestamp(),
    createdAt: snap.exists() ? snap.data().createdAt ?? serverTimestamp() : serverTimestamp(),
  };

  await setDoc(userRef, payload, { merge: true });

  return {
    uid: payload.uid,
    email: payload.email,
    displayName: payload.displayName,
    role,
    createdAt: payload.createdAt,
    lastLoginAt: payload.lastLoginAt,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const synced = await syncUserDocument(user);
        setProfile(synced);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      signInWithGoogle: async () => {
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, googleProvider as GoogleAuthProvider);
      },
      signOutUser: async () => {
        await signOut(auth);
      },
    }),
    [firebaseUser, loading, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside AuthProvider');
  }
  return ctx;
}
