# Central de Retrospectivas · GI TI

## Estrutura
- `index.html`: central unificada e navegação entre os módulos.
- `impressoras/`: módulo original de retrospectiva de impressoras, preservado.
- `pipefy/`: retrospectiva geral de demandas e retrospectivas por setor.
- `central.js`: navegação e importação da planilha Excel do Pipefy.

## Como executar
1. Extraia o ZIP.
2. Execute a pasta por um servidor HTTP (não abra os HTMLs diretamente por `file://`).
   Exemplo: `python -m http.server 8000`
3. Acesse `http://localhost:8000`.
4. Escolha Impressoras, Demandas Pipefy ou Por setor.

## Atualização da base Pipefy
Na Visão geral, selecione o arquivo `.xlsx` exportado do Pipefy. O arquivo deve conter uma aba `Report` com os campos:
- Solicitante
- Setor
- Unidade de Negócio
- Onde está o Problema
- ETQ- Tipo de Demanda (também aceita `ETQ - Tipo de Demanda`)
- Criado em
- Finalizado em

A importação transforma os registros para o formato usado pelos módulos Pipefy e salva a base em `localStorage` deste navegador. Não envia a planilha para nenhum servidor. Para compartilhar a atualização com outro computador/navegador, importe o arquivo também nele.

A aba `PAINEL` não é necessária para os cálculos: os indicadores são recalculados a partir da aba `Report`.

## Observações
- Os dados originais de impressoras e a base Pipefy inicial foram preservados.
- Os módulos mantêm suas lógicas próprias e são apresentados por uma única central.
- O leitor de Excel é carregado pela CDN do SheetJS; a importação requer conexão com a internet para carregar essa biblioteca.
- Recomenda-se executar via servidor local ou hospedagem HTTP/HTTPS para que `fetch`, `localStorage` e os caminhos relativos funcionem corretamente.
