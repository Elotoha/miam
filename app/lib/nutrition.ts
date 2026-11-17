export const nutrients = [
 ['energy','Énergie','kcal','Énergie'], ['protein','Protéines','g','Macronutriments'],
 ['carbs','Glucides','g','Glucides'], ['sugars','dont sucres totaux','g','Glucides'], ['starch','dont amidon','g','Glucides'], ['fiber','Fibres','g','Glucides'],
 ['fat','Lipides','g','Lipides'], ['saturated','dont AG saturés','g','Lipides'], ['mono','dont AG mono-insaturés','g','Lipides'], ['poly','dont AG polyinsaturés','g','Lipides'], ['omega3','dont oméga-3','g','Lipides'],
 ['sodium','Sodium','mg','Minéraux'], ['calcium','Calcium','mg','Minéraux'], ['iron','Fer','mg','Minéraux'], ['magnesium','Magnésium','mg','Minéraux'], ['potassium','Potassium','mg','Minéraux'], ['zinc','Zinc','mg','Minéraux'],
 ['vitaminA','Vitamine A','µg','Vitamines'], ['vitaminC','Vitamine C','mg','Vitamines'], ['vitaminD','Vitamine D','µg','Vitamines'], ['vitaminE','Vitamine E','mg','Vitamines'], ['vitaminB9','Folates B9','µg','Vitamines'], ['vitaminB12','Vitamine B12','µg','Vitamines'],
 ['lactose','Lactose','g','Tolérances'], ['gluten','Gluten','mg','Tolérances'],
] as const;
export type NutrientKey = typeof nutrients[number][0];
export type Nutrients = Partial<Record<NutrientKey, number>>;
export type Item = { id: string; food_id: string|null; name: string; grams: number; nutrients: Nutrients; source: string; gluten: string; lactose: string; estimated: number; note: string };
export type Profile = { weight: number|null; height: number|null; age: number|null; sex: string|null; activity: number; target_weight: number|null; target_date: string|null; intolerances: string[]; targets: Partial<Record<NutrientKey,{min?:number;max?:number}>>; program_enabled: number };
export type Total = { values: Nutrients; coverage: Partial<Record<NutrientKey, number>>; count: number };
export function total(items: Pick<Item,'grams'|'nutrients'>[]): Total {
 const values: Nutrients = {}, coverage: Total['coverage'] = {};
 for (const [key] of nutrients) {
  const known = items.filter(i => typeof i.nutrients[key] === 'number' && Number.isFinite(i.nutrients[key]));
  coverage[key] = known.length;
  if (known.length) values[key] = known.reduce((s,i) => s+i.nutrients[key]!*i.grams/100,0);
 }
 return {values, coverage, count:items.length};
}
export function points(n: Nutrients): number|null {
 if (['energy','protein','saturated','sugars','fiber'].some(k=> n[k as NutrientKey] === undefined)) return null;
 return Math.max(0,Math.round((n.energy!+4*n.protein!+9*n.saturated!+3*n.sugars!-4*n.fiber!)/33));
}
// Adult population reference ranges; custom dietitian targets always take precedence.
export function targets(profile: Profile|null) {
 let energy: number|undefined;
 if(profile?.weight && profile.height && profile.age && ['female','male'].includes(profile.sex||'')) {
  energy = (10*profile.weight+6.25*profile.height-5*profile.age+(profile.sex==='male'?5:-161))*profile.activity;
 }
 if(energy!==undefined&&(!Number.isFinite(energy)||energy<=0))energy=undefined;
 const base: Profile['targets'] = {
  fiber:{min:25}, saturated:energy?{max:energy*.1/9}:{}, sodium:{max:2000}, calcium:{min:950}, magnesium:{min:300}, potassium:{min:3500},
  vitaminC:{min:95}, vitaminD:{min:15}, vitaminB12:{min:4}, vitaminB9:{min:330},
 };
 if(energy && energy>0){base.energy={min:energy*.9,max:energy*1.1};base.protein={min:profile!.weight!*.83};base.carbs={min:energy*.45/4,max:energy*.6/4};base.fat={min:energy*.2/9,max:energy*.35/9};}
 return {...base,...profile?.targets};
}
export function indicator(key:NutrientKey, sum:Total, target:Profile['targets'], share=1) {
 const value=sum.values[key], range=target[key];
 if(value===undefined || !sum.count || sum.coverage[key]!==sum.count) return {tone:'unknown', label:value===undefined?'Non renseigné':'Données partielles', percent:0};
 if(!range || (range.min===undefined && range.max===undefined)) return {tone:'neutral',label:'Sans repère défini',percent:0};
 const min=(range.min||0)*share, max=range.max===undefined?undefined:range.max*share;
 const percent=Math.min(100,value/(max||min||1)*100);
 if(max!==undefined && value>max) return {tone:'high',label:'Au-dessus du repère',percent};
 if(min && value<min) return {tone:'low',label:'Sous le repère',percent};
 return {tone:'good',label:'Dans le repère',percent};
}
export function number(n:number|undefined, digits=1){return n===undefined?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:digits}).format(n);}
export const mealTypes:Record<string,string>={'petit-dejeuner':'Petit-déjeuner',dejeuner:'Déjeuner',diner:'Dîner',collation:'Collation','collation-matin':'Collation du matin','collation-aprem':'Collation de l’après-midi'};
export function localDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}

export function mealPoints(sum:Total){return sum.count&&(["energy","protein","saturated","sugars","fiber"] as NutrientKey[]).every(k=>sum.coverage[k]===sum.count)?points(sum.values):null;}
