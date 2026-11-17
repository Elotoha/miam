import type { Food } from './workspace';
import type { Item } from './nutrition';
export type Rule = {id:string;kind:'all'|'any';children:Rule[]}|{id:string;kind:'food';foodId:string;grams:number;unlimited?:boolean;note?:string};
export type Program = {id:string;meal_type:string;title:string;tree:Rule};
export function validateRule(value:unknown,foods:Food[],depth=0,counter={n:0}):value is Rule{
 if(depth>6||++counter.n>100||!value||typeof value!=='object')return false;
 const v=value as any;
 if(typeof v.id!=='string'||v.id.length>100)return false;
 if(v.kind==='food')return foods.some(f=>f.id===v.foodId||f.origin_id===v.foodId)&&(v.unlimited===undefined||typeof v.unlimited==='boolean')&&Number.isFinite(v.grams)&&v.grams>0&&v.grams<=5000&&(!v.note||typeof v.note==='string'&&v.note.length<=300);
 return ['all','any'].includes(v.kind)&&Array.isArray(v.children)&&v.children.length>0&&v.children.length<=30&&v.children.every((c:unknown)=>validateRule(c,foods,depth+1,counter))&&complexity(v)<=128;
}
export function suggest(rule:Rule,foods:Food[],variant=0):{food:Food;grams:number}[]{
 if(rule.kind==='food'){const f=foods.find(f=>f.id===rule.foodId||f.origin_id===rule.foodId);return f?[{food:f,grams:rule.grams}]:[];}
 const groups=rule.children.map(c=>suggest(c,foods,variant));
 if(rule.kind==='all')return groups.some(g=>!g.length)?[]:groups.flat();
 const ranked=groups.filter(g=>g.length).sort((a,b)=>score(b)-score(a));
 return ranked[Math.abs(Math.floor(variant))%Math.max(1,ranked.length)]||[];
}
function score(group:{food:Food;grams:number}[]){return group.reduce((s,i)=>s+(i.food.affinity??2.5),0)/Math.max(1,group.length);}
function combinations(rule:Rule):Extract<Rule,{kind:'food'}>[][] {
 if(rule.kind==='food')return [[rule]];
 if(rule.kind==='any')return rule.children.flatMap(combinations);
 return rule.children.reduce<Extract<Rule,{kind:'food'}>[][]>((a,c)=>a.flatMap(left=>combinations(c).map(right=>[...left,...right])),[[]]);
}
function complexity(rule:Rule):number {return rule.kind==='food'?1:rule.kind==='any'?rule.children.reduce((s,c)=>Math.min(129,s+complexity(c)),0):rule.children.reduce((s,c)=>Math.min(129,s*complexity(c)),1);}
export function evaluate(rule:Rule,items:Pick<Item,'food_id'|'grams'>[],foods:Food[]):{ok:boolean;messages:string[]}{
 if(complexity(rule)>128)return {ok:false,messages:['Programme trop complexe : réduisez les combinaisons.']};
 const canonical=(id:string|null)=>foods.find(f=>f.id===id||f.origin_id===id)?.id||id;
 const amounts=new Map<string|null,number>();
 for(const i of items)amounts.set(canonical(i.food_id),(amounts.get(canonical(i.food_id))||0)+i.grams);
 const results=combinations(rule).map(option=>{
  const required=new Map<string,{grams:number;unlimited:boolean;name:string}>();
  for(const leaf of option){const f=foods.find(f=>f.id===leaf.foodId||f.origin_id===leaf.foodId),id=f?.id||leaf.foodId,r=required.get(id)||{grams:0,unlimited:false,name:f?.name||'Aliment indisponible'};r.grams+=leaf.grams;r.unlimited ||= !!leaf.unlimited;required.set(id,r);}
  const messages=[...required].flatMap(([id,r])=>{const grams=amounts.get(id)||0;return grams>0&&(r.unlimited||Math.abs(grams-r.grams)<=r.grams*.1)?[]:[`${r.name} : ${r.unlimited?'à volonté':r.grams+' g attendus'} (${Math.round(grams)} g prévus)`]});
  return {messages,required};
 });
 const best=results.sort((a,b)=>a.messages.length-b.messages.length)[0];
 if(!best)return {ok:false,messages:['Programme vide.']};
 if(!best.messages.length){const extra=[...amounts.keys()].filter(id=>!best.required.has(id||''));return {ok:true,messages:extra.length?[`${extra.length} aliment(s) supplémentaire(s) hors des options, à apprécier dans le bilan complet.`]:[]};}
 return {ok:false,messages:best.messages};
}
// Only the complete, readable dinner block is reproduced. Other meals remain user-defined.
export function dinnerExample(foods:Food[]):Rule|null{
 const by=(name:string)=>foods.find(f=>f.name.toLowerCase()===name.toLowerCase());
 const leaf=(name:string,grams:number,unlimited=false):Rule|null=>{const f=by(name);return f?{id:crypto.randomUUID(),kind:'food',foodId:f.id,grams,unlimited}:null;};
 const group=(kind:'all'|'any',children:(Rule|null)[]):Rule=>({id:crypto.randomUUID(),kind,children:children.filter((c):c is Rule=>!!c)});
 const root=group('all',[
  group('any',[leaf('Brocoli cuit',200,true),leaf('Salade verte',200,true)]),
  leaf('Saumon',120),leaf('Riz cuit',120),leaf("Huile d'olive",10),
  group('any',[leaf('Comté',25),leaf('Fromage blanc 3%',100),leaf('Skyr nature',100)]),
  group('any',[leaf('Pomme',160),leaf('Banane',160),leaf('Orange',160)]),
 ]);
 return root;
}
