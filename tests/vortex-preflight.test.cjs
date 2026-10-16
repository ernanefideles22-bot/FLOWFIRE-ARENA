const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const src=fs.readFileSync('src/app/api/admin/vortex-match-preflight/route.ts','utf8');
test('preflight requires admin authentication',()=>assert.match(src,/if\(!authorized\(req\)\)/));
test('preflight only reads transaction',()=>assert.match(src,/BEGIN READ ONLY/));
test('preflight explicitly blocks room creation',()=>assert.match(src,/canCreate:false/));
test('preflight does not contact provider',()=>assert.match(src,/providerCalled:false/));
test('preflight validates requested match ID',()=>assert.match(src,/Partida inválida/));
