/*
 * Aplicação do portal TITAN NFS-e.
 *
 * Estava embutido dentro de titan.html até 19/08/2026 — 382 KB de JavaScript
 * dentro de um HTML de 543 KB. Como era tudo um arquivo só, o navegador não
 * conseguia guardar o código separado do conteúdo: mudar uma vírgula aqui
 * invalidava os 543 KB inteiros para todos os clientes, e mudar um texto do
 * HTML rebaixava os 382 KB junto.
 *
 * Continua sendo script CLÁSSICO, não módulo, e sem defer/async: as funções
 * precisam ficar no escopo global porque a tela chama por onclick="..." no
 * próprio HTML, e a ordem de execução em relação a config.js tem que ser a
 * mesma de antes.
 */
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const brl=n=>n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
/**
 * Achado da auditoria de 11/08/2026: dados externos (ex.: número da NFS-e
 * devolvido pela Sefin) interpolados em onclick="fn('${valor}')" — esc()
 * sozinho não basta aqui, porque não escapa aspas simples, que é o
 * caractere que de fato rompe o argumento de string JS dentro do atributo
 * (mesma classe de bug do caso "Sant'Ana do Livramento", motivo pelo qual o
 * código de município nunca colocou row.name em onclick, só row.code).
 * Escapa primeiro pra virar texto-fonte JS seguro (\\ e '), depois pra
 * virar atributo HTML seguro (reaproveita esc()) — nessa ordem, porque o
 * navegador decodifica o HTML antes do JS ler a string.
 */
const escAttr=value=>esc(String(value??'').replaceAll('\\','\\\\').replaceAll("'","\\'"));
let systemDialogResolve=null;
function titanDialog({title='Aviso do TITAN',subtitle='Mensagem do sistema',label='Mensagem',message='',summary='Confira os detalhes abaixo.',variant='info',mode='alert',okLabel='OK',cancelLabel='Cancelar',defaultValue=''}={}){
  return new Promise(resolve=>{
    const modal=qs('#system-dialog'),text=qs('#system-dialog-text'),input=qs('#system-dialog-input'),cancel=qs('#system-dialog-cancel'),ok=qs('#system-dialog-ok'),copy=qs('#system-dialog-copy'),hint=qs('#system-dialog-copy-hint'),kind=qs('#system-dialog-kind'),messageBox=qs('#system-dialog-message'),actions=qs('#system-dialog-actions'),xClose=qs('#system-dialog-x');
    if(!modal){resolve(mode==='confirm'?false:mode==='prompt'?null:undefined);return}
    if(systemDialogResolve)systemDialogResolve(mode==='confirm'?false:mode==='prompt'?null:undefined);
    systemDialogResolve=resolve;
    qs('#system-dialog-title').textContent=title;qs('#system-dialog-subtitle').textContent=subtitle;qs('#system-dialog-label').textContent=label;qs('#system-dialog-summary').textContent=summary;
    kind.className=`system-dialog-kind a-${variant}`;
    const content=String(message??'').trim();const isAlert=mode==='alert';const detailed=!isAlert&&(mode!=='alert'||content.length>180||content.includes('\n'));
    messageBox.textContent=content||summary;text.value=content;hint.textContent='Você pode selecionar o texto ou usar Copiar.';
    text.style.display=detailed?'block':'none';copy.style.display=detailed?'inline-flex':'none';hint.style.display=detailed?'block':'none';
    input.style.display=mode==='prompt'?'block':'none';input.value=defaultValue||'';input.placeholder='Digite aqui';
    cancel.style.display=isAlert?'none':'inline-flex';cancel.textContent=cancelLabel;ok.textContent=okLabel;
    actions.style.display=isAlert?'none':'flex';xClose.style.display=isAlert?'grid':'none';
    const finish=value=>{modal.classList.remove('on');systemDialogResolve=null;resolve(value)};
    ok.onclick=()=>finish(mode==='confirm'?true:mode==='prompt'?input.value:undefined);
    cancel.onclick=()=>finish(mode==='prompt'?null:false);
    xClose.onclick=()=>finish(undefined);
    copy.onclick=async()=>{const value=mode==='prompt'&&input.value?`${text.value}\n\n${input.value}`:text.value;try{await navigator.clipboard.writeText(value);hint.textContent='Texto copiado.'}catch{hint.textContent='Selecione o campo e copie manualmente.';text.focus();text.select()}};
    modal.onclick=event=>{if(event.target===modal&&isAlert)finish(undefined)};
    modal.classList.add('on');
    window.setTimeout(()=>{if(mode==='prompt')input.focus();else if(!isAlert)ok.focus();else xClose.focus();},40);
  });
}
function titanAlert(message,title='Aviso do TITAN',variant='info'){return titanDialog({title,label:variant==='err'?'Erro':variant==='warn'?'Atenção':'Mensagem',message,variant,okLabel:'Fechar'})}
function titanConfirm(message,title='Confirmar ação',variant='warn'){return titanDialog({title,subtitle:'Confirmação necessária',label:'Revise antes de continuar',message,summary:'A ação só será executada se você confirmar.',variant,mode:'confirm',okLabel:'Confirmar',cancelLabel:'Voltar'})}
function titanPrompt(message,defaultValue='',title='Informar dado'){return titanDialog({title,subtitle:'Entrada necessária',label:'Preencha a informação',message,summary:'O texto pode ser copiado antes de continuar.',variant:'info',mode:'prompt',okLabel:'Continuar',cancelLabel:'Cancelar',defaultValue})}
window.alert=(message)=>{titanAlert(message)};
const API_URL=(window.TITAN_API_URL||'').replace(/\/$/,'');
const STORAGE_TOKEN='titan_nfse_session_v1';
const STORAGE_SESSION='titan_nfse_access_v1';
function normalizarDocumento(value){return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function cnpjComFormatoValido(value){return /^[A-Z0-9]{12}[0-9]{2}$/.test(normalizarDocumento(value))}
function irParaLogoDestino(event){
  if(!sessionStorage.getItem(STORAGE_TOKEN))return true;
  let access={};try{access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}')}catch{}
  event.preventDefault();
  window.top.location.href=access.user?.isMaster?'/admin':'/dashboard';
  return false;
}
const STORAGE_COMPANY_ID='titan_nfse_company_id_v1';
const STORAGE_IMPERSONATING='titan_nfse_impersonating_v1';
// Achado 17/08/2026 (pedido do usuário): mesmo mecanismo de nfs.html —
// primeiro acesso de um dispositivo/navegador novo exige código de 6
// dígitos por e-mail; este token (localStorage) evita repetir depois.
const STORAGE_DEVICE_TRUST='titan_nfse_device_trust_v1';
/**
 * Achado 17/08/2026 (pedido do usuário): o mesmo navegador pode ter uma aba
 * como Master/Parceiro e outra como uma empresa cliente ao mesmo tempo —
 * fácil perder de vista qual aba é qual e agir na empresa errada. Trava por
 * localStorage (compartilhado entre abas, ao contrário do sessionStorage
 * do token/empresa em si, que é isolado por aba) com heartbeat: cada aba
 * "dona" de uma empresa renova o carimbo a cada 5s; uma trava sem renovar
 * há mais de JANELA_TRAVA_EMPRESA_MS é tratada como abandonada (aba
 * fechada) e pode ser assumida por outra aba sem aviso.
 */
const CHAVE_TRAVA_EMPRESA='titan_nfse_trava_empresa_ativa_v1';
const JANELA_TRAVA_EMPRESA_MS=15000;
const ABA_ID=(window.crypto?.randomUUID?crypto.randomUUID():String(Math.random())+'-'+Date.now());
let intervaloTravaEmpresa=null;
function lerTravaEmpresa(){try{return JSON.parse(localStorage.getItem(CHAVE_TRAVA_EMPRESA)||'null')}catch{return null}}
function travarEmpresaAtiva(companyId,companyName){
  if(!companyId)return true;
  const atual=lerTravaEmpresa();
  const travaViva=atual&&(Date.now()-atual.timestamp)<JANELA_TRAVA_EMPRESA_MS;
  if(travaViva&&atual.abaId!==ABA_ID&&atual.empresaId!==companyId){
    titanAlert(`A empresa "${atual.nomeEmpresa||'outra empresa'}" já está em uso em outra aba/janela deste navegador. Feche essa aba, ou troque a empresa de uso nela, antes de continuar aqui.`,'Empresa em uso em outra aba','warn');
    return false;
  }
  localStorage.setItem(CHAVE_TRAVA_EMPRESA,JSON.stringify({empresaId:companyId,nomeEmpresa:companyName||'',abaId:ABA_ID,timestamp:Date.now()}));
  if(!intervaloTravaEmpresa){
    intervaloTravaEmpresa=setInterval(()=>{
      const trava=lerTravaEmpresa();
      if(trava&&trava.abaId===ABA_ID)localStorage.setItem(CHAVE_TRAVA_EMPRESA,JSON.stringify({...trava,timestamp:Date.now()}));
    },5000);
  }
  return true;
}
function liberarTravaEmpresa(){
  const trava=lerTravaEmpresa();
  if(trava&&trava.abaId===ABA_ID)localStorage.removeItem(CHAVE_TRAVA_EMPRESA);
  if(intervaloTravaEmpresa){clearInterval(intervaloTravaEmpresa);intervaloTravaEmpresa=null}
}
// Fechar/recarregar a aba libera a trava na hora, em vez de esperar até
// JANELA_TRAVA_EMPRESA_MS de heartbeat parado pra outra aba poder assumir.
window.addEventListener('beforeunload',liberarTravaEmpresa);
// Achado 13/08/2026: navegador embutido (ex.: abrir o link do convite de
// dentro do WhatsApp/Instagram/Outlook) pode bloquear sessionStorage —
// window.sessionStorage.setItem lança SecurityError "Access is denied for
// this document", e sem isto o erro cru do navegador ia direto pro alert(),
// sem explicar o que realmente aconteceu nem como resolver.
function salvarSessaoLocal(pares){
  try{for(const [chave,valor] of pares)sessionStorage.setItem(chave,valor);return true}
  catch(error){
    if(error?.name==='SecurityError')throw new Error('Seu navegador bloqueou o armazenamento necessário pra manter você logado. Se abriu este link pelo WhatsApp, Instagram ou e-mail, toque em "⋮" ou "Abrir no navegador" e use o Chrome/Safari direto.');
    throw error;
  }
}
const PORTAL_QUERY=new URLSearchParams(location.search);
const PORTAL_PATH=location.pathname.match(/^\/([^/?#]+)\/?$/i)?.[1]||'';
const PORTAL_ROUTE=PORTAL_PATH.toLowerCase().replace(/[^a-z0-9_-]/g,'');
const PORTAL_ROUTE_MODE=PORTAL_ROUTE==='martyn_ia'?'help':PORTAL_ROUTE==='primeiro-acesso'||PORTAL_ROUTE==='primeiroacesso'?'first':PORTAL_ROUTE==='redefinir-senha'||PORTAL_ROUTE==='redefinirsenha'?'reset':PORTAL_ROUTE==='dashboard'?'client':PORTAL_ROUTE;
const PORTAL_MODE=(PORTAL_QUERY.get('portal')||PORTAL_ROUTE_MODE).toLowerCase();
const PORTAL_ADMIN=['admin','adm'].includes(PORTAL_MODE);
const PORTAL_HELP=PORTAL_MODE==='help';
const PORTAL_FIRST=PORTAL_MODE==='first';
const PORTAL_RESET=PORTAL_MODE==='reset';
const PORTAL_CNPJ=normalizarDocumento(PORTAL_QUERY.get('tenant')||(cnpjComFormatoValido(PORTAL_PATH)?PORTAL_PATH:''));
document.body.classList.toggle('portal-admin',PORTAL_ADMIN);
document.body.classList.toggle('portal-help',PORTAL_HELP);
document.body.classList.toggle('portal-first',PORTAL_FIRST);
function redirecionarParaLoginUnico(){
  if(PORTAL_HELP||PORTAL_FIRST||PORTAL_RESET||PORTAL_QUERY.get('invite')||PORTAL_QUERY.get('partner-invite'))return;
  if(sessionStorage.getItem(STORAGE_TOKEN))return;
  if(!PORTAL_ADMIN&&!PORTAL_CNPJ&&PORTAL_MODE!=='client')return;
  const target=new URL('/',location.origin);
  target.searchParams.set('login',PORTAL_ADMIN?'admin':'client');
  if(PORTAL_CNPJ)target.searchParams.set('tenant',PORTAL_CNPJ);
  target.searchParams.set('next',window.top.location.pathname+(window.top.location.search||''));
  window.top.location.replace(target.pathname+target.search);
}
redirecionarParaLoginUnico();
const dataBrasil=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
qs('#s-comp').value=dataBrasil();
let ambienteAtual='restricted';

function atualizarAmbiente(){
  const producao=ambienteAtual==='production';
  const nome=producao?'Produção oficial':'Produção restrita';
  qs('#login-env').textContent=producao?'PRODUÇÃO OFICIAL — emissões têm validade fiscal':'PRODUÇÃO RESTRITA — documentos sem validade fiscal';
  qs('#env').querySelector('.txt').textContent=nome;
  qs('#pipe-env').textContent=nome.toLowerCase();
  if(qs('#emit-hero-env'))qs('#emit-hero-env').textContent=nome;
  qs('#config-env').textContent=producao?'1 — Produção oficial':'2 — Produção Restrita';
  qs('#sefin-host').innerHTML=producao?'sefin.nfse.gov.br':'sefin.producaorestrita<br>.nfse.gov.br';
  etapas[etapas.length-1].d=`resposta síncrona da ${nome}`;
}

async function carregarAmbiente(){
  const response=await fetchSeguro(API_URL+'/health');
  const health=await response.json();
  ambienteAtual=health.environment==='production'?'production':'restricted';
  atualizarAmbiente();
}
carregarAmbiente().catch(()=>{qs('#login-env').textContent='Servidor fiscal indisponível';});

async function fetchSeguro(url,options={},timeoutMs=45000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:options.signal||controller.signal})}
  catch(error){if(error?.name==='AbortError')throw new Error('O servidor fiscal demorou para responder. Aguarde alguns segundos e tente novamente.');throw error}
  finally{clearTimeout(timer)}
}

let buscaPortalView='';
function buscarNoPortal(value){
  const input=qs('#global-search'),query=String(value||'').trim().toLocaleLowerCase('pt-BR');
  buscaPortalView='';
  if(!input)return;
  const aliases=[['nota','notas'],['nfse','emitir'],['emissão','emitir'],['emissao','emitir'],['cliente','clientes'],['tomador','clientes'],['orçamento','comercial'],['orcamento','comercial'],['ordem','comercial'],['meus serviços','servicos'],['meus servicos','servicos'],['serviço','servicos'],['servico','servicos'],['certificado','cert'],['importar','emitente'],['empresa','emitente'],['emitente','emitente'],['ajuda','ajuda'],['martyn','ajuda'],['suporte','ajuda'],['master','master']];
  const alias=aliases.find(([term])=>query.includes(term));
  const links=[...qsa('.sb-link')].filter(el=>getComputedStyle(el).display!=='none');
  const match=alias?links.find(el=>(el.getAttribute('onclick')||'').includes(`go('${alias[1]}'`)):links.find(el=>supNorm(el.textContent).includes(supNorm(query)));
  if(match){buscaPortalView=(match.getAttribute('onclick')||'').match(/go\('([^']+)'/)?.[1]||'';input.title=`Pressione Enter para abrir ${match.textContent.trim()}`;}
  else input.title=query.length>1?'Nenhum módulo encontrado':'';
}
function abrirResultadoBusca(){
  const input=qs('#global-search');
  if(buscaPortalView){const el=[...qsa('.sb-link')].find(b=>(b.getAttribute('onclick')||'').includes(`go('${buscaPortalView}'`));go(buscaPortalView,el);}
  else if(input?.value.trim())mostrarNotificacoes('Nenhum módulo correspondente foi encontrado.');
  if(input){input.value='';input.title='';}buscaPortalView='';
}
function mostrarNotificacoes(message){
  if(message){alert(message);return}
  abrirNovidades();
}
function fecharNovidades(){qs('#announcements-modal').classList.remove('on')}
function formatarDataNovidade(iso){return new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}
async function abrirNovidades(){
  qs('#announcements-composer').style.display=PORTAL_ADMIN?'block':'none';
  qs('#announcements-list').textContent='Carregando...';
  qs('#announcements-modal').classList.add('on');
  try{
    const data=await api('/api/announcements');
    qs('#announcements-list').innerHTML=data.announcements.length
      ?data.announcements.map(item=>`<div style="padding:10px 0;border-bottom:1px solid #edf0f4"><b>${esc(item.title)}</b><br><small style="color:var(--ink-3)">${formatarDataNovidade(item.published_at)}</small><p style="margin-top:6px;white-space:pre-wrap">${esc(item.body)}</p></div>`).join('')
      :'<div class="empty-state">Nenhuma novidade publicada ainda.</div>';
    await api('/api/announcements/seen',{method:'POST'});
    const badge=qs('#top-notification-badge');if(badge)badge.textContent='0';
  }catch(error){qs('#announcements-list').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
async function publicarNovidade(){
  const title=qs('#announcement-title').value.trim(),body=qs('#announcement-body').value.trim();
  if(title.length<3||body.length<3){alert('Preencha título e descrição.');return}
  try{
    await api('/api/master/announcements',{method:'POST',body:JSON.stringify({title,body})});
    qs('#announcement-title').value='';qs('#announcement-body').value='';
    await abrirNovidades();
  }catch(error){alert(error.message)}
}
async function atualizarBadgeNovidades(){
  try{
    const data=await api('/api/announcements');
    const badge=qs('#top-notification-badge');
    if(badge)badge.textContent=String(data.unreadCount||0);
  }catch{}
}

async function api(path,options={}){
  if(!API_URL)throw new Error('O servidor seguro ainda não foi vinculado a este endereço.');
  const token=sessionStorage.getItem(STORAGE_TOKEN);
  const isForm=options.body instanceof FormData;
  const response=await fetchSeguro(API_URL+path,{
    ...options,
    headers:{...(!isForm?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(sessionStorage.getItem(STORAGE_COMPANY_ID)?{'X-Company-Id':sessionStorage.getItem(STORAGE_COMPANY_ID)}:{}),...(options.headers||{})}
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const details=Array.isArray(data.details)?data.details.map(item=>`${item.field||'campo'}: ${item.message}`).join('; '):'';
    const error=new Error(details||data.error||data.message||'Falha de comunicação com o servidor.');error.status=response.status;error.code=data.code;throw error;
  }
  return data;
}

async function apiBlob(path,options={}){
  if(!API_URL)throw new Error('O servidor seguro ainda não foi vinculado a este endereço.');
  const token=sessionStorage.getItem(STORAGE_TOKEN),companyId=sessionStorage.getItem(STORAGE_COMPANY_ID);
  const response=await fetchSeguro(API_URL+path,{...options,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(companyId?{'X-Company-Id':companyId}:{}),...(options.headers||{})}});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Não foi possível obter o documento.');}
  return response.blob();
}
// Nome do arquivo vem do servidor (Content-Disposition, exposto no CORS via
// exposedHeaders) — fonte única da verdade, sem duplicar a montagem do nome
// (número da NFS-e, empresa) aqui no cliente. fallbackName cobre só o caso
// de um proxy no meio do caminho engolir o header.
function nomeDeContentDisposition(header){
  const match=/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header||'');
  return match?decodeURIComponent(match[1]):null;
}
async function apiDownload(path,fallbackName){
  if(!API_URL)throw new Error('O servidor seguro ainda não foi vinculado a este endereço.');
  const token=sessionStorage.getItem(STORAGE_TOKEN),companyId=sessionStorage.getItem(STORAGE_COMPANY_ID);
  const response=await fetchSeguro(API_URL+path,{headers:{...(token?{Authorization:'Bearer '+token}:{}),...(companyId?{'X-Company-Id':companyId}:{})}});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Não foi possível obter o documento.');}
  const blob=await response.blob();
  const filename=nomeDeContentDisposition(response.headers.get('content-disposition'))||fallbackName;
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

const MARTYN_TARGETS={
  emitir:['s-desc','s-nbs-search','s-cod-search','s-mun-search','t-doc','t-nome','t-mail','t-cep','s-comp','s-ret-pc'],
  servicos:['cad-mun-code','cad-ibscbs-search'],
  cert:['c-file']
};
function aplicarAcaoMartyn(action){
  if(!action||!action.view||!action.fieldId)return;
  const allowed=MARTYN_TARGETS[action.view]||[];
  if(!allowed.includes(action.fieldId))return;
  go(action.view,qs('.sb-link[onclick*="'+action.view+'"]'));
  setTimeout(()=>{
    const field=qs('#'+action.fieldId),corpo=qs('#martyn-corpo');
    if(!field)return;
    field.scrollIntoView({behavior:'smooth',block:'center'});
    try{field.focus({preventScroll:true})}catch{field.focus()}
    field.classList.add('martyn-target');
    setTimeout(()=>field.classList.remove('martyn-target'),5200);
    if(corpo)corpo.innerHTML+='<div class="martyn-action-note">Campo aberto para ajuste: '+esc(action.label||'campo indicado')+'</div>';
  },180);
}
async function dispararMartynPorErro(mensagemErroLog){
  const widget=qs('#martyn-widget'),corpo=qs('#martyn-corpo');
  if(!widget||!corpo)return;
  widget.style.display='block';
  corpo.textContent='O Martyn está analisando a rejeição...';
  try{
    const dados=await api('/api/martyn',{method:'POST',body:JSON.stringify({erro:String(mensagemErroLog).slice(0,4000)})});
    corpo.innerHTML=esc(dados.resposta).replace(/\n/g,'<br>');
    aplicarAcaoMartyn(dados.action);
  }catch(err){corpo.textContent=err.message||'Não foi possível conectar ao assistente.';}
}
function fecharMartyn(){const widget=qs('#martyn-widget');if(widget)widget.style.display='none';}

function aplicarLogoPortal(dataUrl){
  const logo=dataUrl||'/titan-nfse-logo-transparent.png';
  qsa('img[src="/titan-nfse-logo-transparent.png"],.login-brand img,.sb-logo img').forEach(img=>{img.src=logo});
  const preview=qs('#set-portal-logo-preview');if(preview)preview.src=logo;
}
async function carregarBrandingPortal(){
  if(!API_URL)return;
  try{const data=await fetchSeguro(API_URL+'/api/system/branding').then(response=>response.ok?response.json():{});if(data.portalLogoDataUrl)aplicarLogoPortal(data.portalLogoDataUrl)}catch{}
}
carregarBrandingPortal();

/* ---------- login / navegação ---------- */
const STORAGE_EMPRESA='titan_nfse_empresa_teste_v1';
const STORAGE_USUARIO='titan_nfse_usuario_teste_v1';
let empresaAtual=null;
let contaRestrita=false;
// Estatísticas do Painel, sempre lidas de GET /api/dashboard (calculado no
// servidor, por período correto) em vez de recalculadas aqui a partir do
// array inteiro de notas — achado do relatório de auditoria 13/08: o card
// "Requer atenção" somava rejeitadas+processando de TODO o histórico, sem
// corte de mês, ao lado de cards que são mensais.
let dashboardStats=null;
function aplicarModoRestrito(restrita){
  contaRestrita=restrita;
  document.body.classList.toggle('conta-restrita',restrita);
  const aviso=qs('#conta-restrita-aviso');if(aviso)aviso.style.display=restrita?'flex':'none';
}

function selecionarDestinoPortal(access){
  const user=access.user||{},companies=access.companies||[];
  if(PORTAL_ADMIN){
    if(!user.isMaster)throw new Error('Este endereço é exclusivo do administrador master.');
    if(companies[0]?.id)salvarSessaoLocal([[STORAGE_COMPANY_ID,companies[0].id]]);
    return;
  }
  if(PORTAL_CNPJ){
    const company=companies.find(item=>normalizarDocumento(item.federal_tax_id)===PORTAL_CNPJ);
    if(!company)throw new Error('Seu usuário não possui acesso liberado para o CNPJ deste endereço.');
    salvarSessaoLocal([[STORAGE_COMPANY_ID,company.id]]);
    return;
  }
  // Pedido do usuário (18/08/2026): com várias empresas vinculadas ao mesmo
  // telefone, atualizar a página (F5) chama esta mesma função de novo
  // (entrarComSessaoSalva, sessão já salva — não é login novo) — sem esta
  // checagem, ela sempre voltava pra companies[0] (a mais antiga da lista),
  // desfazendo a troca manual que o usuário já tinha feito em #tenant
  // (trocarEmpresa()). Só cai pra companies[0] quando não há nenhuma empresa
  // ativa salva ainda (primeiro login) ou a que estava salva não existe mais
  // nesta lista — nunca sobrescreve uma escolha manual válida.
  const existente=sessionStorage.getItem(STORAGE_COMPANY_ID);
  if(existente&&companies.some(item=>item.id===existente))return;
  if(companies[0]?.id)salvarSessaoLocal([[STORAGE_COMPANY_ID,companies[0].id]]);
}

// Achado 15/08/2026 (usuário digitando CNPJ letra por letra no login): a
// regex antiga (grupos de tamanho fixo com "?") só formata quando um grupo
// inteiro está completo — um caractere que não fecha os 3/4 do próximo
// grupo cai no ".*" solto no fim e é DESCARTADO. Funcionava colando o
// CNPJ inteiro de uma vez (todos os grupos já completos), mas travava
// digitando no teclado de verdade (é sempre o caso real). Monta a máscara
// por tamanho do que já foi digitado — nunca perde caractere, qualquer
// quantidade digitada.
function mascararCnpjLogin(el){
  const d=normalizarDocumento(el.value).slice(0,14);
  let out=d.slice(0,2);
  if(d.length>2)out+='.'+d.slice(2,5);
  if(d.length>5)out+='.'+d.slice(5,8);
  if(d.length>8)out+='/'+d.slice(8,12);
  if(d.length>12)out+='-'+d.slice(12,14);
  el.value=out;
}
function mascararDocumento(el){
  const d=normalizarDocumento(el.value).slice(0,14);
  if(/[A-Z]/.test(d)||d.length>11){mascararCnpjLogin(el);return}
  let out=d.slice(0,3);
  if(d.length>3)out+='.'+d.slice(3,6);
  if(d.length>6)out+='.'+d.slice(6,9);
  if(d.length>9)out+='-'+d.slice(9,11);
  el.value=out;
}
function definirCarregandoLogin(loading,label='Entrando...'){const button=qs('#login-action');if(!button)return;button.disabled=loading;if(loading){button.dataset.originalText=button.textContent;button.textContent=label}else if(button.dataset.originalText){button.textContent=button.dataset.originalText;delete button.dataset.originalText}}
function mostrarErroLogin(message){const box=qs('#login-error');if(!box)return;box.style.display='block';box.textContent=message}
function removerParametroSensivel(name){const url=new URL(location.href);if(!url.searchParams.has(name))return;url.searchParams.delete(name);history.replaceState({},'',url.pathname+(url.search?url.search:'')+url.hash)}
async function iniciarCadastro(){
  limparFalhaLogin();
  const cnpj=PORTAL_CNPJ||normalizarDocumento(qs('#li-cnpj').value);
  const email=qs('#li-mail').value.trim();
  const senha=qs('#li-pw').value;
  if((PORTAL_ADMIN&&!email)||(!PORTAL_ADMIN&&!cnpjComFormatoValido(cnpj))||senha.length<10){
    mostrarErroLogin(PORTAL_ADMIN?'Informe o e-mail administrativo e uma senha com pelo menos 10 caracteres.':'Informe o CNPJ e uma senha individual com pelo menos 10 caracteres.');
    (PORTAL_ADMIN&&!email?qs('#li-mail'):!PORTAL_ADMIN&&cnpj.length!==14?qs('#li-cnpj'):qs('#li-pw'))?.focus();
    return;
  }
  let login;
  definirCarregandoLogin(true);
  try{
    carregarAmbiente().catch(()=>{});
    const dispositivoConfiavel=localStorage.getItem(STORAGE_DEVICE_TRUST);
    login=await api('/api/auth/login',{method:'POST',body:JSON.stringify(PORTAL_ADMIN?{email,password:senha}:{federalTaxId:cnpj,password:senha}),headers:dispositivoConfiavel?{'X-Device-Trust':dispositivoConfiavel}:{}});
    // Achado 17/08/2026 (pedido do usuário): primeiro acesso de um
    // dispositivo/navegador novo (login de empresa por CNPJ) fica pendente
    // de um código de 6 dígitos por e-mail antes de liberar o token.
    if(login.verificationRequired){
      definirCarregandoLogin(false);
      const codigo=(await titanPrompt('Mandamos um código de 6 dígitos pro e-mail '+(login.emailHint||'cadastrado')+'. Digite abaixo para confirmar este acesso.','','Confirme este acesso')||'').trim();
      if(!/^\d{6}$/.test(codigo))throw new Error('Código inválido — informe os 6 dígitos recebidos por e-mail.');
      definirCarregandoLogin(true);
      login=await api('/api/auth/login/verify-device',{method:'POST',body:JSON.stringify({verificationId:login.verificationId,code:codigo})});
      if(login.deviceTrustToken)localStorage.setItem(STORAGE_DEVICE_TRUST,login.deviceTrustToken);
    }
    selecionarDestinoPortal(login);
    const paresSessao=[[STORAGE_TOKEN,login.token],[STORAGE_SESSION,JSON.stringify({user:login.user||{},companies:login.companies||[]})]];
    if(!PORTAL_ADMIN&&!PORTAL_HELP){
      const alvo=(login.companies||[]).find(item=>normalizarDocumento(item.federal_tax_id)===cnpj);
      if(!alvo)throw new Error('Seu usuário não tem acesso liberado para este CNPJ.');
      paresSessao.push([STORAGE_COMPANY_ID,alvo.id]);
    }
    salvarSessaoLocal(paresSessao);
    localStorage.setItem(STORAGE_USUARIO,JSON.stringify({nome:login.user?.name||'',email:login.user?.email||email,cnpj}));
    // O Master não precisa abrir uma empresa para autenticar. Evite três
    // consultas operacionais antes de mostrar a Gestão Master; elas ficavam
    // perceptíveis sobretudo no primeiro acesso após o servidor acordar.
    if(!PORTAL_ADMIN){
      await carregarEmpresaServidor();
      await carregarNotasServidor();
      carregarServicos().catch(()=>{});
    }
  }catch(error){
    definirCarregandoLogin(false);
    if(error?.status===401){
      mostrarErroLogin('Dados de acesso inválidos. Confira o CNPJ e a senha individual. Se precisar, peça um link temporário de redefinição para criar uma senha exclusiva e entrar direto.');
      qs('#li-pw')?.focus();
      return;
    }
    const falhaRede=error instanceof TypeError;
    const falhaArmazenamento=error?.message?.includes('bloqueou o armazenamento');
    const message=falhaRede?'Não foi possível conectar ao servidor fiscal. Aguarde alguns segundos e tente novamente.':error.message;
    mostrarErroLogin(message+(!PORTAL_ADMIN&&!falhaArmazenamento?' Se você é o administrador master, entre por nfse.titanbackoffice.com.br/?login=admin.':''));return
  }
  abrirAreaAutenticada(login);
}
function abrirAreaAutenticada(access){
  qs('#login').classList.add('hide');
  qs('#app').classList.add('on');
  aplicarAcesso(access);
  carregarEstado();
  render();
  atualizarBadgeNovidades().catch(()=>{});
  if(PORTAL_ADMIN){
    go('master',qs('.admin-sidebar .sb-link'));const requestedAdminTab=PORTAL_QUERY.get('tab');setTimeout(()=>masterTab(['clientes','inscricoes','atendimentos','parceiros','planos','config','logs'].includes(requestedAdminTab)?requestedAdminTab:'clientes',qs(`.admin-sidebar [data-master-tab="${['clientes','inscricoes','atendimentos','parceiros','planos','config','logs'].includes(requestedAdminTab)?requestedAdminTab:'clientes'}"]`)),0);
  }else if(PORTAL_HELP){
    go('ajuda',qs('.user-sidebar .sb-link[onclick*="ajuda"]'));setTimeout(()=>supOpen(),80);
  }else if(contaRestrita){
    go('notas',qs('.sb-link[onclick*="notas"]'));
  }else if(empresaAtual){
    go('painel',qs('.sb-link[onclick*="painel"]'));
  }else{
    go('emitente',qs('#sb-configuracoes'));
  }
}
async function entrarComSessaoSalva(){
  if(PORTAL_FIRST||PORTAL_RESET||new URLSearchParams(location.search).get('invite')||new URLSearchParams(location.search).get('partner-invite'))return false;
  const token=sessionStorage.getItem(STORAGE_TOKEN);
  if(!token)return false;
  let access={};try{access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}')}catch{return false}
  if(!access.user?.email)return false;
  try{selecionarDestinoPortal(access)}catch{limparSessaoLocal();return false}
  if(PORTAL_ADMIN&&!access.user?.isMaster){limparSessaoLocal();return false}
  if(PORTAL_CNPJ&&access.user?.isMaster){limparSessaoLocal();return false}
  if(!PORTAL_ADMIN){carregarAmbiente().catch(()=>{});await carregarEmpresaServidor();await carregarNotasServidor();carregarServicos().catch(()=>{})}
  abrirAreaAutenticada(access);
  return true;
}
function abrirRedefinicao(event){
  event?.preventDefault();
  const token=PORTAL_QUERY.get('token');
  if(token){prepararRedefinicao(token);return false;}
  alert('Abra o link temporário de redefinição fornecido pelo administrador Master. Por segurança, não é possível iniciar a redefinição sem esse link.');
  return false;
}
function limparFalhaLogin(){const box=qs('#login-error');if(box){box.style.display='none';box.innerHTML='';}qs('#li-pw')?.focus();}
function entrar(){iniciarCadastro()}
function aplicarAcesso(login){
  const access=login||JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}'),user=access.user||{};
  qs('#master-menu').style.display=user.isMaster?'block':'none';
  const companyId=sessionStorage.getItem(STORAGE_COMPANY_ID),company=(access.companies||[]).find(c=>c.id===companyId)||(access.companies||[])[0],permissions=company?.permissions||[],features=company?.features||['portal_emission'];
  if(!user.isMaster)travarEmpresaAtiva(company?.id,company?.legal_name||company?.trade_name);
  // Permissão (o que o perfil do usuário libera) e feature (o que o PLANO da
  // empresa vende) são checagens independentes — um elemento só fica visível
  // se passar nas duas quando as duas se aplicam. Uma única passagem evita que
  // uma pise no resultado da outra no mesmo botão (ex.: Notas recorrentes tem
  // data-permission="emit" e data-feature="invoice_recurrences" juntos).
  qsa('[data-permission],[data-feature]').forEach(el=>{
    const okPermissao=!el.dataset.permission||user.isMaster||el.dataset.permission.split(',').some(p=>permissions.includes(p));
    const okFeature=!el.dataset.feature||user.isMaster||features.includes(el.dataset.feature);
    el.style.display=(okPermissao&&okFeature)?(el.tagName==='DIV'?'':''):'none';
  });
  qsa('[data-master-only]').forEach(el=>el.style.display=user.isMaster?'flex':'none');
  conferirMenuDoCliente(user);
  if(access.companies?.length){
    const visible=PORTAL_CNPJ?access.companies.filter(c=>normalizarDocumento(c.federal_tax_id)===PORTAL_CNPJ):access.companies;
    qs('#tenant').innerHTML=visible.map(c=>`<option value="${c.id}" ${c.id===companyId?'selected':''}>${esc(c.trade_name||c.legal_name)}</option>`).join('');
    qs('#tenant').disabled=Boolean(PORTAL_CNPJ);
    // Pedido do usuário (13/08/2026): só faz sentido mostrar o seletor de
    // empresa ativa quando existe de fato mais de um vínculo pra escolher —
    // com só um, é ruído fixo na barra lateral.
    const tenantBox=qs('#tenant')?.closest('.tenant');if(tenantBox)tenantBox.style.display=visible.length>1?'':'none';
  }
  if(PORTAL_ADMIN)configurarEmpresasAdmin(access.companies||[]);
}
function moduloIndisponivel(nome){alert(`⚠ ${nome}\n\nMódulo em preparação. Nenhuma operação foi realizada.`)}
function limparSessaoLocal(){sessionStorage.removeItem(STORAGE_TOKEN);sessionStorage.removeItem(STORAGE_COMPANY_ID);sessionStorage.removeItem(STORAGE_SESSION);localStorage.removeItem(STORAGE_EMPRESA);localStorage.removeItem(STORAGE_USUARIO);liberarTravaEmpresa();qs('#app')?.classList.remove('on');qs('#login')?.classList.remove('hide')}
function garantirBarreiraInicial(){
  const token=sessionStorage.getItem(STORAGE_TOKEN);
  let access={};try{access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}')}catch{}
  // A rota por CNPJ só aceita uma sessão operacional autenticada; nunca
  // reutilize uma sessão master para abrir uma empresa diretamente.
  if(PORTAL_CNPJ&&access.user?.isMaster)limparSessaoLocal();
  if(!token){qs('#app')?.classList.remove('on');qs('#login')?.classList.remove('hide');}
}
window.addEventListener('pageshow',garantirBarreiraInicial);
// Listener para ações da janela do DANFSe (iframe sandbox não pode
// acessar a API diretamente, então usa postMessage via window.opener).
window.addEventListener('message',(e)=>{
  // Achado da auditoria de 11/08/2026: sem checar e.origin, qualquer janela
  // com referência a esta aba podia forjar a mensagem e disparar um download
  // com invoiceId arbitrário. A aba do DANFSe é aberta via window.open('','_blank')
  // (mesma origem, nunca navega pra outro domínio) — e.origin===location.origin
  // sempre bate no fluxo real, então isso não muda o comportamento esperado.
  if(e.origin!==location.origin)return;
  if(e.data?.titan==='baixarXml' && e.data?.invoiceId){
    baixarXml(String(e.data.invoiceId),String(e.data.numero||''));
  }
  if(e.data?.titan==='baixarPdf' && e.data?.invoiceId){
    baixarPdf(String(e.data.invoiceId),String(e.data.numero||''),String(e.data.empresa||''));
  }
});
function alternarGrupoMenu(id,button){const menu=qs('#'+id),open=!menu.classList.contains('on');menu.classList.toggle('on',open);button.classList.toggle('expanded',open)}
function alternarMenuLateral(forcar){
  const sb=qs('#sb');if(!sb)return;
  const aberto=typeof forcar==='boolean'?forcar:!sb.classList.contains('open');
  sb.classList.toggle('open',aberto);
  qs('#sb-backdrop')?.classList.toggle('on',aberto);
  qs('#sb-burger')?.setAttribute('aria-expanded',String(aberto));
  document.body.classList.toggle('menu-aberto',aberto);
}
function fecharMenuLateral(){alternarMenuLateral(false)}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&qs('#sb')?.classList.contains('open'))fecharMenuLateral()});
function abrirComercial(kind,button){go('comercial',button);novoComercial(kind);}
function abrirGestao(tab){const access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}');if(!access.user?.isMaster){moduloIndisponivel('Usuários e permissões — acesso exclusivo do gestor');return}const suffix=tab?`?tab=${encodeURIComponent(tab)}`:'';window.open('/admin'+suffix,'_blank','noopener')}
function sairPortal(){sessionStorage.removeItem(STORAGE_TOKEN);sessionStorage.removeItem(STORAGE_COMPANY_ID);sessionStorage.removeItem(STORAGE_SESSION);sessionStorage.removeItem(STORAGE_IMPERSONATING);localStorage.removeItem(STORAGE_EMPRESA);localStorage.removeItem(STORAGE_USUARIO);liberarTravaEmpresa();location.reload()}
// Faixa da sessão administrativa (POST /master/companies/:id/session): a
// sessionStorage é por aba, então só a aba aberta por abrirEmpresaEmissao
// carrega STORAGE_IMPERSONATING — o painel Master original, em outra aba,
// nunca é afetado. Chamada tanto ao entrar via handoff quanto no boot normal
// da página (recarregar a aba não perde o aviso).
function faixaImpersonacao(){
  const empresa=sessionStorage.getItem(STORAGE_IMPERSONATING);
  let faixa=qs('#impersonation-banner');
  if(!empresa){faixa?.remove();document.documentElement.classList.remove('impersonating');document.documentElement.style.removeProperty('--imp-h');return}
  if(!faixa){faixa=document.createElement('div');faixa.id='impersonation-banner';faixa.setAttribute('role','status');document.body.prepend(faixa)}
  faixa.innerHTML=`Sessão administrativa — operando como <b>${esc(empresa)}</b>. Saia para voltar ao painel Master.<button type="button" onclick="sairPortal()">Sair</button>`;
  document.documentElement.classList.add('impersonating');
  // Nome de empresa comprido ou janela estreita quebra a faixa em mais de uma
  // linha (flex-wrap:wrap no CSS) — um deslocamento fixo pro menu cobria a
  // faixa quando ela crescia além de uma linha. Mede a altura de verdade em
  // vez de supor, e reage a resize/redimensionamento da janela.
  const medir=()=>document.documentElement.style.setProperty('--imp-h',faixa.offsetHeight+'px');
  medir();
  if(!faixa.dataset.medidorLigado){
    faixa.dataset.medidorLigado='1';
    if(window.ResizeObserver)new ResizeObserver(medir).observe(faixa);
    else window.addEventListener('resize',medir);
  }
}
function go(v,el,limpar){
  if(!sessionStorage.getItem(STORAGE_TOKEN)){qs('#app')?.classList.remove('on');qs('#login')?.classList.remove('hide');return}
  if(PORTAL_ADMIN&&v!=='master'){alert('O portal do gestor é exclusivo para usuários, perfis e liberações. Abra a empresa em uma nova aba para operar.');return}
  if(v==='recebimentos'){
    const access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}'),companyId=sessionStorage.getItem(STORAGE_COMPANY_ID),company=(access.companies||[]).find(c=>c.id===companyId)||(access.companies||[])[0],permissions=company?.permissions||[];
    if(!access.user?.isMaster&&!permissions.includes('financial')){alert('Financeiro de honorários não está disponível para este acesso.');return}
  }
  if(v==='master'){
    const access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}');
    if(!access.user?.isMaster){alert('Esta área é exclusiva do administrador master.');return}
  }
  qsa('.view').forEach(x=>x.classList.remove('on'));
  qs('#v-'+v).classList.add('on');
  qsa('.sb-link').forEach(x=>x.classList.remove('active'));
  if(el)el.classList.add('active');
  fecharMenuLateral();
  window.scrollTo(0,0);
  if(v==='servicos'){carregarPerfisServico();buscarCatalogoServico()}
  if(v==='ajuda'){helpRenderTopics();helpRenderFaq()}
  if(v==='master')carregarMaster();
  if(v==='emitir'){
    // limpar=true: ponto único de "começar do zero" (menu, atalhos do
    // Painel, "+ Emitir NFSe" em Notas) — zera rascunho aberto e formulário
    // inteiro antes de abrir, reaproveitando aplicarRascunho({}) (já sabe o
    // valor em branco de cada campo, inclusive info complementar e IBS/CBS).
    // abrirRascunho() e os fluxos que trazem dados de outro lugar (recebimento,
    // cliente, orçamento/O.S.) continuam chamando go('emitir',...) sem este
    // parâmetro, então não perdem o que acabaram de preencher.
    if(limpar){rascunhoAbertoId=null;aplicarRascunho({});}
    exibirMunicipioPorCodigo('s',qs('#s-mun').value);travarRetencoes(true);atualizarResumoCtnNbs(perfisServico.find(profile=>profile.id===qs('#s-profile')?.value)||null);avisarLimiteDoPlano();atualizarEstadoBotaoEmitir();renumerarPassosEmissao();
  }
  if(v==='rascunhos')carregarRascunhos();
  if(v==='outros')carregarOutros();
  if(v==='clientes')carregarClientesCadastro();
  if(v==='recorrentes')carregarRecorrencias();
  if(v==='agenda')carregarAgenda();
  if(v==='comercial'){renderEmpresaComercial();carregarComerciais();popularClientesComercial();carregarPerfisServico().then(popularServicosComercial);}
  if(v==='recebimentos')carregarRecebimentos();
  if(v==='financeiro')carregarBilling();
  if(v==='dasn')carregarDasn();
  if(v==='emitente'){qs('#c-pw').value='';carregarCertificado();carregarMeuPlano();carregarMeuContrato();carregarStatusImportacao()}
  if(v==='logs')carregarLogsApi();
}

let recebimentos=[],presetsRecorrencia=[];
function clientePorNomeRecebimento(name){const value=(name||'').trim().toLocaleLowerCase('pt-BR');return clientesCadastro.find(c=>(c.legal_name||'').trim().toLocaleLowerCase('pt-BR')===value||(c.trade_name||'').trim().toLocaleLowerCase('pt-BR')===value)}
async function popularClientesRecebimento(){try{if(!clientesCadastro.length)clientesCadastro=await api('/api/customers?search=');const dl=qs('#rec-client-list');if(dl)dl.innerHTML=clientesCadastro.map(c=>`<option value="${esc(c.legal_name)}">${esc(c.tax_id||'')}</option>`).join('')}catch{}}

/* ---------- outros cadastros: categorias e centros de custo ---------- */
// Pedido direto do usuário (14/08): antes eram campos de texto livre em
// Recebimentos — cada pessoa escrevia diferente ("Operacional" vs
// "operacional"). Backend continua guardando texto simples (sem FK); isto só
// padroniza o que a pessoa ESCOLHE, com opção de cadastrar um novo direto ali.
let categoriasCadastro=[],centrosCustoCadastro=[];
// Com o 3º cadastro (padrões de recorrência, 19/08/2026) o ternário
// categoria/centro em cada função virou mapa: um lugar só pra rota, rótulo e
// texto de cada tipo.
const REGISTROS_AUXILIARES={
  categoria:{rota:'/api/categories',titulo:'Nova categoria',campo:'Nome da categoria'},
  centro:{rota:'/api/cost-centers',titulo:'Novo centro de custo',campo:'Nome do centro de custo'}
};
async function carregarRegistrosAuxiliares(){
  // Falha aqui nunca pode derrubar a tela que chamou — os cadastros
  // auxiliares são conveniência, não requisito (mesmo motivo de antes; o
  // preset entra na mesma regra: sem ele, o seletor simplesmente não aparece).
  try{[categoriasCadastro,centrosCustoCadastro,presetsRecorrencia]=await Promise.all([api('/api/categories'),api('/api/cost-centers'),api('/api/recurrence-presets')]);}
  catch{categoriasCadastro=[];centrosCustoCadastro=[];presetsRecorrencia=[];}
}
function opcoesRegistroAuxiliar(lista,valorAtual,rotuloNovo){
  return '<option value="">Selecione...</option>'
    +lista.map(item=>`<option value="${esc(item.name)}" ${item.name===valorAtual?'selected':''}>${esc(item.name)}</option>`).join('')
    +`<option value="__novo__">${esc(rotuloNovo)}</option>`;
}
function popularSelectsRegistros(){
  ['rec-category','rr-category'].forEach(id=>{const el=qs('#'+id);if(el)el.innerHTML=opcoesRegistroAuxiliar(categoriasCadastro,el.value,'+ Nova categoria...')});
  ['rec-cost-center','rr-cost-center'].forEach(id=>{const el=qs('#'+id);if(el)el.innerHTML=opcoesRegistroAuxiliar(centrosCustoCadastro,el.value,'+ Novo centro de custo...')});
}
async function aoTrocarRegistroAuxiliar(select,tipo){
  if(select.value!=='__novo__')return;
  select.value='';
  const cfg=REGISTROS_AUXILIARES[tipo];
  const nome=await titanPrompt(cfg.campo,'',cfg.titulo);
  if(!nome)return;
  try{
    const criado=await api(cfg.rota,{method:'POST',body:JSON.stringify({name:nome})});
    await carregarRegistrosAuxiliares();
    popularSelectsRegistros();
    select.value=criado.name;
  }catch(error){alert(error.message)}
}
function renderListaRegistroAuxiliar(listId,lista,tipo){
  const el=qs('#'+listId);if(!el)return;
  el.innerHTML=lista.length?lista.map(item=>`<div class="dest" style="margin-bottom:6px"><div style="flex:1;min-width:0">${esc(item.name)}</div><button class="ico-btn danger" title="Excluir" onclick="excluirRegistroAuxiliar('${tipo}','${item.id}')">×</button></div>`).join(''):'<div class="empty-state">Nenhum cadastro ainda.</div>';
}
async function carregarOutros(){
  await carregarRegistrosAuxiliares();
  renderListaRegistroAuxiliar('outros-categorias-list',categoriasCadastro,'categoria');
  renderListaRegistroAuxiliar('outros-centros-list',centrosCustoCadastro,'centro');
  renderListaPresetsRecorrencia();
}
async function novoRegistroAuxiliar(tipo){
  const cfg=REGISTROS_AUXILIARES[tipo];
  const nome=await titanPrompt(cfg.campo,'',cfg.titulo);
  if(!nome)return;
  try{await api(cfg.rota,{method:'POST',body:JSON.stringify({name:nome})});await carregarOutros();}catch(error){alert(error.message)}
}
async function excluirRegistroAuxiliar(tipo,id){
  if(!await titanConfirm('Excluir este cadastro?','Excluir','err'))return;
  try{await api(REGISTROS_AUXILIARES[tipo].rota+'/'+id,{method:'DELETE'});await carregarOutros();}catch(error){alert(error.message)}
}
/* ---------- padrões de recorrência (dia/hora de emissão + vencimento) ---------- */
function rotuloPresetRecorrencia(p){
  return `emite dia ${p.day_of_month} às ${(p.run_time||'09:00:00').slice(0,5)} · vence dia ${p.due_day_of_month}`;
}
function renderListaPresetsRecorrencia(){
  const el=qs('#outros-presets-list');if(!el)return;
  el.innerHTML=presetsRecorrencia.length
    ?presetsRecorrencia.map(p=>`<div class="dest" style="margin-bottom:6px"><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="hint">${esc(rotuloPresetRecorrencia(p))}</div></div><button class="ico-btn danger" title="Excluir" onclick="excluirPresetRecorrencia('${p.id}')">×</button></div>`).join('')
    :'<div class="empty-state">Nenhum padrão cadastrado. Crie um pra não redigitar dia e horário a cada contrato.</div>';
}
async function novoPresetRecorrencia(){
  const nome=await titanPrompt('Nome do padrão (ex.: Mensal dia 1)','','Novo padrão de recorrência');
  if(!nome)return;
  const dia=Number(await titanPrompt('Dia do mês em que a nota é emitida (1 a 28)','1','Dia de emissão'));
  if(!dia||dia<1||dia>28){alert('Informe um dia de emissão entre 1 e 28.');return}
  const hora=(await titanPrompt('Horário da emissão (HH:MM)','09:00','Horário'))||'09:00';
  if(!/^([01]?\d|2[0-3]):[0-5]\d$/.test(hora.trim())){alert('Informe um horário no formato HH:MM.');return}
  const venc=Number(await titanPrompt('Dia do vencimento (1 a 28)','10','Dia de vencimento'));
  if(!venc||venc<1||venc>28){alert('Informe um dia de vencimento entre 1 e 28.');return}
  try{await api('/api/recurrence-presets',{method:'POST',body:JSON.stringify({name:nome,dayOfMonth:dia,runTime:hora.trim().padStart(5,'0'),dueDayOfMonth:venc})});await carregarOutros();}
  catch(error){alert(error.message)}
}
async function excluirPresetRecorrencia(id){
  if(!await titanConfirm('Excluir este padrão? Os contratos já criados com ele não mudam.','Excluir padrão','err'))return;
  try{await api('/api/recurrence-presets/'+id,{method:'DELETE'});await carregarOutros();}catch(error){alert(error.message)}
}
function popularPresetsRecorrencia(){
  const sel=qs('#rc-preset');if(!sel)return;
  // Sem padrão cadastrado o seletor some — campo vazio que não faz nada só
  // ocupa espaço no formulário.
  const wrap=qs('#rc-preset-wrap');
  if(wrap)wrap.style.display=presetsRecorrencia.length?'':'none';
  sel.innerHTML='<option value="">Preencher na mão</option>'+presetsRecorrencia.map(p=>`<option value="${p.id}">${esc(p.name)} — ${esc(rotuloPresetRecorrencia(p))}</option>`).join('');
}
function aplicarPresetRecorrencia(){
  const p=presetsRecorrencia.find(x=>x.id===qs('#rc-preset').value);
  if(!p)return;
  qs('#rc-day').value=p.day_of_month;
  qs('#rc-time').value=(p.run_time||'09:00:00').slice(0,5);
  qs('#rc-due-day').value=p.due_day_of_month;
  verificarVencimentoRecorrencia();
}
async function carregarRecebimentos(){
  await popularClientesRecebimento();
  await carregarRegistrosAuxiliares();
  popularSelectsRegistros();
  const filter=qs('#rec-filter')?.value||'all';
  const dueFrom=qs('#rec-filter-from')?.value||'',dueTo=qs('#rec-filter-to')?.value||'';
  const clientFilter=qs('#rec-filter-client')?.value.trim()||'';
  let query='?status='+encodeURIComponent(filter);
  if(dueFrom)query+='&dueFrom='+encodeURIComponent(dueFrom);
  if(dueTo)query+='&dueTo='+encodeURIComponent(dueTo);
  if(clientFilter)query+='&search='+encodeURIComponent(clientFilter);
  try{
    // O painel de números recebe o MESMO recorte da lista (pedido do usuário,
    // 20/08/2026). Antes o resumo era sempre da empresa inteira: filtrar por
    // cliente ou por período mudava a lista e não mudava número nenhum, então
    // os dois discordavam na mesma tela.
    const [summary,items]=await Promise.all([api('/api/workspace/receivables/summary'+query),api('/api/workspace/receivables'+query)]);
    recebimentos=ordenarRecebimentos(items||[]);
    qs('#rec-open').textContent='R$ '+brl(Number(summary.open_amount||0));
    qs('#rec-overdue').textContent='R$ '+brl(Number(summary.overdue_amount||0));
    qs('#rec-month').textContent='R$ '+brl(Number(summary.received_amount||0));
    qs('#rec-nfse').textContent=String(summary.pending_nfse||0);
    const total=qs('#rec-total');if(total)total.textContent='R$ '+brl(Number(summary.total_amount||0));
    const contagem=qs('#rec-contagem');
    if(contagem)contagem.textContent=`${Number(summary.total_count||0).toLocaleString('pt-BR')} lançamento(s) no filtro · ${Number(summary.received_count||0).toLocaleString('pt-BR')} já recebido(s)`;
    qs('#rec-list').innerHTML=recebimentos.length?recebimentos.map(renderRecebimento).join(''):'<div class="empty-state">Nenhum recebimento para o filtro selecionado.</div>';
  }catch(error){qs('#rec-list').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
/* ---------- relatórios do filtro atual (20/08/2026) ---------------------- */
// Relatório sai do MESMO recorte que está na tela. Um relatório que ignora o
// filtro é um número que ninguém consegue conferir olhando a lista.
function alternarRelatorioRecebimentos(){
  const box=qs('#rec-report');if(!box)return;
  const abrindo=box.style.display==='none';
  box.style.display=abrindo?'':'none';
  const btn=qs('#rec-report-btn');if(btn)btn.textContent=abrindo?'Ocultar relatórios':'Relatórios';
  if(abrindo)renderRelatorioRecebimentos();
}
function somarPor(lista,chave){
  const mapa=new Map();
  lista.forEach(item=>{const k=chave(item)||'—';const a=mapa.get(k)||{qtd:0,total:0};a.qtd++;a.total+=Number(item.amount||0);mapa.set(k,a)});
  return [...mapa.entries()].sort((a,b)=>b[1].total-a[1].total);
}
function tabelaDoRelatorio(titulo,linhas,rotulo=v=>v){
  if(!linhas.length)return '';
  const corpo=linhas.map(([chave,v])=>`<tr><td>${esc(rotulo(chave))}</td><td style="text-align:right">${v.qtd}</td><td style="text-align:right">R$ ${brl(v.total)}</td></tr>`).join('');
  return `<h3 class="hint" style="margin:12px 0 6px"><b>${esc(titulo)}</b></h3><div class="tbl-scroll"><table class="tbl-cards-mobile"><thead><tr><th>${esc(titulo)}</th><th style="text-align:right">Qtd</th><th style="text-align:right">Valor</th></tr></thead><tbody>${corpo}</tbody></table></div>`;
}
function renderRelatorioRecebimentos(){
  const box=qs('#rec-report-body');if(!box)return;
  if(!recebimentos.length){box.innerHTML='<div class="empty-state">Sem lançamentos no filtro atual.</div>';return}
  const situacao={draft:'Rascunho',scheduled:'Agendado',to_charge:'A cobrar',charged:'Cobrado',received:'Recebido',overdue:'Vencido',cancelled:'Cancelado'};
  box.innerHTML=[
    tabelaDoRelatorio('Situação',somarPor(recebimentos,i=>i.status),v=>situacao[v]||v),
    tabelaDoRelatorio('Mês de vencimento',somarPor(recebimentos,i=>String(i.due_date||'').slice(0,7))),
    tabelaDoRelatorio('Cliente',somarPor(recebimentos,i=>i.customer_name).slice(0,15))
  ].join('');
}
function exportarRecebimentosCsv(){
  if(!recebimentos.length){alert('Nada para exportar no filtro atual.');return}
  const cabecalho=['Vencimento','Competência','Cliente','CPF/CNPJ','Título','Valor','Situação','Fiscal','Cobrança'];
  // Ponto e vírgula + BOM: é o que o Excel em português abre sem perguntar nada.
  const escapar=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const linhas=recebimentos.map(i=>[i.due_date,i.competence,i.customer_name,i.customer_tax_id,i.title,Number(i.amount||0).toFixed(2).replace('.',','),i.status,i.fiscal_status,i.collection_status].map(escapar).join(';'));
  const blob=new Blob(['﻿'+[cabecalho.join(';'),...linhas].join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`recebimentos-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
}

// Ordenação escolhida na tela (pedido do usuário, 20/08/2026: "adicione o
// vencimento correto nos campos para poder organizar os recebimentos").
// O padrão continua sendo por vencimento, do mais próximo ao mais distante.
let recebimentoOrdem='due_asc';
function trocarOrdemRecebimentos(valor){recebimentoOrdem=valor;recebimentos=ordenarRecebimentos(recebimentos);qs('#rec-list').innerHTML=recebimentos.length?recebimentos.map(renderRecebimento).join(''):'<div class="empty-state">Nenhum recebimento para o filtro selecionado.</div>'}
function ordenarRecebimentos(lista){
  const porData=(a,b)=>String(a.due_date).localeCompare(String(b.due_date));
  const porValor=(a,b)=>Number(a.amount||0)-Number(b.amount||0);
  const porCliente=(a,b)=>String(a.customer_name||'').localeCompare(String(b.customer_name||''),'pt-BR');
  const regra={due_asc:porData,due_desc:(a,b)=>porData(b,a),amount_desc:(a,b)=>porValor(b,a),amount_asc:porValor,client:porCliente}[recebimentoOrdem]||porData;
  return [...lista].sort(regra);
}
/**
 * Aceita "2026-09-10" e "2026-09-10T00:00:00.000Z".
 *
 * O driver do Postgres devolvia due_date como Date, e o res.json() mandava
 * timestamp: `due_date+'T00:00:00'` virava Invalid Date na lista e o
 * split('-') do calendário devolvia NaN no dia — o lançamento não caía em dia
 * nenhum. A rota foi corrigida (due_date::text), e isto aqui é o cinto: uma
 * data de vencimento errada numa tela de nota fiscal não pode depender de um
 * único ponto estar certo.
 */
function soData(valor){return String(valor??'').slice(0,10)}
function dataBR(valor){const d=soData(valor);return /^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(d+'T00:00:00').toLocaleDateString('pt-BR'):'sem data'}
function renderRecebimento(item){
  const due=dataBR(item.due_date),amount='R$ '+brl(Number(item.amount||0));
  const status={draft:['p-off','Rascunho'],scheduled:['p-gold','Agendado'],to_charge:['p-gold','A cobrar'],charged:['p-off','Cobrado'],received:['p-ok','Recebido'],overdue:['p-off','Vencido'],cancelled:['p-off','Cancelado']}[item.status]||['p-off',item.status];
  const fiscal={not_applicable:'sem NFS-e',pending_issue:'pré-NFS-e pendente',draft_ready:'pré-NFS-e pronta',issuing:'em emissão',issued:'NFS-e emitida',issue_error:'erro fiscal',cancelled:'NFS-e cancelada'}[item.fiscal_status]||'fiscal não informado';
  const collection={not_sent:'cobrança não enviada',review_pending:'cobrança para revisar',queued:'cobrança na fila',sent:'cobrança registrada',failed:'cobrança falhou',answered:'cliente respondeu',waived:'cobrança dispensada'}[item.collection_status]||'cobrança não informada';
  const cobrar=(item.status==='scheduled'||item.status==='to_charge')&&item.collection_status!=='sent'?`<button class="btn btn-s" type="button" onclick="revisarCobrancaRecebimento('${item.id}')">Revisar cobrança</button>`:'';
  const receber=item.status!=='received'&&item.status!=='cancelled'?`<button class="btn btn-s" type="button" onclick="mudarStatusRecebimento('${item.id}','received')">Marcar recebido</button>`:'';
  // Previsto de contrato recorrente (20/08/2026): a linha existe desde o
  // cadastro do contrato, para o valor entrar em "a receber" antes da nota.
  const previsto=Boolean(item.invoice_recurrence_id)&&!item.invoice_id;
  // "Preparar NFS-e" fica FORA do previsto de propósito: o worker vai emitir
  // essa nota na data do contrato. Um botão aqui convidaria a emitir a mesma
  // competência duas vezes — duas notas fiscais reais para um mês só.
  const emitir=item.fiscal_status==='pending_issue'&&!item.invoice_id&&!previsto?`<button class="btn btn-s" type="button" onclick="prepararNotaRecebimento('${item.id}')">Preparar NFS-e</button>`:'';
  const meta=[item.competence?`Competência ${item.competence}`:'',item.category,item.cost_center].filter(Boolean).join(' · ');
  const gerado=!item.invoice_recurrence_id?''
    :previsto?'<span class="pill p-gold" title="Projeção do contrato recorrente. A NFS-e sai sozinha na data programada e esta linha vira o recebimento real.">Previsto do contrato</span>'
    :'<span class="pill p-off" title="Criado automaticamente quando a nota recorrente foi emitida">Gerado por recorrência</span>';
  // "pré-NFS-e pendente" sugere que falta o usuário fazer algo. No previsto do
  // contrato não falta: a nota sai sozinha na data.
  const fiscalTexto=previsto?'NFS-e programada pelo contrato':fiscal;
  // Duas linhas por lançamento (pedido do usuário, 20/08/2026): identificação
  // e dinheiro em cima, prazo e ações embaixo. Quatro linhas por item faziam
  // caber cinco recebimentos na tela.
  return `<div class="draft-item" style="padding:8px 10px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="flex:1;min-width:170px"><b>${esc(item.title)}</b> <span class="hint" style="display:inline">· ${esc(item.customer_name)}</span></span>
      <b style="white-space:nowrap">${amount}</b><span class="pill ${status[0]}">${status[1]}</span>${gerado}
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
      <span class="hint" style="flex:1;min-width:170px">vence <b>${due}</b>${meta?' · '+esc(meta):''} · ${esc(collection)} · ${esc(fiscalTexto)}${item.notes?' · '+esc(item.notes):''}</span>
      ${cobrar}${receber}${emitir}
    </div></div>`;
}
/**
 * Atalhos de período (pedido do usuário, 20/08/2026: "um filtro melhor").
 * Preenche os dois campos de data e já busca — o caso comum é querer "o que
 * vence este mês" ou "o que já venceu", não digitar duas datas.
 */
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function aplicarPeriodoRecebimentos(valor){
  const hoje=new Date(),ano=hoje.getFullYear(),mes=hoje.getMonth();
  const faixas={
    // "Vencidos" para de fora: o filtro de situação já tem o status; aqui é
    // data, então é tudo que venceu ATÉ ontem.
    vencidos:['',iso(new Date(ano,mes,hoje.getDate()-1))],
    hoje:[iso(hoje),iso(hoje)],
    sete:[iso(hoje),iso(new Date(ano,mes,hoje.getDate()+7))],
    mes:[iso(new Date(ano,mes,1)),iso(new Date(ano,mes+1,0))],
    proximo:[iso(new Date(ano,mes+1,1)),iso(new Date(ano,mes+2,0))],
    todos:['','']
  };
  const [de,ate]=faixas[valor]||faixas.todos;
  qs('#rec-filter-from').value=de;qs('#rec-filter-to').value=ate;
  carregarRecebimentos();
}
function limparFiltrosRecebimentos(){
  ['#rec-filter-client','#rec-filter-from','#rec-filter-to'].forEach(s=>{const el=qs(s);if(el)el.value=''});
  const situacao=qs('#rec-filter');if(situacao)situacao.value='all';
  const periodo=qs('#rec-periodo');if(periodo)periodo.value='todos';
  carregarRecebimentos();
}
// Pedido do usuário (18/08/2026): "Agendar recebimento" precisa ser um botão
// que abre modal, igual "+ Nova recorrência" (abrirModalRecorrencia) — mesmo
// padrão de .modal-backdrop.on usado em todo o resto do portal.
// Pedido do usuário (19/08/2026): recorrência tem UM lugar só — "Notas
// recorrentes". O checkbox "É recorrente" que existia aqui criava a mesma
// coisa (mesmo POST /api/invoice-recurrences), num segundo formulário com
// campos duplicados, sem caminho de edição depois. Este modal voltou a ser
// só recebimento avulso, com atalho pra tela certa.
function abrirModalRecebimento(){qs('#recebimento-modal').classList.add('on')}
function fecharModalRecebimento(){qs('#recebimento-modal').classList.remove('on')}
function irParaNovaRecorrencia(){
  fecharModalRecebimento();
  go('recorrentes',qs('.user-sidebar .sb-link[onclick*="recorrentes"]'));
  novaRecorrencia();
}
async function salvarRecebimento(){
  const customerName=qs('#rec-client').value.trim(),c=clientePorNomeRecebimento(customerName),amount=Number(qs('#rec-value').value.replace(/\./g,'').replace(',','.'));
  const issueNfse=qs('#rec-issue').value==='true',chargeChannel=qs('#rec-channel').value;
  const body={title:qs('#rec-title').value.trim(),customerName,customerId:c?.id,customerTaxId:c?.tax_id,amount,dueDate:qs('#rec-due').value,competence:qs('#rec-competence').value.trim()||undefined,category:qs('#rec-category').value.trim()||undefined,costCenter:qs('#rec-cost-center').value.trim()||undefined,status:'scheduled',fiscalStatus:issueNfse?'pending_issue':'not_applicable',collectionStatus:chargeChannel==='none'?'not_sent':'review_pending',chargeChannel,issueNfse,notes:qs('#rec-notes').value.trim()||undefined,nfsePayload:c?{borrower:{name:c.legal_name,taxId:c.tax_id,email:c.email,phone:c.phone,address:c.address,municipalityCode:c.municipality_code}}:undefined};
  if(!body.title||!body.customerName||!body.dueDate||!(amount>0)){alert('Informe descrição, cliente, valor maior que zero e vencimento.');return}
  if(salvandoRecebimento)return;
  salvandoRecebimento=true;qs('#rec-save-btn').disabled=true;
  try{await api('/api/workspace/receivables',{method:'POST',body:JSON.stringify(body)});['#rec-title','#rec-client','#rec-value','#rec-due','#rec-competence','#rec-category','#rec-cost-center','#rec-notes'].forEach(id=>qs(id).value='');fecharModalRecebimento();await carregarRecebimentos();alert('Recebimento agendado.')}catch(error){alert(error.message)}finally{salvandoRecebimento=false;qs('#rec-save-btn').disabled=false}
}
async function mudarStatusRecebimento(id,status,channel){
  try{await api('/api/workspace/receivables/'+id+'/status',{method:'PATCH',body:JSON.stringify({status,chargeChannel:channel})});await carregarRecebimentos()}catch(error){alert(error.message)}
}
async function revisarCobrancaRecebimento(id){
  const item=recebimentos.find(r=>r.id===id);if(!item)return;
  const channel=item.charge_channel&&item.charge_channel!=='none'?item.charge_channel:'manual';
  const preview=`Cobrança ${item.customer_name} · ${item.competence||item.due_date} · R$ ${brl(Number(item.amount||0))}`;
  if(!await titanConfirm(`Revisar e registrar cobrança?\n\n${preview}\n\nNenhum disparo automático em massa será feito nesta etapa.`,'Registrar cobrança'))return;
  try{await api('/api/workspace/receivables/'+id+'/collection-review',{method:'POST',body:JSON.stringify({channel,messagePreview:preview})});await carregarRecebimentos()}catch(error){alert(error.message)}
}
function prepararNotaRecebimento(id){
  const item=recebimentos.find(r=>r.id===id);if(!item)return;
  const payload=item.nfse_payload||{},borrower=payload.borrower||{};
  const amount=Number(item.amount||0);
  qs('#t-nome').value=borrower.name||item.customer_name||'';qs('#t-doc').value=borrower.taxId||item.customer_tax_id||'';qs('#s-desc').value=item.title||'Honorários profissionais';
  composicaoItens=[{description:item.title||'Honorários profissionais',quantity:1,unitAmount:Number(amount.toFixed(2))}];atualizarComposicao();
  rascunhoAbertoId=null;go('emitir',qs('.sb-link[onclick*="emitir"]'));alert('Dados do recebimento levados para a emissão. Revise os parâmetros fiscais antes de transmitir.');
}
// Pedido do usuário (13/08/2026): antes o cliente só descobria que estava
// perto do limite quando a emissão já estourava — avisa assim que a tela
// de emissão abre, com link direto pra Financeiro (onde dá pra ver addon
// avulso e considerar upgrade).
async function avisarLimiteDoPlano(){
  const box=qs('#emit-limite-aviso'),texto=qs('#emit-limite-texto');if(!box||!texto)return;
  try{
    const data=await api('/api/invoices/consumption');
    if(!data.plan||!data.warning){box.style.display='none';return}
    texto.innerHTML=`Você já usou <b>${data.used} de ${data.plan.limit}</b> notas do ${esc(data.plan.name)} este mês (${Math.round(data.used/data.plan.limit*100)}%). <button class="btn btn-s" type="button" onclick="go('financeiro',qs('.sb-link[onclick*=&quot;financeiro&quot;]'))">Ver plano e ferramentas avulsas</button>`;
    box.style.display='';
  }catch{box.style.display='none'}
}
async function carregarBilling(){
  const box=qs('#billing-status'),list=qs('#billing-charges');if(!box||!list)return;
  try{const data=await api('/api/billing/status');const plan=data.plan?`${esc(data.plan.name)} · ${data.plan.monthlyLimit} notas/mês · R$ ${(data.plan.priceCents/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'Plano ainda não configurado';const addons=data.addons?.length?`<ul class="hint" style="margin:4px 0 0;padding-left:18px">${data.addons.map(a=>`<li>${esc(a.name)} avulso · R$ ${(a.priceCents/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}/mês</li>`).join('')}</ul>`:'';const total=data.plan?`<p class="hint" style="margin-top:6px"><b>Total mensal: R$ ${((data.totalCents||0)/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b></p>`:'';box.innerHTML=`<b>${plan}</b>${addons}${total}<p class="hint">Status: ${esc(data.company?.billing_status||'trial')}${data.access?.blocked?' · emissão bloqueada por atraso':''}</p>${data.configured?'':'<div class="alert a-info">A integração Nubank está aguardando credenciais PJ no ambiente seguro.</div>'}`;list.innerHTML=data.charges?.length?data.charges.map(item=>`<div class="draft-item"><b>${esc(item.method)} · ${esc(item.status)}</b><span>R$ ${(Number(item.amount_cents||0)/100).toLocaleString('pt-BR',{minimumFractionDigits:2})} · vence ${new Date(item.due_at).toLocaleDateString('pt-BR')}</span>${item.pix_copy_paste?`<div class="hint mono">${esc(item.pix_copy_paste)}</div>`:''}</div>`).join(''):'<div class="empty-state">Nenhuma cobrança emitida.</div>'}catch(error){box.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;list.innerHTML=''}
}
async function gerarCobranca(){
  const method=qs('#billing-method').value,due=qs('#billing-due').value||undefined;try{const data=await api('/api/billing/charges',{method:'POST',body:JSON.stringify({method,dueDate:due})});alert('Cobrança oficial criada.');await carregarBilling()}catch(error){alert(error.message)}
}
/* ---------- DASN-SIMEI (tela do desenho aprovado, 20/08/2026) ------------ */
const DASN_MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
// De onde veio o valor do mês. A ordem importa: o que o TITAN emitiu manda,
// porque é nota fiscal própria; ajuste manual só aparece quando é a única
// origem, senão o usuário acha que o número dele substituiu a nota.
function fonteDoMes(porOrigem){
  const o=porOrigem||{};
  if(Number(o.titan)>0)return 'TITAN';
  if(Number(o.portal)>0)return 'Importado';
  if(Number(o.external_xml)>0)return 'XML externo';
  if(Number(o.manual)>0)return 'Manual';
  return '—';
}
async function carregarDasn(){
  const year=qs('#dasn-year');if(!year)return;
  if(!year.value)year.value=String(new Date().getFullYear());
  if(!qs('#dasn-month').value)qs('#dasn-month').value=String(new Date().getMonth()+1);
  const corpo=qs('#dasn-list');
  try{
    const data=await api('/api/dasn?year='+encodeURIComponent(year.value));
    qs('#dasn-total').textContent='R$ '+brl(Number(data.total||0));
    const rotulo=qs('#dasn-ano-label');if(rotulo)rotulo.textContent=String(data.year||year.value);
    // O aviso do backend existe para o número não enganar quem declara: sem
    // certificado o Portal não devolve a receita anterior ao cadastro, e o
    // total apareceria silenciosamente incompleto.
    const aviso=qs('#dasn-aviso'),textoAviso=data.consolidacao?.aviso||data.consolidacao?.avisos?.join(' ')||'';
    if(aviso){aviso.style.display=textoAviso?'':'none';aviso.textContent=textoAviso}
    // Os 12 meses SEMPRE, inclusive os vazios: quem declara precisa enxergar
    // o que ainda falta preencher, não só o que já tem valor.
    const meses=data.consolidacao?.meses||[];
    corpo.innerHTML=DASN_MESES.map((nome,i)=>{
      const m=meses.find(x=>Number(x.mes)===i+1)||{total:0,porOrigem:{}};
      const valor=Number(m.total||0),temValor=valor>0;
      const situacao=temValor?'<span class="pill p-ok">Ativa</span>':'<span class="hint">—</span>';
      const manual=Number(m.porOrigem?.manual)>0;
      const excluir=manual?`<button class="ico-btn danger" title="Remover o lançamento manual deste mês" onclick="removerDasnManual(${data.year||year.value},${i+1})">×</button>`:'';
      return `<tr>
        <td data-th="Mês">${nome}</td>
        <td class="r" data-th="Receita bruta">${brl(valor)}</td>
        <td data-th="Situação">${situacao}</td>
        <td data-th="Fonte">${esc(fonteDoMes(m.porOrigem))}</td>
        <td class="r" data-th="Ações"><div class="acts"><button class="ico-btn" title="Editar este mês" onclick="editarMesDasn(${i+1},${valor})">✎</button>${excluir}</div></td>
      </tr>`;
    }).join('');
  }catch(error){corpo.innerHTML=`<tr><td colspan="5"><div class="empty-state">${esc(error.message)}</div></td></tr>`}
}
/** Leva o mês para o formulário da esquerda, já preenchido. */
function editarMesDasn(mes,valor){
  qs('#dasn-month').value=String(mes);
  qs('#dasn-amount').value=brl(Number(valor||0));
  qs('#dasn-notes').value='';
  qs('#dasn-amount').focus();
}
async function salvarDasnManual(){
  const year=Number(qs('#dasn-year').value),month=Number(qs('#dasn-month').value),amount=dinheiro(qs('#dasn-amount').value);
  const notes=qs('#dasn-notes')?.value.trim()||undefined;
  if(!year||month<1||month>12||amount<0){alert('Informe ano, mês e valor válidos.');return}
  try{
    await api('/api/dasn/manual',{method:'POST',body:JSON.stringify({year,month,amount,notes})});
    qs('#dasn-amount').value='0,00';if(qs('#dasn-notes'))qs('#dasn-notes').value='';
    await carregarDasn();alert('Valor salvo.');
  }catch(error){alert(error.message)}
}
async function removerDasnManual(year,month){
  if(!await titanConfirm(`Remover o lançamento manual de ${DASN_MESES[month-1]}/${year}?\n\nO que foi emitido pelo TITAN e o que veio do Portal continuam contando.`,'Remover lançamento','err'))return;
  // Sem rota de exclusão: gravar zero é o ajuste que o backend entende, e
  // preserva o histórico de quem mexeu — apagar a linha apagaria isso.
  try{await api('/api/dasn/manual',{method:'POST',body:JSON.stringify({year,month,amount:0,notes:'Lançamento manual zerado pelo usuário.'})});await carregarDasn()}
  catch(error){alert(error.message)}
}
async function importarDasnDoPortal(){
  const btn=qs('#dasn-import-btn'),year=Number(qs('#dasn-year').value)||new Date().getFullYear();
  if(btn)btn.disabled=true;
  try{
    const r=await api('/api/dasn/importar-portal',{method:'POST',body:JSON.stringify({year})});
    await carregarDasn();
    alert(r?.mensagem||`Importação concluída para ${year}.`);
  }catch(error){alert(error.message)}
  finally{if(btn)btn.disabled=false}
}
async function baixarDasnPdf(){
  const year=Number(qs('#dasn-year').value)||new Date().getFullYear();
  // apiDownload carrega a sessão; abrir a URL direto no navegador cairia em
  // 401, porque o token não viaja numa navegação comum.
  try{await apiDownload('/api/dasn/rascunho.pdf?year='+encodeURIComponent(year),`DASN-SIMEI ${year} (rascunho).pdf`)}
  catch(error){alert(error.message)}
}

// Logs da API — pedido do usuário (16/08/2026): a tela existia desde antes
// mas nunca foi ligada (sempre mostrava "0 requisições"). GET /api/invoices/logs
// junta o que já era gravado em invoices.request_xml/response_xml (emissão)
// e invoice_events (cancelamento) das últimas 24h — nenhum log novo, só
// exibição do que já existia. origem 'martyn' identifica o que veio do
// WhatsApp (Martyn); o que falhou aqui é o mesmo evento que já dispara o
// alerta técnico da Carmen por e-mail, não um segundo mecanismo.
function logApiOrigemLabel(origem){return origem==='martyn'?'Martyn (WhatsApp)':'Portal'}
function logApiTipoLabel(tipo){return tipo==='cancelamento'?'Cancelamento':'Emissão'}
function logApiStatusInfo(status){
  if(status==='authorized')return{classe:'p-ok',texto:'Autorizada'};
  if(status==='accepted')return{classe:'p-ok',texto:'Aceito'};
  if(status==='sending')return{classe:'p-warn',texto:'Enviando'};
  if(status==='rejected')return{classe:'p-err',texto:'Rejeitada'};
  if(status==='error')return{classe:'p-err',texto:'Erro técnico'};
  return{classe:'p-off',texto:esc(status)};
}
async function carregarLogsApi(){
  const pill=qs('#logs-count'),body=qs('#logs-body');
  if(!pill||!body)return;
  try{
    const data=await api('/api/invoices/logs');
    const logs=data.logs||[];
    pill.className='pill right '+(logs.length?'p-ok':'p-off');
    pill.textContent=`${logs.length} requisiç${logs.length===1?'ão':'ões'}`;
    if(!logs.length){body.innerHTML='<pre class="mono" style="color:#66768f;font-size:11px;line-height:1.85;overflow-x:auto;white-space:pre">Aguardando a primeira integração.\nNenhuma requisição foi enviada à Sefin Nacional nas últimas 24h.</pre>';return}
    body.innerHTML=logs.map(log=>{
      const quando=new Date(log.quando).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      const status=logApiStatusInfo(log.status);
      const identificador=log.nfseNumber?`nNFSe ${esc(log.nfseNumber)}`:`DPS ${esc(log.dpsNumber??'—')}`;
      const corpo=(rotulo,info)=>info?.corpo?`<details style="margin-top:6px"><summary style="cursor:pointer;color:var(--brand);font-size:12px">${rotulo}${info.truncado?' (truncado)':''}</summary><pre class="mono" style="color:#66768f;font-size:11px;line-height:1.6;overflow-x:auto;white-space:pre-wrap;margin-top:4px">${esc(info.corpo)}</pre></details>`:'';
      return `<div class="draft-item">
        <b>${quando} · ${logApiTipoLabel(log.tipo)} · ${identificador}</b>
        <span><span class="pill ${status.classe}">${status.texto}</span> · ${logApiOrigemLabel(log.origem)}${log.resumo?' · '+esc(log.resumo):''}</span>
        ${corpo('Ver requisição enviada',log.request)}
        ${corpo('Ver resposta da Sefin',log.response)}
      </div>`;
    }).join('');
  }catch(error){
    pill.className='pill right p-off';pill.textContent='0 requisições';
    body.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;
  }
}
['li-cnpj','li-mail','li-pw'].forEach(id=>qs('#'+id)?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();iniciarCadastro()}}));

async function carregarEmpresaServidor(){
  let row;
  try{row=await api('/api/company')}catch(error){
    if(error.code==='ACCOUNT_RESTRICTED'){aplicarModoRestrito(true);empresaAtual=null;return}
    throw error;
  }
  aplicarModoRestrito(false);
  if(!row){empresaAtual=null;return}
  const regimes={regular:'Lucro Presumido',mei:'MEI',simples:'Simples Nacional — ME'};
  empresaAtual={rs:row.legal_name,cnpj:row.federal_tax_id,im:row.municipal_registration||'',regime:row.tax_regime,reg:regimes[row.tax_regime]||'Lucro Presumido',mun:row.municipality_code,municipio:row.city&&row.state?`${row.city}/${row.state}`:row.municipality_code,endereco:row.address||'',postalCode:row.postal_code||'',street:row.street||'',number:row.number||'',complement:row.complement||'',district:row.district||'',city:row.city||'',state:row.state||'',email:row.email||'',contador:row.accountant_email||'',phone:row.phone||'',whatsapp:row.whatsapp_phone||'',series:Number(row.dps_series)||1,next:String(row.next_dps_number||1),simpleAp:[1,2].includes(Number(row.simple_assessment_regime))?Number(row.simple_assessment_regime):1,simpleTotal:row.simple_total_tax_rate==null?'':Number(row.simple_total_tax_rate),taxFed:row.total_tax_rate_federal==null?'':Number(row.total_tax_rate_federal),taxEst:row.total_tax_rate_state==null?'':Number(row.total_tax_rate_state),taxMun:row.total_tax_rate_municipal==null?'':Number(row.total_tax_rate_municipal),special:Number(row.special_tax_regime)||0};
  const ibscbsAviso=qs('#emit-ibscbs-aviso');if(ibscbsAviso)ibscbsAviso.style.display=empresaAtual.regime==='regular'?'flex':'none';
  qs('#e-email').value=empresaAtual.email;qs('#e-contador').value=empresaAtual.contador||'';qs('#e-phone').value=empresaAtual.phone;qs('#e-zap').value=empresaAtual.whatsapp;
  const logo=qs('#e-logo-preview');if(logo&&row.commercial_logo_data){logo.src=row.commercial_logo_data;logo.style.display='block'}
  localStorage.setItem(STORAGE_EMPRESA,JSON.stringify(empresaAtual));
}

async function carregarNotasServidor(){
  const [rows]=await Promise.all([
    api('/api/invoices'),
    api('/api/dashboard').then(dados=>{dashboardStats=dados}).catch(()=>{dashboardStats=null})
  ]);
  notas.splice(0,notas.length,...rows.map(row=>({
    id:row.id,key:row.access_key,n:row.nfse_number||row.dps_number,date:row.created_at,d:new Date(row.created_at).toLocaleDateString('pt-BR'),t:row.borrower_name,
    s:row.service_description,v:Number(row.amount),st:row.status==='authorized'?'ok':row.status==='canceled'?'canc':row.status==='rejected'||row.status==='error'?'err':'proc',emailTo:row.email_to||'',emailSentAt:row.email_sent_at||'',emailProviderId:row.email_provider_id||'',emailLastError:row.email_last_error||'',
    syncedAt:row.fiscal_synced_at||'',syncDivergent:!!row.fiscal_sync_divergent,
    comp:(row.competence_date||'').slice(0,7)
  })));
  tabelas();chart();renderDashboard();
}

/* ---------- clientes / consulta CNPJ ---------- */
let clientesEncontrados=[];
let clienteAtualEmissao=null;
let buscaClienteTimer;
const origemCliente={portal_nacional:'Portal Nacional',cnpj_api:'BrasilAPI',emission_history:'Histórico de notas',manual:'Cadastro manual'};

const CAMPOS_TOMADOR_TRAVAVEIS=['t-nome','t-tipo','t-cidade','t-uf','t-cep','t-municipio','t-end','t-num','t-bairro','t-comp'];
let tomadorTravadoDoc='';
function travarTomador(locked){
  CAMPOS_TOMADOR_TRAVAVEIS.forEach(id=>{
    const el=qs('#'+id);if(!el)return;
    if(el.tagName==='SELECT')el.disabled=locked;else el.readOnly=locked;
  });
  const hint=qs('#t-lock-hint');if(hint)hint.style.display=locked?'':'none';
  if(!locked)tomadorTravadoDoc='';
  atualizarResumoEnderecoTomador();
  const block=qs('#t-address-block'),toggle=qs('#t-address-toggle');
  if(block)block.style.display=locked?'none':'';
  if(toggle)toggle.textContent=locked?'Mostrar endereço':'Ocultar endereço';
}
function alternarEnderecoTomador(){
  const block=qs('#t-address-block'),toggle=qs('#t-address-toggle');if(!block||!toggle)return;
  const abrir=block.style.display==='none';
  block.style.display=abrir?'':'none';
  toggle.textContent=abrir?'Ocultar endereço':'Mostrar endereço';
}
function atualizarResumoEnderecoTomador(){
  const el=qs('#t-address-summary');if(!el)return;
  const linha1=[qs('#t-end')?.value,qs('#t-num')?.value].filter(Boolean).join(', ');
  const linha2=[qs('#t-bairro')?.value,[qs('#t-cidade')?.value,qs('#t-uf')?.value].filter(Boolean).join('/')].filter(Boolean).join(' — ');
  el.textContent=[linha1,linha2].filter(Boolean).join(' · ')||'Endereço ainda não informado.';
}
function preencherCliente(cliente){
  clienteAtualEmissao=cliente?.id?cliente:null;
  qs('#t-doc').value=cliente.tax_id||'';
  qs('#t-nome').value=cliente.legal_name||cliente.trade_name||'';
  qs('#t-mail').value=cliente.email||'';
  qs('#t-zap').value=cliente.phone||'';
  qs('#t-tipo').selectedIndex=normalizarDocumento(cliente.tax_id).length===11?1:0;
  qs('#t-cidade').value=cliente.city||cliente.municipality||'';
  qs('#t-uf').value=cliente.state||'';
  qs('#t-cep').value=cliente.postal_code||'';
  qs('#t-municipio').value=cliente.municipality_code||'';
  qs('#t-end').value=cliente.street||'';
  qs('#t-num').value=cliente.number||'';
  qs('#t-bairro').value=cliente.district||'';
  qs('#t-comp').value=cliente.complement||'';
  qs('#customer-results').classList.remove('on');
  carregarSugestoesTomador().catch(()=>{});
  // Dados vieram de um cadastro (busca de CNPJ, carteira de clientes ou conversão
  // de orçamento/O.S.) - trava tudo exceto e-mail, whatsapp e o próprio documento,
  // para o endereço/município da nota nunca divergir do cadastro oficial do cliente.
  tomadorTravadoDoc=qs('#t-doc').value;
  travarTomador(true);
}
qs('#t-doc').addEventListener('input',()=>{
  if(tomadorTravadoDoc&&qs('#t-doc').value!==tomadorTravadoDoc)travarTomador(false);
});

async function carregarSugestoesTomador(){
  const cno=qs('#s-cno-options'),codes=qs('#s-event-code-options'),locations=qs('#s-event-location-options');
  if(cno)cno.innerHTML='';if(codes)codes.innerHTML='';if(locations)locations.innerHTML='';
  if(!clienteAtualEmissao?.id)return;
  const [cnos,events]=await Promise.all([api('/api/customers/'+clienteAtualEmissao.id+'/cnos'),api('/api/customers/'+clienteAtualEmissao.id+'/events')]);
  if(cno)cno.innerHTML=(cnos.items||[]).map(item=>`<option value="${esc(item.cno)}"></option>`).join('');
  if(codes)codes.innerHTML=(events.items||[]).map(item=>`<option value="${esc(item.event_code)}"></option>`).join('');
  if(locations)locations.innerHTML=[...new Set((events.items||[]).map(item=>item.event_location).filter(Boolean))].map(value=>`<option value="${esc(value)}"></option>`).join('');
}

let municipioTimer;
let municipiosCatalogo=[];
let municipiosCatalogoPromise=null;
function carregarMunicipiosCatalogo(){
  if(!municipiosCatalogoPromise)municipiosCatalogoPromise=api('/api/locations/municipalities?all=1').then(rows=>{municipiosCatalogo=Array.isArray(rows)?rows:[]}).catch(error=>{municipiosCatalogoPromise=null;throw error});
  return municipiosCatalogoPromise;
}
async function pesquisarMunicipio(tipo){
  const input=qs(`#${tipo}-mun-search`),box=qs(`#${tipo}-mun-results`),term=input.value.trim();
  clearTimeout(municipioTimer);
  if(term.length<2){box.classList.remove('on');return}
  box.innerHTML='<div class="empty-state" style="padding:12px">Buscando municípios...</div>';box.classList.add('on');
  municipioTimer=setTimeout(async()=>{
    try{
      await carregarMunicipiosCatalogo();
      const q=supNorm(term),digits=term.replace(/\D/g,'');
      const rows=municipiosCatalogo.filter(row=>(digits&&row.code.includes(digits))||supNorm(`${row.name} ${row.state}`).includes(q)).slice(0,25);
      box.innerHTML=rows.length?rows.map(row=>`<button type="button" class="municipality-option" onclick="selecionarMunicipioPorCodigo('${tipo}','${row.code}')"><b>${esc(row.name)}/${esc(row.state)}</b><br><span class="mono">${esc(row.code)}</span></button>`).join(''):'<div class="empty-state" style="padding:12px">Nenhum município encontrado.</div>';
    }catch(error){box.innerHTML=`<div class="empty-state" style="padding:12px">Catálogo de municípios indisponível no momento — tente novamente em instantes.</div>`}
  },200);
}
function selecionarMunicipioPorCodigo(tipo,code){
  const row=municipiosCatalogo.find(r=>r.code===code);
  if(row)selecionarMunicipio(tipo,row);
}
function selecionarMunicipio(tipo,row){
  qs(`#${tipo}-mun`).value=row.code;qs(`#${tipo}-mun-search`).value=`${row.name}/${row.state} — ${row.code}`;qs(`#${tipo}-mun-results`).classList.remove('on');
  if(tipo==='e')empresaAtual={...(empresaAtual||{}),city:row.name,state:row.state,municipio:`${row.name}/${row.state}`};
  if(tipo==='s')lerParametros();else checarHabilitacao();
}
async function exibirMunicipioPorCodigo(tipo,code){
  if(!code)return;
  try{
    await carregarMunicipiosCatalogo();
    const row=municipiosCatalogo.find(item=>item.code===String(code));
    if(row)selecionarMunicipio(tipo,row);else qs(`#${tipo}-mun-search`).value=code;
  }catch{qs(`#${tipo}-mun-search`).value=code}
}

/* ---------- cIndOp (Anexo VII IndOp IBSCBS) — mesmo padrão de pesquisarMunicipio ---------- */
let indOpTimer;
let indOpCatalogo=[];
let indOpCatalogoPromise=null;
function carregarIndOpCatalogo(){
  if(!indOpCatalogoPromise)indOpCatalogoPromise=api('/api/services/ibscbs-indop').then(data=>{indOpCatalogo=Array.isArray(data?.items)?data.items:[]}).catch(error=>{indOpCatalogoPromise=null;throw error});
  return indOpCatalogoPromise;
}
// Etapa 3 (19/08/2026): o cIndOp saiu da emissão e vive no cadastro do
// serviço. O usuário achou que o campo não existia — ele existia, mas só
// reagia depois de 2 caracteres digitados, sem nada visível pra clicar. Agora
// abre a lista inteira ao clicar no campo, e digitar só filtra.
async function pesquisarIndOpCadastro(){
  const input=qs('#cad-ibscbs-indop-search'),box=qs('#cad-ibscbs-indop-results');
  if(!input||!box)return;
  const term=input.value.trim();
  clearTimeout(indOpTimer);
  box.innerHTML='<div class="empty-state" style="padding:12px">Buscando...</div>';box.classList.add('on');
  indOpTimer=setTimeout(async()=>{
    try{
      await carregarIndOpCatalogo();
      const q=supNorm(term),digitos=term.replace(/\D/g,'');
      const rows=(term?indOpCatalogo.filter(row=>(digitos&&row.cIndOp.includes(digitos))||supNorm(`${row.tipoOperacao||''} ${row.caracteristicaFornecimento||''}`).includes(q)):indOpCatalogo).slice(0,25);
      box.innerHTML=rows.length?rows.map(row=>`<button type="button" class="municipality-option" onclick="selecionarIndOpPorCodigo('${row.cIndOp}')"><b>${esc(row.tipoOperacao||row.cIndOp)}</b><br><span class="mono">${esc(row.cIndOp)}</span> — ${esc(row.localFornecimentoIdentificar||'')}</button>`).join(''):'<div class="empty-state" style="padding:12px">Nenhum código encontrado.</div>';
    }catch(error){box.innerHTML='<div class="empty-state" style="padding:12px">Catálogo indisponível no momento — tente novamente em instantes.</div>'}
  },200);
}
// Repõe o cIndOp salvo ao abrir um serviço para edição — precisa do catálogo
// carregado para mostrar o nome, então é assíncrono e silencioso: falhar aqui
// não pode impedir a edição do resto do cadastro.
async function exibirIndOpCadastroPorCodigo(code){
  const hidden=qs('#cad-ibscbs-indop'),busca=qs('#cad-ibscbs-indop-search');
  if(!hidden||!busca)return;
  hidden.value=code||'';busca.value=code||'';
  if(!code)return;
  try{await carregarIndOpCatalogo();const row=indOpCatalogo.find(r=>r.cIndOp===code);if(row)busca.value=`${row.tipoOperacao||row.cIndOp} — ${row.cIndOp}`;}catch(error){}
}
function selecionarIndOpPorCodigo(code){
  const row=indOpCatalogo.find(r=>r.cIndOp===code);
  if(!row)return;
  qs('#cad-ibscbs-indop').value=row.cIndOp;
  qs('#cad-ibscbs-indop-search').value=`${row.tipoOperacao||row.cIndOp} — ${row.cIndOp}`;
  qs('#cad-ibscbs-indop-results').classList.remove('on');
}

/* ---------- CST/cClassTrib IBS/CBS (Meus Serviços) — mesmo padrão de pesquisarMunicipio ---------- */
let ibscbsClassifTimer;
let ibscbsClassifCatalogo=[];
let ibscbsClassifCatalogoPromise=null;
function carregarIbscbsClassificacoesCatalogo(){
  if(!ibscbsClassifCatalogoPromise)ibscbsClassifCatalogoPromise=api('/api/services/ibscbs-classificacoes').then(data=>{ibscbsClassifCatalogo=Array.isArray(data?.items)?data.items:[]}).catch(error=>{ibscbsClassifCatalogoPromise=null;throw error});
  return ibscbsClassifCatalogoPromise;
}
async function pesquisarIbscbsClassificacao(){
  const input=qs('#cad-ibscbs-search'),box=qs('#cad-ibscbs-results'),term=input.value.trim();
  clearTimeout(ibscbsClassifTimer);
  if(term.length<2){box.classList.remove('on');return}
  box.innerHTML='<div class="empty-state" style="padding:12px">Buscando...</div>';box.classList.add('on');
  ibscbsClassifTimer=setTimeout(async()=>{
    try{
      await carregarIbscbsClassificacoesCatalogo();
      const q=supNorm(term),digits=term.replace(/\D/g,'');
      const rows=ibscbsClassifCatalogo.filter(row=>(digits&&(row.cst.includes(digits)||row.cClassTrib.includes(digits)))||supNorm(row.name||'').includes(q)).slice(0,25);
      box.innerHTML=rows.length?rows.map(row=>`<button type="button" class="municipality-option" onclick="selecionarIbscbsClassificacao('${row.cst}','${row.cClassTrib}')"><b>${esc(row.name||'')}</b><br><span class="mono">CST ${esc(row.cst)} · cClassTrib ${esc(row.cClassTrib)}</span></button>`).join(''):'<div class="empty-state" style="padding:12px">Nenhuma classificação encontrada.</div>';
    }catch(error){box.innerHTML='<div class="empty-state" style="padding:12px">Catálogo indisponível no momento — tente novamente em instantes.</div>'}
  },200);
}
function selecionarIbscbsClassificacao(cst,classTrib){
  qs('#cad-ibscbs-cst').value=cst;qs('#cad-ibscbs-classtrib').value=classTrib;
  const row=ibscbsClassifCatalogo.find(r=>r.cst===cst&&r.cClassTrib===classTrib);
  qs('#cad-ibscbs-search').value=row?`${row.name} — CST ${cst} · cClassTrib ${classTrib}`:`CST ${cst} · cClassTrib ${classTrib}`;
  qs('#cad-ibscbs-results').classList.remove('on');
}
async function exibirIbscbsClassificacaoPorCodigo(cst,classTrib){
  if(!cst||!classTrib){qs('#cad-ibscbs-search').value='';return}
  try{await carregarIbscbsClassificacoesCatalogo();selecionarIbscbsClassificacao(cst,classTrib);}
  catch{qs('#cad-ibscbs-search').value=`CST ${cst} · cClassTrib ${classTrib}`}
}

function formatarCnpj(value){
  const characters=normalizarDocumento(value);
  return characters.length===14?characters.replace(/^(.{2})(.{3})(.{3})(.{4})(\d{2})$/,'$1.$2.$3/$4-$5'):value;
}
qs('#e-cnpj').addEventListener('blur',()=>{qs('#e-cnpj').value=formatarCnpj(qs('#e-cnpj').value)});

async function consultarCnpjEmitente(){
  const cnpj=normalizarDocumento(qs('#e-cnpj').value);
  if(!cnpjComFormatoValido(cnpj)){alert('Informe o CNPJ com 14 caracteres válidos para fazer a consulta pública.');qs('#e-cnpj').focus();return}
  const button=qs('#btn-e-cnpj'),hint=qs('#e-cnpj-hint');
  button.disabled=true;button.textContent='Buscando...';hint.textContent='Consultando a base pública de CNPJ...';
  try{
    const empresa=await api('/api/company/lookup/cnpj/'+cnpj);
    qs('#e-cnpj').value=formatarCnpj(empresa.federalTaxId);
    qs('#e-rs').value=empresa.legalName||'';
    qs('#e-mun').value=empresa.municipalityCode||'';
    exibirMunicipioPorCodigo('e',empresa.municipalityCode);
    qs('#e-end').value=empresa.address||'';
    if(empresa.email)qs('#e-email').value=empresa.email;
    if(empresa.phone)qs('#e-phone').value=empresa.phone;
    empresaAtual={...(empresaAtual||{}),rs:empresa.legalName||'',cnpj:empresa.federalTaxId||cnpj,mun:empresa.municipalityCode||'',municipio:[empresa.municipality,empresa.state].filter(Boolean).join('/'),endereco:empresa.address||'',postalCode:empresa.postalCode||'',street:empresa.street||'',number:empresa.number||'',complement:empresa.complement||'',district:empresa.district||'',city:empresa.municipality||'',state:empresa.state||'',email:empresa.email||empresaAtual?.email||'',phone:empresa.phone||empresaAtual?.phone||''};
    hint.textContent=`Dados preenchidos: ${[empresa.municipality,empresa.state].filter(Boolean).join('/')||'município não informado'}. Revise a inscrição municipal e o regime tributário.`;
  }catch(error){hint.textContent=error.message;alert(error.message)}
  finally{button.disabled=false;button.textContent='Buscar CNPJ'}
}
async function salvarLogoComercial(input){
  const file=input.files?.[0];if(!file)return;if(!/^image\/(png|jpeg)$/.test(file.type)||file.size>1_800_000){alert('Use uma imagem PNG ou JPEG de até 1,8 MB.');input.value='';return}
  const reader=new FileReader();reader.onload=async()=>{try{const dataUrl=String(reader.result||'');const result=await api('/api/company/logo',{method:'PUT',body:JSON.stringify({dataUrl})});const preview=qs('#e-logo-preview');if(preview){preview.src=result.dataUrl;preview.style.display='block'}alert('Logotipo comercial salvo. Ele será usado nos PDFs de orçamentos e O.S.')}catch(error){alert(error.message)}};reader.readAsDataURL(file);
}

function selecionarCliente(index){
  const cliente=clientesEncontrados[index];
  if(!cliente)return;
  preencherCliente(cliente);
  completarClienteSelecionado(cliente);
}
/**
 * Pedido do usuário (19/08/2026): "quando eu clico em clientes do portal e
 * seleciono o cadastro, ele já tem que buscar o CNPJ sozinho — não preciso
 * ficar buscando o CNPJ de novo. Quanto menor o trabalho do cliente, melhor."
 *
 * Cliente vindo do histórico de emissões ou do Portal Nacional chega só com
 * nome e documento; era o usuário quem clicava "Buscar CNPJ" pra completar.
 * Agora a consulta sai sozinha quando falta algo que a nota precisa
 * (município, endereço) ou o regime tributário — que a partir de hoje é o que
 * dispensa a pergunta "qual o regime do tomador?" na conferência com o Martyn.
 *
 * Silencioso de propósito em caso de falha: a BrasilAPI fora do ar não pode
 * travar a emissão, e o que já estava preenchido continua valendo.
 */
async function completarClienteSelecionado(cliente){
  const cnpj=normalizarDocumento(cliente.tax_id||'');
  if(!cnpjComFormatoValido(cnpj))return;
  const completo=cliente.municipality_code&&cliente.street&&cliente.tax_regime;
  if(completo)return;
  const hint=qs('#cnpj-hint');
  if(hint)hint.textContent='Completando os dados deste cliente na base pública...';
  try{
    const atualizado=await api('/api/customers/cnpj/'+cnpj);
    // O usuário pode ter trocado de cliente enquanto a consulta ia e voltava.
    if(normalizarDocumento(qs('#t-doc').value)!==cnpj)return;
    preencherCliente(atualizado);
    if(hint)hint.textContent='Cadastro completado automaticamente.';
  }catch(error){
    if(hint)hint.textContent='';
  }
}

async function buscarClientes(force=false){
  const query=qs('#t-nome').value.trim();
  const box=qs('#customer-results');
  if(!force&&query.length<2){box.classList.remove('on');return}
  box.innerHTML='<div class="empty-state" style="padding:15px">Buscando cadastros...</div>';box.classList.add('on');
  try{
    clientesEncontrados=await api('/api/customers?search='+encodeURIComponent(query));
    if(!clientesEncontrados.length){box.innerHTML='<div class="empty-state" style="padding:15px">Nenhum cliente encontrado na carteira.</div>';return}
    box.innerHTML=clientesEncontrados.map((cliente,index)=>`
      <button type="button" class="customer-option" onclick="selecionarCliente(${index})">
        <b>${esc(cliente.legal_name)}</b>
        <span>${esc(cliente.tax_id)} · ${esc(origemCliente[cliente.source]||cliente.source)}</span>
      </button>`).join('');
  }catch(error){box.innerHTML=`<div class="empty-state" style="padding:15px">${esc(error.message)}</div>`}
}

function abrirClientesPortal(){
  qs('#t-nome').focus();
  buscarClientes(true);
}

async function consultarCnpj(){
  const cnpj=normalizarDocumento(qs('#t-doc').value);
  if(!cnpjComFormatoValido(cnpj)){alert('Informe o CNPJ com 14 caracteres válidos para fazer a consulta pública.');return}
  const button=qs('#btn-cnpj'),hint=qs('#cnpj-hint');
  button.disabled=true;button.textContent='Buscando...';hint.textContent='Consultando a base pública de CNPJ...';
  try{
    const cliente=await api('/api/customers/cnpj/'+cnpj);
    preencherCliente(cliente);
    hint.textContent='Dados localizados e adicionados à carteira de clientes.';
  }catch(error){hint.textContent=error.message;alert(error.message)}
  finally{button.disabled=false;button.textContent='Buscar CNPJ'}
}
// Ao abrir um rascunho, completa pela API do CNPJ só os campos do tomador que
// ficaram vazios (e-mail, endereço, município), sem sobrescrever o que já veio.
async function completarCadastroRascunho(){
  const cnpj=normalizarDocumento(qs('#t-doc')?.value);
  if(!cnpjComFormatoValido(cnpj))return;
  if((qs('#t-mail')?.value||'').trim()&&(qs('#t-end')?.value||'').trim()&&(qs('#t-municipio')?.value||'').trim())return;
  try{
    const c=await api('/api/customers/cnpj/'+cnpj);
    const setIf=(id,val)=>{const el=qs(id);if(el&&!String(el.value||'').trim()&&val)el.value=String(val);};
    setIf('#t-nome',c.legal_name||c.trade_name);setIf('#t-mail',c.email);setIf('#t-zap',c.phone);
    setIf('#t-cidade',c.city||c.municipality);setIf('#t-uf',c.state);
    setIf('#t-cep',c.postal_code);setIf('#t-end',c.street);setIf('#t-num',c.number);setIf('#t-bairro',c.district);setIf('#t-comp',c.complement);setIf('#t-municipio',c.municipality_code);
    lerParametros();
  }catch(e){}
}

qs('#t-nome').addEventListener('input',()=>{atualizarEstadoBotaoEmitir();clearTimeout(buscaClienteTimer);buscaClienteTimer=setTimeout(()=>buscarClientes(false),250)});
// Os passos 4 (Dados específicos), 5 (Retenções) e 6 (IBS/CBS) ficam
// escondidos por padrão e só aparecem conforme o serviço — antes os números
// dos badges eram fixos no HTML, então uma tela nova mostrava "1, 2, 3, 7"
// (achado do relatório de auditoria 13/08). Observa os 3 cards condicionais
// e renumera pelos que estão de fato visíveis a cada mudança de display.
function renumerarPassosEmissao(){
  let numero=0;
  document.querySelectorAll('.emit-step').forEach(badge=>{
    if(badge.offsetParent===null)return;
    numero++;
    badge.textContent=String(numero);
  });
}
['s-specific-card','s-ret-card'].forEach(id=>{
  const card=document.getElementById(id);
  if(card)new MutationObserver(renumerarPassosEmissao).observe(card,{attributes:true,attributeFilter:['style']});
});
renumerarPassosEmissao();
qs('#t-nome').addEventListener('focus',()=>{if(qs('#t-nome').value.trim().length>=2)buscarClientes(false)});
qs('#t-nome').addEventListener('blur',()=>setTimeout(()=>qs('#customer-results').classList.remove('on'),180));
qs('#t-doc').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();consultarCnpj()}});

/* ---------- serviços nacionais e perfis ---------- */
let catalogoServicos=[];
let catalogoCadastro=[];
let nbsCatalogo=[];
let perfisServico=[];
let composicaoItens=[];
const dinheiro=value=>Number(String(value||'0').replace(/\./g,'').replace(',','.'))||0;
function formatarDinheiro(input){
  let raw=input.value.trim().replace(/R\$|\s/g,'');
  if(!raw){input.value='0,00';return}
  let normalized;
  if(raw.includes(','))normalized=raw.replace(/\./g,'').replace(',','.');
  else if((raw.match(/\./g)||[]).length===1&&raw.split('.')[1].length<=2)normalized=raw;
  else normalized=raw.replace(/\./g,'');
  const value=Number(normalized.replace(/[^\d.-]/g,''));
  input.value=Number.isFinite(value)?value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'0,00';
}
qsa('input.num').forEach(input=>{input.addEventListener('blur',()=>formatarDinheiro(input));input.addEventListener('focus',()=>input.select())});

// Alíquota combinada padrão do CSRF (PIS 0,65% + COFINS 3,00% + CSLL 1,00%
// = 4,65%, IN RFB 1234/2012) — só pro "destaque do imposto" informativo
// quando não há retenção, nunca pro cálculo que vai no XML.
const CSRF_ALIQUOTA_PADRAO=4.65,IRRF_ALIQUOTA_PADRAO=1.50;
function atualizarRetencaoPisCofins(prefix){
  const tipo=qs(`#${prefix}-ret-pc`)?.value||'';
  const bloco=qs(`#${prefix}-pis-cofins-fields`);
  const reteve=tipo!==''&&tipo!=='0';
  if(bloco)bloco.classList.toggle('on',reteve);
  if(!reteve){
    [`${prefix}-pc-base`,`${prefix}-pis-rate`,`${prefix}-cofins-rate`,`${prefix}-pis-amount`,`${prefix}-cofins-amount`,prefix==='s'?'s-ret-csll':'cad-csll'].forEach(id=>{const input=qs('#'+id);if(input)input.value='0,00'});
  }
  // Pedido do usuário (12/08/2026): sem retenção, ainda mostrar o imposto
  // "destacado" — só informativo, não entra no payload de emissão.
  const destaque=qs(`#${prefix}-pis-cofins-destaque`);
  if(destaque){
    const valorServico=prefix==='s'?dinheiro(qs('#s-val')?.value):dinheiro(qs('#cad-default-amount')?.value);
    if(!reteve&&valorServico>0){
      destaque.style.display='';
      destaque.textContent=`Imposto correspondente (CSRF não retido, à alíquota padrão de ${CSRF_ALIQUOTA_PADRAO.toFixed(2).replace('.',',')}%): R$ ${(valorServico*CSRF_ALIQUOTA_PADRAO/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} — apenas informativo, não é retido.`;
    }else destaque.style.display='none';
  }
}

function calcularPisCofins(prefix){
  const base=dinheiro(qs(`#${prefix}-pc-base`)?.value);
  const pis=dinheiro(qs(`#${prefix}-pis-rate`)?.value);
  const cofins=dinheiro(qs(`#${prefix}-cofins-rate`)?.value);
  const csll=dinheiro(qs(`#${prefix}-csll-rate`)?.value);
  const format=value=>value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  qs(`#${prefix}-pis-amount`).value=format(base*pis/100);
  qs(`#${prefix}-cofins-amount`).value=format(base*cofins/100);
  qs('#'+(prefix==='s'?'s-ret-csll':'cad-csll')).value=format(base*csll/100);
}

// Retenção de IRRF (NT07) — mesmo padrão de atualizarRetencaoPisCofins/
// calcularPisCofins, mas o campo do valor final não segue o padrão
// "${prefix}-algumacoisa" (é s-ret-irrf na emissão e cad-irrf no cadastro,
// nomes herdados de antes desta correção), por isso o pequeno if inline.
function atualizarRetencaoIrrf(prefix){
  const reteve=qs(`#${prefix}-ret-irrf-tipo`)?.value==='1';
  const bloco=qs(`#${prefix}-irrf-fields`);
  if(bloco)bloco.classList.toggle('on',reteve);
  const campoFinal=prefix==='s'?'s-ret-irrf':'cad-irrf';
  if(!reteve){
    [`${prefix}-irrf-base`,`${prefix}-irrf-rate`,campoFinal].forEach(id=>{const input=qs('#'+id);if(input)input.value='0,00'});
  }
  const destaque=qs(`#${prefix}-irrf-destaque`);
  if(destaque){
    const valorServico=prefix==='s'?dinheiro(qs('#s-val')?.value):dinheiro(qs('#cad-default-amount')?.value);
    if(!reteve&&valorServico>0){
      destaque.style.display='';
      destaque.textContent=`Imposto correspondente (IRRF não retido, à alíquota padrão de ${IRRF_ALIQUOTA_PADRAO.toFixed(2).replace('.',',')}%): R$ ${(valorServico*IRRF_ALIQUOTA_PADRAO/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} — apenas informativo, não é retido.`;
    }else destaque.style.display='none';
  }
}
function calcularIrrf(prefix){
  const base=dinheiro(qs(`#${prefix}-irrf-base`)?.value);
  const rate=dinheiro(qs(`#${prefix}-irrf-rate`)?.value);
  const format=value=>value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  qs('#'+(prefix==='s'?'s-ret-irrf':'cad-irrf')).value=format(base*rate/100);
}

async function carregarServicos(){
  // NBS não entra aqui de propósito: o campo diz "Pesquise o catálogo NBS",
  // mas antes os 920 itens (até 400 de uma vez) já vinham carregados sem
  // nenhuma ação do usuário (achado do relatório de auditoria 13/08) — agora
  // só carrega na primeira interação real, ver garantirNbsCarregado().
  const [catalogo]=await Promise.all([emVoo('services/catalog',()=>api('/api/services/catalog?limit=400')),carregarPerfisServico()]);
  catalogoServicos=catalogo.services;
  qs('#s-cod').innerHTML=catalogoServicos.map(item=>`<option value="${item.code}">${item.code.slice(0,2)}.${item.code.slice(2,4)}.${item.code.slice(4)} — ${esc(item.description)}</option>`).join('');
  if(catalogoServicos.some(item=>item.code==='170101'))qs('#s-cod').value='170101';
  atualizarCamposEspeciais();
  popularServicosAdicionais();
  buscarSugestoesNbsCodigo().catch(()=>{});
  lerParametros();
}

function popularServicosAdicionais(){
  const select=qs('#s-additional-service');if(!select)return;
  select.innerHTML='<option value="">Selecione um serviço adicional</option>'+perfisServico.map(item=>`<option value="${esc(item.id)}">${item.display_number?item.display_number+' — ':''}${esc(item.name)} · NBS ${esc(item.nbs_code)}</option>`).join('');
}
function lineTotalComposicao(item){return Number(((Number(item.quantity)||0)*(Number(item.unitAmount)||0)).toFixed(2))}
function renderComposicao(){
  const box=qs('#s-composition-lines');if(!box)return;
  box.innerHTML=composicaoItens.length?composicaoItens.map((item,index)=>`<div class="draft-item comp-line-single"><span class="comp-desc" title="${esc(item.description)}">${esc(item.description)}</span><input class="inp num" inputmode="decimal" value="${Number(item.quantity||0).toLocaleString('pt-BR',{maximumFractionDigits:3})}" oninput="editarQtdComposicao(${index},this.value)" aria-label="Quantidade de ${esc(item.description)}"><input class="inp num" inputmode="decimal" value="${Number(item.unitAmount||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}" oninput="editarUnitComposicao(${index},this.value)" aria-label="Valor unitário de ${esc(item.description)}"><span class="comp-line-total" id="comp-lt-${index}">R$ ${brl(lineTotalComposicao(item))}</span><button class="ico-btn danger" type="button" title="Remover" onclick="removerLinhaComposicao(${index})">×</button></div>`).join(''):'<div class="empty-state">Nenhum serviço adicional nesta nota.</div>';
}
function atualizarTotaisComposicao(){
  let soma=0;
  composicaoItens.forEach((item,i)=>{const lt=lineTotalComposicao(item);soma+=lt;const el=qs('#comp-lt-'+i);if(el)el.textContent='R$ '+brl(lt)});
  const total=soma;
  const campoValor=qs('#s-val');
  if(campoValor&&document.activeElement!==campoValor)campoValor.value=total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(qs('#s-composition-total'))qs('#s-composition-total').textContent=`R$ ${brl(total)}`;
  if(qs('#emit-side-total'))qs('#emit-side-total').textContent=`R$ ${brl(total)}`;
  lerParametros();
  atualizarEstadoBotaoEmitir();
}
// "Emitir direto" só habilita com tomador preenchido e total > 0 — antes só
// travava contra duplo clique, deixava clicável mesmo com R$0,00 e campos
// vazios (achado do relatório de auditoria 13/08).
function atualizarEstadoBotaoEmitir(){
  const btn=qs('#btn-emit');if(!btn)return;
  const semTomador=!qs('#t-nome')?.value.trim();
  const total=composicaoItens.reduce((soma,item)=>soma+lineTotalComposicao(item),0);
  const bloqueado=semTomador||total<=0;
  btn.disabled=bloqueado;
  btn.title=bloqueado?'Preencha o tomador e um valor maior que zero antes de emitir.':'';
}
function atualizarModoValorServico(){
  const campo=qs('#s-val'),label=qs('#s-val-label'),hint=qs('#s-val-hint');
  const multi=composicaoItens.length>1;
  if(campo)campo.readOnly=multi;
  if(label)label.textContent=multi?'Total desta nota (R$)':'Valor deste serviço (R$)';
  if(hint)hint.textContent=multi?'Soma dos serviços listados em "Serviços nessa nota" — edite cada linha lá.':'Valor referente ao serviço descrito acima. Para lançar outro serviço, use "+ Novo serviço desta mesma natureza".';
  const detail=qs('#s-composition-detail'),emptyHint=qs('#s-composition-empty-hint');
  if(detail)detail.style.display=multi?'':'none';
  if(emptyHint)emptyHint.style.display=multi?'none':'';
}
function atualizarComposicao(){renderComposicao();atualizarTotaisComposicao();atualizarModoValorServico();}
function atualizarValorServicoAtual(){
  if(composicaoItens.length>1)return;
  const amount=dinheiro(qs('#s-val')?.value)||0;
  const description=qs('#s-desc')?.value.trim()||'Serviço selecionado';
  composicaoItens=amount>0?[{description,quantity:1,unitAmount:Number(amount.toFixed(2)),profileId:qs('#s-profile')?.value||undefined,ctn:qs('#s-cod')?.value||undefined,nbs:qs('#s-nbs')?.value||undefined}]:[];
  renderComposicao();atualizarTotaisComposicao();
}
function adicionarNovoServicoMesmaNatureza(){
  atualizarValorServicoAtual();
  composicaoItens.push({description:qs('#s-desc')?.value.trim()||'Serviço adicional',quantity:1,unitAmount:0,profileId:qs('#s-profile')?.value||undefined,ctn:qs('#s-cod')?.value||undefined,nbs:qs('#s-nbs')?.value||undefined});
  atualizarComposicao();
  setTimeout(()=>{
    const linhas=[...document.querySelectorAll('#s-composition-lines .comp-line-single')];
    const campo=linhas[linhas.length-1]?.querySelectorAll('input.num')[1];
    campo?.focus();campo?.select();
    qs('#s-composition-detail')?.scrollIntoView({behavior:'smooth',block:'center'});
  },50);
}
function adicionarLinhaComposicao(){
  const id=qs('#s-additional-service')?.value,service=perfisServico.find(item=>item.id===id);if(!service){alert('Selecione um serviço adicional cadastrado.');return}
  const unit=Number(service.default_amount||0);composicaoItens.push({description:service.name,quantity:1,unitAmount:Number.isFinite(unit)?Number(unit.toFixed(2)):0,profileId:service.id,ctn:service.national_code,nbs:service.nbs_code});qs('#s-additional-service').value='';atualizarComposicao();
}
function editarQtdComposicao(index,value){const q=dinheiro(value);if(Number.isFinite(q)&&q>=0)composicaoItens[index].quantity=q;atualizarTotaisComposicao()}
function editarUnitComposicao(index,value){const u=dinheiro(value);if(Number.isFinite(u)&&u>=0)composicaoItens[index].unitAmount=Number(u.toFixed(2));atualizarTotaisComposicao()}
function removerLinhaComposicao(index){composicaoItens.splice(index,1);atualizarComposicao()}
function atualizarCamposEspeciais(){
  const code=qs('#s-cod')?.value||'';
  const construction=code.startsWith('07'),event=code.startsWith('12');
  const category=construction?'construction':(event?'event':'other');
  if(qs('#s-category'))qs('#s-category').value=category;
  qs('#s-construction-fields')?.classList.toggle('on',construction);
  qs('#s-event-fields')?.classList.toggle('on',event);
  if(qs('#s-cno'))qs('#s-cno').required=construction;
  if(qs('#s-event-code'))qs('#s-event-code').required=event;
  if(qs('#s-event-location'))qs('#s-event-location').required=event;
  const display=qs('#s-category-display');
  if(display)display.textContent=construction?'Categoria detectada pelo código: Construção civil (exige CNO).':event?'Categoria detectada pelo código: Evento (exige código e local do evento).':'Categoria detectada pelo código: Outro serviço.';
  const card=qs('#s-specific-card');if(card)card.style.display=(construction||event)?'':'none';
}
function filtrarCtnEmissao(){
  const select=qs('#s-cod');if(!select)return;
  const raw=(qs('#s-cod-search')?.value||'').trim();
  const q=raw.toLocaleLowerCase('pt-BR');
  const digits=raw.replace(/\D/g,'');
  let shown=0;
  [...select.options].forEach(option=>{
    if(!option.value){option.hidden=false;return}
    const match=!q||option.textContent.toLocaleLowerCase('pt-BR').includes(q)||(digits&&option.value.includes(digits));
    option.hidden=!match;if(match)shown++;
  });
  const hint=qs('#s-cod-hint');if(hint)hint.textContent=q?`${shown} código(s) encontrado(s) — catálogo oficial PRODREST v1.01 de 22/01/2026.`:'Catálogo oficial PRODREST v1.01 de 22/01/2026.';
}
async function buscarSugestoesNbsCodigo(){
  const code=qs('#s-cod')?.value;if(!/^\d{6}$/.test(code||''))return;
  try{
    const result=await api('/api/services/nbs-suggestions?codigo='+encodeURIComponent(code));
    const hint=qs('#s-nbs-hint');
    if(result.items?.length){
      preencherSelectNbs('s-nbs',result.items.map(item=>({code:item.code,formatted:item.code,description:`${item.name} — ${item.description}`})),result.items.length===1?result.items[0].code:qs('#s-nbs').value);
      if(result.items.length===1)definirNbsSelecionado('s-nbs',result.items[0].code,result.items[0].name);
      if(hint)hint.textContent=`${result.items.length} NBS recomendado(s) pelo cadastro de serviços desta empresa.`;
    }else if(hint)hint.textContent='Nenhum NBS recomendado foi cadastrado para este código; pesquise no catálogo oficial.';
  }catch(error){if(qs('#s-nbs-hint'))qs('#s-nbs-hint').textContent='Sugestões do cadastro indisponíveis; use a pesquisa do catálogo oficial.'}
}

function preencherSelectNbs(id,items,selected=''){
  const select=qs('#'+id);if(!select)return;
  const value=selected||select.value||'';
  select.innerHTML='<option value="">Selecione um NBS oficial</option>'+items.map(item=>`<option value="${esc(item.code)}">${esc(item.formatted||item.code)} — ${esc(item.description)}</option>`).join('');
  if(value&&items.some(item=>item.code===value))select.value=value;
}
function definirNbsSelecionado(id,value,description=''){
  const select=qs('#'+id),code=String(value||'').replace(/\D/g,'');if(!select||!code)return;
  if(![...select.options].some(option=>option.value===code)){const option=document.createElement('option');option.value=code;option.textContent=description?`${code} — ${description}`:code;select.appendChild(option)}
  select.value=code;
}
// Item 6: NBS só as correspondentes ao CTN. Estrutura: NBS de 9 díg. tem no meio
// (díg. 2-5) o item+subitem do CTN (LC 116). Ex.: CTN 150601 -> NBS 1.1506.xx.xx.
// Se o catálogo (incompleto) não tiver correspondência, cai para a lista toda.
function nbsCorrespondeCtn(nbsCode,ctnCode){const n=String(nbsCode||'').replace(/\D/g,''),c=String(ctnCode||'').replace(/\D/g,'');if(n.length!==9||c.length<4)return true;return n.slice(1,5)===c.slice(0,4);}
function filtrarNbsPorCtn(items){const ctn=(qs('#s-cod')?.value||'').replace(/\D/g,'');if(ctn.length<4)return items;const f=items.filter(it=>nbsCorrespondeCtn(it.code,ctn));return f.length?f:items;}
async function carregarNbsCatalogo(search='',target='s-nbs'){
  const result=await api('/api/services/nbs/catalog?limit=400'+(search?`&search=${encodeURIComponent(search)}`:''));
  nbsCatalogo=result.items||[];
  const lista=target==='s-nbs'?filtrarNbsPorCtn(nbsCatalogo):nbsCatalogo;
  preencherSelectNbs(target,lista,target==='s-nbs'?qs('#s-nbs')?.value:qs('#cad-nbs')?.value||'');
}
// Só busca o catálogo NBS (sem termo, primeira página) na primeira vez que o
// usuário de fato mexe no campo — nunca sozinho ao abrir a tela.
function garantirNbsCarregado(target){
  if(nbsCatalogo.length)return;
  carregarNbsCatalogo('',target).catch(()=>{});
}
async function buscarNbsEmissao(){
  const button=qs('#s-nbs-search')?.parentElement?.querySelector('button'),query=qs('#s-nbs-search').value.trim();
  if(button){button.disabled=true;button.textContent='Buscando...'}
  try{await carregarNbsCatalogo(query,'s-nbs')}catch(error){alert(error.message)}finally{if(button){button.disabled=false;button.textContent='Buscar'}}
}
async function buscarNbsCadastro(){
  const button=qs('#cad-nbs-search')?.parentElement?.querySelector('button'),query=qs('#cad-nbs-search').value.trim();
  if(button){button.disabled=true;button.textContent='Buscando...'}
  try{await carregarNbsCatalogo(query,'cad-nbs')}catch(error){alert(error.message)}finally{if(button){button.disabled=false;button.textContent='Buscar'}}
}

/**
 * Duas chamadas iguais disparadas ao mesmo tempo viram UMA só (achado da
 * análise do portal, 19/08/2026: no carregamento saíam 19 chamadas de API,
 * com /api/customers, /api/services/profiles e /api/services/catalog pedidos
 * duas vezes cada — quase 1,5s de rede jogada fora, porque cada chamada custa
 * de 450 a 960ms).
 *
 * Só compartilha o que está EM VOO: assim que a promessa termina, a chave é
 * liberada. Isso mantém o comportamento de sempre para quem chama depois de
 * salvar/excluir (precisa mesmo de dado fresco) — quem passa a ser
 * deduplicado é só a concorrência do carregamento. Mesma técnica já usada em
 * carregarIndOpCatalogo e carregarMunicipiosCatalogo.
 */
const chamadasEmVoo=new Map();
function emVoo(chave,fn){
  if(chamadasEmVoo.has(chave))return chamadasEmVoo.get(chave);
  const promessa=Promise.resolve().then(fn).finally(()=>chamadasEmVoo.delete(chave));
  chamadasEmVoo.set(chave,promessa);
  return promessa;
}
async function carregarPerfisServico(){
  try{perfisServico=await emVoo('services/profiles',()=>api('/api/services/profiles'))}catch{perfisServico=[]}
  qs('#s-profile').innerHTML='<option value="">Preenchimento avulso</option>'+perfisServico.map(item=>`<option value="${item.id}">${item.display_number?item.display_number+' — ':''}${esc(item.name)}</option>`).join('');
  const list=qs('#svc-list');
  if(!perfisServico.length){list.innerHTML='<div class="empty-state">Nenhum serviço cadastrado. Clique em Novo para criar o primeiro perfil.</div>';return}
  // Só esta lista de gestão ordena pelo número — os seletores acima/abaixo
  // continuam por nome (mais fácil de achar digitando), o número só aparece
  // como prefixo pra poder ser usado como referência estável em outro lugar
  // (ex.: importação em lote de recorrências).
  const ordenados=perfisServico.slice().sort((a,b)=>(a.display_number||0)-(b.display_number||0));
  list.innerHTML=ordenados.map(item=>`<div class="dest" style="margin-bottom:8px">${item.display_number?`<div class="box-mini">#${item.display_number}</div>`:''}<div class="box-mini">${esc(item.national_code)}</div><div style="min-width:0;flex:1"><div class="t">${esc(item.name)}</div><div class="s">${esc(item.service_type)} · ${esc(item.description)}<br>ISS: ${esc(item.iss_withholding==='1'?'não retido':item.iss_withholding==='2'?'tomador':'intermediário')}</div></div><button class="btn btn-s" onclick="editarPerfilServico('${item.id}')">Editar</button><button class="ico-btn danger" onclick="excluirPerfilServico('${item.id}')">×</button></div>`).join('');
}

function validarNbsDigitacao(){
  const input=qs('#s-nbs');if(!input)return;const value=input.value.replace(/\D/g,'');input.setCustomValidity(/^\d{9}$/.test(value)?'':'Selecione um código NBS oficial com exatamente 9 dígitos.');
}
function atualizarCompetenciaFiscal(){
  const input=qs('#s-comp'),hint=qs('#s-comp-hint');if(!input||!hint||!input.value)return;
  const selected=new Date(`${input.value}T12:00:00-03:00`),today=new Date();today.setHours(0,0,0,0);
  if(selected<today)hint.textContent='Competência retroativa: a emissão usará a data de hoje no fluxo DPS/RPS e manterá esta competência no documento.';
  else hint.textContent='Campo obrigatório da DPS. A data usa o fuso de Brasília.';
}

function limparFormularioServico(){
  ['cad-id','cad-name','cad-type','cad-search','cad-nbs-search','cad-desc','cad-mun-code','cad-rate','cad-cst','cad-default-amount','cad-ibscbs-cst','cad-ibscbs-classtrib','cad-ibscbs-search','cad-ibscbs-indop','cad-ibscbs-indop-search'].forEach(id=>qs('#'+id).value='');
  ['cad-ibscbs-indfinal','cad-ibscbs-tpoper'].forEach(id=>{const el=qs('#'+id);if(el)el.value=''});
  qs('#cad-nbs').innerHTML='<option value="">Pesquise o catálogo NBS</option>';
  ['cad-pc-base','cad-pis-rate','cad-cofins-rate','cad-pis-amount','cad-cofins-amount','cad-csll-rate','cad-cp','cad-irrf-base','cad-irrf-rate','cad-irrf','cad-csll'].forEach(id=>qs('#'+id).value='0,00');
  qs('#cad-code').innerHTML='<option value="">Pesquise o catálogo oficial</option>';
  qs('#cad-trib-iss').value='1';qs('#cad-ret-iss').value='1';qs('#cad-ret-pc').value='';qs('#cad-ret-irrf-tipo').value='0';atualizarRetencaoPisCofins('cad');atualizarRetencaoIrrf('cad');qs('#svc-form-title').textContent='Novo serviço padrão';
}
function novoPerfilServico(){
  limparFormularioServico();
  abrirModalServico();
}
function abrirModalServico(){qs('#servico-modal').classList.add('on')}
function fecharModalServico(){qs('#servico-modal').classList.remove('on')}

async function buscarCatalogoServico(){
  const query=qs('#cad-search').value.trim();
  const result=await api('/api/services/catalog?limit=400&search='+encodeURIComponent(query));
  catalogoCadastro=result.services;
  qs('#cad-code').innerHTML='<option value="">Selecione um código nacional</option>'+catalogoCadastro.map(item=>`<option value="${item.code}">${item.code} — ${esc(item.description)}</option>`).join('');
}

function selecionarCodigoCadastro(){
  const item=catalogoCadastro.find(service=>service.code===qs('#cad-code').value)||catalogoServicos.find(service=>service.code===qs('#cad-code').value);
  // maxlength no HTML não bloqueia atribuição por JS, só digitação — corta
  // aqui também pro caso raro da descrição oficial do catálogo passar de 1000.
  if(item&&!qs('#cad-desc').value.trim()){qs('#cad-desc').value=item.description.slice(0,1000);qs('#cad-desc-count').textContent=qs('#cad-desc').value.length;}
}

function editarPerfilServico(id){
  const item=perfisServico.find(profile=>profile.id===id);if(!item)return;
  qs('#cad-id').value=item.id;qs('#cad-name').value=item.name;qs('#cad-type').value=item.service_type;qs('#cad-desc').value=item.description;qs('#cad-desc-count').textContent=(item.description||'').length;qs('#cad-mun-code').value=item.municipal_code||'';definirNbsSelecionado('cad-nbs',item.nbs_code,item.name);qs('#cad-rate').value=item.iss_rate==null?'':String(item.iss_rate).replace('.',',');
  qs('#cad-trib-iss').value=item.iss_taxation;qs('#cad-ret-iss').value=item.iss_withholding;qs('#cad-cst').value=item.pis_cofins_cst||'';qs('#cad-ret-pc').value=item.pis_cofins_withholding||'';
  qs('#cad-pc-base').value=String(item.pis_cofins_base||0).replace('.',',');qs('#cad-pis-rate').value=String(item.pis_rate||0).replace('.',',');qs('#cad-cofins-rate').value=String(item.cofins_rate||0).replace('.',',');qs('#cad-pis-amount').value=String(item.pis_amount||0).replace('.',',');qs('#cad-cofins-amount').value=String(item.cofins_amount||0).replace('.',',');
  qs('#cad-default-amount').value=String(item.default_amount||0).replace('.',',');qs('#cad-cp').value=String(item.ret_cp||0).replace('.',',');
  // IRRF: só o valor final fica persistido (ret_irrf) — base/alíquota são
  // conveniência de cálculo, não voltam do backend. Reabre com o toggle
  // ligado se já havia valor retido, deixando base/alíquota zerados pro
  // usuário reconfigurar caso queira recalcular.
  qs('#cad-ret-irrf-tipo').value=Number(item.ret_irrf||0)>0?'1':'0';qs('#cad-irrf-base').value='0,00';qs('#cad-irrf-rate').value='1,50';qs('#cad-irrf').value=String(item.ret_irrf||0).replace('.',',');
  qs('#cad-ibscbs-indfinal').value=item.ibscbs_ind_final==null?'':String(item.ibscbs_ind_final);qs('#cad-ibscbs-tpoper').value=item.ibscbs_tp_oper||'';exibirIndOpCadastroPorCodigo(item.ibscbs_cind_op||'');
  exibirIbscbsClassificacaoPorCodigo(item.ibscbs_cst||'',item.ibscbs_class_trib||'');qs('#cad-csll').value=String(item.ret_csll||0).replace('.',',');qs('#cad-csll-rate').value='1,00';
  catalogoCadastro=catalogoServicos.filter(service=>service.code===item.national_code);qs('#cad-code').innerHTML=`<option value="${item.national_code}">${item.national_code} — ${esc(catalogoCadastro[0]?.description||item.description)}</option>`;
  atualizarRetencaoPisCofins('cad');atualizarRetencaoIrrf('cad');qs('#svc-form-title').textContent='Editar serviço padrão';
  abrirModalServico();
}

let sugestaoIbscbsAtual=null;
// Reforma Tributária (NT 009/2026): sugere CST/cClassTrib pelo Anexo VIII ao
// escolher o NBS. Só preenche os campos automaticamente quando ambos estão
// vazios (nunca sobrescreve uma escolha manual já feita), e só quando o NBS
// tem uma única classificação possível — com mais de uma opção, mostra a
// lista para o operador decidir qual se aplica ao caso concreto.
async function sugerirIbscbsPorNbs(){
  const nbs=qs('#cad-nbs')?.value.replace(/\D/g,''),hint=qs('#cad-ibscbs-suggestion');
  sugestaoIbscbsAtual=null;if(hint)hint.innerHTML='';
  if(!nbs||nbs.length!==9)return;
  try{
    const sugestao=await api('/api/services/ibscbs-suggestion?nbs='+nbs);
    if(!sugestao.found||!hint)return;
    sugestaoIbscbsAtual=sugestao;
    const jaPreenchido=qs('#cad-ibscbs-cst').value.trim()||qs('#cad-ibscbs-classtrib').value.trim();
    if(sugestao.options.length===1){
      if(!jaPreenchido){qs('#cad-ibscbs-cst').value=sugestao.suggested.cst;qs('#cad-ibscbs-classtrib').value=sugestao.suggested.cClassTrib;qs('#cad-ibscbs-search').value=`${sugestao.suggested.name} — CST ${sugestao.suggested.cst} · cClassTrib ${sugestao.suggested.cClassTrib}`;}
      hint.innerHTML=`Sugestão pelo Anexo VIII: CST ${esc(sugestao.suggested.cst)} / cClassTrib ${esc(sugestao.suggested.cClassTrib)} — ${esc(sugestao.suggested.name)}`;
    }else{
      hint.innerHTML=`Este NBS tem ${sugestao.options.length} classificações possíveis — escolha a que se aplica: `+sugestao.options.map(o=>`<button class="btn btn-s" type="button" style="margin:2px" onclick="qs('#cad-ibscbs-cst').value='${o.cst}';qs('#cad-ibscbs-classtrib').value='${o.cClassTrib}';qs('#cad-ibscbs-search').value='${esc(o.name).replace(/'/g,"\\'")} — CST ${o.cst} · cClassTrib ${o.cClassTrib}'">${esc(o.cClassTrib)} — ${esc(o.name)}</button>`).join(' ');
    }
  }catch{sugestaoIbscbsAtual=null}
}

async function salvarPerfilServico(){
  const cst=qs('#cad-cst').value.trim();
  const rate=qs('#cad-rate').value.trim();
  const tipo=qs('#cad-ret-pc').value;
  const reteve=tipo!==''&&tipo!=='0';
  const ibscbsCst=qs('#cad-ibscbs-cst').value.trim(),ibscbsClassTrib=qs('#cad-ibscbs-classtrib').value.trim();
  const payload={id:qs('#cad-id').value||undefined,name:qs('#cad-name').value.trim(),serviceType:qs('#cad-type').value.trim(),defaultAmount:dinheiro(qs('#cad-default-amount').value),nationalCode:qs('#cad-code').value,description:qs('#cad-desc').value.trim(),municipalCode:qs('#cad-mun-code').value.trim()||undefined,nbsCode:qs('#cad-nbs').value.replace(/\D/g,'')||undefined,issTaxation:qs('#cad-trib-iss').value,issWithholding:qs('#cad-ret-iss').value,issRate:rate?dinheiro(rate):undefined,pisCofinsCst:cst||undefined,pisCofinsWithholding:tipo||undefined,pisCofinsBase:reteve?dinheiro(qs('#cad-pc-base').value):undefined,pisRate:reteve?dinheiro(qs('#cad-pis-rate').value):undefined,cofinsRate:reteve?dinheiro(qs('#cad-cofins-rate').value):undefined,pisAmount:reteve?dinheiro(qs('#cad-pis-amount').value):undefined,cofinsAmount:reteve?dinheiro(qs('#cad-cofins-amount').value):undefined,retCp:dinheiro(qs('#cad-cp').value),retIrrf:dinheiro(qs('#cad-irrf').value),retCsll:reteve?dinheiro(qs('#cad-csll').value):0,ibscbsCst:ibscbsCst||undefined,ibscbsClassTrib:ibscbsClassTrib||undefined,ibscbsIndFinal:qs('#cad-ibscbs-indfinal').value===''?undefined:qs('#cad-ibscbs-indfinal').value==='true',ibscbsCindOp:qs('#cad-ibscbs-indop').value||undefined,ibscbsTpOper:qs('#cad-ibscbs-tpoper').value||undefined};
  if(!payload.name||!payload.serviceType||!payload.nationalCode||!payload.description||!payload.nbsCode){alert('Informe nome, tipo, código nacional, descrição e NBS.');return}
  if(payload.municipalCode&&!/^\d{1,3}$/.test(payload.municipalCode)){alert('O código municipal, quando usado, deve conter de 1 a 3 dígitos.');return}
  if(payload.nbsCode&&!/^\d{9}$/.test(payload.nbsCode)){alert('O código NBS deve conter exatamente 9 dígitos.');return}
  if((ibscbsCst&&!ibscbsClassTrib)||(ibscbsClassTrib&&!ibscbsCst)){alert('Informe CST e cClassTrib do IBS/CBS juntos, ou deixe os dois em branco.');return}
  if(ibscbsCst&&!/^\d{3}$/.test(ibscbsCst)){alert('O CST IBS/CBS deve conter exatamente 3 dígitos.');return}
  if(ibscbsClassTrib&&!/^\d{6}$/.test(ibscbsClassTrib)){alert('O cClassTrib IBS/CBS deve conter exatamente 6 dígitos.');return}
  try{await api('/api/services/profiles',{method:'POST',body:JSON.stringify(payload)});await carregarPerfisServico();limparFormularioServico();fecharModalServico();alert('Serviço padrão salvo. Ele já está disponível na emissão.')}catch(error){alert(error.message)}
}

async function excluirPerfilServico(id){
  if(!await titanConfirm('Desativar este cadastro de serviço?','Desativar serviço'))return;
  await api('/api/services/profiles/'+id,{method:'DELETE'});await carregarPerfisServico();
}

// Item 5: ao informar o código (CTN), detecta o serviço cadastrado que
// corresponde e aplica seu perfil (descrição, alíquota, retenções, NBS).
function detectarServicoPorCodigo(){
  const cod=(qs('#s-cod')?.value||'').replace(/\D/g,'');if(!cod)return;
  const match=perfisServico.find(p=>String(p.national_code||'').replace(/\D/g,'')===cod);
  if(match&&qs('#s-profile')&&qs('#s-profile').value!==match.id){qs('#s-profile').value=match.id;aplicarPerfilServico();}
}
function aplicarPerfilServico(){
  const item=perfisServico.find(profile=>profile.id===qs('#s-profile').value);
  if(!item){travarRetencoes(true);atualizarResumoCtnNbs(null);atualizarCardIbscbsEmissao(null);return}
  const descricaoCompleta=(item.description||'').slice(0,1000);
  qs('#s-cod').value=item.national_code;definirNbsSelecionado('s-nbs',item.nbs_code,item.name);qs('#s-desc').value=descricaoCompleta;if(qs('#s-desc-count'))qs('#s-desc-count').textContent=descricaoCompleta.length;qs('#s-trib-iss').value=item.iss_taxation;qs('#s-ret-iss').value=item.iss_withholding;qs('#s-cst').value=item.pis_cofins_cst||'';qs('#s-ret-pc').value=item.pis_cofins_withholding||'';
  const valorPadrao=Number(item.default_amount||0);
  composicaoItens=valorPadrao>0?[{description:descricaoCompleta,quantity:1,unitAmount:valorPadrao,profileId:item.id,ctn:item.national_code,nbs:item.nbs_code}]:[];
  qs('#s-pc-base').value=String(item.pis_cofins_base||0).replace('.',',');qs('#s-pis-rate').value=String(item.pis_rate||0).replace('.',',');qs('#s-cofins-rate').value=String(item.cofins_rate||0).replace('.',',');qs('#s-pis-amount').value=String(item.pis_amount||0).replace('.',',');qs('#s-cofins-amount').value=String(item.cofins_amount||0).replace('.',',');
  qs('#s-ret-cp').value=String(item.ret_cp||0).replace('.',',');qs('#s-ret-irrf-tipo').value=Number(item.ret_irrf||0)>0?'1':'0';qs('#s-irrf-base').value='0,00';qs('#s-irrf-rate').value='1,50';qs('#s-ret-irrf').value=String(item.ret_irrf||0).replace('.',',');qs('#s-ret-csll').value=String(item.ret_csll||0).replace('.',',');lerParametros();
  atualizarRetencaoPisCofins('s');atualizarRetencaoIrrf('s');atualizarComposicao();atualizarCamposEspeciais();travarRetencoes(true);atualizarResumoCtnNbs(item);atualizarCardIbscbsEmissao(item);
}
// Achado 12/08/2026 (pedido do usuário): a tela de emissão não tinha nenhuma
// UI pro grupo IBSCBS — só herdava CST/cClassTrib do cadastro do serviço em
// silêncio. Card só aparece quando o serviço tem IBS/CBS cadastrado.
// Etapa 3 (19/08/2026): o card sumiu da emissão — a configuração IBS/CBS
// virou cadastro do serviço (Meus Serviços), e o servidor monta o grupo a
// partir dele em src/nfse/servico-para-emissao.ts. Aqui só resta avisar que
// o serviço tem IBS/CBS configurado, sem pedir nada a quem está emitindo.
function atualizarCardIbscbsEmissao(){}
function atualizarResumoCtnNbs(item){
  const block=qs('#s-ctn-nbs-block'),summary=qs('#s-ctn-nbs-summary');if(!block||!summary)return;
  if(item){
    const nbsSel=qs('#s-nbs'),nbsTexto=nbsSel?.options[nbsSel.selectedIndex]?.textContent||item.nbs_code||'';
    block.style.display='none';
    summary.style.display='';
    summary.innerHTML=`CTN ${esc(item.national_code||'')} · NBS ${esc(nbsTexto)} — definidos no cadastro do serviço "${esc(item.name)}". <button class="btn btn-s" type="button" onclick="abrirGestaoServicoAtual()">Editar cadastro do serviço</button>`;
  }else{
    block.style.display='';
    summary.style.display='none';
  }
}
function abrirGestaoServicoAtual(){
  const id=qs('#s-profile')?.value;
  go('servicos',qs('.sb-link[onclick*="servicos"]'));
  if(id)setTimeout(()=>editarPerfilServico(id),80);
}
function resumoOpcaoTexto(selectId){const el=qs('#'+selectId);if(!el)return'';const opt=el.options[el.selectedIndex];return opt?opt.textContent.replace(/^\d+\s*—\s*/,''):''}
const CAMPOS_RETENCOES_TRAVAVEIS=['s-trib-iss','s-ret-iss','s-cst','s-ret-pc','s-pc-base','s-pis-rate','s-cofins-rate','s-pis-amount','s-cofins-amount','s-csll-rate','s-ret-cp','s-ret-irrf-tipo','s-irrf-base','s-irrf-rate','s-ret-irrf','s-ret-csll'];
function semRetencaoAplicavel(){
  const retIss=qs('#s-ret-iss')?.value||'1',retPc=qs('#s-ret-pc')?.value||'';
  const cp=dinheiro(qs('#s-ret-cp')?.value),irrf=dinheiro(qs('#s-ret-irrf')?.value),csll=dinheiro(qs('#s-ret-csll')?.value);
  return retIss==='1'&&(retPc===''||retPc==='0')&&cp===0&&irrf===0&&csll===0;
}
// Achado 15/08/2026 (pedido do usuário): os campos já vêm travados do
// cadastro do serviço (correto, nunca editáveis na emissão), mas não dava
// pra CONFERIR os valores sem sair da tela — só indo em "Editar cadastro".
// Accordion recolhido por padrão: fields.style.display já começa 'none'
// (linha abaixo, igual antes), só ganhou um botão pra abrir/fechar sem
// mudar o estado disabled/readOnly, que continua sempre travado.
function toggleRetencoesVisiveis(){
  const fields=qs('#s-ret-fields'),btn=qs('#s-ret-toggle-btn');if(!fields)return;
  const abrindo=fields.style.display==='none';
  fields.style.display=abrindo?'':'none';
  if(btn)btn.textContent=abrindo?'Ocultar valores ▴':'Ver valores ▾';
}
function travarRetencoes(locked){
  CAMPOS_RETENCOES_TRAVAVEIS.forEach(id=>{
    const el=qs('#'+id);if(!el)return;
    if(el.tagName==='SELECT')el.disabled=locked;else el.readOnly=locked;
  });
  const hint=qs('#s-ret-lock-hint'),fields=qs('#s-ret-fields'),card=qs('#s-ret-card');
  if(fields)fields.style.display=locked?'none':'';
  const semRetencao=locked&&semRetencaoAplicavel();
  if(card)card.style.display=semRetencao?'none':'';
  if(hint){
    hint.style.display=locked?'':'none';
    if(locked)hint.innerHTML=`Impostos aplicados a esta nota: ISSQN ${esc(resumoOpcaoTexto('s-trib-iss'))}, ${esc(resumoOpcaoTexto('s-ret-iss'))}. <button class="btn btn-s" type="button" id="s-ret-toggle-btn" onclick="toggleRetencoesVisiveis()">Ver valores ▾</button> <button class="btn btn-s" type="button" onclick="abrirGestaoServicoAtual()">Editar cadastro do serviço</button>`;
  }
}

function orientacaoOnboardingEmitente(){
  titanAlert(`Para esta empresa emitir NFS-e pelo padrão nacional, dois passos são necessários:

1. Cadastro da empresa (esta tela): razão social, CNPJ, regime tributário e endereço (inscrição municipal é opcional).

2. Certificado digital A1: um arquivo .pfx ou .p12 com senha, emitido por uma Autoridade Certificadora credenciada pela ICP-Brasil. Ele assina a nota e abre o canal seguro com a Sefin Nacional. Envie em "Certificado A1", no menu lateral — lá tem orientação completa de onde conseguir e como enviar.

Sem os dois, a emissão de notas não é liberada.`,'Como funciona o onboard','info');
}

function orientacaoCertificadoA1(){
  titanAlert(`O que é: um arquivo de identidade digital da empresa (extensão .pfx ou .p12), emitido por uma Autoridade Certificadora credenciada pela ICP-Brasil. Ele assina a nota fiscal e abre o canal seguro com a Sefin Nacional — sem ele, a emissão não funciona.

Onde conseguir: se a empresa já usa certificado digital para outras finalidades (contabilidade, e-CAC, Conectividade Social), ela provavelmente já tem um — pergunte ao seu contador. Se não tiver, compre com uma Autoridade Certificadora credenciada (ex.: Serasa, Certisign, Soluti, entre outras).

A senha: é definida no momento da emissão do certificado pela Autoridade Certificadora — não é a senha do seu login no TITAN. Guarde-a com cuidado: se for perdida, não há como recuperar, só reemitir o certificado.

Como enviar aqui: arraste o arquivo .pfx ou .p12 na área de upload (ou clique para escolher), digite a senha do certificado no campo abaixo e clique em "Enviar ao cofre seguro". O arquivo fica criptografado e é usado somente pelo backend desta empresa.`,'Certificado digital A1','info');
}

async function carregarCertificado(){
  const status=qs('#cert-status');
  const details=qs('#cert-details');
  status.className='pill p-off right';status.textContent='Verificando';
  try{
    const cert=await api('/api/invoices/certificate');
    if(!cert.configured){
      status.textContent='Não configurado';
      details.textContent='Selecione abaixo o certificado A1 da empresa para habilitar a integração fiscal.';
      return;
    }
    status.className='pill '+(cert.expired?'p-err':'p-ok')+' right';
    status.textContent=cert.expired?'Vencido':'Válido';
    const validade=new Date(cert.validTo).toLocaleDateString('pt-BR');
    details.innerHTML=`<b>${esc(cert.subject)}</b><br>Válido até ${validade}. Armazenado criptografado no cofre seguro.`;
  }catch(error){status.textContent='Indisponível';details.textContent=error.message}
}

async function enviarCertificado(){
  const file=qs('#c-file').files[0];
  const password=qs('#c-pw').value;
  if(!file){alert('Escolha o arquivo .pfx ou .p12.');return}
  if(file.size>8*1024*1024){alert('O certificado ultrapassa o limite de 8 MB.');return}
  const button=qs('#btn-cert');button.disabled=true;button.textContent='Validando e criptografando...';
  try{
    const form=new FormData();form.append('certificate',file);form.append('password',password);
    await api('/api/invoices/certificate',{method:'POST',body:form});
    qs('#c-pw').value='';qs('#c-file').value='';qs('#cert-file-name').textContent='ou clique para escolher — máx. 8 MB';
    await carregarCertificado();
    alert('Certificado A1 validado e guardado com segurança. A integração fiscal está habilitada.');
  }catch(error){alert(error.message)}
  finally{button.disabled=false;button.textContent='Enviar ao cofre seguro'}
}

// Achado da auditoria de 11/08/2026: o tamanho só era checado dentro de
// enviarCertificado(), no clique de "Enviar" — um arquivo grande demais
// subia inteiro (consumindo dados móveis, plano comum no celular) só pra
// ser rejeitado depois. O tipo nunca era checado em lugar nenhum: accept=
// no <input> é só filtro do seletor do SO, o arrastar-e-soltar ignora isso
// por completo. Valida os dois já na escolha/soltura do arquivo.
function validarArquivoCertificado(file){
  if(!file)return true;
  if(!/\.(pfx|p12)$/i.test(file.name)){alert('Selecione um arquivo .pfx ou .p12.');qs('#c-file').value='';qs('#cert-file-name').textContent='ou clique para escolher — máx. 8 MB';return false}
  if(file.size>8*1024*1024){alert('O certificado ultrapassa o limite de 8 MB.');qs('#c-file').value='';qs('#cert-file-name').textContent='ou clique para escolher — máx. 8 MB';return false}
  return true;
}
qs('#c-file').addEventListener('change',e=>{
  const file=e.target.files[0];
  if(file&&!validarArquivoCertificado(file))return;
  qs('#cert-file-name').textContent=file?.name||'ou clique para escolher — máx. 8 MB';
});
const certDrop=qs('#cert-drop');
certDrop.addEventListener('dragover',e=>{e.preventDefault();certDrop.style.borderColor='var(--gold)'});
certDrop.addEventListener('dragleave',()=>certDrop.style.borderColor='');
certDrop.addEventListener('drop',e=>{
  e.preventDefault();certDrop.style.borderColor='';
  const file=e.dataTransfer.files[0];
  if(!file)return;
  if(!validarArquivoCertificado(file))return;
  qs('#c-file').files=e.dataTransfer.files;qs('#cert-file-name').textContent=file.name;
});

/* ---------- ambiente ---------- */
function trocarAmbiente(){
  alert(`Ambiente definido pelo backend seguro: ${ambienteAtual==='production'?'Produção oficial':'Produção restrita'}. A troca é feita somente por administrador no servidor.`);
}
async function trocarEmpresa(){
  const id=qs('#tenant').value;if(!id)return;
  sessionStorage.setItem(STORAGE_COMPANY_ID,id);aplicarAcesso();
  try{await carregarEmpresaServidor();await carregarNotasServidor();carregarEstado();render()}catch(error){alert(error.message)}
}

/* ---------- contagem CGSN 189/2026 ---------- */
function contagem(){
  const alvo=new Date(2026,8,1);
  const hoje=new Date();hoje.setHours(0,0,0,0);
  const d=Math.max(0,Math.round((alvo-hoje)/864e5));
  qs('#cd-num').textContent=d;
  if(d===0)qs('.cgsn-days span').textContent='em vigor hoje';
}

/* ---------- gráfico ---------- */
const meses=[];
function chart(){
  meses.splice(0,meses.length);
  const now=new Date();
  for(let offset=5;offset>=0;offset--){
    const d=new Date(now.getFullYear(),now.getMonth()-offset,1),key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const total=notas.filter(n=>{const dt=new Date(n.date||'');return !Number.isNaN(dt.valueOf())&&`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`===key&&n.st!=='canc'&&n.st!=='err'}).reduce((sum,n)=>sum+Number(n.v||0),0);
    meses.push([d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),total]);
  }
  if(!meses.length){
    qs('#chart').innerHTML='<div class="empty-state" style="width:100%;align-self:center">O gráfico aparecerá depois da primeira emissão de teste.</div>';
    return;
  }
  const max=Math.max(...meses.map(m=>m[1]),1)*1.12;
  const hasMovement=meses.some(m=>m[1]>0);
  qs('#dash-chart-status')?.classList.toggle('p-ok',hasMovement);
  qs('#dash-chart-status')?.classList.toggle('p-off',!hasMovement);
  if(qs('#dash-chart-status'))qs('#dash-chart-status').textContent=hasMovement?'Com movimento':'Sem movimento';
  qs('#chart').innerHTML=meses.map(([m,v],i)=>`
    <div class="bar-wrap">
      <div class="bar ${i===meses.length-1?'last':''}" style="height:${(v/max*100).toFixed(1)}%">
        <span class="bar-v">R$ ${brl(v)}</span>
      </div>
      <span class="bar-l">${m}</span>
    </div>`).join('');
}

/* ---------- tabelas ---------- */
const notas=[];
const sit={
  ok:['p-ok','Autorizada'],proc:['p-warn','Processando'],
  err:['p-err','Rejeitada'],canc:['p-off','Cancelada']
};
function pill(s){return `<span class="pill ${sit[s][0]}">${sit[s][1]}</span>`}
let notasFiltradasCount=0;

function tabelas(){
  if(!notas.length){
    qs('#ult').innerHTML='<tr><td colspan="5"><div class="empty-state">Nenhuma emissão registrada para este cliente.</div></td></tr>';
  }else{
    qs('#ult').innerHTML=notas.slice(0,5).map(x=>`
      <tr><td class="num">${x.d}</td><td>${esc(x.t)}</td><td style="color:var(--ink-2)">${esc(x.s)}</td>
      <td class="r">R$ ${brl(x.v)}</td><td>${pill(x.st)}</td></tr>`).join('');
  }
  popularFiltrosNotas();
  filtrarNotas();
}

const NOME_MES=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function popularFiltrosNotas(){
  const compSel=qs('#nt-competencia');
  if(compSel){
    const atual=compSel.value;
    const comps=[...new Set(notas.map(n=>n.comp).filter(Boolean))].sort().reverse();
    compSel.innerHTML='<option value="">Todas</option>'+comps.map(c=>{
      const [ano,mes]=c.split('-');
      return `<option value="${esc(c)}">${NOME_MES[Number(mes)]||mes}/${ano}</option>`;
    }).join('');
    compSel.value=comps.includes(atual)?atual:'';
  }
  const servSel=qs('#nt-servico');
  if(servSel){
    const atual=servSel.value;
    const servs=[...new Set(notas.map(n=>n.s).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    servSel.innerHTML='<option value="">Todos</option>'+servs.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
    servSel.value=servs.includes(atual)?atual:'';
  }
}
function alternarFiltrosNotas(){
  const painel=qs('#nt-filtros-avancados'),btn=qs('#nt-filtro-btn');if(!painel)return;
  const abrir=painel.style.display==='none';
  painel.style.display=abrir?'':'none';
  btn?.classList.toggle('on',abrir);
  btn?.setAttribute('aria-expanded',abrir?'true':'false');
}
function limparFiltrosNotas(){
  ['nt-search','nt-numero','nt-competencia','nt-servico','nt-data-de','nt-data-ate','nt-status'].forEach(id=>{const el=qs('#'+id);if(el)el.value=''});
  filtrarNotas();
}
const STATUS_BACKEND_PARA_CURTO={authorized:'ok',canceled:'canc',rejected:'err',error:'err',sending:'proc'};
function filtrarNotas(){
  const buscaGeral=(qs('#nt-search')?.value||'').trim().toLocaleLowerCase('pt-BR');
  const numero=(qs('#nt-numero')?.value||'').trim().toLocaleLowerCase('pt-BR');
  const status=qs('#nt-status')?.value||'';
  const statusCurto=STATUS_BACKEND_PARA_CURTO[status]||'';
  const competencia=qs('#nt-competencia')?.value||'';
  const servico=qs('#nt-servico')?.value||'';
  const dataDe=qs('#nt-data-de')?.value||'';
  const dataAte=qs('#nt-data-ate')?.value||'';

  const lista=notas.filter(x=>{
    if(buscaGeral){
      const alvo=[x.n,x.t,x.key].map(v=>String(v||'').toLocaleLowerCase('pt-BR'));
      if(!alvo.some(v=>v.includes(buscaGeral)))return false;
    }
    if(numero&&!String(x.n||'').toLocaleLowerCase('pt-BR').includes(numero))return false;
    if(statusCurto&&x.st!==statusCurto)return false;
    if(competencia&&x.comp!==competencia)return false;
    if(servico&&x.s!==servico)return false;
    if(dataDe&&(!x.date||new Date(x.date)<new Date(dataDe+'T00:00:00')))return false;
    if(dataAte&&(!x.date||new Date(x.date)>new Date(dataAte+'T23:59:59')))return false;
    return true;
  });
  notasFiltradasCount=lista.length;
  renderTabelaNotas(lista);

  const resumo=qs('#nt-filtro-resumo');
  if(resumo){
    const algumFiltro=buscaGeral||numero||status||competencia||servico||dataDe||dataAte;
    resumo.style.display=algumFiltro?'':'none';
    if(algumFiltro)resumo.textContent=`${lista.length} nota${lista.length===1?'':'s'} encontrada${lista.length===1?'':'s'} com os filtros aplicados.`;
  }
}
function resumoSituacaoNotas(){
  const status=qs('#nt-status')?.value||'';
  return {authorized:'apenas Autorizadas',sending:'apenas Processando',rejected:'apenas Rejeitadas',canceled:'apenas Canceladas'}[status]||'todas as situações';
}
// Estimativa de quantas notas entram no zip de XML: o backend só filtra por
// busca/situação/competência (não pelos filtros avançados de nº/serviço/data
// que a tela também tem), e só inclui notas com XML autorizado — por isso é
// "estimativa", não a contagem exata mostrada na tabela.
function notasParaExportacaoXml(){
  const search=(qs('#nt-search')?.value||'').trim().toLocaleLowerCase('pt-BR');
  const status=qs('#nt-status')?.value||'';
  const statusCurto=STATUS_BACKEND_PARA_CURTO[status]||'';
  const month=qs('#nt-competencia')?.value||'';
  return notas.filter(x=>{
    if(search){const alvo=[x.n,x.t,x.key].map(v=>String(v||'').toLocaleLowerCase('pt-BR'));if(!alvo.some(v=>v.includes(search)))return false;}
    if(statusCurto&&x.st!==statusCurto)return false;
    if(month&&x.comp!==month)return false;
    return true;
  });
}
function corrigirCausaRejeicao(numero){
  go('notas',qs('.sb-link[onclick*="notas"]'));
  const status=qs('#nt-status'),busca=qs('#nt-search');
  if(status)status.value='rejected';
  if(busca)busca.value=numero||'';
  filtrarNotas();
}
function renderTabelaNotas(lista){
  const tbody=qs('#tb-notas');if(!tbody)return;
  if(!notas.length){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state">O histórico está vazio. As emissões de teste aparecerão aqui.</div></td></tr>';return}
  if(!lista.length){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state">Nenhuma nota encontrada com esses filtros. <button class="btn btn-s" type="button" onclick="limparFiltrosNotas()">Limpar filtros</button></div></td></tr>';return}
  tbody.innerHTML=lista.map(x=>`
    <tr>
      <td class="mono" data-th="Nº" style="font-size:12px">${esc(x.n)}</td>
      <td class="num" data-th="Emissão">${x.d}</td>
      <td data-th="Tomador">${esc(x.t)}</td>
      <td data-th="Serviço" style="color:var(--ink-2)">${esc(x.s)}</td>
      <td class="r" data-th="Valor">R$ ${brl(x.v)}</td>
      <td data-th="Situação"><div>${pill(x.st)}${x.syncDivergent?`<div class="foot-note" style="color:#b91c1c">Divergente — verificar diretamente no Portal Nacional</div>`:''}${(x.emailSentAt||x.emailLastError||x.syncedAt)?`<details class="foot-details"><summary>detalhes</summary>${x.emailSentAt?`<div class="foot-note">E-mail: ${esc(x.emailTo||'enviado')} · ${esc(new Date(x.emailSentAt).toLocaleString('pt-BR'))}${x.emailProviderId?` · ID ${esc(x.emailProviderId)}`:''}</div>`:x.emailLastError?`<div class="foot-note" style="color:#b91c1c">E-mail: ${esc(x.emailLastError)}</div>`:''}${x.syncedAt?`<div class="foot-note">Consultado na Sefin em ${esc(new Date(x.syncedAt).toLocaleString('pt-BR'))}</div>`:''}</details>`:''}</div></td>
      <td data-th="Ações">
        <div class="acts">
          <button class="ico-btn" title="Baixar XML" onclick="baixarXml('${x.id}','${escAttr(x.n)}')" ${!x.key?'disabled style="opacity:.3"':''}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button>
          <button class="ico-btn" title="Abrir DANFSe em PDF" onclick="abrirDanfse('${x.id}','${escAttr(x.n)}')" ${!x.key?'disabled style="opacity:.3"':''}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="ico-btn" title="Sincronizar situação com a Sefin" onclick="sincronizarNota('${x.id}')" ${!x.key?'disabled style="opacity:.3"':''}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg></button>
          <button class="btn btn-s" type="button" onclick="reenviarEmailNota('${x.id}')" ${x.st!=='ok'?'disabled style="opacity:.3"':''}>Reenviar por e-mail</button>
          <button class="ico-btn danger" title="Cancelar nota" onclick="abrirCancelamento('${x.id}','${escAttr(x.n)}')" ${x.st!=='ok'?'disabled style="opacity:.3"':''}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg></button>
        </div>
      </td>
    </tr>`).join('');
}
async function imprimirNotas(){
  const month=qs('#nt-competencia')?.value||'';
  const confirmado=await titanConfirm(
    `${notasFiltradasCount} nota(s) visível(is) na tela — ${resumoSituacaoNotas()}${month?`, competência ${month}`:''}.\n\nO PDF inclui exatamente as linhas visíveis com os filtros atuais.`,
    'Exportar PDF'
  );
  if(!confirmado)return;
  document.body.classList.add('printing-notas');window.print();window.setTimeout(()=>document.body.classList.remove('printing-notas'),1000);
}

function dashUserName(){
  const access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}'),user=access.user||{};
  const saved=JSON.parse(localStorage.getItem(STORAGE_USUARIO)||'{}');
  return user.name||user.full_name||saved.nome||'usuário';
}
function dashDateLabel(date){
  const d=new Date(date||'');
  return Number.isNaN(d.valueOf())?'agora':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
}
function renderDashboard(){
  const name=dashUserName().trim().split(/\s+/)[0]||'usuário';
  const greeting=qs('#dash-greeting');if(greeting)greeting.textContent=`Olá, ${name} 👋`;
  const stats=dashboardStats?.stats||null;
  const valid=notas.filter(n=>n.st!=='canc'&&n.st!=='err'),authorized=notas.filter(n=>n.st==='ok');
  const total=valid.reduce((sum,n)=>sum+Number(n.v||0),0);
  // rejected/processing no mês: preferimos a contagem do servidor (correta
  // por período); sem ela ainda carregada, caímos pro array local (que aqui
  // NÃO tem corte de mês — só usado como fallback breve, antes do primeiro
  // GET /api/dashboard responder).
  const monthCount=stats?stats.month_count:notas.filter(n=>{const d=new Date(n.date||'');const now=new Date();return !Number.isNaN(d.valueOf())&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length;
  const monthAuthorized=stats?stats.authorized_count:authorized.length;
  const monthAmount=stats?Number(stats.month_amount):valid.reduce((sum,n)=>sum+Number(n.v||0),0);
  const rejectedCount=stats?stats.rejected_count:notas.filter(n=>n.st==='err').length;
  const processingCount=stats?stats.processing_count:notas.filter(n=>n.st==='proc').length;
  const set=(id,value)=>{const el=qs(id);if(el)el.textContent=value};
  /**
   * Variação contra o mês anterior (desenho do usuário, 20/08/2026).
   *
   * Mês anterior zerado NÃO vira percentual: divisão por zero não tem
   * resultado, e "↑ 100%" ou "↑ 12%" saindo de R$ 0,00 é número inventado
   * numa tela que o cliente usa para conferir faturamento. Nesse caso a frase
   * diz o que de fato aconteceu.
   */
  function variacaoDoMes(atual){
    const lista=dashboardStats?.months||[];
    if(lista.length<2)return atual?`Total do mês · ${monthAuthorized} autorizada(s)`:'Sem movimento';
    const anterior=Number(lista[lista.length-2]?.amount||0);
    if(!atual)return 'Sem movimento neste mês';
    if(!anterior)return 'Primeiro mês com faturamento';
    const pct=((atual-anterior)/anterior)*100;
    const seta=pct>=0?'↑':'↓';
    return `${seta} ${Math.abs(pct).toFixed(0)}% vs. mês anterior`;
  }
  set('#dash-notas',String(monthCount));set('#dash-notas-sub',monthCount?`${monthAuthorized} autorizada(s) no mês`:'Nenhuma emissão registrada');
  set('#dash-faturamento',`R$ ${brl(monthAmount)}`);set('#dash-faturamento-sub',variacaoDoMes(monthAmount));
  set('#dash-canceladas',String(stats?.canceled_count||0));
  set('#dash-canceladas-sub',stats?.canceled_count?'Fora do faturamento do mês':'Nenhum cancelamento no mês');
  // Faixa de competência (desenho do usuário, 20/08/2026).
  const meses=dashboardStats?.months||[];
  const compAtual=meses.length?meses[meses.length-1].month:'';
  set('#dash-comp-label',compAtual?`${compAtual.slice(5,7)}/${compAtual.slice(0,4)}`:'—');
  set('#dash-comp-notas',String(monthCount));
  set('#dash-comp-faturamento',`R$ ${brl(monthAmount)}`);
  const certChip=dashboardStats?.certificate;
  // dataBR e não new Date(...).toLocaleDateString: a data vem como ISO, e o
  // construtor a lê como meia-noite UTC — em UTC-3 isso exibe o DIA ANTERIOR.
  // Certificado "válido até 31/05" quando vale até 01/06 é um dia a menos de
  // validade na tela de quem depende dele para emitir.
  set('#dash-comp-certificado',certChip?.validTo
    ? `Certificado A1 válido até ${dataBR(certChip.validTo)}`
    : 'Certificado A1 não cadastrado');
  set('#dash-autorizadas',String(authorized.length));set('#dash-autorizadas-sub',authorized.length?`R$ ${brl(total)} no histórico`:'Aguardando a primeira nota');
  const pendingCount=rejectedCount+processingCount+(!empresaAtual?1:0);set('#dash-pendencias',String(pendingCount));set('#dash-pendencias-sub',pendingCount?`${rejectedCount+processingCount} nota(s) para revisar no mês`:'Tudo em dia no mês');
  const certificado=dashboardStats?.certificate||null;
  const pending=qs('#dash-pending-list');
  if(pending){
    const rows=[];
    if(!empresaAtual)rows.push(`<button class="pending-row" type="button" onclick="go('emitente',qs('#sb-configuracoes'))"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.6 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/></svg></span><span class="pending-copy"><b>Cadastro do emitente</b><span>Informe os dados fiscais da empresa</span></span><strong class="pending-count">Pendente</strong></button>`);
    else rows.push(`<button class="pending-row ok" type="button" onclick="go('emitente',qs('#sb-configuracoes'))"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg></span><span class="pending-copy"><b>Cadastro do emitente</b><span>${esc(empresaAtual.rs||'Empresa ativa')}</span></span><strong class="pending-count">Concluído</strong></button>`);
    if(!certificado)rows.push(`<button class="pending-row" type="button" onclick="go('emitente',qs('#sb-configuracoes'))"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span><span class="pending-copy"><b>Certificado A1</b><span>Verifique validade e vínculo do CNPJ</span></span><strong class="pending-count">Verificar</strong></button>`);
    else if(!certificado.configured)rows.push(`<button class="pending-row" type="button" onclick="go('emitente',qs('#sb-configuracoes'))"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.6 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/></svg></span><span class="pending-copy"><b>Certificado A1</b><span>Nenhum certificado cadastrado</span></span><strong class="pending-count">Pendente</strong></button>`);
    else if(certificado.expired)rows.push(`<button class="pending-row" type="button" onclick="go('emitente',qs('#sb-configuracoes'))"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.6 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/></svg></span><span class="pending-copy"><b>Certificado A1</b><span>Vencido em ${esc(new Date(certificado.validTo).toLocaleDateString('pt-BR'))}</span></span><strong class="pending-count">Vencido</strong></button>`);
    else rows.push(`<button class="pending-row ok" type="button" onclick="go('emitente',qs('#sb-configuracoes'))"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg></span><span class="pending-copy"><b>Certificado A1</b><span>Válido até ${esc(new Date(certificado.validTo).toLocaleDateString('pt-BR'))}</span></span><strong class="pending-count">Concluído</strong></button>`);
    if(rejectedCount)rows.push(`<button class="pending-row" type="button" onclick="go('notas',qs('.sb-link[onclick*=&quot;notas&quot;]'))"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.6 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/></svg></span><span class="pending-copy"><b>Notas rejeitadas no mês</b><span>Confira o retorno da Sefin Nacional</span></span><strong class="pending-count">${rejectedCount}</strong></button>`);
    if(processingCount)rows.push(`<button class="pending-row" type="button" onclick="go('notas',qs('.sb-link[onclick*=&quot;notas&quot;]'))"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><span class="pending-copy"><b>Emissões em processamento</b><span>Acompanhe o retorno oficial</span></span><strong class="pending-count">${processingCount}</strong></button>`);
    if(!rejectedCount&&!processingCount&&!(!empresaAtual))rows.push(`<div class="dash-empty">Nenhuma pendência fiscal encontrada no mês.<br>O próximo passo é emitir uma nova NFS-e.</div>`);
    pending.innerHTML=rows.join('');
  }
  const rejeicoes=qs('#dash-rejeicoes-list');
  if(rejeicoes){
    const causas=dashboardStats?.rejectionBreakdown||[];
    rejeicoes.innerHTML=causas.length?causas.map(c=>`<button class="pending-row" type="button" onclick="corrigirCausaRejeicao('${escAttr(c.lastInvoiceNumber||'')}')"><span class="pending-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.6 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/></svg></span><span class="pending-copy"><b>${c.code?esc(c.code)+' — ':''}${esc(c.message)}</b><span>Última vez em ${esc(new Date(c.lastAt).toLocaleDateString('pt-BR'))} · Corrigir agora</span></span><strong class="pending-count">${c.count}</strong></button>`).join(''):'<div class="dash-empty">Nenhuma rejeição nos últimos 30 dias.</div>';
  }
  const activity=qs('#dash-activity');
  if(activity){
    const items=notas.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,4);
    activity.innerHTML=items.length?items.map(n=>`<div class="activity-row"><span class="activity-dot ${n.st==='ok'?'ok':n.st==='err'?'err':n.st==='proc'?'warn':''}"></span><span class="activity-copy"><b>${esc(n.st==='ok'?'NFS-e autorizada':n.st==='err'?'Emissão rejeitada':n.st==='canc'?'Nota cancelada':'Emissão em processamento')}</b><span>${esc(n.t||'Tomador não informado')} · ${esc(n.s||'Serviço')}</span></span><strong class="activity-value">${esc(dashDateLabel(n.date))}</strong></div>`).join(''):'<div class="dash-empty">Nenhuma atividade ainda.<br>As emissões e eventos aparecerão aqui.</div>';
  }
}

async function exportarXmls(btn){
  const search=qs('#nt-search')?.value.trim()||'';
  const status=qs('#nt-status')?.value||'';
  const month=qs('#nt-competencia')?.value||'';
  const params=new URLSearchParams();
  if(search)params.set('search',search);
  if(status)params.set('status',status);
  if(month)params.set('month',month);
  const estimativa=notasParaExportacaoXml().length;
  const confirmado=await titanConfirm(
    `Até ${estimativa} nota(s) — ${resumoSituacaoNotas()}${month?`, competência ${month}`:''}${search?`, busca "${search}"`:''}.\n\nSó entram no zip as notas com XML autorizado disponível.`,
    'Exportar XMLs'
  );
  if(!confirmado)return;
  const original=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Gerando zip...';}
  try{
    const blob=await apiBlob('/api/invoices/export/xml'+(params.toString()?'?'+params.toString():''));
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nfse-xmls.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }catch(error){alert(error.message)}
  finally{if(btn){btn.disabled=false;btn.textContent=original;}}
}
async function baixarXml(id,numero){
  try{await apiDownload('/api/invoices/'+id+'/xml','NFSe '+(numero||'')+'.xml')}catch(error){alert(error.message)}
}
async function baixarPdf(id,numero,empresa){
  try{await apiDownload('/api/invoices/'+id+'/pdf','NFSe '+(numero||'')+(empresa?' - '+empresa:'')+'.pdf')}catch(error){alert(error.message)}
}

async function abrirDanfse(id,numero){
  const empresa=empresaAtual?.rs||'';
  // window.open() precisa acontecer AINDA DENTRO do gesto de clique, antes
  // de qualquer await — depois de uma busca de rede, o navegador já não
  // credita a chamada como resposta direta ao toque, e tanto window.open()
  // quanto o clique num <a target=_blank> pra um blob: são bloqueados em
  // silêncio (Safari iOS é o pior caso, mas não é só ele — era exatamente
  // isso que quebrava o botão no celular: só o desktop abria a aba em
  // branco antes do await, o mobile ia direto pro fallback de blob depois
  // do fetch, que a maioria dos navegadores mobile já chega bloqueando).
  let tab=window.open('','_blank');
  if(tab)tab.document.write('<title>Preparando DANFSe...</title><p style="font-family:sans-serif;padding:24px">Gerando DANFSe com dados reais...</p>');
  try{
    const html=await (await apiBlob('/api/invoices/'+id+'/danfse')).text();
    // Barra de ações fica FORA do sandbox (acesso à API pra baixar XML/PDF);
    // o DANFSe fica DENTRO do iframe sandbox (isolação de segurança).
    // "Salvar PDF" baixa o PDF real gerado pelo servidor (GET
    // /api/invoices/:id/pdf) em vez de abrir o diálogo de impressão do
    // navegador — não depende de nada do iframe, só de postMessage pro
    // opener, igual "Baixar XML". allow-same-origin continua fora da lista
    // do sandbox — a origem do iframe segue opaca, sem acesso à
    // sessão/localStorage do portal.
    const wrapperHtml='<!doctype html><meta charset="utf-8"><title>DANFSe</title>'+
      '<style>'+
        'html,body{margin:0;height:100%;font-family:Arial,Helvetica,sans-serif}'+
        '.bar{display:flex;gap:8px;padding:8px 12px;background:#111;color:#fff;align-items:center;font-size:13px}'+
        '.bar span{margin-right:auto;font-weight:600}'+
        '.bar button{font-size:13px;font-weight:600;padding:6px 14px;border:0;border-radius:4px;cursor:pointer}'+
        '.bar .btn-sec{background:#333;color:#fff}'+
        '.bar .btn-sec:hover{background:#444}'+
        '.bar .btn-pri{background:#c9a84c;color:#111}'+
        '.bar .btn-pri:hover{background:#d4b55a}'+
        'iframe{display:block;width:100%;border:0;flex:1}'+
        '.wrap{display:flex;flex-direction:column;height:100vh}'+
      '</style>'+
      '<div class="wrap">'+
        '<div class="bar">'+
          '<span>DANFSe v2.0 · Documento Auxiliar da NFS-e</span>'+
          '<button class="btn-sec" onclick="baixarXml()">⬇️ Baixar XML</button>'+
          '<button class="btn-pri" onclick="baixarPdf()">📄 Salvar PDF</button>'+
        '</div>'+
        '<iframe sandbox="allow-scripts" id="danfseFrame" srcdoc="'+esc(html)+'"></iframe>'+
      '</div>'+
      '<script>'+
        'function baixarXml(){window.opener.postMessage({titan:\'baixarXml\',invoiceId:\''+id+'\',numero:\''+esc(numero||'')+'\'},\'*\');}'+
        'function baixarPdf(){window.opener.postMessage({titan:\'baixarPdf\',invoiceId:\''+id+'\',numero:\''+esc(numero||'')+'\',empresa:\''+esc(empresa||'')+'\'},\'*\');}'+
      '<\/script>';
    if(tab){tab.document.open();tab.document.write(wrapperHtml);tab.document.close();}
    else{
      // Só cai aqui se o window.open() do início — feito ainda dentro do
      // gesto de clique — tiver sido bloqueado mesmo assim (navegador
      // configurado pra nunca permitir popup, por exemplo). Fallback
      // residual, não o caminho normal de nenhuma plataforma.
      const wrapperUrl=URL.createObjectURL(new Blob([wrapperHtml],{type:'text/html;charset=utf-8'}));
      // rel="opener" explícito (não omitir e não usar noopener): o botão
      // "Baixar XML" da barra manda postMessage via window.opener, e
      // navegações para blob: em nova aba perdem o opener por padrão no
      // Chrome mesmo sem noopener — wrapperHtml é conteúdo 100% gerado por
      // este mesmo código, então manter o opener aqui não expõe nada.
      const a=document.createElement('a');a.href=wrapperUrl;a.target='_blank';a.rel='opener';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(wrapperUrl),120000);
    }
  }catch(error){if(tab)tab.close();alert(error.message)}
}

async function reenviarEmailNota(id){
  try{
    const result=await api('/api/invoices/'+encodeURIComponent(id)+'/email',{method:'POST',body:JSON.stringify({})});
    await carregarNotasServidor();
    await titanAlert(`E-mail enviado para ${result.to}${result.providerId?' · ID '+result.providerId:''}.`,'E-mail da NFS-e','ok');
  }catch(error){alert(error.message)}
}

async function sincronizarNota(id){
  try{
    const result=await api('/api/invoices/'+encodeURIComponent(id)+'/sync',{method:'POST',body:JSON.stringify({})});
    await carregarNotasServidor();
    const mensagem=result.divergiu
      ?`A situação na Sefin era diferente da mostrada aqui — atualizamos para "${sit[STATUS_BACKEND_PARA_CURTO[result.status]||'proc'][1]}".`
      :'Consultamos a Sefin agora: a situação mostrada já está correta.';
    await titanAlert(mensagem,'Sincronização com a Sefin',result.divergiu?'warn':'ok');
  }catch(error){alert(error.message)}
}

let invoiceCancelamento=null;
function abrirCancelamento(id,numero){invoiceCancelamento=id;qs('#cancel-note').textContent='DPS '+numero;qs('#cancel-code').value='1';qs('#cancel-reason').value='';qs('#cancel-confirm').checked=false;qs('#cancel-modal').classList.add('on');qs('#cancel-reason').focus()}
function fecharCancelamento(){invoiceCancelamento=null;qs('#cancel-modal').classList.remove('on')}
async function confirmarCancelamento(){
  const reasonCode=qs('#cancel-code').value,reason=qs('#cancel-reason').value.trim();
  if(reason.length<15){alert('Detalhe o motivo do cancelamento com pelo menos 15 caracteres.');return}
  if(!qs('#cancel-confirm').checked){alert('Marque a confirmação antes de cancelar oficialmente.');return}
  const button=qs('#cancel-submit');button.disabled=true;button.textContent='Enviando cancelamento...';
  try{await api('/api/invoices/'+invoiceCancelamento+'/cancel',{method:'POST',headers:{'X-Confirm-Cancellation':'CANCELAR_NFSE_REAL'},body:JSON.stringify({reasonCode,reason})});fecharCancelamento();await carregarNotasServidor();alert('Cancelamento autorizado e registrado na Sefin Nacional.')}catch(error){alert(error.message)}finally{button.disabled=false;button.textContent='Cancelar NFS-e oficialmente'}
}
qs('#cancel-modal').addEventListener('click',event=>{if(event.target===qs('#cancel-modal'))fecharCancelamento()});

/* ---------- parâmetros municipais ---------- */
function lerParametros(){
  const profile=perfisServico.find(item=>item.id===qs('#s-profile').value);
  const rate=profile?.iss_rate!=null?Number(profile.iss_rate):null;
  const a=rate!=null?rate.toLocaleString('pt-BR',{minimumFractionDigits:2})+'%':'Fornecida pela Sefin';
  qs('#aliq').innerHTML=`${a} <span class="pill p-off" style="margin-left:5px">municipal</span>`;
  const valor=qs('#s-val').value.replace(/[^\d,]/g,'')||'0,00';
  qs('#resumo-valor').textContent='R$ '+valor;
  qs('#resumo-base').textContent='R$ '+valor;
  const retIss=qs('#s-ret-iss')?.value;
  const retencaoLabel=retIss==='2'?'Sim — retido pelo tomador':retIss==='3'?'Sim — retido pelo intermediário':'Não';
  if(qs('#resumo-retencao'))qs('#resumo-retencao').textContent=retencaoLabel;
  if(qs('#resumo-issqn')){
    if(retIss!=='1')qs('#resumo-issqn').textContent='Retido na fonte pelo responsável indicado acima';
    else if(rate!=null)qs('#resumo-issqn').textContent='R$ '+brl(dinheiro(valor)*rate/100);
    else qs('#resumo-issqn').textContent='Confirmado pela Sefin no envio';
  }
}

/* ---------- habilitação ---------- */
function checarHabilitacao(){
  const reg=qs('#e-reg').value, mun=qs('#e-mun-search').value||qs('#e-mun').value||'não informado';
  const simples=reg.includes('Simples')||reg==='MEI';
  const box=qs('#hab');

  if(!qs('#e-rs').value.trim()||!qs('#e-cnpj').value.trim()){
    box.innerHTML='<div class="alert a-info"><div><b>Complete o cadastro da empresa.</b> A verificação de habilitação será exibida depois que razão social, CNPJ e município forem salvos.</div></div>';
    return;
  }

  if(reg==='MEI'){
    box.innerHTML=`
      <div class="alert a-ok">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
        <div><b>Habilitada — Emissor Nacional.</b> O MEI emite pelo padrão nacional em todo o país desde 2023, independente do município. Emissão por API exige certificado digital próprio do MEI.</div>
      </div>`;
  }else if(simples){
    box.innerHTML=`
      <div class="alert a-ok" style="margin-bottom:10px">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
        <div><b>Pré-análise compatível com o Emissor Nacional.</b> A regra do regime foi identificada, mas a habilitação efetiva ainda precisa ser confirmada na integração oficial.</div>
      </div>
      <div class="alert a-info">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div>Município selecionado: ${esc(mun)}. A consulta aos parâmetros municipais será executada quando o backend seguro estiver configurado.</div>
      </div>`;
  }else{
    box.innerHTML=`
      <div class="alert a-warn">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
        <div><b>Depende do município.</b> Fora do Simples, a emissão exige consulta oficial da adesão e do modo adotado por ${esc(mun)}. Essa verificação ainda não foi executada.</div>
      </div>`;
  }
}

/* ---------- PIPELINE ---------- */
const etapas=[
  {t:'Validar dados da DPS',d:'regras de negócio locais antes de gastar requisição',ms:12},
  {t:'Ler parâmetros do município',d:'GET /parametros_municipais/4106902/040101',ms:214},
  {t:'Montar XML da DPS',d:'Anexo I — leiaute DPS/NFS-e v1.00.02',ms:38},
  {t:'Assinar com o A1',d:'XMLDSig · SHA-256 · cadeia ICP-Brasil anexada',ms:96},
  {t:'Compactar GZip + Base64',d:'4.1 KB → 1.2 KB · dpsXmlGZipB64',ms:8},
  {t:'Enviar à Sefin Nacional',d:'POST /nfse · mTLS com certificado A1',ms:420},
  {t:'Validar autorização oficial',d:'resposta síncrona da Sefin Nacional',ms:54}
];
const ckSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6 9 17l-5-5"/></svg>';
const xSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M18 6 6 18M6 6l12 12"/></svg>';

function pipeReset(){
  qs('#pipe').innerHTML=etapas.map((e,i)=>`
    <div class="stage" id="st${i}" tabindex="0" onmouseenter="mostrarDetalheEtapa(${i})" onfocus="mostrarDetalheEtapa(${i})">
      <div class="dot">${ckSvg}</div>
      <div><div class="stage-t">${e.t}</div><span class="stage-d">${e.d}</span></div>
      <div class="stage-ms" id="ms${i}"></div>
    </div>`).join('');
  qs('#result').innerHTML='';
  mostrarDetalheEtapa(0);
}
function mostrarDetalheEtapa(index){const e=etapas[index];const detail=qs('#pipe-detail');if(detail)detail.textContent=`${e.t} — ${e.d}`}

let rodando=false;
// Mesmo padrão de emitir() (achado 11/08/2026: travar ANTES de qualquer await,
// nunca depois — dois cliques rápidos senão disparam duas requisições em
// paralelo). Uma flag por formulário, não a mesma "rodando" da emissão —
// são operações independentes, travar uma não pode travar a outra.
let salvandoRecebimento=false,salvandoComercial=false,salvandoCliente=false;
/**
 * Monta e valida o payload da emissão a partir do formulário. Extraído de
 * emitir() para o preflight do Martyn reaproveitar exatamente a mesma nota que
 * seria transmitida — conferir uma coisa e emitir outra seria pior que não
 * conferir. Devolve {ok:true,payload} ou {ok:false,msg,...} para quem chamou
 * decidir como avisar (alert na emissão, painel no preflight).
 */
async function montarPayloadEmissao(){
  if(!empresaAtual) return {ok:false,msg:'Cadastre e salve a empresa antes de emitir.',view:'emitente'};
  const valor=Number(qs('#s-val').value.replace(/\./g,'').replace(',','.'));
  const documento=normalizarDocumento(qs('#t-doc').value);
  const perfil=perfisServico.find(item=>item.id===qs('#s-profile').value);
  const cst=qs('#s-cst').value.trim();
  const nbs=qs('#s-nbs').value.replace(/\D/g,'');
  const tipoPisCofins=qs('#s-ret-pc').value;
  const retevePisCofins=tipoPisCofins!==''&&tipoPisCofins!=='0';
  const additionalItems=composicaoItens.map(item=>({description:(item.description||'').slice(0,1000),quantity:Number(item.quantity||0),unitAmount:Number(item.unitAmount||0),amount:Number(((Number(item.quantity)||0)*(Number(item.unitAmount)||0)).toFixed(2))}));
  if(additionalItems.some(item=>item.quantity<=0||item.unitAmount<=0)) return {ok:false,msg:'Cada linha de Serviços nessa nota precisa de quantidade e valor unitário maiores que zero — ou remova a linha.',foco:'#s-composition-lines',scroll:true};
  if(!additionalItems.length) return {ok:false,msg:'Informe o valor deste serviço antes de emitir.',foco:'#s-val'};
  const payload={
    competenceDate:qs('#s-comp').value,
    borrower:{name:qs('#t-nome').value.trim(),taxId:documento,email:qs('#t-mail').value.trim()||undefined,municipalityCode:qs('#t-municipio').value.replace(/\D/g,'')||undefined,postalCode:qs('#t-cep').value.replace(/\D/g,'')||undefined,street:qs('#t-end').value.trim()||undefined,number:qs('#t-num').value.trim()||undefined,district:qs('#t-bairro').value.trim()||undefined,city:qs('#t-cidade').value.trim()||undefined,state:qs('#t-uf').value.trim().toUpperCase()||undefined},
    service:{municipalityCode:qs('#s-mun').value,nationalTaxCode:qs('#s-cod').value,municipalTaxCode:perfil?.municipal_code||undefined,nbsCode:nbs||undefined,description:qs('#s-desc').value.trim().slice(0,1000),additionalInfo:qs('#s-info-compl')?.value.trim().slice(0,2000)||undefined,amount:valor,additionalItems,serviceCategory:qs('#s-category')?.value||'other',cno:qs('#s-cno')?.value.replace(/\D/g,'')||undefined,eventCode:qs('#s-event-code')?.value.trim()||undefined,eventLocation:qs('#s-event-location')?.value.trim()||undefined,issTaxation:qs('#s-trib-iss').value,issWithholding:qs('#s-ret-iss').value,issRate:perfil?.iss_rate==null?undefined:Number(perfil.iss_rate),pisCofinsCst:cst||undefined,pisCofinsWithholding:tipoPisCofins||undefined,pisCofinsBase:retevePisCofins?dinheiro(qs('#s-pc-base').value):undefined,pisRate:retevePisCofins?dinheiro(qs('#s-pis-rate').value):undefined,cofinsRate:retevePisCofins?dinheiro(qs('#s-cofins-rate').value):undefined,pisAmount:retevePisCofins?dinheiro(qs('#s-pis-amount').value):undefined,cofinsAmount:retevePisCofins?dinheiro(qs('#s-cofins-amount').value):undefined,retCp:dinheiro(qs('#s-ret-cp').value),retIrrf:dinheiro(qs('#s-ret-irrf').value),retCsll:retevePisCofins?dinheiro(qs('#s-ret-csll').value):0,ibscbsCst:perfil?.ibscbs_cst||undefined,ibscbsClassTrib:perfil?.ibscbs_class_trib||undefined},
    // Etapa 3 (19/08/2026): esta tela não monta mais o bloco `ibscbs`. Ele
    // vem do cadastro do serviço, montado no servidor
    // (src/nfse/servico-para-emissao.ts), igual para portal, recorrência e
    // WhatsApp — antes cada caminho montava do seu jeito e dois esqueciam.
    ibscbs:perfil?.ibscbs_cst&&perfil?.ibscbs_class_trib?{
      indFinal:perfil.ibscbs_ind_final==null?undefined:perfil.ibscbs_ind_final===true,
      cIndOp:perfil.ibscbs_cind_op||undefined,
      indDest:0,
      tpOper:perfil.ibscbs_tp_oper||undefined
    }:undefined
  };
  // Achado da auditoria de 11/08/2026: #s-mun-search (texto exibido) só
  // sincronizava com #s-mun (código IBGE realmente enviado à Sefin) quando o
  // usuário clicava a sugestão do dropdown. Digitar e sair do campo sem
  // clicar (Tab, autocomplete do navegador) deixava a nota sair com o
  // município antigo enquanto a tela mostrava o texto novo — sem aviso
  // nenhum. Trava aqui: o texto exibido precisa bater com o retorno do
  // catálogo (config de municípios) para o código que será de fato enviado.
  try{await carregarMunicipiosCatalogo();}catch{}
  const munConfirmado=municipiosCatalogo.find(row=>row.code===payload.service.municipalityCode);
  const munTextoEsperado=munConfirmado?`${munConfirmado.name}/${munConfirmado.state} — ${munConfirmado.code}`:null;
  if(!munConfirmado||qs('#s-mun-search').value.trim()!==munTextoEsperado) return {ok:false,msg:'O município de incidência não foi confirmado — clique numa opção da lista de municípios antes de emitir.',foco:'#s-mun-search'};
  if(!payload.competenceDate||!payload.borrower.name||!payload.borrower.taxId||!payload.service.nationalTaxCode||!payload.service.description||!Number.isFinite(valor)||valor<=0) return {ok:false,msg:'Preencha competência, tomador, CPF/CNPJ, código nacional, descrição e valor do serviço.'};
  if(!/^\d{11}$/.test(documento)&&!cnpjComFormatoValido(documento)) return {ok:false,msg:'O CPF deve ter 11 dígitos ou o CNPJ deve ter 14 caracteres válidos.',foco:'#t-doc'};
  if(!/^\d{9}$/.test(nbs)) return {ok:false,msg:'O código NBS é obrigatório e deve conter exatamente 9 dígitos.',foco:'#s-nbs'};
  if(payload.service.serviceCategory==='construction'||payload.service.nationalTaxCode.startsWith('07')){if(!/^\d{12}$/.test(payload.service.cno||'')) return {ok:false,msg:'O serviço de construção civil exige um CNO válido de 12 dígitos.',foco:'#s-cno'};}
  if(payload.service.serviceCategory==='event'&&(!payload.service.eventCode||!payload.service.eventLocation)) return {ok:false,msg:'Informe o código e o local do evento antes de transmitir.'};
  if(qs('#t-mail').value&&!qs('#t-mail').checkValidity()) return {ok:false,msg:'Informe um e-mail válido para o tomador.',foco:'#t-mail'};
  return {ok:true,payload};
}
function tratarFalhaPayload(m){
  alert(m.msg);
  if(m.view){go(m.view,qs('.sb-link[onclick*="'+m.view+'"]'));return}
  const el=m.foco&&qs(m.foco);
  if(el){m.scroll?el.scrollIntoView({behavior:'smooth',block:'center'}):el.focus();}
}
async function emitir(){
  // Achado da auditoria de 11/08/2026: a trava (rodando=true) só era setada
  // DEPOIS do await titanConfirm(...) — dois cliques rápidos em "Emitir
  // direto" abriam dois diálogos de confirmação, o segundo cancelando o
  // primeiro sem explicação nenhuma pro usuário. Trava logo no início,
  // antes de qualquer await, cobrindo a função inteira (o finally já
  // existente lá embaixo libera nos dois casos: sucesso e erro).
  if(rodando)return;
  rodando=true;
  qs('#btn-emit').disabled=true;
  try{
    const montagem=await montarPayloadEmissao();
    if(!montagem.ok){tratarFalhaPayload(montagem);return;}
    const payload=montagem.payload,valor=payload.service.amount;
    if(ambienteAtual==='production'){
      const aviso=`ATENÇÃO: esta emissão terá validade fiscal.\n\nEmpresa: ${empresaAtual.rs}\nDPS: série ${empresaAtual.series}, número ${empresaAtual.next}\nTomador: ${payload.borrower.name}\nValor: R$ ${brl(valor)}\n\nConfirma a emissão na Produção oficial?`;
      if(!await titanConfirm(aviso,'Transmitir NFS-e',ambienteAtual==='production'?'err':'warn'))return;
    }
    pipeReset();
    for(let i=0;i<etapas.length-1;i++){
    const st=qs('#st'+i);
    st.className='stage run';
    await new Promise(r=>setTimeout(r,120));
    st.className='stage done';
    }
    const last=qs('#st'+(etapas.length-1));last.className='stage run';
    let result=await api('/api/invoices/emit',{method:'POST',headers:ambienteAtual==='production'?{'X-Confirm-Production':'EMITIR_NFSE_REAL'}:{},body:JSON.stringify(payload)});
    if(result.status==='queued'){
      qs('#result').innerHTML='<div class="result"><span class="pill p-gold">Emissão encaminhada</span><div class="chave">A Sefin está processando a DPS com segurança.</div><div class="foot-note">Você pode continuar no portal; o resultado será consultado automaticamente.</div></div>';
      let finalResult=null;
      for(let attempt=0;attempt<45;attempt++){
        await new Promise(resolve=>setTimeout(resolve,2000));
        const status=await api('/api/invoices/'+encodeURIComponent(result.id)+'/status');
        if(['authorized','rejected','error'].includes(status.status)){finalResult=status;break}
      }
      if(!finalResult)throw new Error('A Sefin ainda não respondeu. A nota permanece na fila fiscal e será atualizada nas Notas emitidas.');
      result=finalResult;
      if(result.status!=='authorized')throw new Error(result.queue?.last_error||result.error_payload?.message||'A Sefin recusou a DPS.');
    }
    last.className='stage done';
    qs('#result').innerHTML=`
        <div class="result ok">
          <div class="flex" style="margin-bottom:8px">
            <span class="pill p-ok">Autorizada na ${ambienteAtual==='production'?'Produção oficial':'Produção Restrita'}</span>
          </div>
          <div class="eyebrow" style="margin-bottom:2px">Chave da NFS-e</div>
          <div class="chave">${result.accessKey||result.access_key||'Autorização recebida'}</div>
          ${result.email_sent_at&&result.email_to?`<div class="foot-note" style="color:#155c39">E-mail enviado para ${esc(result.email_to)}.</div>`:''}
          <div class="foot-note" style="color:#155c39">${ambienteAtual==='production'?'Documento fiscal autorizado pela Sefin Nacional.':'Documento sem validade fiscal, emitido no ambiente oficial de testes.'}</div>
        </div>`;
    await marcarRascunhoConvertidoSeAplicavel(result.id);
    await carregarNotasServidor();
  }catch(error){
    const current=qsa('.stage.run').at(-1);if(current){current.className='stage fail';qs('.dot',current).innerHTML=xSvg}
    qs('#result').innerHTML=`<div class="result no"><span class="pill p-err">Emissão não autorizada</span><div class="chave" style="color:#7d1c1f">${esc(error.message)}</div><div class="foot-note">Nenhuma NFS-e válida foi gerada.</div></div>`;
    dispararMartynPorErro(error.message);
  }finally{
    rodando=false;
    atualizarEstadoBotaoEmitir();
  }
}

/* ---------- Preflight fiscal do Martyn: conferir antes de emitir ---------- */
// Fatos coletados nas perguntas, acumulados entre reconferências para as
// decisões irem refinando. Zerado a cada nova abertura do painel.
let preflightFatos={};
/**
 * Só traduzimos de volta os fatos que uma pergunta representa SEM AMBIGUIDADE.
 * Um mapeamento errado aqui vira conclusão de retenção errada — exatamente o
 * que o motor fiscal existe para impedir. Pergunta fora deste mapa aparece como
 * orientação para o contador, sem o sistema responder pelo cliente.
 */
const PREFLIGHT_MAPA={
  'inss-arts-111-112':{fato:'potentiallySubjectToArts111112',tipo:'bool'},
  'inss-forma-contratacao':{fato:'laborAssignmentOrContract',tipo:'bool'},
  'csrf-natureza-servico':{fato:'serviceUnderArt30',tipo:'bool'},
  'irrf-perfil-servico':{fato:'irrfServiceProfile',tipo:'enum',opcoes:[['Serviços profissionais (consultoria, advocacia, engenharia, TI…)','SERVICOS_PROFISSIONAIS'],['Limpeza, conservação, segurança, vigilância ou locação de mão de obra','LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO_MAO_OBRA'],['Outro serviço','OUTRO']]},
  'regime-tomador':{fato:'borrowerRegime',tipo:'enum',opcoes:[['Simples Nacional','SIMPLES_NACIONAL'],['MEI','MEI'],['Lucro Presumido','LUCRO_PRESUMIDO'],['Lucro Real','LUCRO_REAL'],['Pessoa física','PESSOA_FISICA'],['Imune ou isenta','IMUNE_ISENTA'],['Empresa no exterior','EXTERIOR']]}
};
const PF_STATUS_LABEL={NOT_APPLICABLE:'não se aplica',NOT_SUBJECT:'sem retenção',EXEMPT_OR_DISPENSED:'dispensado',REQUIRED:'retenção obrigatória',CONDITIONAL:'depende de confirmação',NEEDS_REVIEW:'precisa de revisão',BLOCKED:'bloqueado'};
const PF_STATUS_CLS={NOT_APPLICABLE:'off',NOT_SUBJECT:'ok',EXEMPT_OR_DISPENSED:'ok',REQUIRED:'warn',CONDITIONAL:'warn',NEEDS_REVIEW:'warn',BLOCKED:'err'};

// Fatos que o cadastro respondeu sozinho (derivados do código do serviço e do
// cliente — /api/invoices/preflight devolve em `derivados`) e quais deles o
// usuário pediu para reabrir no "trocar". O último preflight fica guardado
// para o "trocar" redesenhar a tela na hora, sem ida e volta ao servidor.
// preflightMeta guarda o rótulo/pergunta de cada fato derivado mesmo depois de
// o usuário trocar a resposta: aí o servidor para de devolver o derivado (quem
// manda é a resposta), e sem essa memória o campo sumiria da tela sem deixar
// como voltar atrás.
let preflightDerivados=[],preflightAbertos={},preflightUltimo=null,preflightMeta={};
function abrirPreflight(){preflightFatos={};preflightAbertos={};preflightUltimo=null;preflightMeta={};conferirComMartyn();}
function fecharPreflight(){const p=qs('#preflight-panel');if(p){p.style.display='none';p.innerHTML='';}}
function pfResponder(id,valor){const cfg=PREFLIGHT_MAPA[id];if(!cfg)return;preflightFatos[cfg.fato]=cfg.tipo==='bool'?(valor==='sim'):valor;conferirComMartyn();}
function pfAbrirTroca(fatos){String(fatos).split(',').filter(Boolean).forEach(f=>{preflightAbertos[f]=true});if(preflightUltimo)renderPreflight(preflightUltimo);}
/** Controle de resposta de uma pergunta do mapa — usado tanto na pergunta quanto na troca de um fato derivado. */
function pfControle(perguntaId){
  const cfg=PREFLIGHT_MAPA[perguntaId];
  if(!cfg)return '<div class="pf-q-info">Confirme este ponto com seu contador antes de emitir.</div>';
  if(cfg.tipo==='bool'){const atual=preflightFatos[cfg.fato];return `<div class="pf-q-acts"><button type="button" class="${atual===true?'on':''}" onclick="pfResponder('${perguntaId}','sim')">Sim</button><button type="button" class="${atual===false?'on':''}" onclick="pfResponder('${perguntaId}','nao')">Não</button></div>`;}
  const atual=preflightFatos[cfg.fato]||'';
  return `<select class="inp pf-q-sel" onchange="pfResponder('${perguntaId}',this.value)"><option value="">Selecione…</option>${cfg.opcoes.map(([lab,val])=>`<option value="${val}" ${atual===val?'selected':''}>${esc(lab)}</option>`).join('')}</select>`;
}

async function conferirComMartyn(){
  const painel=qs('#preflight-panel');
  const montagem=await montarPayloadEmissao();
  painel.style.display='block';
  if(!montagem.ok){painel.innerHTML=`<div class="pf-head pf-err"><b>Faltam dados para conferir</b><button class="pf-x" type="button" onclick="fecharPreflight()" aria-label="Fechar">&times;</button></div><div class="pf-body">${esc(montagem.msg)}</div>`;painel.scrollIntoView({behavior:'smooth',block:'nearest'});return;}
  painel.innerHTML='<div class="pf-body"><span class="sup-typing">Martyn está conferindo a nota…</span></div>';
  painel.scrollIntoView({behavior:'smooth',block:'nearest'});
  try{
    const pf=await api('/api/invoices/preflight',{method:'POST',body:JSON.stringify({...montagem.payload,martynFacts:preflightFatos})});
    renderPreflight(pf);
  }catch(error){
    painel.innerHTML=`<div class="pf-head pf-err"><b>Não consegui conferir agora</b><button class="pf-x" type="button" onclick="fecharPreflight()" aria-label="Fechar">&times;</button></div><div class="pf-body">${esc(error.message||'Falha de comunicação com o servidor.')}</div>`;
  }
}
function renderPreflight(pf){
  const painel=qs('#preflight-panel');
  painel.style.display='block';
  preflightUltimo=pf;preflightDerivados=pf.derivados||[];
  preflightDerivados.forEach(d=>{preflightMeta[d.fato]=d});
  const blocos=[...(pf.structuralBlocks||[]),...(pf.dpsFindings||[]).map(f=>f.message)];
  const temPendencia=(pf.questions||[]).some(q=>q.answerType!=='CONFIRMACAO')||(pf.reviewFlags||[]).length;
  const status=pf.blocked?{cls:'pf-err',txt:'Ainda não dá para emitir'}:temPendencia?{cls:'pf-warn',txt:'Quase lá — confirme os pontos abaixo'}:{cls:'pf-ok',txt:'Tudo certo para emitir'};
  let html=`<div class="pf-head ${status.cls}"><b>${esc(status.txt)}</b><button class="pf-x" type="button" onclick="fecharPreflight()" aria-label="Fechar conferência">&times;</button></div><div class="pf-body">`;
  if(blocos.length)html+='<div class="pf-sec"><span class="pf-sec-t pf-t-err">Impede a emissão</span><ul>'+blocos.map(b=>`<li>${esc(b)}</li>`).join('')+'</ul></div>';
  if((pf.decisions||[]).length)html+='<div class="pf-sec"><span class="pf-sec-t">Retenções federais</span>'+pf.decisions.map(d=>{
    const cls=PF_STATUS_CLS[d.status]||'off',label=PF_STATUS_LABEL[d.status]||d.status;
    const tax=d.tax==='CSLL_PIS_COFINS'?'CSLL/PIS/COFINS':d.tax;
    const calc=(d.amount!=null&&d.base!=null&&d.rate!=null)?` — base R$ ${brl(d.base)} × ${(d.rate*100).toFixed(2)}% = R$ ${brl(d.amount)}`:'';
    return `<div class="pf-dec"><span class="d d-${cls}"></span><span><b>${esc(tax)}</b>: ${esc(label)}${esc(calc)}</span></div>`;
  }).join('')+'</div>';
  if((pf.reviewFlags||[]).length)html+='<div class="pf-sec"><span class="pf-sec-t pf-t-warn">Requer revisão do contador</span><ul>'+pf.reviewFlags.map(f=>`<li>${esc(f)}</li>`).join('')+'</ul></div>';
  // Hipóteses que o código do serviço levantou: ficam à vista, com a origem
  // escrita, e podem ser trocadas. Quando o código dispensa a retenção, a
  // pergunta some — resta só a linha discreta "ajustar" no rodapé da seção.
  const hipoteses=preflightDerivados.filter(d=>d.hipotese&&!preflightAbertos[d.fato]);
  const dispensas=preflightDerivados.filter(d=>!d.hipotese&&!preflightAbertos[d.fato]&&d.perguntaId);
  const reabertos=Object.keys(preflightAbertos).map(f=>preflightMeta[f]).filter(d=>d&&d.perguntaId);
  if(hipoteses.length||dispensas.length||reabertos.length){
    html+='<div class="pf-sec"><span class="pf-sec-t">O Martyn já respondeu por você</span>';
    html+=hipoteses.map(d=>`<div class="pf-der"><div><b>${esc(d.rotulo)}</b>: ${esc(d.valor)}<div class="pf-der-src">${esc(d.origem)}</div></div>${d.perguntaId?`<button type="button" class="pf-der-x" onclick="pfAbrirTroca('${esc(d.fato)}')">trocar</button>`:''}</div>`).join('');
    html+=reabertos.map(d=>`<div class="pf-q"><div class="pf-q-topic">${esc(d.rotulo)}</div><div class="pf-q-prompt">${esc((pf.questions||[]).find(q=>q.id===d.perguntaId)?.prompt||d.rotulo)}</div>${pfControle(d.perguntaId)}</div>`).join('');
    if(dispensas.length)html+=`<div class="pf-der-off">Sem retenção pelo código do serviço: ${dispensas.map(d=>esc(d.rotulo)).join(', ')}. <button type="button" class="pf-der-x" onclick="pfAbrirTroca('${dispensas.map(d=>esc(d.fato)).join(',')}')">ajustar</button></div>`;
    html+='</div>';
  }
  const reabertosIds=reabertos.map(d=>d.perguntaId);
  const perguntas=(pf.questions||[]).filter(q=>q.answerType!=='CONFIRMACAO'&&!reabertosIds.includes(q.id));
  const confirmacao=(pf.questions||[]).find(q=>q.answerType==='CONFIRMACAO');
  if(perguntas.length)html+='<div class="pf-sec"><span class="pf-sec-t">Perguntas do Martyn</span>'+perguntas.map(q=>
    `<div class="pf-q"><div class="pf-q-topic">${esc(q.topic)}</div><div class="pf-q-prompt">${esc(q.prompt)}</div>${pfControle(q.id)}</div>`
  ).join('')+'</div>';
  html+='<div class="pf-foot">';
  if(pf.blocked)html+='<div class="pf-foot-note">Resolva os pontos que impedem a emissão e confira de novo.</div><button class="btn" type="button" onclick="conferirComMartyn()">Conferir de novo</button>';
  else{
    if(confirmacao)html+=`<label class="pf-confirm"><input type="checkbox" id="pf-confirm-chk" onchange="qs('#pf-emitir').disabled=!this.checked"> ${esc(confirmacao.prompt)}</label>`;
    html+=`<button class="btn-a btn" id="pf-emitir" type="button" ${confirmacao?'disabled':''} onclick="fecharPreflight();emitir()">Emitir agora</button>`;
  }
  html+='</div></div>';
  painel.innerHTML=html;
}

/* ---------- rascunhos de emissão ---------- */
// s-info-compl ficava fora do rascunho — trocar de rascunho (ou começar um
// novo) podia deixar uma informação complementar de uma tentativa anterior
// "grudada" na tela (achado do relatório de auditoria 13/08). Os campos de
// IBS/CBS saíram daqui em 19/08/2026 junto com o card da emissão: viraram
// cadastro do serviço, não rascunho de nota.
function dadosRascunho(){return {competenceDate:qs('#s-comp').value,borrower:{name:qs('#t-nome').value,taxId:qs('#t-doc').value,email:qs('#t-mail').value,phone:qs('#t-zap').value,municipalityCode:qs('#t-municipio').value,postalCode:qs('#t-cep').value,street:qs('#t-end').value,number:qs('#t-num').value,district:qs('#t-bairro').value,complement:qs('#t-comp').value,city:qs('#t-cidade').value,state:qs('#t-uf').value},service:{municipalityCode:qs('#s-mun').value,nationalTaxCode:qs('#s-cod').value,nbsCode:qs('#s-nbs').value,description:qs('#s-desc').value,amount:qs('#s-val').value,additionalItems:composicaoItens,serviceCategory:qs('#s-category')?.value||'other',cno:qs('#s-cno')?.value,eventCode:qs('#s-event-code')?.value,eventLocation:qs('#s-event-location')?.value,issTaxation:qs('#s-trib-iss').value,issWithholding:qs('#s-ret-iss').value,pisCofinsCst:qs('#s-cst').value,pisCofinsWithholding:qs('#s-ret-pc').value,pisCofinsBase:qs('#s-pc-base').value,pisRate:qs('#s-pis-rate').value,cofinsRate:qs('#s-cofins-rate').value,pisAmount:qs('#s-pis-amount').value,cofinsAmount:qs('#s-cofins-amount').value,retCp:qs('#s-ret-cp').value,retIrrf:qs('#s-ret-irrf').value,retCsll:qs('#s-ret-csll').value,infoComplementares:qs('#s-info-compl')?.value}}}
function aplicarRascunho(payload){const b=payload.borrower||{},s=payload.service||{};qs('#s-comp').value=payload.competenceDate||'';qs('#t-nome').value=b.name||'';qs('#t-doc').value=b.taxId||'';qs('#t-mail').value=b.email||'';qs('#t-zap').value=b.phone||'';qs('#t-cidade').value=b.city||'';qs('#t-uf').value=b.state||'';qs('#t-municipio').value=b.municipalityCode||'';qs('#t-cep').value=b.postalCode||'';qs('#t-end').value=b.street||'';qs('#t-num').value=b.number||'';qs('#t-bairro').value=b.district||'';qs('#t-comp').value=b.complement||'';qs('#s-mun').value=s.municipalityCode||qs('#s-mun').value;exibirMunicipioPorCodigo('s',qs('#s-mun').value);if(s.nationalTaxCode)qs('#s-cod').value=s.nationalTaxCode;definirNbsSelecionado('s-nbs',s.nbsCode);qs('#s-desc').value=s.description||'';composicaoItens=Array.isArray(s.additionalItems)?s.additionalItems.map(item=>({description:item.description,quantity:Number(item.quantity??1),unitAmount:Number(item.unitAmount??item.amount??0),profileId:item.profileId,ctn:item.ctn,nbs:item.nbs})):[];qs('#s-category').value=s.serviceCategory||'other';qs('#s-cno').value=s.cno||'';qs('#s-event-code').value=s.eventCode||'';qs('#s-event-location').value=s.eventLocation||'';atualizarCamposEspeciais();atualizarComposicao();qs('#s-trib-iss').value=s.issTaxation||'1';qs('#s-ret-iss').value=s.issWithholding||'1';qs('#s-cst').value=s.pisCofinsCst||'';qs('#s-ret-pc').value=s.pisCofinsWithholding||'';qs('#s-pc-base').value=s.pisCofinsBase||'0,00';qs('#s-pis-rate').value=s.pisRate||'0,00';qs('#s-cofins-rate').value=s.cofinsRate||'0,00';qs('#s-pis-amount').value=s.pisAmount||'0,00';qs('#s-cofins-amount').value=s.cofinsAmount||'0,00';qs('#s-ret-cp').value=s.retCp||'0,00';qs('#s-ret-irrf').value=s.retIrrf||'0,00';qs('#s-ret-csll').value=s.retCsll||'0,00';atualizarRetencaoPisCofins('s');travarRetencoes(true);lerParametros();if(qs('#s-info-compl')){qs('#s-info-compl').value=s.infoComplementares||'';qs('#s-info-compl-count').textContent=(s.infoComplementares||'').length}completarCadastroRascunho();}
let rascunhos=[];
let rascunhoTimer;
function filtrarRascunhos(){clearTimeout(rascunhoTimer);rascunhoTimer=setTimeout(carregarRascunhos,250);}
const RASCUNHO_STATUS_LABEL={draft:['','Em aberto'],converted:['p-ok','Convertido em nota'],discarded:['p-off','Descartado']};
async function carregarRascunhos(){
  const params=new URLSearchParams();
  const busca=qs('#draft-search')?.value.trim();if(busca)params.set('search',busca);
  const status=qs('#draft-status')?.value;if(status)params.set('status',status);
  try{
    rascunhos=await api('/api/workspace/drafts'+(params.toString()?'?'+params.toString():''));
    const box=qs('#draft-list');
    box.innerHTML=rascunhos.length?rascunhos.map((item,index)=>{
      const st=RASCUNHO_STATUS_LABEL[item.status||'draft']||['','Em aberto'];
      const badge=item.status&&item.status!=='draft'?`<span class="pill ${st[0]}" style="margin-left:6px">${esc(st[1])}</span>`:'';
      const acoes=item.status==='draft'||!item.status
        ?`<button class="btn btn-s" onclick="abrirRascunho(${index})">Abrir</button><button class="ico-btn" title="Descartar" onclick="descartarRascunho('${item.id}')">🗑</button><button class="ico-btn danger" title="Excluir" onclick="excluirRascunho('${item.id}')">×</button>`
        :`<button class="ico-btn danger" title="Excluir" onclick="excluirRascunho('${item.id}')">×</button>`;
      return `<div class="draft-item"><b>${esc(item.title)}</b>${badge}<span>${new Date(item.updated_at).toLocaleString('pt-BR')}</span><div class="acts" style="margin-top:8px">${acoes}</div></div>`;
    }).join(''):'<div class="empty-state">Nenhum rascunho encontrado.</div>';
  }catch(error){qs('#draft-list').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
async function salvarRascunho(){const title=await titanPrompt('Nome do rascunho',qs('#t-nome').value?`NFS-e — ${qs('#t-nome').value}`:'Nova NFS-e','Salvar rascunho');if(!title)return;try{await api('/api/workspace/drafts',{method:'POST',body:JSON.stringify({title,payload:dadosRascunho()})});await carregarRascunhos()}catch(error){alert(error.message)}}
let rascunhoAbertoId=null;
function abrirRascunho(index){rascunhoAbertoId=rascunhos[index].id;go('emitir',qs('#sb-emitir'));aplicarRascunho(rascunhos[index].payload||{});window.scrollTo(0,0)}
async function excluirRascunho(id){if(!await titanConfirm('Excluir este rascunho?','Excluir rascunho','err'))return;try{await api('/api/workspace/drafts/'+id,{method:'DELETE'});await carregarRascunhos()}catch(error){alert(error.message)}}
async function descartarRascunho(id){if(!await titanConfirm('Marcar este rascunho como descartado? Ele some da lista de "Em aberto", mas continua no histórico.','Descartar rascunho'))return;try{await api('/api/workspace/drafts/'+id+'/discard',{method:'PATCH'});await carregarRascunhos()}catch(error){alert(error.message)}}
// Achado 12/08/2026 (pedido do usuário): rascunho aberto não tinha nenhum
// vínculo com a nota emitida a partir dele. Se a emissão atual veio de um
// rascunho (rascunhoAbertoId setado em abrirRascunho), marca a conversão
// depois que a nota sai com sucesso — sem tornar a emissão dependente
// disso (se essa chamada falhar, a nota já foi emitida normalmente).
async function marcarRascunhoConvertidoSeAplicavel(invoiceId){
  if(!rascunhoAbertoId)return;
  const id=rascunhoAbertoId;rascunhoAbertoId=null;
  try{await api('/api/workspace/drafts/'+id+'/converted',{method:'PATCH',body:JSON.stringify({invoiceId})})}catch{}
}

/* ---------- cadastro de clientes ---------- */
let clientesCadastro=[];
function preencherClienteCadastro(cliente){qs('#cl-doc').value=cliente.tax_id||'';qs('#cl-nome').value=cliente.legal_name||'';qs('#cl-mail').value=cliente.email||'';qs('#cl-mail-alt').value=cliente.email_alt||'';qs('#cl-fone').value=cliente.phone||'';qs('#cl-end').value=cliente.address||'';qs('#cl-cidade').value=cliente.city||cliente.municipality||'';qs('#cl-uf').value=cliente.state||'';qs('#cl-mun').value=cliente.municipality_code||'';qs('#cl-cep').value=cliente.postal_code||'';}
async function consultarClienteCadastro(){const cnpj=normalizarDocumento(qs('#cl-doc').value);if(!cnpjComFormatoValido(cnpj)){alert('A consulta pública exige um CNPJ com 14 caracteres válidos.');return}try{preencherClienteCadastro(await api('/api/customers/cnpj/'+cnpj))}catch(error){alert(error.message)}}
async function salvarCliente(){const taxId=normalizarDocumento(qs('#cl-doc').value),legalName=qs('#cl-nome').value.trim();if(!taxId||!legalName){alert('Informe nome e CPF/CNPJ do cliente.');return}if(salvandoCliente)return;salvandoCliente=true;qs('#cli-save-btn').disabled=true;try{await api('/api/customers',{method:'POST',body:JSON.stringify({taxId,legalName,email:qs('#cl-mail').value.trim()||undefined,emailAlt:qs('#cl-mail-alt').value.trim()||undefined,phone:qs('#cl-fone').value.trim()||undefined,address:qs('#cl-end').value.trim()||undefined,city:qs('#cl-cidade').value.trim()||undefined,state:qs('#cl-uf').value.trim().toUpperCase()||undefined,postalCode:qs('#cl-cep').value.replace(/\D/g,'')||undefined,municipalityCode:qs('#cl-mun').value.replace(/\D/g,'')||undefined})});fecharModalCliente();await carregarClientesCadastro();alert('Cliente salvo.') }catch(error){alert(error.message)}finally{salvandoCliente=false;qs('#cli-save-btn').disabled=false}}
let clienteBuscaTimer;
function filtrarClientesCadastro(){clearTimeout(clienteBuscaTimer);clienteBuscaTimer=setTimeout(carregarClientesCadastro,250);}
// Pedido do usuário (20/08/2026): contagem de cadastros, quantidade por tela e
// "ver todos". O contador não é enfeite — a rota devolvia 20 linhas fixas e
// nada na tela dizia que havia mais, então cliente cadastrado sumia da lista e
// parecia não ter sido salvo.
let clientesPorTela='50';
function trocarQuantidadeClientes(valor){clientesPorTela=valor;carregarClientesCadastro();}
function verTodosClientes(){clientesPorTela='all';const sel=qs('#cl-page-size');if(sel)sel.value='all';carregarClientesCadastro();}
function atualizarContagemClientes(mostrados,total,busca){
  // "1 cliente cadastrados" apareceu na conferência ao vivo: o rótulo também
  // concorda com o total, não só a palavra "cliente".
  const rotulo=busca?' nesta busca':(total===1?' cadastrado':' cadastrados'),contador=qs('#cl-count'),verTodos=qs('#cl-see-all');
  if(contador)contador.textContent=!total?(busca?'Nenhum cliente para esta busca.':'Nenhum cliente cadastrado ainda.')
    :mostrados>=total?`${total.toLocaleString('pt-BR')} ${total===1?'cliente':'clientes'}${rotulo}.`
    :`Mostrando ${mostrados.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')}${rotulo}.`;
  // O botão só aparece quando há algo a mais para ver — botão que não muda nada
  // ensina o usuário a ignorar o botão.
  if(verTodos)verTodos.style.display=mostrados<total?'':'none';
}
async function carregarClientesCadastro(){
  const busca=qs('#cl-search')?.value.trim()||'';
  // A quantidade entra na chave: sem isso, trocar de 50 para "todos" enquanto a
  // primeira consulta ainda está no ar reaproveitaria a resposta antiga.
  try{clientesCadastro=await emVoo('customers?'+busca+'|'+clientesPorTela,()=>api('/api/customers?search='+encodeURIComponent(busca)+'&limit='+encodeURIComponent(clientesPorTela)));
    // total_registros vem em cada linha (COUNT(*) OVER() na rota): é o total do
    // filtro inteiro, ANTES do LIMIT. Sem linha nenhuma, o total é zero.
    atualizarContagemClientes(clientesCadastro.length,clientesCadastro[0]?.total_registros??clientesCadastro.length,busca);
    qs('#client-list').innerHTML=clientesCadastro.length?clientesCadastro.map((item,index)=>`<div class="draft-item"><b>${esc(item.legal_name)}</b><span>${esc(item.tax_id)} · ${esc(item.address||'sem endereço')}</span><div class="acts" style="margin-top:8px"><button class="btn btn-s" onclick="editarClienteCadastro(${index})">Editar</button><button class="btn btn-s" onclick="usarClienteNaEmissao(${index})">Usar na emissão</button></div></div>`).join(''):'<div class="empty-state">Nenhum cliente encontrado.</div>'}catch(error){atualizarContagemClientes(0,0,busca);qs('#client-list').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
function novoClienteCadastro(){
  ['cl-doc','cl-nome','cl-mail','cl-mail-alt','cl-fone','cl-end','cl-cidade','cl-uf','cl-mun','cl-cep'].forEach(id=>{const el=qs('#'+id);if(el)el.value=''});
  qs('#cliente-modal-title').textContent='Novo cliente';
  abrirModalCliente();
}
// Digitou o CNPJ inteiro? Busca sozinho, sem esperar o clique em "Buscar CNPJ"
// (mesmo pedido de 19/08/2026 que fez a seleção de cliente na emissão
// autocompletar). O botão continua ali só como nova tentativa quando a
// consulta pública falha. Silencioso no erro: quem quiser insistir clica.
let clienteDocBuscado='';
qs('#cl-doc')?.addEventListener('blur',async()=>{
  const cnpj=normalizarDocumento(qs('#cl-doc').value);
  if(!cnpjComFormatoValido(cnpj)||cnpj===clienteDocBuscado)return;
  if((qs('#cl-nome').value||'').trim()&&(qs('#cl-mun').value||'').trim())return;
  clienteDocBuscado=cnpj;
  try{preencherClienteCadastro(await api('/api/customers/cnpj/'+cnpj))}catch(error){clienteDocBuscado=''}
});
function abrirModalCliente(){qs('#cliente-modal').classList.add('on');window.setTimeout(()=>qs('#cl-doc')?.focus(),40)}
function fecharModalCliente(){qs('#cliente-modal').classList.remove('on')}
// Achado 12/08/2026 (pedido do usuário): reconsulta a CNPJ pra todo cliente
// cadastrado com CNPJ, em fila no backend (respeita o limite compartilhado
// de 10 consultas/min de registry/cnpj.ts) — poll no progresso a cada 3s até
// terminar, sem travar a tela.
let clienteBulkJobId=null,clienteBulkPollTimer=null;
async function dispararAtualizacaoEmLoteClientes(){
  if(clienteBulkJobId)return;
  const status=qs('#cl-bulk-status'),btn=qs('#cl-bulk-btn');
  try{
    const job=await api('/api/customers/bulk-refresh',{method:'POST'});
    if(!job.totalCustomers){status.style.display='';status.textContent='Nenhum cliente com CNPJ pra atualizar.';return}
    clienteBulkJobId=job.id;btn.disabled=true;
    status.style.display='';status.textContent=`Atualizando 0 de ${job.totalCustomers} clientes...`;
    clienteBulkPollTimer=setInterval(consultarProgressoAtualizacaoLote,3000);
  }catch(error){alert(error.message)}
}
async function consultarProgressoAtualizacaoLote(){
  if(!clienteBulkJobId)return;
  try{
    const job=await api('/api/customers/bulk-refresh/'+clienteBulkJobId);
    const status=qs('#cl-bulk-status');
    status.textContent=`Atualizando ${job.processed_count} de ${job.total_customers} clientes... (${job.succeeded_count} ok, ${job.failed_count} falharam)`;
    if(job.status==='completed'||job.status==='failed'){
      clearInterval(clienteBulkPollTimer);clienteBulkPollTimer=null;clienteBulkJobId=null;
      qs('#cl-bulk-btn').disabled=false;
      status.textContent=`Atualização concluída: ${job.succeeded_count} de ${job.total_customers} clientes atualizados${job.failed_count?`, ${job.failed_count} falharam`:''}.`;
      carregarClientesCadastro();
    }
  }catch(error){clearInterval(clienteBulkPollTimer);clienteBulkPollTimer=null;clienteBulkJobId=null;qs('#cl-bulk-btn').disabled=false;qs('#cl-bulk-status').textContent=error.message;}
}
// Importação de clientes por planilha (pedido do usuário, 19/08/2026): lê e
// valida o CSV no navegador (mesmo padrão do CSV de recorrências —
// dividirLinhaCsv/detectarDelimitadorCsv, mais abaixo no arquivo), mas ao
// confirmar manda o lote inteiro pro backend de uma vez, que vira um job
// (uma linha por tick, cada uma consulta a BrasilAPI antes de gravar) — não
// dá pra fazer uma chamada síncrona por linha aqui como em recorrências,
// porque cada linha depende de uma API externa com limite de taxa.
function baixarModeloClientesCsv(){
  const linhas=[
    'CNPJ;E-mail;Razao social (opcional);Telefone (opcional)',
    // '#' no início = linha de exemplo, ignorada na importação. Sem isso, o
    // CNPJ de exemplo (que tem dígito verificador válido) era lido como
    // cliente de verdade: quem baixasse o modelo e preenchesse abaixo
    // importava junto uma empresa que não é dele, e ainda levava um erro de
    // "CNPJ não encontrado" sem entender de onde veio.
    '#12345678000195;contato@empresa.com.br;;  <- linha de exemplo, apague ou deixe: o # faz o sistema ignorar'
  ];
  const blob=new Blob(['﻿'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='modelo-clientes.csv';
  document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
}
function validarLinhaClienteCsv(partes){
  const [cnpjTexto,email,legalName,phone]=partes;
  const cnpj=(cnpjTexto||'').replace(/\D/g,'');
  const erros=[];
  if(cnpj.length!==14)erros.push('CNPJ inválido (14 dígitos)');
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))erros.push('e-mail inválido');
  return {cnpj:(cnpjTexto||'').trim(),email:(email||'').trim()||undefined,legalName:(legalName||'').trim()||undefined,phone:(phone||'').trim()||undefined,erros};
}
let clientesCsvParseadas=[];
function selecionarArquivoClientesCsv(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    const texto=String(reader.result||'');
    const delimitador=detectarDelimitadorCsv(texto);
    const linhas=texto.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')); // '#' = linha de exemplo do modelo, nunca importada
    clientesCsvParseadas=linhas
      .map((linha,i)=>({numero:i+1,partes:dividirLinhaCsv(linha,delimitador)}))
      .filter((item,i)=>i!==0||(item.partes[0]||'').replace(/\D/g,'').length===14) // 1ª linha sem CNPJ de 14 dígitos = cabeçalho
      .map(item=>({numero:item.numero,...validarLinhaClienteCsv(item.partes)}));
    renderPreviaImportacaoClientesCsv();
  };
  reader.readAsText(file,'utf-8');
  qs('#cl-import-file').value='';
}
function renderPreviaImportacaoClientesCsv(){
  const box=qs('#cl-import-preview');if(!box)return;
  if(!clientesCsvParseadas.length){box.innerHTML='<div class="empty-state">Nenhuma linha reconhecida no arquivo.</div>';return}
  const validas=clientesCsvParseadas.filter(r=>!r.erros.length).length;
  box.innerHTML=`
    <div class="tbl-scroll" style="margin-top:10px"><table class="tbl-cards-mobile">
      <thead><tr><th>Linha</th><th>CNPJ</th><th>E-mail</th><th>Status</th></tr></thead>
      <tbody>${clientesCsvParseadas.map(r=>`<tr>
        <td data-th="Linha">${r.numero}</td>
        <td data-th="CNPJ" class="mono">${esc(r.cnpj||'—')}</td>
        <td data-th="E-mail">${esc(r.email||'—')}</td>
        <td data-th="Status">${r.erros.length?`<span class="pill p-err">${esc(r.erros.join('; '))}</span>`:'<span class="pill p-ok">OK</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="setup-actions" style="margin-top:10px"><span class="foot-note" style="margin:0">${validas} de ${clientesCsvParseadas.length} linha(s) prontas para importar. A API completa o que faltar (razão social, endereço) antes de gravar.</span><button class="btn btn-a right" type="button" ${validas?'':'disabled'} onclick="confirmarImportacaoClientesCsv()">Confirmar importação</button></div>`;
}
let clienteCsvImportJobId=null,clienteCsvImportPollTimer=null;
async function confirmarImportacaoClientesCsv(){
  const linhasValidas=clientesCsvParseadas.filter(r=>!r.erros.length).map(r=>({cnpj:r.cnpj,email:r.email,legalName:r.legalName,phone:r.phone}));
  if(!linhasValidas.length)return;
  const box=qs('#cl-import-preview');
  try{
    const job=await api('/api/customers/import-csv',{method:'POST',body:JSON.stringify({rows:linhasValidas})});
    clienteCsvImportJobId=job.id;
    clientesCsvParseadas=[];
    box.innerHTML=`<div class="hint">Importando 0 de ${job.totalRows}… cada linha consulta a Receita Federal, então é devagar de propósito (uma a cada poucos segundos, pra não estourar o limite de consultas). Pode sair desta tela — continua sozinho.</div>`;
    clienteCsvImportPollTimer=setInterval(consultarProgressoImportacaoClientesCsv,3000);
  }catch(error){
    box.innerHTML=`<div class="foot-note" style="color:#b91c1c">${esc(error.message)}</div>`;
  }
}
async function consultarProgressoImportacaoClientesCsv(){
  if(!clienteCsvImportJobId)return;
  const box=qs('#cl-import-preview');
  try{
    const job=await api('/api/customers/import-csv/'+clienteCsvImportJobId);
    if(job.status==='queued'||job.status==='running'){
      box.innerHTML=`<div class="hint">Importando ${job.processed_count} de ${job.total_rows}… (${job.succeeded_count} ok, ${job.failed_count} falharam até agora)</div>`;
      return;
    }
    clearInterval(clienteCsvImportPollTimer);clienteCsvImportPollTimer=null;clienteCsvImportJobId=null;
    const falhas=(job.failures||[]).map(f=>`Linha ${f.row} (${esc(f.cnpj)}): ${esc(f.message)}`);
    box.innerHTML=`<div class="foot-note">${job.succeeded_count} de ${job.total_rows} cliente(s) importado(s).</div>`+(falhas.length?`<div class="foot-note" style="color:#b91c1c">${falhas.join('<br>')}</div>`:'');
    if(job.succeeded_count>0)await carregarClientesCadastro();
  }catch(error){
    clearInterval(clienteCsvImportPollTimer);clienteCsvImportPollTimer=null;clienteCsvImportJobId=null;
    box.innerHTML=`<div class="foot-note" style="color:#b91c1c">${esc(error.message)}</div>`;
  }
}
// salvarCliente já é upsert por CNPJ/CPF (ON CONFLICT no banco): preencher o
// formulário com um cliente existente e salvar de novo atualiza em vez de
// duplicar — não precisa de rota nem de estado de edição separados.
function editarClienteCadastro(index){const cliente=clientesCadastro[index];if(!cliente)return;preencherClienteCadastro(cliente);qs('#cliente-modal-title').textContent='Editar cliente';abrirModalCliente();}
function usarClienteNaEmissao(index){preencherCliente(clientesCadastro[index]);rascunhoAbertoId=null;go('emitir',qs('.sb-link[onclick*="emitir"]'));}
function abrirClientes(){go('clientes',qs('.sb-link[onclick*="clientes"]'));}

/* ---------- contratos duplicados (importação repetida, 20/08/2026) -------- */
// A tela mostra o que VAI sair antes de sair. Apagar contrato de produção é
// irreversível, e cópia que já emitiu nota carrega histórico fiscal.
let duplicadosAnalise=[];
async function analisarDuplicados(){
  const box=qs('#dup-result'),btn=qs('#dup-scan-btn');if(!box)return;
  box.innerHTML='<div class="empty-state">Analisando...</div>';if(btn)btn.disabled=true;
  try{duplicadosAnalise=await api('/api/invoice-recurrences/duplicados');box.innerHTML=renderDuplicados(duplicadosAnalise)}
  catch(error){box.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
  finally{if(btn)btn.disabled=false}
}
function renderDuplicados(grupos){
  if(!grupos.length)return '<div class="empty-state">Nenhum contrato duplicado — nada a remover.</div>';
  const removiveis=grupos.reduce((soma,g)=>soma+g.removiveis,0),decisao=grupos.filter(g=>g.precisaDecisao).length;
  const linhas=grupos.map(g=>{
    const copias=g.copias.map((c,i)=>{
      const emitiu=c.occurrences_done>0||c.last_invoice_id;
      const marca=i===0?'<span class="pill p-ok">Fica (a primeira)</span>':c.removivel?'<span class="pill p-gold">Será removida</span>':'<span class="pill p-off">Fica — já emitiu nota</span>';
      return `<div class="hint">Cadastrada em ${new Date(c.created_at).toLocaleString('pt-BR')} · ${emitiu?`${c.occurrences_done} emissão(ões)`:'nunca emitiu'} ${marca}</div>`;
    }).join('');
    const trava=g.precisaDecisao?'<div class="hint"><b>Mais de uma cópia já emitiu nota.</b> Nenhuma delas será removida automaticamente — decida qual fica e exclua na lista acima.</div>':'';
    return `<div class="draft-item"><div><b>${esc(g.customer_name)}</b><span>${esc(g.service_name)} · R$ ${brl(Number(g.amount||0))} · dia ${g.day_of_month} · ${g.copias.length} cópias</span>${copias}${trava}</div></div>`;
  }).join('');
  const acao=removiveis?`<div class="setup-actions" style="margin:10px 0 0"><button class="btn btn-p" type="button" onclick="removerDuplicados(${removiveis})">Remover ${removiveis} cópia(s)</button></div>`:'';
  return `<div class="hint" style="margin-bottom:8px"><b>${grupos.length}</b> grupo(s) duplicado(s) · <b>${removiveis}</b> cópia(s) removível(is) com segurança${decisao?` · <b>${decisao}</b> precisa(m) da sua decisão`:''}.</div>${linhas}${acao}`;
}
async function removerDuplicados(quantas){
  if(!await titanConfirm(`Remover ${quantas} cópia(s) de contrato e as previsões de recebimento delas?\n\nNão dá pra desfazer. Nenhuma nota fiscal é tocada, e nenhum contrato que já emitiu é removido.`,'Remover duplicados','err'))return;
  try{
    const r=await api('/api/invoice-recurrences/duplicados/remover',{method:'POST'});
    alert(`${r.removidos} contrato(s) e ${r.previstosRemovidos} previsão(ões) de recebimento removidos.${r.mantidosPorSeguranca?`\n\n${r.mantidosPorSeguranca} cópia(s) foram mantidas porque já emitiram nota.`:''}`);
    await analisarDuplicados();await carregarRecorrencias();
  }catch(error){alert(error.message)}
}

/* ---------- notas recorrentes (agendamento automático de emissão) ---------- */
let recorrencias=[],recorrenciaEditando=null;
function popularServicosRecorrencia(){
  const select=qs('#rc-service');if(!select)return;
  const atual=select.value;
  select.innerHTML='<option value="">Selecione um serviço cadastrado</option>'+perfisServico.map(item=>`<option value="${item.id}">${item.display_number?item.display_number+' — ':''}${esc(item.name)} — ${esc(item.national_code)}</option>`).join('');
  if(perfisServico.some(item=>item.id===atual))select.value=atual;
}
function clienteSelecionadoRecorrencia(){
  const value=(qs('#rc-customer')?.value||'').trim().toLocaleLowerCase('pt-BR');
  return clientesCadastro.find(c=>String(c.legal_name||'').trim().toLocaleLowerCase('pt-BR')===value)||null;
}
// Pedido do usuário (18/08/2026): não é lista, é calendário de verdade —
// grade do mês, cada vencimento no dia certo, navegação mês a mês.
const AGENDA_STATUS_LABEL={draft:['p-off','Rascunho'],scheduled:['p-gold','Agendado'],to_charge:['p-gold','A cobrar'],charged:['p-off','Cobrado'],overdue:['p-off','Vencido']};
const AGENDA_DIAS_SEMANA=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const AGENDA_MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let agendaItens=[],agendaMesAtual=new Date();
// A Agenda carrega o mês visto, o anterior e o seguinte (20/08/2026). Antes
// pedia ±90 dias fixos e o backend cortava em 200 linhas por data crescente:
// com a importação duplicada, os meses do fim do período simplesmente não
// chegavam — setembro vazio, outubro pela metade, e nada dizia que faltava.
function faixaDaAgenda(){
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return {
    from:iso(new Date(agendaMesAtual.getFullYear(),agendaMesAtual.getMonth()-1,1)),
    // Dia 0 do mês seguinte = último dia deste mês, sem tabela de 28/30/31.
    to:iso(new Date(agendaMesAtual.getFullYear(),agendaMesAtual.getMonth()+2,0))
  };
}
async function carregarAgenda(){
  const box=qs('#agenda-calendar');if(!box)return;
  box.innerHTML='<div class="empty-state">Carregando...</div>';
  try{
    const faixa=faixaDaAgenda();
    const data=await api(`/api/workspace/agenda?from=${faixa.from}&to=${faixa.to}`);
    // Encostar no teto deixou de ser invisível.
    const aviso=qs('#agenda-truncado');
    if(aviso){
      aviso.style.display=data.truncado?'':'none';
      if(data.truncado)aviso.textContent='Este período tem mais lançamentos do que a tela carrega de uma vez. Estreite o período para ver tudo.';
    }
    // A data que posiciona o item no calendário é SEMPRE o vencimento
    // (pedido do usuário, 19/08/2026: a Agenda é a projeção do financeiro).
    // Pra recorrência ainda não emitida, o backend manda também a data de
    // emissão prevista — vira linha secundária no detalhe do dia, porque
    // "vence dia 10, a nota sai dia 1" é informação que não existia em
    // lugar nenhum da tela.
    agendaItens=[
      // id e contrato viajam junto porque a Agenda passou a poder editar e
      // excluir o lançamento (pedido do usuário, 20/08/2026) — sem eles a
      // linha do calendário não sabe em quem mexer.
      // soData() normaliza: o calendário casa o lançamento com o dia por
      // split('-'), e um timestamp ali devolve NaN — o item some do mês
      // inteiro sem erro nenhum aparecer.
      ...(data.receivables||[]).map(r=>({id:r.id,data:soData(r.due_date),cliente:r.customer_name,titulo:r.title,valor:r.amount,tipo:'recebimento',status:r.status,emissao:null,contrato:r.invoice_recurrence_id||null,previsto:Boolean(r.invoice_recurrence_id)&&!r.invoice_id})),
      ...(data.recurring||[]).map(r=>({id:r.id,data:soData(r.due_date),cliente:r.customer_name,titulo:r.title,valor:r.amount,tipo:'previsto',status:null,emissao:soData(r.emission_date)||null,contrato:r.recurrence_id||null,previsto:true}))
    ];
    renderCalendarioAgenda();
  }catch(error){box.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
// Recarrega, não só redesenha: a faixa de datas segue o mês visto, então
// navegar para fora da janela carregada mostraria um mês vazio que na verdade
// tem lançamentos.
function mudarMesAgenda(delta){agendaMesAtual=new Date(agendaMesAtual.getFullYear(),agendaMesAtual.getMonth()+delta,1);carregarAgenda()}
function renderCalendarioAgenda(){
  const box=qs('#agenda-calendar');if(!box)return;
  const ano=agendaMesAtual.getFullYear(),mes=agendaMesAtual.getMonth();
  qs('#agenda-mes-label').textContent=AGENDA_MESES[mes]+' de '+ano;
  const primeiroDiaSemana=new Date(ano,mes,1).getDay();
  const diasNoMes=new Date(ano,mes+1,0).getDate();
  const porDia={};
  agendaItens.forEach(item=>{
    const [ai,mi,di]=item.data.split('-').map(Number);
    if(ai===ano&&mi-1===mes)(porDia[di]=porDia[di]||[]).push(item);
  });
  const hoje=new Date();
  let celulas=AGENDA_DIAS_SEMANA.map(d=>`<div class="agenda-cal-head">${d}</div>`).join('');
  for(let i=0;i<primeiroDiaSemana;i++)celulas+='<div class="agenda-cal-cell vazio"></div>';
  for(let dia=1;dia<=diasNoMes;dia++){
    const itensDoDia=porDia[dia]||[];
    const ehHoje=hoje.getFullYear()===ano&&hoje.getMonth()===mes&&hoje.getDate()===dia;
    let valorHtml='';
    if(itensDoDia.length){
      // Valor do dia = o que ainda FALTA receber (pedido do usuário,
      // 19/08/2026): recebido já não entra na conta. Um dia inteiramente
      // quitado mostra "Recebido" em vez de R$ 0,00 — zero pareceria "não
      // havia nada previsto aqui".
      const pendentes=itensDoDia.filter(item=>item.status!=='received');
      const totalPendente=pendentes.reduce((soma,item)=>soma+Number(item.valor||0),0);
      // Mesma correção de 20/08/2026: o dia inteiramente previsto perdia o
      // destaque visual porque a previsão passou a chegar como 'recebimento'.
      const todosPrevistos=pendentes.length&&pendentes.every(ehItemPrevisto);
      valorHtml=pendentes.length
        ?`<span class="agenda-cal-valor${todosPrevistos?' previsto':''}">R$ ${brl(totalPendente)}</span>`
        :'<span class="agenda-cal-valor recebido">Recebido</span>';
      // A contagem saiu daqui: os próprios lançamentos aparecem no quadro
      // agora, e o "+N" abaixo cobre o que não coube.
    }
    // Dentro do quadro, SÓ o valor que falta receber (pedido do usuário,
    // 20/08/2026, depois de ver os nomes na tela). Nome de cliente dentro da
    // célula competia com o número — e o número é o que se lê varrendo o mês.
    // Quem é cada lançamento continua a um clique, no detalhe do dia.
    celulas+=`<div class="agenda-cal-cell${ehHoje?' hoje':''}${itensDoDia.length?' tem-item':''}" onclick="mostrarDiaAgenda(${dia})"><span class="agenda-cal-dia">${dia}</span>${valorHtml}</div>`;
  }
  box.innerHTML=celulas;
  qs('#agenda-day-detail').style.display='none';
  agendaDiaAberto=null;
}
const AGENDA_FILTROS=[['todos','Todos'],['receber','A receber'],['recebido','Recebido'],['previsto','Previsto']];
let agendaDiaAberto=null,agendaFiltro='todos';
function itensDoDiaAgenda(dia){
  const ano=agendaMesAtual.getFullYear(),mes=agendaMesAtual.getMonth();
  return agendaItens.filter(item=>{const [ai,mi,di]=item.data.split('-').map(Number);return ai===ano&&mi-1===mes&&di===dia});
}
/**
 * O que ainda é PREVISÃO do contrato, e não recebimento firmado.
 *
 * Até 20/08/2026 dava para saber isso só pela origem: previsão vinha em
 * `recurring` (tipo 'previsto') e recebimento em `receivables`. Quando o
 * contrato passou a gravar a previsão de verdade em receivable_schedules, ela
 * passou a chegar como tipo 'recebimento' — e os filtros do calendário, que
 * testavam só o tipo, zeraram "Previsto" e jogaram tudo em "A receber".
 *
 * Agora quem decide é o dado: tem contrato e ainda não tem nota fiscal.
 * Declarada como function (não const) porque renderCalendarioAgenda, acima,
 * também usa — e precisa do hoisting.
 */
function ehItemPrevisto(item){return item.tipo==='previsto'||item.previsto===true}
function agendaItemNoFiltro(item,filtro){
  // Os três baldes são disjuntos: uma previsão não conta como "a receber",
  // senão o mesmo lançamento apareceria em dois filtros e a soma do dia
  // deixaria de bater com a lista.
  if(filtro==='receber')return !ehItemPrevisto(item)&&item.status!=='received';
  if(filtro==='recebido')return item.status==='received';
  if(filtro==='previsto')return ehItemPrevisto(item);
  return true;
}
function filtrarDiaAgenda(filtro){agendaFiltro=filtro;mostrarDiaAgenda(agendaDiaAberto)}
function mostrarDiaAgenda(dia){
  if(dia==null)return;
  if(agendaDiaAberto!==dia){agendaDiaAberto=dia;agendaFiltro='todos'}
  const mes=agendaMesAtual.getMonth();
  const itensDoDia=itensDoDiaAgenda(dia);
  const box=qs('#agenda-day-detail');
  if(!itensDoDia.length){box.style.display='none';agendaDiaAberto=null;return}
  box.style.display='block';
  const visiveis=itensDoDia.filter(item=>agendaItemNoFiltro(item,agendaFiltro));
  const total=visiveis.reduce((soma,item)=>soma+Number(item.valor||0),0);
  const filtros=AGENDA_FILTROS.map(([id,label])=>{
    const quantos=itensDoDia.filter(item=>agendaItemNoFiltro(item,id)).length;
    return `<button class="btn btn-s comm-tab-btn${agendaFiltro===id?' on':''}" type="button" onclick="filtrarDiaAgenda('${id}')">${label} (${quantos})</button>`;
  }).join('');
  // Uma linha por lançamento (pedido do usuário, 20/08/2026). O cartão de três
  // linhas empurrava um dia com 5 vencimentos para fora da tela; aqui o que
  // importa é varrer a lista, não ler cada item em detalhe.
  const lista=visiveis.length?visiveis.map(item=>{
    const tipoPill=ehItemPrevisto(item)
      ?'<span class="pill p-gold" title="Nota recorrente ainda não emitida — vira recebimento quando o contrato disparar">Previsto</span>'
      :(()=>{const [c,l]=AGENDA_STATUS_LABEL[item.status]||['p-off',item.status];return `<span class="pill ${c}">${l}</span>`})();
    const emissao=item.emissao?` · nota em ${dataBR(item.emissao)}`:'';
    const acoes=[
      item.contrato?`<button class="btn btn-s" type="button" title="Abrir o contrato que gera este lançamento" onclick="editarContratoDaAgenda('${item.contrato}')">Editar</button>`:'',
      item.tipo==='recebimento'?`<button class="btn btn-s" type="button" title="Cancela este lançamento (não apaga o contrato nem a nota)" onclick="cancelarLancamentoAgenda('${item.id}')">Excluir</button>`:''
    ].join('');
    return `<div class="draft-item" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 10px">
      <span style="flex:1;min-width:180px"><b>${esc(item.titulo)}</b> <span class="hint" style="display:inline">· ${esc(item.cliente)}${emissao}</span></span>
      <b style="white-space:nowrap">R$ ${brl(Number(item.valor||0))}</b>${tipoPill}${acoes}</div>`;
  }).join(''):'<div class="empty-state">Nenhum lançamento neste filtro.</div>';
  const atalho='<button class="btn btn-s" type="button" style="margin-left:auto" onclick="irParaRecebimentos()">Ver em Recebimentos</button>';
  box.innerHTML=`<h3>${dia} de ${AGENDA_MESES[mes]} <span style="font-weight:400;color:var(--ink-3);font-size:12.5px">· R$ ${brl(total)} em ${AGENDA_FILTROS.find(([id])=>id===agendaFiltro)[1].toLowerCase()}</span></h3><div class="agenda-day-filters" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${filtros}${atalho}</div>${lista}`;
}
/** Atalho pedido em 20/08/2026: da Agenda direto para a tela que edita de verdade. */
function irParaRecebimentos(){go('recebimentos',qs('.sb-nav.user-sidebar button.sb-link[onclick*="recebimentos"]'))}
function editarContratoDaAgenda(contratoId){
  go('recorrentes',qs('.sb-nav.user-sidebar button.sb-link[onclick*="recorrentes"]'));
  // carregarRecorrencias() é quem popula a lista que editarRecorrencia() lê.
  carregarRecorrencias().then(()=>editarRecorrencia(contratoId)).catch(()=>{});
}
async function cancelarLancamentoAgenda(id){
  // Não existe exclusão física de recebimento — e é proposital: o histórico
  // financeiro não some, ele fica cancelado. A Agenda já não mostra cancelado.
  if(!await titanConfirm('Cancelar este lançamento?\n\nEle sai da Agenda e das somas. O contrato recorrente e qualquer nota fiscal continuam como estão.','Cancelar lançamento','err'))return;
  try{await api('/api/workspace/receivables/'+id+'/status',{method:'PATCH',body:JSON.stringify({status:'cancelled'})});await carregarAgenda()}
  catch(error){alert(error.message)}
}
async function carregarRecorrencias(){
  try{
    if(!clientesCadastro.length)clientesCadastro=await api('/api/customers?search=');
    await carregarPerfisServico();
    await carregarRegistrosAuxiliares();
    popularPresetsRecorrencia();
    if(qs('#rc-customer-list'))qs('#rc-customer-list').innerHTML=clientesCadastro.map(c=>`<option value="${esc(c.legal_name)}">${esc(formatarCnpj(c.tax_id||''))}</option>`).join('');
    popularServicosRecorrencia();
    recorrencias=await api('/api/invoice-recurrences');
    renderRecorrencias();
  }catch(error){const box=qs('#recurrence-list');if(box)box.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
const RECORRENCIA_FREQUENCIA_LABEL={1:'mensal',3:'trimestral',6:'semestral',12:'anual'};
/* ---------- seleção em bloco (pedido do usuário, 20/08/2026) ------------- */
// "Uma seleção pra eu fazer uma ação com todos: editar em bloco, pausar,
// emitir agora e excluir." Guardado por id, não por índice: a lista recarrega
// depois de cada ação e índice apontaria para outro contrato.
let recorrenciasSelecionadas=new Set();
function alternarSelecaoRecorrencia(id,marcado){marcado?recorrenciasSelecionadas.add(id):recorrenciasSelecionadas.delete(id);atualizarBarraDeBloco()}
function selecionarTodasRecorrencias(marcado){
  recorrenciasSelecionadas=marcado?new Set(recorrencias.map(r=>r.id)):new Set();
  qsa('#recurrence-list input[type=checkbox]').forEach(el=>{el.checked=marcado});
  atualizarBarraDeBloco();
}
function atualizarBarraDeBloco(){
  const barra=qs('#rc-bulk-bar'),n=recorrenciasSelecionadas.size;
  if(!barra)return;
  barra.style.display=n?'':'none';
  const rotulo=qs('#rc-bulk-count');if(rotulo)rotulo.textContent=`${n} contrato(s) selecionado(s)`;
  const todos=qs('#rc-check-all');if(todos)todos.checked=n>0&&n===recorrencias.length;
}
async function acaoEmBloco(acao){
  const ids=[...recorrenciasSelecionadas];
  if(!ids.length){alert('Selecione ao menos um contrato.');return}
  // Cada ação com o aviso do seu tamanho. "Emitir" é a única que cria
  // documento fiscal — o texto diz isso com todas as letras.
  const perguntas={
    pausar:[`Pausar ${ids.length} contrato(s)?\n\nEles param de emitir e as previsões de recebimento saem da Agenda. Dá pra retomar depois.`,'Pausar contratos','warn'],
    retomar:[`Retomar ${ids.length} contrato(s)?\n\nVoltam a emitir na próxima data programada.`,'Retomar contratos','warn'],
    excluir:[`Excluir ${ids.length} contrato(s)?\n\nSai o contrato e as previsões de recebimento dele. NÃO dá pra desfazer.\n\nNota fiscal já emitida e recebimento já cobrado continuam onde estão.`,'Excluir contratos','err'],
    emitir:[`EMITIR NFS-e AGORA para ${ids.length} contrato(s)?\n\nIsto gera ${ids.length} nota(s) fiscal(is) DE VERDADE, uma por contrato. Cancelar nota depois exige motivo oficial na Sefin.`,'Emitir notas fiscais','err']
  };
  const [mensagem,titulo,variante]=perguntas[acao];
  if(!await titanConfirm(mensagem,titulo,variante))return;
  const botoes=qsa('#rc-bulk-bar button');botoes.forEach(b=>{b.disabled=true});
  try{
    const r=await api('/api/invoice-recurrences/bulk',{method:'POST',body:JSON.stringify({ids,acao})});
    if(acao==='emitir'){
      const falhas=(r.falhas||[]).map(f=>'• '+f.erro).join('\n');
      alert(`${r.emitidas} nota(s) emitida(s).${falhas?`\n\n${r.falhas.length} não saíram:\n${falhas}`:''}`);
    }else{
      alert(`${r.afetados} contrato(s) ${acao==='excluir'?'excluído(s)':acao==='pausar'?'pausado(s)':'atualizado(s)'}.${r.previstosRemovidos?`\n${r.previstosRemovidos} previsão(ões) de recebimento removida(s).`:''}`);
    }
    recorrenciasSelecionadas=new Set();
    await carregarRecorrencias();
  }catch(error){alert(error.message)}
  finally{botoes.forEach(b=>{b.disabled=false})}
}
async function editarEmBloco(){
  const ids=[...recorrenciasSelecionadas];
  if(!ids.length){alert('Selecione ao menos um contrato.');return}
  const campos={};
  const valor=qs('#rc-bulk-amount')?.value.trim();if(valor)campos.amount=dinheiro(valor);
  const dia=qs('#rc-bulk-day')?.value.trim();if(dia)campos.dayOfMonth=Number(dia);
  const venc=qs('#rc-bulk-due')?.value.trim();if(venc)campos.dueDayOfMonth=Number(venc);
  const hora=qs('#rc-bulk-time')?.value.trim();if(hora)campos.runTime=hora;
  const freq=qs('#rc-bulk-freq')?.value;if(freq)campos.frequencyMonths=Number(freq);
  // Campo em branco PRESERVA o que está gravado — em bloco, o risco é zerar
  // sem querer o que não se quis mexer.
  if(!Object.keys(campos).length){alert('Preencha ao menos um campo para alterar. Campo em branco mantém o valor atual.');return}
  const resumo=Object.entries(campos).map(([k,v])=>`${k}: ${v}`).join('\n');
  if(!await titanConfirm(`Aplicar em ${ids.length} contrato(s)?\n\n${resumo}\n\nOs campos em branco não mudam.`,'Editar em bloco'))return;
  try{
    const r=await api('/api/invoice-recurrences/bulk',{method:'POST',body:JSON.stringify({ids,acao:'editar',campos})});
    alert(`${r.afetados} contrato(s) atualizado(s).`);
    fecharModalBlocoRecorrencia();recorrenciasSelecionadas=new Set();await carregarRecorrencias();
  }catch(error){alert(error.message)}
}
function abrirModalBlocoRecorrencia(){
  if(!recorrenciasSelecionadas.size){alert('Selecione ao menos um contrato.');return}
  ['#rc-bulk-amount','#rc-bulk-day','#rc-bulk-due','#rc-bulk-time'].forEach(s=>{const el=qs(s);if(el)el.value=''});
  const freq=qs('#rc-bulk-freq');if(freq)freq.value='';
  const alvo=qs('#rc-bulk-alvo');if(alvo)alvo.textContent=`${recorrenciasSelecionadas.size} contrato(s) selecionado(s)`;
  qs('#recorrencia-bloco-modal').classList.add('on');
}
function fecharModalBlocoRecorrencia(){qs('#recorrencia-bloco-modal').classList.remove('on')}
function renderRecorrencias(){
  const box=qs('#recurrence-list');if(!box)return;
  // Seleção some junto com o contrato que saiu da lista.
  recorrenciasSelecionadas=new Set([...recorrenciasSelecionadas].filter(id=>recorrencias.some(r=>r.id===id)));
  atualizarBarraDeBloco();
  if(!recorrencias.length){box.innerHTML='<tr><td colspan="7"><div class="empty-state">Nenhum contrato cadastrado — configure uma nota que se repete todo mês e o TITAN emite sozinho.</div></td></tr>';return}
  box.innerHTML=recorrencias.map(item=>{
    const hora=(item.run_time||'09:00:00').slice(0,5);
    const proxima=`${new Date(item.next_run_date+'T00:00:00').toLocaleDateString('pt-BR')} às ${hora}`;
    const status=!item.active?'<span class="pill p-off">Pausada</span>':item.last_error?'<span class="pill p-err">Falhou</span>':'<span class="pill p-ok">Ativa</span>';
    const freq=RECORRENCIA_FREQUENCIA_LABEL[item.frequency_months||1]||'mensal';
    const fim=item.total_occurrences
      ?` · parcela ${Math.min((item.occurrences_done||0)+1,item.total_occurrences)} de ${item.total_occurrences}`
      :(item.end_date?` · encerra em ${new Date(item.end_date+'T00:00:00').toLocaleDateString('pt-BR')}`:'');
    return `<tr>
      <td data-th="Selecionar" style="width:34px"><input type="checkbox" aria-label="Selecionar contrato de ${esc(item.customer_name)}" ${recorrenciasSelecionadas.has(item.id)?'checked':''} onchange="alternarSelecaoRecorrencia('${item.id}',this.checked)"></td>
      <td data-th="Cliente / serviço"><b>${esc(item.customer_name)}</b><br><span style="color:var(--ink-3);font-size:11.5px">${esc(item.service_name)}</span></td>
      <td class="r" data-th="Valor">R$ ${brl(Number(item.amount))}</td>
      <td data-th="Agenda">Todo dia ${item.day_of_month}, ${freq}${fim}</td>
      <td data-th="Próxima emissão">${proxima}</td>
      <td data-th="Situação"><div>${status}${item.last_error?`<div class="foot-note" style="color:#b91c1c">${esc(item.last_error)}</div>`:''}</div></td>
      <td data-th="Ações"><div class="acts">
        <button class="ico-btn" title="Editar" onclick="editarRecorrencia('${item.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="ico-btn" title="${item.active?'Pausar':'Reativar'}" onclick="alternarRecorrencia('${item.id}',${!item.active})">${item.active?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>':'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-14 9V3z"/></svg>'}</button>
        <button class="ico-btn" title="Emitir agora" onclick="emitirRecorrenciaAgora('${item.id}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg></button>
        <button class="ico-btn danger" title="Excluir" onclick="excluirRecorrencia('${item.id}')">×</button>
      </div></td>
    </tr>`;
  }).join('');
}
async function salvarRecorrencia(){
  const cliente=clienteSelecionadoRecorrencia(),serviceProfileId=qs('#rc-service')?.value,amount=dinheiro(qs('#rc-amount').value),dayOfMonth=Number(qs('#rc-day').value);
  const dueDayTexto=qs('#rc-due-day').value.trim();
  if(!cliente){alert('Selecione um cliente cadastrado.');return}
  if(!serviceProfileId){alert('Selecione um serviço cadastrado.');return}
  if(!amount||amount<=0){alert('Informe um valor maior que zero.');return}
  if(!dayOfMonth||dayOfMonth<1||dayOfMonth>28){alert('Informe um dia do mês entre 1 e 28.');return}
  if(!dueDayTexto||Number(dueDayTexto)<1||Number(dueDayTexto)>28){alert('Informe o dia de vencimento (1 a 28). É ele que define o vencimento do recebimento na Agenda.');return}
  const termino=qs('#rc-termino').value,vezes=Number(qs('#rc-parcelas').value)||0;
  if(termino==='parcelas'&&(!vezes||vezes<1||vezes>120)){alert('Informe quantas parcelas (1 a 120).');return}
  // No modo "o valor informado é o total", o que vai pro backend é o valor de
  // CADA nota — o total só existe na tela, como forma de digitar.
  const valorDaNota=termino==='parcelas'?valorDaParcelaRecorrencia():amount;
  if(!valorDaNota||valorDaNota<=0){alert('O valor de cada parcela ficou zerado. Revise o valor ou o número de parcelas.');return}
  const payload={customerId:cliente.id,serviceProfileId,amount:valorDaNota,dayOfMonth,runTime:qs('#rc-time').value||'09:00',dueDayOfMonth:Number(dueDayTexto),frequencyMonths:Number(qs('#rc-frequency').value)||1,endDate:termino==='data'?(qs('#rc-end-date').value||undefined):undefined,totalOccurrences:termino==='parcelas'?vezes:undefined,description:qs('#rc-description').value.trim()||undefined};
  try{
    if(recorrenciaEditando)await api('/api/invoice-recurrences/'+recorrenciaEditando,{method:'PUT',body:JSON.stringify(payload)});
    else await api('/api/invoice-recurrences',{method:'POST',body:JSON.stringify(payload)});
    cancelarEdicaoRecorrencia();
    await carregarRecorrencias();
  }catch(error){alert(error.message)}
}
function editarRecorrencia(id){
  const item=recorrencias.find(r=>r.id===id);if(!item)return;
  recorrenciaEditando=id;
  qs('#rc-customer').value=item.customer_name;
  qs('#rc-service').value=item.service_profile_id;
  qs('#rc-amount').value=Number(item.amount).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  qs('#rc-day').value=item.day_of_month;
  qs('#rc-time').value=(item.run_time||'09:00:00').slice(0,5);
  qs('#rc-due-day').value=item.due_day_of_month||'';
  qs('#rc-frequency').value=String(item.frequency_months||1);
  qs('#rc-end-date').value=item.end_date||'';
  qs('#rc-description').value=item.description||'';
  // Ao editar, o valor guardado é sempre o de CADA nota — então o modo volta
  // como "valor da parcela", nunca "total": remontar o total dividido daria
  // um número que talvez nem seja o que a pessoa digitou (o centavo perdido
  // na divisão não tem volta).
  qs('#rc-termino').value=item.total_occurrences?'parcelas':(item.end_date?'data':'aberto');
  qs('#rc-parcelas').value=item.total_occurrences||'';
  qs('#rc-parcelas-modo').value='parcela';
  alternarTerminoRecorrencia();
  qs('#rc-form-title').textContent='Editar contrato recorrente';
  abrirModalRecorrencia();
  verificarVencimentoRecorrencia();
}
function novaRecorrencia(){cancelarEdicaoRecorrencia();abrirModalRecorrencia();}
function abrirModalRecorrencia(){qs('#recorrencia-modal').classList.add('on')}
function fecharModalRecorrencia(){qs('#recorrencia-modal').classList.remove('on')}
// Achado 15/08/2026 (pedido do usuário: variáveis #vencimento/#competencia/
// #valor_extenso na descrição do serviço, ver nfse/descricao-variaveis.ts):
// #vencimento só é substituído quando a recorrência tem dia de vencimento
// configurado — aviso não-bloqueante evita a variável vazar como texto
// literal pra uma nota real.
/**
 * Parcelamento (pedido do usuário, 19/08/2026). Duas formas, porque ele
 * descreveu as duas: "vou parcelar o valor total em tantas vezes OU vou
 * fazer tantas vezes desse valor".
 *
 * O backend guarda só quantas vezes emitir (total_occurrences) e o valor de
 * CADA nota (amount) — dividir um total é conta daqui. Por isso a prévia
 * mostra o total que vai sair de verdade: R$ 1.000 em 3x dá 3 × R$ 333,33 =
 * R$ 999,99, e esconder esse centavo seria mentir sobre o que será emitido.
 */
function alternarTerminoRecorrencia(){
  const modo=qs('#rc-termino').value;
  qs('#rc-end-date-wrap').style.display=modo==='data'?'':'none';
  qs('#rc-parcelas-wrap').style.display=modo==='parcelas'?'':'none';
  if(modo!=='data')qs('#rc-end-date').value='';
  if(modo!=='parcelas'){qs('#rc-parcelas').value='';qs('#rc-parcelas-previa').textContent='';}
  else renderPreviaParcelas();
  atualizarRotuloValorRecorrencia();
}
function atualizarRotuloValorRecorrencia(){
  const total=qs('#rc-termino').value==='parcelas'&&qs('#rc-parcelas-modo').value==='total';
  qs('#rc-amount-label').textContent=total?'Valor total do contrato (R$)':'Valor (R$)';
}
function valorDaParcelaRecorrencia(){
  const informado=dinheiro(qs('#rc-amount').value),vezes=Number(qs('#rc-parcelas').value)||0;
  if(qs('#rc-termino').value!=='parcelas'||!vezes)return informado;
  if(qs('#rc-parcelas-modo').value!=='total')return informado;
  // Trunca em 2 casas em vez de arredondar: arredondar pra cima faria a soma
  // das parcelas passar do total contratado, que é pior que faltar centavo.
  return Math.floor((informado/vezes)*100)/100;
}
function renderPreviaParcelas(){
  atualizarRotuloValorRecorrencia();
  const box=qs('#rc-parcelas-previa');if(!box)return;
  const vezes=Number(qs('#rc-parcelas').value)||0,informado=dinheiro(qs('#rc-amount').value);
  if(!vezes||!informado){box.textContent='Informe o valor e quantas vezes pra ver o resumo.';return}
  const parcela=valorDaParcelaRecorrencia(),somaReal=Math.round(parcela*vezes*100)/100;
  const modoTotal=qs('#rc-parcelas-modo').value==='total';
  const diferenca=modoTotal?Math.round((informado-somaReal)*100)/100:0;
  box.innerHTML=`${vezes}x de <b>R$ ${brl(parcela)}</b> · total emitido <b>R$ ${brl(somaReal)}</b>`
    +(diferenca>0?` <span style="color:var(--warn)">· R$ ${brl(diferenca)} não cabem na divisão exata — ajuste o valor ou o número de parcelas se precisar fechar certinho</span>`:'');
}
function verificarVencimentoRecorrencia(){
  const hint=qs('#rc-due-day-hint');if(!hint)return;
  const servico=perfisServico.find(p=>p.id===qs('#rc-service')?.value);
  const usaVencimento=servico&&/#vencimento/i.test(servico.description||'');
  if(usaVencimento&&!qs('#rc-due-day').value.trim()){
    hint.textContent='Este serviço usa #vencimento na descrição — preencha o dia de vencimento pra ele aparecer certo na nota.';
    hint.style.display='block';
  }else hint.style.display='none';
}
// Achado 14/08/2026 (pedido do usuário: "importar por planilha não txt ou
// ;"): planilha CSV de verdade (baixar modelo, preencher no Excel/Sheets,
// enviar de volta) em vez de colar texto com ";" à mão. Sem endpoint novo
// nem multer — o parse é 100% client-side (FileReader), reaproveitando o
// mesmo POST /api/invoice-recurrences de sempre, uma chamada por linha
// válida. Cliente é resolvido por CPF/CNPJ; serviço aceita o NÚMERO de Meus
// Serviços (mais confiável — ver display_number, achado 14/08/2026) ou, se
// não for número, o NOME exato já cadastrado.
//
// Delimitador é detectado (";" ou ",") em vez de fixo: Excel em pt-BR
// exporta CSV com ";" (","  é separador decimal no Brasil — mesma convenção
// que dinheiro() já assume); um CSV internacional genuíno usaria "," como
// delimitador e "." como decimal, então o parser de valor segue o mesmo
// delimitador detectado em vez de sempre assumir vírgula decimal.
function dividirLinhaCsv(linha,delimitador){
  const campos=[];let atual='',aspas=false;
  for(let i=0;i<linha.length;i++){
    const c=linha[i];
    if(aspas){
      if(c==='"'){if(linha[i+1]==='"'){atual+='"';i++;}else aspas=false;}
      else atual+=c;
    }else if(c==='"')aspas=true;
    else if(c===delimitador){campos.push(atual);atual='';}
    else atual+=c;
  }
  campos.push(atual);
  return campos.map(c=>c.trim());
}
function detectarDelimitadorCsv(texto){
  const primeiraLinha=texto.split(/\r?\n/).find(l=>l.trim())||'';
  const pontoEVirgula=(primeiraLinha.match(/;/g)||[]).length;
  const virgula=(primeiraLinha.match(/,/g)||[]).length;
  return pontoEVirgula>=virgula?';':',';
}
function numeroValorCsv(valorTexto,delimitador){
  return delimitador===','?(Number(String(valorTexto||'0').replace(/[^0-9.-]/g,''))||0):dinheiro(valorTexto);
}
function validarLinhaRecorrencia(partes,delimitador){
  const [doc,servicoCampo,valorTexto,diaTexto,vencTexto,horaTexto,freqTexto,fimTexto,parcelasTexto]=partes;
  const docNormalizado=(doc||'').replace(/\D/g,'');
  const cliente=clientesCadastro.find(c=>(c.tax_id||'').replace(/\D/g,'')===docNormalizado);
  const servicoCampoLimpo=(servicoCampo||'').trim();
  const servico=/^\d+$/.test(servicoCampoLimpo)
    ? perfisServico.find(p=>String(p.display_number)===servicoCampoLimpo)
    : perfisServico.find(p=>supNorm(p.name)===supNorm(servicoCampoLimpo));
  const amount=numeroValorCsv(valorTexto,delimitador);
  const dayOfMonth=Number(diaTexto);
  const dueDayOfMonth=Number(vencTexto);
  const horaLimpa=(horaTexto||'').trim();
  const runTime=/^([01]?\d|2[0-3]):[0-5]\d$/.test(horaLimpa)?horaLimpa.padStart(5,'0'):null;
  const frequencyMonths=Number(freqTexto)||1;
  const endDate=(fimTexto||'').trim()||undefined;
  // Parcelas em branco = contrato sem fim (o padrão). Na planilha o valor é
  // sempre o de CADA nota — dividir um total é escolha da tela, não faz
  // sentido aqui, onde cada linha já traz o valor final.
  const parcelasLimpo=(parcelasTexto||'').trim();
  const totalOccurrences=parcelasLimpo?Number(parcelasLimpo):undefined;
  const erros=[];
  if(parcelasLimpo&&(!Number.isInteger(totalOccurrences)||totalOccurrences<1||totalOccurrences>120))erros.push('parcelas inválidas (1 a 120, ou deixe em branco)');
  if(!cliente)erros.push(`cliente "${doc||''}" não encontrado`);
  if(!servico)erros.push(`serviço "${servicoCampoLimpo}" não encontrado`);
  if(!amount||amount<=0)erros.push('valor inválido');
  if(!dayOfMonth||dayOfMonth<1||dayOfMonth>28)erros.push('dia do mês inválido (1 a 28)');
  if(!dueDayOfMonth||dueDayOfMonth<1||dueDayOfMonth>28)erros.push('dia de vencimento inválido (1 a 28)');
  if(!runTime)erros.push('horário inválido (use HH:MM)');
  if(![1,3,6,12].includes(frequencyMonths))erros.push('frequência precisa ser 1, 3, 6 ou 12');
  return {cliente,servico,amount,dayOfMonth,dueDayOfMonth,runTime:runTime||'09:00',frequencyMonths,endDate,totalOccurrences,erros,doc,servicoCampoLimpo};
}
function baixarModeloRecorrenciaCsv(){
  const linhas=[
    'CPF/CNPJ do cliente;Servico (numero ou nome);Valor;Dia do mes;Dia de vencimento;Horario (HH:MM);Frequencia (1/3/6/12);Data fim (opcional, AAAA-MM-DD);Parcelas (opcional)',
    '#12345678000195;Honorarios contabeis;500,00;5;10;09:00;1;;12  <- linha de exemplo, o # faz o sistema ignorar'
  ];
  const blob=new Blob(['﻿'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='modelo-recorrencias.csv';
  document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
}
let recorrenciasCsvParseadas=[];
function selecionarArquivoRecorrenciaCsv(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=async()=>{
    if(!clientesCadastro.length)clientesCadastro=await api('/api/customers?search=');
    await carregarPerfisServico();
    const texto=String(reader.result||'');
    const delimitador=detectarDelimitadorCsv(texto);
    const linhas=texto.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')); // '#' = linha de exemplo do modelo, nunca importada
    recorrenciasCsvParseadas=linhas
      .map((linha,i)=>({numero:i+1,partes:dividirLinhaCsv(linha,delimitador)}))
      .filter((item,i)=>i!==0||(Number(item.partes[3])>=1&&Number(item.partes[3])<=28)) // 1ª linha com "dia" não numérico = cabeçalho
      .map(item=>({numero:item.numero,...validarLinhaRecorrencia(item.partes,delimitador)}));
    renderPreviaImportacaoCsv();
  };
  reader.readAsText(file,'utf-8');
  qs('#rc-import-file').value='';
}
function renderPreviaImportacaoCsv(){
  const box=qs('#rc-import-preview');if(!box)return;
  if(!recorrenciasCsvParseadas.length){box.innerHTML='<div class="empty-state">Nenhuma linha reconhecida no arquivo.</div>';return}
  const validas=recorrenciasCsvParseadas.filter(r=>!r.erros.length).length;
  box.innerHTML=`
    <div class="tbl-scroll" style="margin-top:10px"><table class="tbl-cards-mobile">
      <thead><tr><th>Linha</th><th>Cliente</th><th>Serviço</th><th style="text-align:right">Valor</th><th>Dia</th><th>Vencimento</th><th>Hora</th><th>Status</th></tr></thead>
      <tbody>${recorrenciasCsvParseadas.map(r=>`<tr>
        <td data-th="Linha">${r.numero}</td>
        <td data-th="Cliente">${esc(r.cliente?r.cliente.legal_name:(r.doc||'—'))}</td>
        <td data-th="Serviço">${esc(r.servico?r.servico.name:(r.servicoCampoLimpo||'—'))}</td>
        <td class="r" data-th="Valor">${r.amount?('R$ '+brl(r.amount)):'—'}</td>
        <td data-th="Dia">${r.dayOfMonth||'—'}</td>
        <td data-th="Vencimento">${r.dueDayOfMonth||'—'}</td>
        <td data-th="Hora">${r.runTime}</td>
        <td data-th="Status">${r.erros.length?`<span class="pill p-err">${esc(r.erros.join('; '))}</span>`:'<span class="pill p-ok">OK</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="setup-actions" style="margin-top:10px"><span class="foot-note" id="rc-import-status" style="margin:0">${validas} de ${recorrenciasCsvParseadas.length} linha(s) prontas para importar.</span><button class="btn btn-a right" type="button" ${validas?'':'disabled'} onclick="confirmarImportacaoRecorrenciaCsv()">Confirmar importação</button></div>`;
}
async function confirmarImportacaoRecorrenciaCsv(){
  let ok=0,falhas=[];
  for(const r of recorrenciasCsvParseadas){
    if(r.erros.length)continue;
    try{
      await api('/api/invoice-recurrences',{method:'POST',body:JSON.stringify({customerId:r.cliente.id,serviceProfileId:r.servico.id,amount:r.amount,dayOfMonth:r.dayOfMonth,dueDayOfMonth:r.dueDayOfMonth,runTime:r.runTime,frequencyMonths:r.frequencyMonths,endDate:r.endDate,totalOccurrences:r.totalOccurrences})});
      ok++;
    }catch(error){falhas.push(`Linha ${r.numero}: ${error.message}`)}
  }
  recorrenciasCsvParseadas=[];
  const box=qs('#rc-import-preview');
  if(box)box.innerHTML=`<div class="foot-note">${ok} recorrência(s) importada(s).</div>`+(falhas.length?`<div class="foot-note" style="color:#b91c1c">${falhas.map(esc).join('<br>')}</div>`:'');
  if(ok>0)await carregarRecorrencias();
}
function cancelarEdicaoRecorrencia(){
  recorrenciaEditando=null;
  qs('#rc-customer').value='';qs('#rc-service').value='';qs('#rc-amount').value='0,00';qs('#rc-day').value='';qs('#rc-time').value='09:00';qs('#rc-due-day').value='';qs('#rc-frequency').value='1';qs('#rc-end-date').value='';qs('#rc-description').value='';
  qs('#rc-termino').value='aberto';qs('#rc-parcelas').value='';qs('#rc-parcelas-modo').value='parcela';
  if(qs('#rc-preset'))qs('#rc-preset').value='';
  alternarTerminoRecorrencia();
  qs('#rc-form-title').textContent='Novo contrato recorrente';
  qs('#rc-due-day-hint').style.display='none';
  fecharModalRecorrencia();
}
async function alternarRecorrencia(id,ativar){
  try{await api('/api/invoice-recurrences/'+id,{method:'PUT',body:JSON.stringify({active:ativar})});await carregarRecorrencias()}catch(error){alert(error.message)}
}
async function excluirRecorrencia(id){
  if(!await titanConfirm('Excluir esta recorrência? As notas já emitidas continuam preservadas.','Excluir recorrência','err'))return;
  try{await api('/api/invoice-recurrences/'+id,{method:'DELETE'});await carregarRecorrencias()}catch(error){alert(error.message)}
}
async function emitirRecorrenciaAgora(id){
  try{await api('/api/invoice-recurrences/'+id+'/run-now',{method:'POST'});alert('Nota enviada para processamento fiscal.');await carregarRecorrencias()}catch(error){alert(error.message)}
}

// Achado do relatório de auditoria 13/08: o consumo do plano só aparecia no
// banner de "Emitir NFS-e", e só a partir de 80% de uso — o card "Meu plano"
// em Configurações nunca mostrava quanto já foi usado, em nenhum nível.
// Mesmo endpoint que o banner (avisarLimiteDoPlano) já usa, mas exibido
// sempre, não só perto do limite.
async function carregarConsumoPlano(){
  const box=qs('#plan-consumo-box');if(!box)return;
  try{
    const data=await api('/api/invoices/consumption');
    if(!data.plan){box.innerHTML='';return}
    const pct=Math.round(data.used/data.plan.limit*100);
    box.innerHTML=`<div class="hint">Consumo do mês: <b>${data.used} de ${data.plan.limit}</b> notas (${pct}%)</div>`;
  }catch{box.innerHTML=''}
}
async function carregarMeuPlano(){
  const box=qs('#plan-upgrade-box');if(!box)return;
  carregarConsumoPlano();
  const access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}'),companyId=sessionStorage.getItem(STORAGE_COMPANY_ID),company=(access.companies||[]).find(c=>c.id===companyId)||(access.companies||[])[0];
  if(!company){box.innerHTML='<div class="empty-state">Abra uma empresa para ver o plano contratado.</div>';return}
  try{
    const [vitrine,pedidos]=await Promise.all([api('/api/plans'),api('/api/plans/upgrade-requests')]);
    const atual=vitrine.plans.find(p=>p.code===company.plan_code);
    qs('#plan-current-pill').textContent=atual?atual.name:(company.plan_code||'—');
    const pendente=pedidos.find(p=>p.status==='pending');
    const nomeFeature=code=>vitrine.featureCatalog.find(f=>f.code===code)?.name||code;
    // Pedido do usuário (18/08/2026): mostrar o catálogo completo de planos
    // (não só os mais caros que o atual) — cada plano vira um cartão com o
    // botão de solicitar mudança pra qualquer direção (upgrade ou downgrade;
    // o backend já aceita as duas, plan-upgrade-requests.ts:76-92).
    const aviso=pendente?`<div class="alert a-info" style="margin-bottom:12px">
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
        <div><b>Pedido de mudança em análise.</b> ${esc(pendente.current_plan_name||pendente.current_plan_code)} → ${esc(pendente.requested_plan_name||pendente.requested_plan_code)}. A TITAN avisa no sino assim que decidir.</div>
      </div>
      <button class="btn btn-s" type="button" style="margin-bottom:14px" onclick="cancelarPedidoUpgrade('${pendente.id}')">Cancelar pedido</button>`:'';
    box.innerHTML=aviso+vitrine.plans.map(p=>{
      const ehAtual=p.code===company.plan_code;
      const nomes=p.features.map(nomeFeature);
      return `<div class="card" style="margin-bottom:10px${ehAtual?';border-color:var(--gold)':''}">
        <div class="card-h"><h2 style="font-size:12.5px">${esc(p.name)}</h2><span class="pill ${ehAtual?'p-gold':'p-off'} right">${ehAtual?'Plano atual':'R$ '+brl(p.price_cents/100)+'/mês'}</span></div>
        <div class="card-b" style="padding:10px 16px 14px">
          <div class="hint" style="margin-bottom:10px">${esc(p.description||('Inclui: '+nomes.join(', ')))}</div>
          ${ehAtual||pendente?'':`<button class="btn btn-s" type="button" style="width:100%" onclick="solicitarUpgradePlano('${esc(p.code)}')">Solicitar mudança para ${esc(p.name)}</button>`}
        </div>
      </div>`;
    }).join('');
  }catch(error){box.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
async function solicitarUpgradePlano(requestedPlanCode){
  if(!requestedPlanCode)return;
  try{await api('/api/plans/upgrade-requests',{method:'POST',body:JSON.stringify({requestedPlanCode})});await carregarMeuPlano()}catch(error){alert(error.message)}
}
async function cancelarPedidoUpgrade(id){
  if(!await titanConfirm('Cancelar o pedido de upgrade em análise?','Cancelar pedido','warn'))return;
  try{await api('/api/plans/upgrade-requests/'+id,{method:'DELETE'});await carregarMeuPlano()}catch(error){alert(error.message)}
}

async function carregarMeuContrato(){
  const box=qs('#contract-box');if(!box)return;
  try{
    const dados=await api('/api/contract');
    if(!dados.current){box.innerHTML='<div class="empty-state">Nenhum contrato publicado ainda.</div>';qs('#contract-status-pill').textContent='—';return}
    const emDia=dados.acceptance&&dados.acceptance.current;
    qs('#contract-status-pill').textContent='v'+dados.current.version;
    qs('#contract-status-pill').className='pill right '+(emDia?'p-ok':'p-warn');
    const textoContrato=`<div class="alert a-info" style="max-height:260px;overflow:auto;white-space:pre-wrap;font-size:13px;line-height:1.6;margin:0 0 12px">${esc(dados.current.body)}</div>`;
    if(emDia){
      box.innerHTML=`<div class="alert a-ok"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg><div>Você aceitou a versão ${esc(dados.acceptance.version)} em ${formatarDataNovidade(dados.acceptance.acceptedAt)}.</div></div>
        ${textoContrato}
        <button class="btn btn-s" type="button" onclick="baixarContrato()">Baixar contrato (PDF)</button>`;
    }else{
      box.innerHTML=`<div class="alert a-warn"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><div>${dados.acceptance?`Uma versão nova (${esc(dados.current.version)}) foi publicada. `:''}Leia e aceite o contrato para continuar com a Sessão de Uso ativa.</div></div>
        ${textoContrato}
        <button class="btn btn-a" type="button" onclick="aceitarContrato()">Li e concordo com o Contrato de Sessão de Uso</button>`;
    }
  }catch(error){box.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
async function aceitarContrato(){
  try{await api('/api/contract/accept',{method:'POST'});await carregarMeuContrato()}catch(error){alert(error.message)}
}
async function baixarContrato(){
  try{const blob=await apiBlob('/api/contract/pdf'),url=URL.createObjectURL(blob),tab=window.open(url,'_blank');if(!tab){const a=document.createElement('a');a.href=url;a.download='contrato-titan-nfse.pdf';a.click()}setTimeout(()=>URL.revokeObjectURL(url),120000)}catch(error){alert(error.message)}
}

let clienteComercialSelecionado=null;
let servicoComercialSelecionado=null;
async function popularClientesComercial(){
  try{
    if(!clientesCadastro.length)clientesCadastro=await api('/api/customers?search=');
    const dl=qs('#co-customer-list');
    if(dl)dl.innerHTML=clientesCadastro.map(c=>`<option value="${esc(c.legal_name)}">${esc(formatarCnpj(c.tax_id||''))}</option>`).join('');
    selecionarClienteComercial();
  }catch(e){}
}
function selecionarClienteComercial(){
  const value=(qs('#co-customer')?.value||'').trim().toLocaleLowerCase('pt-BR');
  clienteComercialSelecionado=clientesCadastro.find(c=>String(c.legal_name||'').trim().toLocaleLowerCase('pt-BR')===value)||null;
  const hint=qs('#co-customer-hint');if(!hint)return;
  hint.textContent=clienteComercialSelecionado?`${formatarCnpj(clienteComercialSelecionado.tax_id)} · ${clienteComercialSelecionado.address||'endereço não informado'}`:'Selecione um cadastro para levar CNPJ e endereço à nota.';
}
function popularServicosComercial(){
  const select=qs('#co-service');if(!select)return;
  const atual=select.value;
  select.innerHTML='<option value="">Selecione um serviço cadastrado</option>'+perfisServico.map(item=>`<option value="${item.id}">${item.display_number?item.display_number+' — ':''}${esc(item.name)} — ${esc(item.national_code)}</option>`).join('');
  if(perfisServico.some(item=>item.id===atual))select.value=atual;
  servicoComercialSelecionado=perfisServico.find(item=>item.id===select.value)||null;
  const hint=qs('#co-service-hint');if(hint&&!perfisServico.length)hint.innerHTML='Nenhum serviço cadastrado. Abra <b>Meus serviços</b> para criar o primeiro.';
}
function selecionarServicoComercial(){
  servicoComercialSelecionado=perfisServico.find(item=>item.id===qs('#co-service')?.value)||null;
  const hint=qs('#co-service-hint');if(!servicoComercialSelecionado){if(hint)hint.textContent='Selecione um cadastro para usar seus códigos e retenções.';return}
  const item=servicoComercialSelecionado;
  if(!qs('#co-title').value.trim())qs('#co-title').value=item.name||item.service_type||'';
  qs('#co-description').value=item.description||'';
  if(hint)hint.textContent=`${item.national_code}${item.nbs_code?' · NBS '+item.nbs_code:''} · ${item.service_type}`;
}

/* ---------- orçamentos e ordens de serviço ---------- */
let comerciais=[];
let comercialItens=[];
let comercialEditId=null;
const COMERCIAL_STATUS={draft:['p-off','Em elaboração'],approved:['p-ok','Aprovado'],converted:['p-ok','Convertido em NFS-e'],cancelled:['p-err','Cancelado']};
function numeroComercial(item){const prefix=item.kind==='service_order'?'O.S.':'ORÇ';return `${prefix} nº ${String(item.document_number||0).padStart(4,'0')}`}
function renderEmpresaComercial(){
  const e=empresaAtual||{},name=e.rs||'Empresa ativa',cnpj=e.cnpj?formatarCnpj(e.cnpj):'CNPJ não informado',address=e.endereco||'Endereço não informado',contact=[e.email,e.phone].filter(Boolean).join(' · '),kind=qs('#co-kind')?.value==='service_order'?'ORDEM DE SERVIÇO':'ORÇAMENTO',number=qs('#co-number')?.value||'Será gerado ao salvar';
  if(qs('#co-company-name'))qs('#co-company-name').textContent=name;
  if(qs('#co-company-details'))qs('#co-company-details').innerHTML=`${esc(cnpj)}<br>${esc(address)}`;
  if(qs('#co-company-contact'))qs('#co-company-contact').textContent=contact;
  if(qs('#co-letter-kind'))qs('#co-letter-kind').textContent=kind;
  if(qs('#co-letter-number'))qs('#co-letter-number').textContent=number.replace('Será gerado ao salvar','Nº 0001');
  if(qs('#co-letter-date'))qs('#co-letter-date').textContent=new Date().toLocaleDateString('pt-BR');
  const logo=qs('#e-logo-preview')?.src;if(logo&&qs('#co-company-logo'))qs('#co-company-logo').src=logo;
  if(qs('#co-signature'))qs('#co-signature').textContent=`${e.municipio||'Cidade'}, ${new Date().toLocaleDateString('pt-BR')} · ${name}`;
}
function atualizarNumeroComercial(){
  const kind=qs('#co-kind')?.value||'quote';
  const max=comerciais.filter(item=>item.kind===kind).reduce((n,item)=>Math.max(n,Number(item.document_number||0)),0);
  const field=qs('#co-number');if(field)field.value=numeroComercial({kind,document_number:max+1});
  renderEmpresaComercial();
}
function novoComercial(kind){
  limparFormComercial();
  if(qs('#co-kind'))qs('#co-kind').value=kind;
  atualizarNumeroComercial();
  const wrap=qs('#co-form-wrap');if(wrap){wrap.style.display='';wrap.scrollIntoView({behavior:'smooth',block:'start'})}
}
function fecharFormComercial(){const wrap=qs('#co-form-wrap');if(wrap)wrap.style.display='none';limparFormComercial();}
function limparFormComercial(){
  comercialEditId=null;
  if(qs('#co-title'))qs('#co-title').value='';
  if(qs('#co-customer'))qs('#co-customer').value='';
  if(qs('#co-service'))qs('#co-service').value='';
  if(qs('#co-description'))qs('#co-description').value='';
  if(qs('#co-value'))qs('#co-value').value='0,00';
  if(qs('#co-observation'))qs('#co-observation').value='';
  if(qs('#co-payment'))qs('#co-payment').value='';
  if(qs('#co-conditions'))qs('#co-conditions').value='';
  if(qs('#co-status'))qs('#co-status').value='draft';
  if(qs('#co-number'))qs('#co-number').value='Será gerado ao salvar';
  comercialItens=[];clienteComercialSelecionado=null;servicoComercialSelecionado=null;
  renderItensComerciais();selecionarClienteComercial();selecionarServicoComercial();
  const btn=qs('#co-save-btn');if(btn)btn.textContent='Salvar Rascunho';
  const titleEl=qs('#co-form-title');if(titleEl)titleEl.textContent='Novo documento';
}
function renderComerciais(){
  const box=qs('#commercial-list');if(!box)return;
  const q=(qs('#co-search')?.value||'').toLowerCase().trim();
  const f=qs('#co-filter')?.value||'';
  let list=comerciais.map((item,index)=>({item,index}));
  if(f)list=list.filter(o=>o.item.status===f);
  if(q)list=list.filter(o=>String(o.item.title||'').toLowerCase().includes(q)||String(o.item.customer_name||'').toLowerCase().includes(q)||numeroComercial(o.item).toLowerCase().includes(q));
  const count=qs('#commercial-count');if(count)count.textContent=`${list.length} documento(s) exibido(s)`;
  if(!list.length){box.innerHTML='<div class="empty-state">Nenhum documento comercial encontrado.</div>';return}
  box.innerHTML=list.map(({item,index})=>{
    const st=COMERCIAL_STATUS[item.status]||['p-off',item.status];
    const done=item.status==='converted'||item.status==='cancelled';
    const acao=`<button class="btn btn-s" onclick="abrirPdfComercial('${item.id}')">Abrir PDF</button><button class="btn btn-s" onclick="enviarComercialEmail(${index})">Enviar e-mail</button>`+(done?'':`<button class="btn btn-s" onclick="editarComercial(${index})">Editar</button>`)+(done?`<button class="btn btn-s" disabled style="opacity:.5">${item.status==='converted'?'Convertido':'Cancelado'}</button>`:`<button class="btn btn-s" onclick="converterComercial(${index})">Converter em NFS-e</button>`)+`<button class="ico-btn danger" type="button" title="Excluir" onclick="excluirComercial(${index})">×</button>`;
    const serviceList=Array.isArray(item.payload?.services)?item.payload.services:[item.payload?.service].filter(Boolean);
    const serviceName=serviceList.length>1?`${serviceList.length} serviços`:serviceList[0]?.name||serviceList[0]?.serviceType||'Serviço não identificado';
    return `<div class="doc-item"><div><div class="doc-head"><span class="doc-number">${numeroComercial(item)}</span><b>${esc(item.title)}</b><span class="pill ${st[0]}">${st[1]}</span></div><div class="doc-meta">${esc(item.customer_name||'Sem cliente')} · ${esc(serviceName)} · <b>R$ ${brl(Number(item.amount||0))}</b></div></div><div class="doc-act">${acao}</div></div>`;
  }).join('');
}
async function abrirPdfComercial(id){try{const blob=await apiBlob('/api/workspace/commercial/'+id+'/pdf'),url=URL.createObjectURL(blob),tab=window.open(url,'_blank');if(!tab){const a=document.createElement('a');a.href=url;a.download='documento-comercial.pdf';a.click()}setTimeout(()=>URL.revokeObjectURL(url),120000)}catch(error){alert(error.message)}}
async function carregarComerciais(){try{comerciais=await api('/api/workspace/commercial');renderComerciais();atualizarNumeroComercial();}catch(error){qs('#commercial-list').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}}
function renderItensComerciais(){
  const box=qs('#co-items'),total=qs('#co-total');if(!box)return;
  const soma=comercialItens.reduce((value,item)=>value+Number(item.amount||0),0);if(total)total.textContent=`R$ ${brl(soma)}`;
  box.innerHTML=comercialItens.length?comercialItens.map((item,index)=>`<div class="draft-item"><b>${esc(item.name||item.serviceType||'Serviço')}</b><span>NBS ${esc(item.nbsCode||'—')} · R$ ${brl(Number(item.amount||0))}</span><small>${esc(item.description||'')}</small><div class="acts"><button class="btn btn-s" type="button" onclick="removerItemComercial(${index})">Remover</button></div></div>`).join(''):'<div class="empty-state">Nenhum serviço adicionado ao documento.</div>';
}
function adicionarItemComercial(){
  selecionarClienteComercial();selecionarServicoComercial();const svc=servicoComercialSelecionado,amount=dinheiro(qs('#co-value').value),description=qs('#co-description').value.trim();
  if(!svc){alert('Selecione um serviço cadastrado.');return}
  if(!svc.nbs_code||!/^[0-9]{9}$/.test(String(svc.nbs_code))){alert('O serviço precisa ter um NBS de 9 dígitos cadastrado.');return}
  if(amount<=0||!description){alert('Informe valor e descrição do serviço.');return}
  comercialItens.push({profileId:svc.id,name:svc.name,serviceType:svc.service_type,nationalTaxCode:svc.national_code,municipalTaxCode:svc.municipal_code||undefined,nbsCode:svc.nbs_code,description,amount:amount.toFixed(2),issTaxation:svc.iss_taxation,issWithholding:svc.iss_withholding,issRate:svc.iss_rate,pisCofinsCst:svc.pis_cofins_cst||undefined,pisCofinsWithholding:svc.pis_cofins_withholding||undefined,pisCofinsBase:svc.pis_cofins_base||undefined,pisRate:svc.pis_rate||undefined,cofinsRate:svc.cofins_rate||undefined,pisAmount:svc.pis_amount||undefined,cofinsAmount:svc.cofins_amount||undefined,retCp:svc.ret_cp||0,retIrrf:svc.ret_irrf||0,retCsll:svc.ret_csll||0});
  renderItensComerciais();qs('#co-value').value='0,00';qs('#co-description').value='';
}
function removerItemComercial(index){comercialItens.splice(index,1);renderItensComerciais()}
async function salvarComercial(){
  selecionarClienteComercial();
  if(!comercialItens.length)adicionarItemComercial();
  const title=qs('#co-title').value.trim(),customerName=qs('#co-customer').value.trim(),amount=comercialItens.reduce((value,item)=>value+Number(item.amount||0),0);
  if(!title||!customerName||!comercialItens.length||amount<=0){alert('Informe título, cliente e adicione ao menos um serviço.');return}
  const c=clienteComercialSelecionado;
  const borrower=c?{name:c.legal_name,legal_name:c.legal_name,tax_id:c.tax_id,email:c.email,phone:c.phone,address:c.address,postal_code:c.postal_code,municipality_code:c.municipality_code,street:c.street,number:c.number,complement:c.complement,district:c.district}:{name:customerName,legal_name:customerName};
  const commercialPayload={borrower,services:comercialItens,service:comercialItens[0],observation:qs('#co-observation')?.value.trim()||'',payment:qs('#co-payment')?.value.trim()||'',conditions:qs('#co-conditions')?.value.trim()||''};
  const body=JSON.stringify({kind:qs('#co-kind').value,status:qs('#co-status').value,title,customerName,amount,payload:commercialPayload});
  if(salvandoComercial)return;
  salvandoComercial=true;qs('#co-save-btn').disabled=true;
  try{
    if(comercialEditId)await api('/api/workspace/commercial/'+comercialEditId,{method:'PUT',body});
    else await api('/api/workspace/commercial',{method:'POST',body});
    fecharFormComercial();
    await carregarComerciais();
  }catch(error){alert(error.message)}finally{salvandoComercial=false;qs('#co-save-btn').disabled=false}
}
function editarComercial(index){
  const item=comerciais[index];
  if(item.status==='converted'||item.status==='cancelled'){alert('Documentos convertidos ou cancelados não podem ser editados.');return}
  limparFormComercial();
  comercialEditId=item.id;
  if(qs('#co-kind'))qs('#co-kind').value=item.kind;
  if(qs('#co-status'))qs('#co-status').value=item.status;
  if(qs('#co-title'))qs('#co-title').value=item.title||'';
  if(qs('#co-customer'))qs('#co-customer').value=item.customer_name||'';
  const p=item.payload||{};
  comercialItens=Array.isArray(p.services)?JSON.parse(JSON.stringify(p.services)):(p.service?[JSON.parse(JSON.stringify(p.service))]:[]);
  if(qs('#co-observation'))qs('#co-observation').value=p.observation||'';
  if(qs('#co-payment'))qs('#co-payment').value=p.payment||'';
  if(qs('#co-conditions'))qs('#co-conditions').value=p.conditions||'';
  renderItensComerciais();selecionarClienteComercial();
  if(qs('#co-number'))qs('#co-number').value=numeroComercial(item);
  renderEmpresaComercial();
  const btn=qs('#co-save-btn');if(btn)btn.textContent='Salvar alterações';
  const titleEl=qs('#co-form-title');if(titleEl)titleEl.textContent=`Editar ${numeroComercial(item)}`;
  const wrap=qs('#co-form-wrap');if(wrap){wrap.style.display='';wrap.scrollIntoView({behavior:'smooth',block:'start'})}
}
async function excluirComercial(index){
  const item=comerciais[index];
  if(!await titanConfirm(`Excluir ${numeroComercial(item)} — ${item.title}? Esta ação não pode ser desfeita.`,'Excluir documento','err'))return;
  try{
    await api('/api/workspace/commercial/'+item.id,{method:'DELETE'});
    if(comercialEditId===item.id)fecharFormComercial();
    await carregarComerciais();
  }catch(error){alert(error.message)}
}
function enviarComercialEmail(index){
  const item=comerciais[index];
  const b=(item.payload&&item.payload.borrower)||{};
  const email=String(b.email||'').trim();
  if(!email){alert('Este cliente não tem e-mail cadastrado. Informe o e-mail em Clientes antes de enviar.');return}
  const saudacao=b.name||b.legal_name?`Olá, ${b.name||b.legal_name}.\n\n`:'';
  const subject=encodeURIComponent(`${numeroComercial(item)} — ${item.title}`);
  const body=encodeURIComponent(`${saudacao}Segue ${item.kind==='service_order'?'a Ordem de Serviço':'o Orçamento'} ${numeroComercial(item)}.\nBaixe o PDF em "Abrir PDF" e anexe antes de enviar.\n\nAtenciosamente.`);
  window.location.href=`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}
async function converterComercial(index){
  const item=comerciais[index];
  try{
    const result=await api('/api/workspace/commercial/'+item.id+'/convert',{method:'POST'});
    if(comerciais[index]){comerciais[index].status='converted';comerciais[index].converted_at=new Date().toISOString();renderComerciais()}
    const p=result.payload||{},b=p.borrower||{};
    const services=Array.isArray(p.services)?p.services:[p.service].filter(Boolean);
    // Agrupa por CTN+NBS. Mesmo CTN+NBS = uma nota; itens iguais viram uma linha com quantidade.
    const groups=new Map();
    services.forEach(service=>{
      const ctn=service.nationalTaxCode||'',nbs=service.nbsCode||'',key=ctn+'|'+nbs;
      let g=groups.get(key);
      if(!g){g={nationalTaxCode:ctn,nbsCode:nbs,profileId:service.profileId,municipalTaxCode:service.municipalTaxCode,descricoes:[],lines:[]};groups.set(key,g)}
      const desc=service.description||service.name||'Serviço',unit=Number(Number(service.amount||0).toFixed(2));
      if(desc&&!g.descricoes.includes(desc))g.descricoes.push(desc);
      const existing=g.lines.find(l=>l.description===desc&&Number(l.unitAmount)===unit);
      if(existing)existing.quantity+=1;else g.lines.push({description:desc,quantity:1,unitAmount:unit,profileId:service.profileId,ctn:ctn,nbs:nbs});
    });
    const grupos=[...groups.values()];
    for(const g of grupos){
      const total=Number(g.lines.reduce((s,l)=>s+l.quantity*l.unitAmount,0).toFixed(2));
      await api('/api/workspace/drafts',{method:'POST',body:JSON.stringify({title:`${item.title} · CTN ${g.nationalTaxCode||'—'} / NBS ${g.nbsCode||'—'}`,payload:{competenceDate:qs('#s-comp').value,borrower:b,service:{nationalTaxCode:g.nationalTaxCode,nbsCode:g.nbsCode,municipalTaxCode:g.municipalTaxCode,description:g.descricoes.join('; '),amount:total,additionalItems:g.lines}}})});
    }
    preencherCliente({...b,legal_name:b.legal_name||b.name,tax_id:b.tax_id||b.taxId||''});
    const first=grupos[0];
    if(first){
      if(first.profileId&&perfisServico.some(profile=>profile.id===first.profileId)){qs('#s-profile').value=first.profileId;aplicarPerfilServico()}
      if(first.nationalTaxCode)definirNbsSelecionado('s-cod',first.nationalTaxCode,first.descricoes[0]||'');
      definirNbsSelecionado('s-nbs',first.nbsCode);
      qs('#s-desc').value=first.descricoes.join('; ');
      composicaoItens=first.lines.map(l=>({description:l.description,quantity:l.quantity,unitAmount:l.unitAmount,profileId:l.profileId,ctn:l.ctn,nbs:l.nbs}));
      atualizarComposicao();atualizarCamposEspeciais();
    }
    lerParametros();
    rascunhoAbertoId=null;go('emitir',qs('.sb-link[onclick*="emitir"]'));
    alert(`${grupos.length} nota(s) preparada(s), agrupada(s) por CTN+NBS. Os itens viraram linhas com quantidade — confira e ajuste antes de autorizar.`);
  }catch(error){alert(error.message)}
}


/* ---------- importação ADN ---------- */
async function carregarStatusImportacao(){
  const hint=qs('#import-status-hint');if(!hint)return;
  try{
    const state=await api('/api/import');
    qs('#import-status-pill').textContent=state.documents>0?'Já buscado':'Nunca buscado';
    hint.textContent=state.documents>0
      ?`Base local: ${state.documents} documento(s) e ${state.customers} cliente(s) já trazidos do Portal Nacional. Último NSU: ${state.lastNsu}.`
      :'Nenhuma busca feita ainda — clique no botão abaixo pra trazer os documentos e cadastrar os clientes automaticamente.';
  }catch(error){hint.textContent=error.message}
}
let portalImportJobId=null,portalImportPollTimer=null;
// Pedido do usuário (19/08/2026): "buscar tudo", não só um lote por clique —
// o botão dispara um job em background (jobs/portal-import.ts, backend) que
// continua sozinho até alcançar o NSU mais recente do ADN; aqui só fica o
// polling, mesmo padrão de dispararAtualizacaoEmLoteClientes/
// consultarProgressoAtualizacaoLote (Clientes > Atualizar todos).
async function buscarPortalNacional(){
  if(!empresaAtual){alert('Cadastre e salve a empresa antes de buscar no Portal Nacional.');return}
  const btn=qs('#btn-buscar-portal'),out=qs('#import-result');
  if(btn.disabled)return;
  btn.disabled=true;btn.textContent='Buscando...';out.innerHTML='';
  try{
    const job=await api('/api/import/sync-job',{method:'POST'});
    portalImportJobId=job.id;
    out.innerHTML='<div class="hint">Buscando no Portal Nacional… isso pode levar alguns minutos pra empresas com histórico grande. Pode sair desta tela — a busca continua sozinha.</div>';
    portalImportPollTimer=setInterval(consultarProgressoBuscaPortal,3000);
  }catch(error){
    out.innerHTML=`<div class="result no"><span class="pill p-err">Não foi possível iniciar a busca</span><div class="chave" style="color:#7d1c1f">${esc(error.message)}</div></div>`;
    btn.disabled=false;btn.textContent='Buscar dados do Portal Nacional';
  }
}
async function consultarProgressoBuscaPortal(){
  if(!portalImportJobId)return;
  const out=qs('#import-result');
  try{
    const job=await api('/api/import/sync-job/'+portalImportJobId);
    if(job.status==='running'||job.status==='queued'){
      out.innerHTML=`<div class="hint">Buscando… ${job.documents_imported} documento(s) e ${job.customers_imported} cliente(s) até agora.</div>`;
      return;
    }
    clearInterval(portalImportPollTimer);portalImportPollTimer=null;portalImportJobId=null;
    qs('#btn-buscar-portal').disabled=false;qs('#btn-buscar-portal').textContent='Buscar dados do Portal Nacional';
    if(job.status==='completed'){
      out.innerHTML=`
        <div class="result ok">
          <div class="flex" style="margin-bottom:9px"><span class="pill p-ok">Busca concluída</span></div>
          <div class="kv"><span>Documentos novos</span><b>${job.documents_imported}</b></div>
          <div class="kv"><span>Clientes cadastrados/atualizados</span><b>${job.customers_imported}</b></div>
          <div class="foot-note">Resposta real da API de Contribuintes do ADN em ${ambienteAtual==='production'?'Produção oficial':'Produção Restrita'}. Razão social e endereço de quem só veio com o CNPJ chegam em instantes — atualização automática via BrasilAPI já disparada.</div>
        </div>`;
    }else{
      out.innerHTML=`<div class="result no"><span class="pill p-err">A busca parou</span><div class="chave" style="color:#7d1c1f">${esc(job.error||'Erro desconhecido.')}</div></div>`;
    }
    carregarStatusImportacao();
  }catch(error){
    clearInterval(portalImportPollTimer);portalImportPollTimer=null;portalImportJobId=null;
    qs('#btn-buscar-portal').disabled=false;qs('#btn-buscar-portal').textContent='Buscar dados do Portal Nacional';
    out.innerHTML=`<div class="result no"><span class="pill p-err">Não foi possível acompanhar a busca</span><div class="chave" style="color:#7d1c1f">${esc(error.message)}</div></div>`;
  }
}


/* ---------- cadastro inicial local ---------- */
async function salvarCadastro(){
  const empresa={
    rs:qs('#e-rs').value.trim(),
    cnpj:qs('#e-cnpj').value.trim(),
    im:qs('#e-im').value.trim(),
    reg:qs('#e-reg').value,
    mun:qs('#e-mun').value,
    municipio:empresaAtual?.municipio||qs('#e-mun').value,
    endereco:qs('#e-end').value.trim(),
    postalCode:empresaAtual?.postalCode||'',street:empresaAtual?.street||'',number:empresaAtual?.number||'',complement:empresaAtual?.complement||'',district:empresaAtual?.district||'',city:empresaAtual?.city||'',state:empresaAtual?.state||'',email:qs('#e-email').value.trim(),accountantEmail:qs('#e-contador').value.trim(),contador:qs('#e-contador').value.trim(),phone:qs('#e-phone').value.trim(),whatsapp:qs('#e-zap').value.trim(),
    series:Number(qs('#e-series').value),next:qs('#e-next').value.replace(/\D/g,''),simpleAp:Number(qs('#e-simple-ap').value),simpleTotal:qs('#e-simple-total').value.trim()===''?'':dinheiro(qs('#e-simple-total').value),taxFed:qs('#e-tax-fed').value.trim()===''?'':dinheiro(qs('#e-tax-fed').value),taxEst:qs('#e-tax-est').value.trim()===''?'':dinheiro(qs('#e-tax-est').value),taxMun:qs('#e-tax-mun').value.trim()===''?'':dinheiro(qs('#e-tax-mun').value),special:Number(qs('#e-special').value)
  };
  if(!empresa.rs||!empresa.cnpj||!empresa.endereco){
    alert('Preencha razão social, CNPJ e endereço para salvar.');
    return;
  }
  if(!Number.isInteger(empresa.series)||empresa.series<1||empresa.series>99999||!empresa.next){alert('Informe uma série entre 1 e 99999 e o próximo número da DPS.');return}
  const regime=empresa.reg==='MEI'?'mei':empresa.reg.includes('Simples')?'simples':'regular';
  if(ambienteAtual==='production'&&regime==='simples'&&empresa.simpleTotal===''){alert('Informe o percentual aproximado total de tributos do Simples para habilitar emissões fiscais.');return}
  try{
    await api('/api/company',{method:'PUT',body:JSON.stringify({legalName:empresa.rs,federalTaxId:empresa.cnpj,municipalRegistration:empresa.im||undefined,municipalityCode:empresa.mun,taxRegime:regime,simpleAssessmentRegime:regime==='simples'?empresa.simpleAp:undefined,simpleTotalTaxRate:regime==='simples'&&empresa.simpleTotal!==''?empresa.simpleTotal:undefined,totalTaxRateFederal:regime!=='simples'&&empresa.taxFed!==''?empresa.taxFed:undefined,totalTaxRateState:regime!=='simples'&&empresa.taxEst!==''?empresa.taxEst:undefined,totalTaxRateMunicipal:regime!=='simples'&&empresa.taxMun!==''?empresa.taxMun:undefined,specialTaxRegime:empresa.special,dpsSeries:empresa.series,nextDpsNumber:empresa.next,address:empresa.endereco||undefined,postalCode:empresa.postalCode||undefined,street:empresa.street||undefined,number:empresa.number||undefined,complement:empresa.complement||undefined,district:empresa.district||undefined,city:empresa.city||undefined,state:empresa.state||undefined,email:empresa.email||undefined,accountantEmail:empresa.accountantEmail||'',phone:empresa.phone||undefined,whatsappPhone:empresa.whatsapp||undefined})});
    empresaAtual=empresa;
    localStorage.setItem(STORAGE_EMPRESA,JSON.stringify(empresa));
  }catch(error){alert(error.message);return}
  aplicarEmpresa();
  checarHabilitacao();
  alert(`Cadastro salvo no servidor seguro. Ambiente: ${ambienteAtual==='production'?'Produção oficial':'Produção Restrita'}.`);
  go('painel',qs('.sb-link[onclick*="painel"]'));
}

function aplicarEmpresa(){
  const usuario=JSON.parse(localStorage.getItem(STORAGE_USUARIO)||'null');
  if(usuario?.nome){
    qs('#avatar').textContent=usuario.nome.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  }
  const topName=qs('#top-user-name'),topRole=qs('#top-user-role');
  if(topName)topName.textContent=usuario?.nome||'Usuário TITAN';
  if(topRole)topRole.textContent=usuario?.email||'Acesso liberado';
  if(!empresaAtual){
    qs('#tenant').innerHTML='<option value="">Nenhuma empresa cadastrada</option>';
    qs('#painel-sub').textContent='Cadastre a primeira empresa para iniciar os testes.';
    qs('#kpi-empresas').textContent='0';
    qs('#kpi-cadastro').textContent='Pendente';
    qs('#kpi-cadastro').className='pill p-warn';
    renderDashboard();
    return;
  }
  const opt=document.createElement('option');
  opt.value=empresaAtual.cnpj;
  opt.textContent=empresaAtual.rs;
  if(!JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}').companies?.length)qs('#tenant').replaceChildren(opt);
  qs('#painel-sub').textContent=`${empresaAtual.rs} · CNPJ ${empresaAtual.cnpj} · ${empresaAtual.municipio} · ${empresaAtual.reg}`;
  qs('#e-rs').value=empresaAtual.rs;
  qs('#e-cnpj').value=empresaAtual.cnpj;
  qs('#e-im').value=empresaAtual.im;
  qs('#e-reg').value=empresaAtual.reg;
  qs('#e-mun').value=empresaAtual.mun;exibirMunicipioPorCodigo('e',empresaAtual.mun);
  qs('#e-end').value=empresaAtual.endereco;qs('#e-email').value=empresaAtual.email||'';qs('#e-contador').value=empresaAtual.contador||'';preencherCompetenciasContador();qs('#e-phone').value=empresaAtual.phone||'';qs('#e-zap').value=empresaAtual.whatsapp||'';
  qs('#e-series').value=empresaAtual.series||1;qs('#e-next').value=empresaAtual.next||1;qs('#e-simple-ap').value=String(empresaAtual.simpleAp||1);qs('#e-simple-total').value=empresaAtual.simpleTotal===''?'':String(empresaAtual.simpleTotal).replace('.',',');qs('#e-tax-fed').value=empresaAtual.taxFed===''||empresaAtual.taxFed==null?'':String(empresaAtual.taxFed).replace('.',',');qs('#e-tax-est').value=empresaAtual.taxEst===''||empresaAtual.taxEst==null?'':String(empresaAtual.taxEst).replace('.',',');qs('#e-tax-mun').value=empresaAtual.taxMun===''||empresaAtual.taxMun==null?'':String(empresaAtual.taxMun).replace('.',',');qs('#e-special').value=String(empresaAtual.special||0);
  // Antes só setava o campo oculto (#s-mun) — #s-mun-search (texto exibido)
  // ficava vazio até o usuário mexer manualmente, o que faria a nova trava de
  // confirmação em montarPayloadEmissao() bloquear até o caso padrão (empresa
  // sem nunca ter trocado o município do serviço). exibirMunicipioPorCodigo já
  // sincroniza os dois campos a partir do catálogo, igual ao que a aba 'e' já fazia.
  if(empresaAtual.mun)exibirMunicipioPorCodigo('s',empresaAtual.mun);
  qs('#resumo-regime').textContent=empresaAtual.reg;
  qs('#kpi-empresas').textContent='1';
  qs('#kpi-cadastro').textContent='Concluído';
  qs('#kpi-cadastro').className='pill p-ok';
  renderDashboard();
}

/* ---------- gestão master / convites ---------- */
let masterData=null;
let empresasAdmin=[];

function configurarEmpresasAdmin(companies){
  empresasAdmin=(companies||[]).filter(c=>c.emission_enabled).map(c=>({id:String(c.id),legal_name:c.legal_name||c.trade_name||'Empresa sem nome',trade_name:c.trade_name||'',federal_tax_id:String(c.federal_tax_id||''),emission_enabled:Boolean(c.emission_enabled),plan_code:c.plan_code||'teste'}));
  const current=sessionStorage.getItem(STORAGE_COMPANY_ID);if(PORTAL_ADMIN&&empresasAdmin.length&&!empresasAdmin.some(c=>c.id===current))sessionStorage.setItem(STORAGE_COMPANY_ID,empresasAdmin[0].id);
  renderEmpresasAdmin();
}
function renderEmpresasAdmin(){
  const box=qs('#admin-company-options');if(!box)return;
  const term=normalizarDocumento(qs('#admin-company-search')?.value)||'';
  const raw=(qs('#admin-company-search')?.value||'').trim().toLocaleLowerCase('pt-BR');
  const current=sessionStorage.getItem(STORAGE_COMPANY_ID);
  const filtered=empresasAdmin.filter(c=>!raw||String(c.legal_name).toLocaleLowerCase('pt-BR').includes(raw)||String(c.trade_name).toLocaleLowerCase('pt-BR').includes(raw)||normalizarDocumento(c.federal_tax_id).includes(term));
  box.innerHTML=filtered.length?filtered.map(c=>`<button type="button" class="admin-company-option ${c.id===current?'active':''}" onclick="selecionarEmpresaAdmin('${c.id}')"><b>${esc(c.trade_name||c.legal_name)}</b><span>CNPJ: ${esc(formatarCnpj(c.federal_tax_id))}</span></button>`).join(''):'<div class="empty-state" style="padding:16px">Nenhuma empresa encontrada.</div>';
  const selected=empresasAdmin.find(c=>c.id===current)||empresasAdmin[0];
  const label=qs('#admin-company-current');if(label)label.textContent=selected?(selected.trade_name||selected.legal_name):'Nenhuma empresa cadastrada';
}
function alternarSeletorEmpresaAdmin(event){
  event?.stopPropagation();const menu=qs('#admin-company-menu'),open=!menu.classList.contains('on');menu.classList.toggle('on',open);qs('#admin-company-trigger').setAttribute('aria-expanded',String(open));if(open){qs('#admin-company-search').value='';renderEmpresasAdmin();setTimeout(()=>qs('#admin-company-search').focus(),0)}
}
function fecharSeletorEmpresaAdmin(){qs('#admin-company-menu')?.classList.remove('on');qs('#admin-company-trigger')?.setAttribute('aria-expanded','false')}
async function selecionarEmpresaAdmin(companyId){
  const alvo=empresasAdmin.find(e=>e.id===companyId);
  if(!travarEmpresaAtiva(companyId,alvo?.legal_name||alvo?.trade_name)){fecharSeletorEmpresaAdmin();return}
  sessionStorage.setItem(STORAGE_COMPANY_ID,companyId);fecharSeletorEmpresaAdmin();renderEmpresasAdmin();
  await abrirEmpresaEmissao(companyId);
}
qs('#admin-company-switch')?.addEventListener('click',event=>event.stopPropagation());document.addEventListener('click',fecharSeletorEmpresaAdmin);document.addEventListener('keydown',event=>{if(event.key==='Escape')fecharSeletorEmpresaAdmin()});

function masterTab(tab,button){
  if(tab==='usuarios')tab='clientes';
  qsa('.master-panel').forEach(panel=>panel.classList.toggle('active',panel.id===`master-panel-${tab}`));
  qsa('[data-master-tab]').forEach(item=>item.classList.toggle('active',item.dataset.masterTab===tab));
  if(button)button.classList.add('active');
  if(tab==='inscricoes')carregarMasterInscricoes();
  if(tab==='parceiros'){carregarPedidosLicencaMaster();carregarCobrancasLicencaMaster();}
  if(tab==='logs')carregarMasterLogs();
  if(tab==='config'){carregarConfiguracoesMaster();carregarContaMaster();}
  // A aba do Martyn (20/08/2026) precisa de carregarConfiguracoesMaster() também:
  // o card de Comunicação mora aqui agora, mas os campos dele são preenchidos
  // pelo mesmo GET de /api/master/settings que abastece Configurações.
  if(tab==='martyn'){carregarConfiguracoesMaster();carregarMetricasMartyn();carregarNotasTecnicasMaster();}
  if(tab==='atendimentos')iniciarAtendimentos();else pararPollingAtendimentos();
  fecharMenuLateral();
  window.scrollTo(0,0);
}

// Conta própria do Master (18/08/2026, pedido do usuário): antes não havia
// tela nenhuma pro Master trocar seu próprio e-mail/senha de login (as
// telas de "Gestão por CNPJ" recusam de propósito mexer numa conta Master).
// Troca de senha é direta; troca de e-mail pede o código de 6 dígitos
// (mandado pro endereço NOVO) pelo mesmo modal titanPrompt já usado na
// verificação de dispositivo novo no login.
async function carregarContaMaster(){
  try{
    const conta=await api('/api/master/account');
    qs('#master-account-email').textContent=conta.email||'—';
    qs('#master-account-name').textContent=conta.name||'—';
  }catch(error){/* painel de config já mostra o erro de outras chamadas — não duplica aviso */}
}
async function solicitarTrocaEmailMaster(){
  const status=qs('#master-account-email-status');
  const newEmail=qs('#acct-new-email').value.trim();
  const currentPassword=qs('#acct-email-pw').value;
  if(!newEmail||!currentPassword){status.textContent='Informe o novo e-mail e sua senha atual.';return}
  status.textContent='Enviando código...';
  try{
    const resp=await api('/api/master/account/email-change',{method:'POST',body:JSON.stringify({newEmail,currentPassword})});
    const codigo=(await titanPrompt('Mandamos um código de 6 dígitos pro e-mail '+(resp.emailHint||'informado')+'. Digite abaixo para confirmar a troca.','','Confirme o novo e-mail')||'').trim();
    if(!/^\d{6}$/.test(codigo)){status.textContent='Troca cancelada — código não confirmado.';return}
    const confirmado=await api('/api/master/account/email-change/confirm',{method:'POST',body:JSON.stringify({verificationId:resp.verificationId,code:codigo})});
    sessionStorage.setItem(STORAGE_TOKEN,confirmado.token);
    qs('#master-account-email').textContent=confirmado.email;
    qs('#acct-new-email').value='';qs('#acct-email-pw').value='';
    status.textContent='E-mail atualizado com sucesso.';
  }catch(error){status.textContent=error.message||'Não foi possível trocar o e-mail.'}
}
async function trocarSenhaMaster(){
  const status=qs('#master-account-password-status');
  const currentPassword=qs('#acct-cur-pw').value,newPassword=qs('#acct-new-pw').value,confirmation=qs('#acct-new-pw2').value;
  if(newPassword.length<10){status.textContent='A nova senha precisa ter pelo menos 10 caracteres.';return}
  if(newPassword!==confirmation){status.textContent='A confirmação da nova senha não confere.';return}
  status.textContent='Salvando...';
  try{
    await api('/api/master/account/password',{method:'PUT',body:JSON.stringify({currentPassword,newPassword,confirmation})});
    qs('#acct-cur-pw').value='';qs('#acct-new-pw').value='';qs('#acct-new-pw2').value='';
    status.textContent='Senha atualizada com sucesso.';
  }catch(error){status.textContent=error.message||'Não foi possível trocar a senha.'}
}

/* ── Atendimentos: espelho do WhatsApp Web para o Master ─────────────────── */
const atendState={conversas:[],atual:null,pollTimer:null,pollMs:8000,buscaTimer:null,anexo:null};
const ATEND_TIPOS_ANEXO=['image/jpeg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const ATEND_ANEXO_MAX_BYTES=10*1024*1024;
const ATEND_NOME_KEY='titan_atendente_nome';
function salvarNomeAtendente(){try{localStorage.setItem(ATEND_NOME_KEY,qs('#atend-agent-name')?.value.trim()||'');}catch(e){}}
function nomeAtendente(){return (qs('#atend-agent-name')?.value.trim())||'';}
function iniciarAtendimentos(){
  const campo=qs('#atend-agent-name');if(campo&&!campo.value){try{campo.value=localStorage.getItem(ATEND_NOME_KEY)||'';}catch(e){}}
  carregarAtendimentos();
  carregarSaldoProvedorIA();
  pararPollingAtendimentos();
  atendState.pollTimer=setInterval(()=>{
    if(qs('#master-panel-atendimentos')?.classList.contains('active'))tickAtendimentos();else pararPollingAtendimentos();
  },atendState.pollMs);
  const auto=qs('#atend-auto');if(auto)auto.textContent='Atualiza sozinho a cada 8s';
}
async function carregarSaldoProvedorIA(){
  const pill=qs('#atend-ia-saldo');if(!pill)return;
  try{
    const data=await api('/api/master/settings');
    const deepseek=data.deepseekBalance,openrouter=data.openrouterBalance;
    if(deepseek){
      pill.style.display='inline-flex';
      pill.className=`pill ${deepseek.disponivel?'p-ok':'p-err'}`;
      pill.textContent=`DeepSeek: ${deepseek.moeda} ${deepseek.total}`;
    }else if(openrouter){
      const semSaldo=openrouter.restante!==null&&openrouter.restante<=0;
      pill.style.display='inline-flex';
      pill.className=`pill ${semSaldo?'p-err':'p-ok'}`;
      pill.textContent=openrouter.restante!==null?`OpenRouter: $${openrouter.restante.toFixed(2)} restantes`:`OpenRouter: $${openrouter.gasto.toFixed(2)} gastos`;
    }else{
      pill.style.display='none';
    }
  }catch(e){pill.style.display='none'}
}
function pararPollingAtendimentos(){if(atendState.pollTimer){clearInterval(atendState.pollTimer);atendState.pollTimer=null;}}
// Achado de campo (11/08/2026): "a lista de conversas fica parada, só
// atualiza com F5". Navegadores throttlam/pausam setInterval em aba de
// segundo plano — com a tela de Atendimentos aberta numa aba que o
// atendente não está olhando no momento, o polling de 8s podia ficar
// minutos sem rodar de verdade, mesmo com o timer "ativo". Ao voltar o
// foco pra aba, força uma atualização imediata em vez de esperar o
// próximo tick do setInterval (que pode demorar por causa do throttling).
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&qs('#master-panel-atendimentos')?.classList.contains('active'))tickAtendimentos();
});
async function tickAtendimentos(){await carregarAtendimentos({silencioso:true});if(atendState.atual)await abrirConversa(atendState.atual,{silencioso:true});}
function filtrarAtendimentos(){clearTimeout(atendState.buscaTimer);atendState.buscaTimer=setTimeout(()=>carregarAtendimentos(),300);}
async function carregarAtendimentos(opts={}){
  const cont=qs('#atend-conversas');if(!cont)return;
  const busca=qs('#atend-search')?.value.trim()||'';
  if(!opts.silencioso&&!atendState.conversas.length)cont.innerHTML='<div class="atend-empty">Carregando conversas...</div>';
  try{
    const data=await api('/api/master/whatsapp/conversations?limit=80&search='+encodeURIComponent(busca));
    atendState.conversas=data.conversations||[];
    renderListaAtendimentos();
  }catch(error){if(!opts.silencioso)cont.innerHTML='<div class="atend-empty">'+esc(error.message)+'</div>';}
}
function renderListaAtendimentos(){
  const cont=qs('#atend-conversas');if(!cont)return;
  if(!atendState.conversas.length){cont.innerHTML='<div class="atend-empty">Nenhuma conversa por aqui ainda. Quando um cliente escrever no WhatsApp, ela aparece aqui.</div>';return;}
  cont.innerHTML=atendState.conversas.map(c=>{
    const nome=esc(c.displayName||c.companyName||formatarTelefone(c.phone));
    const sub=esc(c.companyName&&c.displayName?c.companyName:formatarTelefone(c.phone));
    const prefixo=c.lastDirection==='out'?(c.lastAgent==='human'?'Atendente: ':'Martyn: '):'';
    const prev=esc((prefixo+(c.lastBody||'[arquivo]')).slice(0,90));
    const badge=c.martynPaused?'<span class="atend-badge b-human">assumido</span>':(c.aguardando?'<span class="atend-badge b-wait">aguardando</span>':'');
    return `<button type="button" class="atend-conv${atendState.atual===c.phoneKey?' on':''}" onclick="abrirConversa('${c.phoneKey}')"><div class="atend-conv-top"><span class="atend-conv-name">${nome}</span><span class="atend-conv-time">${esc(formatarHora(c.lastAt))}</span></div><div class="atend-conv-sub">${sub}</div><div class="atend-conv-prev">${prev}${badge}</div></button>`;
  }).join('');
}
async function abrirConversa(phoneKey,opts={}){
  atendState.atual=phoneKey;
  if(atendState.anexo)removerAnexoAtendimento();
  const vazio=qs('#atend-thread-empty'),aberto=qs('#atend-thread-open');
  if(vazio)vazio.style.display='none';if(aberto)aberto.style.display='';
  qsa('.atend-conv').forEach(b=>b.classList.toggle('on',(b.getAttribute('onclick')||'').includes("'"+phoneKey+"'")));
  try{const d=await api('/api/master/whatsapp/conversations/'+encodeURIComponent(phoneKey));renderConversa(d,opts);}
  catch(error){
    // Achado de campo (11/08/2026): atualização em segundo plano (tick de 8s)
    // podia falhar em silêncio total — a conversa aberta ficava travada na
    // última versão que carregou com sucesso, sem NENHUM sinal visível de
    // que parou de atualizar. Loga sempre; some visualmente na tela.
    console.error('[atendimentos] falha ao atualizar conversa '+phoneKey+':',error);
    const s=qs('#atend-th-status');
    if(s)s.textContent=opts.silencioso?'Atualização automática falhando — '+error.message:error.message;
  }
}
function renderConversa(d,opts={}){
  qs('#atend-th-name').textContent=d.displayName||d.companyName||formatarTelefone(d.phone)||'Contato';
  const partes=[];if(d.phone)partes.push(formatarTelefone(d.phone));if(d.companyName)partes.push(d.companyName);
  qs('#atend-th-sub').textContent=partes.join(' · ');
  const pilar=qs('#atend-th-pausestate'),btn=qs('#atend-th-pausebtn');
  if(d.martynPaused){pilar.textContent='Martyn pausado';pilar.className='pill p-off';btn.textContent='Reativar Martyn';}
  else{pilar.textContent='Martyn ativo';pilar.className='pill p-ok';btn.textContent='Assumir conversa';}
  const clienteNome=d.displayName||d.companyName||formatarTelefone(d.phone)||'Cliente';
  const box=qs('#atend-th-messages');
  const perto=box.scrollHeight-box.scrollTop-box.clientHeight<80;
  box.innerHTML=(d.mensagens||[]).map(m=>{
    const saida=m.direction==='out',humano=m.agent==='human';
    // Sempre identifica quem falou: cliente (nome), Martyn (atendente virtual) ou o atendente humano.
    const autor=saida?(humano?(m.agentName||'Atendente'):'Martyn'):clienteNome;
    const prefixoAnexo=m.kind==='image'?'🖼️ ':m.kind==='document'?'📎 ':m.temAudio?'🎤 ':'';
    const corpo=esc(prefixoAnexo+(m.body||(m.mediaMimeType?('['+m.mediaMimeType+']'):'[arquivo]')));
    // Áudio do cliente: até 19/08/2026 a tela só mostrava a transcrição — e
    // quando ela falha (ruído, fala cortada) não sobrava nada para conferir.
    // O player é carregado sob demanda: a mídia vem da Meta na hora, e baixar
    // todos os áudios de uma conversa ao abrir seria desperdício.
    const audio=m.temAudio&&m.messageId?`<button type="button" class="atend-audio" onclick="ouvirAudioAtendimento(this,'${esc(m.messageId)}')">▶ Ouvir o áudio</button>`:'';
    return `<div class="atend-msg ${saida?(humano?'m-human':'m-bot'):'m-in'}"><span class="atend-msg-author">${esc(autor)}</span><span class="atend-msg-body">${corpo}</span>${audio}<span class="atend-msg-time">${esc(formatarHora(m.createdAt))}</span></div>`;
  }).join('')||'<div class="atend-empty">Sem mensagens.</div>';
  if(perto||!opts.silencioso)box.scrollTop=box.scrollHeight;
}
/**
 * Troca o botão pelo player nativo do navegador. A rota exige o token da
 * sessão (Authorization), então não dá para apontar <audio src> direto para
 * ela — o áudio vem por apiBlob e vira uma URL de objeto local.
 */
async function ouvirAudioAtendimento(botao,messageId){
  const phoneKey=atendState.atual;
  if(!phoneKey||botao.disabled)return;
  botao.disabled=true;botao.textContent='Carregando o áudio…';
  try{
    const blob=await apiBlob('/api/master/whatsapp/conversations/'+encodeURIComponent(phoneKey)+'/midia/'+encodeURIComponent(messageId));
    const player=document.createElement('audio');
    player.controls=true;player.className='atend-audio-player';player.src=URL.createObjectURL(blob);
    // Revoga só quando a mensagem sai da tela (renderConversa recria tudo a
    // cada atualização): revogar no 'ended' impediria ouvir de novo.
    player.addEventListener('emptied',()=>URL.revokeObjectURL(player.src));
    botao.replaceWith(player);
    player.play().catch(()=>{});
  }catch(error){
    botao.disabled=false;botao.textContent='▶ Ouvir o áudio';
    const status=qs('#atend-th-status');if(status)status.textContent=error.message||'Não consegui carregar este áudio.';
  }
}
function selecionarAnexoAtendimento(file){
  const status=qs('#atend-th-status');
  if(!file)return;
  if(!ATEND_TIPOS_ANEXO.includes(file.type)){if(status)status.textContent='Tipo de arquivo não aceito. Envie imagem (JPEG/PNG/WEBP), PDF, Word ou Excel.';return}
  if(file.size>ATEND_ANEXO_MAX_BYTES){if(status)status.textContent='Arquivo maior que 10 MB — envie uma versão menor.';return}
  atendState.anexo=file;
  renderAnexoAtendimento();
}
function receberArquivoArrastadoAtendimento(event){
  event.preventDefault();
  qs('#atend-drop-zone')?.classList.remove('drag');
  selecionarAnexoAtendimento(event.dataTransfer?.files?.[0]);
}
function removerAnexoAtendimento(){
  atendState.anexo=null;
  const input=qs('#atend-file-input');if(input)input.value='';
  renderAnexoAtendimento();
}
function renderAnexoAtendimento(){
  const box=qs('#atend-attach-preview');if(!box)return;
  const file=atendState.anexo;
  if(!file){box.style.display='none';box.innerHTML='';return}
  const kb=(file.size/1024).toFixed(0);
  box.style.display='';
  box.innerHTML=`<span class="atend-attach-chip">📎 ${esc(file.name)} · ${kb} KB<button type="button" class="atend-attach-remove" onclick="removerAnexoAtendimento()" aria-label="Remover anexo">×</button></span>`;
}
async function enviarRespostaAtendimento(event){
  event.preventDefault();
  const ta=qs('#atend-reply'),btn=qs('#atend-send-btn'),status=qs('#atend-th-status'),campo=qs('#atend-agent-name');
  const texto=ta.value.trim(),anexo=atendState.anexo;
  if((!texto&&!anexo)||!atendState.atual)return false;
  const nome=nomeAtendente();
  if(!nome){status.textContent='Diga seu nome de atendente antes de responder — assim fica registrado quem falou.';campo?.focus();return false;}
  btn.disabled=true;status.textContent='Enviando...';
  try{
    let d;
    if(anexo){
      const form=new FormData();
      form.append('file',anexo);form.append('caption',texto);form.append('agentName',nome);
      d=await api('/api/master/whatsapp/conversations/'+encodeURIComponent(atendState.atual)+'/reply-media',{method:'POST',body:form});
    }else{
      d=await api('/api/master/whatsapp/conversations/'+encodeURIComponent(atendState.atual)+'/reply',{method:'POST',body:JSON.stringify({text:texto,agentName:nome})});
    }
    ta.value='';removerAnexoAtendimento();status.textContent='Enviado como '+nome+'. O Martyn ficou pausado para este contato até você reativá-lo.';
    renderConversa(d);carregarAtendimentos({silencioso:true});
  }catch(error){status.textContent=error.message;}
  finally{btn.disabled=false;}
  return false;
}
// "Reativar Martyn" só desfaz a pausa — não basta. A conversa também precisa
// sair de 'customer_wait'/'active', porque uma mensagem nova só volta a ser
// tratada pela IA quando o status é 'resolved'; em qualquer outro ela fica
// presa e o contato nunca mais recebe resposta automática. Este botão fecha os
// três bloqueios de uma vez (status, atribuição e pausa).
async function encerrarAtendimento(){
  if(!atendState.atual)return;
  const btn=qs('#atend-th-closebtn'),status=qs('#atend-th-status');
  if(!await titanConfirm('Encerrar este atendimento e devolver o contato ao Martyn?\n\nA conversa sai da fila humana e a próxima mensagem deste número volta a ser respondida pela IA.','Encerrar atendimento'))return;
  btn.disabled=true;
  try{
    const d=await api('/api/master/whatsapp/conversations/'+encodeURIComponent(atendState.atual)+'/encerrar',{method:'POST'});
    renderConversa(d);
    status.textContent='Atendimento encerrado. A próxima mensagem deste contato volta para o Martyn.';
    carregarAtendimentos({silencioso:true});
  }catch(error){status.textContent=error.message;}
  finally{btn.disabled=false;}
}
async function alternarPausaAtendimento(){
  if(!atendState.atual)return;
  const btn=qs('#atend-th-pausebtn'),status=qs('#atend-th-status');
  const pausarAgora=btn.textContent!=='Reativar Martyn';
  btn.disabled=true;
  try{
    const d=await api('/api/master/whatsapp/conversations/'+encodeURIComponent(atendState.atual)+'/pause',{method:'POST',body:JSON.stringify({paused:pausarAgora})});
    renderConversa(d);status.textContent=pausarAgora?'Você assumiu a conversa. O Martyn está pausado para este contato.':'Martyn reativado: ele volta a responder este contato.';carregarAtendimentos({silencioso:true});
  }catch(error){status.textContent=error.message;}
  finally{btn.disabled=false;}
}
function formatarHora(iso){if(!iso)return'';const d=new Date(iso);if(isNaN(d.getTime()))return'';const hoje=new Date();return d.toDateString()===hoje.toDateString()?d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});}
function formatarTelefone(p){if(!p)return'';const d=String(p).replace(/\D/g,'');const n=d.startsWith('55')?d.slice(2):d;if(n.length===11)return`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;if(n.length===10)return`(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;return p;}

// Contas Master. O backend recusa desativar a própria conta e o último Master
// ativo; aqui a linha do próprio usuário nem chega a mostrar botão, pra que a
// trava do servidor seja a segunda barreira e não a primeira que o operador
// encontra.
let contasMaster=[];
async function carregarContasMaster(){
  const corpo=qs('#master-accounts'),status=qs('#master-accounts-status');
  if(!corpo)return;
  if(status)status.textContent='';
  try{
    const data=await api('/api/master/masters');
    contasMaster=data.masters||[];
    const access=JSON.parse(sessionStorage.getItem(STORAGE_SESSION)||'{}'),meuEmail=(access.user?.email||'').toLowerCase();
    corpo.innerHTML=contasMaster.length?contasMaster.map(m=>{
      const souEu=(m.email||'').toLowerCase()===meuEmail;
      const pill=m.active?'<span class="pill p-ok">Ativa</span>':'<span class="pill p-err">Desativada</span>';
      const acao=souEu
        ? '<span class="foot-note">Sua conta</span>'
        : `<button class="btn btn-s" type="button" onclick="alternarContaMaster('${esc(m.id)}',${m.active?'false':'true'})">${m.active?'Desativar':'Reativar'}</button>`;
      return `<tr><td class="mono">${esc(m.email||'')}</td><td>${esc(m.name||'—')}</td><td>${pill}${m.support_agent?' <span class="pill p-off">Atendimento</span>':''}</td><td>${acao}</td></tr>`;
    }).join(''):'<tr><td colspan="4">Nenhuma conta Master encontrada.</td></tr>';
  }catch(error){
    corpo.innerHTML='<tr><td colspan="4">Não foi possível carregar as contas Master.</td></tr>';
    if(status)status.textContent=error.message||'';
  }
}
async function alternarContaMaster(id,ativar){
  const alvo=contasMaster.find(m=>m.id===id);
  const acao=ativar?'reativar':'desativar';
  if(!await titanConfirm(`Confirma ${acao} a conta Master ${alvo?.email||id}?\n\nIsso muda quem tem acesso administrativo total ao TITAN e fica registrado nos Logs de auditoria.`,`${ativar?'Reativar':'Desativar'} conta Master`,ativar?'warn':'err'))return;
  const status=qs('#master-accounts-status');
  if(status)status.textContent=`Aplicando...`;
  try{
    await api('/api/master/masters/'+id+'/active',{method:'PUT',body:JSON.stringify({active:ativar})});
    if(status)status.textContent=`Conta ${ativar?'reativada':'desativada'}.`;
    await carregarContasMaster();
  }catch(error){if(status)status.textContent=error.message||'Não foi possível concluir.'}
}

let filaFiscalPollTimer;
async function carregarConfiguracoesMaster(){
  carregarContasMaster();
  carregarNotasTecnicasMaster();
  carregarFilaFiscalMaster();
  // Mesmo padrão de polling de iniciarAtendimentos(): atualiza sozinho
  // enquanto esta aba estiver aberta, para sozinho quando sai dela.
  clearInterval(filaFiscalPollTimer);
  filaFiscalPollTimer=setInterval(()=>{
    if(qs('#master-panel-config')?.classList.contains('active'))carregarFilaFiscalMaster();else clearInterval(filaFiscalPollTimer);
  },15000);
  const status=qs('#master-settings-status'),commStatus=qs('#master-comm-status');if(status)status.textContent='Carregando...';if(commStatus)commStatus.textContent='Carregando...';
  try{
    const data=await api('/api/master/settings');
    qs('#set-nubank-enabled').value=String(Boolean(data.nubankEnabled));
    qs('#set-nubank-api').value=data.nubankApiBaseUrl||'https://api.nubank.com.br';
    qs('#set-nubank-oauth').value=data.nubankOauthUrl||'';
    qs('#set-nubank-id').value=data.nubankClientId||'';
    qs('#set-nubank-secret').value='';qs('#set-nubank-webhook').value='';
    // Segredos nunca voltam do servidor — só o "tem ou não tem". Os campos de
    // arquivo ficam vazios de propósito: reenviar é opcional.
    qs('#set-sicredi-ambiente').value=data.sicrediAmbiente||'sandbox';
    qs('#set-sicredi-user').value=data.sicrediUsername||'';qs('#set-sicredi-coop').value=data.sicrediCooperativa||'';
    qs('#set-sicredi-posto').value=data.sicrediPosto||'';qs('#set-sicredi-benef').value=data.sicrediCodigoBeneficiario||'';
    const ss=qs('#master-sicredi-state');
    if(ss){const pronto=data.hasSicrediApiKey&&data.hasSicrediPassword&&data.sicrediUsername;
      ss.textContent=pronto?`Configurado (${data.sicrediAmbiente==='producao'?'produção':'sandbox'})`:'Não configurado';
      ss.className='pill '+(pronto?(data.sicrediAmbiente==='producao'?'p-ok':'p-gold'):'p-off')}
    qs('#set-pix-chave').value=data.pixChaveRecebedor||'';qs('#set-pix-escopos').value=data.pixEscopos||'';
    qs('#set-nubank-cert-pass').value='';qs('#set-nubank-cert-data').value='';qs('#set-nubank-cert-key-data').value='';
    const certEstado=qs('#set-nubank-cert-estado');
    if(certEstado)certEstado.textContent=data.hasNubankCertificate
      ?'Certificado gravado. Envie um arquivo novo só para substituir.'
      :'Nenhum certificado enviado. Se o banco exigir mTLS, a conexão será recusada sem ele.';
    qs('#set-accountant-enabled').value=String(Boolean(data.accountantCronEnabled));
    qs('#set-portal-logo-data').value=data.portalLogoDataUrl||'';
    aplicarLogoPortal(data.portalLogoDataUrl||'');
    qs('#set-comm-business-phone').value=data.businessPhone||'';
    qs('#set-comm-phone-enabled').value=String(Boolean(data.businessPhoneEnabled));
    qs('#set-wa-enabled').value=String(Boolean(data.whatsappEnabled));
    qs('#set-wa-display-name').value=data.whatsappDisplayName||'';
    qs('#set-wa-graph-version').value=data.metaGraphApiVersion||'v21.0';
    qs('#set-wa-meta-business-id').value=data.metaBusinessId||'';
    qs('#set-wa-waba-id').value=data.whatsappBusinessAccountId||'';
    qs('#set-wa-phone-number-id').value=data.whatsappPhoneNumberId||'';
    qs('#set-wa-app-id').value=data.metaAppId||'';
    const webhook=qs('#set-wa-webhook-url');if(webhook)webhook.textContent=data.whatsappWebhookUrl||'https://titan-nfse-api.onrender.com/api/whatsapp/webhook';
    qs('#set-wa-access-token').value='';qs('#set-wa-app-secret').value='';qs('#set-wa-verify-token').value='';
    qs('#set-martyn-wa-enabled').value=String(Boolean(data.martynWhatsAppEnabled));
    qs('#set-martyn-mode').value=data.martynOperationMode||'automatico_escalonamento';
    qs('#set-martyn-name').value=data.martynDisplayName||'Martyn';
    qs('#set-martyn-company').value=data.martynRepresentedCompany||'';
    qs('#set-martyn-greeting').value=data.martynGreeting||'';
    qs('#set-martyn-tone').value=data.martynTone||'';
    qs('#set-support-phone').value=data.supportHelpPhone||'';
    qs('#set-support-wa-enabled').value=String(data.supportHelpWhatsAppEnabled!==false);
    qs('#set-support-alerts-enabled').value=String(data.supportHelpAlertsEnabled!==false);
    const ns=qs('#master-nubank-state');if(ns){ns.textContent=data.nubankEnabled&&data.hasNubankClientSecret?'Configurado':'Não configurado';ns.className=`pill ${data.nubankEnabled&&data.hasNubankClientSecret?'p-ok':'p-off'}`}
    const as=qs('#master-accountant-state');if(as){as.textContent=data.accountantCronEnabled?'Ativo':'Desativado';as.className=`pill ${data.accountantCronEnabled?'p-ok':'p-off'}`}
    atualizarEstadosIntegracoes(data);
    if(status)status.textContent='Configurações carregadas.';if(commStatus)commStatus.textContent='Configurações carregadas.';
  }catch(error){if(status)status.textContent=error.message;if(commStatus)commStatus.textContent=error.message}
}
/**
 * Salvamento por PAINEL (20/08/2026).
 *
 * Antes era um PUT único que lia campos dos DOIS painéis. Com o Martyn em
 * seção própria isso ficou errado de duas formas: você salvava configuração de
 * banco ao mexer no Martyn, e um campo ainda não carregado de um painel podia
 * sobrescrever o outro.
 *
 * O backend aceita envio parcial (settings.ts faz { ...stored, ...input }), e
 * TODOS os booleanos viraram opcionais lá justamente por isto — antes,
 * `whatsappEnabled` tinha default(false) e um envio sem ele DESLIGARIA o
 * WhatsApp e o Martyn em silêncio.
 */
async function enviarConfiguracoesMaster(campos, elementoDeStatus){
  const status=qs(elementoDeStatus);
  if(status)status.textContent='Salvando com criptografia...';
  try{
    const data=await api('/api/master/settings',{method:'PUT',body:JSON.stringify(campos)});
    const ns=qs('#master-nubank-state');if(ns){ns.textContent=data.nubankEnabled&&data.hasNubankClientSecret?'Configurado':'Não configurado';ns.className=`pill ${data.nubankEnabled&&data.hasNubankClientSecret?'p-ok':'p-off'}`}
    const as=qs('#master-accountant-state');if(as){as.textContent=data.accountantCronEnabled?'Ativo':'Desativado';as.className=`pill ${data.accountantCronEnabled?'p-ok':'p-off'}`}
    atualizarEstadosIntegracoes(data);
    aplicarLogoPortal(data.portalLogoDataUrl||'');
    // Campos de segredo voltam vazios: vazio significa "manter o que está
    // gravado", nunca "apagar".
    ['#set-nubank-secret','#set-nubank-webhook','#set-nubank-cert-pass','#set-sicredi-key','#set-sicredi-pass',
     '#set-wa-access-token','#set-wa-app-secret','#set-wa-verify-token'].forEach(id=>{const el=qs(id);if(el)el.value=''});
    if(status)status.textContent='Configurações salvas. Segredos mantidos no cofre criptografado.';
    return data;
  }catch(error){ if(status)status.textContent=error.message; }
}

/** Painel Configurações: banco, cobrança e rotina do contador. */
async function salvarConfiguracoesMaster(){
  return enviarConfiguracoesMaster({
    nubankEnabled:qs('#set-nubank-enabled').value==='true',nubankApiBaseUrl:qs('#set-nubank-api').value.trim(),nubankOauthUrl:qs('#set-nubank-oauth').value.trim(),nubankClientId:qs('#set-nubank-id').value.trim(),nubankClientSecret:qs('#set-nubank-secret').value,nubankWebhookSecret:qs('#set-nubank-webhook').value,
    accountantCronEnabled:qs('#set-accountant-enabled').value==='true',
    sicrediAmbiente:qs('#set-sicredi-ambiente').value,sicrediApiKey:qs('#set-sicredi-key').value,
    sicrediUsername:qs('#set-sicredi-user').value.trim(),sicrediPassword:qs('#set-sicredi-pass').value,
    sicrediCooperativa:qs('#set-sicredi-coop').value.trim(),sicrediPosto:qs('#set-sicredi-posto').value.trim(),sicrediCodigoBeneficiario:qs('#set-sicredi-benef').value.trim(),
    pixChaveRecebedor:qs('#set-pix-chave').value.trim(),pixEscopos:qs('#set-pix-escopos').value.trim(),
    nubankCertificateBase64:qs('#set-nubank-cert-data').value,nubankCertificateKeyBase64:qs('#set-nubank-cert-key-data').value,nubankCertificatePassphrase:qs('#set-nubank-cert-pass').value,
    portalLogoDataUrl:qs('#set-portal-logo-data').value
  }, '#master-settings-status');
}

/** Painel Martyn: WhatsApp, identidade e comportamento do atendente. */
async function salvarConfiguracoesMartyn(){
  return enviarConfiguracoesMaster({
    businessPhone:qs('#set-comm-business-phone').value.trim(),businessPhoneEnabled:qs('#set-comm-phone-enabled').value==='true',
    whatsappEnabled:qs('#set-wa-enabled').value==='true',whatsappDisplayName:qs('#set-wa-display-name').value.trim(),metaGraphApiVersion:qs('#set-wa-graph-version').value.trim(),metaBusinessId:qs('#set-wa-meta-business-id').value.trim(),whatsappBusinessAccountId:qs('#set-wa-waba-id').value.trim(),whatsappPhoneNumberId:qs('#set-wa-phone-number-id').value.trim(),metaAppId:qs('#set-wa-app-id').value.trim(),
    metaAccessToken:qs('#set-wa-access-token').value,metaAppSecret:qs('#set-wa-app-secret').value,whatsappWebhookVerifyToken:qs('#set-wa-verify-token').value,
    martynWhatsAppEnabled:qs('#set-martyn-wa-enabled').value==='true',martynOperationMode:qs('#set-martyn-mode').value,martynDisplayName:qs('#set-martyn-name').value.trim(),martynRepresentedCompany:qs('#set-martyn-company').value.trim(),martynGreeting:qs('#set-martyn-greeting').value.trim(),martynTone:qs('#set-martyn-tone').value.trim(),
    supportHelpPhone:qs('#set-support-phone').value.trim(),supportHelpWhatsAppEnabled:qs('#set-support-wa-enabled').value==='true',supportHelpAlertsEnabled:qs('#set-support-alerts-enabled').value==='true'
  }, '#master-comm-status');
}
function atualizarEstadosIntegracoes(data){
  const waCredentialsReady=Boolean(data.whatsappPhoneNumberId&&data.whatsappBusinessAccountId&&data.hasMetaAccessToken&&data.hasMetaAppSecret&&data.hasWhatsappWebhookVerifyToken);
  const wa=qs('#master-whatsapp-state');if(wa){wa.textContent=!data.whatsappEnabled?'Desativado':waCredentialsReady?'Pronto para validar':'Configuração incompleta';wa.className=`pill ${data.whatsappEnabled&&waCredentialsReady?'p-ok':'p-off'}`}
  const martyn=qs('#master-martyn-provider-state');if(martyn){martyn.textContent=data.martynProviderReady?'Provedor conectado':'Chave de IA ausente';martyn.className=`pill ${data.martynProviderReady?'p-ok':'p-off'}`}
  const detail=qs('#master-martyn-provider-detail');if(detail)detail.textContent=data.martynProviderReady?`${data.martynProvider||''} · ${data.martynModel||''}`:'Configure a chave do provedor de IA no ambiente da API antes de ativar respostas automáticas.';
}
function mostrarAbaComunicacao(aba,btnAtivo){
  qsa('.comm-tab-panel').forEach(el=>el.style.display='none');
  qsa('.comm-tab-btn').forEach(el=>el.classList.remove('on'));
  const painel=qs('#comm-tab-'+aba);if(painel)painel.style.display='';
  btnAtivo?.classList.add('on');
}
function prepararLogoPortalMaster(input){
  const file=input.files?.[0],status=qs('#master-settings-status');
  if(!file)return;
  if(!/^image\/(png|jpeg)$/.test(file.type)||file.size>1_800_000){if(status)status.textContent='Use uma logo PNG ou JPEG de até 1,8 MB.';input.value='';return}
  const reader=new FileReader();
  reader.onload=()=>{const dataUrl=String(reader.result||'');qs('#set-portal-logo-data').value=dataUrl;aplicarLogoPortal(dataUrl);if(status)status.textContent='Logo carregada. Clique em Salvar configurações para publicar no cofre do Master.'};
  reader.readAsDataURL(file);
}
function limparLogoPortalMaster(){
  qs('#set-portal-logo-data').value='';
  qs('#set-portal-logo').value='';
  aplicarLogoPortal('');
  const status=qs('#master-settings-status');if(status)status.textContent='Logo padrão selecionada. Clique em Salvar configurações para confirmar.';
}
async function aplicarBloqueioInadimplenciaMaster(){
  const status=qs('#master-enforce-status');if(status)status.textContent='Verificando empresas...';
  try{
    const data=await api('/api/billing/enforce',{method:'POST'});
    if(status)status.textContent=`${data.checked||0} empresa(s) verificada(s) · ${data.blocked||0} bloqueada(s) por inadimplência agora.`;
    carregarMaster();
  }catch(error){if(status)status.textContent=error.message}
}
async function atualizarCatalogoMunicipiosMaster(){
  const status=qs('#master-settings-status');if(status)status.textContent='Consultando a fonte oficial...';
  try{const data=await api('/api/master/municipalities/refresh',{method:'POST'});if(status)status.textContent=data.updated?`Catálogo atualizado (${data.total||0} municípios).`:'Catálogo já estava atualizado.';}
  catch(error){if(status)status.textContent=error.message}
}
function segundosLegivel(ms){
  const s=Math.round((ms||0)/1000);
  return s<60?`${s}s`:`${Math.floor(s/60)}min ${s%60}s`;
}
async function carregarFilaFiscalMaster(){
  try{
    const data=await api('/api/master/fiscal-queue');
    qs('#fq-atual').textContent=data.concorrenciaAtual;
    qs('#fq-limites').textContent=`${data.piso} / ${data.teto}`;
    qs('#fq-alvo').textContent=segundosLegivel(data.alvoEsperaMs);
    qs('#fq-aguardando').textContent=data.aguardando;
    qs('#fq-aguardando').className='pill '+(data.aguardando>0?'p-warn':'p-ok');
    qs('#fq-espera').textContent=data.aguardando>0?segundosLegivel(data.esperaMaisAntigaMs):'—';
    qs('#fq-espera').className='pill '+(data.esperaMaisAntigaMs>data.alvoEsperaMs?'p-err':'p-off');
    const hist=qs('#fq-historico');
    hist.innerHTML=data.historico.length?data.historico.map(e=>`<div class="draft-item"><b>${e.de} → ${e.para}</b><span>${esc(e.motivo)}</span><small>${new Date(e.quando).toLocaleString('pt-BR')}</small></div>`).join(''):'<div class="empty-state">Nenhum ajuste ainda — concorrência estável no piso.</div>';
  }catch(error){
    const hist=qs('#fq-historico');if(hist)hist.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;
  }
}
async function carregarNotasTecnicasMaster(){
  const box=qs('#master-notas-tecnicas');if(!box)return;
  try{
    const notas=await api('/api/master/notas-tecnicas');
    box.innerHTML=notas.length?notas.map(n=>`<div class="draft-item"><b>${new Date(n.dataPublicacao+'T00:00:00').toLocaleDateString('pt-BR')}</b><span style="white-space:pre-line">${esc(n.conteudo)}</span></div>`).join(''):'<div class="empty-state">Nenhuma nota técnica capturada ainda — clique em "Buscar agora".</div>';
  }catch(error){box.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}
async function atualizarNotasTecnicasMaster(){
  const status=qs('#master-notas-tecnicas-status');if(status)status.textContent='Buscando na página oficial...';
  try{
    const data=await api('/api/master/notas-tecnicas/atualizar',{method:'POST'});
    if(status)status.textContent=data.erro?`Falha: ${data.erro}`:`${data.totalEncontradas} nota(s) na página, ${data.novasNotas} nova(s).`;
    await carregarNotasTecnicasMaster();
  }catch(error){if(status)status.textContent=error.message}
}
async function abrirEmpresaEmissao(companyId){
  const novaAba=window.open('about:blank','_blank');
  if(novaAba){novaAba.opener=null;novaAba.document.title='Abrindo empresa - TITAN NFS-e';novaAba.document.body.innerHTML='<p style="font:14px Inter,Arial,sans-serif;padding:24px;color:#0b1629">Preparando o ambiente fiscal da empresa...</p>'}
  try{
    const result=await api('/api/master/companies/'+companyId+'/session',{method:'POST'}),company=(result.companies||[])[0];
    const bytes=new TextEncoder().encode(JSON.stringify(result));let binary='';bytes.forEach(byte=>binary+=String.fromCharCode(byte));
    const handoff=btoa(binary),url=`/dashboard#handoff=${encodeURIComponent(handoff)}`;
    if(novaAba)novaAba.location.replace(url);else alert('O navegador bloqueou a nova aba. Libere pop-ups para este site e tente novamente.');
  }catch(error){if(novaAba)novaAba.close();alert(error.message)}
}
function abrirEmpresaSelecionada(){const id=sessionStorage.getItem(STORAGE_COMPANY_ID)||empresasAdmin[0]?.id;if(!id){alert('Selecione uma empresa.');return}abrirEmpresaEmissao(id)}
async function carregarMaster(){
  const summary=qs('#master-summary'),companies=qs('#master-companies');
  if(summary)summary.textContent='Carregando a gestão de clientes...';
  if(companies&&!companies.children.length)companies.innerHTML='<tr><td colspan="6">Conectando ao servidor. No primeiro acesso, isso pode levar alguns segundos...</td></tr>';
  try{
    const params=new URLSearchParams();if(masterClientSearchTerm)params.set('search',masterClientSearchTerm);if(masterClientPartnerFilter)params.set('partnerId',masterClientPartnerFilter);
    masterData=await api('/api/master/overview'+(params.toString()?'?'+params.toString():''));
    const emissaoLiberada=masterData.companies.filter(c=>c.emission_enabled).length;
    qs('#master-summary').textContent=`${masterData.companies.length} CNPJ(s) cadastrado(s) · ${emissaoLiberada} com emissão liberada · gestão unificada por cliente e usuário`;
    const totalNotasMes=qs('#master-monthly-invoices');if(totalNotasMes)totalNotasMes.textContent=String(masterData.monthlyAuthorizedInvoices||0);
    renderMasterClientPartnerFilter();
    configurarEmpresasAdmin(masterData.companies);
    const planOptions=masterData.plans.map(p=>`<option value="${esc(p.code)}">${esc(p.name)} — ${brl(Number(p.price_cents)/100)} / ${p.monthly_limit} notas</option>`).join('');
    qs('#master-new-plan').innerHTML=planOptions;
    renderMasterClients();renderMasterPartners();renderMasterPlans();renderMasterAddons();
    // Preserva o que já estiver marcado: um refresh em segundo plano não pode
    // apagar a seleção de quem está no meio da edição de um plano.
    renderPlanFeatures(qs('#plan-features')?.children.length?lerPlanFeatures():[]);
    renderEmpresasAdmin();
    const pendPill=qs('#plan-upgrade-pending-pill');
    if(pendPill){const n=Number(masterData.pendingUpgradeRequests||0);pendPill.style.display=n?'':'none';pendPill.textContent=n+' pendente'+(n>1?'s':'');}
    carregarPlanUpgradeRequests();
    carregarContratoMaster();
  }catch(error){
    if(error?.status===401){
      limparSessaoLocal();
      document.documentElement.classList.remove('titan-boot-auth');
      mostrarErroLogin('Sua sessão administrativa expirou. Entre novamente para continuar.');
      qs('#li-mail')?.focus();
      return;
    }
    if(summary)summary.textContent='Não foi possível carregar a gestão agora.';
    if(companies)companies.innerHTML='<tr><td colspan="6"><div class="empty-state"><b>Falha ao conectar com o servidor.</b><br><span>'+esc(error.message||'Tente novamente em alguns segundos.')+'</span><br><button class="btn btn-p" type="button" style="margin-top:12px" onclick="carregarMaster()">Tentar novamente</button></div></td></tr>';
  }
}

function usuariosDoCnpj(companyId){return (masterData?.users||[]).filter(u=>u.company_id===companyId&&!u.is_master&&u.access_origin!=='master')}
function usuarioPrincipalCnpj(companyId){const rows=usuariosDoCnpj(companyId);return rows.find(u=>u.access_origin==='operational')||rows.find(u=>u.access_origin==='pending')||null}
function empresaSuspensa(c){return c.emission_enabled===false}
let masterClientView='ativas';
function mostrarSubtelaClientes(view,btn){masterClientView=view;qsa('.client-subtab-btn').forEach(el=>el.classList.remove('on'));btn?.classList.add('on');renderMasterClients()}

// Menu "⋯" por linha da Gestão por CNPJ: Revisar/Liberar, Suspender e Redefinir
// senha saíram de botões sempre visíveis (eram 5 lado a lado) para dentro deste
// menu — só Abrir emissão e Editar usuário continuam visíveis direto na linha.
function fecharMenuAcoesCliente(){qsa('.acts-menu-drop.on').forEach(el=>el.classList.remove('on'))}
function alternarMenuAcoesCliente(event,key){
  event?.stopPropagation();
  const menu=qs('#acts-menu-'+key),abrir=!menu.classList.contains('on');
  fecharMenuAcoesCliente();
  menu.classList.toggle('on',abrir);
}
document.addEventListener('click',fecharMenuAcoesCliente);
document.addEventListener('keydown',event=>{if(event.key==='Escape')fecharMenuAcoesCliente()});
function renderMasterClients(){const box=qs('#master-companies');if(!box||!masterData)return;const status=qs('#master-client-status')?.value||'all';const label={self_service:'Autoimplantação',paid_pending:'Implantação paga — pendente',paid_active:'Implantação paga — ativa'};const suspensasTotal=masterData.companies.filter(empresaSuspensa).length,contadorAtivas=qs('#master-count-ativas'),contadorSuspensas=qs('#master-count-suspensas'),aviso=qs('#master-suspended-note');if(contadorAtivas)contadorAtivas.textContent=masterData.companies.length-suspensasTotal;if(contadorSuspensas)contadorSuspensas.textContent=suspensasTotal;if(aviso)aviso.style.display=masterClientView==='suspensas'?'':'none';
  // A busca por nome/CNPJ/e-mail já rodou no servidor (GET /master/overview?search=)
  // — masterData.companies chega pronto. Aqui só resta o filtro de situação,
  // que é sobre a página carregada mesmo (não pagina por status).
  const truncado=qs('#master-companies-truncated'),total=Number(masterData.companiesTotal||masterData.companies.length);
  if(truncado){truncado.style.display=total>masterData.companies.length?'block':'none';truncado.textContent=`Mostrando ${masterData.companies.length} de ${total} empresas que casam com a busca — refine o termo pra achar as demais.`}
  const rows=masterData.companies.filter(c=>{if(masterClientView==='suspensas'?!empresaSuspensa(c):empresaSuspensa(c))return false;return status==='all'||(c.implementation_status||'self_service')===status});box.innerHTML=rows.map(c=>{const u=usuarioPrincipalCnpj(c.id),linked=usuariosDoCnpj(c.id),multi=linked.filter(item=>item.access_origin==='operational').length>1,isPending=!u||u.access_origin==='pending',active=u&&u.active!==false&&u.access_active!==false&&!isPending,limit=Number(u?.monthly_limit||0),used=Number(u?.monthly_used||0);const partnerOptions='<option value="">Administrador</option>'+masterData.partners.map(p=>`<option value="${p.id}" ${p.id===u?.partner_id?'selected':''}>${esc(p.nickname)}</option>`).join('');const userCell=u?`<b>${esc(u.name||'Administrador')}</b> ${isPending?'<span class="pill p-warn">PENDENTE</span>':''}${multi?'<span class="pill p-err">REVISAR</span>':''}<br><span>${esc(u.email||c.contact_email||'Sem e-mail informado')}</span><br><small>${multi?'Mais de um usuário operacional neste CNPJ':'Um CNPJ por usuário responsável'}</small>`:`<b>Administrador</b> <span class="pill p-warn">PENDENTE</span><br><span>${esc(c.contact_email||'Sem e-mail informado')}</span><br><small>Sem usuário ativo neste CNPJ</small>`;const vinculo=isPending?'<span class="foot-note">Administrador</span>':`<select class="inp" style="padding:5px" onchange="vincularUsuarioParceiro('${u.id}',this.value,'${u.partner_id||''}')">${partnerOptions}</select>`;const suspensa=empresaSuspensa(c);const statusCell=suspensa?`<span class="pill p-err">Emissão suspensa</span><br><small>${esc(label[c.implementation_status||'self_service']||'')}</small>`:isPending?'<span class="pill p-warn">Sem usuário ativo</span>':`<span class="pill ${active?'p-ok':'p-off'}">${active?'Liberado':'Suspenso'}</span><br><small>${esc(label[c.implementation_status||'self_service']||'')}</small>`;const actions=suspensa?`<button class="btn btn-s" onclick="reativarEmpresaMaster('${c.id}')">Reativar emissão</button><button class="btn btn-s" onclick="abrirDetalhesCliente('${c.id}')">Editar cliente</button>${u&&!isPending?`<button class="btn btn-s" onclick="gerarRedefinicaoSenha('${u.id}','${c.id}')">Redefinir senha</button>`:''}<span class="foot-note">As notas já emitidas continuam preservadas</span>`:isPending?`<button class="btn btn-s" onclick="prepararUsuarioPendente('${c.id}')">Convidar usuário</button><button class="btn btn-s" onclick="abrirDetalhesCliente('${c.id}')">Editar cliente</button><button class="btn btn-s" onclick="abrirEmpresaEmissao('${c.id}')" ${c.emission_enabled?'':'disabled'}>Abrir emissão</button><span class="foot-note">Gere ou reenvie o convite pelo CNPJ</span>`:`<button class="btn btn-p" onclick="abrirEmpresaEmissao('${c.id}')" ${c.emission_enabled?'':'disabled'}>Abrir emissão</button><button class="btn btn-s" onclick="abrirDetalhesCliente('${c.id}')">Editar cliente</button><div class="acts-menu"><button class="btn btn-s" type="button" title="Mais ações" aria-label="Mais ações" onclick="alternarMenuAcoesCliente(event,'${u.id}-${c.id}')">⋯</button><div class="acts-menu-drop" id="acts-menu-${u.id}-${c.id}"><button type="button" onclick="fecharMenuAcoesCliente();salvarAcesso('${u.id}','${c.id}',true)">${active?'Revisar e salvar':'Liberar'}</button><button type="button" onclick="fecharMenuAcoesCliente();salvarAcesso('${u.id}','${c.id}',false)">Suspender</button><button type="button" onclick="fecharMenuAcoesCliente();gerarRedefinicaoSenha('${u.id}','${c.id}')">Redefinir senha</button></div></div>`;return `<tr><td><b>${esc(c.trade_name||c.legal_name)}</b> ${c.environment_override==='restricted'?'<span class="pill p-warn" title="Sempre emite em homologação, mesmo com o servidor em produção">EMPRESA TESTE</span>':''}<br><span class="mono">${esc(formatarCnpj(c.federal_tax_id))}</span><br><small>Plano ${esc(c.plan_code||'—')} · ${used}${limit?` / ${limit}`:''} emissões</small></td><td>${userCell}</td><td>${vinculo}</td><td>${statusCell}</td><td><div class="acts">${actions}</div></td></tr>`}).join('')||`<tr><td colspan="5">${masterClientView==='suspensas'?'Nenhuma empresa suspensa — está tudo liberado por aqui.':'Nenhum CNPJ encontrado.'}</td></tr>`}
function filtrarClientesMaster(){renderMasterClients()}
// Antes filtrava as empresas 100% no cliente sobre a lista inteira. Agora o
// termo vai pro servidor (GET /master/overview?search=), que filtra no SQL
// por nome/CNPJ/e-mail — carregarMaster() reaplica masterClientSearchTerm em
// toda chamada (inclusive nos refresh silenciosos após uma mutação), então a
// busca continua "grudada" na tela do mesmo jeito que já era antes.
let masterClientSearchDebounce=null,masterClientSearchTerm='';
function buscarClientesMaster(){
  masterClientSearchTerm=(qs('#master-client-search')?.value||'').trim();
  clearTimeout(masterClientSearchDebounce);
  masterClientSearchDebounce=setTimeout(()=>carregarMaster(),320);
}
// Filtro por parceiro (GET /master/overview?partnerId=): "" não filtra,
// "none" mostra só clientes diretos (sem parceiro comercial vinculado à
// empresa) e um UUID filtra pelo parceiro específico — igual à busca por
// texto, o filtro roda no servidor, então muda o valor e recarrega.
let masterClientPartnerFilter='';
function filtrarParceiroClientesMaster(){
  masterClientPartnerFilter=qs('#master-client-partner')?.value||'';
  carregarMaster();
}
function renderMasterClientPartnerFilter(){
  const select=qs('#master-client-partner');if(!select||!masterData)return;
  const opcoes=['<option value="">Todos os parceiros</option>','<option value="none">Somente clientes diretos</option>',...masterData.partners.map(p=>`<option value="${p.id}">${esc(p.nickname)}</option>`)];
  select.innerHTML=opcoes.join('');
  select.value=masterClientPartnerFilter;
}
function imprimirClientesMaster(){document.body.classList.add('printing-master');window.print();window.setTimeout(()=>document.body.classList.remove('printing-master'),1000)}
const PARTNER_INVITE_LABEL={accepted:'<span class="pill p-ok">Acesso ativo</span>',pending:'<span class="pill p-warn">Convite enviado</span>',none:'<span class="pill p-off">Sem convite</span>'};
function renderMasterPartners(){const box=qs('#master-partners');if(!box||!masterData)return;box.innerHTML=masterData.partners.map(p=>{
  const inviteStatus=p.invite_status||'none';
  const conviteCell=p.email
    ?`${esc(p.email)}<br>${PARTNER_INVITE_LABEL[inviteStatus]||PARTNER_INVITE_LABEL.none}${inviteStatus!=='accepted'?` <button class="btn btn-s" type="button" style="padding:3px 8px;font-size:11.5px" onclick="enviarConviteParceiroMaster('${p.id}')">${inviteStatus==='pending'?'Reenviar':'Enviar'} convite</button>`:''}`
    :'<span class="hint">Sem e-mail cadastrado</span>';
  const cnpjCell=p.federal_tax_id?`<span class="mono">${esc(formatarCnpj(p.federal_tax_id))}</span>`:'<span class="pill p-warn" title="Necessário para liberar licenças cobradas">Sem CNPJ/CPF</span>';
  return `<tr><td>${esc(p.name)}</td><td><b>${esc(p.nickname)}</b></td><td>${cnpjCell}</td><td>${conviteCell}</td><td>${brl(Number(p.commission_percent||0))}%</td><td>${p.users||0}</td><td><span class="pill ${p.active?'p-ok':'p-off'}">${p.active?'Ativo':'Suspenso'}</span></td><td><div class="acts"><button class="btn btn-s" type="button" onclick="editarParceiroMaster('${p.id}')">Editar</button><button class="btn btn-s" type="button" onclick="alternarStatusParceiroMaster('${p.id}')">${p.active?'Suspender':'Ativar'}</button></div></td></tr>`;
}).join('')||'<tr><td colspan="8">Nenhum parceiro cadastrado.</td></tr>'}
async function enviarConviteParceiroMaster(id){
  const partner=masterData?.partners.find(item=>item.id===id);if(!partner)return;
  if(!partner.email){alert('Cadastre o e-mail do parceiro antes de enviar o convite.');return}
  try{
    await api('/api/master/partners/'+id+'/invite',{method:'POST'});
    alert(`Convite enviado para ${partner.email}. O link expira em 7 dias.`);
    await carregarMaster();
  }catch(error){alert(error.message)}
}

// Modelo de revenda por licença (16/08/2026): pedidos de compra de licença
// do parceiro ficam pendentes até o Master conferir que o pagamento chegou
// (sem gateway de pagamento real integrado pro parceiro ainda) e confirmar
// aqui — só então o saldo do parceiro é creditado.
const LICENCA_ORDER_STATUS_LABEL={pending:['p-warn','Aguardando confirmação'],paid:['p-ok','Pago'],canceled:['p-off','Cancelado']};
async function carregarPedidosLicencaMaster(){
  const corpo=qs('#master-license-orders');if(!corpo)return;
  corpo.innerHTML='<tr><td colspan="7" class="empty-state">Carregando...</td></tr>';
  try{
    const data=await api('/api/master/partner-license-orders?status=all');
    const pedidos=data.orders||[];
    corpo.innerHTML=pedidos.length?pedidos.map(o=>{
      const [classe,rotulo]=LICENCA_ORDER_STATUS_LABEL[o.status]||['p-off',esc(o.status)];
      const acao=o.status==='pending'
        ?`<div class="acts"><button class="btn btn-p" type="button" onclick="confirmarPedidoLicencaMaster('${o.id}')">Confirmar pagamento</button><button class="btn btn-s" type="button" onclick="cancelarPedidoLicencaMaster('${o.id}')">Cancelar</button></div>`
        :'—';
      return `<tr><td><b>${esc(o.partner_name||o.partner_nickname)}</b></td><td>${esc(o.plan_code)}</td><td>${o.quantity}</td><td>R$ ${brl(Number(o.total_cents||0)/100)}</td><td><span class="pill ${classe}">${rotulo}</span></td><td>${formatarDataNovidade(o.created_at)}</td><td>${acao}</td></tr>`;
    }).join(''):'<tr><td colspan="7" class="empty-state">Nenhum pedido de licença ainda.</td></tr>';
  }catch(error){
    corpo.innerHTML=`<tr><td colspan="7" class="empty-state">${esc(error.message)}</td></tr>`;
  }
}
async function confirmarPedidoLicencaMaster(id){
  if(!await titanConfirm('Confirme só depois de ver o pagamento chegar de verdade (PIX/transferência, fora do sistema). O saldo do parceiro é creditado na hora.','Confirmar pagamento de licenças'))return;
  try{
    await api('/api/master/partner-license-orders/'+id+'/confirm',{method:'POST'});
    await carregarPedidosLicencaMaster();
  }catch(error){alert(error.message)}
}
async function cancelarPedidoLicencaMaster(id){
  if(!await titanConfirm('Cancelar este pedido de licenças? O parceiro precisará pedir de novo se ainda quiser comprar.','Cancelar pedido','err'))return;
  try{
    await api('/api/master/partner-license-orders/'+id+'/cancel',{method:'POST'});
    await carregarPedidosLicencaMaster();
  }catch(error){alert(error.message)}
}
// Cobranças de licença (18/08/2026, pedido do usuário): cobrança inicial (na
// liberação do pedido) e recorrente (a cada 30 dias, uma por empresa-cliente
// usando a licença — jobs/partner-license-billing.ts). Confirmar aqui emite
// a NFS-e real (TITAN BACKOFFICE → parceiro) e, se for recorrente, desbloqueia
// a empresa-cliente na hora.
const LICENCA_CHARGE_STATUS_LABEL={pending:['p-warn','Aguardando pagamento'],paid:['p-ok','Paga'],overdue:['p-err','Vencida'],canceled:['p-off','Cancelada']};
async function carregarCobrancasLicencaMaster(){
  const corpo=qs('#master-license-charges');if(!corpo)return;
  corpo.innerHTML='<tr><td colspan="6" class="empty-state">Carregando...</td></tr>';
  try{
    const data=await api('/api/master/partner-license-charges?status=all');
    const cobrancas=data.charges||[];
    corpo.innerHTML=cobrancas.length?cobrancas.map(c=>{
      const [classe,rotulo]=LICENCA_CHARGE_STATUS_LABEL[c.status]||['p-off',esc(c.status)];
      const acao=(c.status==='pending'||c.status==='overdue')
        ?`<button class="btn btn-p" type="button" onclick="confirmarCobrancaLicencaMaster('${c.id}')">Confirmar pagamento</button>`
        :(c.invoice_id?'<span class="hint">Nota emitida</span>':'—');
      return `<tr><td><b>${esc(c.partner_name||c.partner_nickname)}</b></td><td>${c.company_name?esc(c.company_name):'<span class="hint">Cobrança inicial</span>'}</td><td>R$ ${brl(Number(c.amount_cents||0)/100)}</td><td>${formatarDataNovidade(c.due_at)}</td><td><span class="pill ${classe}">${rotulo}</span></td><td>${acao}</td></tr>`;
    }).join(''):'<tr><td colspan="6" class="empty-state">Nenhuma cobrança de licença ainda.</td></tr>';
  }catch(error){
    corpo.innerHTML=`<tr><td colspan="6" class="empty-state">${esc(error.message)}</td></tr>`;
  }
}
async function confirmarCobrancaLicencaMaster(id){
  if(!await titanConfirm('Confirme só depois de ver o pagamento chegar de verdade (PIX/transferência, fora do sistema). Isso emite a NFS-e real da TITAN BACKOFFICE pro parceiro e libera a licença na hora.','Confirmar pagamento de cobrança'))return;
  try{
    await api('/api/master/partner-license-charges/'+id+'/confirm-payment',{method:'POST'});
    await carregarCobrancasLicencaMaster();
  }catch(error){alert(error.message)}
}
// O catálogo de ferramentas vem da API (masterData.planFeatures): ferramenta
// nova aparece aqui sozinha, sem mexer nesta tela.
function catalogoDeFerramentas(){return masterData?.planFeatures||[]}
function nomeDaFerramenta(code){return catalogoDeFerramentas().find(f=>f.code===code)?.name||code}
function featuresDoPlano(p){return Array.isArray(p?.features)?p.features:[]}
function renderPlanFeatures(marcadas){
  const box=qs('#plan-features');if(!box)return;
  const lista=catalogoDeFerramentas();
  if(!lista.length){box.innerHTML='<div class="hint">Catálogo de ferramentas indisponível.</div>';return}
  box.innerHTML=lista.map(f=>{
    // O que é padrão do produto fica marcado e desabilitado: desligar emissão
    // pelo portal não é uma decisão que esta tela deveria conseguir tomar.
    const on=f.sempreIncluida||marcadas.includes(f.code);
    return `<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" value="${esc(f.code)}" ${on?'checked':''} ${f.sempreIncluida?'disabled':''}><span><b>${esc(f.name)}</b> ${f.sempreIncluida?'<span class="pill p-ok">Padrão do produto</span>':''}<br><small>${esc(f.description)}</small></span></label>`;
  }).join('');
}
function lerPlanFeatures(){return [...document.querySelectorAll('#plan-features input[type=checkbox]')].filter(i=>i.checked).map(i=>i.value)}
function renderMasterPlans(){const box=qs('#master-plans');if(!box||!masterData)return;box.innerHTML=masterData.plans.map(p=>{
  const vendidas=featuresDoPlano(p).filter(c=>!catalogoDeFerramentas().find(f=>f.code===c)?.sempreIncluida);
  const etiquetas=vendidas.length?vendidas.map(c=>`<span class="pill p-ok">${esc(nomeDaFerramenta(c))}</span>`).join(' '):'<span class="pill p-off">Só o padrão</span>';
  return `<tr><td><b>${esc(p.name)}</b><br><span class="mono">${esc(p.code)}</span></td><td>R$ ${brl(Number(p.price_cents)/100)}</td><td>${p.monthly_limit}</td><td>${etiquetas}</td><td><span class="pill ${p.active?'p-ok':'p-off'}">${p.active?'Ativo':'Inativo'}</span></td><td><div class="acts"><button class="btn btn-s" onclick="editarPlanoMaster('${p.code}')">Editar</button><button class="ico-btn danger" title="Excluir plano" onclick="excluirPlanoMaster('${esc(p.code)}','${esc(p.name)}')">×</button></div></td></tr>`;
}).join('')||'<tr><td colspan="6">Nenhum plano cadastrado.</td></tr>'}
function renderMasterAddons(){const box=qs('#master-addons');if(!box||!masterData)return;box.innerHTML=(masterData.addons||[]).map(a=>`<tr><td><b>${esc(a.name)}</b><br><span class="hint">${esc(a.description||'')}</span></td><td><input class="inp" style="max-width:140px" id="addon-price-${esc(a.code)}" value="${brl(Number(a.priceCents||0)/100)}"></td><td><select class="inp" style="max-width:140px" id="addon-active-${esc(a.code)}"><option value="true" ${a.active?'selected':''}>Sim</option><option value="false" ${!a.active?'selected':''}>Não</option></select></td><td><button class="btn btn-s" type="button" onclick="salvarPrecoAddon('${esc(a.code)}')">Salvar</button></td></tr>`).join('')||'<tr><td colspan="4">Nenhuma ferramenta avulsa no catálogo.</td></tr>'}
async function salvarPrecoAddon(code){
  const priceCents=Math.round(dinheiro(qs('#addon-price-'+code).value)*100),active=qs('#addon-active-'+code).value==='true';
  try{await api('/api/master/addons/'+encodeURIComponent(code),{method:'PUT',body:JSON.stringify({priceCents,active})});await carregarMaster();alert('Preço da ferramenta avulsa salvo.')}catch(error){alert(error.message)}
}
async function excluirPlanoMaster(code,name){
  if(!await titanConfirm(`Excluir o plano "${name}"? Só funciona se nenhuma empresa estiver usando esse plano no momento — troque o plano das empresas antes, em Gestão por CNPJ.`,'Excluir plano','err'))return;
  try{await api('/api/master/plans/'+encodeURIComponent(code),{method:'DELETE'});await carregarMaster()}catch(error){alert(error.message)}
}
async function carregarPlanUpgradeRequests(){
  const box=qs('#master-plan-upgrade-requests');if(!box)return;
  try{
    const pedidos=await api('/api/master/plan-upgrade-requests');
    box.innerHTML=pedidos.map(p=>`<tr><td><b>${esc(p.company_name)}</b><br><span class="mono">${esc(formatarCnpj(p.federal_tax_id||''))}</span></td><td>${esc(p.current_plan_name||p.current_plan_code)}</td><td>${esc(p.requested_plan_name||p.requested_plan_code)}</td><td>${esc(p.note||'—')}</td><td>${formatarDataNovidade(p.created_at)}</td><td><div class="acts"><button class="btn btn-p" onclick="aprovarUpgradePlano('${p.id}')">Aprovar</button><button class="btn btn-s" onclick="recusarUpgradePlano('${p.id}')">Recusar</button></div></td></tr>`).join('')||'<tr><td colspan="6" class="empty-state">Nenhum pedido de upgrade pendente.</td></tr>';
  }catch(error){box.innerHTML=`<tr><td colspan="6"><div class="empty-state">${esc(error.message)}</div></td></tr>`}
}
async function aprovarUpgradePlano(id){
  if(!await titanConfirm('Aprovar este pedido troca o plano da empresa imediatamente e avisa a empresa no sino. Confirma?','Aprovar upgrade'))return;
  try{await api('/api/master/plan-upgrade-requests/'+id+'/approve',{method:'POST'});await carregarMaster()}catch(error){alert(error.message)}
}
async function recusarUpgradePlano(id){
  const reviewNote=await titanPrompt('Motivo da recusa (opcional — a empresa vê esta mensagem no sino):','','Recusar pedido de upgrade');
  if(reviewNote===null)return;
  try{await api('/api/master/plan-upgrade-requests/'+id+'/reject',{method:'POST',body:JSON.stringify({reviewNote:reviewNote||undefined})});await carregarMaster()}catch(error){alert(error.message)}
}

let contractVersionsHistorico=[];
async function carregarContratoMaster(){
  const box=qs('#contract-versions-history');if(!box)return;
  try{
    contractVersionsHistorico=await api('/api/master/contract-versions');
    const atual=contractVersionsHistorico[0];
    qs('#contract-current-pill').textContent=atual?('v'+atual.major+'.'+atual.minor):'—';
    if(atual&&!qs('#contract-body').dataset.dirty)qs('#contract-body').value=atual.body;
    box.innerHTML=contractVersionsHistorico.map(v=>`<tr><td><b>v${v.major}.${v.minor}</b></td><td>${formatarDataNovidade(v.created_at)}</td><td>${esc(v.created_by_name||'—')}</td><td>${v.acceptances_count}</td></tr>`).join('')||'<tr><td colspan="4" class="empty-state">Nenhuma versão publicada.</td></tr>';
  }catch(error){box.innerHTML=`<tr><td colspan="4"><div class="empty-state">${esc(error.message)}</div></td></tr>`}
}
async function publicarVersaoContrato(bump){
  const body=qs('#contract-body').value.trim();
  if(body.length<20){alert('O texto do contrato precisa ter conteúdo suficiente.');return}
  const atual=contractVersionsHistorico[0];
  const proxima=atual?(bump==='major'?(atual.major+1)+'.0':atual.major+'.'+(atual.minor+1)):'1.0';
  if(!await titanConfirm(`Publicar a versão ${proxima}? Todas as empresas serão avisadas no sino e precisarão aceitar de novo para continuar usando o sistema.`,'Publicar contrato'))return;
  try{
    await api('/api/master/contract-versions',{method:'POST',body:JSON.stringify({body,bump})});
    delete qs('#contract-body').dataset.dirty;
    await carregarContratoMaster();
    alert('Versão '+proxima+' publicada. As empresas foram avisadas no sino.');
  }catch(error){alert(error.message)}
}
let masterNewLookup=null,masterEditingPlanCode='';
function abrirNovoCliente(){qs('#master-client-modal').classList.add('on');qs('#master-new-cnpj').focus();}
function fecharNovoCliente(){qs('#master-client-modal').classList.remove('on');masterNewLookup=null;qs('#master-new-cnpj').value='';qs('#master-new-email').value='';qs('#master-new-zap').value='';qs('#master-new-company').style.display='none';qs('#master-new-link').style.display='none';qs('#master-new-cnpj-status').textContent=''}
async function consultarNovoClienteCnpj(){const input=qs('#master-new-cnpj'),cnpj=normalizarDocumento(input.value);const status=qs('#master-new-cnpj-status'),box=qs('#master-new-company');if(!cnpjComFormatoValido(cnpj)){status.textContent='Informe um CNPJ com 14 caracteres válidos.';return}status.textContent='Consultando CNPJ e situação cadastral...';masterNewLookup=null;try{const data=await api('/api/master/cnpj/'+cnpj);masterNewLookup=data;box.style.display='block';box.innerHTML=`<b>${esc(data.legalName)}</b>${data.tradeName?` · ${esc(data.tradeName)}`:''}<br><span class="mono">${esc(formatarCnpj(data.federalTaxId))}</span> · ${esc(data.municipalityName||'Município não informado')} / ${esc(data.state||'—')}<br><span class="pill ${data.active?'p-ok':'p-err'}">${esc(data.status||'')}</span> · Regime sugerido: ${esc(data.regime)}`;status.textContent=data.active?'CNPJ ativo. Confira os dados antes de gerar o convite.':'CNPJ não está ativo.'}catch(error){status.textContent=error.message;box.style.display='none'}}
async function criarConviteNovoCliente(){const email=qs('#master-new-email').value.trim(),planCode=qs('#master-new-plan').value,whatsappPhone=qs('#master-new-zap').value.trim();if(!masterNewLookup?.active){alert('Consulte um CNPJ ativo antes de gerar o convite.');return}if(!email||!planCode){alert('Informe e-mail e plano.');return}try{const result=await api('/api/master/invitations',{method:'POST',body:JSON.stringify({federalTaxId:masterNewLookup.federalTaxId,email,planCode,whatsappPhone:whatsappPhone||undefined})});const token=new URL(result.invitePath,location.origin).searchParams.get('invite'),link=new URL('/dashboard',location.origin);if(token)link.searchParams.set('invite',token);const box=qs('#master-new-link');box.style.display='block';box.innerHTML=`<b>Link pronto para envio</b><br><span id="master-new-link-value">${esc(link.href)}</span><br><button class="btn btn-s" style="margin-top:8px" onclick="copiarTextoSeguro(qs('#master-new-link-value').textContent,this)">Copiar link</button>`;await carregarMaster()}catch(error){alert(error.message)}}
let masterEditingPartnerId='';
async function salvarParceiroMaster(){
  const name=qs('#partner-name').value.trim(),nickname=qs('#partner-nickname').value.trim(),email=qs('#partner-email').value.trim(),federalTaxId=normalizarDocumento(qs('#partner-cnpj').value.trim()),commissionPercent=dinheiro(qs('#partner-commission').value);
  if(name.length<2||nickname.length<2){alert('Informe nome e apelido do parceiro.');return}
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert('Informe um e-mail válido, ou deixe em branco.');return}
  if(commissionPercent<0||commissionPercent>100){alert('A comissão precisa estar entre 0 e 100%.');return}
  const active=masterEditingPartnerId?qs('#partner-id').dataset.active!=='false':true;
  try{
    await api('/api/master/partners'+(masterEditingPartnerId?'/'+masterEditingPartnerId:''),{method:masterEditingPartnerId?'PUT':'POST',body:JSON.stringify({name,nickname,email,federalTaxId,active,commissionPercent})});
    cancelarEdicaoParceiroMaster();
    await carregarMaster();
  }catch(error){alert(error.message)}
}
function editarParceiroMaster(id){
  const partner=masterData?.partners.find(item=>item.id===id);if(!partner)return;
  masterEditingPartnerId=id;
  qs('#partner-id').value=id;qs('#partner-id').dataset.active=String(partner.active!==false);
  qs('#partner-name').value=partner.name;qs('#partner-nickname').value=partner.nickname;qs('#partner-email').value=partner.email||'';
  qs('#partner-cnpj').value=partner.federal_tax_id?formatarCnpj(partner.federal_tax_id):'';
  qs('#partner-commission').value=String(Number(partner.commission_percent||0)).replace('.',',');
  qs('#partner-save').textContent='Salvar alterações';qs('#partner-cancel').style.display='inline-flex';
  masterTab('parceiros');
}
function cancelarEdicaoParceiroMaster(){
  masterEditingPartnerId='';
  qs('#partner-id').value='';qs('#partner-id').dataset.active='';
  qs('#partner-name').value='';qs('#partner-nickname').value='';qs('#partner-email').value='';qs('#partner-cnpj').value='';qs('#partner-commission').value='';
  qs('#partner-save').textContent='Cadastrar parceiro';qs('#partner-cancel').style.display='none';
}
async function alternarStatusParceiroMaster(id){
  const partner=masterData?.partners.find(item=>item.id===id);if(!partner)return;
  const novoAtivo=!partner.active;
  if(!novoAtivo&&!await titanConfirm(`O parceiro "${partner.nickname}" será suspenso. Usuários já vinculados continuam vinculados a ele; você pode reativar quando quiser.`,'Suspender parceiro','err'))return;
  try{
    await api('/api/master/partners/'+id,{method:'PUT',body:JSON.stringify({name:partner.name,nickname:partner.nickname,active:novoAtivo,commissionPercent:Number(partner.commission_percent||0)})});
    await carregarMaster();
  }catch(error){alert(error.message)}
}
async function vincularUsuarioParceiro(userId,partnerId,previous){try{if(partnerId)await api('/api/master/partners/'+partnerId+'/users/'+userId,{method:'PUT'});else if(previous)await api('/api/master/partners/'+previous+'/users/'+userId,{method:'DELETE'});await carregarMaster()}catch(error){alert(error.message);await carregarMaster()}}
async function salvarPlanoMaster(){
  const code=qs('#plan-code').value.trim().toLowerCase(),name=qs('#plan-name').value.trim(),priceCents=Math.round(dinheiro(qs('#plan-price').value)*100),monthlyLimit=Number(qs('#plan-limit').value),description=qs('#plan-description').value.trim(),active=qs('#plan-active').value==='true',features=lerPlanFeatures();
  if(!code||!name||priceCents<0||monthlyLimit<1){alert('Preencha código, nome, preço e limite do plano.');return}
  const trocouCodigo=masterEditingPlanCode&&code!==masterEditingPlanCode;
  if(trocouCodigo&&!await titanConfirm(`Isso muda o código de "${masterEditingPlanCode}" para "${code}" em todo lugar — inclusive nas empresas e perfis de acesso que já usam esse plano. Confirma?`,'Trocar código do plano','warn'))return;
  const payload={name,priceCents,monthlyLimit,description,active,features,...(trocouCodigo?{newCode:code}:{})};
  try{await api('/api/master/plans'+(masterEditingPlanCode?'/'+masterEditingPlanCode:''),{method:masterEditingPlanCode?'PUT':'POST',body:JSON.stringify(masterEditingPlanCode?payload:{code,...payload})});cancelarEdicaoPlanoMaster();await carregarMaster()}catch(error){alert(error.message)}
}
function editarPlanoMaster(code){const plan=masterData?.plans.find(item=>item.code===code);if(!plan)return;masterEditingPlanCode=code;qs('#plan-code').value=plan.code;qs('#plan-code').disabled=false;qs('#plan-name').value=plan.name;qs('#plan-price').value=String(Number(plan.price_cents)/100).replace('.',',');qs('#plan-limit').value=plan.monthly_limit;qs('#plan-description').value=plan.description||'';qs('#plan-active').value=String(plan.active!==false);renderPlanFeatures(featuresDoPlano(plan));qs('#plan-cancel').style.display='inline-flex';masterTab('planos');}
function cancelarEdicaoPlanoMaster(){masterEditingPlanCode='';qs('#plan-code').disabled=false;qs('#plan-code').value='';qs('#plan-name').value='';qs('#plan-price').value='';qs('#plan-limit').value='';qs('#plan-description').value='';qs('#plan-active').value='true';renderPlanFeatures([]);qs('#plan-cancel').style.display='none';}
async function abrirDetalhesCliente(companyId){try{const data=await api('/api/master/companies/'+companyId),consumption=await api('/api/master/companies/'+companyId+'/consumption');qs('#master-detail-company-id').value=companyId;qs('#master-company-subtitle').textContent=`${data.legal_name} · ${formatarCnpj(data.federal_tax_id)}`;const user=usuarioPrincipalCnpj(companyId),userSection=qs('#master-detail-user-section');const resetBtn=qs('#master-detail-reset-btn');if(user&&user.access_origin!=='pending'){userSection.style.display='';qs('#master-detail-user-id').value=user.id;qs('#master-detail-user-name').value=user.name||'';qs('#master-detail-user-email').value=user.email||'';resetBtn.style.display='inline-flex';const partnerLoginSelect=qs('#master-detail-user-partner-login');partnerLoginSelect.innerHTML='<option value="">Não é parceiro</option>'+(masterData?.partners||[]).map(p=>`<option value="${p.id}">${esc(p.nickname)}</option>`).join('');partnerLoginSelect.value=user.partner_id||'';partnerLoginSelect.dataset.original=user.partner_id||''}else{userSection.style.display='none';qs('#master-detail-user-id').value='';resetBtn.style.display='none'}qs('#master-detail-legal-name').value=data.legal_name||'';qs('#master-detail-trade-name').value=data.trade_name||'';qs('#master-detail-email').value=data.contact_email||'';qs('#master-detail-whatsapp').value=data.whatsapp_phone||'';const planSelect=qs('#master-detail-plan');planSelect.innerHTML=(masterData?.plans||[]).map(p=>`<option value="${esc(p.code)}">${esc(p.name)} — ${brl(Number(p.price_cents)/100)}/mês</option>`).join('');planSelect.value=data.plan_code||'';qs('#master-detail-emission').value=String(Boolean(data.emission_enabled));qs('#master-detail-emission').dataset.original=String(Boolean(data.emission_enabled));qs('#master-detail-implementation').value=data.implementation_status||'self_service';qs('#master-detail-fee').value=String(Number(data.implementation_fee_cents||0)/100).replace('.',',');qs('#master-detail-environment').value=data.environment_override||'';qs('#master-detail-notes').value=data.implementation_notes||'';const partnerSelect=qs('#master-detail-partner');partnerSelect.innerHTML='<option value="">Cliente direto</option>'+(masterData?.partners||[]).map(p=>`<option value="${p.id}">${esc(p.nickname)}</option>`).join('');partnerSelect.value=data.partner_id||'';qs('#master-detail-consumption').textContent=`Consumo do mês: ${consumption.used} de ${consumption.limit||'—'} notas autorizadas · ${consumption.remaining===null?'limite não configurado':`${consumption.remaining} restantes`}`;const importSelect=qs('#master-detail-import-customer');importSelect.innerHTML='<option value="">Selecione uma empresa da plataforma</option>'+(masterData?.companies||[]).filter(item=>item.id!==companyId).map(item=>`<option value="${item.id}">${esc(item.trade_name||item.legal_name)} · ${esc(formatarCnpj(item.federal_tax_id))}</option>`).join('');const featuresDoPlanoAtual=featuresDoPlano((masterData?.plans||[]).find(p=>p.code===data.plan_code));const addonsAtivos=data.addons||[];qs('#master-detail-addons').innerHTML=(masterData?.addons||[]).map(a=>{const incluido=featuresDoPlanoAtual.includes(a.code);const ativo=incluido||addonsAtivos.includes(a.code);return `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" ${ativo?'checked':''} ${incluido?'disabled':''} onchange="alternarAddonCliente('${companyId}','${a.code}',this.checked,this)"><span>${esc(a.name)} ${incluido?'<span class="pill p-ok">Incluído no plano</span>':`<span class="pill p-gold">R$ ${brl(Number(a.priceCents||0)/100)}/mês</span>`}</span></label>`}).join('')||'<div class="hint">Nenhuma ferramenta avulsa cadastrada em Planos.</div>';qs('#master-company-modal').classList.add('on')}catch(error){alert(error.message)}}
async function alternarAddonCliente(companyId,featureCode,enabled,checkbox){
  checkbox.disabled=true;
  try{await api('/api/master/companies/'+companyId+'/addons/'+encodeURIComponent(featureCode),{method:'PUT',body:JSON.stringify({enabled})})}
  catch(error){checkbox.checked=!enabled;alert(error.message)}
  finally{checkbox.disabled=false}
}
async function importarClientePlataforma(){
  const destinoId=qs('#master-detail-company-id').value,select=qs('#master-detail-import-customer'),origemId=select.value;
  if(!origemId){alert('Escolha uma empresa da plataforma pra importar como cliente.');return}
  try{const cliente=await api('/api/master/companies/'+destinoId+'/import-platform-customer',{method:'POST',body:JSON.stringify({platformCompanyId:origemId})});alert(`"${cliente.legal_name}" adicionado(a) como cliente desta empresa.`);select.value=''}catch(error){alert(error.message)}
}
function fecharDetalhesCliente(){qs('#master-company-modal').classList.remove('on')}
async function salvarDetalhesCliente(){
  const id=qs('#master-detail-company-id').value,emissionField=qs('#master-detail-emission'),novaEmissao=emissionField.value==='true';
  if(emissionField.dataset.original==='true'&&!novaEmissao){
    const nome=qs('#master-company-subtitle')?.textContent||'esta empresa';
    if(!await titanConfirm(`A emissão de NFS-e de ${nome} será suspensa para todos os usuários da empresa. Ninguém vai conseguir emitir nota até você liberar de novo.`,'Suspender emissão da empresa','err'))return;
  }
  const userId=qs('#master-detail-user-id').value;
  if(userId){
    const userName=qs('#master-detail-user-name').value.trim(),userEmail=qs('#master-detail-user-email').value.trim();
    if(userName.length<2||!userEmail){alert('Informe nome e e-mail do usuário.');return}
  }
  try{
    const chamadas=[api('/api/master/companies/'+id,{method:'PUT',body:JSON.stringify({emissionEnabled:novaEmissao,implementationStatus:qs('#master-detail-implementation').value,implementationFeeCents:Math.round(dinheiro(qs('#master-detail-fee').value)*100),implementationNotes:qs('#master-detail-notes').value.trim(),partnerId:qs('#master-detail-partner').value||null,environmentOverride:qs('#master-detail-environment').value||null,planCode:qs('#master-detail-plan').value||undefined,legalName:qs('#master-detail-legal-name').value.trim()||undefined,tradeName:qs('#master-detail-trade-name').value.trim()||null,contactEmail:qs('#master-detail-email').value.trim()||undefined,whatsappPhone:qs('#master-detail-whatsapp').value.trim()||null})})];
    if(userId)chamadas.push(api('/api/master/users/'+userId,{method:'PUT',body:JSON.stringify({companyId:id,name:qs('#master-detail-user-name').value.trim(),email:qs('#master-detail-user-email').value.trim()})}));
    const partnerLoginSelect=qs('#master-detail-user-partner-login');
    if(userId&&partnerLoginSelect&&partnerLoginSelect.value!==(partnerLoginSelect.dataset.original||''))chamadas.push(api('/api/master/users/'+userId+'/partner-login',{method:'PUT',body:JSON.stringify({partnerId:partnerLoginSelect.value||null})}));
    await Promise.all(chamadas);
    fecharDetalhesCliente();await carregarMaster()
  }catch(error){alert(error.message)}
}
async function reativarEmpresaMaster(companyId){
  const empresa=masterData?.companies.find(item=>item.id===companyId);if(!empresa)return;
  const nome=empresa.trade_name||empresa.legal_name||'esta empresa';
  if(!await titanConfirm(`A emissão de NFS-e de ${nome} será liberada de novo para os usuários da empresa.`,'Reativar emissão','ok'))return;
  try{
    const data=await api('/api/master/companies/'+companyId,{method:'PUT',body:JSON.stringify({emissionEnabled:true,implementationStatus:empresa.implementation_status||'self_service',implementationFeeCents:Number(empresa.implementation_fee_cents||0),implementationNotes:empresa.implementation_notes||''})});
    // Reativar não muda usuários, perfis, convites, parceiros nem planos —
    // atualiza só o registro da empresa em memória, em vez de recarregar
    // /master/overview inteiro.
    Object.assign(empresa,data);
    configurarEmpresasAdmin(masterData.companies);
    renderMasterClients();
  }catch(error){alert(error.message)}
}

function prepararUsuarioPendente(companyId){
  const company=masterData?.companies.find(item=>item.id===companyId);if(!company){alert('CNPJ não encontrado na gestão.');return}
  abrirNovoCliente();
  const federalTaxId=normalizarDocumento(company.federal_tax_id);
  qs('#master-new-cnpj').value=formatarCnpj(federalTaxId);qs('#master-new-email').value=company.contact_email||'';qs('#master-new-zap').value=company.whatsapp_phone||'';
  if(company.plan_code&&qs('#master-new-plan'))qs('#master-new-plan').value=company.plan_code;
  masterNewLookup={active:true,federalTaxId,legalName:company.legal_name||company.trade_name||'',tradeName:company.trade_name||'',municipalityName:'Cadastro existente',state:'',regime:'sn'};
  const box=qs('#master-new-company'),status=qs('#master-new-cnpj-status');
  box.style.display='block';box.innerHTML=`<b>${esc(company.legal_name||company.trade_name||'Empresa cadastrada')}</b>${company.trade_name?` · ${esc(company.trade_name)}`:''}<br><span class="mono">${esc(formatarCnpj(federalTaxId))}</span><br><span class="pill p-warn">Sem usuário ativo</span> · Gere ou reenvie o convite deste CNPJ`;
  status.textContent='CNPJ já cadastrado. Revise e gere o link para o usuário responsável.';
}

let masterLogs=[];
function limparFiltrosLogsMaster(){
  ['master-log-from','master-log-to','master-log-actor','master-log-action'].forEach(id=>{const el=qs('#'+id);if(el)el.value=''});
  carregarMasterLogs();
}
async function carregarMasterLogs(){
  const box=qs('#master-logs');if(!box)return;
  box.innerHTML='<tr><td colspan="5">Carregando registros...</td></tr>';
  const params=new URLSearchParams();const from=qs('#master-log-from')?.value,to=qs('#master-log-to')?.value,actorEmail=qs('#master-log-actor')?.value.trim(),action=qs('#master-log-action')?.value.trim();
  if(from)params.set('from',from);if(to)params.set('to',to);if(actorEmail)params.set('actorEmail',actorEmail);if(action)params.set('action',action);params.set('limit','500');
  try{
    const result=await api('/api/master/logs?'+params.toString());masterLogs=result.logs||[];
    box.innerHTML=masterLogs.length?masterLogs.map(item=>`<tr><td class="mono">${esc(new Date(item.created_at).toLocaleString('pt-BR'))}</td><td>${esc(item.actor_email||'—')}</td><td><b>${esc(item.action)}</b></td><td>${esc(item.resource_type)}${item.resource_id?`<br><span class="mono">${esc(item.resource_id)}</span>`:''}</td><td><span class="mono">${esc(JSON.stringify(item.details||{}))}</span></td></tr>`).join(''):'<tr><td colspan="5">Nenhum registro no período.</td></tr>';
    const truncado=qs('#master-logs-truncated');if(truncado)truncado.style.display=result.truncated?'block':'none';if(truncado&&result.truncated)truncado.textContent=`Mostrando os ${masterLogs.length} registros mais recentes de ${result.total} no período — refine as datas pra ver os demais.`;
  }catch(error){box.innerHTML=`<tr><td colspan="5">${esc(error.message)}</td></tr>`}
}
function exportarMasterLogs(){
  if(!masterLogs.length){alert('Carregue os registros antes de exportar.');return}
  const header=['data','ator','acao','recurso','id','detalhes'];
  const rows=masterLogs.map(item=>[new Date(item.created_at).toISOString(),item.actor_email,item.action,item.resource_type,item.resource_id||'',JSON.stringify(item.details||{})]);
  // Campo iniciado por =,+,-,@ (ou tab/CR) vira fórmula quando o Excel/Sheets
  // abre o CSV — um valor gravado no log (ex.: dentro de "detalhes") viraria
  // código executado na planilha de quem exportou. O apóstrofo força texto puro.
  const csv=[header,...rows].map(row=>row.map(value=>{const text=String(value??'');return `"${(/^[=+\-@\t\r]/.test(text)?`'${text}`:text).replaceAll('"','""')}"`}).join(';')).join('\n');
  const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`titan-auditoria-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* \u2500\u2500 Inscri\u00e7\u00f5es: pr\u00e9-cadastro da landing page (POST /api/contact) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
const MASTER_INSCRICAO_STATUS={pre_approved:['Pr\u00e9-aprovado','pill p-ok'],needs_review:['Revis\u00e3o manual','pill p-warn'],contacted:['Contatado','pill p-gold'],dismissed:['Descartado','pill p-off']};
function regimeLabelInscricao(item){
  if(item.simples_nacional)return 'Simples Nacional';
  if(item.mei)return 'MEI';
  if(item.regime_status==='CONFIRMED_INELIGIBLE')return 'Fora do Simples/MEI';
  if(item.regime_status==='UNAVAILABLE')return 'Consulta indispon\u00edvel';
  return '\u2014';
}
async function carregarMasterInscricoes(){
  const box=qs('#master-inscricoes');if(!box)return;
  box.innerHTML='<tr><td colspan="6">Carregando pr\u00e9-inscri\u00e7\u00f5es...</td></tr>';
  const params=new URLSearchParams();
  const search=qs('#master-inscricoes-search')?.value.trim(),status=qs('#master-inscricoes-status')?.value;
  if(search)params.set('search',search);if(status)params.set('status',status);params.set('limit','200');
  try{
    const result=await api('/api/master/inscricoes?'+params.toString());
    const items=result.inscricoes||[];
    const summary=qs('#master-inscricoes-summary');if(summary)summary.textContent=`${result.total} pr\u00e9-inscri\u00e7${result.total===1?'\u00e3o':'\u00f5es'} no total.`;
    box.innerHTML=items.length?items.map(item=>{
      const [statusLabel,statusClass]=MASTER_INSCRICAO_STATUS[item.status]||[item.status,'pill p-off'];
      return `<tr>
        <td><b>${esc(item.company)}</b><br><span class="mono">${esc(item.federal_tax_id||'\u2014')}</span>${item.plan_code?`<br><span class="pill p-off" style="margin-top:4px">Quer: ${esc(item.plan_code==='personalizado'?'Personalizado':item.plan_code)}</span>`:''}</td>
        <td>${esc(item.name)}<br>${esc(item.email)}<br>${esc(item.phone)}</td>
        <td>${esc(regimeLabelInscricao(item))}</td>
        <td><span class="${statusClass}">${esc(statusLabel)}</span></td>
        <td class="mono">${esc(new Date(item.created_at).toLocaleString('pt-BR'))}</td>
        <td class="acts">${item.status!=='contacted'?`<button class="btn btn-s" type="button" onclick="moverStatusInscricao('${item.id}','contacted')">Marcar contatado</button>`:''}${item.status!=='dismissed'?`<button class="btn btn-s" type="button" onclick="moverStatusInscricao('${item.id}','dismissed')">Descartar</button>`:''}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="6">Nenhuma pr\u00e9-inscri\u00e7\u00e3o encontrada.</td></tr>';
    const truncado=qs('#master-inscricoes-truncated');if(truncado)truncado.style.display=result.truncated?'block':'none';if(truncado&&result.truncated)truncado.textContent=`Mostrando as ${items.length} mais recentes de ${result.total} \u2014 refine a busca pra ver as demais.`;
  }catch(error){box.innerHTML=`<tr><td colspan="6">${esc(error.message)}</td></tr>`}
}
async function moverStatusInscricao(id,status){
  try{await api('/api/master/inscricoes/'+id+'/status',{method:'PUT',body:JSON.stringify({status})});carregarMasterInscricoes()}catch(error){alert(error.message)}
}

// Achado 15/08/2026 (checagem de prontidão pra lançamento): a tela "Perfis"
// (novoPerfilAcesso/salvarPerfilAcesso/editarPerfilAcesso/etc., removida
// aqui) não tinha link em nenhum menu — órfã — e mesmo se alguém chegasse
// nela, requireCompany() (access/middleware.ts) já ignora perfil desde a
// descontinuação de 12/08/2026: todo vínculo ativo recebe acesso total ao
// que o plano permitir. Risco real: admin achar que restringiu alguém e não
// ter restringido nada. Removida a UI inteira, não só desconectada — ver
// commit desta correção.

async function salvarAcesso(userId,companyId,active){
  // Perfis de acesso granulares foram descontinuados (12/08/2026): Liberar/
  // Suspender não escolhe mais perfil — o acesso do Cliente é tudo-ou-nada,
  // limitado só pelo plano da empresa.
  const user=masterData?.users.find(item=>item.id===userId&&item.company_id===companyId);
  const message=`${active?'Liberar acesso':'Suspender acesso'} para ${user?.name||userId} em ${user?.legal_name||companyId}?`;
  if(!await titanConfirm(message,'Alterar acesso do usuário','warn'))return;
  try{
    const data=await api('/api/master/users/'+userId+'/access',{method:'PUT',body:JSON.stringify({companyId,active})});
    // Suspender/liberar acesso é o fluxo mais comum da tela — atualiza só o
    // usuário afetado em memória e re-renderiza a tabela, em vez de recarregar
    // /master/overview inteiro (empresas+usuários+perfis+convites+parceiros+planos)
    // por causa de uma única linha.
    const alvo=masterData?.users.find(item=>item.id===userId&&item.company_id===companyId);
    if(alvo)alvo.access_active=data.active;
    renderMasterClients();
  }catch(error){alert(error.message)}
}
async function gerarRedefinicaoSenha(userId,companyId){
  if(!await titanConfirm('Um link de redefinição de senha será gerado. Qualquer pessoa que abrir esse link poderá definir uma nova senha para este usuário — compartilhe só com quem deve receber.','Gerar link de redefinição de senha'))return;
  try{
    const result=await api('/api/master/users/'+userId+'/password-reset',{method:'POST',body:JSON.stringify({companyId})});
    const link=new URL(result.resetPath,location.origin).href;
    mostrarLinkRedefinicao(link,result.expiresInMinutes);
    await copiarTextoSeguro(link,qs('#master-reset-copy'));
  }catch(error){alert(error.message)}
}
function mostrarLinkRedefinicao(link,minutes){
  const box=qs('#master-reset-link-panel');if(!box)return;
  box.style.display='block';
  box.innerHTML=`<b>Link de redefinição gerado</b><br><span>Válido por ${minutes} minutos. O usuário define a nova senha e depois entra direto com e-mail ou CNPJ, sem abrir o perfil Master.</span><textarea id="master-reset-link-value" class="inp mono" rows="2" readonly style="margin-top:8px">${esc(link)}</textarea><div class="acts" style="margin-top:8px"><button id="master-reset-copy" class="btn btn-s" type="button" onclick="copiarTextoSeguro(qs('#master-reset-link-value').value,this)">Copiar link</button><a class="btn btn-s" href="${esc(link)}" target="_blank" rel="noopener">Abrir redefinição</a></div><div id="master-reset-copy-hint" class="hint">O link também ficou selecionável no campo acima.</div>`;
  const field=qs('#master-reset-link-value');if(field){field.focus();field.select();}
}
async function copiarTextoSeguro(value,button){
  try{
    await navigator.clipboard.writeText(value);
    if(button){const original=button.textContent;button.textContent='Copiado';window.setTimeout(()=>button.textContent=original,1400)}
    const hint=qs('#master-reset-copy-hint');if(hint)hint.textContent='Link copiado para a área de transferência.';
  }catch{
    const field=qs('#master-reset-link-value');if(field){field.focus();field.select();}
    const hint=qs('#master-reset-copy-hint');if(hint)hint.textContent='Copie manualmente pelo campo acima; o navegador bloqueou a cópia automática.';
  }
}

async function prepararConvite(){
  const token=new URLSearchParams(location.search).get('invite');
  if(!token)return;
  try{
    const invite=await api('/api/auth/invitations/'+encodeURIComponent(token));
    qs('.onboard-step').textContent='Convite de acesso';
    qs('.login-h').textContent='Criar sua senha';
    qs('.login-sub').textContent=`Você foi convidado para ${invite.trade_name||invite.legal_name} · CNPJ ${invite.federal_tax_id}.`;
    qs('#li-mail').value=invite.email;qs('#li-mail').closest('.login-field').style.display='none';
    qs('#li-pw').placeholder='Crie sua senha';qs('#li-pw').autocomplete='new-password';
    const senhaLabel=qs('label[for="li-pw"]');if(senhaLabel)senhaLabel.textContent='Crie sua senha';
    const confirmWrap=qs('#li-reset-confirm-wrap');if(confirmWrap)confirmWrap.style.display='block';
    const confirm=qs('#li-pw-confirm');if(confirm){confirm.value='';confirm.placeholder='Confirme sua senha';confirm.autocomplete='new-password'}
    const confirmLabel=qs('label[for="li-pw-confirm"]');if(confirmLabel)confirmLabel.textContent='Confirme sua senha';
    const campo=qs('#li-cnpj');
    if(campo){campo.closest('.login-field').style.display='none';campo.value=invite.federal_tax_id||'';}
    const button=qs('#login-action');button.textContent='Aceitar convite e entrar';button.onclick=()=>aceitarConvite(token);
  }catch(error){qs('.login-sub').textContent=error.message;qs('#login-action').disabled=true}
}

async function aceitarConvite(token){
  const password=qs('#li-pw').value,confirmation=qs('#li-pw-confirm').value;
  if(password.length<10||confirmation.length<10){alert('Crie sua senha e confirme com pelo menos 10 caracteres.');return}
  if(password!==confirmation){alert('A confirmação não confere. Digite a mesma senha nos dois campos.');return}
  try{
    const accepted=await api('/api/auth/invitations/'+encodeURIComponent(token)+'/accept',{method:'POST',body:JSON.stringify({password,confirmation})});
    salvarSessaoLocal([[STORAGE_TOKEN,accepted.token],[STORAGE_COMPANY_ID,accepted.companyId],[STORAGE_SESSION,JSON.stringify({user:accepted.user,companies:accepted.companies||[]})]]);
    localStorage.setItem(STORAGE_USUARIO,JSON.stringify({nome:accepted.user.name,email:accepted.user.email,cnpj:accepted.companies?.[0]?.federal_tax_id||PORTAL_CNPJ}));history.replaceState({},'',location.pathname);
    await carregarEmpresaServidor();await carregarNotasServidor();aplicarAcesso({user:accepted.user,companies:accepted.companies});qs('#login').classList.add('hide');qs('#app').classList.add('on');carregarEstado();render();PORTAL_HELP?(go('ajuda',qs('.user-sidebar .sb-link[onclick*="ajuda"]')),setTimeout(()=>supOpen(),80)):go('painel',qs('.sb-link[onclick*="painel"]'));
  }catch(error){alert(error.message)}
}

// Convite dedicado do Portal do Parceiro (16/08/2026) — mesma UI do convite
// de cliente acima (reaproveita o card de login), só que ao aceitar entra
// direto no Portal do Parceiro (/parceiro), não no dashboard do cliente:
// sessão de parceiro não tem empresas nem certificado, é outro produto.
async function prepararConviteParceiro(){
  const token=new URLSearchParams(location.search).get('partner-invite');
  if(!token)return;
  try{
    const invite=await api('/api/auth/partner-invitations/'+encodeURIComponent(token));
    qs('.onboard-step').textContent='Convite de acesso';
    qs('.login-h').textContent='Criar sua senha de parceiro';
    qs('.login-sub').textContent=`Você foi convidado para o Portal do Parceiro TITAN NFS-e (${invite.partnerName}).`;
    qs('#li-mail').value=invite.email;qs('#li-mail').closest('.login-field').style.display='none';
    qs('#li-pw').placeholder='Crie sua senha';qs('#li-pw').autocomplete='new-password';
    const senhaLabel=qs('label[for="li-pw"]');if(senhaLabel)senhaLabel.textContent='Crie sua senha';
    const confirmWrap=qs('#li-reset-confirm-wrap');if(confirmWrap)confirmWrap.style.display='block';
    const confirm=qs('#li-pw-confirm');if(confirm){confirm.value='';confirm.placeholder='Confirme sua senha';confirm.autocomplete='new-password'}
    const confirmLabel=qs('label[for="li-pw-confirm"]');if(confirmLabel)confirmLabel.textContent='Confirme sua senha';
    const campo=qs('#li-cnpj');if(campo)campo.closest('.login-field').style.display='none';
    const button=qs('#login-action');button.textContent='Aceitar convite e entrar';button.onclick=()=>aceitarConviteParceiro(token);
  }catch(error){qs('.login-sub').textContent=error.message;qs('#login-action').disabled=true}
}
async function aceitarConviteParceiro(token){
  const password=qs('#li-pw').value,confirmation=qs('#li-pw-confirm').value;
  if(password.length<10||confirmation.length<10){alert('Crie sua senha e confirme com pelo menos 10 caracteres.');return}
  if(password!==confirmation){alert('A confirmação não confere. Digite a mesma senha nos dois campos.');return}
  try{
    const accepted=await api('/api/auth/partner-invitations/'+encodeURIComponent(token)+'/accept',{method:'POST',body:JSON.stringify({password,confirmation})});
    salvarSessaoLocal([[STORAGE_TOKEN,accepted.token],[STORAGE_SESSION,JSON.stringify({user:accepted.user,companies:[]})]]);
    window.top.location.href='/parceiro';
  }catch(error){alert(error.message)}
}

async function prepararRedefinicao(token){
  qs('#login').classList.add('hide');qs('#reset-screen').classList.add('on');
  const action=qs('#reset-action'),hint=qs('#reset-hint'),account=qs('#reset-account'),password=qs('#reset-password'),confirmation=qs('#reset-password-confirm');
  const normalizedToken=String(token||'').trim().replace(/^['"]|['"]$/g,'');
  if(!normalizedToken){account.textContent='Link temporário necessário';hint.textContent='A tela foi aberta sem o token de segurança. No Master, acesse Usuários > Redefinir senha e abra o link gerado para esta conta.';hint.classList.add('error');action.style.display='none';password.closest('.reset-field').style.display='none';confirmation.closest('.reset-field').style.display='none';return}
  removerParametroSensivel('token');
  try{
    const info=await api('/api/auth/password-resets/'+encodeURIComponent(normalizedToken));
    account.innerHTML=`<b>CNPJ da empresa:</b> ${esc(formatarCnpj(info.federalTaxId||''))}<br><b>Empresa:</b> ${esc(info.tradeName||info.legalName||'Empresa TITAN')}<br><b>Usuário autorizado:</b> ${esc(info.userName||'Operador')}`;
    hint.textContent='Acesso temporário de uso único para esta empresa. Defina uma senha individual com pelo menos 10 caracteres e depois entre pelo CNPJ.';password.disabled=false;confirmation.disabled=false;action.disabled=false;action.onclick=()=>confirmarRedefinicao(normalizedToken);password.focus();
  }catch(error){account.textContent='Não foi possível validar este link.';hint.textContent=error.message;hint.classList.add('error');action.disabled=true}
}
async function confirmarRedefinicao(token){
  const password=qs('#reset-password').value,confirmation=qs('#reset-password-confirm').value,hint=qs('#reset-hint'),action=qs('#reset-action');
  hint.classList.remove('error','ok');
  if(password.length<10){hint.textContent='A nova senha precisa ter pelo menos 10 caracteres.';hint.classList.add('error');return}
  if(password!==confirmation){hint.textContent='A confirmação não confere. Digite a mesma senha nos dois campos.';hint.classList.add('error');return}
  action.disabled=true;action.textContent='Salvando...';
  try{await api('/api/auth/password-resets/'+encodeURIComponent(token)+'/confirm',{method:'POST',body:JSON.stringify({password,confirmation})});hint.textContent='Senha definida com sucesso. Redirecionando para o login...';hint.classList.add('ok');window.setTimeout(()=>window.top.location.href='/?login=client',700)}catch(error){hint.textContent=error.message;hint.classList.add('error');action.disabled=false;action.textContent='Definir senha'}
}
function alternarSenha(id,button){const input=qs('#'+id);if(!input)return;const visible=input.type==='password';input.type=visible?'text':'password';button.setAttribute('aria-pressed',String(visible));button.setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha')}
['reset-password','reset-password-confirm'].forEach(id=>qs('#'+id)?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!qs('#reset-action')?.disabled){e.preventDefault();qs('#reset-action').click()}}));

function carregarEstado(){
  try{empresaAtual=JSON.parse(localStorage.getItem(STORAGE_EMPRESA)||'null')}catch{empresaAtual=null}
  try{
    const usuario=JSON.parse(localStorage.getItem(STORAGE_USUARIO)||'null');
    if(usuario){const c=qs('#li-cnpj');if(c){c.value=usuario.cnpj||'';mascararCnpjLogin(c);}qs('#li-mail').value=usuario.email||'';}
  }catch{}
  aplicarEmpresa();
}

function lerHandoffGestor(){
  try{const encoded=new URLSearchParams(location.hash.slice(1)).get('handoff');if(!encoded)return null;const binary=atob(encoded),bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}catch{return null}
}
async function entrarViaGestor(data){
  try{
    if(!data?.token||!data?.companyId||!data?.companies?.length)throw new Error('Acesso temporário inválido.');
    // Sessão de 20 minutos aberta pelo Master (impersonatedBy no token) —
    // guarda o nome da empresa só para a faixa de aviso; nada de decisão de
    // acesso depende disso, é puramente visual.
    salvarSessaoLocal([[STORAGE_TOKEN,data.token],[STORAGE_COMPANY_ID,data.companyId],[STORAGE_SESSION,JSON.stringify({user:data.user||{},companies:data.companies||[]})],[STORAGE_IMPERSONATING,data.companies[0].trade_name||data.companies[0].legal_name||'empresa selecionada']]);
    localStorage.setItem(STORAGE_USUARIO,JSON.stringify({nome:data.user?.name||'Gestor TITAN',email:data.user?.email||'',cnpj:data.companies[0].federal_tax_id||''}));history.replaceState({},'',location.pathname+location.search);
    await carregarAmbiente();await carregarEmpresaServidor();await carregarNotasServidor();carregarServicos().catch(()=>{});
    qs('#login').classList.add('hide');qs('#app').classList.add('on');aplicarAcesso({user:data.user,companies:data.companies});carregarEstado();render();faixaImpersonacao();PORTAL_HELP?(go('ajuda',qs('.user-sidebar .sb-link[onclick*="ajuda"]')),setTimeout(()=>supOpen(),80)):go('painel',qs('.user-sidebar .sb-link[onclick*="painel"]'));
  }catch(error){alert(error.message)}
}

/* ---------- init ---------- */
function render(){
  contagem();chart();tabelas();renderDashboard();pipeReset();checarHabilitacao();lerParametros();
}
carregarEstado();
garantirBarreiraInicial();
render();
aplicarAcesso();
prepararConvite();
prepararConviteParceiro();
faixaImpersonacao();
const handoffGestor=lerHandoffGestor();if(handoffGestor)entrarViaGestor(handoffGestor);
const temConvite=!!new URLSearchParams(location.search).get('invite')||!!new URLSearchParams(location.search).get('partner-invite');
function ocultarCampoCnpjLogin(){qs('#li-cnpj')?.closest('.login-field')?.style.setProperty('display','none');}
function ocultarCampoEmailLogin(){qs('#li-mail')?.closest('.login-field')?.style.setProperty('display','none');}
if(PORTAL_FIRST&&!temConvite){
  qs('.login-h').textContent='Primeiro acesso';
  qs('.login-sub').textContent='Para definir sua senha, abra o convite enviado pelo gestor master. O link identifica a empresa e expira após o uso.';
  qs('#login-action').disabled=true;qs('#login-action').textContent='Aguardando convite';
  qs('#login-context-link').textContent='Voltar ao acesso do cliente';qs('#login-context-link').href='/?login=client';ocultarCampoEmailLogin();
}else if(PORTAL_RESET){prepararRedefinicao(PORTAL_QUERY.get('token'));}
else if(PORTAL_ADMIN){qs('.login-h').textContent='Administração TITAN';qs('.login-sub').textContent='Acesso exclusivo do gestor master — entre com e-mail e senha.';qs('#login-context-link').textContent='Sou cliente';qs('#login-context-link').href='/?login=client';if(!temConvite)ocultarCampoCnpjLogin();}
else if(!temConvite){ocultarCampoEmailLogin();qs('.login-sub').textContent='Entre com o CNPJ da empresa e sua senha individual exclusiva.';if(PORTAL_CNPJ){qs('#li-cnpj').value=formatarCnpj(PORTAL_CNPJ);qs('#li-cnpj').readOnly=true;qs('.login-sub').textContent=`Informe sua senha individual exclusiva para acessar o CNPJ ${formatarCnpj(PORTAL_CNPJ)}.`;}}
entrarComSessaoSalva().catch(error=>mostrarErroLogin(error.message)).finally(()=>document.documentElement.classList.remove('titan-boot-auth'));

/* ---------- SUPORTE / ASSISTENTE TITAN ---------- */
const supNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function supFmtCnpj(v){v=normalizarDocumento(v);return v.length===14?v.replace(/^(.{2})(.{3})(.{3})(.{4})(\d{2})$/,'$1.$2.$3/$4-$5'):(v||'—')}
const supAmb=()=>(typeof ambienteAtual!=='undefined'&&ambienteAtual==='production')?'Produção oficial':'Produção Restrita';

const SUP_OFICIAL={
  portal:'https://www.nfse.gov.br/EmissorNacional/',
  faq:'https://www.gov.br/nfse/pt-br/copy_of_perguntas-frequentes/copy_of_faq-nfs-e',
  docs:'https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual',
  canais:'https://www.gov.br/nfse/pt-br/canais-de-atendimento/canais-de-atendimento',
  simples2026:'https://www.gov.br/nfse/pt-br/noticias/nfs-e-e-simples-nacional-obrigatoriedade-de-emissao-atraves-do-emissor-nacional'
};
const supFonte=(url,label='Fonte oficial')=>`<br><a href="${url}" target="_blank" rel="noopener">${label} ↗</a>`;
const supTopics=[
 {id:'nacional',chip:'Portal Nacional',kw:['o que e nfse nacional','portal nacional','padrao nacional','reforma tributaria','unificacao','mudanca nacional'],
  a:()=>`A <b>NFS-e de padrão nacional</b> é o documento eletrônico que registra a prestação de serviços em formato padronizado e integra dados ao ambiente nacional. Atenção: padrão nacional e uso obrigatório do mesmo portal não são sempre a mesma coisa; fora das regras específicas, a forma de emissão depende do regime e da configuração do município.${supFonte(SUP_OFICIAL.faq,'FAQ oficial da NFS-e')}`},
 {id:'acesso',chip:'Acesso oficial',kw:['acessar portal','login portal','gov.br','govbr','primeiro acesso','usuario e senha','aplicativo mobile','celular oficial','emissor web'],
  a:()=>`Os canais oficiais são o <b>Emissor Web</b>, o aplicativo móvel e a integração por <b>API</b>. Conforme o perfil do contribuinte, o acesso pode usar <b>Gov.br</b>, <b>certificado digital</b> ou credenciais cadastradas no emissor. Para MEI, Gov.br Prata ou Ouro é o caminho mais simples quando disponível.${supFonte(SUP_OFICIAL.portal,'Abrir Emissor Nacional')}`},
 {id:'emitir',chip:'Como emitir',kw:['emitir','como emito','gerar nota','criar nota','nova nota','fazer nota','fazer uma nota','passo a passo','dps','declaracao de prestacao','servico favorito'],
  a:()=>`A <b>DPS</b> reúne os dados que serão validados para gerar a NFS-e. No TITAN: escolha um item de <b>Meus serviços</b>, informe o tomador, competência, valor e município e revise os tributos antes de autorizar. Os rascunhos não são enviados à Sefin até a emissão.${supFonte(SUP_OFICIAL.docs,'Documentação técnica atual')}`,
  act:[['Abrir emissão','emitir'],['Meus serviços','servicos']]},
 {id:'rejeicao',chip:'Nota rejeitada',kw:['rejeit','erro','recus','negad','falhou','falha','nao consigo','nao consegui','nao emit','nao autoriz','problema','deu erro','codigo de erro','sefin recusou'],
  a:()=>`Uma rejeição é a resposta oficial da Sefin a uma validação da DPS. Confira o <b>código devolvido</b>, certificado, CNPJ/CPF, série e número da DPS, código nacional do serviço, município e dados fiscais do emitente. Não corrija por tentativa: use a mensagem da Sefin para localizar o campo exato.`,
  act:[['Analisar minha conta','diag'],['Rever emissão','emitir']]},
 {id:'certificado',chip:'Certificado A1',kw:['certificado','a1','pfx','p12','assinatura digital','senha do certificado','vencido','expirado','icp'],
  a:()=>`No Portal Web, alguns contribuintes conseguem entrar por Gov.br ou credenciais próprias. Na <b>integração automatizada do TITAN</b>, o A1 (.pfx/.p12) identifica a empresa, assina a DPS e faz a comunicação segura. O arquivo fica criptografado e é usado somente no backend da empresa ativa.`,
  act:[['Ir para Certificado digital','cert']]},
 {id:'cancelar',chip:'Cancelar nota',kw:['cancel','anular','estornar','tornar sem efeito','substituir nota'],
  a:()=>`Cancelamento e substituição são <b>eventos oficiais</b>. A possibilidade, o prazo e a necessidade de análise fiscal dependem dos parâmetros cadastrados pelo município e das regras nacionais aplicáveis. No TITAN, somente uma nota autorizada oferece a ação de cancelamento; informe um motivo claro e aguarde a autorização da Sefin.${supFonte(SUP_OFICIAL.docs,'Guia oficial do Emissor')}`,
  act:[['Abrir Notas emitidas','notas']]},
 {id:'danfse',chip:'XML e DANFSe',kw:['danfse','pdf','imprimir','espelho','documento da nota','baixar nota','visualizar nota','abrir nota','baixar xml','download xml'],
  a:()=>`O <b>XML autorizado</b> é o documento fiscal eletrônico; o <b>DANFSe</b> é sua representação em PDF. Posso localizar uma nota e oferecer os dois arquivos. Exemplo: <i>“buscar notas de julho”</i> ou <i>“baixar XML da DPS 22”</i>.`,
  act:[['Abrir Notas emitidas','notas']]},
 {id:'habilitacao',chip:'Obrigatoriedade',kw:['habilita','posso emitir','obrigat','obrigado a emitir','sou obrigado','tenho que emitir','simples','mei','sou mei','me epp','quando comeco','prazo','regime','janeiro de 2026'],
  a:()=>`Regras oficiais atuais:<ul><li><b>MEI prestador de serviços</b>: padrão nacional obrigatório desde <b>01/09/2023</b> nas hipóteses de emissão;</li><li><b>ME/EPP optante pelo Simples Nacional</b>: uso obrigatório do Emissor Nacional a partir de <b>01/09/2026</b>, conforme a Resolução CGSN nº 189/2026;</li><li><b>Demais contribuintes</b>: a forma de emissão depende do regime, da legislação e da solução adotada pelo município.</li></ul>Não existe uma regra geral dizendo que todas as empresas passaram obrigatoriamente ao portal em 01/01/2026.${supFonte(SUP_OFICIAL.simples2026,'Comunicado oficial CGSN 189/2026')}`,
  act:[['Dados do emitente','emitente']]},
 {id:'importar',chip:'Importar do ADN',kw:['importar','trazer notas','sincroniz','distribui','adn','baixar do portal','notas recebidas'],
  a:()=>`Em <b>Configurações</b>, o card "Importar do Portal Nacional" consulta a distribuição do ADN para a empresa autenticada e traz documentos em que ela aparece como prestador, tomador ou intermediário, cadastrando os clientes automaticamente. O certificado deve pertencer ao CNPJ da empresa ativa.`,
  act:[['Abrir Configurações','emitente']]},
 {id:'ambiente',chip:'Ambiente',kw:['ambiente','restrit','producao','teste','validade juridica','homolog','tpamb','oficial'],
  a:()=>`Ambiente atual: <b>${supAmb()}</b>.<ul><li><b>Produção Restrita</b> (tpAmb=2): testes, sem validade fiscal;</li><li><b>Produção oficial</b> (tpAmb=1): documentos com validade fiscal quando autorizados.</li></ul>A troca é controlada no servidor para evitar emissões acidentais.`},
 {id:'clientes',chip:'Clientes / CNPJ',kw:['cliente','tomador','consultar cnpj','cadastro de cliente','brasilapi','buscar cnpj'],
  a:()=>`Em <b>Clientes</b> você cadastra os tomadores e pode consultar dados públicos por CNPJ. O cadastro é reutilizado na emissão, nos orçamentos e nas ordens de serviço.`,
  act:[['Abrir Clientes','clientes']]},
 {id:'servicos',chip:'Meus serviços',kw:['meus servicos','aliquota','retenc','issqn',' iss ','codigo nacional','codigo de servico','codigo do servico','tributo','nbs','pis','cofins'],
  a:()=>`Em <b>Meus serviços</b> você mantém descrição, código de tributação nacional, NBS, ISS e retenções PIS/COFINS. O mesmo cadastro alimenta orçamentos, O.S. e a futura NFS-e, evitando redigitação.`,
  act:[['Abrir Meus serviços','servicos']]},
 {id:'comercial',chip:'Orçamentos e O.S.',kw:['orcamento','ordem de servico',' os ','proposta','comercial'],
  a:()=>`Para criar um orçamento ou O.S., selecione um <b>cliente</b> e um item de <b>Meus serviços</b>. Ao converter, o TITAN leva tomador, descrição, códigos e retenções à tela de emissão para revisão.`,
  act:[['Abrir Orçamentos e O.S.','comercial']]},
 {id:'suporte',chip:'Ajuda oficial',kw:['ajuda oficial','suporte oficial','atendimento receita','sebrae','falar com receita','documentacao oficial'],
   a:()=>`Para orientação oficial, consulte a FAQ, os guias atuais e os canais de atendimento da NFS-e. Para MEI, o portal recomenda também o suporte do Sebrae.${supFonte(SUP_OFICIAL.canais,'Canais oficiais de atendimento')}`}
];

/**
 * "Como usar?" (pedido do usuário, 19/08/2026): a Central de Ajuda já tinha
 * FAQ regulatório (o que é, quando é obrigatório...) mas nada de passo a
 * passo operacional das telas do próprio TITAN. supGuias reaproveita a
 * mesma estrutura/UI de supTopics (lista + acordeão + atalho de navegação
 * via supActs/supDo) só trocando o conteúdo por fluxo numerado.
 */
const supGuias=[
 {id:'g-emitir',chip:'Emitir uma nota (NFS-e)',resumo:'Do zero até a nota autorizada, nos mesmos 7 passos numerados da tela de emissão.',
  passos:[
   'Em <b>Tomador do serviço</b> (passo 1): informe o CNPJ/CPF e clique em <b>Buscar CNPJ</b>, ou digite o nome pra achar um cliente já cadastrado ou já visto no Portal Nacional.',
   'Em <b>Serviço prestado</b> (passo 2): escolha um item de <b>Meus Serviços</b> — preenche tudo sozinho — ou selecione o código de tributação e o NBS na mão, e informe o valor.',
   'Vai lançar mais de um serviço na mesma nota? Use <b>Adicionar outro serviço cadastrado</b> no passo 3 — o total é recalculado na hora, sem abrir outra tela.',
   'Confira <b>Retenções</b> (passo 5) e, quando aparecer, o bloco <b>IBS/CBS</b> (passo 6, Reforma Tributária). O passo 7 é só o resumo fiscal — não precisa preencher nada nele.',
   'No resumo à direita: <b>Conferir com o Martyn</b> revisa a nota antes de mandar; <b>Emitir direto</b> já envia à Sefin; <b>Salvar rascunho</b> guarda pra continuar depois, em Rascunhos.'
  ], act:[['Abrir Emitir NFS-e','emitir']]},
 {id:'g-clientes',chip:'Cadastrar e reaproveitar clientes',resumo:'Cadastro manual, por CNPJ ou em lote — pra não digitar o mesmo tomador duas vezes.',
  passos:[
   'Em <b>Clientes</b>, clique em <b>+ Cliente</b> e informe o CNPJ/CPF — o TITAN busca razão social e endereço na Receita automaticamente.',
   'Cadastro desatualizado? <b>Atualizar todos (CNPJ)</b> reconsulta todos os clientes de uma vez, respeitando o limite de consultas por minuto.',
   'Tem uma planilha de clientes? Use <b>Importar clientes por planilha (CSV)</b> — baixe o modelo, preencha CNPJ e e-mail (o resto a API completa sozinha) e envie de volta.',
   'Na hora de emitir, o cliente cadastrado aparece na busca do passo 1 — ou clique em <b>Usar na emissão</b> direto na lista de Clientes.'
  ], act:[['Abrir Clientes','clientes']]},
 {id:'g-config',chip:'Configurar empresa, certificado e Portal Nacional',resumo:'O que fazer antes da primeira emissão, e como trazer o histórico de quem já emitia pelo Portal Nacional.',
  passos:[
   'Em <b>Configurações</b>, preencha <b>Identificação</b> (o CNPJ busca os dados sozinho) e <b>Configuração da DPS Nacional</b>, depois <b>Salvar cadastro inicial</b>.',
   'Envie o certificado A1 (.pfx/.p12) em <b>Adicionar certificado</b> — sem ele, o TITAN não assina nem emite nada.',
   'Já emitia pelo Emissor Nacional antes do TITAN? Clique em <b>Buscar dados do Portal Nacional</b> — a busca roda em segundo plano (dá pra sair da tela) e cadastra os clientes encontrados nas notas, completando os dados pela Receita automaticamente.',
   'Em <b>Meu plano</b>, acompanhe o consumo do mês e peça mudança de plano quando precisar.'
  ], act:[['Abrir Configurações','emitente']]},
 {id:'g-recorrentes',chip:'Criar um contrato recorrente',resumo:'Configura uma vez e o TITAN emite a nota sozinho, no dia escolhido, já gerando o recebimento.',
  passos:[
   'Em <b>Contratos recorrentes</b>, clique em <b>+ Novo contrato</b> e escolha o cliente e o serviço, ambos já cadastrados.',
   'Defina o valor, o <b>dia de emissão</b> da nota (com horário) e o <b>dia de vencimento</b> — são coisas diferentes: a nota sai numa data, o dinheiro vence noutra. Se você usa sempre as mesmas datas, cadastre um padrão em Cadastros → Outros e escolha em "Usar um padrão".',
   'Escolha como o contrato termina: sem data (repete até você pausar), numa data específica, ou por <b>número de parcelas</b> — neste caso dá pra informar o valor de cada parcela ou o valor total a dividir.',
   'Cada emissão automática já cria o recebimento correspondente, que aparece na <b>Agenda</b> no dia do vencimento.',
   'Pausar, editar ou excluir fica nos ícones da própria lista. Vários contratos de uma vez? Use a importação por planilha (CSV) no fim da tela.'
  ], act:[['Abrir Contratos recorrentes','recorrentes']]},
 {id:'g-comercial',chip:'Orçamento ou Ordem de Serviço → virar nota',resumo:'Monta a proposta primeiro, converte em NFS-e só quando o cliente aprovar.',
  passos:[
   'No menu, clique em <b>Orçamentos</b> ou <b>Ordens de serviço</b> — já abre o formulário de um novo documento.',
   'Escolha o cliente e adicione um ou mais itens de <b>Meus Serviços</b>; salve como rascunho enquanto negocia.',
   'Aprovado pelo cliente, use <b>Converter em NFS-e</b> na lista — tomador, descrição, códigos e retenções já chegam prontos na tela de emissão pra revisão final.',
   'Precisa mandar a proposta antes? <b>Abrir PDF</b> ou <b>Enviar e-mail</b> direto da lista.'
  ], act:[['Abrir Orçamentos e O.S.','comercial']]},
 {id:'g-recebimentos',chip:'Agendar recebimentos e acompanhar vencimentos',resumo:'Honorários e mensalidades num calendário só, com o valor de cada dia à vista.',
  passos:[
   'Em <b>Recebimentos</b>, clique em <b>+ Agendar recebimento</b> — dá pra marcar um recebimento único ou já criar uma recorrência.',
   'Quando o cliente pagar, marque <b>Marcar recebido</b>; se ainda não existe nota pra esse recebimento, use <b>Preparar NFS-e</b> pra ir direto pra emissão com os dados preenchidos.',
   'Em <b>Agenda e vencimentos</b>, o calendário mostra o valor total de cada dia — clique num dia pra ver, embaixo, a lista completa do que compõe aquele valor.'
  ], act:[['Abrir Recebimentos','recebimentos'],['Abrir Agenda','agenda']]},
 {id:'g-servicos',chip:'Cadastrar Meus Serviços',resumo:'O catálogo que alimenta emissão, orçamentos e recorrências sem redigitar nada.',
  passos:[
   'Em <b>Meus serviços</b>, clique em <b>Cadastrar novo</b> e busque o código de tributação nacional (Anexo B) ou o NBS pelo nome do serviço.',
   'Confirme ISSQN, retenções de PIS/COFINS/CSLL e demais tributos — esse cadastro é reaproveitado toda vez que o serviço for usado.',
   'O mesmo item aparece pronto pra escolher na emissão (passo 2), em orçamentos/O.S. e em recorrências — editar aqui atualiza todo mundo de uma vez.'
  ], act:[['Abrir Meus serviços','servicos']]},
 {id:'g-notas',chip:'Consultar, baixar e cancelar notas emitidas',resumo:'Histórico completo com XML, DANFSe e as ações fiscais de cada nota.',
  passos:[
   'Em <b>Notas emitidas</b>, use a busca por tomador/chave/número, o filtro de situação, ou <b>Filtros</b> pra refinar por competência e período.',
   'Nos ícones de cada linha: baixar o <b>XML</b> autorizado, abrir o <b>DANFSe</b> em PDF, <b>sincronizar</b> a situação com a Sefin, ou reenviar por e-mail pro cliente.',
   'Pra cancelar, use o ícone de cancelamento e informe o motivo — a nota só é cancelada depois da autorização da Sefin.',
   'Precisa de várias notas de uma vez? <b>Exportar PDF</b> ou <b>Exportar XMLs</b> no topo da tela.'
  ], act:[['Abrir Notas emitidas','notas']]}
];

let helpAbaAtual='faq';
function helpMudarAba(aba,btn){
  helpAbaAtual=aba;
  qsa('.help-tab-btn').forEach(el=>el.classList.remove('on'));
  btn.classList.add('on');
  qs('#help-aba-desc').textContent=aba==='como-usar'?'Passo a passo das funções do TITAN, na mesma ordem que aparece na tela.':'Respostas oficiais e orientações do TITAN para sua operação.';
  helpRenderTopics();
  helpRenderFaq();
}
function helpFocarGuia(id){
  const item=document.querySelector(`.help-faq-item[data-guia="${id}"]`);
  if(!item)return;
  qsa('.help-faq-item').forEach(el=>el.classList.remove('on'));
  item.classList.add('on');
  item.scrollIntoView({behavior:'smooth',block:'start'});
}
function helpRenderTopics(){
  const box=qs('#help-topic-list');if(!box)return;
  if(helpAbaAtual==='como-usar'){
    box.innerHTML=supGuias.map(g=>`<button class="help-topic" type="button" onclick="helpFocarGuia('${g.id}')"><span>${esc(g.chip)}</span><small>›</small></button>`).join('');
    return;
  }
  const topics=[['diag','Analisar minha conta'],...supTopics.map(t=>[t.id,t.chip])];
  box.innerHTML=topics.map(([id,label])=>`<button class="help-topic" type="button" onclick="helpOpenTopic('${id}')"><span>${esc(label)}</span><small>›</small></button>`).join('');
}
function helpRenderFaq(){
  const box=qs('#help-faq-list');if(!box)return;
  const term=supNorm(qs('#help-search')?.value||'');
  if(helpAbaAtual==='como-usar'){
    const guias=supGuias.filter(g=>!term||supNorm(`${g.chip} ${g.resumo}`).includes(term));
    box.innerHTML=guias.length?guias.map(g=>`<article class="help-faq-item" data-guia="${g.id}"><button class="help-faq-q" type="button" onclick="this.parentElement.classList.toggle('on')"><span>${esc(g.chip)}</span><span>⌄</span></button><div class="help-faq-a"><p class="hint" style="margin-bottom:8px">${esc(g.resumo)}</p><ol class="help-steps">${g.passos.map(p=>`<li>${p}</li>`).join('')}</ol>${supActs(g.act)}</div></article>`).join(''):'<div class="empty-state">Nenhum guia encontrado.</div>';
    return;
  }
  const topics=supTopics.filter(t=>!term||supNorm(`${t.chip} ${t.kw.join(' ')}`).includes(term));
  box.innerHTML=topics.length?topics.map(t=>`<article class="help-faq-item"><button class="help-faq-q" type="button" onclick="this.parentElement.classList.toggle('on')"><span>${esc(t.chip)}</span><span>⌄</span></button><div class="help-faq-a">${t.a()}</div></article>`).join(''):'<div class="empty-state">Nenhuma resposta encontrada. Abra o Martyn para reformular sua pergunta.</div>';
}
function helpOpenTopic(id){
  if(id==='diag'){supOpen();supBubble('🔎 Analisar minha conta','me');supAnalisar();return}
  const topic=supTopics.find(t=>t.id===id);if(!topic)return;
  supOpen();supBubble(esc(topic.chip),'me');supAnswerTopic(topic);
}

function supGo(v){try{const el=[...document.querySelectorAll('.sb-link')].find(b=>(b.getAttribute('onclick')||'').includes("go('"+v+"'"));go(v,el);}catch(e){}if(window.innerWidth<=760)supClose();}
function supDo(v){if(v==='diag'){supBubble('🔎 Analisar minha conta','me');supAnalisar();return}supGo(v);}
function supScroll(){const l=qs('#sup-log');if(l)l.scrollTop=l.scrollHeight}
function supBubble(html,who){const l=qs('#sup-log');if(!l)return null;const d=document.createElement('div');d.className='sup-b '+(who==='me'?'me':'bot');d.innerHTML=html;l.appendChild(d);supScroll();return d}
function supActs(list){if(!list||!list.length)return '';return '<div class="sup-act">'+list.map(([label,view])=>`<button type="button" onclick="supDo('${view}')">${esc(label)}</button>`).join('')+'</div>'}
function supAnswerTopic(t){supBubble(t.a()+supActs(t.act),'bot')}
const supMeses={janeiro:0,fevereiro:1,marco:2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11};
function supFiltrarNotas(text){
  const q=supNorm(text),agora=new Date();let lista=[...notas],filtrou=false;
  const chave=(String(text).toUpperCase().match(/[A-Z0-9]{44,50}/)||[])[0];
  if(chave){lista=lista.filter(n=>normalizarDocumento(n.key)===chave);filtrou=true}
  const numero=q.match(/(?:dps|nota|numero|nº|n°)\s*(?:numero|nº|n°|#)?\s*(\d{1,15})/);
  if(numero&&!chave){lista=lista.filter(n=>String(n.n)===String(Number(numero[1]))||String(n.n)===numero[1]);filtrou=true}
  const mes=Object.entries(supMeses).find(([nome])=>q.includes(nome));
  if(mes){const ano=Number((q.match(/20\d{2}/)||[])[0]||agora.getFullYear());lista=lista.filter(n=>{const d=new Date(n.date||'');return !Number.isNaN(d.valueOf())&&d.getMonth()===mes[1]&&d.getFullYear()===ano});filtrou=true}
  const dias=q.match(/ultim(?:o|os|a|as)\s+(\d{1,3})\s+dias?/);
  if(dias){const inicio=Date.now()-Number(dias[1])*864e5;lista=lista.filter(n=>new Date(n.date||0).getTime()>=inicio);filtrou=true}
  if(q.includes('hoje')){lista=lista.filter(n=>new Date(n.date||'').toDateString()===agora.toDateString());filtrou=true}
  const status=q.includes('cancelad')?'canc':q.includes('rejeitad')||q.includes('erro')?'err':q.includes('process')?'proc':q.includes('autorizad')?'ok':null;
  if(status){lista=lista.filter(n=>n.st===status);filtrou=true}
  return {lista,filtrou,chave,numero:numero?.[1]||null};
}
function supNotaCard(n){
  const status=sit[n.st]?.[1]||n.st;
  let acoes=n.key?`<div class="sup-act"><button type="button" onclick="supNotaDetalhe('${n.id}')">Detalhes</button><button type="button" onclick="baixarXml('${n.id}','${escAttr(n.n)}')">Baixar XML</button><button type="button" onclick="abrirDanfse('${n.id}','${escAttr(n.n)}')">Abrir PDF</button>`:'<span>Documento ainda sem XML autorizado.</span>';
  if(n.key&&n.st==='ok')acoes+=`<button type="button" onclick="supPrepararCancelamento('${n.id}')">Preparar cancelamento</button>`;
  if(n.key)acoes+='</div>';
  return `<div class="sup-note-card"><b>DPS ${esc(n.n)} · ${esc(status)}</b><span>${esc(n.d)} · ${esc(n.t||'Tomador não informado')}</span><span>${esc(n.s||'Serviço')} · R$ ${brl(Number(n.v||0))}</span>${acoes}</div>`;
}
function supNotaDetalhe(id){
  const n=notas.find(item=>item.id===id);if(!n){supBubble('Não encontrei mais essa nota na empresa ativa. Atualize o histórico e tente novamente.','bot');return}
  supBubble(`<b>Detalhes da DPS ${esc(n.n)}</b><ul><li>Situação: <b>${esc(sit[n.st]?.[1]||n.st)}</b></li><li>Emissão: ${esc(n.d)}</li><li>Tomador: ${esc(n.t||'Não informado')}</li><li>Serviço: ${esc(n.s||'Não informado')}</li><li>Valor: R$ ${brl(Number(n.v||0))}</li></ul>${n.key?`<span class="sup-note-key">Chave: ${esc(n.key)}</span><div class="sup-act"><button type="button" onclick="baixarXml('${n.id}','${escAttr(n.n)}')">Baixar XML</button><button type="button" onclick="abrirDanfse('${n.id}','${escAttr(n.n)}')">Abrir DANFSe</button>${n.st==='ok'?`<button type="button" onclick="supPrepararCancelamento('${n.id}')">Preparar cancelamento</button>`:''}</div>`:'<br>Esta emissão ainda não possui chave autorizada.'}`,'bot');
}
function supPrepararCancelamento(id){
  const n=notas.find(item=>item.id===id);
  if(!n){supBubble('Não encontrei essa nota na empresa ativa. Atualize o histórico e tente novamente.','bot');return}
  if(n.st!=='ok'){supBubble('Só uma NFS-e autorizada pode iniciar o cancelamento oficial. Esta nota está '+esc(sit[n.st]?.[1]||n.st)+'.','bot');return}
  supBubble(`<b>Cancelamento preparado para a DPS ${esc(n.n)}.</b><br>Vou abrir a tela oficial para você informar o motivo e confirmar o envio. Nenhuma ação fiscal será feita sem essa confirmação.`,'bot');
  abrirCancelamento(n.id,n.n);
}
function supPareceFerramenta(q){return /(buscar|pesquisar|listar|mostrar|localizar|detalhe|baixar|download|xml|pdf|danfse|chave)/.test(q)&&/(nota|nfse|nfs-e|dps|xml|pdf|danfse|chave)/.test(q)}
async function supExecutarFerramenta(text){
  const holder=supBubble('Consultando as notas da empresa ativa…','bot');
  try{
    await carregarNotasServidor();
    const {lista}=supFiltrarNotas(text),ordenada=lista.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    if(!ordenada.length){holder.innerHTML='Nenhuma NFS-e corresponde à busca na empresa ativa.'+supActs([['Abrir histórico completo','notas']]);supScroll();return}
    const exibir=ordenada.slice(0,6);
    holder.innerHTML=`Encontrei <b>${ordenada.length}</b> nota(s).${ordenada.length>6?' Mostrando as 6 mais recentes.':''}`+exibir.map(supNotaCard).join('')+(ordenada.length>6?supActs([['Abrir histórico completo','notas']]):'');supScroll();
  }catch(error){holder.innerHTML=`Não consegui consultar as notas agora: ${esc(error.message)}`;supScroll()}
}

function supAnalisar(){
  const rows=[];const push=(cls,txt)=>rows.push(`<div class="sup-diag"><span class="d d-${cls}"></span><span>${txt}</span></div>`);
  const emp=(typeof empresaAtual!=='undefined')?empresaAtual:null;
  if(emp&&emp.rs)push('ok',`Empresa ativa: <b>${esc(emp.rs)}</b> (${supFmtCnpj(emp.cnpj)}).`);
  else push('warn','Nenhuma empresa ativa — cadastre em <b>Emitente</b>.');
  push('off',`Ambiente: <b>${supAmb()}</b>.`);
  const arr=(typeof notas!=='undefined'&&Array.isArray(notas))?notas:[];
  const c={ok:0,err:0,canc:0,proc:0};arr.forEach(n=>{if(c[n.st]!=null)c[n.st]++});
  if(!arr.length)push('off','Nenhuma emissão registrada ainda.');
  else{push('ok',`${arr.length} emissão(ões): ${c.ok} autorizada(s), ${c.proc} processando, ${c.canc} cancelada(s).`);if(c.err>0)push('err',`${c.err} nota(s) <b>rejeitada(s)</b> — revise a causa no "Trajeto da nota".`);}
  const holder=supBubble('Analisando sua conta…','bot');
  (async()=>{
    let certLine='';
    try{const cert=await api('/api/invoices/certificate');
      if(!cert.configured)certLine='<div class="sup-diag"><span class="d d-warn"></span><span>Certificado A1 <b>não configurado</b> — envie em Certificado A1.</span></div>';
      else if(cert.expired)certLine='<div class="sup-diag"><span class="d d-err"></span><span>Certificado A1 <b>vencido</b> — substitua para voltar a emitir.</span></div>';
      else certLine='<div class="sup-diag"><span class="d d-ok"></span><span>Certificado A1 válido.</span></div>';
    }catch(e){certLine='<div class="sup-diag"><span class="d d-off"></span><span>Não consegui checar o certificado agora.</span></div>';}
    let next;
    if(!emp||!emp.rs)next='<div style="margin-top:8px">Próximo passo: cadastrar a empresa.</div>'+supActs([['Ir para Emitente','emitente']]);
    else if(certLine.indexOf('d-warn')>-1||certLine.indexOf('d-err')>-1)next='<div style="margin-top:8px">Próximo passo: acertar o certificado A1.</div>'+supActs([['Ir para Certificado A1','cert']]);
    else if(c.err>0)next='<div style="margin-top:8px">Próximo passo: revisar as notas rejeitadas.</div>'+supActs([['Abrir Notas emitidas','notas']]);
    else next='<div style="margin-top:8px">Tudo pronto para emitir. 👍</div>'+supActs([['Abrir emissão','emitir']]);
    if(holder){holder.innerHTML='<b>Diagnóstico da conta</b>'+rows.join('')+certLine+next;supScroll();}
  })();
}

function supRenderChips(){const wrap=qs('#sup-chips');if(!wrap)return;const items=[['diag','🔎 Analisar minha conta'],...supTopics.map(t=>[t.id,t.chip])];wrap.innerHTML=items.map(([id,label])=>`<button class="sup-chip" type="button" onclick="supChip('${id}')">${esc(label)}</button>`).join('');}
function supChip(id){if(id==='diag'){supBubble('🔎 Analisar minha conta','me');supAnalisar();return}const t=supTopics.find(x=>x.id===id);if(!t)return;supBubble(esc(t.chip),'me');supAnswerTopic(t);}

/**
 * Memória curta da conversa com o Martyn de verdade (mesma API que atende o
 * widget de erro de emissão e o WhatsApp). Cresce por turno e é cortada no
 * mesmo teto que o backend aceita — sem isso, a cada nova pergunta cresceria
 * o payload à toa e ainda arriscaria estourar o limite do schema.
 */
let supHistoricoIA=[];
const SUP_HISTORICO_MAX=8;
async function supPerguntarIA(texto){
  const holder=supBubble('<span class="sup-typing">Martyn está digitando…</span>','bot');
  try{
    const dados=await api('/api/martyn',{method:'POST',body:JSON.stringify({mensagem:texto,historico:supHistoricoIA})});
    if(holder){holder.innerHTML=esc(dados.resposta).replace(/\n/g,'<br>');supScroll();}
    supHistoricoIA.push({role:'user',content:texto},{role:'assistant',content:dados.resposta});
    supHistoricoIA=supHistoricoIA.slice(-SUP_HISTORICO_MAX);
    aplicarAcaoMartyn(dados.action);
    // O Martyn cancelou uma nota pelo próprio bate-papo: recarrega a lista para a
    // tela de Notas emitidas (e qualquer pergunta seguinte) já refletir o status novo.
    if(Array.isArray(dados.ferramentasUsadas)&&dados.ferramentasUsadas.includes('cancelar_nota'))carregarNotasServidor().catch(()=>{});
  }catch(error){
    if(holder){holder.innerHTML=`Não consegui pensar nisso agora: ${esc(error.message||'falha de comunicação')}. Pode tentar de novo?`;supScroll();}
  }
}
function supSend(e){e.preventDefault();const inp=qs('#sup-in');const v=(inp.value||'').trim();if(!v)return false;inp.value='';supBubble(esc(v),'me');const q=supNorm(v);
  if(/(^|\s)(oi|ola|bom dia|boa tarde|boa noite|hello|hi)(\s|$)/.test(q)){supBubble('Olá! Como posso ajudar? Toque em um assunto abaixo ou descreva sua dúvida.','bot');return false}
  if(q.indexOf('analis')>-1||q.indexOf('diagnost')>-1||q.indexOf('minha conta')>-1||q.indexOf('meu status')>-1){supAnalisar();return false}
  // Cancelamento não tem mais atalho local: vai direto pro Martyn de verdade, que
  // agora sabe localizar a nota, pedir motivo/justificativa, confirmar e executar.
  if(supPareceFerramenta(q)){supExecutarFerramenta(v);return false}
  if(q.indexOf('humano')>-1||q.indexOf('atendente')>-1||q.indexOf('falar com')>-1||q.indexOf('pessoa')>-1){supBubble(`Para atendimento do sistema, fale com o responsável pelo TITAN. Para orientação normativa ou indisponibilidade do ambiente nacional, consulte os canais oficiais. Posso adiantar sua dúvida por aqui enquanto isso.${supFonte(SUP_OFICIAL.canais,'Canais oficiais da NFS-e')}`,'bot');return false}
  // Os tópicos prontos (supMatch) só respondem aos chips, clicados de propósito —
  // no texto livre, uma palavra solta ("prazo", "regime") já bastava pra puxar
  // um tópico sem relação nenhuma com a pergunta. Pergunta digitada vai direto
  // pro Martyn de verdade, que lê a pergunta inteira em vez de uma palavra-chave.
  supPerguntarIA(v);
  return false;
}

let supGreeted=false;
function supGreet(){const emp=(typeof empresaAtual!=='undefined')?empresaAtual:null;let msg='Olá! Sou o <b>Martyn</b>, assistente do TITAN NFS-e. Respondo com base oficial, navego pelos módulos, consulto suas notas, entrego XML/DANFSe e posso cancelar uma NFS-e autorizada depois da sua confirmação.';let act;
  if(!emp||!emp.rs){msg+='<br><br>Notei que <b>ainda não há empresa ativa</b>. Quer começar pelo cadastro?';act=[['Cadastrar empresa','emitente']];}
  else{msg+=`<br><br>Empresa ativa: <b>${esc(emp.rs)}</b> · ${supAmb()}.`;act=[['🔎 Analisar minha conta','diag']];}
  supBubble(msg+supActs(act),'bot');}
function supOpen(){qs('#sup-panel').classList.add('on');qs('#sup-fab').classList.add('open-state');const dot=qs('.sup-fab-dot');if(dot)dot.style.display='none';if(!supGreeted){supGreeted=true;supRenderChips();supGreet();}setTimeout(()=>{const i=qs('#sup-in');if(i&&window.innerWidth>760)i.focus();},60);}
function supClose(){qs('#sup-panel')?.classList.remove('on');qs('#sup-fab')?.classList.remove('open-state');}
function supToggle(){const p=qs('#sup-panel');if(!p)return;p.classList.contains('on')?supClose():supOpen();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&qs('#sup-panel')?.classList.contains('on'))supClose();});

/* ── Pacote contábil do mês (20/08/2026) ────────────────────────────────────
   Todo dia 01 às 05h30 o TITAN manda pro contador o .zip com o XML das notas
   do mês que fechou e o livro de serviços prestados em PDF. O botão abaixo
   dispara o MESMO caminho na hora, pra dar pra conferir sem esperar virar o
   mês. */
function preencherCompetenciasContador(){
  const sel=qs('#e-contador-comp'); if(!sel||sel.options.length)return;
  // Últimas 6 competências fechadas, a mais recente primeiro — é a que o
  // envio automático usaria hoje, então vem pré-selecionada.
  const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const hoje=new Date();
  for(let i=1;i<=6;i++){
    const d=new Date(hoje.getFullYear(),hoje.getMonth()-i,1);
    const valor=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    sel.insertAdjacentHTML('beforeend',`<option value="${valor}">${meses[d.getMonth()]}/${d.getFullYear()}</option>`);
  }
}

async function testarEnvioContador(){
  return emVoo('teste-contador',async()=>{
    const box=qs('#e-contador-status'), btn=qs('#btn-testar-contador');
    const email=qs('#e-contador').value.trim();
    box.style.display='block'; box.className='alert a-info';
    box.textContent='Montando o pacote e enviando…';
    if(btn)btn.disabled=true;
    try{
      // O teste usa o e-mail JÁ GRAVADO, não o que está na tela. Se enviasse
      // para o campo não salvo, o resultado diria "deu certo" e no dia 01 o
      // pacote iria para outro endereço — o teste teria mentido.
      if(email!==(empresaAtual?.contador||'')){
        box.className='alert a-warn';
        box.innerHTML='<b>Salve o cadastro primeiro.</b><br>O teste usa o e-mail já gravado no servidor, não o que está digitado aqui.';
        return;
      }
      const r=await api('/api/company/accountant-package/test',{method:'POST',body:JSON.stringify({period:qs('#e-contador-comp').value})});
      if(!r.enviado){
        box.className='alert a-warn';
        box.innerHTML=`<b>Não foi enviado.</b><br>${esc(r.erro||'Falha desconhecida.')}`;
        return;
      }
      box.className='alert a-ok';
      const canceladas=r.canceladas?` (${r.ativas} ativa(s) e ${r.canceladas} cancelada(s) — o total soma só as ativas)`:'';
      box.innerHTML=`<b>Enviado para ${esc(r.destinatario)}.</b>`+
        `<br>Competência ${esc(r.competencia)} — ${r.notas} nota(s)${canceladas}.`+
        `<br>Total: R$ ${brl(Number(r.total||0))}`+
        `<br><b>Dois anexos, soltos no e-mail:</b>`+
        `<br>&nbsp;&nbsp;&#128196; <code>${esc(r.livro)}</code> — o livro, abre direto`+
        `<br>&nbsp;&nbsp;&#128190; <code>${esc(r.arquivo)}</code> — ${r.xmlsNoZip} XML(s)`+
        (r.usouEmailDoContador?'':'<br><b>Atenção:</b> foi para o e-mail da empresa porque o e-mail do contador está em branco.');
    }catch(e){
      box.className='alert a-warn';
      box.innerHTML=`<b>Não foi enviado.</b><br>${esc(e.message||String(e))}`;
    }finally{ if(btn)btn.disabled=false; }
  });
}

/* ── Resolução do Martyn (Etapa 1 do plano dos 99%, 20/08/2026) ─────────────
   Até agora não existia esse número: o chat do portal não era gravado e nada
   marcava desfecho no zap. Sem denominador, "melhorou" era impressão. */
const MM_DESFECHOS={resolvido:'Resolvido',escalado:'Escalado para humano',nao_compreendido:'Não compreendido (cliente repetiu)',estourou_passos:'Estourou os passos do agente',erro_tecnico:'Erro técnico',bloqueado_por_seguranca:'Bloqueado por segurança',abandonado:'Cliente não voltou',em_andamento:'Em andamento'};

function mmPill(el,resumo){
  if(!el)return;
  // Sem conversa encerrada no período não existe taxa. Mostrar "0%" seria
  // dizer que ele falhou em tudo, quando na verdade não houve o que medir.
  if(!resumo||resumo.total-resumo.emAndamento<=0){el.textContent='sem dados';el.className='pill p-off';return}
  el.textContent=`${resumo.taxaDeResolucao}%`;
  el.className='pill '+(resumo.taxaDeResolucao>=99?'p-ok':resumo.taxaDeResolucao>=90?'p-gold':'p-warn');
}

async function carregarMetricasMartyn(){
  const falhas=qs('#mm-falhas');if(!falhas)return;
  try{
    const dias=qs('#mm-dias')?.value||30;
    const d=await api('/api/master/martyn-metricas?dias='+encodeURIComponent(dias));
    mmPill(qs('#mm-geral'),d.todos);mmPill(qs('#mm-portal'),d.portal);mmPill(qs('#mm-zap'),d.whatsapp);
    const t=d.todos||{};
    qs('#mm-resumo').innerHTML=`${t.total||0} atendimento(s) no período · ${t.resolvidos||0} resolvido(s) · `+
      `${t.escalados||0} escalado(s) para humano · ${t.falhas||0} com falha · ${t.emAndamento||0} em andamento.`;
    falhas.innerHTML=d.falhas?.length?d.falhas.map(f=>{
      const quando=f.fechado_em?new Date(f.fechado_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
      return `<div class="draft-item"><b>${esc(MM_DESFECHOS[f.desfecho]||f.desfecho)} · ${esc(f.canal)}</b>`+
        `<span>${esc(f.empresa||f.chave)} · ${f.turnos} turno(s), ${f.passos_do_agente} passo(s) de IA</span>`+
        (f.detalhe?`<div class="hint">${esc(f.detalhe)}</div>`:'')+
        `<small>${quando}</small></div>`;
    }).join(''):'<div class="empty-state">Nenhuma falha registrada no período.</div>';
  }catch(error){falhas.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`}
}

/* ── Certificado mTLS do banco (20/08/2026) ─────────────────────────────────
   A API Pix do Banco Central exige certificado do cliente em cada chamada. O
   arquivo é lido aqui e vai em base64 no mesmo PUT das demais credenciais —
   nunca volta do servidor, que só informa se existe ou não. */
const LIMITE_CERT_BYTES = 128 * 1024;

function lerArquivoBase64(input, destino, aoTerminar){
  const arquivo = input.files?.[0];
  if(!arquivo)return;
  if(arquivo.size > LIMITE_CERT_BYTES){
    alert('Arquivo grande demais para ser um certificado ('+Math.round(arquivo.size/1024)+' KB). Confira se é o arquivo certo.');
    input.value=''; return;
  }
  const leitor = new FileReader();
  leitor.onload = () => {
    // dataURL vem como "data:...;base64,XXXX" — só a parte depois da vírgula.
    qs(destino).value = String(leitor.result).split(',')[1] || '';
    aoTerminar?.(arquivo);
  };
  leitor.readAsDataURL(arquivo);
}

function carregarCertificadoBanco(input){
  lerArquivoBase64(input, '#set-nubank-cert-data', arquivo => {
    qs('#set-nubank-cert-estado').textContent =
      `${arquivo.name} carregado (${Math.round(arquivo.size/1024)} KB). Clique em Salvar configurações para gravar.`;
  });
}

function carregarChaveBanco(input){ lerArquivoBase64(input, '#set-nubank-cert-key-data'); }

async function testarConexaoBanco(){
  return emVoo('teste-banco', async () => {
    const box=qs('#set-nubank-teste'), btn=qs('#btn-testar-banco');
    box.style.display='block'; box.className='alert a-info';
    box.textContent='Autenticando no banco...';
    if(btn)btn.disabled=true;
    try{
      const r=await api('/api/master/nubank/test',{method:'POST'});
      const selo = r.mtls ? `com certificado mTLS (${esc(r.formato||'?')})` : 'sem certificado mTLS';
      if(r.ok){
        box.className='alert a-ok';
        box.innerHTML=`<b>Conexão OK — ${selo}.</b><br>O banco autenticou e devolveu o token. As cobranças podem ser criadas.`;
      }else{
        box.className='alert a-warn';
        box.innerHTML=`<b>Não conectou (${selo}).</b><br>${esc(r.erro||'Falha desconhecida.')}`;
      }
    }catch(error){
      box.className='alert a-warn';
      box.innerHTML=`<b>Não conectou.</b><br>${esc(error.message||String(error))}`;
    }finally{ if(btn)btn.disabled=false; }
  });
}

/**
 * Rede contra o menu sumir em silêncio (20/08/2026).
 *
 * O que aconteceu: os menus Financeiro e Contratos recorrentes desapareceram e
 * ninguém soube até o dono do produto reclamar. A causa é sempre a mesma
 * família — a sessão não trouxe empresa (login de parceiro, empresa não
 * resolvida, sessão velha), `permissions` fica vazio, e aplicarAcesso() esconde
 * TUDO que tem data-permission. Do lado do usuário, o produto simplesmente
 * encolheu, sem uma palavra.
 *
 * É o mesmo defeito que passei o dia corrigindo no backend, na versão de tela:
 * **esconder sem avisar não é o mesmo que o usuário não ter acesso.**
 *
 * Esta função não conserta a causa (a sessão), e não deve: ela garante que a
 * falha seja VISÍVEL. Um menu vazio vira um aviso com saída; um menu parcial
 * (plano sem alguma ferramenta) é legítimo e passa batido de propósito.
 */
function conferirMenuDoCliente(user){
  const aviso=qs('#menu-vazio-aviso');
  if(!aviso)return;
  // Master não tem menu de cliente — o painel dele é outro. Não é falha.
  if(user?.isMaster){aviso.style.display='none';return}

  // Só os links COM regra de acesso. Os demais (Visão geral, Configurações)
  // aparecem sempre e mascarariam a falha: a primeira versão desta função
  // contava todos, achava 11 visíveis e nunca disparava.
  const comRegra=qsa('.sb-nav.user-sidebar button.sb-link[data-permission],.sb-nav.user-sidebar button.sb-link[data-feature]');
  const visiveis=comRegra.filter(el=>el.style.display!=='none');
  // Toda empresa real tem ao menos 'emit'. Nenhum link liberado significa
  // permissões vazias — sessão sem empresa —, não um plano enxuto.
  const vazio=comRegra.length>0&&visiveis.length===0;
  aviso.style.display=vazio?'block':'none';
  if(vazio){
    // Fica no console para quem for depurar, com o dado que decide a causa.
    console.error('titan: menu do cliente ficou vazio — a sessão não trouxe empresa/permissões.',
      {linksComRegra:comRegra.length, isMaster:Boolean(user?.isMaster)});
  }
}

/**
 * Testa a autenticação no Sicredi sem gerar cobrança (20/08/2026).
 *
 * Mesma lição do botão do contador e do teste de conexão do banco: sem um teste
 * explícito, o primeiro sinal de credencial errada seria o pagamento de um
 * cliente falhando.
 */
async function testarConexaoSicredi(){
  return emVoo('teste-sicredi', async () => {
    const box=qs('#set-sicredi-teste'), btn=qs('#btn-testar-sicredi');
    box.style.display='block'; box.className='alert a-info';
    box.textContent='Autenticando no Sicredi...';
    if(btn)btn.disabled=true;
    try{
      const r=await api('/api/master/sicredi/test',{method:'POST'});
      if(r.ok){
        box.className='alert a-ok';
        box.innerHTML=`<b>Conexão OK — ambiente ${esc(r.ambiente||'?')}.</b><br>O Sicredi autenticou e devolveu o token. Já dá para cadastrar cobrança.`;
      }else{
        box.className='alert a-warn';
        box.innerHTML=`<b>Não conectou.</b><br>${esc(r.erro||'Falha desconhecida.')}`;
      }
    }catch(error){
      box.className='alert a-warn';
      box.innerHTML=`<b>Não conectou.</b><br>${esc(error.message||String(error))}`;
    }finally{ if(btn)btn.disabled=false; }
  });
}
