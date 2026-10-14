import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export const dynamic = 'force-static';
export async function GET() {
  return new Response(await readFile(join(process.cwd(), 'public/offline.html'), 'utf8'), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
