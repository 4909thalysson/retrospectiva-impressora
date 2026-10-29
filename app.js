(function () {
  'use strict';

  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  var DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  var SLIDE_MS = 6500;
  var DAY = 86400000;

  var state = { printers: [], selected: null, from: '', to: '' };

  /* ---------- utilidades ---------- */
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function parseISO(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function toISO(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function shortDate(iso) { var d = parseISO(iso); return d.getDate() + ' ' + MESES[d.getMonth()]; }
  function longDate(iso) { var d = parseISO(iso); return d.getDate() + ' de ' + MESES_LONGOS[d.getMonth()] + ' de ' + d.getFullYear(); }
  function weekdayIdx(d) { return (d.getDay() + 6) % 7; }
  function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / DAY); }
  function argmax(list, fn) {
    var best = null, bv = -Infinity;
    list.forEach(function (x) { var v = fn(x); if (v > bv) { bv = v; best = x; } });
    return best;
  }

  /* ---------- cálculos ---------- */
  function sortedReadings(p) {
    return p.leituras.slice().sort(function (a, b) { return a.contador_anterior - b.contador_anterior; });
  }

  function compute(p, from, to) {
    var all = sortedReadings(p);
    if (!all.length) return null;

    var firstPrev = {};
    all.forEach(function (r, i) { if (!(r.data in firstPrev)) firstPrev[r.data] = i > 0 ? all[i - 1].data : null; });

    var rows = all.filter(function (r) { return (!from || r.data >= from) && (!to || r.data <= to); });
    if (!rows.length) return null;

    var s = { rows: rows, total: 0, daily: {}, weekday: [0, 0, 0, 0, 0, 0, 0], month: {}, week: {} };
    rows.forEach(function (r) {
      var d = parseISO(r.data), v = r.paginas;
      s.total += v;
      s.daily[r.data] = (s.daily[r.data] || 0) + v;
      s.weekday[weekdayIdx(d)] += v;
      var mk = d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1);
      s.month[mk] = (s.month[mk] || 0) + v;
      var mon = new Date(d); mon.setDate(d.getDate() - weekdayIdx(d));
      var wk = toISO(mon);
      s.week[wk] = (s.week[wk] || 0) + v;
    });

    s.days = Object.keys(s.daily).sort();
    s.first = s.days[0];
    s.last = s.days[s.days.length - 1];
    s.span = daysBetween(s.first, s.last) + 1;
    s.counterStart = rows[0].contador_anterior;
    s.counterEnd = rows[rows.length - 1].contador_atual;

    var biz = 0;
    for (var t = parseISO(s.first).getTime(), end = parseISO(s.last).getTime(); t <= end; t += DAY) {
      var wd = weekdayIdx(new Date(t));
      if (wd < 5) biz++;
    }
    s.avgReadDay = s.total / s.days.length;
    s.avgBizDay = s.total / Math.max(1, biz);
    s.avgCalDay = s.total / s.span;

    s.topDays = s.days.slice().sort(function (a, b) { return s.daily[b] - s.daily[a]; }).slice(0, 5).map(function (k) {
      var prev = firstPrev[k];
      return { data: k, paginas: s.daily[k], gap: prev ? daysBetween(prev, k) : null };
    });

    s.months = Object.keys(s.month).sort().map(function (k) {
      var p2 = k.split('-');
      return { key: k, label: MESES[+p2[1] - 1], longo: MESES_LONGOS[+p2[1] - 1], paginas: s.month[k] };
    });
    s.weeks = Object.keys(s.week).sort().map(function (k) { return { inicio: k, paginas: s.week[k] }; });
    s.bestWeekday = argmax([0, 1, 2, 3, 4, 5, 6], function (i) { return s.weekday[i]; });
    s.bestMonth = argmax(s.months, function (m) { return m.paginas; });
    s.bestWeek = argmax(s.weeks, function (w) { return w.paginas; });

    // toner: ciclos medidos pelo contador
    s.toners = [];
    all.forEach(function (r, i) {
      if (!r.troca_toner) return;
      var start = r.contador_anterior, next = null;
      for (var j = i + 1; j < all.length; j++) { if (all[j].troca_toner) { next = all[j].contador_anterior; break; } }
      if (r.data < (from || '0000') || r.data > (to || '9999')) return;
      s.toners.push({
        data: r.data,
        paginas: (next != null ? next : all[all.length - 1].contador_atual) - start,
        emUso: next == null
      });
    });
    return s;
  }

  /* ---------- carga de dados ---------- */
  function loadJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ': ' + r.status);
      return r.json();
    });
  }

  function init() {
    loadJSON('dados/impressoras.json').then(function (list) {
      return Promise.all(list.map(function (meta) {
        return loadJSON(meta.arquivo).then(function (data) {
          return { meta: meta, data: data, stats: compute(data, '', '') };
        });
      }));
    }).then(function (printers) {
      state.printers = printers;
      var first = printers.filter(function (p) { return p.stats; })[0] || printers[0];
      renderGeneral();
      renderPrinters();
      if (first) select(first.meta.id);
    }).catch(function (err) {
      $('period-note').textContent = 'Não foi possível carregar os arquivos de dados.';
      var box = $('general');
      box.textContent = '';
      var e = el('div', 'empty');
      e.appendChild(el('strong', null, 'Abra a página por um servidor local. '));
      e.appendChild(document.createTextNode('Navegadores bloqueiam a leitura dos arquivos JSON quando o index.html é aberto direto do disco. Na pasta do projeto, rode '));
      e.appendChild(el('code', null, 'python3 -m http.server 8000'));
      e.appendChild(document.createTextNode(' e acesse http://localhost:8000. (' + err.message + ')'));
      box.appendChild(e);
    });
  }

  /* ---------- indicadores gerais ---------- */
  function kpi(value, label, cls) {
    var k = el('div', 'kpi' + (cls ? ' ' + cls : ''));
    k.appendChild(el('p', 'v', value));
    k.appendChild(el('p', 'l', label));
    return k;
  }

  function renderGeneral() {
    var box = $('general');
    box.textContent = '';
    var withData = state.printers.filter(function (p) { return p.stats; });
    var total = withData.reduce(function (a, p) { return a + p.stats.total; }, 0);
    box.appendChild(kpi(fmt(total), 'páginas no total', 'accent'));
    box.appendChild(kpi(withData.length + ' de ' + state.printers.length, 'impressoras com dados'));
    if (withData.length) {
      var firsts = withData.map(function (p) { return p.stats.first; }).sort();
      var lasts = withData.map(function (p) { return p.stats.last; }).sort();
      var start = firsts[0], end = lasts[lasts.length - 1];
      box.appendChild(kpi(daysBetween(start, end) + 1 + ' dias', shortDate(start) + ' a ' + shortDate(end)));
      var best = argmax(withData, function (p) { return p.stats.total; });
      box.appendChild(kpi(best.meta.nome, 'que mais imprimiu'));
      $('period-note').textContent = 'Leituras do contador de ' + longDate(start) + ' a ' + longDate(end) + '.';
    } else {
      $('period-note').textContent = 'Nenhuma impressora com leituras ainda.';
    }
  }

  /* ---------- seleção de impressora ---------- */
  function renderPrinters() {
    var box = $('printers');
    box.textContent = '';
    state.printers.forEach(function (p) {
      var b = el('button', 'printer');
      b.type = 'button';
      b.setAttribute('aria-pressed', state.selected === p.meta.id ? 'true' : 'false');
      b.appendChild(el('span', 'n', p.meta.nome));
      b.appendChild(el('span', 's', p.meta.local));
      if (p.stats) {
        b.appendChild(el('span', 'p', fmt(p.stats.total) + ' pág.'));
        b.appendChild(el('span', 'pill', p.stats.days.length + ' dias com leitura'));
      } else {
        b.appendChild(el('span', 'p', '—'));
        b.appendChild(el('span', 'pill', 'sem leituras'));
      }
      b.addEventListener('click', function () { select(p.meta.id); });
      box.appendChild(b);
    });
  }

  function current() {
    return state.printers.filter(function (p) { return p.meta.id === state.selected; })[0];
  }

  function select(id) {
    state.selected = id;
    state.from = '';
    state.to = '';
    var p = current();
    $('f-from').value = '';
    $('f-to').value = '';
    if (p && p.stats) {
      $('f-from').min = $('f-to').min = p.stats.first;
      $('f-from').max = $('f-to').max = p.stats.last;
      $('f-from').value = p.stats.first;
      $('f-to').value = p.stats.last;
    }
    renderPrinters();
    renderReport();
  }

  /* ---------- gráficos ---------- */
  function weekdayChart(s, root) {
    root.textContent = '';
    var idxs = [0, 1, 2, 3, 4];
    if (s.weekday[5] > 0) idxs.push(5);
    if (s.weekday[6] > 0) idxs.push(6);
    var max = Math.max.apply(null, idxs.map(function (i) { return s.weekday[i]; })) || 1;
    idxs.forEach(function (i) {
      var v = s.weekday[i];
      var col = el('div', 'col' + (i === s.bestWeekday ? ' best' : ''));
      var fill = el('div', 'fill');
      fill.style.height = Math.max(3, (v / max) * 100) + '%';
      col.appendChild(fill);
      col.appendChild(el('span', 'v', fmt(v)));
      col.appendChild(el('span', 'd', DIAS_CURTOS[i]));
      root.appendChild(col);
    });
  }

  function monthChart(s, root) {
    root.textContent = '';
    var max = Math.max.apply(null, s.months.map(function (m) { return m.paginas; })) || 1;
    s.months.forEach(function (m) {
      var row = el('div', 'row' + (m === s.bestMonth ? ' best' : ''));
      row.appendChild(el('span', null, m.label));
      var track = el('div', 'track');
      var fill = el('div', 'fill');
      fill.style.width = (m.paginas / max) * 100 + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el('span', 'val', fmt(m.paginas)));
      root.appendChild(row);
    });
  }

  function weekChart(s, root) {
    root.textContent = '';
    var max = s.bestWeek.paginas || 1;
    s.weeks.forEach(function (w) {
      var b = el('div', 'w' + (w === s.bestWeek ? ' best' : ''));
      b.style.height = Math.max(3, (w.paginas / max) * 100) + '%';
      b.title = 'Semana de ' + shortDate(w.inicio) + ': ' + fmt(w.paginas) + ' páginas';
      root.appendChild(b);
    });
  }

  /* ---------- relatório ---------- */
  function renderReport() {
    var p = current();
    if (!p) return;
    $('report').hidden = false;
    $('report-eyebrow').textContent = p.meta.local;
    $('report-title').textContent = p.meta.nome;
    var pdf = $('pdf-link');
    if (p.meta.pdf) { pdf.href = p.meta.pdf; pdf.hidden = false; } else { pdf.hidden = true; }

    var s = p.stats ? compute(p.data, state.from, state.to) : null;
    var empty = $('empty'), body = $('report-body');
    $('open-stories').hidden = !s;

    if (!s) {
      body.hidden = true;
      empty.hidden = false;
      empty.textContent = '';
      if (!p.stats) {
        empty.appendChild(el('strong', null, 'Esta impressora ainda não tem leituras. '));
        empty.appendChild(document.createTextNode('Copie o relatório para '));
        empty.appendChild(el('code', null, 'pdf/'));
        empty.appendChild(document.createTextNode(' e preencha '));
        empty.appendChild(el('code', null, p.meta.arquivo));
        empty.appendChild(document.createTextNode(' no mesmo formato de dados/impressora-01.json.'));
        $('report-meta').textContent = '';
        $('filters').hidden = true;
      } else {
        empty.appendChild(el('strong', null, 'Nenhuma leitura neste período. '));
        empty.appendChild(document.createTextNode('Ajuste as datas ou volte ao período completo.'));
        $('filters').hidden = false;
      }
      return;
    }

    $('filters').hidden = false;
    empty.hidden = true;
    body.hidden = false;
    $('report-meta').textContent = longDate(s.first) + ' a ' + longDate(s.last) + ' · contador ' + fmt(s.counterStart) + ' → ' + fmt(s.counterEnd);

    var cards = $('cards');
    cards.textContent = '';
    cards.appendChild(kpi(fmt(s.total), 'páginas impressas', 'accent'));
    cards.appendChild(kpi(String(s.days.length), 'dias com leitura'));
    cards.appendChild(kpi(fmt(s.avgBizDay), 'páginas por dia útil'));
    cards.appendChild(kpi(fmt(s.topDays[0].paginas), 'maior dia · ' + shortDate(s.topDays[0].data)));
    cards.appendChild(kpi(fmt(s.bestWeek.paginas), 'semana de pico · ' + shortDate(s.bestWeek.inicio)));
    cards.appendChild(kpi(String(s.toners.length), 'trocas de toner'));

    weekdayChart(s, $('wk-chart'));
    monthChart(s, $('mo-chart'));
    weekChart(s, $('wk-bars'));
    $('weeks-note').textContent = s.weeks.length + ' semanas, de segunda a domingo';

    var rank = $('rank-days');
    rank.textContent = '';
    s.topDays.forEach(function (d) {
      var li = el('li');
      var left = el('span', null, shortDate(d.data));
      if (d.gap && d.gap > 1) left.appendChild(el('small', null, 'leitura de ' + d.gap + ' dias'));
      li.appendChild(left);
      li.appendChild(el('b', null, fmt(d.paginas)));
      rank.appendChild(li);
    });

    var tl = $('toner');
    tl.textContent = '';
    if (!s.toners.length) {
      var li0 = el('li');
      li0.appendChild(el('span', 'when', '—'));
      li0.appendChild(el('span', 'what', 'Nenhuma troca no período'));
      tl.appendChild(li0);
    }
    s.toners.forEach(function (t) {
      var li = el('li');
      li.appendChild(el('span', 'when', shortDate(t.data)));
      var w = el('span', 'what', 'Troca de toner');
      w.appendChild(el('small', null, t.emUso ? 'em uso: ' + fmt(t.paginas) + ' páginas até agora' : 'durou ' + fmt(t.paginas) + ' páginas'));
      li.appendChild(w);
      tl.appendChild(li);
    });
  }

  /* ---------- filtros ---------- */
  function applyFilters() {
    state.from = $('f-from').value;
    state.to = $('f-to').value;
    if (state.from && state.to && state.from > state.to) {
      var t = state.from; state.from = state.to; state.to = t;
      $('f-from').value = state.from; $('f-to').value = state.to;
    }
    renderReport();
  }
  $('f-from').addEventListener('change', applyFilters);
  $('f-to').addEventListener('change', applyFilters);
  $('f-clear').addEventListener('click', function () {
    var p = current();
    if (p && p.stats) { $('f-from').value = p.stats.first; $('f-to').value = p.stats.last; }
    applyFilters();
  });
  $('filters').addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- stories ---------- */
  var stories = $('stories'), stage = $('stage'), slidesBox = $('slides'), barsBox = $('bars');
  var slides = [], bars = [], idx = 0, elapsed = 0, last = 0, paused = false, raf = 0, opener = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function slide(theme) {
    var s = el('section', 'slide ' + theme);
    slidesBox.appendChild(s);
    slides.push(s);
    return s;
  }
  function add(parent, tag, cls, text) { var e = el(tag, cls, text); parent.appendChild(e); return e; }
  function rich(parent, tag, cls, parts) {
    var e = el(tag, cls);
    parts.forEach(function (x) {
      if (typeof x === 'string') e.appendChild(document.createTextNode(x));
      else e.appendChild(el(x[0], null, x[1]));
    });
    parent.appendChild(e);
    return e;
  }

  function buildStories(p, s) {
    slidesBox.textContent = '';
    slides = [];
    var name = p.meta.nome;
    var s1 = slide('t-violet');
    add(s1, 'p', 's-eyebrow', 'Impressora · ' + name);
    var h = add(s1, 'h2', 's-mega');
    h.appendChild(document.createTextNode('Sua'));
    h.appendChild(document.createElement('br'));
    h.appendChild(document.createTextNode('retrospectiva'));
    h.appendChild(document.createElement('br'));
    h.appendChild(document.createTextNode('de impressões'));
    add(s1, 'p', 's-lead', shortDate(s.first) + ' a ' + shortDate(s.last) + ' de ' + parseISO(s.last).getFullYear() + '.');

    var s2 = slide('t-lime');
    add(s2, 'p', 's-eyebrow', 'Você imprimiu');
    add(s2, 'p', 's-giant', fmt(s.total));
    add(s2, 'p', 's-big', 'páginas');
    rich(s2, 'p', 's-lead', ['Em ' + s.span + ' dias. São cerca de ', ['strong', fmt(s.total / 500) + ' resmas'], ' de 500 folhas.']);
    add(s2, 'p', 's-note', 'Contador: ' + fmt(s.counterStart) + ' → ' + fmt(s.counterEnd));

    var top = s.topDays[0];
    var s3 = slide('t-pink');
    add(s3, 'p', 's-eyebrow', 'Seu dia mais intenso');
    add(s3, 'p', 's-giant sm', shortDate(top.data));
    add(s3, 'p', 's-big', fmt(top.paginas) + ' páginas');
    add(s3, 'p', 's-lead', top.gap && top.gap > 1 ? 'Essa leitura cobre ' + top.gap + ' dias desde o registro anterior. Veja o top ' + s.topDays.length + ':' : 'Veja o top ' + s.topDays.length + ':');
    var ol = add(s3, 'ol', 'rank');
    s.topDays.forEach(function (d) {
      var li = add(ol, 'li');
      add(li, 'span', null, parseISO(d.data).getDate() + ' de ' + MESES_LONGOS[parseISO(d.data).getMonth()]);
      add(li, 'b', null, fmt(d.paginas));
    });

    var s4 = slide('t-cobalt');
    var bw = s.bestWeekday;
    var second = argmax([0, 1, 2, 3, 4, 5, 6].filter(function (i) { return i !== bw; }), function (i) { return s.weekday[i]; });
    var sumTwo = s.weekday[bw] + s.weekday[second];
    add(s4, 'p', 's-eyebrow', 'Seu dia da semana');
    add(s4, 'p', 's-giant', DIAS[bw]);
    rich(s4, 'p', 's-lead', [['strong', fmt(s.weekday[bw])], ' páginas, seguido de ' + DIAS[second].toLowerCase() + ' com ', ['strong', fmt(s.weekday[second])], '. Juntos, ' + Math.round(sumTwo / s.total * 100) + '% de tudo.']);
    weekdayChart(s, add(s4, 'div', 'wk'));

    var bm = s.bestMonth;
    var s5 = slide('t-orange');
    add(s5, 'p', 's-eyebrow', 'Seu mês mais movimentado');
    add(s5, 'p', 's-giant', bm.longo.charAt(0).toUpperCase() + bm.longo.slice(1));
    add(s5, 'p', 's-big', fmt(bm.paginas) + ' páginas');
    monthChart(s, add(s5, 'div', 'mo'));
    add(s5, 'p', 's-note', 'O último mês conta até ' + shortDate(s.last) + '.');

    var bw2 = s.bestWeek;
    var s6 = slide('t-ink');
    add(s6, 'p', 's-eyebrow', 'Semana a semana');
    rich(s6, 'p', 's-big', ['A semana de ', ['em', shortDate(bw2.inicio)], ' foi o pico: ', ['strong', fmt(bw2.paginas)], ' páginas.']);
    weekChart(s, add(s6, 'div', 'weeks'));
    add(s6, 'p', 's-note', s.weeks.length + ' semanas · cada barra vai de segunda a domingo');

    var s7 = slide('t-teal');
    add(s7, 'p', 's-eyebrow', 'Seu ritmo');
    var st = add(s7, 'div', 's-stats');
    [[s.avgReadDay, 'páginas por dia de leitura'], [s.avgBizDay, 'por dia útil'], [s.avgCalDay, 'por dia corrido']].forEach(function (x) {
      var row = add(st, 'div', 's-stat');
      add(row, 'p', 'num', fmt(x[0]));
      add(row, 'p', 'cap', x[1]);
    });
    var calm = argmax(s.weeks, function (w) { return -w.paginas; });
    add(s7, 'p', 's-lead', 'Foram ' + s.days.length + ' dias com registro. A semana mais calma, de ' + shortDate(calm.inicio) + ', teve ' + fmt(calm.paginas) + ' páginas.');

    if (s.toners.length) {
      var s8 = slide('t-red');
      add(s8, 'p', 's-eyebrow', 'Seu toner');
      add(s8, 'p', 's-giant', String(s.toners.length));
      add(s8, 'p', 's-big', s.toners.length === 1 ? 'troca de toner' : 'trocas de toner');
      var tl = add(s8, 'ul', 'timeline');
      s.toners.forEach(function (t) {
        var li = add(tl, 'li');
        add(li, 'span', 'when', shortDate(t.data));
        var w = add(li, 'span', 'what', 'Troca de toner');
        add(w, 'small', null, t.emUso ? 'em uso: ' + fmt(t.paginas) + ' páginas até agora' : 'durou ' + fmt(t.paginas) + ' páginas');
      });
    }

    var s9 = slide('t-violet');
    add(s9, 'p', 's-eyebrow', name);
    add(s9, 'h2', 's-big', 'Seu período em impressões');
    var dl = add(s9, 'dl', 's-recap');
    [['Total', fmt(s.total) + ' páginas'], ['Dia mais intenso', shortDate(top.data) + ' · ' + fmt(top.paginas)],
     ['Dia da semana', DIAS[bw]], ['Mês', bm.longo.charAt(0).toUpperCase() + bm.longo.slice(1) + ' · ' + fmt(bm.paginas)],
     ['Semana de pico', shortDate(bw2.inicio) + ' · ' + fmt(bw2.paginas)], ['Toners trocados', String(s.toners.length)]
    ].forEach(function (x) {
      var row = add(dl, 'div');
      add(row, 'dt', null, x[0]);
      add(row, 'dd', null, x[1]);
    });
    var again = add(s9, 'button', 's-again', 'Ver de novo');
    again.type = 'button';
    again.addEventListener('click', function () { show(0); });

    barsBox.textContent = '';
    bars = slides.map(function () { var b = el('div', 'bar'); b.appendChild(el('i')); barsBox.appendChild(b); return b; });
  }

  function countUp(root) {
    if (reduce) return;
    Array.prototype.forEach.call(root.querySelectorAll('.s-giant, .s-stat .num'), function (node) {
      var finalText = node.textContent;
      node.setAttribute('data-final', finalText);
      var target = parseInt(finalText.replace(/\./g, ''), 10);
      if (isNaN(target) || String(target) !== finalText.replace(/\./g, '')) return;
      var t0 = performance.now();
      (function step(now) {
        var pr = Math.min(1, (now - t0) / 900);
        var e = 1 - Math.pow(1 - pr, 3);
        node.textContent = pr < 1 ? fmt(target * e) : finalText;
        if (pr < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  function show(i) {
    idx = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function (s, n) { s.classList.toggle('active', n === idx); });
    bars.forEach(function (b, n) { b.firstChild.style.width = n < idx ? '100%' : '0'; });
    var cs = getComputedStyle(slides[idx]);
    ['--s-bg', '--s-fg', '--s-ac', '--s-soft'].forEach(function (k) { stage.style.setProperty(k, cs.getPropertyValue(k)); });
    elapsed = 0;
    last = performance.now();
    countUp(slides[idx]);
  }

  function tick(now) {
    var dt = now - last; last = now;
    if (!paused && idx < slides.length - 1) {
      elapsed += dt;
      bars[idx].firstChild.style.width = Math.min(100, (elapsed / SLIDE_MS) * 100) + '%';
      if (elapsed >= SLIDE_MS) show(idx + 1);
    } else if (idx === slides.length - 1) {
      bars[idx].firstChild.style.width = '100%';
    }
    raf = requestAnimationFrame(tick);
  }

  function openStories() {
    var p = current();
    var s = p && p.stats ? compute(p.data, state.from, state.to) : null;
    if (!s) return;
    opener = document.activeElement;
    state.cur = s;
    videoCache = null;
    say('');
    buildStories(p, s);
    stories.hidden = false;
    paused = false;
    show(0);
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    $('close-stories').focus();
  }
  function closeStories() {
    stories.hidden = true;
    cancelAnimationFrame(raf);
    if (opener && opener.focus) opener.focus();
  }


  /* ---------- salvar e compartilhar ---------- */
  var busy = false;
  function say(msg) { $('share-msg').textContent = msg || ''; }
  function setBusy(v) {
    busy = v;
    ['save-video', 'save-one', 'save-all', 'share-all'].forEach(function (id) { $(id).disabled = v; });
  }
  function fileName(i) {
    var p = current();
    return 'retrospectiva-' + (p ? p.meta.id : 'impressora') + '-' + (i + 1 < 10 ? '0' : '') + (i + 1) + '.png';
  }

  function renderSlide(i) {
    if (typeof window.html2canvas !== 'function') {
      return Promise.reject(new Error('A biblioteca de imagem não carregou. Verifique a conexão e recarregue a página.'));
    }
    var src = slides[i];
    var host = el('div', 'stage export ' + src.className.split(' ').filter(function (c) { return /^t-/.test(c); }).join(' '));
    var clone = src.cloneNode(true);
    clone.classList.add('active');
    Array.prototype.forEach.call(clone.querySelectorAll('[data-final]'), function (n) { n.textContent = n.getAttribute('data-final'); });
    Array.prototype.forEach.call(clone.querySelectorAll('.s-again'), function (n) { n.remove(); });
    host.appendChild(clone);
    var p = current();
    host.appendChild(el('p', 'export-foot', (p ? p.meta.nome : '') + ' · ' + (state.cur ? shortDate(state.cur.first) + ' a ' + shortDate(state.cur.last) : '')));
    document.body.appendChild(host);
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return ready.then(function () {
      return window.html2canvas(host, { scale: 3, backgroundColor: null, useCORS: true, logging: false });
    }).then(function (canvas) {
      host.remove();
      return new Promise(function (ok, fail) {
        canvas.toBlob(function (b) { b ? ok(b) : fail(new Error('Não foi possível gerar a imagem.')); }, 'image/png');
      });
    }, function (e) { host.remove(); throw e; });
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function run(fn) {
    if (busy) return;
    setBusy(true);
    paused = true;
    Promise.resolve().then(fn).catch(function (e) {
      if (e && e.name === 'AbortError') say('');
      else say(e && e.message ? e.message : 'Não foi possível gerar a imagem.');
    }).then(function () { setBusy(false); paused = false; last = performance.now(); });
  }

  $('save-one').addEventListener('click', function () {
    run(function () {
      say('Gerando imagem…');
      return renderSlide(idx).then(function (b) {
        download(b, fileName(idx));
        say('Imagem gerada: ' + fileName(idx) + '. Procure na pasta de downloads.');
      });
    });
  });

  $('save-all').addEventListener('click', function () {
    run(function () {
      var chain = Promise.resolve();
      slides.forEach(function (_, i) {
        chain = chain.then(function () {
          say('Gerando imagem ' + (i + 1) + ' de ' + slides.length + '…');
          return renderSlide(i).then(function (b) { download(b, fileName(i)); return wait(350); });
        });
      });
      return chain.then(function () { say(slides.length + ' imagens geradas. Se o navegador perguntar, permita vários downloads.'); });
    });
  });

  /* ---------- vídeo ---------- */
  var VIDEO_W = 720, VIDEO_H = 1280, SLIDE_VIDEO_MS = 3500, FADE_MS = 380, FPS = 30;
  var videoCache = null;

  function pickMime() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    var tries = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < tries.length; i++) { if (MediaRecorder.isTypeSupported(tries[i])) return tries[i]; }
    return null;
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }

  function buildVideo() {
    if (videoCache) return Promise.resolve(videoCache);
    var mime = pickMime();
    if (!mime) return Promise.reject(new Error('Este navegador não grava vídeo. Use “Todas as imagens”.'));
    var ext = /mp4/.test(mime) ? 'mp4' : 'webm';
    var bitmaps = [], fgs = [];
    var chain = Promise.resolve();
    slides.forEach(function (sl, i) {
      chain = chain.then(function () {
        say('Preparando slide ' + (i + 1) + ' de ' + slides.length + '…');
        fgs.push(getComputedStyle(sl).getPropertyValue('--s-fg').trim() || '#fff');
        return renderSlide(i).then(function (b) { return createImageBitmap(b); }).then(function (bm) { bitmaps.push(bm); });
      });
    });
    return chain.then(function () {
      return new Promise(function (resolve, reject) {
        var canvas = document.createElement('canvas');
        canvas.width = VIDEO_W; canvas.height = VIDEO_H;
        var ctx = canvas.getContext('2d');
        var n = bitmaps.length, total = n * SLIDE_VIDEO_MS + 600;
        var kScale = VIDEO_W / 360;
        var stream = canvas.captureStream(FPS);
        var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 });
        var chunks = [];
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onerror = function () { reject(new Error('Falha ao gravar o vídeo.')); };
        rec.onstop = function () {
          var blob = new Blob(chunks, { type: mime.split(';')[0] });
          videoCache = { blob: blob, ext: ext };
          resolve(videoCache);
        };

        function drawSlide(i, alpha, zoom) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(VIDEO_W / 2, VIDEO_H / 2);
          ctx.scale(zoom, zoom);
          ctx.drawImage(bitmaps[i], -VIDEO_W / 2, -VIDEO_H / 2, VIDEO_W, VIDEO_H);
          ctx.restore();
        }
        function drawBars(i, local) {
          var margin = 14 * kScale, gap = 4 * kScale, h = 3 * kScale, y = 14 * kScale;
          var w = (VIDEO_W - 2 * margin - gap * (n - 1)) / n;
          ctx.fillStyle = fgs[i];
          for (var k = 0; k < n; k++) {
            var x = margin + k * (w + gap);
            ctx.globalAlpha = .25;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1;
            var fill = k < i ? 1 : k === i ? Math.min(1, local / SLIDE_VIDEO_MS) : 0;
            if (fill > 0) ctx.fillRect(x, y, w * fill, h);
          }
        }
        function frame(t) {
          var i = Math.min(n - 1, Math.floor(t / SLIDE_VIDEO_MS));
          var local = t - i * SLIDE_VIDEO_MS;
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
          var k = ease(local / (FADE_MS * 1.6));
          if (i > 0 && local < FADE_MS) {
            drawSlide(i - 1, 1, 1);
            drawSlide(i, ease(local / FADE_MS), 1.035 - 0.035 * k);
          } else {
            drawSlide(i, 1, 1.035 - 0.035 * k);
          }
          drawBars(i, Math.min(local, SLIDE_VIDEO_MS));
        }

        frame(0);
        rec.start(250);
        var t0 = performance.now();
        (function loop() {
          var t = performance.now() - t0;
          if (t >= total) { frame(total - 1); setTimeout(function () { rec.stop(); }, 150); return; }
          frame(t);
          say('Gravando vídeo… ' + Math.round((t / total) * 100) + '%. Mantenha esta aba aberta.');
          requestAnimationFrame(loop);
        })();
      });
    });
  }
  function videoName(ext) { var p = current(); return 'retrospectiva-' + (p ? p.meta.id : 'impressora') + '.' + ext; }

  $('save-video').addEventListener('click', function () {
    run(function () {
      return buildVideo().then(function (v) {
        download(v.blob, videoName(v.ext));
        say('Vídeo gerado: ' + videoName(v.ext) + (v.ext === 'webm' ? ' (formato WebM; se o WhatsApp não abrir, use o Chrome mais recente ou o Safari para gerar MP4).' : '.') + ' Procure na pasta de downloads.');
      });
    });
  });

  if (navigator.share && navigator.canShare) $('share-all').hidden = false;
  $('share-all').addEventListener('click', function () {
    run(function () {
      return buildVideo().then(function (v) {
        var f = new File([v.blob], videoName(v.ext), { type: v.blob.type });
        if (!navigator.canShare({ files: [f] })) throw new Error('Este dispositivo não compartilha vídeo daqui. Use “Salvar vídeo”.');
        say('');
        var p = current();
        return navigator.share({ files: [f], title: 'Retrospectiva de impressões · ' + (p ? p.meta.nome : '') });
      });
    });
  });

  var holdTimer = 0, held = false;
  [$('prev'), $('next')].forEach(function (btn) {
    btn.addEventListener('pointerdown', function () {
      held = false;
      holdTimer = setTimeout(function () { held = true; paused = true; }, 220);
    });
    function release() { clearTimeout(holdTimer); paused = false; }
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
  });
  $('prev').addEventListener('click', function () { if (!held) show(idx - 1); held = false; });
  $('next').addEventListener('click', function () { if (!held && idx < slides.length - 1) show(idx + 1); held = false; });
  $('close-stories').addEventListener('click', closeStories);
  $('open-stories').addEventListener('click', openStories);
  document.addEventListener('keydown', function (e) {
    if (stories.hidden) return;
    if (e.key === 'Escape') closeStories();
    else if (e.key === 'ArrowRight') { if (idx < slides.length - 1) show(idx + 1); }
    else if (e.key === 'ArrowLeft') show(idx - 1);
  });
  document.addEventListener('visibilitychange', function () { paused = document.hidden; last = performance.now(); });

  init();
})();