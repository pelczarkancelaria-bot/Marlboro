'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/auth';
import type { Task } from '@/types/tasks';

type Filter = 'today' | 'week' | 'overdue' | 'all';

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function applyFilter(tasks: Task[], filter: Filter): Task[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return tasks.filter((task) => {
    const due = task.dueAt;
    if (filter === 'all') return true;
    if (filter === 'today') return due >= todayStart && due <= todayEnd;
    if (filter === 'week') return due >= now && due <= weekEnd;
    if (filter === 'overdue') return due < now && task.status === 'open';
    return true;
  });
}

interface TaskFormState {
  title: string;
  dueAt: string;
  assignedToUid: string;
  note: string;
}

const defaultForm = (uid = ''): TaskFormState => ({
  title: '',
  dueAt: toDateInputValue(new Date()),
  assignedToUid: uid,
  note: '',
});

export function TasksDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { firebaseUser, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(defaultForm(firebaseUser?.uid ?? ''));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ mine: true });

  useEffect(() => {
    if (!firebaseUser) return;

    const usersQuery = isAdmin
      ? query(collection(db, 'users'), orderBy('displayName', 'asc'))
      : query(collection(db, 'users'), where('uid', '==', firebaseUser.uid));

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      const mapped = snap.docs.map((docItem) => docItem.data() as UserProfile);
      setUsers(mapped);
    });

    const tasksQuery = isAdmin
      ? query(collection(db, 'tasks'), orderBy('dueAt', 'asc'))
      : query(collection(db, 'tasks'), where('assignedToUid', '==', firebaseUser.uid), orderBy('dueAt', 'asc'));

    const unsubTasks = onSnapshot(tasksQuery, (snap) => {
      const mapped = snap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          title: data.title,
          dueAt: (data.dueAt as Timestamp).toDate(),
          assignedToUid: data.assignedToUid,
          assignedToName: data.assignedToName,
          assignedToEmail: data.assignedToEmail,
          createdByUid: data.createdByUid,
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
          status: data.status,
          linkType: data.linkType ?? null,
          linkId: data.linkId ?? null,
          note: data.note ?? '',
        } as Task;
      });
      setTasks(mapped);
    });

    return () => {
      unsubUsers();
      unsubTasks();
    };
  }, [firebaseUser, isAdmin]);

  useEffect(() => {
    setForm(defaultForm(firebaseUser?.uid ?? ''));
  }, [firebaseUser?.uid]);

  const filteredTasks = useMemo(() => applyFilter(tasks, filter), [tasks, filter]);

  const myTasks = useMemo(
    () => filteredTasks.filter((task) => task.assignedToUid === firebaseUser?.uid),
    [filteredTasks, firebaseUser?.uid],
  );

  const otherUsers = useMemo(() => {
    if (!isAdmin || !firebaseUser) return [];
    return users.filter((item) => item.uid !== firebaseUser.uid);
  }, [isAdmin, users, firebaseUser]);

  const counters = useMemo(() => {
    const today = applyFilter(tasks, 'today').length;
    const overdue = applyFilter(tasks, 'overdue').length;
    const week = applyFilter(tasks, 'week').length;
    return { today, overdue, week, all: tasks.length };
  }, [tasks]);

  if (!open || !firebaseUser) return null;

  const availableAssignees = isAdmin ? users : users.filter((u) => u.uid === firebaseUser.uid);

  async function handleCreateOrUpdate() {
    if (!form.title.trim()) return;

    const assignee = availableAssignees.find((item) => item.uid === form.assignedToUid) ||
      availableAssignees[0];

    if (!assignee) return;

    const dueAt = new Date(form.dueAt);
    if (Number.isNaN(dueAt.getTime())) return;

    if (editingTaskId) {
      const updatePayload: Record<string, unknown> = {
        title: form.title.trim(),
        dueAt,
        note: form.note.trim() || null,
      };

      if (isAdmin) {
        updatePayload.assignedToUid = assignee.uid;
        updatePayload.assignedToName = assignee.displayName;
        updatePayload.assignedToEmail = assignee.email;
      }

      await updateDoc(doc(db, 'tasks', editingTaskId), updatePayload);
    } else {
      await addDoc(collection(db, 'tasks'), {
        title: form.title.trim(),
        dueAt,
        assignedToUid: assignee.uid,
        assignedToName: assignee.displayName,
        assignedToEmail: assignee.email,
        createdByUid: firebaseUser.uid,
        createdAt: serverTimestamp(),
        status: 'open',
        linkType: null,
        linkId: null,
        note: form.note.trim() || null,
      });
    }

    setShowCreateForm(false);
    setEditingTaskId(null);
    setForm(defaultForm(isAdmin ? users[0]?.uid ?? firebaseUser.uid : firebaseUser.uid));
  }

  async function toggleStatus(task: Task) {
    await updateDoc(doc(db, 'tasks', task.id), {
      status: task.status === 'open' ? 'done' : 'open',
    });
  }

  async function removeTask(task: Task) {
    const canDelete = isAdmin || task.assignedToUid === firebaseUser.uid;
    if (!canDelete) return;
    await deleteDoc(doc(db, 'tasks', task.id));
  }

  function startEdit(task: Task) {
    setShowCreateForm(true);
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      dueAt: toDateInputValue(task.dueAt),
      assignedToUid: task.assignedToUid,
      note: task.note || '',
    });
  }

  const renderTask = (task: Task) => (
    <article className={`task-item ${task.status === 'done' ? 'done' : ''}`} key={task.id}>
      <div className="row between">
        <label className="row" style={{ flex: 1 }}>
          <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleStatus(task)} />
          <strong>{task.title}</strong>
        </label>
        <button className="btn" onClick={() => startEdit(task)}>
          Edytuj
        </button>
      </div>
      <p className="task-meta">
        Termin: {task.dueAt.toLocaleString()} • Przypisane: {task.assignedToName || task.assignedToEmail}
      </p>
      {task.note ? <p className="small">Notatka: {task.note}</p> : null}
      <button className="btn delete-btn" onClick={() => removeTask(task)}>
        Usuń
      </button>
    </article>
  );

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="tasks-drawer">
        <div className="row between">
          <h2>Zadania</h2>
          <button className="btn" onClick={onClose}>
            Zamknij
          </button>
        </div>

        <p className="small">
          Dziś: {counters.today} • 7 dni: {counters.week} • Po terminie: {counters.overdue} • Wszystkie:{' '}
          {counters.all}
        </p>

        <div className="row wrap" style={{ marginBottom: 8 }}>
          {([
            ['today', 'Dziś'],
            ['week', '7 dni'],
            ['overdue', 'Po terminie'],
            ['all', 'Wszystkie'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              className={`filter-chip ${filter === value ? 'active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          className="btn primary"
          onClick={() => {
            setShowCreateForm((prev) => !prev);
            setEditingTaskId(null);
            const nextUid = isAdmin ? users[0]?.uid ?? firebaseUser.uid : firebaseUser.uid;
            setForm(defaultForm(nextUid));
          }}
        >
          + Nowe
        </button>

        {showCreateForm ? (
          <section className="card stack" style={{ marginTop: 8 }}>
            <input
              placeholder="Tytuł zadania"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm((prev) => ({ ...prev, dueAt: e.target.value }))}
            />
            <textarea
              rows={3}
              placeholder="Notatka (opcjonalnie)"
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
            <select
              value={form.assignedToUid}
              onChange={(e) => setForm((prev) => ({ ...prev, assignedToUid: e.target.value }))}
              disabled={!isAdmin}
            >
              {availableAssignees.map((item) => (
                <option key={item.uid} value={item.uid}>
                  {item.displayName || item.email}
                </option>
              ))}
            </select>
            <button className="btn primary" onClick={handleCreateOrUpdate}>
              {editingTaskId ? 'Zapisz zmiany' : 'Utwórz zadanie'}
            </button>
          </section>
        ) : null}

        <h3 className="section-title">Moje ({myTasks.length})</h3>
        <div className="stack">{myTasks.map(renderTask)}</div>

        {isAdmin
          ? otherUsers.map((user) => {
              const sectionTasks = filteredTasks.filter((task) => task.assignedToUid === user.uid);
              const expanded = Boolean(expandedSections[user.uid]);

              return (
                <section key={user.uid}>
                  <button
                    className="btn"
                    style={{ marginTop: 12 }}
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        [user.uid]: !prev[user.uid],
                      }))
                    }
                  >
                    {expanded ? '▾' : '▸'} {user.displayName || user.email} ({sectionTasks.length})
                  </button>
                  {expanded ? <div className="stack" style={{ marginTop: 8 }}>{sectionTasks.map(renderTask)}</div> : null}
                </section>
              );
            })
          : null}
      </aside>
    </>
  );
}
