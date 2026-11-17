import {Form,useLoaderData,useActionData,redirect} from 'react-router';
import {useState} from 'react';
import type {Route} from './+types/foods';
import {session,catalog,positive} from '~/lib/workspace';
import {nutrients,type Nutrients} from '~/lib/nutrition';
import {Shell,Alert,Empty} from '~/components/layout';
import {allergenLabel} from '~/components/nutrition';
export async function loader({request,context}:Route.LoaderArgs){const {db,user}=await session(request,context);return {foods:await catalog(db,user.id,true)};}
export async function action({request,context}:Route.ActionArgs){
 const {db,user}=await session(request,context),form=await request.formData(),intent=form.getAll('intent').at(-1),id=String(form.get('id')||'');
 try{
 const foods=await catalog(db,user.id,true),existing=foods.find(f=>f.id===id);
 if(intent==='preference'||intent==='hide'){
  if(!existing)throw new Error('Aliment introuvable.');const affinity=form.get('affinity')===''?null:Number(form.get('affinity'));
  if(affinity!==null&&(!Number.isInteger(affinity)||affinity<0||affinity>5))throw new Error('Choisissez une note entre 0 et 5.');
  await db.prepare('INSERT INTO food_preferences(user_id,food_id,affinity,available) VALUES(?,?,?,?) ON CONFLICT(user_id,food_id) DO UPDATE SET affinity=excluded.affinity,available=excluded.available').bind(user.id,id,affinity,intent==='hide'?0:form.get('available')==='on'?1:0).run();
 }else if(intent==='save'){
  if(id&&!existing)throw new Response('Aliment introuvable',{status:404});
  const name=String(form.get('name')||'').trim(),category=String(form.get('category')||'').trim(),source=String(form.get('source')||'').trim();
  if(!name||name.length>150||!category||category.length>80||source.length>500)throw new Error('Vérifiez le nom, la catégorie et la source.');
  const values:Nutrients={};
  for(const [key,,unit] of nutrients){const raw=String(form.get(key)||'');if(raw!==''){const n=Number(raw);if(!Number.isFinite(n)||n<0||n>(unit==='g'?100:100000))throw new Error('Valeur nutritionnelle invalide : '+key);values[key]=n;}}
  for(const [parent,children] of [['fat',['saturated','mono','poly']],['carbs',['sugars','starch']]] as const){if(values[parent]!==undefined&&children.some(k=>values[k]!==undefined&&values[k]!>values[parent]!+.1))throw new Error('Une sous-catégorie ne peut pas dépasser le total '+parent);}
  const gluten=String(form.get('allergen_gluten')),lactose=String(form.get('allergen_lactose'));if(![gluten,lactose].every(v=>['unknown','present','absent','traces'].includes(v)))throw new Error('Information allergène invalide.');
  const key=existing?.owner_user_id===user.id?id:crypto.randomUUID(),origin=existing?(existing.origin_id||existing.id):null;
  const stmt=db.prepare(`INSERT INTO catalog_foods(id,owner_user_id,origin_id,name,category,portion,nutrients,source,gluten,lactose) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,portion=excluded.portion,nutrients=excluded.nutrients,source=excluded.source,gluten=excluded.gluten,lactose=excluded.lactose`).bind(key,user.id,origin,name,category,positive(form.get('portion'),5000),JSON.stringify(values),source||'Saisie utilisateur, source non précisée',gluten,lactose);
  const prefs=db.prepare('INSERT INTO food_preferences(user_id,food_id,affinity,available) VALUES(?,?,?,?) ON CONFLICT(user_id,food_id) DO UPDATE SET affinity=excluded.affinity,available=excluded.available').bind(user.id,key,existing?.affinity??null,existing?.available??1);
  await db.batch([stmt,prefs]);
 }else throw new Error('Action inconnue.');
 return redirect('/foods');
 }catch(e){if(e instanceof Response)throw e;return {error:e instanceof Error?e.message:'Impossible d’enregistrer.'};}
}
export default function Foods(){const {foods}=useLoaderData<typeof loader>(),result=useActionData<typeof action>(),[query,setQuery]=useState(''),[edit,setEdit]=useState<string|null>(null),[hidden,setHidden]=useState(false);
 const food=foods.find(f=>f.id===edit),list=foods.filter(f=>(hidden||f.available)&&f.name.toLowerCase().includes(query.toLowerCase()));
 return <Shell title="Les aliments à votre goût" subtitle="Un catalogue personnel, des préférences et des données que vous pouvez enrichir." action={<button className="primary" onClick={()=>setEdit('new')}>＋ Ajouter</button>}>
 {result?.error&&<Alert>{result.error}</Alert>}
 {edit!==null&&<section className="card"><div className="section-title"><h2>{food?'Modifier '+food.name:'Nouvel aliment'}</h2><button className="text-button" onClick={()=>setEdit(null)}>Fermer</button></div><p className="fine">Vos modifications restent personnelles. Les repas déjà enregistrés conservent leurs valeurs. Tous les nutriments sont indiqués pour 100 g ; laissez vide ce qui est inconnu.</p><Form method="post" className="stack" key={edit}><input type="hidden" name="intent" value="save"/><input type="hidden" name="id" value={food?.id||''}/><div className="two-cols"><label>Nom<input name="name" defaultValue={food?.name} maxLength={150} required/></label><label>Catégorie<input name="category" defaultValue={food?.category||'Autre'} maxLength={80} required/></label><label>Portion usuelle (g)<input name="portion" type="number" min="1" max="5000" step="0.1" defaultValue={food?.portion||100} required/></label><label>Source / produit / cru ou cuit<input name="source" defaultValue={food?.source} maxLength={500} placeholder="Étiquette, Ciqual, recette…"/></label></div>
 {[...new Set(nutrients.map(n=>n[3]))].map(group=><details className="field-group" key={group} open={group==='Énergie'||group==='Macronutriments'}><summary>{group} · pour 100 g</summary><div className="nutrient-fields">{nutrients.filter(n=>n[3]===group).map(([key,label,unit])=><label key={key}>{label} ({unit})<input name={key} type="number" step="any" min="0" max={unit==='g'?100:100000} defaultValue={food?.nutrients[key]??''} placeholder="Inconnu"/></label>)}</div></details>)}
 <p className="fine">Glucides : séparer sucres et amidon ne mesure pas l’index glycémique. Pour les allergènes, une valeur nutritionnelle ne garantit pas l’absence de traces.</p><div className="two-cols">{(['gluten','lactose'] as const).map(k=><label key={k}>{k==='gluten'?'Gluten':'Lactose'} — information produit<select name={"allergen_"+k} defaultValue={food?.[k]||'unknown'}>{['unknown','present','absent','traces'].map(v=><option key={v} value={v}>{allergenLabel(v)}</option>)}</select></label>)}</div><button className="primary">Enregistrer cet aliment</button></Form></section>}
 <div className="catalog-tools"><label className="search-label">Rechercher un aliment<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Lasagnes, yaourt, brocoli…"/></label><label className="check"><input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)}/>Voir les aliments retirés</label></div>
 <div className="catalog-grid">{list.map(f=><article className={'card catalog-item '+(!f.available?'unavailable':'')} key={f.id}><div className="section-title"><span className="tag">{f.category}</span><button className="text-button" onClick={()=>setEdit(f.id)}>Modifier</button></div><h2>{f.name}</h2><p className="fine">Portion usuelle : {f.portion} g · {Object.keys(f.nutrients).length}/{nutrients.length} valeurs connues</p><Form method="post" className="stack"><input type="hidden" name="intent" value="preference"/><input type="hidden" name="id" value={f.id}/><label>Mon affinité<select name="affinity" defaultValue={f.affinity??''}><option value="">Pas encore noté</option>{[0,1,2,3,4,5].map(i=><option key={i} value={i}>{i}/5 — {['Je n’aime pas','Très peu','Un peu','J’aime bien','J’aime beaucoup','J’adore'][i]}</option>)}</select></label><label className="check"><input name="available" type="checkbox" defaultChecked={!!f.available}/>Disponible dans mon catalogue</label><button className="secondary">Enregistrer ma préférence</button>{!!f.available&&<button className="danger" name="intent" value="hide">Retirer de mon catalogue</button>}</Form></article>)}</div>{!list.length&&<Empty title="Aucun aliment trouvé"><button className="primary" onClick={()=>setEdit('new')}>Créer un aliment</button></Empty>}
 </Shell>;
}
