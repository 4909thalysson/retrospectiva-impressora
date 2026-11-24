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

## Compartilhamento em vídeo
- O compartilhamento do módulo Pipefy e das retrospectivas individuais por setor agora gera um vídeo com a sequência de slides.
- O navegador usa MP4 quando há suporte; caso contrário, gera WebM.
- Em navegadores sem compartilhamento nativo de arquivos, o vídeo é baixado e o WhatsApp é aberto com o texto para anexar o arquivo manualmente.
- A geração utiliza `MediaRecorder`, `canvas.captureStream()` e `html2canvas`; mantenha a aba aberta até a conclusão.
- O módulo de impressoras já possuía geração de vídeo e foi preservado.


## Página pública de acesso à retrospectiva

- `acesso.html`, `retrospectiva.css` e `retrospectiva.js`: página pública em que o colaborador informa os cinco dígitos do código de acesso; nome, setor e permissões são obtidos do cadastro correspondente.
- `colaboradores.json`: lista de colaboradores, seus códigos (`codigo`) e permissões (`impressoras` e `demandas-ti`).
- `config-publico.js`: configuração do endereço público e de links externos opcionais.
- `index.html` / `central.js`: gerador de QR Code geral e de QR Codes individuais, que abrem o acesso com o código do colaborador preenchido.

Após a identificação, a página incorpora as apresentações interativas de `pipefy/` e `impressoras/`. Jason Leonel Lima De Souza e Rafael Lima Pacheco também recebem uma mensagem de abertura personalizada antes das apresentações. A apresentação do Pipefy relaciona os nomes de `colaboradores.json` às variações registradas em `chamados.json` por meio do mapeamento em `pipefy/setores.js`. Se ainda não houver dados para um setor, a página informa isso em vez de mostrar a retrospectiva de outro setor. A apresentação de Impressoras inicia automaticamente e seleciona uma impressora com o mesmo nome do setor, quando disponível.

### Links externos opcionais

Se quiser disponibilizar também uma cópia hospedada no WorkDrive, preencha os campos `url` de `impressoras` e `demandas-ti` em `config-publico.js`. O modo `link` abre o compartilhamento em outra aba; para uma URL direta de MP4, use `modo: "video"` para mostrar um player adicional.

### Configurar o QR Code

Por padrão, o gerador calcula automaticamente a URL de `acesso.html` a partir do endereço em que a Central foi aberta. Se a hospedagem usar um caminho público específico, informe a URL completa em `GI_PUBLIC_ACCESS_URL`, no arquivo `config-publico.js`.

Depois de publicar a pasta, abra a Central no endereço público e entre em **Gerar QR Code**. Selecione um colaborador para gerar um QR Code individual; o link abre o acesso com o código preenchido, que também aparece abaixo da imagem e no PNG baixado. Sem selecionar colaborador, é gerado o QR Code geral da página de acesso.

### Limitação do acesso sem backend

A validação é feita no navegador e os dados de `colaboradores.json` são baixados pelo visitante. Portanto, esse método organiza a experiência e controla o que a interface apresenta, mas não oferece autenticação forte nem impede que alguém consulte o JSON ou compartilhe um link público direto do WorkDrive. Não use esse mecanismo para vídeos que precisem de sigilo ou controle de acesso rigoroso.

### Agendamento da divulgação

Configure `GI_RETROSPECTIVE_RELEASE_AT` em `config-publico.js` com uma data ISO 8601 e fuso horário, por exemplo:

```js
window.GI_RETROSPECTIVE_RELEASE_AT = "2026-12-01T08:00:00-03:00";
```

Deixe o valor vazio para manter a busca pública bloqueada até definir o prazo. Salve e publique `config-publico.js` na Vercel; todos os dispositivos passam a usar a mesma data e iniciam a contagem imediatamente, sem banco, API ou configuração de serviço externo. A Central mostra a data atualmente publicada. Para alterar o prazo, edite o arquivo e publique novamente. Use sempre o fuso (`-03:00`, por exemplo) para evitar diferenças entre dispositivos.
