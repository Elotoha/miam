import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
test('legacy history migrates once, survives as snapshots, and deleted meals are not resurrected',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON;');
 db.exec(readFileSync('schema.sql','utf8'));db.exec(readFileSync('seed.sql','utf8'));
 db.exec("INSERT INTO users(id,email,password_hash) VALUES(1,'migration@example.invalid','fixture'); INSERT INTO meal_logs(user_id,date,meal_type,food_id,portion_desc,qty_g,ww_points) VALUES(1,'2026-11-17','dejeuner',1,'100g',100,5);");
 const migration=readFileSync('migrations/0001_meal_workspace.sql','utf8');db.exec(migration);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM meals').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM meal_items').get().n,1);
 db.exec("DELETE FROM meals WHERE id='legacy-log-1-2026-11-17-dejeuner'");db.exec(migration);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM meals').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM catalog_foods').get().n,41);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 db.close();
});
