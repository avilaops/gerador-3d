/**
 * O GLTFExporter (r149) usa FileReader para montar o GLB, e o Node não tem
 * FileReader. Este shim mínimo cobre só o que o exportador chama. Não importar
 * no bundle do navegador.
 */
export function installNodeShims(): void {
  const g = globalThis as unknown as Record<string, unknown>;
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

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
