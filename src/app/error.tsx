'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page status-screen">
      <h1>No pudimos abrir esta página</h1>
      <p>Comprueba la conexión y vuelve a intentarlo.</p>
      <button className="button" onClick={reset}>
        Reintentar
      </button>
      <a href="/offline" className="button secondary">
        Consultar recuerdos guardados
      </a>
    </main>
  );
}
