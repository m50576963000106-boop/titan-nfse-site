// Verifica a sintaxe do JavaScript embutido nos HTML de public/ (titan.html,
// nfs.html). O SPA é um único arquivo grande; este check pega erros de parse
// (colchete/aspas/regex) antes do deploy, sem precisar de navegador.
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

if (failed) {
  console.error("\nFalha: há erro de sintaxe no JS inline. Corrija antes do deploy.");
  process.exit(1);
}
console.log(`OK — ${checked} script(s) inline verificados, sem erro de sintaxe.`);
