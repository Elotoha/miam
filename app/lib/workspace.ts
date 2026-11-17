import { redirect } from 'react-router';
import { getUserFromRequest } from './auth';
import { cloudflareContext } from './context';
import type { RouterContextProvider } from 'react-router';
import type { Nutrients, Profile, Item } from './nutrition';
export type Food = {id:string; owner_user_id:number|null; origin_id:string|null; name:string; category:string; portion:number; nutrients:Nutrients; source:string; gluten:string; lactose:string; affinity:number|null; available:number};
export type Meal = {id:string;user_id:number;date:string;meal_type:string;status:'draft'|'planned'|'consumed';title:string;items:Item[]};
export async function session(request:Request,context:Readonly<RouterContextProvider>){
 const env=context.get(cloudflareContext).env; const user=await getUserFromRequest(env.DB,request); if(!user)throw redirect('/login');
 if(request.method!=='GET' && request.headers.get('Origin') && new URL(request.url).origin!==request.headers.get('Origin'))throw new Response('Origine refusée',{status:403});
 return {db:env.DB,env,user};
}
export const parse = <T,>(s:string,fallback:T):T=>{try{return JSON.parse(s)}catch{return fallback}};
export async function catalog(db:D1Database,userId:number,includeHidden=false):Promise<Food[]>{
 const {results}=await db.prepare(`SELECT f.*, p.affinity, COALESCE(p.available,1) available FROM catalog_foods f LEFT JOIN food_preferences p ON p.food_id=f.id AND p.user_id=? WHERE (f.owner_user_id=? OR (f.owner_user_id IS NULL AND NOT EXISTS (SELECT 1 FROM catalog_foods o WHERE o.owner_user_id=? AND o.origin_id=f.id))) ${includeHidden?'':'AND COALESCE(p.available,1)=1'} ORDER BY f.name COLLATE NOCASE`).bind(userId,userId,userId).all<any>();
 return results.map(f=>({...f,nutrients:parse(f.nutrients,{})}));
}
export async function profile(db:D1Database,userId:number):Promise<Profile>{
 const p=await db.prepare('SELECT * FROM profiles WHERE user_id=?').bind(userId).first<any>();
 return p?{...p,intolerances:parse(p.intolerances,[]),targets:parse(p.targets_json,{})}:{weight:null,height:null,sex:null,age:null,target_weight:null,target_date:null,activity:1.4,intolerances:[],targets:{},program_enabled:0};
}
export async function meals(db:D1Database,userId:number,date:string):Promise<Meal[]>{
 const {results}=await db.prepare('SELECT * FROM meals WHERE user_id=? AND date=? ORDER BY created_at').bind(userId,date).all<any>();
 const {results:items}=await db.prepare('SELECT i.* FROM meal_items i JOIN meals m ON i.meal_id=m.id WHERE m.user_id=? AND m.date=?').bind(userId,date).all<any>();
 return results.map(m=>({...m,items:items.filter(i=>i.meal_id===m.id).map(i=>({...i,nutrients:parse(i.nutrients,{})}))}));
}
export async function meal(db:D1Database,userId:number,id:string):Promise<Meal>{
 const m=await db.prepare('SELECT * FROM meals WHERE id=? AND user_id=?').bind(id,userId).first<any>();
 if(!m)throw new Response('Repas introuvable',{status:404});
 const {results}=await db.prepare('SELECT * FROM meal_items WHERE meal_id=? ORDER BY rowid').bind(id).all<any>();
 return {...m,items:results.map(i=>({...i,nutrients:parse(i.nutrients,{})}))};
}
export function positive(v:unknown,max=10000){const n=Number(v);if(!Number.isFinite(n)||n<=0||n>max)throw new Error('Quantité invalide');return n;}
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
export function itemStatement(db:D1Database,mealId:string,food:Food,grams:number,estimated=false,note=''){
 return db.prepare('INSERT INTO meal_items(id,meal_id,food_id,name,grams,nutrients,source,gluten,lactose,estimated,note) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),mealId,food.id,food.name,grams,JSON.stringify(food.nutrients),food.source,food.gluten,food.lactose,estimated?1:0,note);
}
