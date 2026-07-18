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
  assert.match(html, /A simulação artificial foi removida/);
});

test("oferece documentos e cancelamento oficial sem identidade visual", async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  assert.match(html,/\/api\/invoices\/'\+id\+'\/xml/);
  assert.match(html,/\/api\/invoices\/'\+id\+'\/pdf/);
  assert.match(html,/X-Confirm-Cancellation/);
  assert.match(html,/Cancelar NFS-e oficialmente/);
  assert.doesNotMatch(html,/Identidade visual|v-marca/);
});

test("isola as rotas do master e de cada CNPJ",async()=>{
  const html=await readFile(resolve(root,"public/titan.html"),"utf8");
  const route=await readFile(resolve(root,"app/nfs/[[...tenant]]/page.tsx"),"utf8");
  assert.match(html,/PORTAL_ADMIN/);
  assert.match(html,/PORTAL_CNPJ/);
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
  assert.match(html,/async function selecionarEmpresaAdmin\(companyId\)[\s\S]{0,260}abrirEmpresaEmissao\(companyId\)/);
  assert.match(html,/Preparando o ambiente fiscal da empresa/);
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
  assert.match(landing,/Emita suas notas fiscais com o poder e a velocidade do/);
  assert.match(landing,/Tudo o que sua empresa precisa/);
  assert.match(landing,/href="\/nfs\/admin"/);
  assert.match(landing,/href="\/nfs\/entrar"/);
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
  assert.match(html,/Entre com o CNPJ da empresa e sua senha individual/);
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
  assert.match(html,/Definir senha/);
  assert.match(html,/id="e-email"/);
  assert.match(html,/id="e-phone"/);
  assert.match(html,/class="commercial-letterhead"/);
  assert.match(html,/id="co-observation"/);
  assert.match(html,/id="co-payment"/);
  assert.match(html,/id="co-conditions"/);
});
