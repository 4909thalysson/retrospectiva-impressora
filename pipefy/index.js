/* Retrospectiva TI · Chamados — lógica dos slides, download e compartilhamento */
(function () {
  'use strict';

  var D = JSON.parse(localStorage.getItem('gi_pipefy_dados') || 'null') || window.DADOS;
  var SLIDE_MS = 8000;
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades ---------- */
  var nf = new Intl.NumberFormat('pt-BR');
  function n(v) { return nf.format(v); }
  function pct(v, t) { return Math.round((v / t) * 100); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var DIAS = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
  function ymd(s) { var p = s.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function dataCurta(s) { var o = ymd(s); return o.d + ' ' + MESES[o.m - 1] + ' ' + o.y; }
  function dataLonga(s) { var o = ymd(s); return o.d + ' de ' + MESES_LONGO[o.m - 1] + ' de ' + o.y; }
  function duracao(h) {
    if (h < 1) return Math.round(h * 60) + ' min';
    if (h < 48) return Math.round(h) + ' h';
    return Math.round(h / 24) + ' dias';
  }
  function segParaTexto(s) {
    if (s < 60) return s + ' segundos';
    var m = Math.floor(s / 60), r = s % 60;
    return m + ' min' + (r ? ' ' + r + ' s' : '');
  }

  /* ---------- números derivados ---------- */
  var cats = D.categorias.filter(function (c) { return c.nome !== 'Outros'; });
  var top5 = cats.slice(0, 5);
  var setores5 = D.setores.slice(0, 5);
  var maxHora = D.hora.indexOf(Math.max.apply(null, D.hora));
  var maxDiaSemana = D.diaSemana.indexOf(Math.max.apply(null, D.diaSemana));
  var picoMes = D.mensal.reduce(function (a, b) { return b.abertos > a.abertos ? b : a; });
  var picoMesObj = { m: +picoMes.mes.slice(5), y: +picoMes.mes.slice(0, 4) };
  var diasPeriodo = Math.round((new Date(D.periodo.fim) - new Date(D.periodo.inicio)) / 864e5) + 1;
  var porSemana = Math.round(D.total / (diasPeriodo / 7));
  var diasUteis = D.diaSemana.slice(0, 5).reduce(function (a, b) { return a + b; }, 0);
  var horarioComercial = D.hora.slice(7, 19).reduce(function (a, b) { return a + b; }, 0);
  var tipoMax = [['Sistema', D.tipos.sistema], ['Infra', D.tipos.infra], ['Governança', D.tipos.gov]]
    .sort(function (a, b) { return b[1] - a[1]; })[0];
  var periodoTxt = dataCurta(D.periodo.inicio) + ' → ' + dataCurta(D.periodo.fim);

  /* ---------- componentes ---------- */
  function rise(i, html) { return '<div class="rise" style="--d:' + i + '">' + html + '</div>'; }

  function ranking(items, max) {
    return '<ol class="rank">' + items.map(function (it, i) {
      return '<li class="rise" style="--d:' + (i + 2) + '"><span class="n">' + (i + 1) + '</span>' +
        '<span class="lb">' + esc(it.nome) + '</span><span class="v">' + n(it.qtd) + '</span>' +
        '<span class="bar"><i style="--w:' + (it.qtd / max * 100).toFixed(1) + '%;--d:' + i + '"></i></span></li>';
    }).join('') + '</ol>';
  }

  var UN_CORES = ['#4de1ff', '#c8ff3d', '#ffc23d', '#ff7a59', '#b79bff'];

  /* ---------- definição dos slides ---------- */
  var slides = [
    /* 0 · capa */
    { theme: 't-lime', html: function () {
      return rise(0, '<p class="kicker">Retrospectiva · GI · TI</p>') +
        rise(1, '<h1 class="title" style="font-size:15cqw">Seus <em>chamados</em>, do jeito que você nunca viu.</h1>') +
        rise(2, '<p class="lead">Tudo o que a equipe de TI concluiu entre <b>' + dataCurta(D.periodo.inicio) + '</b> e <b>' + dataCurta(D.periodo.fim) + '</b>.</p>') +
        rise(3, '<p class="fine">Toque para avançar →</p>');
    } },

    /* 1 · total */
    { theme: 't-cyan', html: function () {
      return rise(0, '<p class="kicker">No total</p>') +
        rise(1, '<div class="mega" data-count="' + D.total + '">0</div>') +
        rise(2, '<h2 class="title">chamados <em>concluídos</em></h2>') +
        rise(3, '<p class="lead"><b>' + n(D.anos['2025']) + '</b> abertos em 2025 e <b>' + n(D.anos['2026']) + '</b> em 2026, vindos de <b>' + D.nSolicitantes + ' pessoas</b> em <b>' + D.nSetores + ' setores</b>.</p>');
    } },

    /* 2 · ritmo */
    { theme: 't-violet', html: function () {
      return rise(0, '<p class="kicker">No ritmo</p>') +
        rise(1, '<div class="mega md"><span data-count="' + porSemana + '">0</span><small>por semana</small></div>') +
        rise(2, '<h2 class="title">Uma fila que <em>nunca dorme</em>.</h2>') +
        rise(3, '<p class="lead">Em média, a TI fechou cerca de <b>' + porSemana + ' chamados por semana</b>, durante <b>' + Math.round(diasPeriodo / 7) + ' semanas</b> seguidas.</p>');
    } },

    /* 3 · tipo de demanda */
    { theme: 't-amber', html: function () {
      var itens = [
        { nome: 'Sistema', qtd: D.tipos.sistema },
        { nome: 'Infra', qtd: D.tipos.infra },
        { nome: 'Governança', qtd: D.tipos.gov }
      ];
      return rise(0, '<p class="kicker">Tipo de demanda</p>') +
        rise(1, '<h2 class="title"><em>' + tipoMax[0] + '</em> lidera, com ' + pct(tipoMax[1], D.total) + '% dos chamados.</h2>') +
        ranking(itens, itens[0].qtd) +
        rise(6, '<p class="fine">' + n(D.tipos.semClassificacao) + ' chamados ainda estão sem classificação no Pipefy.</p>');
    } },

    /* 4 · o que mais chamou */
    { theme: 't-coral', html: function () {
      return rise(0, '<p class="kicker">O que mais deu trabalho</p>') +
        rise(1, '<h2 class="title">' + esc(top5[0].nome) + ' é o <em>campeão</em> de chamados.</h2>') +
        ranking(top5, top5[0].qtd) +
        rise(8, '<p class="fine">Assuntos agrupados a partir do campo “Onde está o problema”.</p>');
    } },

    /* 5 · setores */
    { theme: 't-mint', html: function () {
      return rise(0, '<p class="kicker">Quem mais pediu ajuda</p>') +
        rise(1, '<h2 class="title"><em>' + esc(setores5[0].nome) + '</em> abriu mais chamados.</h2>') +
        ranking(setores5, setores5[0].qtd) +
        rise(8, '<p class="fine">Sem contar os ' + n(D.internoGI) + ' chamados abertos pelo próprio GI · TI.</p>');
    } },

    /* 6 · solicitante */
    { theme: 't-rose', html: function () {
      var s = D.solicitantes;
      return rise(0, '<p class="kicker">Cliente mais frequente</p>') +
        rise(1, '<div class="mega md" data-count="' + s[0].qtd + '">0</div>') +
        rise(2, '<h2 class="title"><em>' + esc(s[0].nome) + '</em> foi quem mais acionou a TI.</h2>') +
        rise(3, '<p class="lead">Em seguida: ' + s.slice(1, 4).map(function (x) { return '<b>' + esc(x.nome) + '</b> (' + x.qtd + ')'; }).join(', ') + '.</p>');
    } },

    /* 7 · tempo de resolução */
    { theme: 't-lime', html: function () {
      var t = D.tempo;
      return rise(0, '<p class="kicker">Velocidade</p>') +
        rise(1, '<div class="mega"><span data-count="' + Math.round(t.pctMesmoDia) + '">0</span><small>%</small></div>') +
        rise(2, '<h2 class="title">resolvidos em <em>menos de 24 horas</em>.</h2>') +
        '<div class="chips">' +
        '<div class="chip rise" style="--d:3"><b>' + Math.round(t.pctAte1h) + '%</b><span>em até 1 hora</span></div>' +
        '<div class="chip rise" style="--d:4"><b>' + Math.round(t.pctAte7d) + '%</b><span>em até 7 dias</span></div>' +
        '<div class="chip wide rise" style="--d:5"><b>' + duracao(t.medianaH) + '</b><span>tempo mediano entre abrir e concluir o chamado</span></div>' +
        '</div>';
    } },

    /* 8 · mês a mês */
    { theme: 't-violet', html: function () {
      var max = Math.max.apply(null, D.mensal.map(function (m) { return m.abertos; }));
      var cols = D.mensal.map(function (m, i) {
        var mes = +m.mes.slice(5), ano = m.mes.slice(2, 4);
        var parcial = i === 0 || i === D.mensal.length - 1;
        var lab = (i % 3 === 0) ? MESES[mes - 1] + (mes === 1 || i === 0 ? '/' + ano : '') : '';
        return '<div class="col' + (m === picoMes ? ' peak' : '') + (parcial ? ' part' : '') + '" title="' + MESES[mes - 1] + '/' + m.mes.slice(0, 4) + ': ' + m.abertos + '">' +
          '<i style="--h:' + (m.abertos / max * 100).toFixed(1) + '%;--i:' + i + '"></i><span>' + lab + '</span></div>';
      }).join('');
      return rise(0, '<p class="kicker">Mês a mês</p>') +
        rise(1, '<h2 class="title">O mês mais agitado foi <em>' + MESES_LONGO[picoMesObj.m - 1] + ' de ' + picoMesObj.y + '</em>.</h2>') +
        rise(2, '<div class="chart">' + cols + '</div>') +
        rise(3, '<p class="lead"><b>' + picoMes.abertos + ' chamados</b> abertos em um único mês. As barras listradas são meses incompletos.</p>');
    } },

    /* 9 · horário e dia da semana */
    { theme: 't-cyan', html: function () {
      var faixa = D.hora.slice(7, 19), max = Math.max.apply(null, faixa);
      var cols = faixa.map(function (v, i) {
        var h = i + 7;
        return '<div class="col' + (h === maxHora ? ' peak' : '') + '"><i style="--h:' + (v / max * 100).toFixed(1) + '%;--i:' + i + '"></i><span>' + h + 'h</span></div>';
      }).join('');
      return rise(0, '<p class="kicker">Horário nobre</p>') +
        rise(1, '<h2 class="title">Às <em>' + maxHora + 'h</em> o telefone da TI esquenta.</h2>') +
        rise(2, '<div class="chart hours">' + cols + '</div>') +
        rise(3, '<p class="lead"><b>' + DIAS[maxDiaSemana].replace(/^./, function (c) { return c.toUpperCase(); }) + '</b> é o dia mais pesado, com <b>' + pct(D.diaSemana[maxDiaSemana], D.total) + '%</b> de todos os chamados.</p>');
    } },

    /* 10 · curiosidades */
    { theme: 't-amber', html: function () {
      var c = D.curiosidades;
      return rise(0, '<p class="kicker">Curiosidades</p>') +
        rise(1, '<h2 class="title">Os <em>recordes</em> da fila.</h2>') +
        '<ul class="facts">' +
        rise(2, '<li><b>' + segParaTexto(c.maisRapidoSeg) + '</b><span>o chamado mais rápido: “' + esc(c.maisRapidoProb) + '”, setor ' + esc(c.maisRapidoSetor) + '.</span></li>') +
        rise(3, '<li><b>' + c.maisLongoDias + ' dias</b><span>o chamado que ficou mais tempo aberto: “' + esc(c.maisLongoProb) + '”.</span></li>') +
        rise(4, '<li><b>' + D.diaPico.qtd + ' chamados</b><span>no dia mais intenso, ' + dataLonga(D.diaPico.data) + '.</span></li>') +
        rise(5, '<li><b>' + c.foraExpediente + '</b><span>chamados abertos em fins de semana ou fora do horário comercial (antes das 7h ou depois das 19h).</span></li>') +
        '</ul>';
    } },

    /* 11 · unidades */
    { theme: 't-mint', html: function () {
      var u = D.unidades;
      return rise(0, '<p class="kicker">Por unidade de negócio</p>') +
        rise(1, '<h2 class="title"><em>' + pct(u[0].qtd, D.total) + '%</em> dos chamados vieram da ' + esc(u[0].nome) + '.</h2>') +
        rise(2, '<div class="stack">' + u.map(function (x, i) { return '<i style="--w:' + (x.qtd / D.total * 100).toFixed(2) + '%;--c:' + UN_CORES[i] + ';--i:' + i + '"></i>'; }).join('') + '</div>') +
        rise(3, '<ul class="legend">' + u.map(function (x, i) {
          return '<li style="--c:' + UN_CORES[i] + '"><i></i><span style="color:var(--paper)">' + esc(x.nome) + '</span><b>' + n(x.qtd) + ' <span>· ' + pct(x.qtd, D.total) + '%</span></b></li>';
        }).join('') + '</ul>');
    } },

    /* 12 · resumo compartilhável */
    { theme: 't-lime', final: true, html: function () {
      return '<div class="card-wrap rise" style="--d:0"><canvas id="cardCanvas" width="1080" height="1920" aria-label="Cartão-resumo da retrospectiva"></canvas></div>' +
        '<div class="actions rise" style="--d:2">' +
        '<button class="btn" id="btnDownload" type="button">⬇ Baixar imagem</button>' +
        '<button class="btn ghost" id="btnShare" type="button">↗ Compartilhar vídeo</button>' +
        '<button class="replay" id="btnReplay" type="button">↺ Rever do início</button></div>';
    } }
  ];

  /* ---------- cartão-resumo (canvas) ---------- */
  var FONT_D = '"Bricolage Grotesque", "Arial Black", Impact, sans-serif';
  var FONT_B = '"DM Sans", system-ui, "Segoe UI", sans-serif';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(ctx, s, x, y, font, color, align, maxW) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    if (maxW) {
      var f = font, size = parseInt(font.match(/(\d+)px/)[1], 10);
      while (ctx.measureText(s).width > maxW && size > 16) { size -= 2; ctx.font = font.replace(/\d+px/, size + 'px'); }
    }
    ctx.fillText(s, x, y);
  }

  function drawCard(canvas) {
    var ctx = canvas.getContext('2d'), W = 1080, H = 1920, ACC = '#c8ff3d', PAPER = '#f4f1ea', MUT = 'rgba(244,241,234,.62)';
    canvas.width = W; canvas.height = H;

    ctx.fillStyle = '#10140a'; ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W, 0, 0, W, 0, 1300);
    g.addColorStop(0, 'rgba(95,140,14,.75)'); g.addColorStop(1, 'rgba(16,20,10,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var g2 = ctx.createRadialGradient(0, H, 0, 0, H, 1200);
    g2.addColorStop(0, 'rgba(27,60,6,.9)'); g2.addColorStop(1, 'rgba(16,20,10,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

    var M = 84;
    // marca
    ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(M + 10, 112, 10, 0, 7); ctx.fill();
    txt(ctx, 'GI · TI', M + 34, 123, '700 30px ' + FONT_B, PAPER);
    ctx.save(); ctx.font = '700 30px ' + FONT_B; ctx.letterSpacing = '4px';
    ctx.restore();
    txt(ctx, 'RETROSPECTIVA DE CHAMADOS', W - M, 123, '700 26px ' + FONT_B, ACC, 'right');

    // total
    txt(ctx, String(n(D.total)), M - 6, 480, '800 340px ' + FONT_D, ACC, 'left', W - M * 2);
    txt(ctx, 'chamados concluídos', M, 570, '800 76px ' + FONT_D, PAPER);
    txt(ctx, periodoTxt, M, 626, '500 34px ' + FONT_B, MUT);

    // tiles
    var tiles = [
      [Math.round(D.tempo.pctMesmoDia) + '%', 'resolvidos em menos de 24h'],
      [duracao(D.tempo.medianaH), 'tempo mediano de resolução'],
      [top5[0].nome, 'assunto mais frequente (' + n(top5[0].qtd) + ')'],
      [setores5[0].nome, 'setor que mais pediu ajuda (' + n(setores5[0].qtd) + ')']
    ];
    var tw = (W - M * 2 - 24) / 2, th = 210, ty = 700;
    tiles.forEach(function (t, i) {
      var x = M + (i % 2) * (tw + 24), y = ty + Math.floor(i / 2) * (th + 24);
      rr(ctx, x, y, tw, th, 28); ctx.fillStyle = 'rgba(244,241,234,.07)'; ctx.fill();
      ctx.strokeStyle = 'rgba(244,241,234,.14)'; ctx.lineWidth = 2; ctx.stroke();
      txt(ctx, t[0], x + 32, y + 100, '800 70px ' + FONT_D, PAPER, 'left', tw - 64);
      txt(ctx, t[1], x + 32, y + 156, '500 28px ' + FONT_B, MUT, 'left', tw - 64);
    });

    // mini gráfico mensal
    var cy = 1230;
    txt(ctx, 'CHAMADOS ABERTOS POR MÊS', M, cy, '700 26px ' + FONT_B, ACC);
    var ch = 300, cw = W - M * 2, max = Math.max.apply(null, D.mensal.map(function (m) { return m.abertos; }));
    var bw = cw / D.mensal.length;
    D.mensal.forEach(function (m, i) {
      var h = Math.max(6, (m.abertos / max) * ch), x = M + i * bw + 3;
      rr(ctx, x, cy + 40 + ch - h, bw - 6, h, 6);
      ctx.fillStyle = m === picoMes ? ACC : 'rgba(244,241,234,.3)'; ctx.fill();
    });
    txt(ctx, MESES[+D.mensal[0].mes.slice(5) - 1] + '/' + D.mensal[0].mes.slice(2, 4), M, cy + 40 + ch + 40, '500 26px ' + FONT_B, MUT);
    var last = D.mensal[D.mensal.length - 1];
    txt(ctx, MESES[+last.mes.slice(5) - 1] + '/' + last.mes.slice(2, 4), W - M, cy + 40 + ch + 40, '500 26px ' + FONT_B, MUT, 'right');
    txt(ctx, 'pico: ' + MESES_LONGO[picoMesObj.m - 1] + ' de ' + picoMesObj.y + ' (' + picoMes.abertos + ')', W / 2, cy + 40 + ch + 40, '500 26px ' + FONT_B, MUT, 'center');

    // rodapé
    ctx.fillStyle = 'rgba(244,241,234,.14)'; ctx.fillRect(M, 1740, W - M * 2, 2);
    txt(ctx, D.nSolicitantes + ' pessoas · ' + D.nSetores + ' setores · ' + (D.unidades.length) + ' unidades', M, 1810, '500 32px ' + FONT_B, PAPER);
    txt(ctx, 'Equipe do GI · Cambaí', M, 1858, '500 28px ' + FONT_B, MUT);
  }

  var cardReady = null;
  function ensureCard() {
    var c = document.getElementById('cardCanvas');
    var fonts = (document.fonts && document.fonts.load)
      ? Promise.all([document.fonts.load('800 80px "Bricolage Grotesque"'), document.fonts.load('500 30px "DM Sans"'), document.fonts.load('700 30px "DM Sans"')]).catch(function () {})
      : Promise.resolve();
    return fonts.then(function () { if (c) drawCard(c); });
  }

  function cardBlob() {
    var off = document.createElement('canvas');
    return ensureCard().then(function () {
      drawCard(off);
      return new Promise(function (res) { off.toBlob(res, 'image/png'); });
    });
  }

  /* ---------- download / compartilhar ---------- */
  var toastEl = document.getElementById('toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }
  var FILE = 'retrospectiva-ti-chamados.png';
  var SHARE_TXT = 'Retrospectiva TI: ' + n(D.total) + ' chamados concluídos entre ' + dataCurta(D.periodo.inicio) + ' e ' + dataCurta(D.periodo.fim) +
    '. ' + Math.round(D.tempo.pctMesmoDia) + '% resolvidos em menos de 24h. Assunto mais frequente: ' + top5[0].nome + '.';

  function baixar() {
    return cardBlob().then(function (blob) {
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = FILE; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Imagem baixada');
    });
  }

  function baixarVideo(video) {
    var url = URL.createObjectURL(video.blob), a = document.createElement('a');
    a.href = url; a.download = video.filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    toast('Vídeo gerado: ' + video.filename);
  }

  function compartilhar() {
    var wasPaused = paused;
    if (!wasPaused) setPaused(true);
    toast('Preparando vídeo da retrospectiva…');
    return window.GIVideoExport.create(els, frame, 'retrospectiva-pipefy', function (message) {
      toast(message);
    }).then(function (video) {
      var file = new File([video.blob], video.filename, { type: video.blob.type });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'Retrospectiva TI · Demandas Pipefy', text: SHARE_TXT })
          .catch(function (error) {
            if (error && error.name === 'AbortError') return;
            baixarVideo(video);
            toast('Não foi possível abrir o compartilhamento. O vídeo foi baixado.');
          });
      }
      baixarVideo(video);
      if (navigator.clipboard) navigator.clipboard.writeText(SHARE_TXT).catch(function () {});
      window.open('https://wa.me/?text=' + encodeURIComponent(SHARE_TXT + ' O vídeo foi salvo no dispositivo para anexar à conversa.'), '_blank', 'noopener');
    }).catch(function (error) {
      toast(error && error.message ? error.message : 'Não foi possível gerar o vídeo.');
    }).then(function (result) {
      if (!wasPaused) setPaused(false);
      return result;
    }, function (error) {
      if (!wasPaused) setPaused(false);
      throw error;
    });
  }

  /* ---------- motor dos slides ---------- */
  var stage = document.getElementById('stage');
  var frame = document.getElementById('frame');
  var progress = document.getElementById('progress');
  var pauseIcon = document.getElementById('pauseIcon');
  var cur = -1, timer = null, paused = REDUCED, remaining = SLIDE_MS, startedAt = 0;

  stage.innerHTML = slides.map(function (s, i) {
    return '<article class="slide ' + s.theme + (s.final ? ' final' : '') + '" data-i="' + i + '" aria-hidden="true">' + s.html() + '</article>';
  }).join('');
  var els = [].slice.call(stage.children);
  progress.innerHTML = slides.map(function () { return '<span class="seg"><i></i></span>'; }).join('');
  var segs = [].slice.call(progress.children);

  function countUp(root) {
    [].forEach.call(root.querySelectorAll('[data-count]'), function (el) {
      var to = +el.getAttribute('data-count');
      if (REDUCED) { el.textContent = n(to); return; }
      var t0 = performance.now(), dur = 1300;
      (function tick(t) {
        var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = n(Math.round(to * e));
        if (p < 1 && root.classList.contains('active')) requestAnimationFrame(tick); else el.textContent = n(to);
      })(t0);
    });
  }

  function schedule(ms) {
    clearTimeout(timer);
    if (paused || slides[cur].final) return;
    startedAt = Date.now(); remaining = ms;
    timer = setTimeout(function () { go(cur + 1); }, ms);
  }

  function go(i) {
    if (i < 0) i = 0;
    if (i >= slides.length) i = slides.length - 1;
    if (i === cur) return;
    cur = i;
    els.forEach(function (el, k) {
      var on = k === i;
      el.classList.toggle('active', on); el.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (!on) el.classList.remove('active');
    });
    segs.forEach(function (sg, k) {
      sg.classList.toggle('done', k < i || (k === i && slides[i].final));
      sg.classList.remove('live');
      if (k === i && !slides[i].final) { void sg.offsetWidth; sg.classList.add('live'); }
    });
    frame.classList.toggle('is-final', !!slides[i].final);
    var accent = getComputedStyle(els[i]).getPropertyValue('--accent');
    frame.style.setProperty('--accent', accent.trim());
    countUp(els[i]);
    if (slides[i].final) { ensureCard(); bindFinal(); }
    document.documentElement.style.setProperty('--slide-ms', SLIDE_MS + 'ms');
    remaining = SLIDE_MS; schedule(SLIDE_MS);
  }

  function setPaused(p) {
    if (p === paused) return;
    paused = p; frame.classList.toggle('paused', p);
    pauseIcon.setAttribute('d', p ? 'M8 5v14l11-7z' : 'M7 5h4v14H7zM13 5h4v14h-4z');
    document.getElementById('btnPause').setAttribute('aria-label', p ? 'Continuar' : 'Pausar');
    if (p) { clearTimeout(timer); remaining = Math.max(400, remaining - (Date.now() - startedAt)); }
    else schedule(remaining);
  }

  var finalBound = false;
  function bindFinal() {
    if (finalBound) return; finalBound = true;
    document.getElementById('btnDownload').addEventListener('click', baixar);
    document.getElementById('btnShare').addEventListener('click', compartilhar);
    document.getElementById('btnReplay').addEventListener('click', function () { go(0); });
  }

  /* navegação */
  document.getElementById('zoneNext').addEventListener('click', function () { go(cur + 1); });
  document.getElementById('zonePrev').addEventListener('click', function () { go(cur - 1); });
  document.getElementById('btnPause').addEventListener('click', function () { setPaused(!paused); });
  document.getElementById('btnDownloadTop').addEventListener('click', baixar);
  document.getElementById('btnShareTop').addEventListener('click', compartilhar);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' && e.target === document.body) { e.preventDefault(); go(cur + 1); }
    else if (e.key === 'ArrowLeft') go(cur - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length - 1);
    else if (e.key.toLowerCase() === 'p') setPaused(!paused);
  });

  /* segurar para pausar + deslizar */
  var holdT, held = false, sx = 0;
  frame.addEventListener('pointerdown', function (e) {
    sx = e.clientX; held = false;
    if (e.target.closest('button:not(.zone)')) return;
    holdT = setTimeout(function () { held = true; if (!paused) { frame.dataset.hold = '1'; setPaused(true); } }, 260);
  });
  function release(e) {
    clearTimeout(holdT);
    if (frame.dataset.hold) { delete frame.dataset.hold; setPaused(false); }
    if (e && e.type === 'pointerup' && Math.abs(e.clientX - sx) > 60) { held = true; go(cur + (e.clientX < sx ? 1 : -1)); }
  }
  frame.addEventListener('pointerup', release);
  frame.addEventListener('pointercancel', release);
  frame.addEventListener('click', function (e) { if (held) { e.stopPropagation(); e.preventDefault(); held = false; } }, true);

  document.addEventListener('visibilitychange', function () { if (document.hidden && !paused) setPaused(true); });

  if (paused) frame.classList.add('paused');
  go(0);
})();
