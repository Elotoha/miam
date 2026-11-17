import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
// Keep setup explicit and local; this script never migrates the deployed database.
const cache=resolve('.wrangler/local-tools');
const env={...process.env,XDG_CONFIG_HOME:process.env.XDG_CONFIG_HOME||`${cache}/config`,WRANGLER_LOG_PATH:process.env.WRANGLER_LOG_PATH||`${cache}/logs`,WRANGLER_SEND_METRICS:'false'};
mkdirSync(env.XDG_CONFIG_HOME,{recursive:true});mkdirSync(env.WRANGLER_LOG_PATH,{recursive:true});
function run(args,json=false){const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{env,encoding:'utf8',stdio:['ignore',json?'pipe':'inherit','inherit']});if(r.status!==0)process.exit(r.status||1);return json?JSON.parse(r.stdout):undefined;}
const execute=['d1','execute','miam-db','--local'];
run([...execute,'--file','schema.sql']);
const count=run([...execute,'--command','SELECT COUNT(*) AS count FROM foods','--json'],true)[0].results[0].count;
if(count===0)run([...execute,'--file','seed.sql']);
run([...execute,'--file','migrations/0001_meal_workspace.sql']);
console.log('Local database ready; existing users, meals and food data preserved.');
