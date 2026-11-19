import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { foraDoEscopo, globParaRegex, type MapaEscopo } from '../scripts/escopo-frentes';

const mapa = JSON.parse(readFileSync(new URL('../docs/frentes/escopo.json', import.meta.url), 'utf8')) as MapaEscopo;

describe('globParaRegex', () => {
  it('** atravessa pastas e * fica dentro de um segmento', () => {
    expect(globParaRegex('src/parts/tower/**').test('src/parts/tower/a/b.ts')).toBe(true);
    expect(globParaRegex('src/parts/*.ts').test('src/parts/kit.ts')).toBe(true);
    expect(globParaRegex('src/parts/*.ts').test('src/parts/tower/a.ts')).toBe(false);
  });
  it('o ponto é literal', () => {
    expect(globParaRegex('src/generate.ts').test('src/generateXts')).toBe(false);
  });
});

describe('foraDoEscopo', () => {
  it('aceita o que a frente pode editar, o brief e a evidência', () => {
    expect(
      foraDoEscopo(
        'h-torre-bateria',
        ['src/parts/assemblies.ts', 'src/families/machine/machine.ts', 'docs/frentes/h-torre-bateria.md', 'docs/frentes/evidencias/h-torre-bateria/antes.png'],
        mapa
      )
    ).toEqual([]);
  });

  it('reprova arquivo de outra frente', () => {
    expect(foraDoEscopo('d-materiais-pbr', ['src/parts/kit.ts', 'src/viewer/EquipmentViewer.ts'], mapa)).toEqual([
      'src/viewer/EquipmentViewer.ts',
    ]);
  });

  it('o brief de outra frente também é proibido', () => {
    expect(foraDoEscopo('a-medicao', ['docs/frentes/b-pecas-por-produto.md'], mapa)).toEqual([
      'docs/frentes/b-pecas-por-produto.md',
    ]);
  });

  it('exclusão vence a permissão: machine.ts é da torre, não das alavancas', () => {
    expect(
      foraDoEscopo('i-alavancas', ['src/families/machine/exercises.ts', 'src/families/machine/machine.ts'], mapa)
    ).toEqual(['src/families/machine/machine.ts']);
  });

  it('só a frente G pode mexer no lockfile', () => {
    expect(foraDoEscopo('g-export-lod', ['package-lock.json'], mapa)).toEqual([]);
    expect(foraDoEscopo('c-biblioteca-detalhes', ['package-lock.json'], mapa)).toEqual(['package-lock.json']);
  });

  it('pontos comuns não pertencem a nenhuma frente, exceto a K', () => {
    for (const comum of ['src/index.ts', 'vite.config.ts', 'catalogs/ludus-core/classify.ts', 'README.md', 'catalogs/ludus-core/manifest.json']) {
      for (const slug of Object.keys(mapa.frentes).filter((s) => s !== 'k-upgrade-three')) {
        expect(foraDoEscopo(slug, [comum], mapa)).toEqual([comum]);
      }
    }
    expect(foraDoEscopo('k-upgrade-three', ['src/index.ts'], mapa)).toEqual([]);
  });

  it('caminhos do Windows são normalizados', () => {
    expect(foraDoEscopo('a-medicao', ['scripts\\medicao\\iou.ts'], mapa)).toEqual([]);
  });

  it('frente desconhecida é erro, não aprovação silenciosa', () => {
    expect(() => foraDoEscopo('x-inexistente', ['a.ts'], mapa)).toThrow(/desconhecida/);
  });

  it('nenhum caminho exclusivo é permitido a duas frentes ao mesmo tempo', () => {
    const exclusivos = Object.entries(mapa.frentes)
      .filter(([slug]) => slug !== 'k-upgrade-three')
      .flatMap(([slug, f]) => f.permitir.filter((p) => !p.includes('*')).map((p) => [p, slug] as const));
    const donos = new Map<string, string>();
    for (const [arquivo, slug] of exclusivos) {
      const outro = donos.get(arquivo);
      expect(outro && outro !== slug ? `${arquivo}: ${outro} e ${slug}` : null).toBeNull();
      donos.set(arquivo, slug);
    }
  });
});
