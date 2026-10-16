const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('src/lib/vortex-validation.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={exports:{},module:{exports:{}}};
sandbox.exports=sandbox.module.exports;
vm.runInNewContext(js,sandbox,{timeout:1000});
const validate=sandbox.module.exports.validateVortexMembers;
const members=(n)=>[...Array(n)].map((_,i)=>({slot:i+1,team:'1'})).concat([...Array(n)].map((_,i)=>({slot:i+5,team:'2'})));
for(const [mode,n] of [['1v1',1],['2v2',2],['4v4',4]]){
 test(mode+' accepts exact slot counts but does not verify identity',()=>{const result=validate(mode,members(n));assert.equal(result.valid,true);assert.equal(result.identityVerified,false);});
 test(mode+' rejects missing opponent',()=>assert.equal(validate(mode,members(n).slice(0,-1)).valid,false));
 test(mode+' rejects duplicate slot',()=>assert.equal(validate(mode,[...members(n),members(n)[0]]).valid,false));
 test(mode+' rejects same team on both sides',()=>assert.equal(validate(mode,members(n).map(x=>({...x,team:'1'}))).valid,false));
}
test('rejects slot 9',()=>assert.equal(validate('1v1',[{slot:1,team:'1'},{slot:9,team:'2'}]).valid,false));
test('rejects unknown team',()=>assert.equal(validate('1v1',[{slot:1,team:'xyz'},{slot:5,team:'2'}]).valid,false));
test('rejects malformed list',()=>assert.equal(validate('1v1',null).valid,false));
