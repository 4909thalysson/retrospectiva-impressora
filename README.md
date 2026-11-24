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


## Gerador de QR Code para vídeos

Na navegação principal, abra **Gerar QR Code**, cole o link público do vídeo hospedado no Zoho WorkDrive e selecione **Gerar QR Code**. É possível baixar o QR Code em PNG, copiar o link ou testar o endereço.

O QR Code codifica exatamente o link informado. Para que o vídeo abra sem autenticação e sem a interface da Central, configure no WorkDrive um link externo com acesso adequado e teste o endereço em uma janela anônima. A reprodução direta depende do tipo de link fornecido pelo Zoho; links de compartilhamento que abrem uma página do WorkDrive continuarão abrindo essa página.


## Página pública de acesso à retrospectiva

- `acesso.html`, `retrospectiva.css` e `retrospectiva.js`: página pública em que o colaborador busca o nome com sugestões em tempo real; ao escolher um resultado, o setor correspondente é preenchido automaticamente.
- `colaboradores.json`: lista de colaboradores e permissões (`impressoras` e `demandas-ti`).
- `config-publico.js`: configuração do endereço público e de links externos opcionais.
- `index.html` / `central.js`: gerador de QR Code atualizado para apontar para `acesso.html`.

Após a identificação, a página incorpora as apresentações interativas de `pipefy/` e `impressoras/`. A apresentação do Pipefy relaciona os nomes de `colaboradores.json` às variações registradas em `chamados.json` por meio do mapeamento em `pipefy/setores.js`. Se ainda não houver dados para um setor, a página informa isso em vez de mostrar a retrospectiva de outro setor. A apresentação de Impressoras inicia automaticamente e seleciona uma impressora com o mesmo nome do setor, quando disponível.

### Links externos opcionais

Se quiser disponibilizar também uma cópia hospedada no WorkDrive, preencha os campos `url` de `impressoras` e `demandas-ti` em `config-publico.js`. O modo `link` abre o compartilhamento em outra aba; para uma URL direta de MP4, use `modo: "video"` para mostrar um player adicional.

### Configurar o QR Code

Por padrão, o gerador calcula automaticamente a URL de `acesso.html` a partir do endereço em que a Central foi aberta. Se a hospedagem usar um caminho público específico, informe a URL completa em `GI_PUBLIC_ACCESS_URL`, no arquivo `config-publico.js`.

Depois de publicar a pasta, abra a Central no endereço público, entre em **Gerar QR Code** e gere o QR Code. O QR Code agora aponta para a página de identificação dos colaboradores, não para o endereço de um vídeo.

### Limitação do acesso sem backend

A validação é feita no navegador e os dados de `colaboradores.json` são baixados pelo visitante. Portanto, esse método organiza a experiência e controla o que a interface apresenta, mas não oferece autenticação forte nem impede que alguém consulte o JSON ou compartilhe um link público direto do WorkDrive. Não use esse mecanismo para vídeos que precisem de sigilo ou controle de acesso rigoroso.

### Agendamento da divulgação

Na Visão geral da Central, use **Agendar divulgação** para definir data e hora. A página `acesso.html` mostra a contagem regressiva e só carrega a busca quando o prazo termina. O agendamento é salvo em `localStorage` (`gi_retrospective_release_at`), portanto vale somente no mesmo navegador e dispositivo em que foi definido; ele não é compartilhado com os celulares dos visitantes. Para uma liberação sincronizada entre dispositivos, será necessário conectar um backend ou publicar a configuração em um arquivo compartilhado.
