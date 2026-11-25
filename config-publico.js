/*
 * CONFIGURAÇÃO DA RETROSPECTIVA PÚBLICA
 *
 * 1) GI_PUBLIC_ACCESS_URL:
 *    Deixe vazio para o sistema montar automaticamente o endereço de acesso.html
 *    com base no endereço em que a Central está hospedada.
 *    Se publicar em um caminho especial, informe a URL completa, por exemplo:
 *    window.GI_PUBLIC_ACCESS_URL = "https://seudominio.com/retrospectiva/acesso.html";
 *
 * 2) GI_RETROSPECTIVE_RELEASE_AT:
 *    Data/hora de liberação no formato ISO 8601 com fuso horário.
 *    Exemplo: "2026-12-01T08:00:00-03:00".
 *    Deixe vazio para manter a busca pública bloqueada até definir a data.
 *    Após alterar, publique os arquivos novamente na Vercel.
 *
 * 3) Links externos opcionais:
 *    As apresentações interativas locais são carregadas automaticamente.
 *    Se desejar, preencha url com um link público do Zoho WorkDrive.
 *    O modo "link" abre o compartilhamento em outra aba; "video" exibe
 *    um player adicional para uma URL direta de arquivo MP4.
 */
window.GI_PUBLIC_ACCESS_URL = "";
window.GI_RETROSPECTIVE_RELEASE_AT = "2026-12-11T08:30:00-03:00";

window.GI_RETROSPECTIVAS_VIDEOS = {
  "impressoras": {
    titulo: "Retrospectiva das Impressoras",
    descricao: "Acompanhe os indicadores, a evolução e os resultados relacionados ao gerenciamento de impressoras.",
    url: "",
    modo: "link"
  },
  "demandas-ti": {
    titulo: "Retrospectiva das Demandas de TI",
    descricao: "Acompanhe as demandas atendidas, os chamados e a evolução do suporte de TI.",
    url: "",
    modo: "link"
  }
};
