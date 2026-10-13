'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { Settings, Camera } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { readSnapshot } from '@/lib/offline';
import { uploadImage } from '@/lib/upload';
import type { Achievement, Profile } from '@/lib/types';
import { useApp } from './app-provider';
import { BottomNav, MobileLink } from './mobile-shell';
import { ProfileView } from './profile-view';

export function ProfileScreen() {
  const { account, couple, scope, dates, online, rememberProfile, refresh } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [name, setName] = useState(account?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const saved = await readSnapshot(account?.clerkUserId, couple?.id);
      if (cancelled) return;
      if (saved?.profile) { setProfile(saved.profile); setAchievements(saved.achievements); setName(saved.profile.user.name); }
      if (!online) return;
      try {
        const [data, badges] = await Promise.all([apiClient.get<Profile>('/api/profile/me'), apiClient.get<{ achievements: Achievement[] }>('/api/profile/achievements')]);
        if (cancelled) return;
        setProfile(data); setName(data.user.name); setAchievements(badges.achievements); rememberProfile(data, badges.achievements, scope);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'No pudimos cargar el perfil'); }
    }
    void load(); return () => { cancelled = true; };
  }, [account?.clerkUserId, couple?.id, online, scope, rememberProfile]);
  async function saveName(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setNotice('');
    try { await apiClient.patch('/api/profile/me', { name: name.trim() }); if (profile) { const next = { ...profile, user: { ...profile.user, name: name.trim() } }; setProfile(next); rememberProfile(next, achievements, scope); } await refresh(); setNotice('Nombre guardado'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No pudimos guardar tu nombre'); } finally { setBusy(false); }
  }
  return <div className="with-nav"><header className="profile-header"><span className="eyebrow">NUESTRO DIARIO</span><MobileLink className="icon-button" href="/settings" aria-label="Ajustes"><Settings size={23} /></MobileLink></header><main className="page profile-page">{error ? <p role="alert" className="error-message">{error}</p> : null}
    {profile ? <ProfileView profile={profile} achievements={achievements} scope={scope} completed={dates.filter(d => d.completed).length} total={100 + dates.filter(d => d.isCustom).length} /> : <p>Cargando vuestro perfil…</p>}
    <section className="profile-edit"><h2>Tu perfil</h2><form onSubmit={e => void saveName(e)}><label className="field">Tu nombre<Input required maxLength={80} value={name} disabled={busy || !online} onChange={e => setName(e.target.value)} /></label><Button variant="ghost" size="unstyled" className="button secondary" disabled={busy || !online || !name.trim()}>{busy ? 'Guardando…' : 'Guardar nombre'}</Button></form><label className={`photo-upload ${busy || !online ? 'disabled' : ''}`}><Camera size={19} /><span>Cambiar tu foto</span><Input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={busy || !online} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setBusy(true); setError(null); void uploadImage(file).then(async result => { if (profile) { const next = { ...profile, user: { ...profile.user, avatarUrl: result.url } }; setProfile(next); rememberProfile(next, achievements, scope); } await refresh(); setNotice('Foto guardada'); }).catch(e => setError(e.message)).finally(() => setBusy(false)); }} /></label>{notice ? <p role="status" className="field-hint">{notice}</p> : null}</section>
  </main><BottomNav /></div>;
}
