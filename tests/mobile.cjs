const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {expect}=require('@playwright/test');
const {randomUUID}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const base=process.env.MIAM_TEST_URL||'http://127.0.0.1:5173';
const remote=base.startsWith('https:');
const emails=[];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(remote&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-FR'}), page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function register(ctx){const email=`workspace-${randomUUID()}@example.invalid`;emails.push(email);const response=await ctx.request.post(base+'/register',{form:{email,password:randomUUID(),daily_points_target:'23'},maxRedirects:0});assert.equal(response.status(),302,await response.text());return email;}
 try{
 await register(context);await page.goto(base+'/dashboard');
 await page.getByRole('heading',{name:'Une journée à votre goût'}).waitFor();
 await page.screenshot({path:'/workspace/.miam-setup/v2-dashboard-mobile.png',fullPage:true});
 await page.goto(base+'/foods');await page.getByRole('button',{name:'＋ Ajouter',exact:true}).click();
 await page.locator('input[name=name]').fill('Aliment de test personnel');await page.locator('input[name=category]').fill('Test');
 await page.locator('input[name=source]').fill('Données fictives réservées au test');
 await page.locator('details.field-group').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 for(const [key,value] of Object.entries({energy:180,protein:8,carbs:24,sugars:2,starch:20,fiber:4,fat:5,saturated:1,mono:2,poly:2}))await page.locator(`input[name=${key}]`).fill(String(value));
 await page.getByRole('button',{name:'Enregistrer cet aliment',exact:true}).click();
 await page.waitForURL('**/foods');await page.getByRole('searchbox').fill('Aliment de test personnel');
 await expect(page.locator('.catalog-item')).toHaveCount(1);
 const pref=page.locator('.catalog-item');await pref.locator('select[name=affinity]').selectOption('5');await pref.getByRole('button',{name:'Enregistrer ma préférence'}).click();
 await page.goto(base+'/settings');
 await page.locator('input[name=weight]').fill('80');await page.locator('input[name=height]').fill('175');await page.locator('input[name=age]').fill('35');await page.locator('select[name=sex]').selectOption('female');await page.locator('input[name=target_weight]').fill('75');
 await page.getByRole('button',{name:'Enregistrer mon profil'}).click();await page.getByRole('status').filter({hasText:'Votre profil est enregistré.'}).waitFor();
 await page.goto(base+'/program');await page.locator('input[name=enabled]').check();await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
 await page.getByRole('button',{name:'Déjeuner',exact:true}).click();
 await page.locator('fieldset').first().locator(':scope > .rule-add').getByRole('button',{name:'＋ Groupe OU'}).click();
 const group=page.locator('fieldset.any');await group.locator(':scope > .rule-add').getByRole('button',{name:'＋ Aliment',exact:true}).click();
 await group.locator('.rule-leaf select').first().selectOption({label:'Aliment de test personnel'});
 await page.getByRole('button',{name:'Enregistrer les options de ce repas'}).click();await page.waitForURL('**/program?type=dejeuner');
 await page.screenshot({path:'/workspace/.miam-setup/v2-program-mobile.png',fullPage:true});
 await page.goto(base+'/plan');await page.getByRole('button',{name:'Me proposer un repas ✧'}).click();
 await page.getByRole('button',{name:'Garder et personnaliser ce repas →'}).click();await page.waitForURL('**/log?meal=*');
 const mealURL=page.url(),mealId=new URL(mealURL).searchParams.get('meal');
 await page.getByRole('heading',{name:'Dans ce repas'}).waitFor();
 await page.screenshot({path:'/workspace/.miam-setup/v2-meal-mobile.png',fullPage:true});
 const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);assert.ok(noOverflow,'Mobile meal layout must fit 390px');
 // Test multi-food estimation through the actual authenticated action. It may honestly fall back locally.
 const estimate=await context.request.post(mealURL,{form:{intent:'estimate',meal_id:mealId,description:'quelques cacahuètes, un bol de soupe, une part de lasagnes, un yaourt nature'}});
 const html=await estimate.text();assert.equal(estimate.status(),200);assert.ok(html.includes('Vérifiez avant d’ajouter'));assert.ok(html.includes('Cacahuètes')&&html.includes('Soupe de légumes')&&html.includes('Lasagnes')&&html.includes('Yaourt nature'));
 console.log('AI response method:',html.includes('PROPOSITION · Workers AI')?'Workers AI':html.includes('Workers AI indisponible')?'Explicit local fallback':'See proposal');
 const other=await browser.newContext();await register(other);
 assert.equal((await other.request.get(mealURL)).status(),404,'Other users cannot read this meal');
 assert.equal((await other.request.post(mealURL,{form:{intent:'status',meal_id:mealId,status:'consumed'}})).status(),404,'Other users cannot mutate this meal');
 const otherFoods=await other.request.get(base+'/foods');assert.ok(!(await otherFoods.text()).includes('Aliment de test personnel'),'Personal food stays private');
 await other.close();
 // Finalize and verify it moved into the consumed day total.
 const finalized=await context.request.post(mealURL,{form:{intent:'status',meal_id:mealId,status:'consumed'},maxRedirects:0});assert.equal(finalized.status(),302);
 await page.goto(base+'/dashboard');await page.getByText('Réalisé',{exact:true}).waitFor();
 await page.setViewportSize({width:1440,height:1000});await page.goto(mealURL);await page.screenshot({path:'/workspace/.miam-setup/v2-meal-desktop.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[],'No browser JS errors');
 console.log('PASS mobile + desktop: food CRUD/preferences, nested program, guided planning, shared meal detail, multi-food estimates, account isolation, consumed state, no overflow or JS errors.');
 }catch(e){await page.screenshot({path:'/workspace/.miam-setup/v2-test-failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(0,1800));throw e;}finally{
 await browser.close();
 for(const email of emails){const args=['node_modules/wrangler/bin/wrangler.js','d1','execute','DB',remote?'--remote':'--local','--command',`DELETE FROM users WHERE email='${email}'`];if(remote)args.push('--config','/workspace/.miam-setup/wrangler.remote.json');
 const cleanup=spawnSync(process.execPath,args,{env:{...process.env,XDG_CONFIG_HOME:'/workspace/.miam-setup/config',WRANGLER_LOG_PATH:'/workspace/.miam-setup/logs',WRANGLER_SEND_METRICS:'false'},encoding:'utf8'});if(cleanup.status!==0)console.error('Test cleanup failed:',cleanup.stderr?.slice(-500));}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
