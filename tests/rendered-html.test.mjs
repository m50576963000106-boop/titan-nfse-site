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
  assert.match(html,/id="master-user-modal"/);
  assert.match(html,/Editar usuário/);
  assert.match(html,/Convidar usuário/);
  assert.match(html,/function abrirEditarUsuario/);
  assert.match(html,/async function salvarEditarUsuario/);
  assert.match(html,/\/api\/master\/users\/'\+userId/);
  assert.match(html,/function prepararUsuarioPendente/);
  assert.match(html,/function entrarComSessaoSalva/);
  assert.match(html,/entrarComSessaoSalva\(\)\.catch/);
  assert.match(html,/abrirAreaAutenticada\(access\)/);
  assert.match(html,/async function selecionarEmpresaAdmin\(companyId\)[\s\S]{0,260}abrirEmpresaEmissao\(companyId\)/);
  assert.match(html,/Preparando o ambiente fiscal da empresa/);
  assert.match(html,/Sem usuário ativo/);
  assert.doesNotMatch(html,/mode:"master_impersonation"/);
  assert.match(html,/Gestão por CNPJ/);
  assert.doesNotMatch(html,/Gestão de Usuários/);
  assert.doesNotMatch(html,/data-master-tab="usuarios"/);
  assert.match(css,/background:transparent;border:0/);
  assert.match(css,/object-fit:contain/);
  assert.match(html,/data-master-tab="perfis"/);
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
  assert.match(html,/Rascunhos de NFS-e/);
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
  // com o headline antigo "Vamos colocar sua empresa na nota fiscal nacional".
  assert.match(landing,/Toda a segurança do Portal Nacional\. <span>Toda a inteligência do TITAN\.<\/span>/);
  assert.match(landing,/\/api\/contact/);
  assert.match(landing,/titan-nfse-logo-transparent\.png/);
  assert.match(landing,/\/api\/system\/branding/);
  assert.match(landing,/carregarBrandingPortal/);
  assert.match(landing,/Emita notas com mais rapidez, reduza erros e organize clientes e serviços em um só lugar/);
  assert.match(landing,/Muito mais que uma tela para emitir notas/);
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
  assert.match(html,/servicos:\['cad-mun-code'\]/);
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
  assert.match(html,/function montarPayloadEmissao\(\)/);
  assert.match(html,/const montagem=montarPayloadEmissao\(\);/);
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
  assert.match(html,/\/api\/workspace\/recurrences/);
  assert.match(html,/Agendar recebimento/);
  assert.match(html,/Recorrência de honorários/);
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
  assert.match(html,/const content=String\(message\?\?''\)\.trim\(\);const detailed=mode!=='alert'\|\|content\.length>180\|\|content\.includes\('\\n'\)/);
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

test("exibe planos SaaS com limites e valores publicados",async()=>{
  const html=await readFile(resolve(root,"public/nfs.html"),"utf8");
  assert.match(html,/id="planos"/);
  assert.match(html,/Plano MEI/);
  assert.match(html,/R\$ 29,90/);
  assert.match(html,/Plano SN 20/);
  assert.match(html,/R\$ 49,90/);
  assert.match(html,/Plano SN 50/);
  assert.match(html,/R\$ 79,90/);
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
  assert.match(html,/sessionStorage\.setItem\(STORAGE_IMPERSONATING,data\.companies\[0\]\.trade_name\|\|data\.companies\[0\]\.legal_name\|\|'empresa selecionada'\)/);
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
  assert.match(html,/const resultados=data\.results\|\|\[\],bloqueadas=resultados\.filter\(item=>item\.blocked\)\.length/);
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
  assert.match(salvarAcesso,/if\(alvo\)\{alvo\.profile_id=data\.profileId;alvo\.profile_name=next\?\.name\|\|alvo\.profile_name;alvo\.access_active=data\.active\}/);
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

test("publica Termos de Uso e Política de Privacidade em rotas próprias",async()=>{
  const privacidade=await readFile(resolve(root,"app/privacidade/page.tsx"),"utf8");
  const termos=await readFile(resolve(root,"app/termos/page.tsx"),"utf8");
  const politicaAlias=await readFile(resolve(root,"app/politica-de-privacidade/page.tsx"),"utf8");
  const termosAlias=await readFile(resolve(root,"app/termos-de-uso/page.tsx"),"utf8");
  const exclusao=await readFile(resolve(root,"app/exclusao-de-dados/page.tsx"),"utf8");
  const legalHeader=await readFile(resolve(root,"app/legal-page-header.tsx"),"utf8");
  const css=await readFile(resolve(root,"app/globals.css"),"utf8");
  const legalCss=await readFile(resolve(root,"public/legal.css"),"utf8");
  const paginasEstaticas=await Promise.all([
    "termos-de-uso.html",
    "politica-de-privacidade.html",
    "exclusao-de-dados.html",
  ].map(nome=>readFile(resolve(root,"public",nome),"utf8")));

  // a rota catch-all faz notFound() fora da lista dela, entao estas paginas
  // precisam existir como rotas proprias para nao caírem em 404
  for (const [nome,pagina] of [["privacidade",privacidade],["termos",termos]]){
    assert.match(pagina,/export const metadata/, `${nome}: falta metadata`);
    assert.match(pagina,/TITAN BACKOFFICE SERVIÇOS ADMINISTRATIVOS LTDA/, `${nome}: falta razão social`);
    assert.match(pagina,/67\.261\.200\/0001-79/, `${nome}: falta CNPJ`);
    assert.match(pagina,/nfse@titanbackoffice\.com\.br/, `${nome}: falta e-mail de contato`);
    assert.match(pagina,/className="legal"/, `${nome}: falta o container rolável`);
    assert.match(pagina,/<Link href="\/(?:termos(?:-de-uso)?|(?:politica-de-)?privacidade)">/, `${nome}: falta link cruzado`);
  }
  // exigencia do Art. 41 da LGPD: encarregado identificado publicamente
  assert.match(privacidade,/Marlon Garcia Beira/);
  assert.match(privacidade,/Art\. 41/);
  // pontos que protegem a operacao em caso de disputa
  assert.match(termos,/não presta consultoria fiscal ou\s+tributária/);
  assert.match(termos,/ISS\s+municipal <b>não é calculado automaticamente<\/b>/);
  assert.match(termos,/Limitação de responsabilidade/);
  assert.match(termos,/Curitiba\/PR para dirimir controvérsias/);
  assert.match(politicaAlias,/canonical: "\/politica-de-privacidade"/);
  assert.match(termosAlias,/canonical: "\/termos-de-uso"/);
  assert.match(exclusao,/Solicitação de exclusão de dados/);
  assert.match(exclusao,/nfse@titanbackoffice\.com\.br/);
  assert.match(exclusao,/Meta ou pelo WhatsApp/);
  assert.match(exclusao,/canonical: "\/exclusao-de-dados"/);
  // as rotas estáticas são as publicadas no domínio e precisam conservar a
  // mesma identidade visual navy/dourado da página inicial
  assert.match(legalHeader,/\/titan-nfse-logo-transparent\.png/);
  assert.match(legalHeader,/Voltar ao TITAN/);
  for (const pagina of paginasEstaticas){
    assert.match(pagina,/rel="canonical" href="https:\/\/nfse\.titanbackoffice\.com\.br\//);
    assert.match(pagina,/src="\/titan-nfse-logo-transparent\.png"/);
    assert.match(pagina,/class="home-button"/);
    assert.match(pagina,/id="conteudo"/);
  }
  const fontesLegais=[
    privacidade,
    termos,
    politicaAlias,
    termosAlias,
    exclusao,
    legalHeader,
    ...paginasEstaticas,
  ];
  // item 10 da auditoria de lançamento: as páginas estáticas legadas
  // (public/*.html, ainda publicamente acessíveis) e as rotas React atuais
  // (app/*/page.tsx) tinham telefones de contato diferentes — dado de
  // contato contraditório num documento legal/LGPD é ruim de verdade.
  // Confere as duas fontes reais com telefone (privacidade/termos/exclusao;
  // os aliases só reexportam, e legalHeader não tem telefone) contra o
  // mesmo número, e que o antigo não sobrevive em lugar nenhum.
  for (const [nome,pagina] of [["privacidade",privacidade],["termos",termos],["exclusao",exclusao]]){
    assert.match(pagina,/\(41\) 3790-0311/,`${nome}: telefone de contato divergente do resto do site`);
  }
  for (const pagina of paginasEstaticas){
    assert.match(pagina,/\(41\) 3790-0311/,"página legal estática: telefone de contato divergente do resto do site");
  }
  for (const fonte of fontesLegais){
    assert.doesNotMatch(fonte,/3012-2998/,"telefone antigo (3012-2998) não pode sobreviver em nenhuma página legal");
  }
  for (const fonte of fontesLegais){
    assert.doesNotMatch(fonte,/[—–·]/u,"página legal contém separador decorativo ou travessão");
    assert.doesNotMatch(
      fonte,
      /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u,
      "página legal contém emoji ou pictograma",
    );
  }
  for (const cor of ["#0b1629","#1a2c4a","#c9a84c","#8f7833","#f5f4ef"]){
    assert.ok(legalCss.includes(cor), `legal.css: falta a cor ${cor} da página inicial`);
    assert.ok(css.includes(cor), `globals.css: falta a cor ${cor} da página inicial`);
  }
  assert.doesNotMatch(legalCss,/#064e59|#087f7c|#067c79/i);
  assert.match(legalCss,/@media \(max-width: 640px\)/);
  // o body e overflow:hidden por causa do iframe; a rolagem vive no container
  assert.match(css,/\.legal \{[\s\S]*?overflow-y: auto;/);
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
  const salvar=html.slice(html.indexOf("async function salvarDetalhesCliente"),html.indexOf("async function salvarDetalhesCliente")+900);
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
  assert.match(handler,/if\(!access\.user\?\.isMaster&&!access\.user\?\.isPartner\)throw new Error/);
  assert.match(handler,/saveSession\(access,null\);navegarAposLogin\(access\.user\.isMaster\?'\/admin':'\/parceiro'\)/);
});

test("rota /parceiro abre parceiro.html num iframe próprio, fora do shell de titan.html",async()=>{
  const route=await readFile(resolve(root,"app/[[...tenant]]/page.tsx"),"utf8");
  assert.match(route,/const isPartner = tenant\.length === 1 && target\.toLowerCase\(\) === "parceiro"/);
  assert.match(route,/!isPasswordReset && !isDashboard && !isPartner\) notFound\(\)/);
  assert.match(route,/if \(isPartner\) \{\s*return \(\s*<main className="prototype-shell">\s*<iframe className="prototype-frame" src="\/parceiro\.html" title="TITAN NFS-e — Portal do Parceiro" \/>/);
});

test("parceiro.html carrega a carteira do parceiro (GET /api/partner/companies) sem form de login próprio",async()=>{
  const html=await readFile(resolve(root,"public/parceiro.html"),"utf8");
  // Sessão vem só do login em nfs.html — sem form de login próprio nesta tela
  assert.doesNotMatch(html,/<form/);
  assert.match(html,/return token&&access\.user\?\.isPartner\?token:null;/);
  assert.match(html,/await fetch\(\(window\.TITAN_API_URL\|\|''\)\.replace\(\/\\\/\$\/,''\)\+caminho,\{headers:\{Authorization:'Bearer '\+token\}\}\)/);
  assert.match(html,/buscarApiParceiro\('\/api\/partner\/companies'\)/);
  assert.match(html,/company\.trade_name\|\|company\.legal_name/);
  assert.match(html,/formatarCnpj\(company\.federal_tax_id\)/);
  assert.match(html,/company\.emission_enabled\?'Emissão liberada':'Emissão suspensa'/);
  assert.match(html,/function sair\(\)\{sessionStorage\.removeItem\(STORAGE_TOKEN\);sessionStorage\.removeItem\(STORAGE_SESSION\);location\.href='\/'\}/);
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
  assert.match(html,/const PARTNER_LOADERS=\{carteira:carregarCarteira,creditos:carregarCreditos,comissoes:carregarComissoes,financeiro:carregarFinanceiro\};/);
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
  assert.match(html,/Comissão configurada pelo Master: <b>\$\{brl\(data\.commissionPercent\)\}%<\/b>/);
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
  assert.match(html,/JSON\.stringify\(\{name,nickname,active,commissionPercent\}\)/);
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
  assert.match(html,/<label for="cad-cst">CST PIS\/COFINS<\/label><select id="cad-cst" class="inp"><option value="">Não informar<\/option><option>00<\/option>/);
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
  assert.match(html,/\['clientes','inscricoes','atendimentos','parceiros','perfis','planos','config','logs'\]/);
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
