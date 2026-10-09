import { createRequire } from 'node:module';

/**
 * O GLTFExporter (r149) usa FileReader para montar o GLB, e o Node não tem
 * FileReader. Este shim mínimo cobre só o que o exportador chama. Não importar
 * no bundle do navegador.
 *
 * Também instala um canvas (pacote opcional `@napi-rs/canvas`), para os adesivos
 * serem desenhados e irem como textura dentro do GLB e do USDZ. Sem o pacote, o
 * modelo sai sem adesivos, como antes.
 */
export function installNodeShims(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  installCanvas(g);
  if (typeof g.FileReader !== 'undefined') return;
  class NodeFileReader {
    result: ArrayBuffer | string | null = null;
    onload: ((ev: { target: NodeFileReader }) => void) | null = null;
    onloadend: ((ev: { target: NodeFileReader }) => void) | null = null;
    onerror: ((err: unknown) => void) | null = null;
    readAsArrayBuffer(blob: Blob): void {
      blob.arrayBuffer().then(
        (buf) => this.finish(buf),
        (e) => this.onerror?.(e)
      );
    }
    readAsDataURL(blob: Blob): void {
      blob.arrayBuffer().then(
        (buf) =>
          this.finish(
            `data:${blob.type || 'application/octet-stream'};base64,${toBase64(new Uint8Array(buf))}`
          ),
        (e) => this.onerror?.(e)
      );
    }
    private finish(result: ArrayBuffer | string) {
      this.result = result;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    }
  }
  g.FileReader = NodeFileReader;
}

interface NodeCanvas {
  toBuffer(mime: string): unknown;
}

function installCanvas(g: Record<string, unknown>): void {
  if (typeof g.document !== 'undefined' || typeof g.OffscreenCanvas !== 'undefined') return;
  let lib: {
    createCanvas(w: number, h: number): NodeCanvas;
    ImageData: unknown;
  };
  try {
    lib = createRequire(import.meta.url)('@napi-rs/canvas');
  } catch {
    return;
  }
  // O protótipo vem de uma instância: `createCanvas` devolve uma subclasse de `Canvas`.
  const proto = Object.getPrototypeOf(lib.createCanvas(1, 1)) as Record<string, unknown>;
  // O canvas do pacote tem um método `data()`; o GLTFExporter trata como DataTexture tudo o que
  // tem `image.data` e gravaria a textura em branco.
  Object.defineProperty(proto, 'data', { value: undefined, configurable: true });
  proto.toBlob = function (this: NodeCanvas, done: (b: Blob) => void, type = 'image/png') {
    done(new Blob([this.toBuffer(type) as BlobPart], { type }));
  };
  // Mesma classe do canvas do pacote, para `instanceof OffscreenCanvas` valer nos exportadores.
  const Offscreen = function (w: number, h: number) {
    return lib.createCanvas(w, h);
  };
  Offscreen.prototype = proto;
  g.OffscreenCanvas = Offscreen;
  // O GLTFExporter testa `instanceof ImageData` ao gravar a textura.
  if (typeof g.ImageData === 'undefined') g.ImageData = lib.ImageData;
  // O USDZExporter cria o canvas pelo `document`.
  g.document = { createElement: () => lib.createCanvas(1, 1) };
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
