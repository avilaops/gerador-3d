# Revisão foto × modelo 3D: catálogo Ludus Premium

Comparação dos 94 modelos publicados com a foto de cada produto, feita em 08/10/2026 sobre a prancha "foto x modelo 3D" (a mesma da página `/revisao/` do site). Cada item foi olhado uma vez, numa foto só e num ângulo só. O que está aqui é o que dá para ver nessa foto; medida interna de peça não dá para tirar dela.

## Resultado geral

| Nota | O que significa | Itens |
| --- | --- | --- |
| A | Estrutura certa. Falta acabamento (adesivo, detalhe, proporção fina). | 12 |
| B | Tipo certo, mas quadro, braços ou apoios destoam da foto. | 53 |
| C | Estrutura errada. Quem conhece a máquina não a reconhece no modelo. Refazer. | 29 |

Só 12 dos 94 batem com a foto, e 29 não são reconhecíveis. O motivo principal é um só: a máquina genérica monta todo mundo com o mesmo quadro e a mesma alavanca e muda só o mecanismo. Nas fotos, cada máquina tem um quadro próprio.

## Erros que se repetem (corrigir uma vez conserta muitos)

### Em todas as linhas

1. **Ângulo da miniatura.** Boa parte dos modelos aparece pelo lado espelhado da foto. A comparação fica injusta e o cliente estranha. Cada item precisa do azimute da foto (`meta.thumbAzimuth`).
2. **Sem adesivos fora da torre.** As fotos têm etiqueta de aviso amarela, placa de instrução e marca no quadro. Só a torre de bateria tem adesivo hoje.
3. **Adesivos não vão para o GLB/USDZ.** Quem abre em realidade aumentada vê a máquina sem nenhum escrito.
4. **Pictogramas genéricos.** Os três desenhos da placa são os mesmos em todas as máquinas; na foto cada uma mostra o próprio exercício.
5. **Regulagens ausentes.** Pino de ajuste do assento, alavanca do encosto, furos de regulagem e mola a gás aparecem em quase toda foto e em quase nenhum modelo.
6. **Pés e bases retos.** Nas fotos as bases têm tubo curvado, sapata com parafuso e chapa de fixação.
7. **Estofado liso.** Faltam costura, cantos arredondados de verdade e a chapa de apoio por baixo.

### Linha de anilhas (LD-A001 a LD-A041)

8. **Arco ou mastro alto que não existe.** Máquinas baixas ganharam um pórtico atrás: A001, A007, A010, A011, A019, A020, A021, A022, A024, A025, A026, A027, A029, A035. É o erro que mais descaracteriza a linha.
9. **Quadro aberto em "A" no lugar do quadro da foto.** O real é fechado: laterais de chapa em ampulheta ou gaiola de tubo com várias travessas.
10. **Alavancas todas iguais.** Na foto mudam muito: longas e passando por cima do quadro (A004, A005, A015), viga larga horizontal (A006), cruzadas em X (A009), independentes por lado (A020, A022, A024, A029).
11. **Poucos pinos de anilha.** Faltam os pinos cromados de carga e os de guardar anilha.
12. **Ângulo do encosto.** Declinado pouco deitado (A003), super inclinado pouco inclinado (A013), extensoras com o assento em pé demais (A022, A024).
13. **Prata clara demais.** O quadro da foto é um cinza mais fechado.

### Bancos e suportes (LD-A042 a LD-A056)

14. **Banco de uma almofada só** onde a foto tem assento e encosto separados (A043, A047, A049).
15. **Quadro fino.** Os reais são de tubo grosso com pernas em "A" e travessa curvada.

### Linha de bateria (LD-B001 a LD-B038)

16. **Torre baixa e larga.** A da foto é alta e estreita, vai até o topo da máquina e tem quadro aberto por cima do carenado.
17. **Tampo de madeira onde não existe.** Só a linha preta de uma coluna (B001 a B021) tem o tampo. As iso-laterais (B022 a B034) e as estações de cabo (B035 a B038) não têm.
18. **Iso-laterais com o quadro errado.** Na foto: pórtico prata largo, duas colunas pretas nas laterais e braços azuis saindo do alto. No modelo: ou um pórtico estreito e alto com as torres espremidas dentro (B023, B024, B025, B027, B029, B030), ou só duas torres soltas com um assento no meio (B022, B026, B028, B032, B033).
19. **Torre atrás em máquina que tem a torre ao lado.** B005, B013, B019, B021 e B031 ficaram com a torre atrás (a regra só põe ao lado com largura a partir de 1,02 m, ou o exercício não está na lista).
20. **Rolo cromado na altura do joelho** em máquinas que não têm essa peça (B019, B031).
21. **Cor de detalhe no lugar errado.** B034 e B035 saíram com braço cor de madeira; o real é azul (B034) e cinza (B035).

## Item a item

Nota, o que está errado e o que fazer. "Padrão" quer dizer os erros gerais acima (ângulo, adesivos, regulagens).

### Linha de anilhas

| Código | Produto | Nota | Erros | Correção |
| --- | --- | --- | --- | --- |
| LD-A001 | Hiperextensão reversa | C | Mesa curta e cúbica; arco alto que não existe; falta o rolo de cabeça e a lateral em hexágono. | Mesa longa sobre quadro baixo, pêndulo com rolo embaixo, sem arco. |
| LD-A002 | Supino articulado | A | Feito à mão, bate com a foto. | Padrão. |
| LD-A003 | Supino declinado | B | Encosto pouco deitado; quadro aberto. | Encosto bem reclinado, apoio de pés, quadro em ampulheta. |
| LD-A004 | Remada | B | Alavancas curtas. | Alavancas longas subindo acima do quadro, peitoral maior. |
| LD-A005 | Puxada alta | B | Alavanca curta; sem apoio de coxa; sem regulagem de assento. | Alavanca longa por cima, arco de coxa, pino de ajuste. |
| LD-A006 | Puxada frontal | B | Alavanca genérica. | Viga larga horizontal no alto, arco de coxa. |
| LD-A007 | Supino deitado | C | Arco errado; faltam as laterais do quadro. | Banco plano dentro de duas laterais baixas, alavancas saindo delas. |
| LD-A008 | Remada cavalinho | C | Fino e pequeno; falta o quadro da pegada. | Barra em pivô baixo, plataforma larga, apoio de peito, pegada em quadro. |
| LD-A009 | Remada baixa | C | Alavancas paralelas. | Duas alavancas cruzadas em X, apoio de pés. |
| LD-A010 | Nórdica | C | Banco genérico com arco. | Almofada de joelho curvada, mastro diagonal, rolo de tornozelo. |
| LD-A011 | Remada unilateral | B | Arco errado. | Quadro baixo, alavancas independentes. |
| LD-A012 | Desenvolvimento | B | Quadro aberto. | Gaiola fechada, braços contornando o ombro. |
| LD-A013 | Supino super inclinado | B | Encosto pouco inclinado. | Corrigir ângulo, quadro em ampulheta. |
| LD-A014 | Supino vertical | B | Quadro aberto. | Gaiola fechada, mais pinos. |
| LD-A015 | Puxada | B | Alavanca curta; sem apoio de coxa. | Como A005. |
| LD-A016 | Elevação lateral | B | Almofadas de braço pequenas; falta o apoio de peito. | Almofadas maiores, apoio de peito, pivô na altura do ombro. |
| LD-A017 | Pullover | C | Quadro genérico. | Quadro triangular, assento reclinado, barra em arco sobre a cabeça. |
| LD-A018 | Paralela sentada | B | Quadro e alavanca genéricos. | Alavancas longas descendo ao lado do quadril. |
| LD-A019 | Supino inclinado deitado | C | Tratado como supino deitado. | Banco inclinado de quatro almofadas, alavancas laterais longas, viga de pés na frente. |
| LD-A020 | Alavanca de solo | C | Quadro pequeno com arco. | Quadro grande em U, duas alavancas independentes, pegadas longas. |
| LD-A021 | Mesa flexora | B | Arco errado. | Mesa em duas águas sobre quadro baixo, alavanca lateral. |
| LD-A022 | Extensora | B | Assento em pé; arco alto; alavanca única. | Assento reclinado, sem arco, uma alavanca por perna. |
| LD-A023 | Hack | B | Carro fino e pequeno. | Carro robusto, plataforma maior, trilhos e quadro na proporção da foto. |
| LD-A024 | Extensora unilateral | B | Como A022. | Como A022. |
| LD-A025 | Panturrilha sentada | B | Arco errado. | Quadro baixo, alavanca sobre as coxas, degrau. |
| LD-A026 | Panturrilha horizontal | B | Arco errado. | Quadro baixo e comprido. |
| LD-A027 | Elevação pélvica | C | Arco errado; falta o banco. | Banco de apoio das costas separado na frente, alavanca com cinto. |
| LD-A028 | Jammer | C | Alavancas saem de baixo; plataforma que não existe. | Alavancas saindo do alto, na frente, sem plataforma. |
| LD-A029 | Alavanca de solo dupla | C | Como A020, com plataforma que não existe. | Como A020, sem plataforma. |
| LD-A030 | Agachamento articulado | C | Muito mais simples que o real. | Ombreiras na frente, plataforma detalhada, alavanca e contrapeso da foto. |
| LD-A031 | Flexora ajoelhada | B | Proporções das almofadas. | Conferir com mais uma foto. |
| LD-A032 | Supino vertical convergente | B | Quadro aberto. | Gaiola ou ampulheta. |
| LD-A033 | Rosca | C | Caixa de quadro por cima que não existe. | Tirar a caixa; almofada de braço inclinada, alavanca baixa. |
| LD-A034 | Leg press | B | Carro pequeno; quadro aberto. | Quadro fechado em volta dos trilhos, plataforma maior. |
| LD-A035 | Abdominal | C | Genérico, com arco. | Quadro da foto, alavanca sobre os ombros. |
| LD-A036 | Belt squat | B | Plataforma pequena para o conjunto. | Plataforma larga, alavanca baixa. |
| LD-A037 | Belt squat com apoio | B | Como A036; falta a barra superior. | Acrescentar a barra de apoio no alto. |
| LD-A038 | Leg press articulado | B | Duas plataformas quase invisíveis. | Plataformas maiores e afastadas. |
| LD-A039 | Paralela | C | Caixa de quadro por cima. | Como A018, sem a caixa. |
| LD-A040 | Supino inclinado convergente | B | Quadro aberto. | Gaiola ou ampulheta. |
| LD-A041 | V-squat | C | Usa o pórtico do Pendulum. | Plataforma longa na frente, pivô baixo atrás, sem teto. |

### Bancos e suportes

| Código | Produto | Nota | Erros | Correção |
| --- | --- | --- | --- | --- |
| LD-A042 | Banco reto | A | Falta a etiqueta. | Padrão. |
| LD-A043 | Banco declinado | B | Uma almofada só; orientação. | Assento e encosto separados, rolos de perna. |
| LD-A044 | Banco inclinado 30° | B | Pernas retas. | Pernas em "A" com travessa curvada. |
| LD-A045 | Banco inclinado 55° | A | Próximo. | Padrão. |
| LD-A046 | Banco 75° | A | Próximo. | Padrão. |
| LD-A047 | Banco declinado | B | Como A043. | Como A043. |
| LD-A048 | Banco regulável | B | Quadro fino. | Tubo grosso, mecanismo de regulagem, rodas e alça. |
| LD-A049 | Banco abdominal | B | Como A043. | Como A043. |
| LD-A050 | Supino reto | A | Barra da base longa; ganchos simples. | Encurtar a base, ganchos em degraus. |
| LD-A051 | Supino inclinado | A | Idem. | Idem. |
| LD-A052 | Supino declinado | A | Idem. | Idem. |
| LD-A053 | Suporte de barras | A | Poucos ganchos; lateral simples. | Mais ganchos, lateral em "A" dupla. |
| LD-A054 | Extensão lombar | B | Fino perto do real. | Engrossar quadro e almofadas. |
| LD-A055 | Banco Scott | C | Postes altos que não existem. | Laterais de chapa curvada, sem postes. |
| LD-A056 | Suporte de anilhas | C | Mastro errado. | Quadro em "A" curvado com base. |

### Linha de bateria

| Código | Produto | Nota | Erros | Correção |
| --- | --- | --- | --- | --- |
| LD-B001 | Mesa flexora | B | Mesa e alavanca genéricas; torre baixa. | Mesa plana com rolo, alavanca da foto, torre alta. |
| LD-B002 | Cadeira extensora | B | Falta o quadro inclinado do assento, o apoio lombar e o braço estofado longo. | Acrescentar os três. |
| LD-B003 | Leg press horizontal | B | Plataforma e trilhos pequenos. | Gaiola da plataforma, trilhos cromados longos, quadro maior. |
| LD-B004 | Peck deck | A | Faltam as pernas traseiras abertas. | Base em "A" atrás. |
| LD-B005 | Elevação lateral | B | Torre atrás; almofadas grandes. | Torre ao lado, apoio de peito. |
| LD-B006 | Desenvolvimento | B | Formato dos braços. | Braço contornando o ombro por trás. |
| LD-B007 | Voador | A | Como B004. | Como B004. |
| LD-B008 | Supino vertical | B | Braços saem do alto. | Braços vindo de baixo, pela frente; base curvada. |
| LD-B009 | Graviton | B | Pórtico estreito. | Pórtico mais largo, degraus no lugar certo. |
| LD-B010 | Panturrilha em pé | B | Ombreiras baixas; plataforma grande. | Subir a alavanca e as ombreiras, reduzir a plataforma. |
| LD-B011 | Glúteo | C | Máquina diferente. | Glúteo ajoelhado: apoio de joelho e tronco, came arredondado, pedal. |
| LD-B012 | Puxada alta | A | Faltam as pernas em "A" e o apoio de pés. | Acrescentar. |
| LD-B013 | Abdominal | B | Torre atrás. | Torre ao lado, rolos. |
| LD-B014 | Abdutora | B | Assento reto; almofadas retangulares. | Quadro inclinado, almofadas ovais, base com chapa perfurada. |
| LD-B015 | Adutora | B | Como B014. | Como B014. |
| LD-B016 | Cadeira flexora | B | Rolos pequenos; falta o rolo de coxa. | Acrescentar e corrigir tamanhos. |
| LD-B017 | Extensão de tríceps | B | Almofada pequena; um braço só; base retangular. | Almofada inclinada longa, dois braços curvados com pegada, assento em coluna única, base em T. |
| LD-B018 | Scott máquina | B | Como B017. | Como B017, com a barra de pegada única. |
| LD-B019 | Extensão lombar | C | Torre atrás; arco sobre o assento; rolo cromado no joelho. | Torre ao lado, disco do came, rolo das costas alto, apoio de pés, cinto. |
| LD-B020 | Remada sentada | B | Braço em arco simples; sem apoio de pés. | Dois braços com pegada dupla, apoios de pés. |
| LD-B021 | Puxada fixa | C | Torre atrás; braços finos. | Torre ao lado, alavanca grande por cima com pegadas abertas, rolos de coxa. |
| LD-B022 | Rosca iso-lateral | C | Duas torres soltas; sem quadro prata; sem braços. | Quadro iso-lateral (ver item 18), almofada inclinada, braços azuis. |
| LD-B023 | Supino iso-lateral | B | Pórtico estreito e alto. | Quadro largo, colunas nas laterais, pernas abertas à frente. |
| LD-B024 | Remada iso-lateral | B | Como B023. | Idem, com apoio de peito. |
| LD-B025 | Supino inclinado iso-lateral | B | Como B023. | Idem. |
| LD-B026 | Desenvolvimento iso-lateral | C | Duas torres e um braço mínimo. | Máquina baixa e larga, encosto longo reclinado, braços azuis por cima. |
| LD-B027 | Supino declinado iso-lateral | B | Estreito. | Alargar, teto do quadro. |
| LD-B028 | Tríceps iso-lateral | C | Como B022. | Quadro iso-lateral, braços azuis por cima. |
| LD-B029 | Puxada frontal iso-lateral | B | Estreito; sem rolos de coxa. | Alargar, rolos de coxa. |
| LD-B030 | Remada alta iso-lateral | B | Igual ao B029. | Alavancas horizontais no alto, apoio de peito. |
| LD-B031 | Abdominal máquina | C | Torre atrás; arco; rolo cromado. | Torre ao lado alta, almofada nas costas, rolos nos pés, braços azuis. |
| LD-B032 | Flexora iso-lateral | C | Torres soltas; rolo único; 5% de escala forçada. | Quadro curvado, torres nas pontas, almofada e rolo por perna. |
| LD-B033 | Extensora iso-lateral | C | Torres soltas. | Quadro com travamento em X, uma alavanca azul por perna. |
| LD-B034 | V-squat | C | Cor errada; almofada mínima; plataforma pequena. | Alavanca azul com pivô baixo, ombreiras e encosto, plataforma grande, torre ao lado. |
| LD-B035 | Estação multifuncional dupla | B | Braços cor de madeira; tampo; sem a placa de exercícios. | Braços cinza para cima em V, placa central, quatro pés abertos. |
| LD-B036 | Cross-Smith | C | Duas torres e uma barra. | Gaiola com profundidade, barra guiada, barra fixa, pinos de anilha, polias. |
| LD-B037 | Crossover angular | B | Torres paralelas; tampo. | Torres em V, barras fixas no alto, travessas. |
| LD-B038 | Crossover | A | Tubos finos. | Engrossar, carenado perfurado. |

## Como aperfeiçoar cada equipamento

### O método

A máquina genérica continua, mas deixa de decidir o quadro sozinha. Cada equipamento passa a ter uma ficha própria com cinco decisões tiradas da foto:

1. **Quadro**: qual dos tipos (baixo, ampulheta, gaiola, triangular, pórtico iso-lateral, torre ao lado).
2. **Apoios do corpo**: quantas almofadas, tamanho e ângulo de cada uma.
3. **Alavanca**: onde fica o pivô, o caminho do tubo, o tipo de pegada, se é uma por lado.
4. **Carga**: onde ficam a torre ou os pinos de anilha.
5. **Detalhes**: regulagens, adesivos, pés.

No código isso vira campos novos em `ExerciseDef` (`frame`, `pads`, `horns`) e uma tabela por código em `classify.ts`, do jeito que `tower: 'side'` já funciona. Os itens nota C que nenhum tipo de quadro resolve ganham montagem escrita à mão, como LD-A002 e LD-B004, que são justamente os dois que melhor batem com a foto.

### Critério de aprovado

Um item só passa de `needs_review` para `approved` quando, na prancha com o modelo no mesmo ângulo da foto:

- a silhueta bate (mesmo quadro, mesma quantidade de colunas e pernas);
- as almofadas estão no número, no lugar e no ângulo certos;
- a alavanca sai do mesmo ponto e termina na mesma pegada;
- a carga está no lugar certo;
- as cores batem peça a peça;
- os adesivos e escritos estão onde a foto mostra.

A página `/revisao/` passa a mostrar esse status por item, para a conferência ser sua e não só minha.

### Ordem de trabalho

| Rodada | O que entra | Itens que melhoram |
| --- | --- | --- |
| 1. Base comum | Ângulo da foto em cada miniatura; cinza do quadro; torre alta e estreita; tirar o tampo de madeira de onde não existe; cores do B034 e B035. | Todos |
| 2. Quadros da linha de anilhas | Tirar o arco falso; quadros baixo, ampulheta e gaiola; pinos de anilha; ângulos de encosto. | 30 da linha A |
| 3. Alavancas da linha de anilhas | Alavancas longas, cruzadas, independentes; pullover, jammer, alavancas de solo. | A004 a A006, A009, A015, A017 a A020, A022, A024, A028, A029 |
| 4. Pórtico iso-lateral | Um quadro novo, largo, com colunas nas laterais e braços saindo do alto. | B022 a B033 |
| 5. Bateria de uma coluna | Torre ao lado nas que faltam; quadro inclinado do assento; braços de tríceps, Scott, puxada fixa; glúteo e lombar refeitos. | B001 a B021 |
| 6. Pernas e agachamentos | Hack, leg press, belt squat, V-squat, agachamento articulado. | A023, A030, A034, A036 a A038, A041, B003, B034 |
| 7. Bancos, suportes e cabos | Bancos de duas almofadas, Scott, suporte de anilhas, Cross-Smith, crossover angular, estação dupla. | A043 a A056, B035 a B038 |
| 8. Acabamento | Adesivos no quadro e nas máquinas de anilha; pictograma por exercício; adesivos dentro do GLB/USDZ; regulagens; pés curvados; costura. | Todos |

Cada rodada termina igual: testes, miniaturas, prancha foto × modelo dos itens mexidos, publicação no site e no PDF.

### O que limita a fidelidade

- **Uma foto por produto.** Fundo, traseira e o lado oposto de cada máquina são dedução. Com mais duas fotos por item (lateral e traseira) ou o desenho técnico da fábrica, os itens nota C saem certos de primeira.
- **Pictogramas e marca.** Os desenhos da placa são feitos aqui. Para ficarem iguais aos reais é preciso a arte dos adesivos.
- **Medidas internas.** Só existem comprimento, largura e altura totais. Altura de assento, curso da alavanca e posição do pivô são estimados pelo corpo de quem usa.

## Ferramentas decididas (09/10/2026)

- **Geometria:** só three.js nativo (`ExtrudeGeometry` com `Shape` e `holes` para chapas, `bentTube` para tubos, `RoundedBoxGeometry` para estofado). Sem kernel CAD. `manifold-3d` entra no primeiro recorte que não couber em `shape.holes`.
- **Adesivos no GLB/USDZ:** os adesivos já são planos deslocados 1 mm da chapa, com `MeshStandardMaterial`. Falta desenhá-los fora do navegador (canvas no Node) e subir a textura do USDZ para 2048 px, o que pede atualizar o three.js (hoje r149).
- **Checagem:** `gltf-validator` nos 94 GLB dentro dos testes; glTF-Transform para comprimir as texturas quando os adesivos entrarem.
- **Foto × modelo:** IoU de silhueta por item na página de revisão, para ordenar do mais divergente ao menos.

## Andamento

- Rodada 1 publicada em 09/10/2026 (commit `502e409`): lado da foto nas miniaturas da linha de anilhas, dos leg press e das iso-laterais; torre mais estreita; tampo de madeira só na linha preta de uma coluna; cores do LD-B034 e do LD-B035.
- Adesivos dentro do GLB e do USDZ em 09/10/2026: desenhados no Node com `@napi-rs/canvas`. Conferido que a textura está no arquivo; falta ver no iPhone. `gltf-validator` entrou nos testes.
- Rodada 2, primeira parte, em 09/10/2026: o mastro falso saiu das máquinas baixas de anilhas. Com encosto (LD-A022, A024, A026), a altura vem do próprio encosto; sem encosto (LD-A001, A007, A010, A011, A019, A025, A027, A028, A035), de duas laterais em "A" ao lado de quem usa. LD-A020, A021 e A029 ainda têm o arco do apoio da alavanca. Faltam os quadros em ampulheta e gaiola e a nota de silhueta.
- Rodada 2, segunda parte, em 09/10/2026: as máquinas altas de anilhas ganharam o quadro em gaiola (coluna reta atrás, perna em ampulheta na frente, travessas e pinos de guardar anilha). Vale para LD-A003 a A006, A009, A012 a A015, A017, A032, A035 e A040. LD-A018, A033 e A039 ganharam a gaiola sem tê-la na foto; LD-A010, A011 e A025 seguem com as duas laterais altas.
- Rodada 2 fechada e rodada 4 iniciada em 09/10/2026: LD-A018 e A039 sem gaiola (a altura vem do encosto) e LD-A033 com duas laterais. Iso-laterais de bateria (LD-B022 a B033): colunas pretas nas laterais na altura toda e gaiola prata entre elas. A exportação valida os 94 GLB com o `gltf-validator` e para se houver erro. LD-A020, A021 e A029 continuam com o arco, que é o que dá a altura do catálogo a essas três; ficam para a rodada 3, com as alavancas próprias. Pendente da rodada 2: quadro próprio de LD-A010, A011 e A025 e a nota de silhueta.
- Lote de 10/10/2026, na ordem do roadmap. Rodada 1: frente para a esquerda também nas máquinas de bateria com torre atrás, nos supinos livres e nos dois modelos escritos à mão. Rodada 3: alavancas mais longas nas puxadas de anilhas (LD-A005, A006, A015), prolongamento dos pinos por cima do quadro nas remadas (LD-A004, A009, A011) e uma alavanca por perna nas extensoras de anilhas (LD-A022, A024). Rodada 5: torre ao lado em LD-B005, B013, B019, B021 e B031; glúteo ajoelhado com came grande (LD-B011); sem eixo cromado no joelho em LD-B013, B019 e B031. Rodada 7: bancos declinados com assento e encosto separados (LD-A043, A047, A049). Rodada 8: etiqueta amarela de aviso na coluna da gaiola das máquinas de anilhas e das iso-laterais.
- Ainda não tocado: rodada 6 inteira (pernas e agachamentos); na 3, alavancas cruzadas do LD-A009, pullover, jammer e alavancas de solo; na 5, braços de tríceps, Scott e puxada fixa e a lombar; na 7, Scott livre, suporte de anilhas, Cross-Smith, crossover angular e estação dupla; na 8, pictograma por exercício, regulagens, pés curvados e costura.
