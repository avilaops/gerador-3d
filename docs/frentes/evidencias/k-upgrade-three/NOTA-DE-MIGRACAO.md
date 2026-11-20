# Nota de migração: Three.js r149 para r186

Cada mudança de API que o projeto precisou, e o motivo.

| Onde | Antes (r149) | Depois (r186) | Motivo |
| --- | --- | --- | --- |
| `EquipmentViewer`, `ThermalBoxViewer` | `renderer.outputEncoding = THREE.sRGBEncoding` | `renderer.outputColorSpace = THREE.SRGBColorSpace` | `outputEncoding` e `sRGBEncoding` foram removidos (r162) |
| `EquipmentViewer`, `ThermalBoxViewer`, `decals.ts` | `texture.encoding = THREE.sRGBEncoding` | `texture.colorSpace = THREE.SRGBColorSpace` | idem |
| Luzes direcional e hemisférica | intensidade calibrada no r149 | `intensidade × π` (`src/viewer/lightUnits.ts`) | a partir do r155 a iluminação é física, sem o π implícito; `useLegacyLights` foi removido no r165 |
| `SimplifyModifier.modify` | síncrono, algoritmo próprio | **assíncrono**, baseado em meshoptimizer (WASM) | mudança do Three; `buildLodVariants` virou `async` e retorna `Promise<LodVariant[]>` (**quebra de API pública**) |
| `USDZExporter` | `parse(scene)` devolvia `Uint8Array` | `parseAsync(scene)` | `parse` agora usa callbacks |
| `GLTFExporter` com canvas | usava `canvas.toBlob` | usa `canvas.convertToBlob` quando o canvas é `OffscreenCanvas` | o shim de Node (`nodeShims.ts`) implementa `convertToBlob` de forma síncrona |
| Exportação GLB, ordem das `bufferViews` | determinística | variava entre execuções (2 de 8) | as leituras de imagem terminavam em ordem aleatória; `nodeShims.ts` agora as enfileira. Voltou a 8 de 8 idênticas |

## Não mudou

- `three/addons/...` (já era o caminho usado), `RoundedBoxGeometry`, `ACESFilmicToneMapping` (mantido; AgX e Neutral **não foram avaliados**).
- Nenhuma intensidade de luz do rig (`rig.ts`) foi alterada: o fator π fica na construção das luzes.
