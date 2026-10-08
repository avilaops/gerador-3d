/**
 * Miniaturas PNG de um catálogo, renderizadas num navegador sem tela
 * (Chrome ou Edge já instalado; nada é baixado).
 *
 * Uso:
 *   npm run thumbs                          # catálogo ludus
 *   npm run thumbs -- --catalog nome --only LD-B004,LD-A002
 *   npm run thumbs -- --phase 1 --name pose # outro quadro do movimento
 *
 * Saída: `catalogs/<nome>/models/<id>/<name>.png` (padrão: thumb.png, 800 × 800).
 * Variável CHROME_PATH aponta para outro navegador, se preciso.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const catalog = arg('catalog') ?? 'ludus';
const only = arg('only')?.split(',');
const name = arg('name') ?? 'thumb';
const options = {
  phase: Number(arg('phase') ?? 0),
  azimuth: arg('azimuth') ? Number(arg('azimuth')) : undefined,
  distance: Number(arg('distance') ?? 1.18),
  elevation: Number(arg('elevation') ?? 16),
  human: process.argv.includes('--human'),
  area: process.argv.includes('--area'),
  dims: process.argv.includes('--dims'),
};
const dir = resolve('catalogs', catalog);
const specsDir = join(dir, 'specs');

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((p): p is string => !!p);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('Chrome/Edge não encontrado. Defina CHROME_PATH.');
  process.exit(1);
}

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const address = server.httpServer!.address();
const port = typeof address === 'object' && address ? address.port : 5173;

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
let failed = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('página:', (e as Error).message));
  await page.goto(`http://127.0.0.1:${port}/render.html`);
  await page.waitForFunction('window.ready === true', { timeout: 60_000 });

  const files = readdirSync(specsDir).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const spec = JSON.parse(readFileSync(join(specsDir, f), 'utf8'));
    if (only && !only.includes(spec.id)) continue;
    try {
      const url = (await page.evaluate(
        (s, o) => (window as unknown as { shoot: (s: unknown, o: unknown) => string }).shoot(s, o),
        spec,
        // Equipamento comprido e estreito (crossover, remada T) aparece melhor mais de lado.
        {
          ...options,
          // O spec pode pedir a miniatura numa fase do movimento (ex.: braços já meio fechados).
          phase: arg('phase') ? options.phase : Number(spec.meta?.thumbPhase ?? 0),
          azimuth:
            options.azimuth ??
            (spec.dimensionsMm.length > 1.7 * spec.dimensionsMm.width ? -62 : -38),
        }
      )) as string;
      const out = join(dir, 'models', spec.id);
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    } catch (e) {
      failed++;
      console.error(`erro ${spec.id}: ${(e as Error).message}`);
    }
  }
  console.warn(`miniaturas (${name}.png) em ${join(dir, 'models')}${failed ? `, ${failed} com erro` : ''}`);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
