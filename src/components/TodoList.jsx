import React, { useEffect, useMemo, useState } from 'react';
import { usePersistentState } from '../lib/hooks.js';
import { playTone } from '../lib/sound.js';

function nextDue(date, recurring) {
  const d = new Date(date);
  if (recurring === 'daily') d.setDate(d.getDate() + 1);
  if (recurring === 'weekly') d.setDate(d.getDate() + 7);
  if (recurring === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

export default function TodoList() {
  const [items, setItems] = usePersistentState('todos', []);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [project, setProject] = usePersistentState('todos:project', 'all');
  // Removed tagsFilter for simplicity

  function addItem() {
    const t = text.trim();
    if (!t) return;
    const now = Date.now();
    setItems([{ id: crypto.randomUUID(), text: t, done: false, createdAt: now, updatedAt: now, project: 'General', tags: [], dueAt: null, recurring: 'none' }, ...items]);
    setText('');
  }

  function toggle(id) {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const done = !i.done;
      const updated = { ...i, done, updatedAt: Date.now() };
      if (done && i.recurring && i.recurring !== 'none' && i.dueAt) {
        // spawn next recurring
        const next = { ...i, id: crypto.randomUUID(), done: false, createdAt: Date.now(), updatedAt: Date.now(), dueAt: nextDue(i.dueAt, i.recurring) };
        return [updated, next];
      }
      return updated;
    }).flat());
  }
  function remove(id) { setItems(items.filter(i => i.id !== id)); }
  function edit(id, value) { setItems(items.map(i => i.id === id ? { ...i, text: value, updatedAt: Date.now() } : i)); }
  function setItem(id, patch) { setItems(items.map(i => i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i)); }
  function clearCompleted() { setItems(items.filter(i => !i.done)); }

  const projects = useMemo(() => ['all', 'General', ...Array.from(new Set(items.map(i => i.project).filter(Boolean)))], [items]);

  // reminders
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      items.forEach(i => {
        if (!i.done && i.dueAt && i.dueAt <= now) {
          playTone({ freq: 880, duration: 180, type: 'triangle' });
        }
      });
    }, 30000);
    return () => clearInterval(id);
  }, [items]);

  const shown = useMemo(() => {
    let list = items;
    if (filter === 'active') list = list.filter(i => !i.done);
    if (filter === 'done') list = list.filter(i => i.done);
    return list;
  }, [items, filter]);

  return (
    <div className="panel">
      <h3 className="panel-title">Tasks</h3>
      <div className="task-input">
        <input
          className="input"
          placeholder="Add a new task..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
        />
        <button className="btn" onClick={addItem}>Add</button>
      </div>

      <div className="task-filters">
        <select className="select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All ({shown.length})</option>
          <option value="active">Active ({shown.filter(i => !i.done).length})</option>
          <option value="done">Done ({shown.filter(i => i.done).length})</option>
        </select>
        {completed > 0 && (
          <button className="btn secondary small" onClick={clearCompleted}>Clear Done</button>
        )}
      </div>

      <ul className="task-list">
        {shown.map(item => (
          <li key={item.id} className="task-item">
            <div className="task-content">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(item.id)}
                className="task-checkbox"
              />
              <input
                className={`task-text ${item.done ? 'completed' : ''}`}
                value={item.text}
                onChange={e => edit(item.id, e.target.value)}
              />
            </div>
            <button className="btn-delete" onClick={() => remove(item.id)} title="Delete task">×</button>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="empty-state">
            {filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter} tasks.`}
          </li>
        )}
      </ul>
    </div>
  );
}
