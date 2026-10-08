# Gerador 3D paramétrico de equipamentos

Gera modelos 3D de equipamentos a partir de dados (dimensões + família + mecanismo), sem arquivo de modelo de fabricante. O mesmo modelo alimenta o visualizador da página de produto, o AR (GLB/USDZ), o layout em planta e o catálogo impresso (miniatura e planta 2D).

O núcleo (`src/`) não tem lógica de cliente. Cada catálogo mora em `catalogs/<nome>/`. O primeiro é o da Ludus Equipamentos, com 94 itens.

## Comandos

| O quê | Comando |
| --- | --- |
| Galeria local (todos os modelos, 3D, planta, downloads) | `npm run dev` |
| Testes (caixa ±2%, piso, articulações, exportação) | `npm test` |
| Checagem de tipos | `npm run typecheck` |
| Specs do catálogo a partir de `products.json` | `npm run specs` |
| GLB, USDZ, planta SVG e manifesto | `npm run export -- --catalog ludus` |
| Miniaturas PNG (Chrome ou Edge sem tela) | `npm run thumbs` |
| Tudo de uma vez | `npm run catalog` |
| Publicar a galeria em https://ludus.avilaops.com | `npm run deploy` |

A galeria publicada fica em https://ludus.avilaops.com (pré-visualização interna, marcada como noindex; servidor `applications`, arquivos estáticos em `/var/www/ludus.avilaops.com`).

Na galeria, `?id=LD-B004` abre um equipamento e `?id=LD-B004&embed=1` mostra só o visualizador, para uso em iframe.

## Convenções de todo modelo

- Metros, eixo Y para cima.
- Origem no centro da projeção no piso: apoiado em y = 0, centrado em x e z.
- Frente do equipamento (lado de entrada do usuário) em +Z.
- Catálogo `[C, L, A]`: C = profundidade (Z), L = largura (X), A = altura (Y).
- Caixa envolvente em repouso dentro de ±2% de C × L × A (teste automatizado para os 94 itens).
- Nós com nomes estáveis (`base`, `tower`, `stack`, `seat`, `backrest`, `arm_left`, `arm_right`, `lever`, `carriage`...). A raiz leva o id do spec.

## Estrutura

```
src/
  spec/schema.ts            EquipmentSpec (zod) e validação
  parts/                    kit (materiais e geometrias compartilhadas), peças, conjuntos e o Rig de montagem
  families/
    selectorizedTower.ts    torre com bateria (Peck Deck à mão; demais pela máquina genérica)
    plateLoadedLever.ts     peso livre articulado (Supino e Remada à mão; demais pela máquina genérica)
    machine/                máquina genérica: estações do corpo + tabela de exercícios (alavancas)
    bench.ts                bancos, bancos de supino com suporte, Scott, extensão lombar
    rack.ts                 suporte de barras, de anilhas e apoio de piso
    cableStation.ts         crossover, estação dupla, cross-smith
    legPress.ts             leg press, hack, V-squat/pendulum, belt squat, leg press horizontal
  generate.ts               generateEquipment(spec), com ajuste à caixa do catálogo
  animation.ts              fase única 0..1 → poses e AnimationClip
  footprint.ts              projeção em planta e área de treino
  export/                   GLB (com animação), USDZ, planta SVG
  viewer/                   EquipmentViewer (sem framework) e EquipmentViewerView (React)
  specs/                    specs de exemplo escritos à mão
catalogs/ludus/
  products.json             os 94 produtos (código, nome, linha, dimensões, bateria)
  classify.ts               produto → spec (tabela por código + regras por nome + cores por linha)
  specs/                    um spec por produto (gerado por `npm run specs`)
  models/<id>/              model.glb, plan.svg, spec.json, thumb.png (e model.usdz, fora do git)
  manifest.json             índice para o site e o catálogo: arquivos, medidas, área de treino, avisos
web/                        galeria de revisão e página de renderização das miniaturas
scripts/                    build-specs, export, thumbnails
tests/
```

## Uso como biblioteca

```ts
import { generateEquipment, exportGlb, planSvg } from '@avilaops/gerador-3d';
import { EquipmentViewer } from '@avilaops/gerador-3d/viewer';

const eq = generateEquipment({
  id: 'LD-B008',
  name: 'Supino Vertical',
  family: 'selectorized-tower',
  dimensionsMm: { length: 1480, width: 1080, height: 1540 },
  weightStackKg: { perStack: 138, stacks: 1 },
  params: { mechanism: 'chest-press' },
});
scene.add(eq.object); // THREE.Group, origem no piso
eq.clip; // AnimationClip do movimento
eq.footprint.trainingArea; // retângulo + folga, em m e m²

new EquipmentViewer(document.getElementById('viewer')!).setEquipment(spec);
// botões: Movimento, Área de treino, Pessoa 1,75 m, Medidas
```

Um spec só com dimensões e família já gera um modelo. `params` escolhe o mecanismo ou a variante e refina a forma; `articulations` ajusta o curso por nó; `materials` troca as cores.

## Como o modelo cabe na caixa do catálogo

A estrutura carrega as medidas: longarinas no comprimento C, travessa na largura L, torre ou quadro na altura A. O mecanismo é dimensionado pelo corpo de quem usa (altura do assento, ombro, joelho). Se alguma peça passa da caixa em mais de 1%, o gerador remonta a família com dimensões de projeto corrigidas, o que mantém a seção dos tubos. Só o que sobra depois disso é corrigido por escala, e vira aviso no manifesto.

## Estado da revisão

Os specs gerados pela tabela saem com `review.status = "needs_review"`: a silhueta e o mecanismo representam o tipo do equipamento, não cada detalhe da foto. LD-B004 e LD-A002 foram escritos à mão e estão `approved`. Para aprovar um item, ajuste `params` no spec (ou a regra em `classify.ts`), confira na galeria e mude o status.

Diferenças conhecidas em relação às fotos:

- LD-B035 (Estação Multifuncional Dupla) é uma torre central com dois braços; o modelo usa duas torres.
- As máquinas iso-laterais com bateria usam duas torres nas laterais; as fotos mostram carenagens integradas ao quadro.
- Arcos, mastros e braços de empurrar e puxar já são de tubo curvado; bases, pernas de apoio e a maior parte dos bancos ainda são retos.

## Limites

- Até 30 mil triângulos e GLB de até 1,5 MB por modelo (testado). Hoje o maior tem cerca de 8 mil triângulos e 320 KB.
- O USDZ vai estático: o Quick Look não toca a animação desse exportador.
- O GLTFExporter r149 não exporta `InstancedMesh`; as peças compartilham geometria e material, o que dá o mesmo efeito no arquivo.
