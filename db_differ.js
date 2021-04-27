const sqlite = require('sqlite3');
const util = require('util');
const fs = require('fs');
const DIR_DIFF = './diff_results/';
const PATH_M_DB_OLD = './masterdata (32).db';
const PATH_M_DB_NEW = './masterdata.db';

const ERR_F = (err)=>{if(err)throw new Error(err)};

const DIR_DIFF_CURRENT = `${DIR_DIFF}${new Date().valueOf()}/`;
fs.mkdir(DIR_DIFF_CURRENT,ERR_F);

const masterdata_old = new sqlite.Database(PATH_M_DB_OLD,ERR_F);
masterdata_old.ALL = util.promisify(masterdata_old.all);
//masterdata_old.EACH = util.promisify(masterdata_old.each);

const masterdata_new = new sqlite.Database(PATH_M_DB_NEW,ERR_F);
masterdata_new.ALL = util.promisify(masterdata_new.all);
masterdata_new.EACH = util.promisify(masterdata_new.each);

function obj_cmp(obj1,obj2){
    for(let key in obj2){
        if(obj1[key] !== obj2[key])return false;
    }
    return true;
}
function key_obj_cmp(keys,obj1,obj2){
    for(let key of keys){
        if(obj1[key] !== obj2[key])return false;
    }
    return true;
}

new Promise(async resolve=>{
    const table_list = await masterdata_new.ALL('select * from sqlite_master');
    for(let table of table_list){
        if(table.type === 'table')new Promise(async res=>{
            //table structure check
            //console.log(table.name);
            const structure_old = await masterdata_old.ALL(`pragma table_info("${table.name}")`);
            const structure_new = await masterdata_new.ALL(`pragma table_info("${table.name}")`);
            let keys = new Array();
            let private_keys = new Array();
            let private_key_types = new Array();
            for(let i = 0;;i++){
                //this will throw an error if the new one has a different structure from the old one. and the diff will not continue.
                //it's rare but did happen ()
                if(structure_old[i] && structure_new[i]){
                    if(!obj_cmp(structure_old[i],structure_new[i]))throw new Error(`${table.name}:\ttable info changed:\n${JSON.stringify(structure_old[i])}\n${JSON.stringify(structure_new[i])}`);
                    keys.push(structure_new[i].name);
                    if(structure_new[i].pk > 0){
                        private_keys.push(structure_new[i].name);
                        private_key_types.push(structure_new[i].type);
                    }
                }else{
                    if(structure_old[i] || structure_new[i])throw new Error(`${table.name}:\ttable info changed:\n${JSON.stringify(structure_old[i])}\n${JSON.stringify(structure_new[i])}`);
                    else break;
                }
            }

            let is_removed = 0, is_changed = 0, is_added = 0;
            let outputstr = new String();
            const content_old = await masterdata_old.ALL(`select * from ${table.name}`);
            for(const row_old of content_old){
                let sql = `select * from ${table.name}`;
                if(private_key_types[0] === 'TEXT'){
                    sql += ` where ${private_keys[0]} = "${row_old[private_keys[0]]}"`;
                }
                else sql += ` where ${private_keys[0]} = ${row_old[private_keys[0]]}`;
                for(i = 1; i < private_keys.length; i++){
                    if(private_key_types[i] === 'TEXT'){
                        sql += ` and ${private_keys[i]} = "${row_old[private_keys[i]]}"`;
                    }
                    else sql += ` and ${private_keys[i]} = ${row_old[private_keys[i]]}`;
                }

                let row_news;
                try{
                    row_news = await masterdata_new.ALL(sql);
                }catch(e){
                    console.log(sql,structure_new);
                }
                if(row_news.length === 0){
                    //console.log('row removed ', row_old);
                    outputstr += `row removed: ${JSON.stringify(row_old)}\r\n`;
                    is_removed++;
                    continue;
                }
            }



            const content_new = await masterdata_new.ALL(`select * from ${table.name}`);
            for(const row_new of content_new){
                let sql = `select * from ${table.name}`;
                if(private_key_types[0] === 'TEXT'){
                    sql += ` where ${private_keys[0]} = "${row_new[private_keys[0]]}"`;
                }
                else sql += ` where ${private_keys[0]} = ${row_new[private_keys[0]]}`;
                for(i = 1; i < private_keys.length; i++){
                    if(private_key_types[i] === 'TEXT'){
                        sql += ` and ${private_keys[i]} = "${row_new[private_keys[i]]}"`;
                    }
                    else sql += ` and ${private_keys[i]} = ${row_new[private_keys[i]]}`;
                }

                let row_olds;
                try{
                    row_olds = await masterdata_old.ALL(sql);
                }catch(e){
                    console.log(sql,structure_new);
                }
                if(row_olds.length === 0){
                    //console.log('row added ', row_new);
                    outputstr += `row added: ${JSON.stringify(row_new)}\r\n`;
                    is_added++;
                    continue;
                }
                const row_old = row_olds[0];
                if(!key_obj_cmp(keys,row_old,row_new)){
                    //console.log('row changed',row_old,row_new);
                    outputstr += 'row changed\r\n' + `before: ${JSON.stringify(row_old)}\r\n` + `after : ${JSON.stringify(row_new)}\r\n`;
                    is_changed++;
                }
                //if(table.name==='m_card')console.log(row_old,row_new);
            }
            if(outputstr != ''){
                fs.writeFile(`${DIR_DIFF_CURRENT}${table.name}.txt`,outputstr,{'encoding':'utf-8'},()=>{});
                let space = new String();
                for(let i=0;i<64-table.name.length;i++)space+=' ';
                console.log(table.name,`${space}\tREMOVED: ${is_removed?is_removed:''}\t CHANGED: ${is_changed?is_changed:''}\t ADDED: ${is_added?is_added:''}`);
            };
            res();return;
        });
    }
})