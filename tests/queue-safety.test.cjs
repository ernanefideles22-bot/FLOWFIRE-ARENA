const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const src=fs.readFileSync('src/app/api/queue/route.ts','utf8');
test('queue excludes teams already present in a match',()=>assert.match(src,/NOT EXISTS\s*\(SELECT 1 FROM arena_matches m WHERE m\.team_a=q\.team_id OR m\.team_b=q\.team_id\)/));
test('queue verifies opponent team mode',()=>assert.match(src,/t\.mode=\$2/));
test('queue uses transaction advisory lock by mode',()=>assert.match(src,/pg_advisory_xact_lock\(hashtext\(\$1\)\)/));
test('existing matches clear stale queue membership',()=>assert.match(src,/if\(existing\.rowCount\)\{await c\.query\('DELETE FROM arena_queue WHERE team_id=\$1'/));
