/**
 * Renderiza a silhueta do modelo num navegador sem tela (Chrome ou Edge já instalado; nada é
 * baixado), reaproveitando `render.html` e a opção `mask` de `window.shoot`, que esconde a
 * sombra do piso. Não edita `scripts/thumbnails.ts`: a lógica de abertura foi copiada.
 */
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
import type { EquipmentSpecInput } from '../../src/spec/schema';
import { lerImagem } from './imagem';
import { modeloParaMascara, type Mask, type RGB } from './mascara';

/** Fundo da página de render (`web/render.ts`): `#f4f3ef`. */
export const FUNDO_RENDER: RGB = [244, 243, 239];

export interface VistaRender {
  azimute: number;
  elevacao: number;
  distancia?: number;
}

export interface Renderizador {
  mascara(spec: EquipmentSpecInput, vista: VistaRender): Promise<Mask>;
  fechar(): Promise<void>;
}

const NAVEGADORES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((p): p is string => !!p);

export function acharNavegador(): string {
  const caminho = NAVEGADORES.find((p) => existsSync(p));
  if (!caminho) throw new Error('Chrome ou Edge não encontrado. Defina CHROME_PATH.');
  return caminho;
}

export async function abrirRenderizador(): Promise<Renderizador> {
  const executablePath = acharNavegador();
  // `watch: null` desliga o observador de arquivos: sem isso, editar qualquer arquivo do projeto
  // durante uma medição recarrega a página e derruba a renderização em curso ("Execution context
  // was destroyed" ou "window.shoot is not a function"), além de misturar versões do código.
  const servidor = await createServer({ server: { port: 0, host: '127.0.0.1', watch: null }, logLevel: 'error' });
  await servidor.listen();
  const endereco = servidor.httpServer!.address();
  const porta = typeof endereco === 'object' && endereco ? endereco.port : 5173;
  const navegador = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 800, height: 800, deviceScaleFactor: 1 });
  pagina.on('pageerror', (e) => console.error('página:', (e as Error).message));
  await pagina.goto(`http://127.0.0.1:${porta}/render.html`);
  await pagina.waitForFunction('window.ready === true', { timeout: 60_000 });

  return {
    async mascara(spec, vista) {
      const url = (await pagina.evaluate(
        (s, o) => (window as unknown as { shoot: (s: unknown, o: unknown) => string }).shoot(s, o),
        spec,
        { azimuth: vista.azimute, elevation: vista.elevacao, distance: vista.distancia ?? 1.18, mask: true }
      )) as string;
      const px = await lerImagem(Buffer.from(url.split(',')[1], 'base64'));
      return modeloParaMascara(px.data, px.w, px.h, FUNDO_RENDER);
    },
    async fechar() {
      await navegador.close();
      await servidor.close();
    },
  };
}
