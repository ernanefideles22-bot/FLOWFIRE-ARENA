const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const api=fs.readFileSync('src/app/api/match-status/route.ts','utf8');const ui=fs.readFileSync('src/app/page.tsx','utf8');
test('match status checks actual queue membership',()=>assert.match(api,/SELECT 1 FROM arena_queue WHERE team_id=\$1 LIMIT 1/));
test('unmatched team is registered unless queued',()=>assert.match(api,/status:queued\.rowCount\?'waiting':'registered'/));
test('UI displays registered state separately',()=>assert.match(ui,/Equipe cadastrada\. Você ainda não está na fila\./));
test('UI displays waiting state separately',()=>assert.match(ui,/Aguardando adversário da mesma modalidade\./));
