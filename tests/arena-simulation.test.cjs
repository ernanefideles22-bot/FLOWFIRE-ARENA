const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(path){const source=fs.readFileSync(path,'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};vm.runInNewContext(js,{module,exports:module.exports},{timeout:1000});return module.exports;}
const {validateTeam,capacity}=load('src/lib/match.ts');
for(const [mode,n] of Object.entries(capacity)){
 const team={name:'ALFA',captain:'Capitao',players:Array.from({length:n},(_,i)=>'Jogador'+(i+1))};
 test(mode+' accepts correct team size',()=>assert.equal(validateTeam(mode,team).players.length,n));
 test(mode+' rejects missing player',()=>assert.throws(()=>validateTeam(mode,{...team,players:team.players.slice(1)})));
 test(mode+' rejects extra player',()=>assert.throws(()=>validateTeam(mode,{...team,players:[...team.players,'Extra']})));
 test(mode+' rejects blank captain',()=>assert.throws(()=>validateTeam(mode,{...team,captain:'  '})));
 if(n>1)test(mode+' rejects duplicate player',()=>assert.throws(()=>validateTeam(mode,{...team,players:Array(n).fill('Same')})));
}
test('rejects blank team name',()=>assert.throws(()=>validateTeam('1v1',{name:' ',captain:'C',players:['A']})));
test('normalizes whitespace',()=>assert.equal(validateTeam('1v1',{name:' ALFA ',captain:' C ',players:[' A ']}).name,'ALFA'));
