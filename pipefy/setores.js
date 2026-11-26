(function () {
  'use strict';

  var nf = new Intl.NumberFormat('pt-BR');
  var MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  var MONTHS_LONG = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var DAYS = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  var COLORS = ['#4de1ff','#c8ff3d','#ffc23d','#ff7a59','#b79bff','#4dffb0'];
  var SLIDE_MS = 8000, REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var records = [], currentData = null, currentSector = '', slides = [], cur = -1;
  var timer = null, paused = REDUCED, remaining = SLIDE_MS, startedAt = 0, finalBound = false;
  var selector = document.getElementById('selector');
  var presentation = document.getElementById('presentation');
  var stage = document.getElementById('stage');
  var frame = document.getElementById('frame');
  var progress = document.getElementById('progress');
  var pauseIcon = document.getElementById('pauseIcon');
  var toastEl = document.getElementById('toast');

  function n(v) { return nf.format(Math.round(Number(v) || 0)); }
  function pct(v, total) { return total ? Math.round(v / total * 100) : 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function normalizeSector(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR'); }
  var SECTOR_VARIANTS = {
    'Almoxarifado': ['Almoxarifado'],
    'BackOffice': ['Backoffice'],
    'Balança': ['Balança'],
    'Comercial': ['Comercial'],
    'Compras': ['Compras'],
    'Contabilidade': ['Fiscal Contábil'],
    'Direção': ['Direção'],
    'Elétrica / Manutenção': ['Elétrica'],
    'Faturamento': ['Faturamento'],
    'FAZ G - Gestão': ['Fazendas Gestão'],
    'Financeiro': ['Financeiro | Gestão'],
    'Gestão da Informação': ['GI | TI'],
    'Marketing': ['Marketing'],
    'Planejamento & Controladoria': ['Planej e Controle'],
    'Produção Campo': ['Produção Campo'],
    'Qualidade Laboratório': ['Laboratório Pulsa', 'CQB', 'Qualidade', 'Qualidade / Produção'],
    'Recepção': ['Recepção'],
    'Recursos Humanos': ['RH'],
    'Refeitório': ['Refeitório'],
    'Segurança do Trabalho': ['Seg Trabalho'],
    'Transportadora': ['Transportadora'],
    'Fazenda - 3 Irmãos': ['Fazenda 3 irmãos'],
    'Fazenda - Lagoa': ['Fazenda – Lagoa']
  };
  function canonicalSector(name) {
    var normalizedName=normalizeSector(name);
    return Object.keys(SECTOR_VARIANTS).find(function(canonical){
      return [canonical].concat(SECTOR_VARIANTS[canonical]).some(function(variant){
        return normalizeSector(variant)===normalizedName;
      });
    })||String(name||'').trim();
  }
  function sectorNames(name) {
    return [name].concat(SECTOR_VARIANTS[name]||[]).map(normalizeSector);
  }
  function dateOf(s) { var d = s ? new Date(s) : null; return d && !isNaN(d) ? d : null; }
  function shortDate(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function longDate(d) { return d.getDate() + ' de ' + MONTHS_LONG[d.getMonth()] + ' de ' + d.getFullYear(); }
  function duration(h) {
    if (!isFinite(h)) return '—';
    if (h < 1) return Math.round(h * 60) + ' min';
    if (h < 48) return Math.round(h) + ' h';
    return Math.round(h / 24) + ' dias';
  }
  function median(values) {
    if (!values.length) return 0;
    var a = values.slice().sort(function (x,y) { return x-y; }), m = Math.floor(a.length/2);
    return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
  }
  function dayLabel(i) { return ['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'][i]; }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2300);
  }
  function rise(i, html) { return '<div class="rise" style="--d:' + i + '">' + html + '</div>'; }

  function summarize(items, sector) {
    var valid = items.map(function (r) {
      return { r:r, created:dateOf(r.criadoEm), finished:dateOf(r.finalizadoEm), hours:Number(r.horasAteConcluir) };
    }).filter(function (x) { return x.created; });
    var total = valid.length;
    var categories = {}, units = {}, types = { sistema:0, infra:0, gov:0, other:0 };
    var months = {}, hours = Array(24).fill(0), days = Array(7).fill(0), durations = [];
    var dates = {}, outside = 0, earliest = null, latest = null;
    valid.forEach(function (x) {
      var r = x.r, cat = (r.categoria || 'Sem categoria').trim() || 'Sem categoria';
      categories[cat] = (categories[cat] || 0) + 1;
      var unit = (r.unidade || 'Não informada').trim();
      units[unit] = (units[unit] || 0) + 1;
      var td = String(r.tipoDemanda || '');
      if (/sistema/i.test(td)) types.sistema++;
      else if (/infra/i.test(td)) types.infra++;
      else if (/gov|governança/i.test(td)) types.gov++;
      else types.other++;
      var key = x.created.getFullYear() + '-' + String(x.created.getMonth()+1).padStart(2,'0');
      months[key] = (months[key] || 0) + 1;
      hours[x.created.getHours()]++;
      var dow = (x.created.getDay() + 6) % 7;
      days[dow]++;
      var dayKey = x.created.getFullYear() + '-' + String(x.created.getMonth()+1).padStart(2,'0') + '-' + String(x.created.getDate()).padStart(2,'0');
      dates[dayKey] = (dates[dayKey] || 0) + 1;
      if (x.created.getDay() === 0 || x.created.getDay() === 6 || x.created.getHours() < 7 || x.created.getHours() >= 19) outside++;
      if (!earliest || x.created < earliest) earliest = x.created;
      if (!latest || x.created > latest) latest = x.created;
      if (isFinite(x.hours) && x.hours >= 0) durations.push(x.hours);
    });
    var cats = Object.keys(categories).map(function (name) { return {nome:name,qtd:categories[name]}; }).sort(function(a,b){return b.qtd-a.qtd;});
    var unitList = Object.keys(units).map(function (name) { return {nome:name,qtd:units[name]}; }).sort(function(a,b){return b.qtd-a.qtd;});
    var monthly = Object.keys(months).sort().map(function (key) { return {mes:key,abertos:months[key]}; });
    var peakMonth = monthly.reduce(function (a,b) { return !a || b.abertos > a.abertos ? b : a; }, null);
    var peakDate = Object.keys(dates).map(function(key){return {date:key,qtd:dates[key]};}).sort(function(a,b){return b.qtd-a.qtd;})[0] || null;
    var maxHour = hours.indexOf(Math.max.apply(null,hours));
    var maxDay = days.indexOf(Math.max.apply(null,days));
    var fastest = durations.length ? Math.min.apply(null,durations) : null;
    var sameDay = durations.length ? durations.filter(function(v){return v < 24;}).length / durations.length * 100 : 0;
    var upToHour = durations.length ? durations.filter(function(v){return v <= 1;}).length / durations.length * 100 : 0;
    var upToWeek = durations.length ? durations.filter(function(v){return v <= 168;}).length / durations.length * 100 : 0;
    var maxDuration = durations.length ? Math.max.apply(null,durations) : null;
    var totalDays = earliest && latest ? Math.max(1, Math.round((latest-earliest)/86400000)+1) : 1;
    return {
      sector:sector, total:total, inicio:earliest, fim:latest, categorias:cats, unidades:unitList,
      tipos:types, mensal:monthly, hora:hours, diaSemana:days, maxHora:maxHour, maxDia:maxDay,
      mediana:median(durations), media:durations.length ? durations.reduce(function(a,b){return a+b;},0)/durations.length : 0,
      pctMesmoDia:sameDay, pctAte1h:upToHour, pctAte7d:upToWeek, foraExpediente:outside,
      picoMes:peakMonth, picoDia:peakDate, maisRapido:fastest, maisLongo:maxDuration,
      semanas:Math.max(1, totalDays/7), porSemana:total/(totalDays/7),
      classified:types.sistema+types.infra+types.gov, semClassificacao:types.other,
      durationCount:durations.length
    };
  }

  function ranking(items, max) {
    if (!items.length) return '<p class="fine">Não há dados suficientes para este indicador.</p>';
    return '<ol class="rank">' + items.map(function(it,i){
      return '<li class="rise" style="--d:'+(i+2)+'"><span class="n">'+(i+1)+'</span><span class="lb">'+esc(it.nome)+'</span><span class="v">'+n(it.qtd)+'</span><span class="bar"><i style="--w:'+(max ? it.qtd/max*100 : 0).toFixed(1)+'%;--d:'+i+'"></i></span></li>';
    }).join('') + '</ol>';
  }

  function buildSlides(d) {
    var top = d.categorias.slice(0,5), units = d.unidades.slice(0,5);
    var typeEntries = [{nome:'Sistema',qtd:d.tipos.sistema},{nome:'Infraestrutura',qtd:d.tipos.infra},{nome:'Governança',qtd:d.tipos.gov},{nome:'Sem classificação',qtd:d.tipos.other}];
    var mainType = typeEntries.slice().sort(function(a,b){return b.qtd-a.qtd;})[0];
    var maxMonth = Math.max(1, ...d.mensal.map(function(m){return m.abertos;}));
    var peakDate = d.picoDia ? dateOf(d.picoDia.date + 'T12:00:00') : null;
    var monthlyBars = d.mensal.map(function(m,i){
      var mo = Number(m.mes.slice(5)), yr = m.mes.slice(2,4);
      var label = (i % Math.max(1,Math.ceil(d.mensal.length/6)) === 0 || i === d.mensal.length-1) ? MONTHS[mo-1]+'/'+yr : '';
      return '<div class="col"><i style="--h:'+(m.abertos/maxMonth*100).toFixed(1)+'%;--i:'+i+'"></i><span>'+label+'</span></div>';
    }).join('');
    var hourMax = Math.max(1, ...d.hora);
    var hourBars = d.hora.slice(6,22).map(function(v,i){
      var h=i+6; return '<div class="col '+(h===d.maxHora?'peak':'')+'"><i style="--h:'+(v/hourMax*100).toFixed(1)+'%;--i:'+i+'"></i><span>'+h+'h</span></div>';
    }).join('');
    var totalLead = d.durationCount ? (Math.round(d.pctMesmoDia)+'% dos chamados com tempo registrado foram concluídos em menos de 24 horas.') : 'Não há tempos de conclusão válidos suficientes para calcular este indicador.';
    var slides = [
      {theme:'t-lime', html:function(){
        return rise(0,'<p class="kicker">Retrospectiva · Setor</p>')+
          rise(1,'<h1 class="title" style="font-size:12cqw">'+esc(d.sector)+'</h1>')+
          rise(2,'<p class="lead">Os chamados deste setor entre <b>'+ (d.inicio?shortDate(d.inicio):'período não identificado') +'</b> e <b>'+(d.fim?shortDate(d.fim):'período não identificado')+'</b>.</p>')+
          rise(3,'<p class="fine">Toque para avançar →</p>');
      }},
      {theme:'t-cyan',html:function(){
        return rise(0,'<p class="kicker">No total</p>')+
          rise(1,'<div class="mega" data-count="'+d.total+'">0</div>')+
          rise(2,'<h2 class="title">chamados <em>registrados</em></h2>')+
          rise(3,'<p class="lead">Foram identificados <b>'+d.total+'</b> registros concluídos ou com data de encerramento, associados a este setor.</p>');
      }},
      {theme:'t-coral',html:function(){
        return rise(0,'<p class="kicker">Principais demandas</p>')+
          rise(1,'<h2 class="title"><em>'+(top[0]?esc(top[0].nome):'Sem categoria')+'</em> é a categoria mais frequente.</h2>')+
          ranking(top,top[0]?top[0].qtd:1)+
          rise(8,'<p class="fine">Classificação baseada no campo “categoria” dos registros.</p>');
      }},
      {theme:'t-amber',html:function(){
        return rise(0,'<p class="kicker">Tipo de demanda</p>')+
          rise(1,'<h2 class="title"><em>'+esc(mainType.nome)+'</em> representa '+pct(mainType.qtd,d.total)+'% dos registros classificados.</h2>')+
          ranking(typeEntries.filter(function(x){return x.qtd>0;}),Math.max(1,mainType.qtd))+
          rise(7,'<p class="fine">'+n(d.semClassificacao)+' registros não possuem classificação reconhecida no campo tipo de demanda.</p>');
      }},
      {theme:'t-lime',html:function(){
        return rise(0,'<p class="kicker">Tempo de resolução</p>')+
          (d.durationCount ? rise(1,'<div class="mega md"><span data-count="'+Math.round(d.pctMesmoDia)+'">0</span><small>%</small></div>') : rise(1,'<div class="mega md">—</div>'))+
          rise(2,'<h2 class="title">concluídos em <em>menos de 24 horas</em>.</h2>')+
          '<div class="chips">'+
          '<div class="chip rise" style="--d:3"><b>'+(d.durationCount?Math.round(d.pctAte1h)+'%':'—')+'</b><span>em até 1 hora</span></div>'+
          '<div class="chip rise" style="--d:4"><b>'+(d.durationCount?Math.round(d.pctAte7d)+'%':'—')+'</b><span>em até 7 dias</span></div>'+
          '<div class="chip wide rise" style="--d:5"><b>'+(d.durationCount?duration(d.mediana):'—')+'</b><span>tempo mediano de resolução · '+n(d.durationCount)+' registros com duração válida</span></div></div>'+
          rise(6,'<p class="fine">'+totalLead+'</p>');
      }},
      {theme:'t-violet',html:function(){
        return rise(0,'<p class="kicker">Evolução mensal</p>')+
          rise(1,'<h2 class="title">O mês de maior volume foi <em>'+(d.picoMes?MONTHS_LONG[Number(d.picoMes.mes.slice(5))-1]+' de '+d.picoMes.mes.slice(0,4):'—')+'</em>.</h2>')+
          (d.mensal.length?rise(2,'<div class="chart">'+monthlyBars+'</div>'):rise(2,'<p class="fine">Não há datas suficientes para montar a evolução mensal.</p>'))+
          rise(3,'<p class="lead">Média de <b>'+n(d.porSemana)+'</b> chamados registrados por semana no período analisado.</p>');
      }},
      {theme:'t-cyan',html:function(){
        return rise(0,'<p class="kicker">Quando a demanda aparece</p>')+
          rise(1,'<h2 class="title">O pico acontece às <em>'+d.maxHora+'h</em>.</h2>')+
          rise(2,'<div class="chart hours">'+hourBars+'</div>')+
          rise(3,'<p class="lead"><b>'+dayLabel(d.maxDia)+'</b> concentra o maior volume, com <b>'+n(d.diaSemana[d.maxDia])+'</b> registros.</p>');
      }},
      {theme:'t-mint',html:function(){
        var stack = units.map(function(x,i){return '<i style="--w:'+(x.qtd/d.total*100).toFixed(2)+'%;--c:'+COLORS[i%COLORS.length]+';--i:'+i+'"></i>';}).join('');
        var legend = units.map(function(x,i){return '<li style="--c:'+COLORS[i%COLORS.length]+'"><i></i><span style="color:var(--paper)">'+esc(x.nome)+'</span><b>'+n(x.qtd)+' <span>· '+pct(x.qtd,d.total)+'%</span></b></li>';}).join('');
        return rise(0,'<p class="kicker">Distribuição por unidade</p>')+
          rise(1,'<h2 class="title"><em>'+(units[0]?pct(units[0].qtd,d.total):0)+'%</em> dos registros vieram de '+(units[0]?esc(units[0].nome):'unidade não identificada')+'.</h2>')+
          (units.length?rise(2,'<div class="stack">'+stack+'</div><ul class="legend">'+legend+'</ul>'):rise(2,'<p class="fine">Não há unidades identificadas nos registros.</p>'));
      }},
      {theme:'t-rose',html:function(){
        return rise(0,'<p class="kicker">Destaques do período</p>')+
          rise(1,'<h2 class="title">Alguns números que contam a <em>história</em> do setor.</h2>')+
          '<ul class="facts">'+
          rise(2,'<li><b>'+(d.picoDia?n(d.picoDia.qtd)+' chamados':'—')+'</b><span>maior volume em um único dia'+(peakDate?', em '+longDate(peakDate):'')+'.</span></li>')+
          rise(3,'<li><b>'+(d.maisRapido!=null?duration(d.maisRapido):'—')+'</b><span>menor tempo de conclusão registrado.</span></li>')+
          rise(4,'<li><b>'+(d.maisLongo!=null?duration(d.maisLongo):'—')+'</b><span>maior tempo de conclusão registrado.</span></li>')+
          rise(5,'<li><b>'+n(d.foraExpediente)+'</b><span>chamados registrados em fins de semana ou fora do horário comercial (antes das 7h ou a partir das 19h).</span></li>')+
          '</ul>';
      }},
      {theme:'t-lime',final:true,html:function(){
        return '<div class="card-wrap rise" style="--d:0"><canvas id="cardCanvas" width="1080" height="1920" aria-label="Resumo da retrospectiva do setor"></canvas></div>'+
          '<div class="actions rise" style="--d:2"><button class="btn" id="btnDownload" type="button">⬇ Baixar imagem</button><button class="btn ghost" id="btnShare" type="button">↗ Compartilhar vídeo</button><button class="replay" id="btnReplay" type="button">↺ Rever do início</button></div>';
      }}
    ];
    return slides;
  }

  var FONT_D = '"Bricolage Grotesque", "Arial Black", Impact, sans-serif';
  var FONT_B = '"DM Sans", system-ui, "Segoe UI", sans-serif';
  function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function drawCard(canvas) {
    var d=currentData, ctx=canvas.getContext('2d'), W=1080,H=1920,M=84,ACC='#c8ff3d',PAPER='#f4f1ea',MUT='rgba(244,241,234,.62)';
    canvas.width=W;canvas.height=H;ctx.fillStyle='#10140a';ctx.fillRect(0,0,W,H);
    var g=ctx.createRadialGradient(W,0,0,W,0,1300);g.addColorStop(0,'rgba(95,140,14,.75)');g.addColorStop(1,'rgba(16,20,10,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle=ACC;ctx.beginPath();ctx.arc(M+10,112,10,0,7);ctx.fill();
    ctx.font='700 30px '+FONT_B;ctx.fillStyle=PAPER;ctx.fillText('GI · SETORES',M+34,123);
    ctx.textAlign='right';ctx.fillStyle=ACC;ctx.font='700 25px '+FONT_B;ctx.fillText('RETROSPECTIVA',W-M,123);ctx.textAlign='left';
    ctx.font='800 110px '+FONT_D;ctx.fillStyle=ACC;
    var name=d.sector, size=110;while(ctx.measureText(name).width>W-M*2&&size>48){size-=4;ctx.font='800 '+size+'px '+FONT_D;}
    ctx.fillText(name,M,350);
    ctx.font='800 250px '+FONT_D;ctx.fillText(n(d.total),M,650);
    ctx.font='800 68px '+FONT_D;ctx.fillStyle=PAPER;ctx.fillText('chamados registrados',M,735);
    ctx.font='500 32px '+FONT_B;ctx.fillStyle=MUT;ctx.fillText((d.inicio?shortDate(d.inicio):'')+' → '+(d.fim?shortDate(d.fim):''),M,790);
    var tiles=[[d.durationCount?Math.round(d.pctMesmoDia)+'%':'—','resolvidos em menos de 24h'],[duration(d.mediana),'tempo mediano'],[d.categorias[0]?d.categorias[0].nome:'—','categoria mais frequente'],[d.picoMes?MONTHS_LONG[Number(d.picoMes.mes.slice(5))-1]:'—','mês de maior volume']];
    var tw=(W-M*2-24)/2,th=205,ty=900;
    tiles.forEach(function(t,i){var x=M+(i%2)*(tw+24),y=ty+Math.floor(i/2)*(th+24);rounded(ctx,x,y,tw,th,26);ctx.fillStyle='rgba(244,241,234,.07)';ctx.fill();ctx.strokeStyle='rgba(244,241,234,.14)';ctx.stroke();ctx.font='800 58px '+FONT_D;ctx.fillStyle=PAPER;ctx.fillText(String(t[0]).slice(0,25),x+28,y+92,tw-56);ctx.font='500 27px '+FONT_B;ctx.fillStyle=MUT;ctx.fillText(t[1],x+28,y+150,tw-56);});
    ctx.font='700 26px '+FONT_B;ctx.fillStyle=ACC;ctx.fillText('CHAMADOS REGISTRADOS POR MÊS',M,1430);
    var max=Math.max(1,...d.mensal.map(function(m){return m.abertos;})),cw=W-M*2,bw=cw/Math.max(1,d.mensal.length),chartH=250;
    d.mensal.forEach(function(m,i){var h=Math.max(5,m.abertos/max*chartH),x=M+i*bw+3;rounded(ctx,x,1470+chartH-h,bw-6,h,5);ctx.fillStyle='rgba(244,241,234,.35)';ctx.fill();});
    ctx.fillStyle='rgba(244,241,234,.14)';ctx.fillRect(M,1780,W-M*2,2);
    ctx.font='500 30px '+FONT_B;ctx.fillStyle=PAPER;ctx.fillText(n(d.unidades.length)+' unidades identificadas · '+n(d.durationCount)+' tempos válidos',M,1840);
    ctx.font='500 27px '+FONT_B;ctx.fillStyle=MUT;ctx.fillText('Retrospectiva de chamados · GI',M,1885);
  }
  function cardBlob() {
    var c=document.createElement('canvas');
    return Promise.resolve().then(function(){drawCard(c);return new Promise(function(resolve){c.toBlob(resolve,'image/png');});});
  }
  function filename(){return 'retrospectiva-'+currentSector.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.png';}
  function shareText(){var d=currentData;return 'Retrospectiva '+d.sector+': '+n(d.total)+' chamados registrados no período de '+(d.inicio?shortDate(d.inicio):'')+' a '+(d.fim?shortDate(d.fim):'')+'.';}
  function download(){return cardBlob().then(function(blob){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename();document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},4000);toast('Imagem baixada');});}
  function downloadVideoFile(video){
    var url=URL.createObjectURL(video.blob),a=document.createElement('a');
    a.href=url;a.download=video.filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},10000);
    toast('Vídeo gerado: '+video.filename);
  }
  function share(){
    var wasPaused=paused;
    if(!wasPaused)setPaused(true);
    toast('Preparando vídeo da retrospectiva…');
    return window.GIVideoExport.create([].slice.call(stage.children),frame,filename().replace(/\.png$/i,''),function(message){toast(message);})
      .then(function(video){
        var f=new File([video.blob],video.filename,{type:video.blob.type});
        if(navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})){
          return navigator.share({files:[f],title:'Retrospectiva '+currentSector,text:shareText()}).catch(function(e){
            if(e&&e.name==='AbortError')return;
            downloadVideoFile(video);toast('Não foi possível abrir o compartilhamento. O vídeo foi baixado.');
          });
        }
        downloadVideoFile(video);
        window.open('https://wa.me/?text='+encodeURIComponent(shareText()+' O vídeo foi salvo no dispositivo para anexar à conversa.'),'_blank','noopener');
      })
      .catch(function(error){toast(error&&error.message?error.message:'Não foi possível gerar o vídeo.');})
      .then(function(result){if(!wasPaused)setPaused(false);return result;},function(error){if(!wasPaused)setPaused(false);throw error;});
  }

  function countUp(root){[].forEach.call(root.querySelectorAll('[data-count]'),function(el){var to=+el.getAttribute('data-count');if(REDUCED){el.textContent=n(to);return;}var start=performance.now(),dur=1100;(function tick(t){var p=Math.min(1,(t-start)/dur),e=1-Math.pow(1-p,3);el.textContent=n(Math.round(to*e));if(p<1&&root.classList.contains('active'))requestAnimationFrame(tick);else el.textContent=n(to);})(start);});}
  function schedule(ms){clearTimeout(timer);if(paused||slides[cur].final)return;startedAt=Date.now();remaining=ms;timer=setTimeout(function(){go(cur+1);},ms);}
  function bindFinal(){if(finalBound)return;finalBound=true;document.getElementById('btnDownload').addEventListener('click',download);document.getElementById('btnShare').addEventListener('click',share);document.getElementById('btnReplay').addEventListener('click',function(){go(0);});}
  function go(i){
    if(i<0)i=0;if(i>=slides.length)i=slides.length-1;if(i===cur)return;cur=i;
    var els=[].slice.call(stage.children),segs=[].slice.call(progress.children);
    els.forEach(function(el,k){var on=k===i;el.classList.toggle('active',on);el.setAttribute('aria-hidden',on?'false':'true');});
    segs.forEach(function(s,k){s.classList.toggle('done',k<i||(k===i&&slides[i].final));s.classList.remove('live');if(k===i&&!slides[i].final){void s.offsetWidth;s.classList.add('live');}});
    frame.classList.toggle('is-final',!!slides[i].final);
    frame.style.setProperty('--accent',getComputedStyle(els[i]).getPropertyValue('--accent').trim());
    countUp(els[i]);if(slides[i].final){drawCard(document.getElementById('cardCanvas'));bindFinal();}
    remaining=SLIDE_MS;schedule(SLIDE_MS);
  }
  function setPaused(p){if(p===paused)return;paused=p;frame.classList.toggle('paused',p);pauseIcon.setAttribute('d',p?'M8 5v14l11-7z':'M7 5h4v14H7zM13 5h4v14h-4z');document.getElementById('btnPause').setAttribute('aria-label',p?'Continuar':'Pausar');if(p){clearTimeout(timer);remaining=Math.max(400,remaining-(Date.now()-startedAt));}else schedule(remaining);}

  function openSector(name){
    currentSector=name;
    var acceptedNames=sectorNames(name);
    var items=records.filter(function(r){return acceptedNames.indexOf(normalizeSector(r.setor))!==-1;});
    if(!items.length)return false;
    currentData=summarize(items,name);slides=buildSlides(currentData);cur=-1;paused=REDUCED;remaining=SLIDE_MS;finalBound=false;
    selector.hidden=true;presentation.hidden=false;document.body.classList.add('showing-slides');
    document.getElementById('brandLabel').textContent=name.length>18?name.slice(0,17)+'…':name;
    stage.innerHTML=slides.map(function(s,i){return '<article class="slide '+s.theme+(s.final?' final':'')+'" data-i="'+i+'" aria-hidden="true">'+s.html()+'</article>';}).join('');
    progress.innerHTML=slides.map(function(){return '<span class="seg"><i></i></span>';}).join('');
    frame.classList.toggle('paused',paused);go(0);
    return true;
  }
  function renderSectorCards(query){
    var list=records.reduce(function(acc,r){
      var sourceName=String(r.setor||'').trim();
      var name=canonicalSector(sourceName);
      if(name&&name!=='Gestão da Informação'){acc[name]=(acc[name]||0)+1;}
      return acc;
    },{});
    var sectors=Object.keys(list).map(function(name){return {name:name,total:list[name]};}).sort(function(a,b){return b.total-a.total||a.name.localeCompare(b.name,'pt-BR');});
    var filtered=sectors.filter(function(s){return s.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));});
    document.getElementById('sectorCount').textContent=sectors.length+' setores disponíveis';
    document.getElementById('sectorGrid').innerHTML=filtered.length?filtered.map(function(s,i){
      return '<button class="sector-card" type="button" data-sector="'+esc(s.name)+'"><span class="card-index">SETOR '+String(i+1).padStart(2,'0')+'</span><strong>'+esc(s.name)+'</strong><span class="card-bottom"><span>Registros no período</span><b>'+n(s.total)+'</b><span class="arrow">↗</span></span></button>';
    }).join(''):'<div class="empty-state">Nenhum setor encontrado. Tente outro termo.</div>';
    [].forEach.call(document.querySelectorAll('[data-sector]'),function(btn){btn.addEventListener('click',function(){openSector(btn.getAttribute('data-sector'));});});
  }

  document.getElementById('sectorSearch').addEventListener('input',function(){renderSectorCards(this.value);});
  document.getElementById('zoneNext').addEventListener('click',function(){go(cur+1);});
  document.getElementById('zonePrev').addEventListener('click',function(){go(cur-1);});
  document.getElementById('btnPause').addEventListener('click',function(){setPaused(!paused);});
  document.getElementById('btnDownloadTop').addEventListener('click',download);
  document.getElementById('btnShareTop').addEventListener('click',share);
  document.addEventListener('keydown',function(e){
    if(presentation.hidden)return;
    if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();go(cur+1);}
    else if(e.key==='ArrowLeft')go(cur-1);
    else if(e.key==='Home')go(0);
    else if(e.key==='End')go(slides.length-1);
    else if(e.key.toLowerCase()==='p')setPaused(!paused);
  });
  var holdT,sx=0,held=false;
  frame.addEventListener('pointerdown',function(e){sx=e.clientX;held=false;if(e.target.closest('button:not(.zone)'))return;holdT=setTimeout(function(){held=true;if(!paused){frame.dataset.hold='1';setPaused(true);}},260);});
  function release(e){clearTimeout(holdT);if(frame.dataset.hold){delete frame.dataset.hold;setPaused(false);}if(e&&e.type==='pointerup'&&Math.abs(e.clientX-sx)>60){held=true;go(cur+(e.clientX<sx?1:-1));}}
  frame.addEventListener('pointerup',release);frame.addEventListener('pointercancel',release);
  frame.addEventListener('click',function(e){if(held){e.stopPropagation();e.preventDefault();held=false;}},true);
  document.addEventListener('visibilitychange',function(){if(document.hidden&&!paused&&!presentation.hidden)setPaused(true);});

  Promise.resolve().then(function(){
    var imported=localStorage.getItem('gi_pipefy_records');
    if(imported){return JSON.parse(imported);}
    return fetch('chamados.json').then(function(response){if(!response.ok)throw new Error('Não foi possível carregar chamados.json');return response.json();});
  }).then(function(data){
    records=Array.isArray(data)?data:[];
    var dates=records.map(function(r){return dateOf(r.criadoEm);}).filter(Boolean).sort(function(a,b){return a-b;});
    document.getElementById('periodLabel').textContent=dates.length?'Período dos registros: '+shortDate(dates[0])+' → '+shortDate(dates[dates.length-1]):'Período não identificado';
    renderSectorCards('');
    var requestedSector = new URLSearchParams(window.location.search).get('setor');
    if (requestedSector) {
      var requestedCanonicalSector=canonicalSector(requestedSector);
      if(!openSector(requestedCanonicalSector)){
        var emptyState=document.createElement('div');
        emptyState.className='empty-state';
        emptyState.textContent='Ainda não há chamados disponíveis para o setor '+requestedCanonicalSector+'.';
        document.getElementById('sectorGrid').textContent='';
        document.getElementById('sectorGrid').appendChild(emptyState);
        document.getElementById('sectorCount').textContent='Dados indisponíveis para este setor';
      }
    }
  }).catch(function(error){
    document.getElementById('sectorGrid').innerHTML='<div class="empty-state">Não foi possível carregar os dados. Execute a aplicação por um servidor local e confirme se <strong>chamados.json</strong> está na mesma pasta de setores.html.<br><small>'+esc(error.message)+'</small></div>';
    document.getElementById('sectorCount').textContent='Dados indisponíveis';
  });
})();
