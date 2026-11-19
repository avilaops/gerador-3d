# Frente K • Atualizar o Three.js

Origem: blueprint, frente E, item 5, e seção de riscos. **Esta é a única frente que não roda em paralelo com as outras.** Ela mexe em API usada por quase tudo e conflitaria com todas.

## Quando executar

**Por último**, depois que as frentes A a J estiverem mescladas e os catálogos regenerados. Antes de começar, rebase em `main`. A frente A (medição e regressão visual) é a rede de proteção: sem ela, não dá para provar que a imagem não mudou.

## Objetivo

Sair do Three.js 0.149 para uma versão recente estável, sem regressão visual nem de exportação. Primeiro **igual**, depois melhor.

## Pode editar

- `package.json` e `package-lock.json`
- Qualquer arquivo em `src/`, `web/` e `scripts/` estritamente necessário para a migração de API
- `docs/frentes/k-upgrade-three.md` (este arquivo) e `docs/frentes/evidencias/k-upgrade-three/`

## Pontos de migração já mapeados

| Onde | O que é |
| --- | --- |
| `src/viewer/EquipmentViewer.ts:205` | `renderer.outputEncoding = THREE.sRGBEncoding` |
| `src/viewer/EquipmentViewer.ts:660` | `texture.encoding = THREE.sRGBEncoding` |
| `src/parts/decals.ts:83` | `map.encoding = THREE.sRGBEncoding` |
| `src/thermal-box/ThermalBoxViewer.ts:118` e `:185` | os mesmos dois usos, no outro viewer |
| `src/thermal-box/ThermalBoxViewer.ts:2-4` | importa de `three/examples/jsm/...` (o resto usa `three/addons/...`) |
| `package.json` | `three` e `@types/three` fixados em 0.149 |

Além da API:

- **Unidades de luz.** A partir do r155 a iluminação física é o padrão e as intensidades de luz mudam por um fator em torno de π. Luzes atuais: principal 1,1, contraluz 0,2, hemisfério 0,08, exposição 0,72. Recalibrar para a imagem ficar igual. Entre o r155 e o r164 existe `renderer.useLegacyLights` como ponte; ele some no r165, então use só como degrau da migração.
- **Tone mapping.** `ACESFilmicToneMapping` hoje. Avalie AgX e Neutral depois de fechar a versão igual.
- **Exportadores** (`GLTFExporter`, `USDZExporter`): o comportamento muda entre versões. O teste do validador da Khronos precisa seguir passando.
- **`SimplifyModifier` e `RoundedBoxGeometry`**: conferir caminho de importação.

## Entregas

1. Migração de `outputEncoding` e `encoding` para o espaço de cor novo, e de qualquer API removida.
2. Recalibração das luzes e da exposição para equivalência visual.
3. Tone mapping AgX e Neutral avaliados contra o ACES atual, com imagens lado a lado (como proposta, **não** como mudança embutida).
4. Exportadores GLB e USDZ validados (Khronos e Quick Look).
5. Nota de migração com cada mudança de API e o motivo.
6. **PR companheiro no site** (`ludusequipamentos-website`): o site fixa `three` e `@types/three` em `^0.149.0` e o simulador tem cena própria. A versão nova precisa entrar nos dois ao mesmo tempo, senão o site quebra.

## Testes

- Regressão visual da frente A: diferença dentro da tolerância, ou diferença aprovada explicitamente por quem revisa.
- Todos os testes passam, incluindo o validador da Khronos.
- O site monta o simulador com a versão nova (build e teste do site).

## Riscos

- Aparência muda em todo item. Por isso a migração é feita **sem** mudança intencional de visual.
- Dependência de `@napi-rs/canvas` e do `gltf-validator` com a versão nova.
- O site e o gerador em versões diferentes de Three geram dois bundles; evitar.

## Não faça

Não misture mudança de aparência com a migração.

## Critério de aceite

- Regressão visual dentro da tolerância em todos os itens, ou lista de exceções aprovada.
- Todos os testes passam; site montando com a versão nova.
