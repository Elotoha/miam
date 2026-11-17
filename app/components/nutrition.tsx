import { useState } from 'react';
import { nutrients, total, mealPoints, targets, indicator, number, type Item, type Profile, type Total, type NutrientKey } from '~/lib/nutrition';
export function Nutrition({items,profile,share=1,compact=false}:{items:Item[];profile:Profile;share?:number;compact?:boolean}){
 const sum=total(items), ranges=targets(profile), selected=compact?nutrients.filter(n=>['energy','protein','carbs','fat','fiber'].includes(n[0])):nutrients;
 const groups=[...new Set(selected.map(n=>n[3]))];
 return <div className="nutrition"><div className="nutri-heading"><div><p className="eyebrow">BILAN {share<1?'DU REPAS':'DE LA JOURNÉE'}</p><h3>{number(sum.values.energy,0)} <small>kcal</small> <span className="points">{mealPoints(sum)===null?'Points : données incomplètes':`≈ ${mealPoints(sum)} points WW*`}</span></h3></div></div>
 {groups.map(g=><div key={g} className="nutri-group">{!compact&&<h4>{g}</h4>}{selected.filter(n=>n[3]===g).map(([key,label,unit])=>{const status=indicator(key,sum,ranges,share);return <div className="nutri-row" key={key}><div><span>{label}</span><strong>{sum.coverage[key]!==sum.count&&sum.values[key]!==undefined?'≥ ':''}{number(sum.values[key])} <small>{unit}</small></strong></div><div className={`meter ${status.tone}`}><span style={{width:`${status.percent}%`}}/></div><small>{status.label}{ranges[key]&&(ranges[key]!.min!==undefined||ranges[key]!.max!==undefined)?` · repère ${ranges[key]!.min===undefined?'':number(ranges[key]!.min!*share)}${ranges[key]!.max===undefined?' et +':' – '+number(ranges[key]!.max!*share)} ${unit}`:''}</small></div>})}</div>)}
 {!items.length&&<p className="muted">Ajoutez un aliment pour commencer le bilan.</p>}
 <p className="fine">{share<1?'Repères répartis à titre indicatif sur ce repas ; les micronutriments s’apprécient surtout sur la journée. ':''}Gris = données inconnues ou sans repère. Une donnée manquante ne vaut jamais zéro. *Approximation SmartPoints, pas un calcul officiel WeightWatchers.</p></div>;
}
export function MealLines({items,profile,children}:{items:Item[];profile:Profile;children?:(i:Item)=>React.ReactNode}){
 const [criterion,setCriterion]=useState<NutrientKey>('saturated');
 const sum=total(items);
 const sorted=[...items].sort((a,b)=>(b.nutrients[criterion]??-1)*b.grams-(a.nutrients[criterion]??-1)*a.grams);
 return <div><div className="line-tools"><h3>Dans ce repas <span className="count">{items.length}</span></h3><label>Comparer par<select value={criterion} onChange={e=>setCriterion(e.target.value as NutrientKey)}>{[['saturated','AGS'],['sodium','Sodium'],['energy','Énergie'],['sugars','Sucres'],['protein','Protéines']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div><p className="fine">Plus forte contribution en premier, selon les valeurs connues. Touchez une ligne pour voir son détail.</p>
 {sorted.map((i,index)=>{const value=i.nutrients[criterion];return <details className="food-line" key={i.id}><summary><div className="food-line-title"><strong>{i.name}</strong><span>{number(i.grams,0)} g {i.estimated?'· poids estimé':''}</span>{index===0&&value!==undefined&&<small className="tag">Contribution la plus élevée</small>}</div><div className="mini-bars" aria-label="Contribution aux totaux connus du repas">{(['protein','carbs','fat'] as const).map((key,j)=><span key={key} title={key}><small>{['P','G','L'][j]}</small><i><b style={{width:`${i.nutrients[key]!==undefined&&sum.values[key]?Math.min(100,i.nutrients[key]!*i.grams/100/sum.values[key]!*100):0}%`,background:['#397469','#d78c3e','#8c78ad'][j]}}/></i>{i.nutrients[key]===undefined&&<small>?</small>}</span>)}<span title="Contribution moyenne aux micronutriments connus du repas, pas une note"><small>M</small><i><b style={{width:`${microShare(i,sum)}%`,background:'#869f62'}}/></i></span><small>Micros : {nutrients.filter(n=>['Minéraux','Vitamines'].includes(n[3])&&i.nutrients[n[0]]!==undefined).length}/12 connus</small></div><span aria-hidden="true">⌄</span></summary><div className="line-detail"><p className="fine">{i.source||'Source non renseignée'}{i.note?' · '+i.note:''}</p><Nutrition items={[i]} profile={profile} share={1}/><p>Gluten : <strong>{allergenLabel(i.gluten)}</strong> · Lactose : <strong>{allergenLabel(i.lactose)}</strong></p>{children?.(i)}</div></details>})}</div>;
}
export function allergenLabel(v:string){return ({unknown:'inconnu',present:'présent',absent:'absence déclarée',traces:'traces possibles'} as Record<string,string>)[v]||'inconnu';}
export function Advice({items,profile}:{items:Item[];profile:Profile}){
 const sum=total(items), messages:string[]=[];
 for(const [key,label] of [['gluten','gluten'],['lactose','lactose']] as const)if(profile.intolerances.includes(key)){
  if(items.some(i=>i[key]==='present'||i[key]==='traces'))messages.push(`Vigilance ${label} : présence ou traces déclarées dans ce repas. Vérifiez les produits.`);
  if(items.some(i=>i[key]==='unknown'))messages.push(`${label} : au moins un aliment sans information. L’absence n’est pas garantie.`);
 }
 if(items.length&&sum.coverage.fat!==items.length)messages.push('Complétez les lipides et glucides des aliments pour obtenir un bilan plus fiable.');
 if(sum.values.saturated!==undefined&&sum.coverage.saturated===items.length&&sum.values.saturated>10)messages.push('Les graisses saturées se concentrent ici : comparez les lignes, puis essayez une portion plus petite ou une autre option.');
 if(items.length&&sum.coverage.fiber===items.length&&(sum.values.fiber||0)<5)messages.push('Peu de fibres dans les valeurs connues : envisagez des légumes, des légumineuses ou une céréale complète.');
 if(!messages.length&&items.length)messages.push('Comparez ce repas au reste de la journée et à votre programme. Aucun aliment n’est « mauvais » à lui seul.');
 return messages.length?<aside className="advice"><p className="eyebrow">POUR VOUS AIDER À CHOISIR</p>{messages.map(m=><p key={m}>↗ {m}</p>)}</aside>:null;
}

function microShare(item:Item,sum:Total){const keys=nutrients.filter(n=>['Minéraux','Vitamines'].includes(n[3])&&item.nutrients[n[0]]!==undefined&&(sum.values[n[0]]||0)>0).map(n=>n[0]);return keys.length?keys.reduce((v,k)=>v+item.nutrients[k]!*item.grams/100/sum.values[k]!*100,0)/keys.length:0;}
