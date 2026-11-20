/**
 * Fotos de referência dos produtos. Ficam fora do repositório: o cache vai para uma pasta
 * escolhida por quem roda (padrão: pasta temporária do sistema).
 *
 * A origem padrão é a vitrine publicada, que serve a foto de cada código em
 * `/midias/produtos/<codigo>`. Outra origem pode ser uma pasta local com `<codigo>.<ext>`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ORIGEM_PADRAO = 'https://ludusequipamentos.com/midias/produtos';
const EXTENSOES = ['.webp', '.png', '.jpg', '.jpeg'];

/** Procura `<codigo>.<ext>` numa pasta; devolve o caminho ou `null`. */
export function acharNaPasta(pasta: string, codigo: string): string | null {
  if (!existsSync(pasta)) return null;
  const arquivos = readdirSync(pasta);
  for (const ext of EXTENSOES) {
    const achado = arquivos.find((a) => a.toLowerCase() === `${codigo.toLowerCase()}${ext}`);
    if (achado) return join(pasta, achado);
  }
  return null;
}

/** Devolve os bytes da foto, usando o cache e baixando só o que falta. */
export async function obterFoto(codigo: string, cache: string, origem = ORIGEM_PADRAO): Promise<Buffer> {
  mkdirSync(cache, { recursive: true });
  const local = acharNaPasta(cache, codigo);
  if (local) return readFileSync(local);
  if (!/^https?:\/\//.test(origem)) {
    const daPasta = acharNaPasta(origem, codigo);
    if (!daPasta) throw new Error(`Foto de ${codigo} não encontrada em ${origem}.`);
    return readFileSync(daPasta);
  }
  const resposta = await fetch(`${origem}/${encodeURIComponent(codigo)}`);
  if (!resposta.ok) throw new Error(`Foto de ${codigo}: HTTP ${resposta.status}.`);
  const tipo = resposta.headers.get('content-type') ?? '';
  const ext = tipo.includes('png') ? '.png' : tipo.includes('jpeg') ? '.jpg' : '.webp';
  const bytes = Buffer.from(await resposta.arrayBuffer());
  writeFileSync(join(cache, `${codigo}${ext}`), bytes);
  return bytes;
}
