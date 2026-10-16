const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const src=fs.readFileSync('src/app/api/queue/cancel/route.ts','utf8');
test('cancel requires hashed team credentials',()=>assert.match(src,/queue_token_hash=\$2/));
test('cancel serializes with matchmaking lock',()=>assert.match(src,/pg_advisory_xact_lock\(hashtext\(\$1\)\)/));
test('cancel refuses to undo formed matches',()=>assert.match(src,/if\(matched\.rowCount\)/));
test('cancel removes only own queue entry',()=>assert.match(src,/DELETE FROM arena_queue WHERE team_id=\$1/));
