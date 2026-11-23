# Retrospectivas GI — visão por setor

## O que foi adicionado
- Nova página `setores.html` com pesquisa e seleção dinâmica dos setores encontrados em `chamados.json`.
- Cada setor possui uma retrospectiva própria, com métricas calculadas exclusivamente a partir dos registros daquele setor.
- A retrospectiva original do GI · TI foi preservada em `index.html` / `index.js`.
- Um atalho para a nova página foi incluído na barra superior da retrospectiva de TI.
- A apresentação setorial mantém navegação por toque/clique, teclado, pausa, compartilhamento e exportação do cartão-resumo em PNG.

## Como executar
1. Mantenha a estrutura de pastas do pacote.
2. Abra um terminal na pasta do projeto.
3. Inicie um servidor HTTP local, por exemplo:
   - Python: `python -m http.server 8000`
4. Acesse `http://localhost:8000`.
5. Na retrospectiva GI · TI, clique no ícone de grade no topo para abrir as retrospectivas por setor. Também é possível acessar diretamente `http://localhost:8000/setores.html`.

> Não abra `setores.html` diretamente via `file://`: a página carrega `chamados.json` usando `fetch`, o que exige um servidor HTTP local.

## Fonte e critérios
- `chamados.json` é a fonte dos registros individuais.
- O setor `GI | TI` não aparece como um cartão na seleção, pois sua retrospectiva já existe na página original.
- As métricas setoriais são calculadas com os campos disponíveis: `setor`, `unidade`, `categoria`, `tipoDemanda`, `criadoEm`, `finalizadoEm` e `horasAteConcluir`.
- Registros sem duração válida não entram nos cálculos de tempo de resolução.
- A página não exibe nomes de solicitantes, pois esse campo não está presente no arquivo JSON fornecido.
- Os indicadores de evolução mensal, horário e dia da semana usam `criadoEm` (momento de abertura/registro).
