import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("carrega a configuração externa do backend", async () => {
  const html = await readFile(resolve(root, "public/titan.html"), "utf8");
  const config = await readFile(resolve(root, "public/config.js"), "utf8");
  assert.match(html, /<script src="\/config\.js"><\/script>/);
  // Trava o backend do emissor. Trocar esta URL troca o banco inteiro (cada
  // serviço Render tem o seu DATABASE_URL), o que já derrubou o login em
  // produção uma vez — ver o comentário em public/config.js.
  assert.match(config, /window\.TITAN_API_URL = window\.TITAN_API_URL \|\| "https:\/\/titan-nfse-api\.onrender\.com"/);
  assert.match(html, /\/api\/invoices\/emit/);
  assert.match(html, /\/api\/auth\/login/);
});

test("mantém a logo principal com transparência", async () => {
  const png = await readFile(resolve(root, "public/titan-nfse-logo-transparent.png"));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png[25], 6);
});

test("mantém emissão real restrita sem sucesso simulado", async () => {
  const html = await readFile(resolve(root, "public/titan.html"), "utf8");
  assert.match(html, /Produção Restrita/);
  assert.doesNotMatch(html, /Simulação concluída/);
  assert.match(html, /Documento sem validade fiscal, emitido no ambiente oficial de testes/);
});

test("oferece documentos e cancelamento oficial sem identidade visual", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/\/api\/invoices\/'\+id\+'\/xml/);
  assert.match(html,/\/api\/invoices\/'\+id\+'\/danfse/);
  assert.match(html,/Gerando DANFSe com dados reais/);
  assert.match(html,/X-Confirm-Cancellation/);
  assert.match(html,/Cancelar NFS-e oficialmente/);
  assert.doesNotMatch(html,/v-marca/);
});

test("DANFSe abre isolado num iframe sandbox, nunca escrito direto na mesma origem do portal", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const fn=html.slice(html.indexOf("async function abrirDanfse"),html.indexOf("async function reenviarEmailNota"));
  // o HTML do DANFSe (dado que passou pelo cliente) nunca é escrito direto no
  // document da aba/janela — sempre por dentro de um iframe sandbox sem
  // allow-same-origin, então mesmo um furo de escape no servidor não alcança
  // sessionStorage nem a janela autenticada do portal
  assert.doesNotMatch(fn,/document\.write\(html\)/);
  // srcdoc (conteúdo embutido), não um segundo blob: URL referenciado de
  // dentro da aba aberta por window.open — um blob criado numa janela e
  // consumido noutra é o tipo de coisa que Safari/iOS trata de forma
  // inconsistente entre contextos, diferente de Chrome. allow-scripts porque
  // o layout DANFSe v2.0 é populado por script embutido no próprio HTML;
  // allow-same-origin continua de fora — combinado com allow-scripts seria o
  // padrão documentado como inseguro (daria acesso à origem real do portal).
  // Nem "Baixar XML" nem "Salvar PDF" tocam o conteúdo do iframe — os dois
  // só mandam postMessage pro opener, que baixa o arquivo pela API — então
  // não há mais nenhuma dependência de allow-modals aqui.
  // [^>]* tolera atributos no iframe (hoje id="danfseFrame"). O que importa
  // travar é sandbox="allow-scripts" + srcdoc a partir de esc(html) — a
  // ausência de allow-same-origin continua garantida pela asserção logo abaixo.
  assert.match(fn,/<iframe sandbox="allow-scripts"[^>]*srcdoc="'\+esc\(html\)\+'"><\/iframe>/);
  assert.doesNotMatch(fn,/sandbox="[^"]*allow-same-origin/);
  assert.match(fn,/tab\.document\.write\(wrapperHtml\)/);
  // window.open() precisa ser chamado ANTES de qualquer await (ainda dentro
  // do gesto de clique) em qualquer plataforma — depois de um fetch, o
  // navegador já não credita a chamada como resposta direta ao toque, e
  // window.open()/clique em <a target=_blank> pra um blob: são bloqueados
  // em silêncio. Por isso não há distinção por user agent aqui: tab= vem
  // logo no começo da função, sem esperar isMobile.
  assert.doesNotMatch(fn,/isMobile/);
  assert.match(fn,/^\s*let tab=window\.open\('','_blank'\);/m);
  // charset explícito: o fallback (só quando window.open foi bloqueado
  // mesmo tendo sido chamado no gesto de clique) navega direto pro blob:
  // (único ponto com round-trip de bytes de verdade) — sem isso, acento em
  // nome de tomador/serviço saía corrompido
  assert.match(fn,/<!doctype html><meta charset="utf-8"><title>DANFSe<\/title>/);
  assert.match(fn,/new Blob\(\[wrapperHtml\],\{type:'text\/html;charset=utf-8'\}\)/);
  // Botões "Baixar XML" e "Salvar PDF" da barra dependem de
  // window.opener.postMessage no documento aberto. No fallback (abertura
  // via <a target=_blank> pra um blob:), rel="noopener" deixaria
  // window.opener nulo e o clique quebrava em silêncio; rel="opener" mantém
  // o vínculo — o conteúdo é gerado por este mesmo código, então preservar
  // o opener não expõe nada.
  assert.match(fn,/a\.rel='opener'/);
  assert.doesNotMatch(fn,/a\.rel='noopener'/);
  // "Salvar PDF" baixa o PDF real da API (GET /:id/pdf) via postMessage —
  // não abre mais o diálogo de impressão do navegador (contentWindow.print
  // levantava SecurityError pelo sandbox opaco, e window.print() de dentro
  // do próprio iframe era bloqueado em silêncio sem allow-modals; os dois
  // problemas somem trocando "imprimir" por "baixar o arquivo de verdade").
  assert.doesNotMatch(fn,/imprimirDanfse/);
  assert.doesNotMatch(fn,/printDanfse/);
  assert.doesNotMatch(fn,/\.print\(\)/);
  assert.match(fn,/onclick="baixarPdf\(\)"/);
  assert.match(fn,/function baixarPdf\(\)\{window\.opener\.postMessage\(\{titan:\\'baixarPdf\\',invoiceId:/);
  // número da NFS-e viaja junto pro nome do arquivo ter sentido mesmo se o
  // Content-Disposition do servidor falhar por algum motivo
  assert.match(fn,/numero:\\''\+esc\(numero\|\|''\)\+'\\'/);
  assert.match(fn,/empresa:\\''\+esc\(empresa\|\|''\)\+'\\'/);
});

test("isola as rotas do master e de cada CNPJ",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  const route=await readFile(resolve(root,"app/[[...tenant]]/page.tsx"),"utf8");
  assert.match(html,/PORTAL_ADMIN/);
  assert.match(html,/PORTAL_CNPJ/);
  assert.match(html,/class="sb-mark" href="\/" target="_top"/);
  assert.match(html,/class="login-brand" href="\/" target="_top"/);
  assert.match(html,/não possui acesso liberado para o CNPJ/);
  assert.match(html,/const handoff=btoa\(binary\),url=`\/dashboard#handoff=/);
  assert.match(html,/new URL\('\/dashboard',location\.origin\)/);
  assert.match(route,/\["admin", "adm"\]/);
  assert.match(route,/isAdmin \? "admin" : isHelp \? "help"/);
  assert.match(route,/target\.toLowerCase\(\) === "dashboard"/);
  assert.match(html,/portal do gestor é exclusivo para usuários, perfis e liberações/);
  assert.match(html,/class="sb-nav admin-sidebar"/);
  assert.match(html,/admin-company-search/);
  assert.match(html,/selecionarEmpresaAdmin/);
  assert.match(html,/abrirEmpresaEmissao/);
  assert.match(html,/Gestão por CNPJ/);
  assert.match(html,/Usuário do CNPJ/);
  assert.match(html,/CNPJ é a referência da gestão/);
  assert.match(html,/Um CNPJ por usuário responsável/);
  assert.match(html,/class="modal-backdrop modal-wide" id="master-company-modal"/);
  assert.match(html,/Editar cliente/);
  assert.match(html,/Convidar usuário/);
  assert.match(html,/async function abrirDetalhesCliente/);
  assert.match(html,/async function salvarDetalhesCliente/);
  assert.match(html,/\/api\/master\/users\/'\+userId/);
  assert.match(html,/function prepararUsuarioPendente/);
  assert.match(html,/function entrarComSessaoSalva/);
  assert.match(html,/entrarComSessaoSalva\(\)\.catch/);
  assert.match(html,/abrirAreaAutenticada\(access\)/);
  assert.match(html,/async function selecionarEmpresaAdmin\(companyId\)[\s\S]{0,350}abrirEmpresaEmissao\(companyId\)/);
  assert.match(html,/Preparando o ambiente fiscal da empresa/);
  assert.match(html,/Sem usuário ativo/);
  assert.doesNotMatch(html,/mode:"master_impersonation"/);
  assert.match(html,/Gestão por CNPJ/);
  assert.doesNotMatch(html,/Gestão de Usuários/);
  assert.doesNotMatch(html,/data-master-tab="usuarios"/);
  assert.match(css,/background:transparent;border:0/);
  assert.match(css,/object-fit:contain/);
  // Perfis de acesso granulares foram descontinuados (12/08/2026, pedido do
  // usuário: "O PERFIL é Admin, parceiro e cliente, só!") — a aba "Perfis de
  // Acesso" não fica mais alcançável pelo menu.
  assert.doesNotMatch(html,/data-master-tab="perfis"/);
});

test("consulta CNPJ preenche emitente e endereço do tomador", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/consultarCnpjEmitente\(\)/);
  assert.match(html,/\/api\/company\/lookup\/cnpj\//);
  assert.match(html,/id="t-cidade"/);
  assert.match(html,/id="t-uf"/);
  assert.match(html,/id="cl-cidade"/);
  assert.match(html,/id="cl-uf"/);
  assert.match(html,/id="t-municipio"/);
  assert.match(html,/postalCode:qs\('#t-cep'\)/);
  assert.match(html,/Regime de Apuração Tributária pelo SN/);
  assert.match(html,/Normal — tributos federais e municipal pelo SN/);
  assert.match(html,/Híbrido — federal pelo SN e ISSQN fora do SN/);
  assert.doesNotMatch(html,/Regime de caixa/);
  assert.doesNotMatch(html,/Regime especial informado/);
});

test("oferece municípios pesquisáveis, rascunhos, clientes e documentos comerciais", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/Pesquise o município pelo nome/);
  assert.match(html,/\/api\/locations\/municipalities/);
  assert.match(html,/id="v-rascunhos"/);
  assert.match(html,/v-clientes/);
  assert.match(html,/v-comercial/);
  assert.match(html,/Converter em NFS-e/);
});

test("tem landing TITAN NFS-e, formulário comercial e trajeto compacto", async()=>{
  const landing=await readFile(resolve(root,"public/nfs.html"),"utf8");
  const landingCss=await readFile(resolve(root,"public/nfs.css"),"utf8");
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // A landing foi redesenhada (headline, benefícios e comparação com o Portal
  // Nacional) — as asserções abaixo casam com o conteúdo real de hoje, não
  // com headlines antigos já substituídos em rodadas anteriores.
  assert.match(landing,/Agilize a emissão da sua nota fiscal <span>com o TITAN NFS-e\.<\/span>/);
  assert.match(landing,/\/api\/contact/);
  assert.match(landing,/titan-nfse-logo-transparent\.png/);
  assert.match(landing,/\/api\/system\/branding/);
  assert.match(landing,/carregarBrandingPortal/);
  assert.match(landing,/Cadastre uma vez, emita em segundos, no sistema ou mandando um áudio pro Martyn no WhatsApp\./);
  // Reorganização de 19/08/2026 (pedido do usuário: Problema → Solução →
  // Demonstração → Planos → Contratação). O título antigo da seção de
  // benefícios ("Muito mais que uma tela para emitir notas") deu lugar à
  // dupla problema/solução — travar as duas garante que a narrativa nova
  // não seja desfeita sem querer.
  assert.match(landing,/<div class="eyebrow">O problema<\/div>/);
  assert.match(landing,/Emitir direto no Portal Nacional custa mais do que parece/);
  assert.match(landing,/<div class="eyebrow">A solução<\/div>/);
  assert.match(landing,/O TITAN faz o mesmo Portal Nacional lembrar o que você já digitou/);
  assert.match(landing,/id="login-drawer"/);
  assert.match(landing,/client-login-form/);
  assert.match(landing,/admin-login-form/);
  assert.match(landing,/authLogin\(\{federalTaxId:cnpj,password\}\)/);
  assert.match(landing,/authLogin\(\{email,password\}\)/);
  assert.doesNotMatch(landing,/location\.replace\(access\.user\.isMaster/);
  assert.match(landing,/<nav class="footer-links" aria-label="Navegação e documentos legais">/);
  assert.match(landing,/href="\/termos-de-uso">Termos de Uso<\/a>/);
  assert.match(landing,/href="\/politica-de-privacidade">Privacidade<\/a>/);
  assert.match(landing,/href="\/exclusao-de-dados">Exclusão de Dados<\/a>/);
  assert.match(landingCss,/\.footer-links a\{[^}]*font-size:12\.5px[^}]*text-decoration:none/);
  assert.match(landingCss,/\.footer-links a:hover,\.footer-links a:focus-visible\{color:var\(--gold\)\}/);
  assert.match(html,/pipe-detail/);
  assert.match(html,/mostrarDetalheEtapa/);
  assert.match(html,/journey-card/);
  assert.doesNotMatch(html,/Os dados abaixo montam/);
});

test("raiz limpa (sem /nfs) separa os acessos de cliente e administrador",async()=>{
  const index=await readFile(resolve(root,"public/index.html"),"utf8");
  const route=await readFile(resolve(root,"app/[[...tenant]]/page.tsx"),"utf8");
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(index,/<iframe class="prototype-frame" src="\/nfs\.html" title="TITAN NFS-e">/);
  assert.doesNotMatch(index,/location\.replace\('\/'/);
  assert.match(index,/if\(location\.hostname!=='nfse\.titanbackoffice\.com\.br'\)window\.top\.location\.replace\('https:\/\/nfse\.titanbackoffice\.com\.br'/);
  assert.match(route,/tenant\.length === 0/);
  assert.match(route,/target\.toLowerCase\(\) === "entrar"/);
  assert.match(route,/src="\/nfs\.html\?login=client"/);
  assert.match(html,/Sou administrador master/);
  assert.match(html,/function redirecionarParaLoginUnico/);
  assert.match(html,/target\.searchParams\.set\('login',PORTAL_ADMIN\?'admin':'client'\)/);
  assert.match(html,/target\.searchParams\.set\('tenant',PORTAL_CNPJ\)/);
  assert.match(html,/target\.searchParams\.set\('next',window\.top\.location\.pathname\+\(window\.top\.location\.search\|\|''\)\)/);
  assert.match(html,/qs\('#login-context-link'\)\.href='\/\?login=client'/);
  const landing=await readFile(resolve(root,"public/nfs.html"),"utf8");
  assert.match(landing,/const loginButton=.*PAGE_QUERY=new URLSearchParams\(location\.search\)/);
  assert.match(landing,/function aplicarIntencaoLogin/);
  assert.match(landing,/openLoginDrawer\(intent==='admin'\?'admin':'client'\)/);
  assert.match(landing,/function navegarAposLogin\(defaultTarget\)\{window\.top\.location\.href=safeNext\(defaultTarget\)\}/);
  // safeNext valida a origem de verdade (new URL().origin) em vez de um regex de
  // prefixo — "/\evil.com" passava no regex antigo (começa com "/", segundo
  // caractere não é "/") mas o navegador normaliza "\" para "/" e navega para
  // fora do site; new URL() já resolve isso e recusa qualquer origem diferente.
  assert.match(landing,/function safeNext\(defaultTarget\)\{const next=PAGE_QUERY\.get\('next'\)\|\|'';if\(!next\)return defaultTarget;try\{const url=new URL\(next,location\.origin\);return url\.origin===location\.origin\?url\.pathname\+url\.search\+url\.hash:defaultTarget\}catch\{return defaultTarget\}\}/);
  // Fase F: o mesmo formulário de e-mail agora também abre o Portal do
  // Parceiro — vai para /admin ou /parceiro conforme o que o login devolver.
  assert.match(landing,/navegarAposLogin\(access\.user\.isMaster\?'\/admin':'\/parceiro'\)/);
  assert.match(landing,/navegarAposLogin\('\/dashboard'\)/);
  assert.doesNotMatch(landing,/[^.]location\.href=safeNext/);
  assert.doesNotMatch(landing,/\/nfs\//);
  assert.doesNotMatch(html,/href="\/nfs["?]/);
  assert.match(html,/servidor fiscal demorou para responder/i);
});

test("integra documentos comerciais, clientes e gestão exclusiva do master",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/Número de controle \(automático\)/);
  assert.match(html,/co-customer-list/);
  assert.match(html,/selecionarClienteComercial/);
  assert.match(html,/document_number/);
  assert.match(html,/admin-company-switch/);
  assert.match(html,/Esta área é exclusiva do administrador master/);
  assert.match(html,/titan-nfse-logo-transparent\.png/);
});

test("usa login por CNPJ e expõe NBS e retenções condicionais",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/federalTaxId/);
  assert.match(html,/Entre com o CNPJ da empresa e sua senha individual exclusiva/);
  assert.match(html,/id="s-nbs"/);
  assert.match(html,/id="cad-nbs"/);
  assert.match(html,/id="s-pis-cofins-fields"/);
  assert.match(html,/tipoPisCofins!==''&&tipoPisCofins!=='0'/);
  assert.match(html,/pisCofinsBase/);
});

test("aceita CNPJ alfanumérico em todos os fluxos do portal",async()=>{
  const landing=await readFile(resolve(root,"public/nfs.html"),"utf8");
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(landing,/function normalizeTaxId/);
  assert.match(landing,/\^\[A-Z0-9\]\{12\}\[0-9\]\{2\}\$/);
  assert.match(landing,/AA\.AAA\.AAA\/AAAA-99/);
  assert.match(html,/function normalizarDocumento/);
  assert.match(html,/function cnpjComFormatoValido/);
  assert.match(html,/function mascararDocumento/);
  assert.match(html,/taxId:documento/);
  assert.match(html,/\[A-Z0-9\]\{44,50\}/);
  assert.doesNotMatch(html,/federal_tax_id\|\|''\)\.replace\(\/\\D\/g/);
});

test("centraliza serviços, alimenta orçamentos e oferece assistente com ações",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.doesNotMatch(html,/>Pendências<\/button>/);
  assert.doesNotMatch(html,/>Retenções tributárias<\/button>/);
  assert.match(html,/>Meus serviços<\/button>/);
  assert.match(html,/id="co-service"/);
  assert.match(html,/profileId:svc\.id/);
  assert.match(html,/carregarPerfisServico\(\)\.then\(popularServicosComercial\)/);
  assert.match(html,/supExecutarFerramenta/);
  assert.match(html,/supNotaDetalhe/);
  assert.match(html,/Base oficial/);
  assert.match(html,/01\/09\/2026/);
  assert.match(html,/Comunicado oficial CGSN 189\/2026/);
});

test("aciona Martyn IA no widget dedicado de erro de emissão", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="martyn-widget"/);
  assert.match(html,/id="martyn-corpo"/);
  assert.match(html,/function fecharMartyn/);
  assert.match(html,/const MARTYN_TARGETS=/);
  assert.match(html,/function aplicarAcaoMartyn\(action\)/);
  assert.match(html,/emitir:\['s-desc','s-nbs-search','s-cod-search','s-mun-search','t-doc','t-nome','t-mail','t-cep','s-comp','s-ret-pc'\]/);
  assert.match(html,/servicos:\['cad-mun-code','cad-ibscbs-search'\]/);
  assert.match(html,/cert:\['c-file'\]/);
  assert.match(html,/field\.scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/);
  assert.match(html,/field\.classList\.add\('martyn-target'\)/);
  assert.match(html,/async function dispararMartynPorErro\(mensagemErroLog\)/);
  assert.match(html,/api\('\/api\/martyn',\{method:'POST',body:JSON\.stringify\(\{erro:String\(mensagemErroLog\)\.slice\(0,4000\)\}\)\}\)/);
  assert.match(html,/aplicarAcaoMartyn\(dados\.action\)/);
  assert.match(html,/Emissão não autorizada[\s\S]{0,260}dispararMartynPorErro\(error\.message\)/);
  assert.doesNotMatch(html,/fetch\(API_URL\+'\/api\/martyn'/);
});

test("chat interno do Martyn (sup-panel) manda texto livre pra IA de verdade, com memória de conversa", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/async function supPerguntarIA\(texto\)/);
  assert.match(html,/api\('\/api\/martyn',\{method:'POST',body:JSON\.stringify\(\{mensagem:texto,historico:supHistoricoIA\}\)\}\)/);
  assert.match(html,/supHistoricoIA\.push\(\{role:'user',content:texto\},\{role:'assistant',content:dados\.resposta\}\)/);
  assert.match(html,/supHistoricoIA=supHistoricoIA\.slice\(-SUP_HISTORICO_MAX\)/);
  assert.match(html,/aplicarAcaoMartyn\(dados\.action\)/);
  // pergunta digitada vai direto pra IA — sem isso, uma palavra solta que bate
  // com a keyword de um tópico (ex.: "prazo") sequestra a resposta com um
  // texto pronto sem relação com a pergunta de verdade
  assert.doesNotMatch(html,/supMatch\(v\)/);
  assert.match(html,/\n  supPerguntarIA\(v\);\n  return false;/);
  // supMatch some do arquivo inteiro: virou código morto depois que só os
  // chips (clique intencional) continuaram usando os tópicos prontos
  assert.doesNotMatch(html,/function supMatch\(/);
  assert.match(html,/function supChip\(id\)\{if\(id==='diag'\)/);
});

test("preflight fiscal do Martyn confere a nota interativamente antes de emitir",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  // botão e painel na tela de emissão
  assert.match(html,/onclick="abrirPreflight\(\)"[^>]*id="btn-preflight"/);
  assert.match(html,/id="preflight-panel"/);
  // emitir() e o preflight compartilham o MESMO payload — conferir uma nota e
  // emitir outra seria pior que não conferir
  assert.match(html,/async function montarPayloadEmissao\(\)/);
  assert.match(html,/const montagem=await montarPayloadEmissao\(\);/);
  assert.match(html,/\/api\/invoices\/preflight/);
  assert.match(html,/martynFacts:preflightFatos/);
  // só mapeia de volta os fatos que uma pergunta representa sem ambiguidade
  assert.match(html,/const PREFLIGHT_MAPA=\{/);
  assert.match(html,/'csrf-natureza-servico':\{fato:'serviceUnderArt30',tipo:'bool'\}/);
  assert.match(html,/'irrf-perfil-servico':\{fato:'irrfServiceProfile',tipo:'enum'/);
  // pergunta fora do mapa vira orientação para o contador, sem responder pelo cliente
  assert.match(html,/Confirme este ponto com seu contador antes de emitir/);
  // emissão bloqueada não oferece o botão de emitir; a confirmação final destrava
  assert.match(html,/if\(pf\.blocked\)html\+=[\s\S]*?Conferir de novo/);
  assert.match(html,/onchange="qs\('#pf-emitir'\)\.disabled=!this\.checked"/);
  assert.match(css,/\.preflight-panel\{/);
  assert.match(css,/\.pf-head\.pf-err\{background:var\(--err\)\}/);
});

test("entrega catalogo NBS, redefinicao dedicada e contatos comerciais",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  assert.match(html,/\/api\/services\/nbs\/catalog/);
  assert.match(html,/id="s-nbs-search"/);
  assert.match(html,/id="cad-nbs-search"/);
  assert.match(html,/id="reset-screen"/);
  assert.match(html,/function alternarSenha/);
  assert.match(html,/Link temporário necessário/);
  assert.match(html,/copiarTextoSeguro/);
  assert.match(html,/Abrir redefinição/);
  assert.match(html,/Definir senha/);
  assert.match(html,/id="e-email"/);
  assert.match(html,/id="e-phone"/);
  assert.match(html,/class="commercial-letterhead"/);
  assert.match(html,/id="co-observation"/);
  assert.match(html,/id="co-payment"/);
  assert.match(html,/id="co-conditions"/);
  assert.match(html,/\/api\/services\/nbs-suggestions/);
  assert.match(html,/id="s-cno"/);
  assert.match(html,/id="s-event-code"/);
  assert.match(html,/id="s-event-location"/);
  assert.match(html,/id="s-add-same-nature"/);
  assert.match(html,/id="s-composition-lines"/);
  assert.match(html,/id="cad-default-amount"/);
  assert.match(html,/editarUnitComposicao/);
  assert.match(html,/default_amount/);
  assert.doesNotMatch(html,/const amount=Number\(prompt\(`Valor de/);
  assert.match(html,/id="s-cno-options"/);
  assert.match(html,/id="s-event-code-options"/);
  assert.match(html,/class="emit-hero"/);
  assert.match(html,/Resumo da emissão/);
  assert.match(html,/id="emit-side-total"/);
  assert.match(html,/Emissão padrão nacional/);
  assert.match(html,/onclick="abrirEmpresaEmissao\('\$\{c\.id\}'\)"/);
  assert.match(css,/background:linear-gradient\(135deg,var\(--navy\),var\(--navy-2\)\)/);
  assert.doesNotMatch(css,/#e94560/);
  assert.match(html,/\/api\/customers\//);
  assert.match(html,/\/api\/billing\/status/);
  assert.match(html,/\/api\/dasn\/manual/);
  assert.match(html,/id="v-financeiro"/);
  assert.match(html,/id="v-recebimentos"/);
  assert.match(html,/id="v-dasn"/);
  assert.match(html,/Entrar na fila/);
});

test("replica logica de recebimentos com agendamento recorrencia cobranca e NFS-e",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/>Recebimentos<\/button>/);
  assert.match(html,/data-permission="financial"/);
  assert.match(html,/\/api\/workspace\/receivables\/summary/);
  assert.match(html,/\/api\/workspace\/receivables/);
  assert.match(html,/\/api\/workspace\/receivables\/'\+id\+'\/collection-review/);
  assert.match(html,/Agendar recebimento/);
  // Pedido do usuário (19/08/2026): recorrência tem UM lugar só — "Notas
  // recorrentes". O checkbox "É recorrente" que existia neste modal criava a
  // mesma coisa (mesmo POST /api/invoice-recurrences) por um segundo
  // formulário duplicado e sem caminho de edição. Aqui ficou só recebimento
  // avulso + atalho pra tela certa; o GET /api/workspace/recurrences que
  // rodava a cada carregamento (resultado nunca lido) saiu junto.
  assert.doesNotMatch(html,/É recorrente — repete todo mês/);
  assert.doesNotMatch(html,/id="rec-recurring-fields"/);
  assert.doesNotMatch(html,/\/api\/workspace\/recurrences/);
  assert.match(html,/function irParaNovaRecorrencia\(\)/);
  assert.match(html,/onclick="salvarRecebimento\(\)"/);
  assert.match(html,/WhatsApp\/API zap/);
  assert.match(html,/pré-NFS-e pendente/);
  assert.match(html,/function prepararNotaRecebimento/);
  assert.match(html,/Financeiro de honorários/);
  assert.match(html,/Rascunhos financeiros/);
  assert.match(html,/Boletos \(rascunho\)/);
  // Linguagem voltada ao cliente pagante, não jargão de governança interna —
  // mesma informação honesta (o que está pronto vs. em desenvolvimento).
  assert.match(html,/Recebíveis de honorários, recorrências, cobrança revisada e pré-NFS-e já estão disponíveis\. Boletos, conciliação bancária, contas a pagar e automações adicionais estão em desenvolvimento\./);
  assert.doesNotMatch(html,/MVP aprovado pelo conselho/);
});

test("protege e otimiza login e redefinicao de senha no front",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/function definirCarregandoLogin/);
  assert.match(html,/function mostrarErroLogin/);
  assert.match(html,/function removerParametroSensivel\(name\)/);
  assert.match(html,/removerParametroSensivel\('token'\)/);
  assert.match(html,/PORTAL_ROUTE==='redefinir-senha'\|\|PORTAL_ROUTE==='redefinirsenha'\?'reset'/);
  assert.match(html,/else if\(PORTAL_RESET\)\{prepararRedefinicao\(PORTAL_QUERY\.get\('token'\)\);\}/);
  assert.match(html,/Dados de acesso inválidos/);
  assert.match(html,/master-reset-link-panel/);
  assert.match(html,/Link de redefinição gerado/);
  assert.match(html,/senha do Master não é redefinida por CNPJ/);
  assert.match(html,/gerarRedefinicaoSenha\('\$\{u\.id\}','\$\{c\.id\}'\)/);
  assert.match(html,/CNPJ da empresa:/);
  assert.match(html,/info\.federalTaxId/);
  assert.doesNotMatch(html,/Conta: \$\{info\.email/);
  assert.match(html,/id="system-dialog"/);
  assert.match(html,/id="system-dialog-message"/);
  assert.match(html,/system-dialog-dot/);
  assert.match(html,/const isAlert=mode==='alert';const detailed=!isAlert&&\(mode!=='alert'\|\|content\.length>180\|\|content\.includes\('\\n'\)\)/);
  assert.match(html,/id="system-dialog-x"/);
  assert.match(html,/actions\.style\.display=isAlert\?'none':'flex';xClose\.style\.display=isAlert\?'grid':'none'/);
  assert.match(html,/text\.style\.display=detailed\?'block':'none'/);
  assert.match(html,/copy\.style\.display=detailed\?'inline-flex':'none'/);
  assert.match(html,/window\.alert=\(message\)=>\{titanAlert\(message\)\}/);
  assert.match(html,/function titanConfirm/);
  assert.match(html,/function titanPrompt/);
  assert.doesNotMatch(html,/Informe seu nome e uma senha com pelo menos 10 caracteres/);
  assert.doesNotMatch(html,/class="alert a-info"><div><b id="system-dialog-label"/);
  assert.doesNotMatch(html,/\bconfirm\(/);
  assert.doesNotMatch(html,/\bprompt\(/);
  assert.doesNotMatch(html,/prompt\('Copie o link de redefinição/);
  assert.doesNotMatch(html,/alert\(`Abrir redefinição/);
  assert.doesNotMatch(html,/Senha inválida\.<\/b>/);
  assert.match(html,/\['li-cnpj','li-mail','li-pw'\]\.forEach/);
  assert.match(html,/\['reset-password','reset-password-confirm'\]\.forEach/);
});

test("convite operacional cria apenas senha e confirmação",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const inviteFlow=html.slice(html.indexOf("async function prepararConvite"),html.indexOf("async function prepararRedefinicao"));
  assert.match(inviteFlow,/Criar sua senha/);
  assert.match(inviteFlow,/label\[for="li-pw"\][\s\S]{0,80}Crie sua senha/);
  assert.match(inviteFlow,/label\[for="li-pw-confirm"\][\s\S]{0,100}Confirme sua senha/);
  assert.match(inviteFlow,/closest\('\.login-field'\)\.style\.display='none'/);
  assert.match(inviteFlow,/JSON\.stringify\(\{password,confirmation\}\)/);
  assert.doesNotMatch(inviteFlow,/readOnly=true/);
  assert.doesNotMatch(inviteFlow,/Nome completo/);
  assert.doesNotMatch(inviteFlow,/Seu nome completo/);
  assert.doesNotMatch(inviteFlow,/JSON\.stringify\(\{name,password\}\)/);
});

test("planos SaaS abrem em modal separado, com preço e valores reais buscados da API (não mais expostos direto na home)",async()=>{
  // Pedido do usuário: a home não expõe preço fixo — abre um modal separado
  // ("Consultar planos") que busca os planos reais (com preço) da API.
  const html=await readFile(resolve(root,"public/nfs.html"),"utf8");
  assert.match(html,/id="planos"/);
  assert.match(html,/id="planos-modal-backdrop"/);
  assert.match(html,/id="pricing-grid"/);
  assert.match(html,/function abrirPlanosModal\(\)/);
  assert.match(html,/fetch\(\(window\.TITAN_API_URL\|\|''\)\.replace\(\/\\\/\$\/,''\)\+'\/api\/onboarding\/plans'\)/);
  assert.match(html,/price-card custom/);
  assert.match(html,/Sob consulta/);
});

test("FAQ sobre a migração de 01\\/09 vive em rota própria (\\/faq), linkada a partir da landing",async()=>{
  // O FAQ deixou de ser uma seção dentro de nfs.html e virou rota própria
  // (app/faq/page.tsx) — a landing só linka pra ela (nav e rodapé).
  const landing=await readFile(resolve(root,"public/nfs.html"),"utf8");
  const faq=await readFile(resolve(root,"app/faq/page.tsx"),"utf8");
  assert.match(landing,/href="\/faq">Dúvidas<\/a>/);
  assert.match(faq,/Preciso mesmo migrar até 01\/09\?/);
  // A rota é data-driven (PERGUNTAS.map(...)) — só existe um <summary> literal
  // no JSX-fonte, então contar perguntas de verdade é contar entradas do array.
  assert.match(faq,/<details className="faq-item" key=\{item\.pergunta\}>/);
  assert.match(faq,/<summary>\{item\.pergunta\}<\/summary>/);
  const perguntas=faq.match(/pergunta:/g)||[];
  assert.ok(perguntas.length>=6);
});

test("não expõe mais configuração de e-mail dos clientes nem o arquivamento fiscal no Google Drive",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/Envio de NFS-e ao tomador/);
  assert.match(html,/Identidade visual do portal/);
  assert.match(html,/id="set-portal-logo"/);
  assert.match(html,/portalLogoDataUrl/);
  assert.match(html,/function prepararLogoPortalMaster/);
  assert.match(html,/\/api\/system\/branding/);
  // Item 8 da auditoria de lançamento: era só o toggle, zero implementação
  // real por trás (nenhum código de verdade subia arquivo pro Drive) —
  // removido do Master por completo, não só desabilitado, pra não passar a
  // falsa impressão de um backup que não existe.
  assert.doesNotMatch(html,/Arquivo fiscal no Google Drive/);
  assert.doesNotMatch(html,/id="set-drive-enabled"/);
  assert.doesNotMatch(html,/id="set-drive-folder"/);
  assert.doesNotMatch(html,/id="set-drive-service-email"/);
  assert.doesNotMatch(html,/id="set-drive-key"/);
  assert.doesNotMatch(html,/id="master-drive-state"/);
  assert.doesNotMatch(html,/googleDriveArchiveEnabled/);
  assert.doesNotMatch(html,/hasGoogleDriveServiceAccountKey/);
  // src/email/nfseEmail.ts sempre usa Resend com remetente fixo
  // (nfse@titanbackoffice.com.br), ignorando qualquer provedor configurado
  // pelo cliente — por isso o seletor de provedor e os blocos de credencial
  // de Gmail/Outlook foram removidos por completo, não só desabilitados.
  assert.match(html,/Sempre pelo remetente padrão da TITAN\./);
  assert.match(html,/nfse@titanbackoffice\.com\.br via Resend/);
  assert.doesNotMatch(html,/Gmail \/ Google Workspace/);
  assert.doesNotMatch(html,/Outlook \/ Microsoft 365/);
  assert.doesNotMatch(html,/id="set-invoice-email-provider"/);
  assert.doesNotMatch(html,/id="set-invoice-email-from"/);
  assert.doesNotMatch(html,/id="set-invoice-email-reply"/);
  assert.doesNotMatch(html,/id="set-gmail-client-id"/);
  assert.doesNotMatch(html,/id="set-gmail-secret"/);
  assert.doesNotMatch(html,/id="set-gmail-refresh"/);
  assert.doesNotMatch(html,/id="set-outlook-tenant"/);
  assert.doesNotMatch(html,/id="set-outlook-client-id"/);
  assert.doesNotMatch(html,/id="set-outlook-secret"/);
  assert.doesNotMatch(html,/id="set-outlook-user"/);
  assert.doesNotMatch(html,/id="master-invoice-email-state"/);
  // salvarConfiguracoesMaster() e o carregamento não podem mais referenciar
  // esses ids — senão dariam TypeError ao rodar (qs(...) retornaria null)
  assert.doesNotMatch(html,/invoiceEmailProvider:qs/);
  assert.doesNotMatch(html,/gmailClientId:qs/);
  assert.doesNotMatch(html,/outlookTenantId:qs/);
});

test("envia NFS-e por e-mail com copia cadastrada e reenvio manual",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const logo=await readFile(resolve(root,"public/assets/logo-email-titan-nfse.png"));
  assert.ok(logo.length>1000);
  assert.match(html,/id="cl-mail-alt"/);
  assert.match(html,/E-mail alternativo \(recebe cópia\)/);
  assert.match(html,/emailAlt:qs\('#cl-mail-alt'\)\.value\.trim\(\)\|\|undefined/);
  assert.match(html,/emailSentAt:row\.email_sent_at\|\|''/);
  assert.match(html,/emailProviderId:row\.email_provider_id\|\|''/);
  assert.match(html,/emailLastError:row\.email_last_error\|\|''/);
  assert.match(html,/Reenviar por e-mail/);
  assert.match(html,/function reenviarEmailNota/);
  assert.match(html,/\/api\/invoices\/'\+encodeURIComponent\(id\)\+'\/email/);
  assert.match(html,/E-mail enviado para \$\{esc\(result\.email_to\)\}/);
  assert.match(html,/ID \$\{esc\(x\.emailProviderId\)\}/);
  assert.match(html,/E-mail enviado para \$\{result\.to\}\$\{result\.providerId\?' · ID '\+result\.providerId:''\}/);
});

test("Master lista empresas suspensas em subtela propria com reativacao",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  // Suspender uma empresa nao pode mais fazer ela sumir da Gestao por CNPJ.
  assert.match(html,/id="master-count-ativas"/);
  assert.match(html,/id="master-count-suspensas"/);
  assert.match(html,/id="master-suspended-note"/);
  assert.match(html,/onclick="mostrarSubtelaClientes\('ativas',this\)"/);
  assert.match(html,/onclick="mostrarSubtelaClientes\('suspensas',this\)"/);
  assert.match(html,/function empresaSuspensa\(c\)\{return c\.emission_enabled===false\}/);
  assert.match(html,/if\(masterClientView==='suspensas'\?!empresaSuspensa\(c\):empresaSuspensa\(c\)\)return false/);
  assert.match(html,/async function reativarEmpresaMaster\(companyId\)/);
  assert.match(html,/Reativar emissão<\/button>/);
  assert.match(html,/titanConfirm\(`A emissão de NFS-e de \$\{nome\} será liberada de novo/);
  assert.match(html,/emissionEnabled:true,implementationStatus:empresa\.implementation_status/);
  // o seletor de empresas do admin continua listando apenas as liberadas
  assert.match(html,/empresasAdmin=\(companies\|\|\[\]\)\.filter\(c=>c\.emission_enabled\)\.map/);
  assert.match(css,/\.client-subtab-btn\.on/);
});

test("sessão administrativa do Master exibe faixa persistente de impersonação",async()=>{
  // POST /master/companies/:id/session emite token de 20min com impersonatedBy
  // — nada avisava na tela que o operador estava atuando como a empresa X.
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  assert.match(html,/const STORAGE_IMPERSONATING='titan_nfse_impersonating_v1'/);
  assert.match(html,/function faixaImpersonacao\(\)\{/);
  assert.match(html,/Sessão administrativa — operando como/);
  // gravado dentro de entrarViaGestor (único caminho que consome o handoff do
  // Master) e limpo em sairPortal — persiste num reload da mesma aba e nunca
  // vaza pra aba original do painel Master (sessionStorage é por aba)
  // As chamadas individuais de sessionStorage.setItem viraram uma só
  // salvarSessaoLocal([[chave,valor],...]) — mesmo efeito, uma chamada batched.
  assert.match(html,/\[STORAGE_IMPERSONATING,data\.companies\[0\]\.trade_name\|\|data\.companies\[0\]\.legal_name\|\|'empresa selecionada'\]/);
  assert.match(html,/sessionStorage\.removeItem\(STORAGE_IMPERSONATING\)/);
  assert.match(html,/render\(\);faixaImpersonacao\(\);PORTAL_HELP/);
  assert.match(html,/^faixaImpersonacao\(\);$/m);
  assert.match(css,/#impersonation-banner\{/);
  // top fixo em 38px só cobria o caso de uma linha — nome de empresa comprido
  // ou janela estreita quebra a faixa (flex-wrap:wrap) e a altura de verdade
  // passa de 38px, cobrindo o topo do menu. --imp-h é medida em JS a partir da
  // altura real do elemento (faixaImpersonacao), com 38px só como valor do
  // primeiro paint, antes da medição.
  assert.match(css,/html\.impersonating \.sidebar,html\.impersonating \.topbar\{top:var\(--imp-h,38px\)\}/);
  const funcaoFaixa=html.slice(html.indexOf("function faixaImpersonacao"),html.indexOf("function go(v,el)"));
  assert.match(funcaoFaixa,/document\.documentElement\.style\.setProperty\('--imp-h',faixa\.offsetHeight\+'px'\)/);
  assert.match(funcaoFaixa,/new ResizeObserver\(medir\)\.observe\(faixa\)/);
});

test("logs de auditoria do Master filtram por ator (e-mail) e por ação",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="master-log-actor"/);
  assert.match(html,/id="master-log-action"/);
  assert.match(html,/function limparFiltrosLogsMaster\(\)/);
  assert.match(html,/if\(actorEmail\)params\.set\('actorEmail',actorEmail\);if\(action\)params\.set\('action',action\)/);
});

test("Master aplica verificação de inadimplência sob demanda e vê o total de notas do mês",async()=>{
  // POST /api/billing/enforce já existia mas não estava ligado a nada na tela.
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/onclick="aplicarBloqueioInadimplenciaMaster\(\)"/);
  assert.match(html,/async function aplicarBloqueioInadimplenciaMaster\(\)\{/);
  assert.match(html,/await api\('\/api\/billing\/enforce',\{method:'POST'\}\)/);
  // A contagem de bloqueadas passou a vir pronta do backend (data.blocked),
  // em vez de filtrar um array de resultados no cliente.
  assert.match(html,/\$\{data\.checked\|\|0\} empresa\(s\) verificada\(s\) · \$\{data\.blocked\|\|0\} bloqueada\(s\) por inadimplência agora\./);
  assert.match(html,/id="master-monthly-invoices"/);
  assert.match(html,/masterData\.monthlyAuthorizedInvoices/);
});

test("busca de empresas no painel Master vai pro servidor, não filtra mais a lista inteira no cliente",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/oninput="buscarClientesMaster\(\)"/);
  assert.match(html,/function buscarClientesMaster\(\)\{/);
  assert.match(html,/masterClientSearchDebounce=setTimeout\(\(\)=>carregarMaster\(\),320\)/);
  assert.match(html,/const params=new URLSearchParams\(\);if\(masterClientSearchTerm\)params\.set\('search',masterClientSearchTerm\)/);
  assert.match(html,/masterData=await api\('\/api\/master\/overview'\+\(params\.toString\(\)\?'\?'\+params\.toString\(\):''\)\)/);
  // o filtro por nome de usuário/e-mail do usuário saiu do cliente (o backend
  // só casa nome/CNPJ/e-mail da empresa) — a função não lê mais o valor bruto
  // do campo de busca pra montar um array de candidatos e comparar substring
  assert.doesNotMatch(html,/user\.name,user\.email,user\.profile_name,user\.partner_nickname\]\.some/);
  assert.match(html,/id="master-companies-truncated"/);
});

test("suspender/liberar acesso de usuário e reativar empresa atualizam a tabela sem recarregar o painel Master inteiro",async()=>{
  // carregarMaster() refaz GET /master/overview inteiro (empresas+usuários+
  // perfis+convites+parceiros+planos) — os dois fluxos mais comuns do dia a
  // dia trocaram isso por atualização local + re-render só da tabela afetada.
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const salvarAcesso=html.slice(html.indexOf("async function salvarAcesso(userId,companyId,active){"),html.indexOf("async function gerarRedefinicaoSenha"));
  assert.match(salvarAcesso,/const alvo=masterData\?\.users\.find\(item=>item\.id===userId&&item\.company_id===companyId\)/);
  assert.match(salvarAcesso,/if\(alvo\)alvo\.access_active=data\.active;/);
  assert.match(salvarAcesso,/renderMasterClients\(\)/);
  assert.doesNotMatch(salvarAcesso,/carregarMaster\(\)/);

  const reativar=html.slice(html.indexOf("async function reativarEmpresaMaster(companyId){"),html.indexOf("async function ",html.indexOf("async function reativarEmpresaMaster(companyId){")+10));
  assert.match(reativar,/Object\.assign\(empresa,data\)/);
  assert.match(reativar,/configurarEmpresasAdmin\(masterData\.companies\)/);
  assert.match(reativar,/renderMasterClients\(\)/);
  assert.doesNotMatch(reativar,/carregarMaster\(\)/);
});

test("menu lateral no mobile fecha ao tocar fora, no Escape e ao escolher item",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  // O fundo escuro precisa ser um elemento de verdade: antes era um box-shadow
  // de 100vmax, que pinta a tela mas nao recebe clique nenhum.
  assert.match(html,/id="sb-backdrop"[^>]*onclick="fecharMenuLateral\(\)"/);
  assert.doesNotMatch(css,/box-shadow:0 0 0 100vmax/);
  assert.match(css,/\.sidebar-backdrop\{display:none\}/);
  assert.match(css,/\.sidebar-backdrop\.on\{opacity:1;pointer-events:auto\}/);
  // o burger passa pela funcao central, nao mais por um toggle solto
  assert.match(html,/id="sb-burger"[^>]*onclick="alternarMenuLateral\(\)"/);
  assert.match(html,/aria-controls="sb" aria-expanded="false"/);
  assert.doesNotMatch(html,/getElementById\('sb'\)\.classList\.toggle\('open'\)/);
  assert.match(html,/function alternarMenuLateral\(forcar\)/);
  assert.match(html,/qs\('#sb-burger'\)\?\.setAttribute\('aria-expanded',String\(aberto\)\)/);
  assert.match(html,/if\(event\.key==='Escape'&&qs\('#sb'\)\?\.classList\.contains\('open'\)\)fecharMenuLateral\(\)/);
  // navegar por um item tambem fecha — vale para os dois menus:
  // go() no portal do usuario e masterTab() no painel Adm. Sem o masterTab,
  // no celular a gaveta ficava aberta por cima do painel recem-aberto.
  assert.match(html,/fecharMenuLateral\(\);\n {2}window\.scrollTo\(0,0\)/);
  const masterTabFn=html.match(/function masterTab\(tab,button\)\{[\s\S]*?\n\}/)[0];
  assert.match(masterTabFn,/fecharMenuLateral\(\)/);
});

test("portal expoe manifest e icones proprios para instalacao e empacotamento",async()=>{
  const manifest=JSON.parse(await readFile(resolve(root,"public/manifest.webmanifest"),"utf8"));
  const layout=await readFile(resolve(root,"app/layout.tsx"),"utf8");
  const headers=await readFile(resolve(root,"public/_headers"),"utf8");

  // criterios que o Chrome exige para considerar o site instalavel
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.start_url,"/");
  assert.equal(manifest.scope,"/");
  assert.ok(manifest.name&&manifest.short_name);
  assert.equal(manifest.background_color,"#0b1629");
  assert.equal(manifest.theme_color,"#0b1629");
  const tamanhos=manifest.icons.map(i=>i.sizes);
  assert.ok(tamanhos.includes("192x192"),"falta o icone 192x192");
  assert.ok(tamanhos.includes("512x512"),"falta o icone 512x512");
  assert.ok(manifest.icons.some(i=>String(i.purpose||"").split(" ").includes("maskable")),"falta icone maskable");

  assert.match(layout,/manifest: "\/manifest\.webmanifest"/);
  assert.match(layout,/themeColor: "#0b1629"/);
  assert.match(layout,/apple: "\/icons\/apple-touch-icon\.png"/);

  // o _headers do repo substitui o que o vinext gera, entao a regra de cache
  // imutavel dos assets com hash precisa continuar declarada aqui
  assert.match(headers,/\/manifest\.webmanifest\r?\n {2}Content-Type: application\/manifest\+json/);
  assert.match(headers,/\/assets\/\*\r?\n {2}Cache-Control: public, max-age=31536000, immutable/);
});

test("páginas legais estáticas (public/*.html) são a única fonte, completas e consistentes",async()=>{
  // Achado 16/08/2026: existiam TRÊS cópias de cada documento legal (estas
  // páginas estáticas, um cluster inteiro em app/*/page.tsx, e uma terceira
  // no domínio da API via routes/legal.ts) — nenhuma delas era servida a
  // partir das outras, cada uma podia divergir sem ninguém notar. Testado ao
  // vivo (curl contra nfse.titanbackoffice.com.br/termos-de-uso, diff byte a
  // byte contra este arquivo): quem está publicado de verdade é ESTA página
  // estática, não a versão React (que tinha ficado mais completa, mas nunca
  // foi o que o usuário via). Por pedido do usuário, o cluster React e as
  // rotas da API foram removidos; a cláusula de ISS que só existia na versão
  // React foi trazida pra cá antes de apagar a fonte antiga. Esta é agora a
  // ÚNICA fonte.
  const legalCss=await readFile(resolve(root,"public/legal.css"),"utf8");
  const paginasEstaticas=await Promise.all([
    "termos-de-uso.html",
    "politica-de-privacidade.html",
    "exclusao-de-dados.html",
    "contrato-de-uso.html",
  ].map(nome=>readFile(resolve(root,"public",nome),"utf8")));
  const [termos,privacidade,exclusao,contrato]=paginasEstaticas;

  for (const pagina of paginasEstaticas){
    assert.match(pagina,/rel="canonical" href="https:\/\/nfse\.titanbackoffice\.com\.br\//);
    assert.match(pagina,/src="\/titan-nfse-logo-transparent\.png"/);
    assert.match(pagina,/class="home-button"/);
    assert.match(pagina,/id="conteudo"/);
    assert.match(pagina,/TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA/,"falta razão social");
    assert.match(pagina,/67\.261\.200\/0001-79/,"falta CNPJ");
    assert.match(pagina,/nfse@titanbackoffice\.com\.br/,"falta e-mail de contato");
  }
  // exigencia do Art. 41 da LGPD: encarregado identificado publicamente
  assert.match(privacidade,/Marlon Garcia Beira/);
  // pontos que protegem a operacao em caso de disputa
  assert.match(termos,/não substitui contador ou\s+consultoria fiscal/);
  assert.match(termos,/ISS municipal <strong>não é calculado automaticamente<\/strong>/);
  assert.match(termos,/Limitação de responsabilidade/);
  assert.match(termos,/Curitiba\/PR/);
  assert.match(exclusao,/Solicitação de exclusão de dados/);
  assert.match(exclusao,/Meta ou pelo WhatsApp/);
  // pedido do usuário (10/08/2026): contrato de sessão de uso, com o plano
  // contratado como objeto e o pagamento confirmado como aceite registrado.
  assert.match(contrato,/permanece pendente, sem prazo de expiração automática/);
  assert.match(contrato,/href="\/termos-de-uso"/);
  assert.match(contrato,/href="\/politica-de-privacidade"/);
  // telefone de contato tem que ser o mesmo em toda página legal, e o
  // número antigo não pode sobreviver em nenhuma delas
  for (const pagina of paginasEstaticas){
    assert.match(pagina,/\(41\) 3790-0311/,"telefone de contato divergente do resto do site");
    assert.doesNotMatch(pagina,/3012-2998/,"telefone antigo (3012-2998) não pode sobreviver em nenhuma página legal");
    assert.doesNotMatch(pagina,/[—–·]/u,"página legal contém separador decorativo ou travessão");
    assert.doesNotMatch(
      pagina,
      /[\u{1F300}-\u{1FAFF}☀-➿]/u,
      "página legal contém emoji ou pictograma",
    );
  }
  for (const cor of ["#0b1629","#1a2c4a","#c9a84c","#8f7833","#f5f4ef"]){
    assert.ok(legalCss.includes(cor), `legal.css: falta a cor ${cor} da página inicial`);
  }
  assert.doesNotMatch(legalCss,/#064e59|#087f7c|#067c79/i);
  assert.match(legalCss,/@media \(max-width: 640px\)/);
});

test("worker manda Content-Security-Policy restrita, cobrindo só as origens de verdade usadas no site",async()=>{
  const worker=await readFile(resolve(root,"worker/index.ts"),"utf8");
  assert.match(worker,/headers\.set\("Content-Security-Policy", CSP\)/);
  assert.match(worker,/"default-src 'self'"/);
  // handlers inline (onclick=...) e atributos style=... por toda a página —
  // sem 'unsafe-inline' aqui a emissão inteira quebraria
  assert.match(worker,/"script-src 'self' 'unsafe-inline' https:\/\/cdn\.jsdelivr\.net"/);
  assert.match(worker,/"style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com"/);
  assert.match(worker,/"font-src 'self' https:\/\/fonts\.gstatic\.com"/);
  assert.match(worker,/"img-src 'self' data:"/);
  assert.match(worker,/"connect-src 'self' https:\/\/titan-nfse-api\.onrender\.com"/);
  // DANFSe (abrirDanfse em titan.html) usa srcdoc no iframe sandbox, então
  // não precisa mais de blob: aqui — só 'self' mesmo
  assert.match(worker,/"frame-src 'self'"/);
  assert.match(worker,/"object-src 'none'"/);
  assert.match(worker,/"frame-ancestors 'self'"/);
});

test("painel Master mostra a prontidão real do WhatsApp e do Martyn",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="set-wa-webhook-url"/);
  assert.match(html,/https:\/\/titan-nfse-api\.onrender\.com\/api\/whatsapp\/webhook/);
  assert.doesNotMatch(html,/endpoint de webhook[^<]*ainda não está publicado/i);
  assert.match(html,/id="master-martyn-provider-state"/);
  assert.match(html,/data\.martynProviderReady\?'Provedor conectado':'Chave de IA ausente'/);
  assert.match(html,/data\.hasWhatsappWebhookVerifyToken/);
});

test("escapa consistentemente com o mesmo esc() em todo o portal — nada de escape parcial reinventado",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/const esc=value=>String\(value\?\?''\)\.replaceAll\('&','&amp;'\)\.replaceAll\('<','&lt;'\)\.replaceAll\('>','&gt;'\)\.replaceAll\('"','&quot;'\);/);
  // cert.subject (X.509) e error.message iam pro innerHTML só com um
  // replaceAll('<','&lt;') solto — escapava a tag mas não '&'/'>'/'"', diferente
  // do resto do portal, que sempre usa o esc() compartilhado
  assert.match(html,/<b>\$\{esc\(cert\.subject\)\}<\/b>/);
  assert.match(html,/<div class="chave" style="color:#7d1c1f">\$\{esc\(error\.message\)\}<\/div>/);
});

test("tela de detalhes do cliente edita o parceiro comercial da empresa (diferente de quem opera o CNPJ)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/<select id="master-detail-partner" class="inp"><option value="">Cliente direto<\/option><\/select>/);
  const abrir=html.slice(html.indexOf("async function abrirDetalhesCliente"),html.indexOf("function fecharDetalhesCliente"));
  assert.match(abrir,/partnerSelect\.innerHTML='<option value="">Cliente direto<\/option>'\+\(masterData\?\.partners\|\|\[\]\)\.map\(p=>`<option value="\$\{p\.id\}">\$\{esc\(p\.nickname\)\}<\/option>`\)\.join\(''\);/);
  assert.match(abrir,/partnerSelect\.value=data\.partner_id\|\|'';/);
  const salvar=html.slice(html.indexOf("async function salvarDetalhesCliente"),html.indexOf("async function salvarDetalhesCliente")+1600);
  assert.match(salvar,/partnerId:qs\('#master-detail-partner'\)\.value\|\|null/);
});

// ── Item 4: filtro por parceiro na lista de empresas do Master ─────────────

test("Gestão por CNPJ tem select de parceiro ao lado da busca, mandando partnerId pro servidor",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/<select id="master-client-partner" class="inp" onchange="filtrarParceiroClientesMaster\(\)"><option value="">Todos os parceiros<\/option><\/select>/);
  // Recorta até a próxima função, não uma janela fixa de caracteres: qualquer
  // linha nova no começo de carregarMaster (foi o que aconteceu ao adicionar
  // o estado de carregamento) empurrava a chamada pra fora da janela e
  // quebrava o teste sem que o recurso tivesse saído do código.
  const carregar=html.slice(html.indexOf("async function carregarMaster"),html.indexOf("function usuariosDoCnpj"));
  assert.match(carregar,/if\(masterClientPartnerFilter\)params\.set\('partnerId',masterClientPartnerFilter\)/);
  assert.match(carregar,/renderMasterClientPartnerFilter\(\)/);
  const render=html.slice(html.indexOf("function renderMasterClientPartnerFilter"),html.indexOf("function renderMasterClientPartnerFilter")+500);
  // populado a partir de masterData.partners, a mesma fonte que a aba
  // Gestão de Parceiros já usa — mais a opção "clientes diretos" (sem parceiro)
  assert.match(render,/<option value="none">Somente clientes diretos<\/option>/);
  assert.match(render,/masterData\.partners\.map\(p=>`<option value="\$\{p\.id\}">\$\{esc\(p\.nickname\)\}<\/option>`\)/);
  assert.match(html,/function filtrarParceiroClientesMaster\(\)\{\s*masterClientPartnerFilter=qs\('#master-client-partner'\)\?\.value\|\|'';/);
});

test("exportarMasterLogs neutraliza injeção de fórmula no CSV (campo iniciado por =,+,-,@)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const fn=html.slice(html.indexOf("function exportarMasterLogs"),html.indexOf("async function salvarPerfilAcesso"));
  // Excel/Sheets tratam célula iniciada por =,+,-,@ (ou tab/CR) como fórmula ao
  // abrir o CSV — um valor gravado no log de auditoria (ex.: dentro de
  // "detalhes") viraria código executado na planilha de quem exportou
  assert.match(fn,/\/\^\[=\+\\-@\\t\\r\]\//);
  assert.match(fn,/\?`'\$\{text\}`:text\)/);
});

// ── Fase F/G: Portal do Parceiro (carteira + créditos/comissões/financeiro) ─
// Backend já pronto (POST /api/auth/login reconhece isPartner, GET
// /api/partner/{companies,creditos,comissoes,financeiro} devolvem a carteira
// e seus três recortes) — aqui só a interface: entrada pelo mesmo formulário
// de e-mail do Master, uma rota própria e uma tela com quatro abas.

test("login por e-mail em nfs.html reconhece Master OU Parceiro e redireciona para /admin ou /parceiro",async()=>{
  const landing=await readFile(resolve(root,"public/nfs.html"),"utf8");
  const form=landing.slice(landing.indexOf('<form class="login-panel" id="admin-login-form">'),landing.indexOf('<div class="drawer-links">'));
  assert.match(form,/<h3>Master ou Parceiro<\/h3>/);
  const handler=landing.slice(landing.indexOf("document.querySelector('#admin-login-form').addEventListener"),landing.indexOf("function aplicarIntencaoLogin"));
  assert.match(handler,/const access=await authLogin\(\{email,password\}\)/);
  // A checagem isMaster/isPartner e o redirecionamento foram extraídos para
  // finalizarLoginAdmin(access), chamada pelo handler do formulário.
  assert.match(handler,/finalizarLoginAdmin\(access\)/);
  assert.match(landing,/function finalizarLoginAdmin\(access\)\{if\(!access\.user\?\.isMaster&&!access\.user\?\.isPartner\)throw new Error/);
  assert.match(landing,/saveSession\(access,null\);navegarAposLogin\(access\.user\.isMaster\?'\/admin':'\/parceiro'\)/);
});

test("rota /parceiro abre parceiro.html num iframe próprio, fora do shell de titan.html",async()=>{
  const route=await readFile(resolve(root,"app/[[...tenant]]/page.tsx"),"utf8");
  assert.match(route,/const isPartner = tenant\.length === 1 && target\.toLowerCase\(\) === "parceiro"/);
  assert.match(route,/!isPasswordReset && !isDashboard && !isPartner\) notFound\(\)/);
  assert.match(route,/if \(isPartner\) \{\s*return \(\s*<main className="prototype-shell">\s*<iframe className="prototype-frame" src="\/parceiro\.html" title="TITAN NFS-e — Portal do Parceiro" \/>/);
});

test("parceiro.html carrega a carteira do parceiro (GET /api/partner/companies) sem form de login próprio",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  // Sessão vem só do login em nfs.html. A tela ganhou formulários próprios
  // (indicar cliente, suporte, perfil, trocar senha) desde então, mas
  // nenhum deles estabelece sessão — o que continua proibido é uma segunda
  // rota de autenticação (authLogin/saveSession) duplicando o login.
  assert.doesNotMatch(html,/authLogin\(/);
  assert.doesNotMatch(html,/saveSession\(/);
  assert.match(html,/return token&&access\.user\?\.isPartner\?token:null;/);
  assert.match(html,/await fetch\(\(window\.TITAN_API_URL\|\|''\)\.replace\(\/\\\/\$\/,''\)\+caminho,\{headers:\{Authorization:'Bearer '\+token\}\}\)/);
  assert.match(html,/buscarApiParceiro\('\/api\/partner\/companies'\)/);
  assert.match(html,/company\.trade_name\|\|company\.legal_name/);
  assert.match(html,/formatarCnpj\(company\.federal_tax_id\)/);
  assert.match(html,/company\.emission_enabled\?'Emissão liberada':'Emissão suspensa'/);
  // Achado da auditoria de 11/08/2026: location.href navegava só o iframe
  // desta tela, deixando a URL do navegador inconsistente com o conteúdo —
  // window.top é o mesmo padrão de nfs.html/titan.html.
  assert.match(html,/function sair\(\)\{sessionStorage\.removeItem\(STORAGE_TOKEN\);sessionStorage\.removeItem\(STORAGE_SESSION\);window\.top\.location\.href='\/'\}/);
});

test("buscarApiParceiro trata falha de rede em PT-BR e sessão expirada no servidor (401) aciona o link 'Entrar de novo' (achados 11/08/2026)",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  assert.match(html,/\}catch\{\s*\/\/[\s\S]{0,260}throw new Error\('Não foi possível conectar\. Verifique sua internet e tente novamente\.'\);\s*\}/);
  assert.match(html,/if\(response\.status===401\)throw new Error\('SEM_SESSAO'\);/);
});

test("as 4 tabelas do portal do parceiro ficam dentro de .table-wrap, com scroll horizontal em telas estreitas (achado 11/08/2026)",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  assert.match(html,/\.table-wrap\{overflow:auto\}/);
  for(const id of ['partner-table','creditos-table','comissoes-table','financeiro-table']){
    const re=new RegExp(`<div class="table-wrap"><table id="${id}"`);
    assert.match(html,re);
  }
});

// ── Fase G: menus de créditos/comissões/financeiro do parceiro, com dados
// reais ───────────────────────────────────────────────────────────────────
// Sem inventar número: cota/uso de nota e funções vêm de invoices+master_plans
// (creditos), a comissão é o % que o Master define sobre a mensalidade do
// plano vigente (comissoes), e o financeiro é status de implantação +
// mensalidade (financeiro). Ainda não há split de pagamento nem lançamento
// financeiro automático — só visibilidade.

test("topbar do parceiro tem Carteira/Créditos/Comissões/Financeiro, todas as quatro abas clicáveis",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  const topbar=html.slice(html.indexOf('<header class="partner-topbar">'),html.indexOf('</header>'));
  assert.match(topbar,/<button class="partner-nav-link on" type="button" data-partner-tab="carteira" onclick="partnerTab\('carteira',this\)" aria-current="page">Carteira<\/button>/);
  for(const [tab,label] of [['creditos','Créditos'],['comissoes','Comissões'],['financeiro','Financeiro']]){
    const re=new RegExp(`<button class="partner-nav-link" type="button" data-partner-tab="${tab}" onclick="partnerTab\\('${tab}',this\\)">${label}<\\/button>`);
    assert.match(topbar,re);
  }
  assert.doesNotMatch(topbar,/disabled|em breve/);
});

test("partnerTab troca a seção visível e recarrega os dados da aba escolhida",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  // Mais abas de parceiro entraram desde então (licenças, perfil, novidades).
  assert.match(html,/const PARTNER_LOADERS=\{carteira:carregarCarteira,creditos:carregarCreditos,comissoes:carregarComissoes,financeiro:carregarFinanceiro,licencas:carregarLicencas,perfil:carregarPerfilParceiro,novidades:carregarNovidadesParceiro\};/);
  assert.match(html,/function partnerTab\(nome,botao\)\{/);
  assert.match(html,/secao\.style\.display=secao\.id==='partner-view-'\+nome\?'block':'none'/);
  assert.match(html,/PARTNER_LOADERS\[nome\]\?\.\(\);/);
});

test("aba Créditos mostra cota mensal, uso do mês corrente e funções contratadas (GET /api/partner/creditos)",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  assert.match(html,/buscarApiParceiro\('\/api\/partner\/creditos'\)/);
  assert.match(html,/const limite=Number\(company\.monthly_limit\|\|0\),uso=Number\(company\.monthly_used\|\|0\);/);
  assert.match(html,/\(company\.features\|\|\[\]\)\.map\(nome=>`<span class="tag">\$\{esc\(nome\)\}<\/span>`\)\.join\(''\)/);
});

test("aba Comissões calcula a estimativa a partir do % que o Master configurou, sem inventar valor (GET /api/partner/comissoes)",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  assert.match(html,/buscarApiParceiro\('\/api\/partner\/comissoes'\)/);
  // Copy ganhou contexto do modelo de revenda por licença (empresas
  // liberadas por licença vs. empresas no modelo antigo de comissão).
  assert.match(html,/comissão de <b>\$\{brl\(data\.commissionPercent\)\}%<\/b> configurada pelo Master/);
  assert.match(html,/Number\(company\.commission_cents\|\|0\)\/100/);
});

test("aba Financeiro mostra plano, mensalidade e status de implantação por empresa (GET /api/partner/financeiro)",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  assert.match(html,/buscarApiParceiro\('\/api\/partner\/financeiro'\)/);
  assert.match(html,/const IMPLANTACAO_LABEL=\{self_service:'Autoimplantação',paid_pending:'Implantação paga — pendente',paid_active:'Implantação paga — ativa'\};/);
  assert.match(html,/Number\(company\.implementation_fee_cents\|\|0\)/);
});

test("Master define a comissão (%) do parceiro, usada pela aba Comissões do Portal do Parceiro",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/<input id="partner-commission" class="inp" inputmode="decimal" placeholder="Ex\.: 10">/);
  assert.match(html,/commissionPercent=dinheiro\(qs\('#partner-commission'\)\.value\)/);
  // Ganhou email e CNPJ do parceiro desde então (Frontend Master: campo CNPJ).
  assert.match(html,/JSON\.stringify\(\{name,nickname,email,federalTaxId,active,commissionPercent\}\)/);
  assert.match(html,/qs\('#partner-commission'\)\.value=String\(Number\(partner\.commission_percent\|\|0\)\)\.replace\('\.',','\);/);
  assert.match(html,/commissionPercent:Number\(partner\.commission_percent\|\|0\)/);
});

// ── Item 1: botão "Buscar" explícito no filtro de notas ─────────────────────
// O filtro já é ao vivo (oninput/onchange chamando filtrarNotas()); o botão
// é só por familiaridade de quem espera um botão de busca — não substitui
// o comportamento ao vivo existente.
test("filtro de notas emitidas tem botão Buscar além dos campos ao vivo",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const card=html.slice(html.indexOf('id="nt-filtro-card"'),html.indexOf('id="nt-filtro-card"')+2000);
  assert.match(card,/<input id="nt-search"[^>]*oninput="filtrarNotas\(\)"/);
  assert.match(card,/<button class="btn btn-s" type="button" onclick="filtrarNotas\(\)" title="Buscar">/);
});

test("CST PIS/COFINS inclui a opção 00 (empresa fora do Simples, ex.: Lucro Presumido, também usa esse código)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // Faltava nos dois seletores (emissão manual e cadastro de serviço) —
  // confirmado contra DANFSe real de outro emissor (empresa "Não optante"
  // do Simples, com CST=00 na tag piscofins), que o backend já aceita
  // (src/nfse/types.ts: pisCofinsCst é regex /^\d{2}$/, sem lista fixa).
  assert.match(html,/<label for="s-cst">CST PIS\/COFINS<\/label><select id="s-cst" class="inp"><option value="">Não informar<\/option><option>00<\/option>/);
  assert.match(html,/<label for="cad-cst">CST PIS\/COFINS <span class="info-tip"[^>]*>\?<\/span><\/label><select id="cad-cst" class="inp"><option value="">Não informar<\/option><option>00<\/option>/);
});

test("Dados da Empresa tem os três percentuais de tributos (Federal/Estadual/Municipal) pra empresa fora do Simples, ida e volta com o servidor",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // Equivalente do percentual único do Simples (e-simple-total), só que em
  // três campos — a DPS de quem não é 'simples' pede pTotTribFed/Est/Mun
  // em vez de pTotTribSN. Opcional: some no corpo do PUT se não preenchido.
  assert.match(html,/<label for="e-tax-fed">Tributos federais aproximados \(%\)<\/label><input id="e-tax-fed"/);
  assert.match(html,/<label for="e-tax-est">Tributos estaduais aproximados \(%\)<\/label><input id="e-tax-est"/);
  assert.match(html,/<label for="e-tax-mun">Tributos municipais aproximados \(%\)<\/label><input id="e-tax-mun"/);
  assert.match(html,/taxFed:qs\('#e-tax-fed'\)\.value\.trim\(\)===''\?'':dinheiro\(qs\('#e-tax-fed'\)\.value\)/);
  assert.match(html,/totalTaxRateFederal:regime!=='simples'&&empresa\.taxFed!==''\?empresa\.taxFed:undefined/);
  assert.match(html,/qs\('#e-tax-fed'\)\.value=empresaAtual\.taxFed===''\|\|empresaAtual\.taxFed==null\?'':String\(empresaAtual\.taxFed\)\.replace\('\.',','\)/);
});

test("pré-inscrição da home exige CNPJ (não é mais opcional) e aplica a máscara existente",async()=>{
  const html=await readFile(resolve(root,"public/nfs.html"),"utf8");
  const form=html.slice(html.indexOf('id="contact-form"'),html.indexOf('id="contact-form"')+600);
  assert.match(form,/<input class="full" name="federalTaxId" id="contact-cnpj" required/);
  assert.doesNotMatch(form,/CNPJ \(opcional\)/);
  assert.match(html,/document\.querySelector\('#contact-cnpj'\)\.addEventListener\('input',maskCnpjInput\)/);
  // valida o formato antes de gastar uma requisição — mesma regex do login por CNPJ
  assert.match(html,/normalizeTaxId\(data\.federalTaxId\|\|''\)/);
});

test("painel Master ganha aba Inscrições, listando as pré-inscrições da home com filtro por status",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // precisa existir nos dois lugares que replicam a navegação do Master
  // (menu dentro da sidebar do cliente, e a sidebar exclusiva do admin)
  const ocorrencias=html.split('data-master-tab="inscricoes"').length-1;
  assert.ok(ocorrencias>=2,"aba Inscrições deve aparecer nas duas navegações do Master");
  assert.match(html,/\['clientes','inscricoes','atendimentos','parceiros','planos','config','logs'\]/);
  assert.match(html,/id="master-panel-inscricoes"/);
  assert.match(html,/if\(tab==='inscricoes'\)carregarMasterInscricoes\(\)/);
  const painel=html.slice(html.indexOf('id="master-panel-inscricoes"'),html.indexOf('id="master-panel-inscricoes"')+1600);
  assert.match(painel,/id="master-inscricoes-search"/);
  assert.match(painel,/id="master-inscricoes-status"/);
  assert.match(painel,/<option value="pre_approved">/);
  assert.match(painel,/<option value="needs_review">/);
  assert.match(html,/async function carregarMasterInscricoes\(\)/);
  assert.match(html,/api\('\/api\/master\/inscricoes\?'\+params\.toString\(\)\)/);
  assert.match(html,/async function moverStatusInscricao\(id,status\)/);
  assert.match(html,/api\('\/api\/master\/inscricoes\/'\+id\+'\/status',\{method:'PUT'/);
});

test("botões de orientação (i) explicam o onboard e o certificado A1 num popup, sem sair da tela",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // Emitente: botão "i" no cabeçalho da página explica os dois passos do onboard.
  assert.match(html,/<h1>Emitente<\/h1><button class="info-btn" type="button" title="[^"]*" onclick="orientacaoOnboardingEmitente\(\)">/);
  assert.match(html,/function orientacaoOnboardingEmitente\(\)\{/);
  // Certificado A1: incorporado em Configurações — botão "i" no cabeçalho do card explica o que é, onde conseguir e como enviar.
  assert.match(html,/<h2>Certificado A1<button class="info-btn" type="button" title="[^"]*" onclick="orientacaoCertificadoA1\(\)">/);
  assert.match(html,/function orientacaoCertificadoA1\(\)\{/);
  // Reaproveita o popup padrão do sistema (titanAlert -> system-dialog), em vez de um componente novo.
  const inicioOrientacao=html.indexOf("function orientacaoCertificadoA1()");
  const blocoOrientacao=html.slice(inicioOrientacao,inicioOrientacao+1600);
  assert.match(blocoOrientacao,/titanAlert\(`/);
  assert.match(blocoOrientacao,/Autoridade Certificadora/);
  assert.match(blocoOrientacao,/não é a senha do seu login no TITAN/);
  // O campo de senha do certificado também deixa claro, no próprio hint, que não é a senha do TITAN.
  assert.match(html,/<div class="hint">Não é a senha de login do TITAN — é a senha definida pela Autoridade Certificadora/);
});

test("painel de Atendimentos mostra o saldo do provedor de IA (GET /api/master/settings) — DeepSeek nativo se houver, senão OpenRouter (a chave paga real)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/<span id="atend-ia-saldo" class="pill p-off" style="display:none"><\/span>/);
  assert.match(html,/carregarSaldoProvedorIA\(\);/);
  const inicio=html.indexOf("async function carregarSaldoProvedorIA()");
  assert.notEqual(inicio,-1);
  const bloco=html.slice(inicio,inicio+900);
  assert.match(bloco,/api\('\/api\/master\/settings'\)/);
  assert.match(bloco,/data\.deepseekBalance/);
  assert.match(bloco,/data\.openrouterBalance/);
  assert.match(bloco,/pill\.className=`pill \$\{deepseek\.disponivel\?'p-ok':'p-err'\}`/);
  // sem conta nativa da DeepSeek, cai pro saldo da OpenRouter — a chave paga que a TITAN de fato mantém.
  assert.match(bloco,/OpenRouter: \$\$\{openrouter\.restante\.toFixed\(2\)\} restantes/);
  assert.match(bloco,/else\{[\s\S]{0,20}pill\.style\.display='none';/);
});

// Achado de campo (11/08/2026): "a lista de conversas fica parada, só
// atualiza com F5" — navegador throttla/pausa setInterval em aba de
// segundo plano, então o polling de 8s podia ficar minutos sem rodar de
// verdade enquanto o atendente estava com a tela aberta noutra aba.
test("Atendimentos força atualização imediata ao voltar o foco da aba (visibilitychange), não só pelo polling de 8s",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/document\.addEventListener\('visibilitychange',\(\)=>\{\s*if\(document\.visibilityState==='visible'&&qs\('#master-panel-atendimentos'\)\?\.classList\.contains\('active'\)\)tickAtendimentos\(\);\s*\}\);/);
});

test("seletor de município não quebra em cidade com apóstrofo no nome (ex.: Sant'Ana do Livramento)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // Antes, o onclick embutia JSON.stringify(row) inteiro dentro de aspas simples — um
  // apóstrofo no nome da cidade fechava o atributo cedo e corrompia o HTML/JS ao redor.
  // Agora só o código IBGE (sempre numérico) vai pro atributo; o resto é procurado em memória.
  assert.doesNotMatch(html,/onclick='selecionarMunicipio\("\$\{tipo\}",\$\{JSON\.stringify\(row\)\}\)'/);
  assert.match(html,/onclick="selecionarMunicipioPorCodigo\('\$\{tipo\}','\$\{row\.code\}'\)"/);
  assert.match(html,/function selecionarMunicipioPorCodigo\(tipo,code\)\{\s*const row=municipiosCatalogo\.find\(r=>r\.code===code\);\s*if\(row\)selecionarMunicipio\(tipo,row\);\s*\}/);
});

test("modais têm teto de altura e rolagem — conteúdo longo não fica inacessível em tela pequena",async()=>{
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  assert.match(css,/\.modal-card\{[^}]*max-height:calc\(100vh - 36px\)[^}]*display:flex;flex-direction:column\}/);
  assert.match(css,/\.modal-body\{padding:20px;overflow-y:auto;flex:1 1 auto;min-height:0\}/);
  assert.match(css,/\.system-dialog \.modal-card\{[^}]*max-height:calc\(100vh - min\(18vh,120px\) - 18px\)/);
  assert.match(css,/\.system-dialog \.modal-body\{padding:8px 18px 14px;overflow-y:auto;flex:1 1 auto;min-height:0\}/);
});

test("botão 'Enviar por WhatsApp' sem função nenhuma foi removido da lista de notas (não existia backend pra isso)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.doesNotMatch(html,/title="Enviar por WhatsApp"/);
});

test("cadastro da empresa exige razão social, CNPJ e endereço antes de salvar; inscrição municipal é opcional",async()=>{
  // Inscrição municipal virou campo (opcional) — nem toda empresa/município
  // exige — mas razão social, CNPJ e endereço continuam obrigatórios.
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/for="e-im">Inscrição municipal <span[^>]*>\(opcional\)<\/span>/);
  const inicio=html.indexOf("async function salvarCadastro()");
  const bloco=html.slice(inicio,inicio+2000);
  assert.match(bloco,/if\(!empresa\.rs\|\|!empresa\.cnpj\|\|!empresa\.endereco\)\{/);
});

test("recebimentos e recorrências recusam valor zero ou negativo, não só valor vazio",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/if\(!body\.title\|\|!body\.customerName\|\|!body\.dueDate\|\|!\(amount>0\)\)\{/);
  // A recorrência passou a usar cliente/serviço cadastrados em vez de texto
  // livre com startDate — a checagem de valor>0 virou uma validação por
  // campo (mensagem específica por erro), mas o zero/negativo continua barrado.
  assert.match(html,/if\(!amount\|\|amount<=0\)\{alert\('Informe um valor maior que zero\.'\);return\}/);
});

test("município digitado em checarHabilitacao passa por esc() antes de virar innerHTML",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/Município selecionado: \$\{esc\(mun\)\}\./);
  // Achado da auditoria de 11/08/2026: o ramo "fora do Simples" da mesma
  // função esquecia o esc() que os outros dois ramos já tinham (XSS).
  assert.match(html,/modo adotado por \$\{esc\(mun\)\}\./);
  assert.doesNotMatch(html,/modo adotado por \$\{mun\}\./);
});

test("emissão trava se o município exibido não bater com o retorno confirmado do catálogo (achado 11/08/2026: nota podia sair com município errado, silenciosamente)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/async function montarPayloadEmissao\(\)/);
  assert.match(html,/const munConfirmado=municipiosCatalogo\.find\(row=>row\.code===payload\.service\.municipalityCode\);/);
  assert.match(html,/if\(!munConfirmado\|\|qs\('#s-mun-search'\)\.value\.trim\(\)!==munTextoEsperado\) return \{ok:false/);
  // o padrão da empresa precisa sincronizar o texto exibido, não só o campo oculto,
  // senão a trava acima bloquearia até o caso normal (usuário que nunca mexeu no campo)
  assert.match(html,/if\(empresaAtual\.mun\)exibirMunicipioPorCodigo\('s',empresaAtual\.mun\);/);
});

test("postMessage do popup do DANFSe confere event.origin antes de agir (achado 11/08/2026)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/window\.addEventListener\('message',\(e\)=>\{\s*\/\/[\s\S]{0,400}if\(e\.origin!==location\.origin\)return;/);
});

test("número da NFS-e (dado externo da Sefin) interpolado em onclick passa por escAttr(), não só esc() (achado 11/08/2026)",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/const escAttr=value=>esc\(String\(value\?\?''\)\.replaceAll\(/);
  assert.match(html,/onclick="baixarXml\('\$\{x\.id\}','\$\{escAttr\(x\.n\)\}'\)"/);
  assert.match(html,/onclick="abrirCancelamento\('\$\{x\.id\}','\$\{escAttr\(x\.n\)\}'\)"/);
});

test("indicador de ambiente (topo) é exclusivo do Master — antes ficava invertido (escondido do admin, visível pro cliente)",async()=>{
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  assert.match(css,/body:not\(\.portal-admin\) \.env\{display:none\}/);
  assert.doesNotMatch(css,/\.portal-admin \.tenant,\.portal-admin \.env\{display:none\}/);
});

test("novidades: sino do topo abre painel real (não mais alert de pendências) e Master consegue publicar",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="announcements-modal"/);
  assert.match(html,/id="announcement-title"/);
  assert.match(html,/id="announcement-body"/);
  assert.match(html,/async function abrirNovidades\(\)/);
  assert.match(html,/api\('\/api\/announcements'\)/);
  assert.match(html,/api\('\/api\/announcements\/seen',\{method:'POST'\}\)/);
  assert.match(html,/api\('\/api\/master\/announcements',\{method:'POST'/);
  assert.doesNotMatch(html,/alert\(message\|\| \(pending\?/);
});

test("notas recorrentes: nav habilitado, view e chamadas às rotas de agendamento automático existem",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/onclick="go\('recorrentes',this\)"/);
  assert.doesNotMatch(html,/disabled aria-disabled="true" title="Em preparação"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-5V2M4 17h5v5M20 7a8 8 0 0 0-13-3M4 17a8 8 0 0 0 13 3"\/><\/svg>Notas recorrentes/);
  assert.match(html,/id="v-recorrentes"/);
  assert.match(html,/id="rc-customer"/);
  assert.match(html,/id="rc-service"/);
  assert.match(html,/id="rc-day"/);
  assert.match(html,/async function carregarRecorrencias\(\)/);
  assert.match(html,/api\('\/api\/invoice-recurrences'\)/);
  assert.match(html,/async function salvarRecorrencia\(\)/);
  assert.match(html,/async function emitirRecorrenciaAgora\(id\)/);
  // valor e dia do mês são conferidos antes de enviar — não confia só na validação do servidor
  assert.match(html,/if\(!amount\|\|amount<=0\)\{alert\('Informe um valor maior que zero\.'\);return\}/);
  assert.match(html,/if\(!dayOfMonth\|\|dayOfMonth<1\|\|dayOfMonth>28\)/);
});

test("vistoria de 09/08/2026: nav das ferramentas fora do Light some quando o plano não vende, sem depender só do backend",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // As 4 ferramentas gateadas por requireFeature no backend precisam do
  // mesmo gate na tela — senão o botão fica visível e só falha ao clicar.
  assert.match(html,/data-permission="emit" data-feature="invoice_recurrences" onclick="go\('recorrentes',this\)"/);
  // Pedido do usuário (19/08/2026): a tela separada de importação (v-importar)
  // deixou de existir — virou o card "Importar do Portal Nacional" dentro de
  // Configurações, com um botão só, liberado pra qualquer empresa (a busca
  // depende do certificado da própria empresa, não de plano). Por isso não há
  // mais gate de permissão/feature nem rota 'importar' pra travar aqui.
  assert.doesNotMatch(html,/onclick="go\('importar'\)"/);
  assert.doesNotMatch(html,/id="v-importar"/);
  assert.match(html,/onclick="buscarPortalNacional\(\)"/);
  assert.match(html,/data-permission="financial" data-feature="receivables" onclick="go\('recebimentos',this\)"/);
  assert.match(html,/data-feature="dasn_simei" onclick="go\('dasn',this\)"/);
  // Cobranças TITAN (o que a própria TITAN cobra do cliente) não é uma
  // ferramenta vendida por plano — não pode ganhar gate nenhum.
  assert.doesNotMatch(html,/data-feature="[^"]*" onclick="go\('financeiro',this\)"/);
  // aplicarAcesso() precisa ler company.features do login e aplicar as duas
  // checagens (permissão do perfil E feature do plano) no mesmo elemento,
  // numa única passagem — duas passagens separadas se pisariam quando os
  // dois atributos estão juntos no mesmo botão.
  assert.match(html,/features=company\?\.features\|\|\['portal_emission'\]/);
  assert.match(html,/qsa\('\[data-permission\],\[data-feature\]'\)\.forEach/);
  // Passou a aceitar múltiplas permissões separadas por vírgula no mesmo elemento.
  assert.match(html,/const okPermissao=!el\.dataset\.permission\|\|user\.isMaster\|\|el\.dataset\.permission\.split\(','\)\.some\(p=>permissions\.includes\(p\)\)/);
  assert.match(html,/const okFeature=!el\.dataset\.feature\|\|user\.isMaster\|\|features\.includes\(el\.dataset\.feature\)/);
});

test("pedido de upgrade automático (vistoria de 09/08/2026): empresa pede pelo portal, Master aprova/recusa no painel",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // Lado da empresa: card "Meu plano" dentro de Emitente/Configurações, carregado
  // ao navegar para lá — não é uma tela nova que ninguém vai encontrar.
  assert.match(html,/if\(v==='emitente'\)\{[^}]*carregarMeuPlano\(\);carregarMeuContrato\(\)/);
  assert.match(html,/id="plan-upgrade-box"/);
  assert.match(html,/async function carregarMeuPlano\(\)/);
  assert.match(html,/api\('\/api\/plans'\)/);
  assert.match(html,/api\('\/api\/plans\/upgrade-requests'\)/);
  // Pedido do usuário (19/08/2026): "Meu plano" passou a listar todos os
  // planos, cada um com o próprio botão "Solicitar mudança" — o plano-alvo
  // chega por parâmetro, não mais lido de um <select> único na tela.
  assert.match(html,/async function solicitarUpgradePlano\(requestedPlanCode\)/);
  // O campo livre de observação saiu junto com o <select> — o pedido agora é
  // um clique no card do plano desejado, sem formulário intermediário.
  assert.match(html,/api\('\/api\/plans\/upgrade-requests',\{method:'POST',body:JSON\.stringify\(\{requestedPlanCode\}\)\}\)/);
  assert.match(html,/async function cancelarPedidoUpgrade\(id\)/);
  // Lado do Master: fila de pedidos dentro do painel de Planos, com contador
  // no sino do painel (pill) para não depender de abrir a tela pra saber que
  // tem pedido parado.
  assert.match(html,/id="master-plan-upgrade-requests"/);
  assert.match(html,/id="plan-upgrade-pending-pill"/);
  assert.match(html,/async function carregarPlanUpgradeRequests\(\)/);
  assert.match(html,/api\('\/api\/master\/plan-upgrade-requests'\)/);
  assert.match(html,/async function aprovarUpgradePlano\(id\)/);
  assert.match(html,/api\('\/api\/master\/plan-upgrade-requests\/'\+id\+'\/approve',\{method:'POST'\}\)/);
  assert.match(html,/async function recusarUpgradePlano\(id\)/);
  assert.match(html,/api\('\/api\/master\/plan-upgrade-requests\/'\+id\+'\/reject'/);
});

test("pedido do usuário (10/08/2026): contrato editável e versionado, com Meu contrato no portal do cliente",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // Master: editor de texto + histórico + publicação com bump de versão.
  assert.match(html,/id="contract-body"/);
  assert.match(html,/id="contract-versions-history"/);
  assert.match(html,/async function carregarContratoMaster\(\)/);
  assert.match(html,/api\('\/api\/master\/contract-versions'\)/);
  assert.match(html,/async function publicarVersaoContrato\(bump\)/);
  assert.match(html,/api\('\/api\/master\/contract-versions',\{method:'POST',body:JSON\.stringify\(\{body,bump\}\)\}\)/);
  // Cliente: consulta, aceita e baixa dentro de Emitente\/Configurações.
  assert.match(html,/if\(v==='emitente'\)\{[^}]*carregarMeuPlano\(\);carregarMeuContrato\(\)/);
  assert.match(html,/id="contract-box"/);
  assert.match(html,/async function carregarMeuContrato\(\)/);
  assert.match(html,/api\('\/api\/contract'\)/);
  assert.match(html,/async function aceitarContrato\(\)/);
  assert.match(html,/api\('\/api\/contract\/accept',\{method:'POST'\}\)/);
  assert.match(html,/async function baixarContrato\(\)/);
  assert.match(html,/apiBlob\('\/api\/contract\/pdf'\)/);
});

test("pedido do usuário (10/08/2026): modo restrito por falta de pagamento esconde tudo, exceto Notas emitidas e Sair",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  // api() precisa expor error.code pro front distinguir ACCOUNT_RESTRICTED
  // de qualquer outro erro genérico.
  assert.match(html,/error\.code=data\.code;throw error;/);
  assert.match(html,/function aplicarModoRestrito\(restrita\)/);
  assert.match(html,/document\.body\.classList\.toggle\('conta-restrita',restrita\)/);
  // carregarEmpresaServidor captura especificamente o 402 restrito, sem
  // deixar o erro genérico estourar (empresaAtual continua null nesse caso).
  assert.match(html,/if\(error\.code==='ACCOUNT_RESTRICTED'\)\{aplicarModoRestrito\(true\);empresaAtual=null;return\}/);
  // Notas emitidas e Sair são as únicas exceções — todo o resto do menu
  // (inclusive submenus e ações rápidas do painel) some via CSS.
  assert.match(html,/data-permission="invoices" data-restrito-ok onclick="go\('notas',this\)"/);
  assert.match(html,/data-restrito-ok onclick="sairPortal\(\)"/);
  assert.match(css,/body\.conta-restrita \.sb-link:not\(\[data-restrito-ok\]\),body\.conta-restrita \.sb-sec,body\.conta-restrita \.quick-grid,body\.conta-restrita \.sb-submenu\{display:none!important\}/);
  // login sem empresa restringido cai em Notas emitidas, não em Configurações
  // (que ficaria escondida e sem sentido pra abrir primeiro).
  assert.match(html,/\}else if\(contaRestrita\)\{\s*go\('notas',qs\('\.sb-link\[onclick\*="notas"\]'\)\);/);
});

test("Etapa 3 (19/08/2026): a configuração IBS/CBS saiu da emissão e vive em Meus Serviços", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // Substitui os dois testes de 12/08/2026 que travavam o bloco IBS/CBS na
  // TELA DE EMISSÃO. Pedido do dono do produto: "aqui em Emitir NFS-e
  // identificamos o cliente, o serviço, valor e detalhes necessários. As
  // demais configurações devem ser em MEUS SERVIÇOS".
  assert.doesNotMatch(html,/id="s-ibscbs-card"/,"o card do passo 6 tem que ter sumido da emissão");
  assert.doesNotMatch(html,/id="s-ibscbs-preencher"/,"não se pergunta mais 'preencher IBS/CBS?' a cada nota");
  assert.doesNotMatch(html,/function montarCamposIbscbsEmissao\(/,"a emissão não monta mais o bloco na mão");
  assert.doesNotMatch(html,/id="s-ibscbs-dest-/,"destinatário diferente do adquirente ficou de fora (decisão de 19/08/2026)");

  // Os campos agora são cadastro do serviço.
  assert.match(html,/id="cad-ibscbs-indfinal"/);
  assert.match(html,/id="cad-ibscbs-tpoper"/);
  assert.match(html,/id="cad-ibscbs-indop-search"[^>]*oninput="pesquisarIndOpCadastro\(\)"/);
  // "uso ou consumo pessoal" ganhou explicação — era a dúvida do usuário.
  assert.match(html,/uso ou consumo pessoal\?[\s\S]{0,120}info-tip/);
  // cIndOp abre a lista ao clicar: antes só reagia depois de 2 caracteres, e
  // por isso parecia que o campo não existia.
  assert.match(html,/id="cad-ibscbs-indop-search"[^>]*onfocus="pesquisarIndOpCadastro\(\)"/);
  assert.match(html,/const rows=\(term\?indOpCatalogo\.filter/,"sem termo digitado, mostra o catálogo inteiro");
  // tpOper 2 e 3 dependem de chave de NFS-e referenciada (dado da nota) e não
  // entram no cadastro — só 1, 4 e 5.
  assert.doesNotMatch(html,/id="cad-ibscbs-tpoper"[\s\S]{0,400}value="2"/);

  // O payload da emissão passa a copiar o cadastro, sem decidir nada.
  assert.match(html,/ibscbs:perfil\?\.ibscbs_cst&&perfil\?\.ibscbs_class_trib\?\{/);
  assert.match(html,/indDest:0,/);
});

test("pedido do usuário (12/08/2026): CST/cClassTrib do IBS/CBS vira dropdown pesquisável em Meus Serviços", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="cad-ibscbs-cst" type="hidden"/);
  assert.match(html,/id="cad-ibscbs-classtrib" type="hidden"/);
  assert.match(html,/id="cad-ibscbs-search"[^>]*oninput="pesquisarIbscbsClassificacao\(\)"/);
  assert.match(html,/function carregarIbscbsClassificacoesCatalogo\(\)/);
  assert.match(html,/api\('\/api\/services\/ibscbs-classificacoes'\)/);
  assert.match(html,/function selecionarIbscbsClassificacao\(cst,classTrib\)/);
  // editar um serviço existente repovoa o texto de busca, não só os hidden
  assert.match(html,/exibirIbscbsClassificacaoPorCodigo\(item\.ibscbs_cst\|\|'',item\.ibscbs_class_trib\|\|''\)/);
});

test("pedido do usuário (12/08/2026): Rascunhos ganha busca/filtro e rastreia se virou nota", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="draft-search"[^>]*oninput="filtrarRascunhos\(\)"/);
  assert.match(html,/id="draft-status"[^>]*onchange="filtrarRascunhos\(\)"/);
  assert.match(html,/<option value="converted">Convertido em nota<\/option>/);
  assert.match(html,/<option value="discarded">Descartado<\/option>/);
  assert.match(html,/async function carregarRascunhos\(\)\{/);
  assert.match(html,/api\('\/api\/workspace\/drafts'\+\(params\.toString\(\)\?'\?'\+params\.toString\(\)\:''\)\)/);
  // rastreia qual rascunho está aberto e marca a conversão só depois da nota
  // sair com sucesso — sem tornar a emissão dependente disso.
  assert.match(html,/let rascunhoAbertoId=null;/);
  assert.match(html,/function abrirRascunho\(index\)\{rascunhoAbertoId=rascunhos\[index\]\.id;/);
  assert.match(html,/async function marcarRascunhoConvertidoSeAplicavel\(invoiceId\)\{/);
  assert.match(html,/await marcarRascunhoConvertidoSeAplicavel\(result\.id\);/);
  assert.match(html,/async function descartarRascunho\(id\)\{/);
  assert.match(html,/api\('\/api\/workspace\/drafts\/'\+id\+'\/discard',\{method:'PATCH'\}\)/);
});

test("pedido do usuário (12/08/2026, NT07): retenção de IRRF ganha alíquota/base calculados; CSRF (PIS/COFINS/CSLL) ganha alíquota de CSLL", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  // IRRF: toggle Sim/Não + base/alíquota calculando o valor final (mesmo
  // campo de sempre, s-ret-irrf/cad-irrf, pra não quebrar o payload já
  // existente) — antes era só um input manual sem cálculo nenhum.
  assert.match(html,/id="s-ret-irrf-tipo"[^>]*onchange="atualizarRetencaoIrrf\('s'\)"/);
  assert.match(html,/id="s-irrf-base"[^>]*oninput="calcularIrrf\('s'\)"/);
  assert.match(html,/id="s-irrf-rate"[^>]*oninput="calcularIrrf\('s'\)"/);
  assert.match(html,/id="cad-ret-irrf-tipo"[^>]*onchange="atualizarRetencaoIrrf\('cad'\)"/);
  assert.match(html,/function atualizarRetencaoIrrf\(prefix\)\{/);
  assert.match(html,/function calcularIrrf\(prefix\)\{/);
  assert.match(html,/qs\('#'\+\(prefix==='s'\?'s-ret-irrf':'cad-irrf'\)\)\.value=format\(base\*rate\/100\);/);
  // CSRF (NT07): CSLL passa a ter alíquota própria, igual PIS/COFINS já
  // tinham, em vez de só um valor manual.
  assert.match(html,/id="s-csll-rate"[^>]*oninput="calcularPisCofins\('s'\)"/);
  assert.match(html,/id="cad-csll-rate"[^>]*oninput="calcularPisCofins\('cad'\)"/);
  assert.match(html,/qs\('#'\+\(prefix==='s'\?'s-ret-csll':'cad-csll'\)\)\.value=format\(base\*csll\/100\);/);
  // rótulos citam CSRF/NT07, pra bater com o termo que o usuário usou.
  assert.match(html,/Retenção CSRF — PIS\/COFINS\/CSLL \(NT07\)/);
  assert.match(html,/Retenção de IRRF \(NT07\)\?/);
  // campos novos entram na trava de retenções (herdadas do cadastro do
  // serviço na emissão) — mesmo tratamento dos campos que já existiam.
  assert.match(html,/CAMPOS_RETENCOES_TRAVAVEIS=\[[^\]]*'s-csll-rate'[^\]]*'s-ret-irrf-tipo'[^\]]*'s-irrf-base'[^\]]*'s-irrf-rate'[^\]]*\]/);
});

test("pedido do usuário (12/08/2026): Clientes ganha busca, botão + Cliente e atualização em lote (CNPJ)", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="cl-search"[^>]*oninput="filtrarClientesCadastro\(\)"/);
  assert.match(html,/function filtrarClientesCadastro\(\)\{/);
  assert.match(html,/api\('\/api\/customers\?search='\+encodeURIComponent\(busca\)\)/);
  assert.match(html,/onclick="novoClienteCadastro\(\)">\+ Cliente</);
  assert.match(html,/function novoClienteCadastro\(\)\{/);
  // fila em segundo plano (backend já publicado) — dispara e faz poll do
  // progresso sem travar a tela, nunca dois disparos simultâneos.
  assert.match(html,/async function dispararAtualizacaoEmLoteClientes\(\)\{/);
  assert.match(html,/if\(clienteBulkJobId\)return;/);
  assert.match(html,/api\('\/api\/customers\/bulk-refresh',\{method:'POST'\}\)/);
  assert.match(html,/async function consultarProgressoAtualizacaoLote\(\)\{/);
  assert.match(html,/api\('\/api\/customers\/bulk-refresh\/'\+clienteBulkJobId\)/);
  assert.match(html,/job\.status==='completed'\|\|job\.status==='failed'/);
});

test("pedido do usuário (12/08/2026, atualizado 14-15/08/2026): notas recorrentes ganham frequência configurável, data-fim, horário exato, dia de vencimento e importação por CSV", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="rc-frequency"[^>]*>[\s\S]*?<option value="1">Mensal<\/option>[\s\S]*?<option value="3">Trimestral<\/option>[\s\S]*?<option value="6">Semestral<\/option>[\s\S]*?<option value="12">Anual<\/option>/);
  assert.match(html,/id="rc-end-date"[^>]*type="date"/);
  // Pedido do usuário (19/08/2026): o contrato passou a terminar de 3 jeitos
  // — sem data, numa data, ou por número de parcelas — então endDate e
  // totalOccurrences saem do MESMO seletor (#rc-termino) e nunca vão juntos.
  assert.match(html,/frequencyMonths:Number\(qs\('#rc-frequency'\)\.value\)\|\|1,endDate:termino==='data'\?\(qs\('#rc-end-date'\)\.value\|\|undefined\):undefined,totalOccurrences:termino==='parcelas'\?vezes:undefined/);
  assert.match(html,/id="rc-termino"/);
  assert.match(html,/function alternarTerminoRecorrencia\(\)/);
  // Parcelamento aceita as duas formas que o usuário descreveu ("parcelar o
  // valor total em tantas vezes OU tantas vezes desse valor"), e o que vai
  // pro backend é sempre o valor de CADA nota.
  assert.match(html,/function valorDaParcelaRecorrencia\(\)/);
  assert.match(html,/id="rc-parcelas-modo"/);
  assert.match(html,/const valorDaNota=termino==='parcelas'\?valorDaParcelaRecorrencia\(\):amount/);
  // A prévia mostra o total real: dividir nem sempre fecha exato, e esconder
  // o centavo perdido seria mentir sobre o que será emitido.
  assert.match(html,/não cabem na divisão exata/);
  assert.match(html,/qs\('#rc-frequency'\)\.value=String\(item\.frequency_months\|\|1\);/);
  assert.match(html,/qs\('#rc-end-date'\)\.value=item\.end_date\|\|'';/);
  // "hora certa" (14/08/2026) e dia de vencimento (15/08/2026). Desde
  // 19/08/2026 o vencimento é OBRIGATÓRIO (pedido do usuário): é o vencimento
  // financeiro do recebimento gerado, o que aparece na Agenda — por isso a
  // validação bloqueia em vez de mandar undefined, e o label perdeu o
  // "(opcional)".
  assert.match(html,/id="rc-time" class="inp" type="time"/);
  assert.match(html,/id="rc-due-day" class="inp"/);
  assert.match(html,/<label>Dia de vencimento<\/label>/);
  assert.match(html,/if\(!dueDayTexto\|\|Number\(dueDayTexto\)<1\|\|Number\(dueDayTexto\)>28\)\{alert\('Informe o dia de vencimento/);
  assert.match(html,/runTime:qs\('#rc-time'\)\.value\|\|'09:00',dueDayOfMonth:Number\(dueDayTexto\)/);
  // importação por CSV (14/08/2026, "não txt ou ;"): upload de arquivo +
  // prévia por linha, sem endpoint novo, reaproveita o mesmo POST de sempre.
  // A planilha usa a mesma API, então ganhou a coluna de vencimento junto —
  // sem ela o backend recusaria toda linha importada.
  assert.match(html,/id="rc-import-file" type="file" accept="\.csv,text\/csv"/);
  assert.match(html,/function baixarModeloRecorrenciaCsv\(\)\{/);
  assert.match(html,/function selecionarArquivoRecorrenciaCsv\(file\)\{/);
  assert.match(html,/async function confirmarImportacaoRecorrenciaCsv\(\)\{/);
  assert.match(html,/Dia do mes;Dia de vencimento;Horario \(HH:MM\)/);
  assert.match(html,/erros\.push\('dia de vencimento inválido \(1 a 28\)'\)/);
  // Parcelas entraram na planilha junto (19/08/2026) — a planilha usa o mesmo
  // endpoint, então cada campo novo obrigatório/opcional precisa existir aqui
  // também, senão a importação passa a criar contrato diferente do da tela.
  assert.match(html,/Data fim \(opcional, AAAA-MM-DD\);Parcelas \(opcional\)/);
  assert.match(html,/erros\.push\('parcelas inválidas \(1 a 120, ou deixe em branco\)'\)/);
  assert.match(html,/api\('\/api\/invoice-recurrences',\{method:'POST',body:JSON\.stringify\(\{customerId:r\.cliente\.id,serviceProfileId:r\.servico\.id,amount:r\.amount,dayOfMonth:r\.dayOfMonth,dueDayOfMonth:r\.dueDayOfMonth,runTime:r\.runTime,frequencyMonths:r\.frequencyMonths,endDate:r\.endDate,totalOccurrences:r\.totalOccurrences\}\)\}\)/);
});

test("pedido do usuário (12/08/2026): ícones de informação (i) nos campos de Meus Serviços com comportamento/limitação não óbvios", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const css=await readFile(resolve(root,"public/titan.css"),"utf8");
  assert.match(css,/\.info-tip\{/);
  assert.match(html,/for="cad-search">Buscar no Anexo B nacional <span class="info-tip" title="[^"]*Buscar[^"]*"/);
  assert.match(html,/for="cad-mun-code">Código municipal <span class="info-tip"/);
  assert.match(html,/for="cad-nbs-search">Código NBS <span class="required-mark">\*<\/span> <span class="info-tip"/);
  assert.match(html,/for="cad-cst">CST PIS\/COFINS <span class="info-tip"/);
  assert.match(html,/for="cad-ibscbs-search">Classificação tributária IBS\/CBS \(CST \/ cClassTrib\) <span class="info-tip"/);
});

test("pedido do usuário (12/08/2026): destaque do imposto mesmo sem retenção (CSRF e IRRF), só informativo", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/id="s-pis-cofins-destaque" style="display:none"/);
  assert.match(html,/id="s-irrf-destaque" style="display:none"/);
  assert.match(html,/const CSRF_ALIQUOTA_PADRAO=4\.65,IRRF_ALIQUOTA_PADRAO=1\.50;/);
  assert.match(html,/apenas informativo, não é retido\./);
  // não entra no cálculo que vai pro payload — só texto, nunca escreve nos
  // campos de retenção de verdade (s-ret-csll/s-ret-irrf).
  assert.doesNotMatch(html,/destaque\.value=/);
});
