const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const source=fs.readFileSync('src/lib/simulation.ts','utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports},{timeout:1000});const {simulationStats,simulateResult}=module.exports;
const matches=[{id:'a',teamA:'A',teamB:'B',mode:'1v1',status:'ready'},{id:'b',teamA:'C',teamB:'D',mode:'1v1',status:'ready'}];
test('empty statistics',()=>{const s=simulationStats([],[]);assert.equal(s.finished,0);assert.equal(s.averagePointsPerMatch,0);});
test('counts scores and draws',()=>{const s=simulationStats(matches,[simulateResult('a',4,2),simulateResult('b',3,3)]);assert.equal(s.totalPointsScored,12);assert.equal(s.draws,1);assert.equal(s.averagePointsPerMatch,6);});
test('ignores unknown matches',()=>{const s=simulationStats(matches,[simulateResult('unknown',5,5)]);assert.equal(s.finished,0);});
