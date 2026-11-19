# Blueprint • do modelo paramétrico ao realismo de foto

Este documento descreve o que falta para os modelos do gerador 3D chegarem perto de uma foto de produto, e em que ordem fazer. Ele parte do código atual e da comparação foto × modelo dos 66 itens Core, feita em novembro de 2026.

## 1. Onde estamos

### 1.1 O que o código faz hoje

| Área | Estado verificado | Efeito no resultado |
| --- | --- | --- |
| Motor | Three.js 0.149 | Sem AgX nem Neutral, sem `outputColorSpace`, exportadores antigos |
| Materiais | Só `MeshStandardMaterial`, com cor, rugosidade e metal constantes (`src/parts/kit.ts`) | Superfície lisa e uniforme, sem textura nem micro-detalhe |
| Texturas | Só os adesivos da torre (`decals.ts`) | Nada de pó de tinta, couro, costura, chapa antiderrapante |
| Geometria | Cilindros com 24 segmentos, tubos retangulares arredondados, estofado como caixa arredondada | Silhueta limpa, mas sem solda, parafuso, tampa, costura nem bordas biseladas |
| Luz | `RoomEnvironment` genérico, uma luz principal, uma de contorno, hemisfério de 0,08, exposição 0,72 | Reflexos de "sala 3D", não de estúdio |
| Sombra | `ShadowMaterial` no piso, mapa de sombra de 1024 ou 2048 | Sem sombra de contato nem oclusão ambiente |
| Pós-processo | Nenhum além do antialias do WebGL | Sem SSAO, sem suavização de borda de qualidade |
| Orçamento | Até 30 mil triângulos e 1,5 MB por GLB; o maior hoje tem cerca de 8 mil triângulos e 320 KB | O teto atual impede detalhe, mas o uso real está bem abaixo dele |
| Formas | 6 famílias paramétricas mais uma máquina genérica; 160 produtos viram arquétipos | A forma de cada produto é uma aproximação do tipo, não do produto |
| Pessoa | Figura procedural articulada (`viewer/figure.ts`) | Serve de escala, não de realismo |
| Revisão | Todos os 66 Core estão `needs_review`; só 2 do Premium estão `approved` | Nenhum item tem aprovação visual formal |

### 1.2 O que a comparação com as fotos mostrou

- O maior erro é de **forma**, não de acabamento. Antes da reclassificação por foto, supinos articulados viravam banco reto, Smith virava rack e Scott virava banco.
- Mesmo depois de acertar o tipo, as **torres de bateria** são um bloco maciço, e a foto mostra um quadro aberto com colunas-guia, pilha de placas e cabos à vista.
- Máquinas de alavanca de anilha (agachamentos, panturrilha, remada solo) seguem longe: braços, contrapesos e plataformas têm proporção e articulação próprias.
- Todo item ainda parece "feito de tubo e caixa". Falta o que a foto tem: solda, tampas de tubo, parafusos, costura, logo cortado, chapa furada.

### 1.3 Conclusão de diagnóstico

Um gerador paramétrico por família não chega a "quase perfeito" sozinho. Ele acerta o tipo do equipamento e as medidas, que é o que importa para planta e espaço. Para parecer foto, o caminho é **híbrido**: manter o paramétrico como base (medidas, família, animação) e acrescentar três camadas por cima, uma de **referência e medição**, uma de **detalhe e material** e uma de **luz e render**.

## 2. Meta e como medir

"Quase perfeito" precisa de número, senão não fecha. Proposta de três níveis por produto:

| Nível | Critério | Uso |
| --- | --- | --- |
| A, fiel | IoU de silhueta ≥ 0,90 em 4 vistas calibradas; proporções dos componentes principais dentro de 3%; revisão visual aprovada por escrito | Foto de venda, catálogo, AR |
| B, representativo | IoU ≥ 0,75 na vista da foto; tipo e mecanismo corretos | Simulador, planta |
| C, genérico | Só o tipo correto | Item novo ainda sem revisão |

Hoje quase tudo está entre C e B. A meta realista de curto prazo é B para os 160 itens e A para os 20 de maior venda.

Medidas automáticas, todas no CI:

- **IoU de silhueta** contra a foto, com a câmera do spec (`camera` e `calibration` já existem no esquema). Já há um protótipo em `catalogs/ludus/silhueta.py`, que precisa virar gate e rodar para o Core.
- **Comparação por vista** (frente, lado, três-quartos) com SSIM sobre máscara e contorno, não sobre cor.
- **Teste de regressão visual**: imagem de referência por produto, tolerância pequena, falha o CI se mudar sem aprovação.
- **Limites técnicos** que já existem: caixa ±2%, piso, articulações, orçamento de triângulos.

## 3. Frentes de trabalho

### Frente A • Referência e medição

Sem isto, todo o resto é no olho.

1. Guardar as fotos de referência por produto, com direitos claros, fora do repositório público, e um índice com vista, lado e ângulo.
2. Calibrar a câmera de cada foto (pontos de referência no spec) e renderizar o modelo exatamente daquele ponto de vista.
3. Rodar IoU e SSIM em lote, gerar a folha de contato foto × modelo (já feita à mão neste trabalho) e ordenar do pior para o melhor.
4. Fluxo de aprovação `needs_review` → `approved` com checklist (silhueta, proporção, mecanismo, material, movimento).
5. Teste de regressão visual no CI.

Entrega: relatório automático por catálogo, e a lista de prioridade deixa de ser opinião.

### Frente B • Geometria e fidelidade de forma

1. **Camada de peças declarativas por produto.** Hoje o produto escolhe família e mecanismo. Acrescentar ao spec uma lista opcional de peças (tubo por caminho, chapa, estofado, roldana, anilha) que **estende ou substitui** o que a família gera. Assim cada item é refinado a partir da foto sem escrever uma família nova.
2. **Torre de bateria realista.** Quadro aberto com duas colunas-guia cromadas, pilha de placas visíveis com furos, pino seletor, cabo e roldanas à vista, capa lateral opcional. É a peça que mais aparece no catálogo Core e a que mais destoa hoje.
3. **Biblioteca de máquinas de alavanca.** Modelar bem, uma vez, os mecanismos que se repetem: agachamento de alavanca (búlgaro, pêndulo, sumô), leg press 45° e 90°, hack, panturrilha em pé e sentada, remada solo, T-bar.
4. **Juntas e articulações verdadeiras.** Pivôs com bucha, braços com arco certo, contrapeso, curso limitado pela geometria e não por escala.
5. **Cinemática sem colisão.** O manifesto já reporta colisão de movimento; tratar cada caso em vez de reduzir o curso (`swingScale`), que hoje esconde o problema.
6. **Medidas como verdade.** Manter o ajuste à caixa, mas preferir redimensionar parâmetros de projeto a escalar a malha. Hoje 13 itens Core ainda são escalados, o pior em 40%, e isso distorce tubo e estofado.

### Frente C • Biblioteca de detalhes

O que separa "modelo" de "produto":

- Bordas biseladas e raios de curva consistentes (nenhuma aresta viva de 90° em tubo ou chapa).
- Tampas de tubo, ponteiras plásticas, sapatas de borracha com rosca, niveladores.
- Parafusos e porcas padronizados (cabeça sextavada, allen, arruela), instanciados.
- Cordões de solda nas juntas principais, como detalhe geométrico leve ou normal map.
- Estofado com costura, vinco e espessura de espuma; encosto com recorte.
- Pegadas com ranhura e anel de borracha, rolos de espuma com tampa.
- Chapa antiderrapante, chapa furada e recorte a laser do logo.
- Cabos com curva real, roldanas com garfo, argolas e mosquetões.
- Etiquetas e adesivos (a torre já tem; estender a pegadas, assento e quadro).

Regra: tudo instanciado e reaproveitado entre produtos, para não estourar o orçamento.

### Frente D • Materiais PBR

1. Subir o `PartKit` de cor chapada para **material com mapas**: base color, rugosidade, metal, normal e oclusão.
2. **Tinta pó preta** (a maioria do Core): micro-rugosidade e leve variação, com reflexo largo e baixo. É o acabamento de quase tudo; acertá-lo vale mais que qualquer outro.
3. **Cromado e aço escovado**: anisotropia e reflexo de ambiente correto.
4. **Couro sintético**: normal de poro, costura e brilho suave de borda.
5. **Borracha, espuma e plástico**: rugosidade alta e sem metal.
6. **Chapa antiderrapante** em normal map.
7. **Clearcoat e sheen** onde couber, via extensões do glTF.
8. Gerar as texturas de forma procedural (canvas já existe no Node) ou usar conjuntos de licença livre, anotando a licença.
9. Restrição do USDZ: o exportador aceita `MeshStandardMaterial`, que **suporta** mapas. Validar o conjunto de mapas no Quick Look antes de assumir extensões.
10. UVs: caixas e cilindros do Three já trazem UV; tubo curvado e extrusões precisam de UV gerado.

### Frente E • Luz e render

Maior ganho visual pelo menor custo.

1. **HDRI de estúdio** (softbox grande, fundo neutro) no lugar do `RoomEnvironment`. Dá reflexo de produto real.
2. **Três pontos de luz calibrados**: principal larga e suave, preenchimento fraco, contraluz que desenha a silhueta.
3. **Sombra de contato**: assar uma textura de oclusão sob o equipamento (ou usar GTAO/SSAO), em vez de depender só do mapa de sombra.
4. **Antialias de qualidade** (SMAA ou MSAA com resolução própria) e exposição calibrada para pretos que não somem.
5. **Atualizar o Three.js** para uma versão recente. Traz `outputColorSpace`, tone mapping AgX e Neutral, unidades físicas de luz, exportadores melhores. É uma mudança grande de API, então entra no início, antes de investir em material.
6. **Renders offline de alta qualidade** para catálogo, miniatura e foto de venda: pipeline sem tela com Blender Cycles (a partir do GLB) ou path tracer em WebGL. O visualizador interativo continua rasterizado; as imagens "de revista" saem do offline. É o que mais se aproxima de foto de verdade.
7. Variantes de cena: fundo infinito claro, fundo escuro, fundo com piso de academia.

### Frente F • Exportação e desempenho

1. Subir o orçamento: detalhe real pede algo como 60 a 120 mil triângulos no nível mais alto, em vez dos 30 mil de hoje, **com** níveis de detalhe (LOD) para o simulador e a loja.
2. Compressão de malha (meshopt ou Draco) e de textura (KTX2) no GLB.
3. LOD automático: alto para ficha e AR, médio para o visualizador, baixo para o simulador com dezenas de itens.
4. Carregamento progressivo e cache.
5. USDZ com texturas e escala correta para AR.
6. Teste de desempenho em celular médio, com meta de quadros por segundo e de memória.

### Frente G • Pessoa e movimento

- Trocar a figura procedural por um manequim com malha suave e rig humanoide, com poses por exercício.
- Cinemática inversa para mão e pé, já parcialmente feita.
- Opção de ocultar a pessoa nas imagens de catálogo.

### Frente H • Produção em escala e IA

- **Modelagem assistida**: renderizar quatro vistas do modelo, comparar com a foto por um modelo de visão e sugerir ajuste de parâmetro. Sempre com revisão humana e sempre dentro do esquema do spec, nunca editando malha solta.
- **Imagem para 3D** (geradores de malha a partir de foto): avaliar como ponto de partida para formas que a família não cobre. A malha sai sem medida exata e sem hierarquia de peças, então serve de **referência de forma**, não de entrega.
- Lote noturno que gera, mede e publica o relatório da Frente A.

### Frente I • Governança

- Fotos e texturas: registro de origem e licença.
- Versão do pacote publicada com versão semântica e nota de mudança, em vez de commit solto na dependência do site.
- Documentação do fluxo de revisão para quem não é desenvolvedor.

## 4. Roteiro

A ordem prioriza o que dá mais efeito visível e destrava o resto.

| Fase | Conteúdo | Resultado verificável | Esforço estimado |
| --- | --- | --- | --- |
| 0 | Frente A: referência, calibração, IoU e folhas de contato no CI | Relatório de qualidade dos 160 itens e lista de prioridade objetiva | 1 semana |
| 1 | Three.js recente, HDRI de estúdio, luz de três pontos, sombra de contato, tinta pó e cromado em PBR | Mesma geometria com aparência claramente melhor em todos os itens | 2 a 3 semanas |
| 2 | Biblioteca de detalhes (Frente C) e torre de bateria realista | Todas as máquinas de bateria com cara de produto | 3 a 4 semanas |
| 3 | Camada de peças por produto e as máquinas de alavanca modeladas uma vez | Núcleo de 20 itens no nível A | 4 a 6 semanas |
| 4 | Render offline (Cycles) para catálogo e fotos de venda | Imagens de revista dos 20 itens, geradas por script | 1 a 2 semanas |
| 5 | LOD, compressão, AR e desempenho em celular | Simulador com 30 itens fluido; AR com textura | 2 semanas |
| 6 | Cauda longa com modelagem assistida por IA: demais itens no nível B ou A | 160 itens com nível definido | contínuo |

Estimativa total para o núcleo de 20 itens no nível A, com a infraestrutura pronta: **cerca de 4 a 5 meses de uma pessoa**. É estimativa, não compromisso; a Fase 0 serve para trocá-la por medição.

Se só uma coisa puder ser feita, faça a **Fase 1**. Ela melhora os 160 itens ao mesmo tempo, sem tocar em nenhum modelo.

## 5. Decisões necessárias

1. **Onde o realismo precisa aparecer?** No visualizador do navegador, em imagens fixas de catálogo, no AR, ou nos três. Imagens fixas pelo render offline são bem mais baratas de fazer parecer foto.
2. **Quais são os 20 itens de maior venda?** Eles definem o núcleo do nível A.
3. **Fotos e texturas:** de quem são os direitos, e podem ser usadas como referência e como textura?
4. **Medida ou foto manda?** Quando a foto e a ficha divergem, o modelo segue a ficha (hoje é assim). Confirmar.
5. **Tolerância de custo:** horas por produto aceitas para o nível A.
6. **Quem aprova?** Definir quem assina o `approved` de cada item.

## 6. Riscos

- **Atualizar o Three.js** quebra API e muda a aparência de todos os materiais. Mitigar com o teste de regressão visual da Frente A antes da atualização.
- **Mais detalhe pesa**. LOD e compressão têm que entrar junto, senão o simulador trava em celular.
- **Realismo atrai comparação**: um modelo muito bonito e errado em proporção é pior que um modelo simples e certo. Por isso a medição vem antes do acabamento.
- **IA gera forma plausível, não exata**. Qualquer saída precisa passar pelo gate de medida e por revisão humana.
- **Licença** de foto e textura pode impedir uso comercial.

## 7. Definição de pronto por produto

Um produto só sobe de nível quando cumpre todos os itens:

- Medidas dentro de ±2% da ficha, sem escala de malha.
- IoU e SSIM acima do limite do nível, em todas as vistas calibradas.
- Mecanismo e movimento corretos, sem colisão.
- Materiais PBR com a cor e o acabamento da foto.
- Detalhes principais presentes: tampas, parafusos, costura, logo, solda.
- Render de referência aprovado e arquivado no teste de regressão.
- Orçamento de triângulos e peso do arquivo dentro do limite do LOD.
- Aprovação por escrito de quem tem a responsabilidade.
