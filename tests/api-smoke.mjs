import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const base=process.env.MIAM_TEST_URL||'http://127.0.0.1:5173',remote=base.startsWith('https:'),email=`api-${randomUUID()}@example.invalid`,password=randomUUID();
let cookie='';
async function req(path,form){const r=await fetch(new URL(path,base),{method:form?'POST':'GET',headers:cookie?{Cookie:cookie}:{},body:form?new URLSearchParams(form):undefined,redirect:'manual',signal:AbortSignal.timeout(90000)});const body=await r.text();assert.ok(r.status<500,`${path}: ${r.status} ${body.slice(0,200)}`);return {r,body};}
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
try{
 let x=await req('/register',{email,password,daily_points_target:'23'});assert.equal(x.r.status,302);cookie=x.r.headers.get('set-cookie').split(';')[0];
 for(const path of ['/dashboard','/foods','/plan','/program','/settings','/guide'])assert.equal((await req(path)).r.status,200,path);
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date());
 x=await req('/log',{intent:'create',date,meal_type:'dejeuner'});assert.equal(x.r.status,302);const url=x.r.headers.get('location'),id=new URL(url,base).searchParams.get('meal');
 x=await req(url,{intent:'estimate',meal_id:id,description:'quelques cacahuètes, un bol de soupe, une part de lasagnes, un yaourt nature'});
 assert.equal(x.r.status,200);const match=x.body.match(/name="proposals" value="([^"]*)"/);assert.ok(match,'Editable multi-food proposals must be shown');
 const proposals=JSON.parse(decode(match[1]));assert.equal(proposals.length,4);assert.ok(proposals.every(p=>p.grams>0&&p.grams<=5000));
 const usedAI=!x.body.includes('Workers AI indisponible')&&!x.body.includes('IA non configurée');
 console.log('Multi-food interpretation:',usedAI?'Workers AI':'explicit local fallback',proposals.map(p=>p.foodId).join(', '));
 x=await req(url,{intent:'confirm',meal_id:id,proposals:JSON.stringify(proposals)});assert.equal(x.r.status,302);
 x=await req(url);assert.equal((x.body.match(/class="food-line"/g)||[]).length,4);assert.ok(x.body.includes('Données partielles'));
 x=await req(url,{intent:'status',meal_id:id,status:'consumed'});assert.equal(x.r.status,302);
 x=await req('/settings',{weight:'80',height:'175',age:'35',sex:'female',activity:'1.4',target_weight:'75',daily_points_target:'23',protein_min:'60',protein_max:'100'});assert.ok(x.body.includes('Votre profil est enregistré'));
 x=await req('/settings');assert.ok(x.body.includes('value="80"')&&x.body.includes('value="175"'));
 const tree={id:'root',kind:'all',children:[{id:'choice',kind:'any',children:[{id:'a',kind:'food',foodId:'base-1',grams:250},{id:'b',kind:'all',children:[{id:'c',kind:'food',foodId:'base-2',grams:150},{id:'d',kind:'food',foodId:'base-10',grams:140}]}]}]};
 x=await req('/program',{intent:'save',meal_type:'dejeuner',title:'Test ET et OU',tree:JSON.stringify(tree)});assert.equal(x.r.status,302);
 await req('/program',{intent:'toggle',enabled:'on'});
 x=await req('/plan',{intent:'propose',date,meal_type:'dejeuner',mode:'program',variant:'0'});assert.equal(x.r.status,200);assert.ok(x.body.includes('Avec ce que vous avez déjà mangé'));
 const rows=x.body.match(/name="rows" value="([^"]*)"/);assert.ok(rows);x=await req('/plan',{intent:'save',date,meal_type:'dejeuner',rows:decode(rows[1])});assert.equal(x.r.status,302);
 console.log('PASS public HTTP: multi-food estimation and confirmation, meal states, nutrition completeness, personal profile, nested programs, planning and day projection.');
}finally{
 const args=['node_modules/wrangler/bin/wrangler.js','d1','execute','DB',remote?'--remote':'--local','--command',`DELETE FROM users WHERE email='${email}'`];if(remote)args.push('--config','/workspace/.miam-setup/wrangler.remote.json');
 const r=spawnSync(process.execPath,args,{env:{...process.env,XDG_CONFIG_HOME:'/workspace/.miam-setup/config',WRANGLER_LOG_PATH:'/workspace/.miam-setup/logs',WRANGLER_SEND_METRICS:'false'},encoding:'utf8'});assert.equal(r.status,0,'Clean up the test account');
}
