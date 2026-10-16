const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const src=fs.readFileSync('src/lib/simulation.ts','utf8');const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports},{timeout:1000});const {simulateStandings,simulateResult}=module.exports;
const matches=[{id:'m1',mode:'1v1',teamA:'Alfa',teamB:'Beta',status:'ready'},{id:'m2',mode:'1v1',teamA:'Beta',teamB:'Gama',status:'ready'}];
test('three points for a win',()=>{const r=simulateStandings(matches.slice(0,1),[simulateResult('m1',4,2)]);assert.equal(r[0].teamId,'Alfa');assert.equal(r[0].points,3);});
test('draw awards one point to each',()=>{const r=simulateStandings(matches.slice(0,1),[simulateResult('m1',2,2)]);assert.equal(r[0].points,1);assert.equal(r[1].points,1);});
test('goal difference breaks ties',()=>{const r=simulateStandings(matches,[simulateResult('m1',4,0),simulateResult('m2',0,2)]);assert.equal(r[0].teamId,'Alfa');});
test('unplayed matches excluded',()=>assert.equal(simulateStandings(matches,[]).length,0));
test('total played matches counted twice',()=>{const r=simulateStandings(matches,[simulateResult('m1',1,0),simulateResult('m2',1,0)]);assert.equal(r.reduce((s,t)=>s+t.played,0),4);});
