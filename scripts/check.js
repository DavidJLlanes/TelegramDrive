// Comprobación estática: sintaxis de todo el JS y límite de tamaño por archivo.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MAX_LINES = 220;
const roots = ['server', 'scripts', 'public/js', 'public/sw.js'];
let bad = 0;

function* walk(p) {
  const stat = fs.statSync(p);
  if (stat.isFile()) { if (p.endsWith('.js')) yield p; return; }
  for (const e of fs.readdirSync(p)) yield* walk(path.join(p, e));
}

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
    catch (e) { bad += 1; console.error(`SINTAXIS ${file}\n${e.stderr}`); }
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    if (lines > MAX_LINES) { bad += 1; console.error(`DEMASIADO LARGO ${file}: ${lines} líneas`); }
  }
}
console.log(bad ? `${bad} problema(s)` : 'Todo correcto');
process.exit(bad ? 1 : 0);
