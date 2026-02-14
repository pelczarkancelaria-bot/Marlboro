'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TasksDrawer } from '@/components/TasksDrawer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      {children}
      {!loading && firebaseUser ? (
        <>
          <button className="tasks-fab" onClick={() => setOpen(true)}>
            ✅ Zadania
          </button>
          <TasksDrawer open={open} onClose={() => setOpen(false)} />
        </>
      ) : null}
    </div>
  );
}
