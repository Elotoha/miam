import { Form, useActionData, useLoaderData, redirect } from 'react-router';
import type { Route } from './+types/log';
import { session,catalog,profile,meal,positive,itemStatement,validDate,parse } from '~/lib/workspace';
import { localDate,mealTypes,total,mealPoints,number } from '~/lib/nutrition';
import { interpret } from '~/lib/assistant';
import { evaluate, type Program } from '~/lib/program';
import { Shell,Empty,Alert } from '~/components/layout';
import { Nutrition,MealLines,Advice } from '~/components/nutrition';
import { useState } from 'react';
export async function loader({request,context}:Route.LoaderArgs){
 const {db,user}=await session(request,context),url=new URL(request.url),id=url.searchParams.get('meal');
 const [foods,p,m,programs]=await Promise.all([catalog(db,user.id),profile(db,user.id),id?meal(db,user.id,id):null,db.prepare('SELECT * FROM meal_programs WHERE user_id=?').bind(user.id).all<any>()]);
 return {foods,profile:p,meal:m,programs:programs.results.map(p=>({...p,tree:parse(p.tree_json,null)})) as Program[],date:url.searchParams.get('date')||localDate(),type:url.searchParams.get('meal_type')||'dejeuner'};
}
export async function action({request,context}:Route.ActionArgs){
 const {db,user,env}=await session(request,context),form=await request.formData(),intent=String(form.get('intent')||''),id=String(form.get('meal_id')||'');
 try{
 if(intent==='create'){
  const date=String(form.get('date')),type=String(form.get('meal_type'));
  if(!validDate(date)||!mealTypes[type])throw new Error('Date ou type de repas invalide.');
  const key=crypto.randomUUID();
  await db.prepare('INSERT INTO meals(id,user_id,date,meal_type,status,title) VALUES (?,?,?,?,?,?)').bind(key,user.id,date,type,'draft',mealTypes[type]).run();
  return redirect('/log?meal='+key);
 }
 const m=await meal(db,user.id,id);
 if(intent==='estimate'){
  const text=String(form.get('description')||''); if(text.length<2||text.length>2000)throw new Error('Décrivez votre repas en 2 à 2 000 caractères.');
  const count=await db.prepare(`INSERT INTO ai_usage(user_id,date,count) VALUES (?,?,1) ON CONFLICT(user_id,date) DO UPDATE SET count=count+1 WHERE count<20 RETURNING count`).bind(user.id,localDate()).first();
  if(!count)throw new Error('La limite de 20 estimations par jour est atteinte. Vous pouvez continuer avec la saisie manuelle.');
  const foods=await catalog(db,user.id);return {estimate:await interpret(text,foods,env.AI),error:null};
 }
 if(intent==='confirm'){
  const foods=await catalog(db,user.id),raw=parse<any>(String(form.get('proposals')||''),null);
  if(!Array.isArray(raw)||raw.length<1||raw.length>20)throw new Error('Proposition invalide.');
  const statements=raw.filter((r:any)=>r.include!==false).map((r:any)=>{
   const f=foods.find(f=>f.id===r.foodId);if(!f)throw new Error('Aliment indisponible.');
   return itemStatement(db,id,f,positive(r.grams,5000),r.estimated!==false,String(r.description||'').slice(0,200));
  });
  if(!statements.length)throw new Error('Sélectionnez au moins un aliment.');
  await db.batch(statements);
 }else if(intent==='add'){
  const f=(await catalog(db,user.id)).find(f=>f.id===form.get('food_id'));if(!f)throw new Error('Choisissez un aliment du catalogue.');
  await itemStatement(db,id,f,positive(form.get('grams'),5000),form.get('estimated')==='on',String(form.get('note')||'').slice(0,200)).run();
 }else if(intent==='update-item'){
  if(!m.items.some(i=>i.id===form.get('item_id')))throw new Response('Ligne introuvable',{status:404});
  await db.prepare('UPDATE meal_items SET grams=? WHERE id=? AND meal_id=?').bind(positive(form.get('grams'),5000),String(form.get('item_id')),id).run();
 }else if(intent==='remove'){
  await db.prepare('DELETE FROM meal_items WHERE id=? AND meal_id=?').bind(String(form.get('item_id')),id).run();
 }else if(intent==='status'){
  const status=String(form.get('status'));if(!['draft','planned','consumed'].includes(status))throw new Error('Statut invalide.');
  if(status!=='draft'&&!m.items.length)throw new Error('Ajoutez au moins un aliment à ce repas.');
  await db.prepare('UPDATE meals SET status=? WHERE id=? AND user_id=?').bind(status,id,user.id).run();
 }else if(intent==='details'){
  const date=String(form.get('date')),type=String(form.get('meal_type')),title=String(form.get('title')).trim();
  if(!validDate(date)||!mealTypes[type]||!title||title.length>100)throw new Error('Vérifiez le titre, la date et le repas.');
  await db.prepare('UPDATE meals SET date=?,meal_type=?,title=? WHERE id=? AND user_id=?').bind(date,type,title,id,user.id).run();
 }else if(intent==='delete'){
  await db.prepare('DELETE FROM meals WHERE id=? AND user_id=?').bind(id,user.id).run(); return redirect('/dashboard?date='+m.date);
 }else if(intent==='copy'){
  const date=String(form.get('date'));if(!validDate(date))throw new Error('Date invalide.');const key=crypto.randomUUID();
  await db.batch([db.prepare('INSERT INTO meals(id,user_id,date,meal_type,status,title) VALUES (?,?,?,?,?,?)').bind(key,user.id,date,m.meal_type,'planned',m.title),...m.items.map(i=>db.prepare('INSERT INTO meal_items(id,meal_id,food_id,name,grams,nutrients,source,gluten,lactose,estimated,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),key,i.food_id,i.name,i.grams,JSON.stringify(i.nutrients),i.source,i.gluten,i.lactose,i.estimated,i.note))]);return redirect('/log?meal='+key);
 }else throw new Error('Action inconnue.');
 return redirect('/log?meal='+id);
 }catch(e){if(e instanceof Response)throw e;return {error:e instanceof Error?e.message:'Une erreur est survenue.',estimate:null};}
}
export default function Composer(){
 const {foods,profile,meal:m,programs,date,type}=useLoaderData<typeof loader>(),result=useActionData<typeof action>();
 const [tab,setTab]=useState<'describe'|'manual'>('describe'),[query,setQuery]=useState(''),[detail,setDetail]=useState(false);
 const program=m&&profile.program_enabled?programs.find(p=>p.meal_type===m.meal_type):null;
 const sums=m?total(m.items):null;
 const check=program&&m?evaluate(program.tree,m.items,foods):null;
 const hidden=m?<input type="hidden" name="meal_id" value={m.id}/>:null;
 return <Shell title={m?m.title:'Composons votre repas'} subtitle={m?`${mealTypes[m.meal_type]} · ${m.date.split('-').reverse().join('/')} · ${{draft:'En composition',planned:'Planifié',consumed:'Réalisé'}[m.status]}`:'Un seul repas, tous ses aliments et une vue d’ensemble.'}>
 {result?.error&&<Alert>{result.error}</Alert>}
 {!m?<section className="card start-meal"><p className="eyebrow">NOUVEAU REPAS</p><Form method="post" className="stack"><input type="hidden" name="intent" value="create"/><label>Quel jour ?<input type="date" name="date" defaultValue={date} required/></label><label>Quel repas ?<select name="meal_type" defaultValue={type}>{Object.entries(mealTypes).slice(0,4).map(([k,l])=><option value={k} key={k}>{l}</option>)}</select></label><button className="primary">Composer ce repas →</button><a className="text-button" href="/plan">Ou laissez-vous proposer un repas</a></Form></section>:<>
 <div className="status-strip" aria-label="État du repas">{(['draft','planned','consumed'] as const).map((s,i)=><Form method="post" key={s}>{hidden}<input type="hidden" name="intent" value="status"/><input type="hidden" name="status" value={s}/><button className={m.status===s?'status active':'status'} aria-pressed={m.status===s}><span>{i+1}</span>{['Composer','Planifié','Réalisé'][i]}</button></Form>)}</div>
 <div className="meal-quick"><span>{sums?.coverage.energy!==sums?.count&&sums?.values.energy!==undefined?"≥ ":""}{number(sums?.values.energy,0)} kcal connues · ≈ {sums?mealPoints(sums)??"—":"—"} pts</span><a href="#meal-nutrition">Voir le bilan ↓</a></div><div className="workspace-grid"><div className="stack"><section className="card"><div className="section-title"><h2>Votre repas</h2><span className="tag">{m.items.length} aliment{m.items.length>1?'s':''}</span></div>{m.items.length?<MealLines items={m.items} profile={profile}>{i=><Form method="post" className="inline-form">{hidden}<input type="hidden" name="item_id" value={i.id}/><label>Quantité (g)<input name="grams" type="number" min="1" max="5000" step="0.1" defaultValue={i.grams}/></label><button name="intent" value="update-item" className="secondary">Modifier</button><button name="intent" value="remove" className="danger">Retirer</button></Form>}</MealLines>:<Empty title="Le repas est encore vide"><p>Ajoutez un ou plusieurs aliments ci-dessous. Ils apparaîtront ici avant de marquer le repas comme réalisé.</p></Empty>}</section>
 <section className="card"><p className="eyebrow">AJOUTER AU REPAS CI-DESSUS</p><h2>Qu’allez-vous manger ?</h2><div className="tabs"><button className={tab==='describe'?'active':''} onClick={()=>setTab('describe')}>Décrire le repas</button><button className={tab==='manual'?'active':''} onClick={()=>setTab('manual')}>Choisir et peser</button></div>
 {tab==='describe'?<Form method="post" className="stack">{hidden}<input type="hidden" name="intent" value="estimate"/><label>Décrivez tous les aliments, même sans balance<textarea name="description" rows={4} maxLength={2000} required placeholder="Quelques cacahuètes, un bol de soupe, une grosse part de lasagnes et un yaourt nature…"/></label><p className="fine">L’IA propose des poids. Vous les vérifiez avant d’ajouter les aliments. Aucun nutriment n’est inventé par l’IA.</p><button className="primary">Estimer les portions ✧</button></Form>:<Form method="post" className="stack">{hidden}<input type="hidden" name="intent" value="add"/><label>Rechercher<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nom de l’aliment"/></label><label>Aliment<select name="food_id" required>{foods.filter(f=>f.name.toLowerCase().includes(query.toLowerCase())).map(f=><option key={f.id} value={f.id}>{f.name} · portion usuelle {f.portion} g</option>)}</select></label><div className="two-cols"><label>Quantité (g)<input type="number" name="grams" min="1" max="5000" step="0.1" defaultValue="100" required/></label><label>Description facultative<input name="note" placeholder="Une grosse part…" maxLength={200}/></label></div><label className="check"><input type="checkbox" name="estimated"/>Poids estimé, sans balance</label><button className="primary">Ajouter cet aliment au repas</button></Form>}
 {result?.estimate&&<ProposalReview key={JSON.stringify(result.estimate)} estimate={result.estimate} foods={foods} mealId={m.id}/>}
 </section><Advice items={m.items} profile={profile}/>
 {check&&<section className="card"><p className="eyebrow">VOTRE PROGRAMME</p><h3>{check.ok?'Les choix et quantités du programme sont couverts':'À comparer au programme'}</h3>{check.messages.map((msg,i)=><p className="fine" key={i}>{msg}</p>)}<p className="fine">Les ajouts restent possibles, même hors programme. La correspondance utilise une tolérance de portion de ±10 % et ne remplace pas l’avis de votre diététicienne.</p><a href="/program">Voir les options</a></section>}
 <details className="card"><summary>Organiser ce repas</summary><Form method="post" className="stack">{hidden}<input type="hidden" name="intent" value="details"/><label>Titre<input name="title" defaultValue={m.title} maxLength={100} required/></label><label>Date<input type="date" name="date" defaultValue={m.date} required/></label><label>Type<select name="meal_type" defaultValue={m.meal_type}>{Object.entries(mealTypes).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><button className="secondary">Enregistrer les détails</button></Form><Form method="post" className="inline-form">{hidden}<input type="hidden" name="intent" value="copy"/><label>Copier pour le<input type="date" name="date" defaultValue={m.date} required/></label><button className="secondary">Planifier une copie</button></Form><Form method="post" onSubmit={e=>{if(!confirm('Supprimer ce repas et ses lignes ?'))e.preventDefault();}}>{hidden}<button className="danger" name="intent" value="delete">Supprimer ce repas</button></Form></details>
 </div><aside className="stack sticky"><section className="card" id="meal-nutrition"><Nutrition items={m.items} profile={profile} share={m.meal_type==='petit-dejeuner'?.25:m.meal_type==='collation'?.1:.35} compact={!detail}/><button className="text-button" onClick={()=>setDetail(!detail)}>{detail?'Réduire le détail':'Voir lipides, sucres, vitamines et minéraux →'}</button></section><div className="card soft"><h3>Prêt ?</h3><p>{m.status==='consumed'?'Ce repas est enregistré comme réalisé. Vous pouvez encore corriger ses portions.':'Validez le repas complet quand ses lignes vous conviennent.'}</p><Form method="post">{hidden}<button className="primary full" name="intent" value="status" >{m.status==='consumed'?'Conserver le repas réalisé':'Planifier ce repas'}</button><input type="hidden" name="status" value={m.status==='draft'?'planned':m.status}/></Form></div></aside></div>
 </>}
 </Shell>;
}
function ProposalReview({estimate,foods,mealId}:{estimate:any;foods:any[];mealId:string}){
 const [rows,setRows]=useState<any[]>(estimate.proposals.map((p:any)=>({...p,include:true})));
 return <div className="proposal"><p className="eyebrow">PROPOSITION · {estimate.method}</p><h3>Vérifiez avant d’ajouter</h3>{estimate.warning&&<Alert>{estimate.warning}</Alert>}{estimate.unmatched.length>0&&<p className="alert">À compléter manuellement : {estimate.unmatched.join(', ')}. <a href="/foods">Ajouter un aliment au catalogue</a></p>}
 <Form method="post" className="stack"><input type="hidden" name="intent" value="confirm"/><input type="hidden" name="meal_id" value={mealId}/><input type="hidden" name="proposals" value={JSON.stringify(rows)}/>{rows.map((r,i)=><div key={i} className="proposal-row"><label className="check"><input type="checkbox" checked={r.include} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,include:e.target.checked}:x))}/>{r.description}</label><label>Aliment<select value={r.foodId} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,foodId:e.target.value}:x))}>{foods.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>Poids proposé (g)<input type="number" min="1" max="5000" value={r.grams} onChange={e=>setRows(rows.map((x,j)=>j===i?{...x,grams:Number(e.target.value)}:x))}/></label><small>Incertitude {r.confidence==='low'?'élevée':r.confidence==='medium'?'moyenne':'faible'} · reste une estimation</small></div>)}{rows.length>0&&<button className="primary">Ajouter les aliments sélectionnés au repas</button>}</Form></div>;
}
