'use client';
import { useState } from 'react';
import { Heart, Sparkles, Share2 } from 'lucide-react';
import { MobileLink } from '@/components/mobile-shell';
import { useApp } from '@/components/app-provider';
import { Button } from '@/components/ui/button';
export default function Celebration() {
  const { account, couple, scope } = useApp();
  const [notice, setNotice] = useState('');
  async function share() {
    const text = '¡Lo logramos! 100 citas. 100 momentos. Una historia que nos pertenece. 💌';
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setNotice('Mensaje copiado para compartir');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setNotice('No se pudo compartir. Inténtalo de nuevo.');
    }
  }
  return (
    <main className="page celebration">
      <span className="eyebrow">Y ESTO SOLO ES EL PRINCIPIO</span>
      <Sparkles className="celebration-sparkles" size={38} strokeWidth={1} />
      <div className="celebration-number">
        100
        <Heart size={38} />
      </div>
      <h1>
        Cien citas.
        <br />
        <em>Una historia para siempre.</em>
      </h1>
      <p>{[account?.name, couple?.partner?.name].filter(Boolean).join(' y ')}</p>
      <p>
        Cada momento vivido juntos es una página más de vuestra historia. Que lo mejor siempre esté
        por venir.
      </p>
      <Button variant="ghost" size="unstyled" className="button" onClick={() => void share()}>
        <Share2 size={18} />
        Compartir
      </Button>
      <MobileLink
        className="button secondary"
        href="/dates"
        onClick={() => {
          try {
            sessionStorage.setItem(
              `100citas:feed:${scope}`,
              JSON.stringify({ filter: 'Hechas', query: '' }),
            );
          } catch {}
        }}
      >
        Ver nuestra historia
      </MobileLink>
      {notice ? <p role="status">{notice}</p> : null}
    </main>
  );
}
