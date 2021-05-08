const DIR_SRC_DATABASE_MASTERDATA = "./masterdata.db";
const DIR_SRC_DATABASE_DICTIONARY_JA_K = "./dictionary_ja_k.db";

//dependents
const util = require('util');
const fs = require("fs");
const sqlite = require("sqlite3").verbose();

//load database before analyzing, block
let masterdata = new sqlite.Database(DIR_SRC_DATABASE_MASTERDATA,(err)=>{
    if(err)throw new Error(err);
})
let dictionary_ja_k = new sqlite.Database(DIR_SRC_DATABASE_DICTIONARY_JA_K,(err)=>{
    if(err)throw new Error(err);
})
masterdata.EACH = util.promisify(masterdata.each);
masterdata.ALL = util.promisify(masterdata.all);

const card_master_id = 100011001;

Promise.all([
    masterdata.ALL(`select * from m_card_active_skill where card_master_id=${card_master_id}`),
    masterdata.ALL(`select * from m_card_passive_skill_original where card_master_id=${card_master_id} and position=1`),
    masterdata.ALL(`select * from m_card_passive_skill_original where card_master_id=${card_master_id} and position=2`)
]).then(results=>{
    let a=[],p1=[],p2=[];
    for(let al of results[0]){
        a.push(masterdata.EACH(`select * from m_active_skill where id=${al.active_skill_master_id}`))
    }
    for(let pl of results[1]){
        p1.push(masterdata.EACH(`select * from m_passive_skill where id=${pl.passive_skill_master_id}`))
    }
    for(let pl2 of results[2]){
        p2.push(masterdata.EACH(`select * from m_passive_skill where id=${pl2.passive_skill_master_id}`))
    }
    return Promise.all([Promise.all(a),Promise.all(p1),Promise.all(p2)]);
}).then(results=>{
    let a=[],p1=[],p2=[];
    for(let al of results[0]){
        a.push(masterdata.EACH(`select * from m_skill where id=${al.skill_master_id}`))
    }
    for(let pl of results[1]){
        p1.push(masterdata.EACH(`select * from m_skill where id=${pl.skill_master_id}`))
    }
    for(let pl2 of results[2]){
        p2.push(masterdata.EACH(`select * from m_skill where id=${pl2.skill_master_id}`))
    }
    return Promise.all([Promise.all(a),Promise.all(p1),Promise.all(p2)]);
}).then(results=>{
    for(let al of results[0]){
        console.log('appeal skill live power',al.evaluation_param)
    }
    for(let pl of results[1]){
        console.log('passive ability live power',pl.evaluation_param)
    }
    for(let pl2 of results[2]){
        console.log('active ability live power',pl2.evaluation_param)
    }
})