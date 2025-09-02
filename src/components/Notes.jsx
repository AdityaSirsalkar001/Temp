import React, { useMemo, useState } from 'react';
import { usePersistentState } from '../lib/hooks.js';

export default function Notes() {
  const [notes, setNotes] = usePersistentState('notes', []);
  const [query, setQuery] = usePersistentState('notes:query', '');
  const [selectedId, setSelectedId] = usePersistentState('notes:selected', null);

  function addNote() {
    const now = Date.now();
    const newNote = { id: crypto.randomUUID(), title: '', content: '', createdAt: now, updatedAt: now };
    setNotes([newNote, ...notes]);
    setSelectedId(newNote.id);
  }

  function remove(id) {
    setNotes(notes.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function setTitle(id, title) { setNotes(notes.map(n => n.id === id ? { ...n, title, updatedAt: Date.now() } : n)); }
  function setContent(id, content) { setNotes(notes.map(n => n.id === id ? { ...n, content, updatedAt: Date.now() } : n)); }

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase();
    const list = notes;
    if (!q) return list;
    return list.filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
  }, [query, notes]);

  const selected = notes.find(n => n.id === selectedId) || null;

  return (
    <div className="panel">
      <h3 className="panel-title">Quick Notes</h3>
      <div className="notes-header">
        <button className="btn" onClick={addNote}>+ New Note</button>
        {query && (
          <button className="btn secondary small" onClick={() => setQuery('')}>Clear Search</button>
        )}
      </div>

      {notes.length > 3 && (
        <input
          className="input search-input"
          placeholder="Search notes..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      )}

      {selected && (
        <div className="note-editor">
          <input
            className="input note-title"
            placeholder="Note title..."
            value={selected.title}
            onChange={e => setTitle(selected.id, e.target.value)}
          />
          <textarea
            className="textarea note-content"
            placeholder="Write your thoughts..."
            value={selected.content}
            onChange={e => setContent(selected.id, e.target.value)}
            rows="4"
          />
          <div className="note-actions">
            <span className="small">Last edited {new Date(selected.updatedAt).toLocaleDateString()}</span>
            <button className="btn-delete" onClick={() => remove(selected.id)} title="Delete note">×</button>
          </div>
        </div>
      )}

      <div className="notes-list">
        {filtered.slice(0, 5).map(n => (
          <div
            key={n.id}
            className={`note-item ${selectedId === n.id ? 'active' : ''}`}
            onClick={() => setSelectedId(n.id)}
          >
            <div className="note-preview">
              <div className="note-preview-title">{n.title || 'Untitled'}</div>
              <div className="note-preview-content">{(n.content || '').slice(0, 60)}{(n.content || '').length > 60 ? '...' : ''}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            {query ? 'No notes match your search.' : 'No notes yet. Create your first note!'}
          </div>
        )}
        {filtered.length > 5 && !query && (
          <div className="small text-center">Showing 5 of {filtered.length} notes. Use search to find more.</div>
        )}
      </div>
    </div>
  );
}
