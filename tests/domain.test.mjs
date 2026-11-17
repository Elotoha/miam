import {test} from 'node:test';
import assert from 'node:assert/strict';
import {total,mealPoints,indicator} from '../app/lib/nutrition.ts';
import {validateRule,suggest,evaluate} from '../app/lib/program.ts';
const foods=[{id:'a',name:'A',affinity:1,origin_id:null},{id:'b',name:'B',affinity:5,origin_id:null}];
const leaf=(id,grams=100)=>({id:'leaf-'+id+grams,kind:'food',foodId:id,grams});
const any={id:'or',kind:'any',children:[leaf('a'),leaf('b')]};
test('unknown nutrients stay unknown; partial totals cannot produce green bars or WW totals',()=>{
 const sum=total([{grams:100,nutrients:{energy:100,protein:5,saturated:1,sugars:2,fiber:1}},{grams:50,nutrients:{energy:200}}]);
 assert.equal(sum.values.energy,200);assert.equal(sum.values.fat,undefined);assert.equal(sum.coverage.protein,1);assert.equal(mealPoints(sum),null);assert.equal(indicator('protein',sum,{protein:{min:1}}).tone,'unknown');
});
test('upper limits do not imply that a low sodium intake is insufficient',()=>{const sum=total([{grams:100,nutrients:{sodium:50}}]);assert.equal(indicator('sodium',sum,{sodium:{max:2000}}).tone,'good');});
test('nested AND/OR supports whole branches, not just individual substitutes',()=>{
 const r={id:'nested',kind:'any',children:[{id:'all',kind:'all',children:[leaf('a',100),leaf('b',50)]},leaf('b',200)]};
 assert.ok(validateRule(r,foods));assert.equal(evaluate(r,[{food_id:'a',grams:100}],foods).ok,false);
 assert.equal(evaluate(r,[{food_id:'a',grams:100},{food_id:'b',grams:50}],foods).ok,true);
 assert.equal(evaluate(r,[{food_id:'b',grams:200}],foods).ok,true);
});
test('one portion cannot satisfy two identical AND requirements',()=>{
 const r={id:'all',kind:'all',children:[leaf('a'),leaf('a')]};assert.equal(evaluate(r,[{food_id:'a',grams:100}],foods).ok,false);assert.equal(evaluate(r,[{food_id:'a',grams:200}],foods).ok,true);
});
test('suggestions favor affinity and never return an incomplete AND group',()=>{
 assert.equal(suggest(any,foods)[0].food.id,'b');assert.equal(suggest(any,foods,1)[0].food.id,'a');assert.deepEqual(suggest({id:'all',kind:'all',children:[leaf('a'),leaf('b')]},[foods[0]]),[]);
});
test('invalid or combinatorially excessive programs are rejected',()=>{
 assert.equal(validateRule({id:'bad',kind:'any',children:[]},foods),false);
 assert.equal(validateRule({id:'bad',kind:'all',children:Array.from({length:8},(_,i)=>({...any,id:String(i)}))},foods),false);
 assert.equal(validateRule({...leaf('a'),grams:-10},foods),false);
});
test('personal overrides satisfy references to the original food',()=>{const override=[{...foods[0],id:'personal',origin_id:'a'}];assert.ok(validateRule(leaf('a'),override));assert.equal(suggest(leaf('a'),override)[0].food.id,'personal');assert.ok(evaluate(leaf('a'),[{food_id:'personal',grams:100}],override).ok);});
