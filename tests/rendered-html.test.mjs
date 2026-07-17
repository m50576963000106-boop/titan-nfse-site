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
