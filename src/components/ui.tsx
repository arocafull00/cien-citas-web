'use client';
import { useEffect, useRef } from 'react';
export function ConfirmDialog({ title, description, confirmLabel, busy, onConfirm, onClose }: { title: string; description: string; confirmLabel: string; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><h2 id="confirm-title">{title}</h2><p id="confirm-description">{description}</p><div className="button-row"><button className="button secondary" disabled={busy} onClick={onClose} autoFocus>Cancelar</button><button className="button danger-button" disabled={busy} onClick={onConfirm}>{busy ? 'Guardando…' : confirmLabel}</button></div></dialog>;
}
