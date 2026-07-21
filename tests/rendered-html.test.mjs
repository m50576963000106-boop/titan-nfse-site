import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("carrega a configuração externa do backend", async () => {
  const html = await readFile(resolve(root, "public/titan.html"), "utf8");
  assert.match(html, /<script src="\/config\.js"><\/script>/);
  assert.match(html, /\/api\/invoices\/emit/);
  assert.match(html, /\/api\/auth\/login/);
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
  assert.match(html,/X-Confirm-Cancellation/);
  assert.match(html,/Cancelar NFS-e oficialmente/);
  assert.doesNotMatch(html,/v-marca/);
});

test("isola as rotas do master e de cada CNPJ",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const route=await readFile(resolve(root,"app/nfs/[[...tenant]]/page.tsx"),"utf8");
  assert.match(html,/PORTAL_ADMIN/);
  assert.match(html,/PORTAL_CNPJ/);
  assert.match(html,/class="sb-mark" href="\/nfs" target="_top"/);
  assert.match(html,/class="login-brand" href="\/nfs" target="_top"/);
  assert.match(html,/não possui acesso liberado para o CNPJ/);
  assert.match(html,/new URL\('\/nfs\/'\+federalTaxId/);
  assert.match(route,/\^\\d\{14\}\$/);
  assert.match(route,/\["admin", "adm"\]/);
  assert.match(route,/portal: "admin"/);
  assert.match(html,/portal do gestor é exclusivo para usuários, perfis e liberações/);
  assert.match(html,/class="sb-nav admin-sidebar"/);
  assert.match(html,/admin-company-search/);
  assert.match(html,/selecionarEmpresaAdmin/);
  assert.match(html,/abrirEmpresaEmissao/);
  assert.match(html,/function entrarComSessaoSalva/);
  assert.match(html,/entrarComSessaoSalva\(\)\.catch/);
  assert.match(html,/abrirAreaAutenticada\(access\)/);
  assert.match(html,/async function selecionarEmpresaAdmin\(companyId\)[\s\S]{0,260}abrirEmpresaEmissao\(companyId\)/);
  assert.match(html,/Preparando o ambiente fiscal da empresa/);
  assert.match(html,/Sem vínculo company_users/);
  assert.match(html,/Sem usuário ativo/);
  assert.doesNotMatch(html,/mode:"master_impersonation"/);
  assert.match(html,/data-master-tab="usuarios"/);
  assert.match(html,/data-master-tab="perfis"/);
});

test("consulta CNPJ preenche emitente e endereço do tomador", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/consultarCnpjEmitente\(\)/);
  assert.match(html,/\/api\/company\/lookup\/cnpj\//);
  assert.match(html,/id="t-municipio"/);
  assert.match(html,/postalCode:qs\('#t-cep'\)/);
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
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(landing,/Quero contratar o emissor/);
  assert.match(landing,/\/api\/contact/);
  assert.match(landing,/titan-nfse-logo\.png/);
  assert.match(landing,/\/api\/system\/branding/);
  assert.match(landing,/carregarBrandingPortal/);
  assert.match(landing,/Emita suas notas fiscais com o poder e a velocidade do/);
  assert.match(landing,/Tudo o que sua empresa precisa/);
  assert.match(landing,/id="login-drawer"/);
  assert.match(landing,/client-login-form/);
  assert.match(landing,/admin-login-form/);
  assert.match(landing,/authLogin\(\{federalTaxId:cnpj,password\}\)/);
  assert.match(landing,/authLogin\(\{email,password\}\)/);
  assert.doesNotMatch(landing,/location\.replace\(access\.user\.isMaster/);
  assert.match(html,/pipe-detail/);
  assert.match(html,/mostrarDetalheEtapa/);
  assert.match(html,/journey-card/);
  assert.doesNotMatch(html,/Os dados abaixo montam/);
});

test("redireciona a raiz e separa os acessos de cliente e administrador",async()=>{
  const home=await readFile(resolve(root,"app/page.tsx"),"utf8");
  const index=await readFile(resolve(root,"public/index.html"),"utf8");
  const route=await readFile(resolve(root,"app/nfs/[[...tenant]]/page.tsx"),"utf8");
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(home,/redirect\("\/nfs"\)/);
  assert.match(index,/location\.replace\('\/nfs'\)/);
  assert.match(route,/target\.toLowerCase\(\) === "entrar"/);
  assert.match(html,/Sou administrador master/);
  assert.match(html,/qs\('#login-context-link'\)\.textContent='Sou cliente'/);
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
  assert.match(html,/titan-nfse-logo\.png/);
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

test("entrega catalogo NBS, redefinicao dedicada e contatos comerciais",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
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
  assert.match(html,/id="s-base-val"/);
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
  assert.match(html,/Abrir emissão ↗/);
  assert.match(html,/background:linear-gradient\(135deg,var\(--navy\),var\(--navy-2\)\)/);
  assert.doesNotMatch(html,/#e94560/);
  assert.match(html,/\/api\/customers\//);
  assert.match(html,/\/api\/onboarding\/check/);
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
  assert.match(html,/MVP aprovado pelo conselho/);
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
  assert.match(html,/gerarRedefinicaoSenha\('\$\{u\.id\}','\$\{u\.company_id\}'\)/);
  assert.match(html,/CNPJ da empresa:/);
  assert.match(html,/info\.federalTaxId/);
  assert.doesNotMatch(html,/Conta: \$\{info\.email/);
  assert.match(html,/id="system-dialog"/);
  assert.match(html,/window\.alert=\(message\)=>\{titanAlert\(message\)\}/);
  assert.match(html,/function titanConfirm/);
  assert.match(html,/function titanPrompt/);
  assert.doesNotMatch(html,/\bconfirm\(/);
  assert.doesNotMatch(html,/\bprompt\(/);
  assert.doesNotMatch(html,/prompt\('Copie o link de redefinição/);
  assert.doesNotMatch(html,/alert\(`Abrir redefinição/);
  assert.doesNotMatch(html,/Senha inválida\.<\/b>/);
  assert.match(html,/\['li-cnpj','li-mail','li-pw'\]\.forEach/);
  assert.match(html,/\['reset-password','reset-password-confirm'\]\.forEach/);
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
});

test("orienta configurações de Gmail, Outlook e Google Drive no Master",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/Envio de NFS-e ao tomador/);
  assert.match(html,/Identidade visual do portal/);
  assert.match(html,/id="set-portal-logo"/);
  assert.match(html,/portalLogoDataUrl/);
  assert.match(html,/function prepararLogoPortalMaster/);
  assert.match(html,/\/api\/system\/branding/);
  assert.match(html,/Gmail \/ Google Workspace/);
  assert.match(html,/Outlook \/ Microsoft 365/);
  assert.match(html,/O plugin conectado no Codex não é usado como credencial do site/);
  assert.match(html,/id="set-drive-enabled"/);
  assert.match(html,/googleDriveArchiveEnabled/);
  assert.match(html,/hasGoogleDriveServiceAccountKey/);
});
