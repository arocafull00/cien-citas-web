'use client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Copy, HeartCrack, LogOut, Download, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

import { useApp } from './app-provider';
import { BackHeader } from './mobile-shell';
import { ConfirmDialog } from './ui';
export function SettingsScreen() {
  const { couple, online, signOut, reset, refresh, clearSavedMemories } = useApp();
  const router = useRouter();
  const [confirm, setConfirm] = useState<'unlink' | 'logout' | 'cache' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <><BackHeader title="Ajustes" back="/profile" /><main className="page settings-page"><section><h2>Vuestra conexión</h2><div className="settings-row"><span>Código de invitación</span><strong>{couple?.inviteCode}</strong><Button variant="ghost" size="unstyled" className="icon-button" aria-label="Copiar código de invitación" onClick={() => void navigator.clipboard.writeText(couple?.inviteCode || '').then(() => setMessage('Código copiado')).catch(() => setMessage(`Vuestro código: ${couple?.inviteCode}`))}><Copy size={18} /></Button></div><Button variant="ghost" size="unstyled" className="settings-row danger" disabled={!online} onClick={() => setConfirm('unlink')}><span><HeartCrack size={20} />Desvincular pareja</span></Button></section><section><h2>Esta aplicación</h2><div className="settings-explanation"><Download size={20} /><p>Puedes instalar 100 Citas desde el menú del navegador. En iPhone, abre Safari y elige Compartir → Añadir a la pantalla de inicio.</p></div><p className="field-hint">Los recuerdos consultados y las fotos vistas se guardan para leerlos sin conexión. Para editar necesitas internet.</p><Button variant="ghost" size="unstyled" className="settings-row" onClick={() => setConfirm('cache')}><span><Trash2 size={19} />Borrar recuerdos de este dispositivo</span></Button></section><Button variant="ghost" size="unstyled" className="settings-row danger" onClick={() => setConfirm('logout')}><span><LogOut size={20} />Cerrar sesión</span></Button>{message ? <p role="status" className="field-hint">{message}</p> : null}<p className="love-quote">100 Citas · Una historia para dos</p></main>
    {confirm ? <ConfirmDialog title={confirm === 'unlink' ? '¿Desvincular vuestra pareja?' : confirm === 'logout' ? '¿Cerrar sesión?' : '¿Borrar los recuerdos guardados?'} description={confirm === 'unlink' ? 'Se perderán el progreso, las citas propias y los recuerdos compartidos para ambos. No podrás deshacerlo.' : confirm === 'logout' ? 'Se borrarán los recuerdos guardados en este dispositivo.' : 'Tus recuerdos seguirán en vuestra cuenta. Se guardarán de nuevo cuando los consultes con conexión.'} confirmLabel={confirm === 'unlink' ? 'Desvincular' : confirm === 'logout' ? 'Cerrar sesión' : 'Borrar caché'} busy={busy} onClose={() => setConfirm(null)} onConfirm={() => { setBusy(true); setMessage(''); void (async () => { if (confirm === 'unlink') { await apiClient.delete('/api/couples/unlink'); await reset(); const channel = new BroadcastChannel('100citas-session'); channel.postMessage('unlink'); channel.close(); await refresh(); router.replace('/onboarding'); } else if (confirm === 'logout') await signOut(); else { await clearSavedMemories(); setMessage('Recuerdos locales borrados'); } })().catch(e => setMessage(e.message)).finally(() => { setBusy(false); setConfirm(null); }); }} /> : null}
  </>;
}
