// Verifica a sintaxe do JavaScript do portal antes do deploy, sem precisar de
// navegador: os scripts embutidos nos HTML de public/ E os .js soltos ao lado
// deles. Pega erro de parse (colchete/aspas/regex) que só apareceria como
// tela branca em produção.
//
// Os .js entraram aqui em 19/08/2026, quando os 382 KB do aplicativo saíram de
// dentro de titan.html para titan.js: sem isso, o arquivo que concentra quase
// todo o código do portal deixaria de ser verificado justamente ao virar o
// arquivo mais importante.
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dir = "public";
let failed = false;
let checked = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(join(dir, file), "utf8");
  // scripts inline (sem src=) — parse goal "script" (clássico), por isso .cjs
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  scripts.forEach((code, i) => {
    if (!code.trim()) return;
    checked++;
    const tmp = join(tmpdir(), `titan_check_${file.replace(/\W/g, "_")}_${i}.cjs`);
    writeFileSync(tmp, code);
    try {
      execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
    } catch (error) {
      failed = true;
      const detail = error.stderr ? error.stderr.toString() : error.message;
      console.error(`\n✖ Erro de sintaxe em ${file} (script inline #${i}):\n${detail}`);
    } finally {
      try { unlinkSync(tmp); } catch {}
    }
  });
}

// Os .js soltos entraram aqui em 19/08/2026, quando os 382 KB do aplicativo
// saíram de dentro de titan.html para titan.js: sem esta parte, o arquivo que
// concentra quase todo o código do portal deixaria de ser verificado
// justamente ao virar o arquivo mais importante.
let arquivosJs = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  arquivosJs++;
  const tmp = join(tmpdir(), `titan_check_${file.replace(/\W/g, "_")}.cjs`);
  writeFileSync(tmp, readFileSync(join(dir, file), "utf8"));
  try {
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  } catch (error) {
    failed = true;
    console.error(`\n✖ Erro de sintaxe em ${file}:\n${error.stderr ? error.stderr.toString() : error.message}`);
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

if (failed) {
  console.error("\nFalha: há erro de sintaxe no JS do portal. Corrija antes do deploy.");
  process.exit(1);
}
console.log(`OK — ${checked} script(s) inline + ${arquivosJs} arquivo(s) .js verificados, sem erro de sintaxe.`);
