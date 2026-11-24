(function(){
'use strict';
var navButtons=[].slice.call(document.querySelectorAll('[data-view]'));
var home=document.getElementById('home'), moduleView=document.getElementById('module'), qrView=document.getElementById('qrcode');
var frame=document.getElementById('moduleFrame'), title=document.getElementById('moduleTitle');
var titles={printers:'Retrospectiva de impressoras',pipefy:'Retrospectiva de demandas Pipefy',sectors:'Retrospectivas por setor'};
var paths={printers:'impressoras/index.html',pipefy:'pipefy/index.html',sectors:'pipefy/setores.html'};
function openView(view){
  if(view==='home'){home.hidden=false;moduleView.hidden=true;qrView.hidden=true;frame.src='about:blank';}
  else if(view==='qrcode'){home.hidden=true;moduleView.hidden=true;qrView.hidden=false;frame.src='about:blank';}
  else {home.hidden=true;moduleView.hidden=false;qrView.hidden=true;title.textContent=titles[view]||'Retrospectiva';frame.src=paths[view]||'about:blank';}
  navButtons.forEach(function(b){b.classList.toggle('active',b.dataset.view===view);});
  window.scrollTo(0,0);
}
navButtons.forEach(function(b){b.addEventListener('click',function(){openView(b.dataset.view);});});
document.getElementById('backHome').addEventListener('click',function(){openView('home');});
function parseDate(v){
 if(v instanceof Date && !isNaN(v))return v;
 if(typeof v==='number' && window.XLSX && XLSX.SSF)return XLSX.SSF.parse_date_code(v)?new Date(Date.UTC(1899,11,30)+v*86400000):null;
 if(v==null||v==='')return null;
 var d=new Date(v);return isNaN(d)?null:d;
}
function iso(d){return d?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0'):'';}
function median(a){if(!a.length)return 0;a=a.slice().sort(function(x,y){return x-y});var m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function buildSummary(records){
 var valid=records.filter(function(r){return r.criadoEm;});
 var dates=valid.map(function(r){return new Date(r.criadoEm)}).filter(function(d){return !isNaN(d)}).sort(function(a,b){return a-b});
 var cats={},sectors={},units={},requesters={},months={},hours=Array(24).fill(0),week=Array(7).fill(0),dur=[];
 var types={sistema:0,infra:0,gov:0,semClassificacao:0},years={},peak={data:'',qtd:0};
 valid.forEach(function(r){
  var d=new Date(r.criadoEm),cat=r.categoria||'Sem categoria',s=r.setor||'Não informado',u=r.unidade||'Não informada',p=r.solicitante||'Não informado';
  cats[cat]=(cats[cat]||0)+1;if(s!=='GI | TI')sectors[s]=(sectors[s]||0)+1;units[u]=(units[u]||0)+1;requesters[p]=(requesters[p]||0)+1;
  var td=r.tipoDemanda||'';if(/sistema/i.test(td))types.sistema++;else if(/infra/i.test(td))types.infra++;else if(/gov|governança/i.test(td))types.gov++;else types.semClassificacao++;
  var mk=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');months[mk]=(months[mk]||0)+1;hours[d.getHours()]++;week[(d.getDay()+6)%7]++;
  var y=String(d.getFullYear());years[y]=(years[y]||0)+1;
  var day=d.toISOString().slice(0,10);if((peak.qtd||0)<1)peak.data=day;var dayCounts=buildSummary.dayCounts||(buildSummary.dayCounts={});dayCounts[day]=(dayCounts[day]||0)+1;if(dayCounts[day]>peak.qtd)peak={data:day,qtd:dayCounts[day]};
  if(r.finalizadoEm){var h=(new Date(r.finalizadoEm)-d)/3600000;if(isFinite(h)&&h>=0)dur.push(h);}
 });
 buildSummary.dayCounts=null;
 var arr=function(o){return Object.keys(o).map(function(k){return {nome:k,qtd:o[k]}}).sort(function(a,b){return b.qtd-a.qtd})};
 var monthly=Object.keys(months).sort().map(function(k){return {mes:k,abertos:months[k],concluidos:months[k]}});
 var totalDays=dates.length?Math.max(1,Math.round((dates[dates.length-1]-dates[0])/86400000)+1):1;
 var tiposCount=types.sistema+types.infra+types.gov;
 return {
  periodo:{inicio:dates.length?dates[0].toISOString().slice(0,10):'',fim:dates.length?dates[dates.length-1].toISOString().slice(0,10):'',geradoEm:new Date().toISOString().slice(0,10)},
  total:valid.length,anos:years,nSetores:Object.keys(sectors).length,nSolicitantes:Object.keys(requesters).length,
  tipos:types,categorias:arr(cats),setores:arr(sectors),internoGI:records.filter(function(r){return /GI\\s*[|·]\\s*TI/i.test(r.setor||'')}).length,
  solicitantes:arr(requesters).slice(0,5),mensal:monthly,hora:hours,diaSemana:week,diaPico:peak,
  tempo:{medianaH:median(dur),mediaH:dur.length?dur.reduce(function(a,b){return a+b},0)/dur.length:0,pctAte1h:dur.length?dur.filter(function(x){return x<=1}).length/dur.length*100:0,pctMesmoDia:dur.length?dur.filter(function(x){return x<24}).length/dur.length*100:0,pctAte7d:dur.length?dur.filter(function(x){return x<=168}).length/dur.length*100:0,pctMais30d:dur.length?dur.filter(function(x){return x>720}).length/dur.length*100:0},
  unidades:arr(units),curiosidades:{maisRapidoSeg:0,maisRapidoProb:'',maisRapidoSetor:'',maisLongoDias:dur.length?Math.max.apply(null,dur)/24:0,maisLongoProb:'',fimDeSemana:week[5]+week[6],foraHorario:0,foraExpediente:0}
 };
}
function normalizeRows(rows){
 return rows.map(function(r){
  var created=parseDate(r['Criado em']),finished=parseDate(r['Finalizado em']);
  var problem=String(r['Onde está o Problema']||'').trim();
  return {solicitante:String(r['Solicitante']||'').trim(),setor:String(r['Setor']||'').trim(),unidade:String(r['Unidade de Negócio']||'').trim(),problema:problem,categoria:problem||'Sem categoria',tipoDemanda:String(r['ETQ- Tipo de Demanda']||r['ETQ - Tipo de Demanda']||'').trim(),criadoEm:iso(created),finalizadoEm:iso(finished),horasAteConcluir:created&&finished?(finished-created)/3600000:null};
 }).filter(function(r){return r.criadoEm;});
}
document.getElementById('xlsxFile').addEventListener('change',function(e){
 var file=e.target.files&&e.target.files[0];if(!file)return;
 var status=document.getElementById('importStatus');status.textContent='Lendo a planilha...';
 if(!window.XLSX){status.textContent='Não foi possível carregar o leitor Excel. Verifique sua conexão e tente novamente.';return;}
 var reader=new FileReader();
 reader.onload=function(evt){try{
  var wb=XLSX.read(evt.target.result,{type:'array',cellDates:true});
  var sheet=wb.Sheets['Report']||wb.Sheets[wb.SheetNames.find(function(n){return /report/i.test(n)})];
  if(!sheet)throw new Error('A planilha precisa conter uma aba chamada Report.');
  var raw=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:true});
  if(!raw.length)throw new Error('A aba Report não contém registros.');
  var records=normalizeRows(raw);if(!records.length)throw new Error('Nenhum registro com data de criação válida foi encontrado.');
  var summary=buildSummary(records);
  localStorage.setItem('gi_pipefy_records',JSON.stringify(records));
  localStorage.setItem('gi_pipefy_dados',JSON.stringify(summary));
  status.textContent='Importação concluída: '+records.length.toLocaleString('pt-BR')+' registros. Abra novamente o módulo Pipefy ou Por setor para visualizar a base atualizada.';
 }catch(err){status.textContent='Falha na importação: '+err.message;}};
 reader.onerror=function(){status.textContent='Não foi possível ler o arquivo selecionado.';};
 reader.readAsArrayBuffer(file);
});

// Gerador de QR Code para a página pública de identificação dos colaboradores.
var qrInput=document.getElementById('videoUrl');
var qrButton=document.getElementById('generateQr');
var qrClear=document.getElementById('clearQr');
var qrStatus=document.getElementById('qrStatus');
var qrResult=document.getElementById('qrResult');
var qrCanvas=document.getElementById('qrCanvas');
var qrInstance=null;
var releaseStorageKey='gi_retrospective_release_at';
var releaseForm=document.getElementById('releaseForm');
var releaseDateInput=document.getElementById('releaseDate');
var releaseAdminStatus=document.getElementById('releaseAdminStatus');

function showReleaseAdminStatus(message,type){
  releaseAdminStatus.textContent=message;
  releaseAdminStatus.className='release-admin-status'+(type?' '+type:'');
}
function loadReleaseDate(){
  try{
    var timestamp=Number(localStorage.getItem(releaseStorageKey));
    if(!timestamp||!isFinite(timestamp))return;
    var date=new Date(timestamp);
    releaseDateInput.value=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')+'T'+String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');
    showReleaseAdminStatus('Agendamento atual: '+date.toLocaleString('pt-BR')+'.','success');
  }catch(error){
    showReleaseAdminStatus('Não foi possível ler o agendamento salvo neste navegador.','error');
  }
}
releaseForm.addEventListener('submit',function(event){
  event.preventDefault();
  var timestamp=new Date(releaseDateInput.value).getTime();
  if(!releaseDateInput.value||!isFinite(timestamp)){
    showReleaseAdminStatus('Informe uma data e hora válidas.','error');
    return;
  }
  try{
    localStorage.setItem(releaseStorageKey,String(timestamp));
    showReleaseAdminStatus('Divulgação agendada para '+new Date(timestamp).toLocaleString('pt-BR')+'.','success');
  }catch(error){
    showReleaseAdminStatus('Não foi possível salvar o agendamento neste navegador. Verifique as configurações de armazenamento.','error');
  }
});
document.getElementById('clearRelease').addEventListener('click',function(){
  try{
    localStorage.removeItem(releaseStorageKey);
    releaseDateInput.value='';
    showReleaseAdminStatus('Agendamento removido. A busca pública ficará bloqueada até definir uma nova data.','success');
  }catch(error){
    showReleaseAdminStatus('Não foi possível remover o agendamento salvo neste navegador.','error');
  }
});
loadReleaseDate();

function setQrStatus(message,type){
  qrStatus.textContent=message;
  qrStatus.className='qr-status'+(type?' '+type:'');
}
function getPublicAccessUrl(){
  var configured=String(window.GI_PUBLIC_ACCESS_URL||'').trim();
  if(configured){
    try{
      var parsed=new URL(configured);
      if(parsed.protocol==='https:'||parsed.protocol==='http:')return parsed.href;
    }catch(_){}
    throw new Error('GI_PUBLIC_ACCESS_URL não contém uma URL válida.');
  }
  return new URL('acesso.html',window.location.href).href;
}
function refreshPublicAccessUrl(){
  try{
    qrInput.value=getPublicAccessUrl();
    setQrStatus('Link público preparado. Gere o QR Code para compartilhar.','success');
  }catch(error){
    qrInput.value='';
    setQrStatus(error.message,'error');
  }
}
function generateVideoQr(){
  var value=qrInput.value.trim();
  if(!value){refreshPublicAccessUrl();value=qrInput.value.trim();}
  if(!value){setQrStatus('Não foi possível determinar o endereço público da página.','error');return;}
  if(!window.QRCode){setQrStatus('A biblioteca de QR Code não carregou. Verifique a conexão e atualize a página.','error');return;}
  qrCanvas.innerHTML='';
  qrResult.hidden=false;
  try{
    qrInstance=new QRCode(qrCanvas,{text:value,width:440,height:440,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    document.getElementById('openVideo').href=value;
    setQrStatus('QR Code da página pública gerado. Teste o endereço antes de imprimir.','success');
  }catch(error){
    qrResult.hidden=true;
    setQrStatus('Não foi possível gerar o QR Code: '+error.message,'error');
  }
}
qrButton.addEventListener('click',generateVideoQr);
qrClear.addEventListener('click',function(){
  qrCanvas.innerHTML='';
  qrResult.hidden=true;
  qrInstance=null;
  refreshPublicAccessUrl();
});
document.getElementById('downloadQr').addEventListener('click',function(){
  var image=qrCanvas.querySelector('img');
  var canvas=qrCanvas.querySelector('canvas');
  var source=image?image.src:(canvas?canvas.toDataURL('image/png'):null);
  if(!source){setQrStatus('Gere o QR Code antes de baixar.','error');return;}
  var link=document.createElement('a');
  link.href=source;link.download='qr-code-acesso-retrospectiva.png';
  document.body.appendChild(link);link.click();link.remove();
});
document.getElementById('copyVideoUrl').addEventListener('click',function(){
  var value=qrInput.value.trim();
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(value).then(function(){setQrStatus('Link público copiado.','success');}).catch(function(){setQrStatus('Não foi possível copiar automaticamente. Copie o link do campo.','error');});
  }else{
    qrInput.focus();qrInput.select();
    try{document.execCommand('copy');setQrStatus('Link público copiado.','success');}catch(_){setQrStatus('Copie o link diretamente do campo.','error');}
  }
});
refreshPublicAccessUrl();

})();