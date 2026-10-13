import { neon } from '@neondatabase/serverless';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
process.loadEnvFile('.env.local');
const checks = [
  ['Neon', async () => { await neon(process.env.DATABASE_URL)`SELECT 1`; return 'conexión verificada (solo lectura)'; }],
  ['Geoapify', async () => {
    const params = new URLSearchParams({ text: 'Jardín del Turia', filter: 'countrycode:es', lang: 'es', format: 'json', limit: '3', apiKey: process.env.GEOAPIFY_API_KEY });
    const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`);
    if (!response.ok) return `HTTP ${response.status}`;
    const data = await response.json(); return `clave verificada, ${data.results.length} sugerencias`;
  }],
  ['Clerk', async () => { const response = await fetch('https://api.clerk.com/v1/instance', { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } }); return `HTTP ${response.status}`; }],
  ['R2', async () => {
    const client = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
    await client.send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET_NAME })); return 'bucket accesible (solo lectura)';
  }],
];
await Promise.all(checks.map(async ([name, run]) => { try { console.log(`${name}: ${await run()}`); } catch { console.log(`${name}: no verificado`); } }));
