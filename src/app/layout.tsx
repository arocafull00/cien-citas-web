import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { PwaControls } from '@/components/pwa-controls';
import './globals.css';
const lora = localFont({ src: [
  { path: '../../public/fonts/Lora/static/Lora-Regular.ttf', weight: '400' },
  { path: '../../public/fonts/Lora/static/Lora-SemiBold.ttf', weight: '600' },
  { path: '../../public/fonts/Lora/static/Lora-Bold.ttf', weight: '700' },
  { path: '../../public/fonts/Lora/static/Lora-Italic.ttf', weight: '400', style: 'italic' },
], variable: '--font-lora', display: 'swap' });
const sans = localFont({ src: [
  { path: '../../public/fonts/SourceSans3-Regular.ttf', weight: '400' },
  { path: '../../public/fonts/SourceSans3-SemiBold.ttf', weight: '600' },
], variable: '--font-sans', display: 'swap' });
export const metadata: Metadata = {
  title: { default: '100 Citas antes de casarse', template: '%s · 100 Citas' },
  description: 'Vivid vuestra historia, una cita a la vez.', applicationName: '100 Citas',
  appleWebApp: { capable: true, title: '100 Citas', statusBarStyle: 'default' },
  icons: { icon: '/images/favicon.png', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#fcf9f4', colorScheme: 'light' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="es" className={`${lora.variable} ${sans.variable}`}><body>
    <div className="app-shell">{children}<PwaControls /></div>
  </body></html>;
}
