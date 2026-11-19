# Frente K • Atualizar o Three.js

Origem: blueprint, frente E, item 5, e seção de riscos. **Esta é a única frente que não roda em paralelo com as outras.** Ela mexe em API usada por quase tudo (`outputEncoding`, cor, unidades de luz, exportadores) e conflitaria com todas.

## Quando executar

**Por último**, depois que as frentes A a J estiverem mescladas e os catálogos regenerados. Antes de começar, rebase em `main`. A frente A (medição e regressão visual) é o que garante que a aparência não mude sem querer.

## Objetivo

Sair do Three.js 0.149 para uma versão recente estável, sem regressão visual nem de exportação.

## Pode editar

- `package.json` e `package-lock.json`
- Qualquer arquivo em `src/` e `web/` estritamente necessário para a migração de API
- `docs/frentes/k-upgrade-three.md` (este arquivo)

## Entregas

1. Migração de `outputEncoding` para `outputColorSpace`, de `sRGBEncoding` para o equivalente, e de qualquer API removida.
2. Ajuste das unidades de luz (intensidade física) e da exposição para que a imagem fique equivalente à de hoje.
3. Tone mapping AgX ou Neutral avaliado contra o ACES atual, com imagens lado a lado.
4. Exportadores GLB e USDZ validados (Khronos e Quick Look) e o teste de exportação passando.
5. Nota de migração com cada mudança de API e o motivo.

## Critério de aceite

- Regressão visual da frente A sem diferença além da tolerância, ou diferença aprovada explicitamente por quem revisa.
- Todos os testes passam, incluindo o validador da Khronos.
- O site (`ludusequipamentos-website`) continua montando o simulador com a versão nova.

## Não faça

Não misture mudança de aparência intencional com a migração: primeiro igual, depois melhor.
