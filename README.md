# Gerador 3D paramétrico de equipamentos

Gera modelos 3D de equipamentos a partir de dados (dimensões + família + parâmetros de forma), sem arquivo de modelo de fabricante. O mesmo modelo alimenta o viewer da página de produto, o AR (GLB/USDZ), o Arxis (layout e VR) e a planta 2D.

Primeiro cliente: Ludus Equipamentos. O núcleo não tem lógica de cliente: specs ficam em `specs/`, famílias em `families/`.

## Convenções (valem para todo modelo gerado)

- Metros, eixo Y para cima.
- Origem no centro da projeção no piso: apoiado em y = 0, centrado em x e z.
- Frente do equipamento (lado de entrada do usuário) em +Z.
- Catálogo `[C, L, A]`: C = profundidade (Z), L = largura (X), A = altura (Y). A largura considera partes móveis na posição mais aberta, que é a fase 0.
- Caixa envolvente em repouso dentro de ±2% de C × L × A (teste automatizado).
- Nós com nomes estáveis: `base`, `tower`, `stack`, `seat`, `backrest`, `head`, `frame`, `row_station`, `foot_assist`, `arm_left`, `arm_right`. A raiz leva o id do spec (`LD-B004`).

## Estrutura

```
spec/schema.ts          EquipmentSpec (zod) e validação
parts/kit.ts            materiais PBR e geometrias unitárias compartilhadas
parts/primitives.ts     beam, bentTube, box, upholstery, rubberFoot, pulley, cable, plateHorn
parts/assemblies.ts     tower, weightStack, pivotArm
families/               um gerador por família + registry
  selectorizedTower.ts  torre + bateria (ref. Peck Deck LD-B004)
  plateLoadedLever.ts   alavancas com pinos de anilha (ref. Supino e Remada LD-A002)
animation.ts            fase única 0..1 → poses e AnimationClip
footprint.ts            projeção em planta, área de treino
generate.ts             generateEquipment(spec)
export/                 GLB (com animação), USDZ, planta SVG, shim do FileReader para Node
viewer/                 EquipmentViewer (sem framework) e EquipmentViewerView (React)
specs/                  specs escritos à mão (LD-B004, LD-A002)
demo/                   página local com os dois modelos lado a lado
__tests__/              bbox, nomes, pivôs, animação, orçamento, exportação
```

## Uso

```ts
import { generateEquipment, exportGlb, planSvg } from '@/features/equipment-generator';

const eq = generateEquipment({
  id: 'LD-B004',
  name: 'Peck Deck',
  family: 'selectorized-tower',
  dimensionsMm: { length: 1310, width: 1200, height: 2050 },
});
scene.add(eq.object);          // THREE.Group, origem no piso
eq.clip;                       // AnimationClip do movimento (vai e volta)
eq.footprint.trainingArea;     // retângulo + folga, em m e m²
const glb = await exportGlb(eq);
const svg = planSvg(eq);
```

Um spec só com dimensões e família já gera um modelo plausível. `params` refina a forma (ver o schema de cada família) e `articulations` ajusta o curso por nó, por exemplo `{ "node": "arm_left", "range": [0, 1.0] }`. O pivô de cada articulação vem da geometria da família.

Viewer:

```ts
import { EquipmentViewer } from '@/features/equipment-generator/viewer/EquipmentViewer';
const v = new EquipmentViewer(document.getElementById('viewer')!);
v.setEquipment(spec);          // botões: Movimento, Área de treino, Pessoa 1,75 m, Medidas
```

No React: `<EquipmentViewerView spec={spec} />`.

## Comandos (na pasta `frontend/`)

| O quê | Comando |
| --- | --- |
| Testes do módulo | `npx vitest run src/features/equipment-generator` |
| Demo local | `npm run dev` e abrir `/src/features/equipment-generator/demo/index.html` |
| Exportar GLB, USDZ, SVG e spec.json | `npm run equipment:export` (saída em `dist/equipment/<id>/`) |
| Exportar outro lote | `npm run equipment:export -- --specs lote.json --out ../saida` |

`dist/equipment/` é apagado pelo `vite build` (o build limpa `dist/`). Para guardar a saída, use `--out` fora de `dist/`.

## Orçamento por modelo

Até 30 mil triângulos e GLB de até 1,5 MB (testado). Os dois modelos da Fase 1 ficam em torno de 2,8 mil triângulos e 115 a 135 KB, porque todas as peças retas reaproveitam a mesma caixa e o mesmo cilindro unitários.

## Limitações conhecidas

- O USDZ vai estático (o Quick Look não toca a animação desse exportador).
- O GLTFExporter r149 não exporta `InstancedMesh`; as placas da bateria compartilham geometria e material em vez de instancing. O efeito no arquivo é o mesmo (uma geometria gravada uma vez).
- Famílias `bench`, `rack`, `cable-station` e `leg-press` existem no schema, mas ainda não têm gerador (lançam `UnsupportedFamilyError`).
