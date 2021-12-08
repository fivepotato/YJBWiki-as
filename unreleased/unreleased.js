//directory constants
let DIR_SRC_DATABASE_MASTERDATA = "../masterdata.db";
let DIR_SRC_DATABASE_DICTIONARY_JA_K = "../dictionary_ja_k.db";
let DIR_OUT_GIMMICK = "./gimmicks.txt";
let DIR_OUT_UNRELEASED_LIVES = "./unreleased_lives.txt";
let DIR_IMG_MAPPING = "../img_mapping.json";

//硬等运行完.jpg
let TIMEOUT = 1000;

//dependents
const fs = require("fs");
const sqlite = require("sqlite3").verbose();
const util = require('util');


const masterdata = new sqlite.Database('../masterdata.db',(err)=>{
    if(err)console.error(err);
});
const dictionary_ja_k = new sqlite.Database('../dictionary_ja_k.db',(err)=>{
    if(err)console.error(err);
})
masterdata.ALL = util.promisify(masterdata.all);
dictionary_ja_k.GET = util.promisify(dictionary_ja_k.each);

//load img mapping
let itemimg = JSON.parse(fs.readFileSync(DIR_IMG_MAPPING));

//match the first one in dictionary_ja_k, return undefined on not found or error
async function getdic(key){
    let a = await dictionary_ja_k.GET(`select message from m_dictionary where id = "${key.slice(2)}"`);
    if(a.message)return a.message;
    else return '[getdic0]DIC_K ERROR';
}

function base95(str) {
    let integer = 0;
    for (let digit of str) {
        integer = integer * 95 + digit.codePointAt(0) - 32;
    }
    return integer;
}

async function searchdb(m_list){
    const a = await masterdata.ALL(`select * from ${m_list}`);
    for(let b of a){
        let i = 1;
        for(let column in b){
            if(arguments[i]&&arguments[i]!=b[column])break;//?
            else i++;
            if(i===arguments.length)break;
        }
        if(i===arguments.length){
            let res = new Array();
            for(let column in b){res.push(b[column]);}
            return res;
        }
    }
}

(async function () {
    let gimmicks = [];//data to output

    skills = await masterdata.ALL('select * from m_skill');
    for(let row_const of skills){
        if(row_const.id<40000000||(row_const.id>70000000&&row_const.id<400000000)/*4 5 6 40 */)continue;
        let text;
        skill_effect=await searchdb("m_skill_effect",row_const.skill_effect_master_id1);
        text = `${row_const.id}\<br\>{{SkillEffectDescription|${skill_effect[2]}|${skill_effect[3]}|${skill_effect[5]}|${skill_effect[8]}|${skill_effect[9]}}}`;
        if(row_const.skill_target_master_id1 != 58)text += `\<br\>对象：{{SkillTargetDescription|${row_const.skill_target_master_id1}}}`;
        occur_list=[];
        gimmicks_live=await masterdata.ALL(`select * from m_live_difficulty_gimmick where skill_master_id = ${row_const.id}`);
        for(let gimmick_live of gimmicks_live){
            if(gimmick_live.live_difficulty_master_id>40000000)continue;
            occur_list.push({"id":gimmick_live.live_difficulty_master_id,"type":1});
        }
        gimmicks_note=await masterdata.ALL(`select * from m_live_difficulty_note_gimmick where skill_master_id = ${row_const.id}`);
        for(let gimmick_note of gimmicks_note){
            if(gimmick_note.live_difficulty_id>40000000)continue;
            occur_list.push({"id":gimmick_note.live_difficulty_id,"type":2});
        }
        gimmicks_wave=await masterdata.ALL(`select * from m_live_note_wave_gimmick_group where skill_id = ${row_const.id}`);
        for(let gimmick_wave of gimmicks_wave){
            if(gimmick_wave.live_difficulty_id>40000000)continue;
            occur_list.push({"id":gimmick_wave.live_difficulty_id,"type":3});
        }
        occur_list.sort((a,b)=>{if(a.type>b.type)return 1;if(a.type<b.type)return -1;return a.id-b.id;});
        if(row_const.id>50000000&&row_const.id<60000000){
            if(occur_list.length==0) text+= "\<br\>\<span style=\"color:#F00;font-weight:bold;\"\>未出现\<\/span\>";
            else{
                j=0;
                for(i=0;i<occur_list.length;i++){
                    if(i>=1&&occur_list[i].id==occur_list[i-1].id&&occur_list[i].type==occur_list[i-1].type)continue;
                    if(occur_list[i].type>j){
                        j=occur_list[i].type;
                        if(occur_list[i].type==1)text+= "\<br\>Gimmick_Live: ";
                        if(occur_list[i].type==2)text+= "\<br\>Gimmick_Note: ";
                        if(occur_list[i].type==3)text+= "\<br\>Gimmick_Wave: ";
                    }
                    else text+=", ";
                    text+=occur_list[i].id;
                }
            }
        }
        console.log(text);
        text += "\n\n";
        gimmicks.push({"id":row_const.id,"text":text});
    }

    gimmicks.sort((a,b)=>{return a.id-b.id});
        let filestream_gimmick = fs.createWriteStream(DIR_OUT_GIMMICK);
        for (let row_const of gimmicks){
            filestream_gimmick.write(row_const.text,'utf-8');
        }
        filestream_gimmick.end();
        console.log("gimmicks generation succeeded");
})();


//GIMMICKS (complete)
/*masterdata.ALL("select * from m_skill", (err, skills)=>{
    if(err)console.error(err);
    for(let row_const of skills){
        if(row_const.id<40000000||(row_const.id>70000000&&row_const.id<400000000)/*4 5 6 40 )continue;
        let text;
        new Promise((res,rej)=>{
            masterdata.each(`select * from m_skill_effect where id = ${row_const.skill_effect_master_id1}`,(err,skill_effect)=>{
                if(err)console.error(err);
                text = `${row_const.id}\<br\>{{SkillEffectDescription|${skill_effect.effect_type}|${skill_effect.effect_value}|${skill_effect.calc_type}|${skill_effect.finish_type}|${skill_effect.finish_value}}}`;
                if(row_const.skill_target_master_id1 != 58)text += `\<br\>对象：{{SkillTargetDescription|${row_const.skill_target_master_id1}}}`;
                res([]);
            })
        }).then((occur_list)=>{
            return new Promise((res,rej)=>{
                masterdata.all(`select * from m_live_difficulty_gimmick where skill_master_id = ${row_const.id}`,(err,gimmicks_live)=>{
                    if(err)console.error(err);
                    for(let gimmick_live of gimmicks_live){
                        if(gimmick_live.live_difficulty_master_id>40000000)continue;
                        occur_list.push({"id":gimmick_live.live_difficulty_master_id,"type":1});
                    }
                    res(occur_list);
                })
            })
        }).then((occur_list)=>{
            return new Promise((res,rej)=>{
                masterdata.all(`select * from m_live_difficulty_note_gimmick where skill_master_id = ${row_const.id}`,(err,gimmicks_note)=>{
                    if(err)console.error(err);
                    for(let gimmick_note of gimmicks_note){
                        if(gimmick_note.live_difficulty_id>40000000)continue;
                        occur_list.push({"id":gimmick_note.live_difficulty_id,"type":2});
                    }
                    res(occur_list);
                })
            })
        }).then((occur_list)=>{
            return new Promise((res,rej)=>{
                masterdata.all(`select * from m_live_note_wave_gimmick_group where skill_id = ${row_const.id}`,(err,gimmicks_wave)=>{
                    if(err)console.error(err);
                    for(let gimmick_wave of gimmicks_wave){
                        if(gimmick_wave.live_difficulty_id>40000000)continue;
                        occur_list.push({"id":gimmick_wave.live_difficulty_id,"type":3});
                    }
                    res(occur_list);
                })
            })
        }).then((occur_list)=>{
            console.log(text);
            occur_list.sort((a,b)=>{if(a.type>b.type)return 1;if(a.type<b.type)return -1;return a.id-b.id;});
            if(row_const.id>50000000&&row_const.id<60000000){

            }
            text += "\n\n";
            gimmicks.push({"id":row_const.id,"text":text});
        });
    }
});
new Promise((res,rej)=>{
    setTimeout(()=>{
        gimmicks.sort((a,b)=>{return a.id-b.id});
        let filestream_gimmick = fs.createWriteStream(DIR_OUT_GIMMICK);
        for (let row_const of gimmicks){
            filestream_gimmick.write(row_const.text,'utf-8');
        }
        filestream_gimmick.end();
        console.log("gimmicks generation succeeded");
        res();
    },TIMEOUT);//硬等 就硬等
})*/


//UNRELEASED_LIVES (complete(?))
let unreleased_lives = [];//rawdata
const config_disabled_charts = {"12031":true, "12032":true, "12033":true, "21012":true, "41072":true, "42030":true};
masterdata.all("select * from m_live_difficulty_const", (err, consts)=>{
    if(err)console.error(err);
    let filestream_unreleased_lives = fs.createWriteStream(DIR_OUT_UNRELEASED_LIVES);
    for(let row_const of consts){
        if(row_const.id < 10000000 || row_const.id > 58000000/*随便写的*/)continue;
        masterdata.all(`select * from m_live_difficulty where live_difficulty_id = ${row_const.id}`,(err,difficulties)=>{
            if(err)console.error(err);
            if(difficulties.length === 0){//no match in m_live_difficulty
                //Story Lives
                if(Math.floor(row_const.id / 1000000) === 33){
                    //reset live id
                    let story_id = row_const.id % 10000;
                    let story_difficulty = Math.floor((row_const.id % 1000000)/100000)===1?2:3;
                    //37哈哈哈哈哈哈哈哈哈哈哈哈
                    row_const.id = 37000000+story_id*1000+story_difficulty*100;
                    row_const.id_str = (Math.floor((row_const.id % 10000000) / 1000)+10000).toString().slice(1);
                    row_const.song_name = "";
                    if(config_disabled_charts[Math.floor(row_const.id/1000).toString()] !== true)unreleased_lives.push(row_const);
                }
                else{//others
                    let live_id_str = (Math.floor((row_const.id % 10000000) / 1000)+10000).toString().slice(1);
                    getdic(`k.song_name_so${live_id_str}`).then((text)=>{
                        row_const.song_name = text;
                        row_const.id_str = live_id_str;
                        if(config_disabled_charts[Math.floor(row_const.id/1000).toString()] !== true)unreleased_lives.push(row_const);
                    })
                }
            }
        })
    }
});
new Promise((res,rej)=>{
    setTimeout(()=>{
        //sort by live_id
        unreleased_lives.sort((a,b)=>{return a.id-b.id});
        let i = 0, wikitable_bondboard = "{| class=\"wikitable_bondboard tsticky\"  style=\"text-align:center\" \n|-\n! Song ID || Song name || Difficulty || DMG(E) || DMG(N) || DMG(H) || DMG(Ex) || Score Limit(Ex) || DMG(Mas) || Score Limit(Mas)\n";
        while(unreleased_lives[i] !== undefined){
            switch (Math.floor(unreleased_lives[i].id/10000000)){
                case 1:wikitable_bondboard += "|-\n! colspan=8 | Normal Lives\n";break;
                case 2:wikitable_bondboard += "|-\n! colspan=8 | Event Lives\n";break;
                case 4:wikitable_bondboard += "|-\n! colspan=8 | SBL Lives\n";break;
                case 5:wikitable_bondboard += "|-\n! colspan=8 | DLP Lives\n";break;
                
                case 3:wikitable_bondboard += "|-\n! colspan=8 | Story Lives\n";config_enable_liveid = false;break;
                default:console.error(`unexpected chart ${unreleased_lives[i].id}, please check manually.`);
            }
            let live_type="", dmg1="", dmg2="", dmg3="", dmg4="", dmg5="", limit4="", limit5="";
            while(true) {
                let j = i;
                let song_name = unreleased_lives[j].song_name;
    
                let error_occured = false;
                //append while live id maintains no change
                switch(Math.floor(unreleased_lives[j].id/100)%10){
                    case 1:
                        live_type += "E";
                        //damage shouldn't be 1
                        if(unreleased_lives[j].note_stamina_reduce !== 1)dmg1 += (dmg1==="")?unreleased_lives[j].note_stamina_reduce.toString():`<br>${unreleased_lives[j].note_stamina_reduce}`;
                        break;
                    case 2:
                        live_type += "N";
                        if(unreleased_lives[j].note_stamina_reduce !== 1)dmg2 += (dmg2==="")?unreleased_lives[j].note_stamina_reduce.toString():`<br>${unreleased_lives[j].note_stamina_reduce}`;
                        break;
                    case 3:
                        live_type += "H";
                        if(unreleased_lives[j].note_stamina_reduce !== 1)dmg3 += (dmg3==="")?unreleased_lives[j].note_stamina_reduce.toString():`<br>${unreleased_lives[j].note_stamina_reduce}`;
                        break;
                    case 4:
                        live_type += "Ex";
                        if(unreleased_lives[j].note_stamina_reduce !== 1)dmg4 += (dmg4==="")?unreleased_lives[j].note_stamina_reduce.toString():`<br>${unreleased_lives[j].note_stamina_reduce}`;
                        limit4=unreleased_lives[j].note_voltage_upper_limit;
                        break;
                    case 5:
                        live_type += "Mas";
                        if(unreleased_lives[j].note_stamina_reduce !== 1)dmg5 += (dmg5==="")?unreleased_lives[j].note_stamina_reduce.toString():`<br>${unreleased_lives[j].note_stamina_reduce}`;
                        limit5=unreleased_lives[j].note_voltage_upper_limit;
                        break;
                }
                //live id is going to change
                if(unreleased_lives[i+1]===undefined||unreleased_lives[i+1]!==undefined && unreleased_lives[j].id_str !== unreleased_lives[i+1].id_str){
                    //note voltage upper limit depends on its last difficulty const
                    let wikirow = `|-\n| ${unreleased_lives[j].id_str} || ${song_name} || ${live_type} || ${dmg1} || ${dmg2} || ${dmg3} || ${dmg4} || ${limit4} || ${dmg5} || ${limit5}\n`;
                    live_type="", dmg1="", dmg2="", dmg3="", dmg4="", dmg5="", limit4="", limit5="";
                    wikitable_bondboard += wikirow;
                }
                i++;
                if(unreleased_lives[i]===undefined||unreleased_lives[i]!==undefined && Math.floor(unreleased_lives[j].id/10000000)!==Math.floor(unreleased_lives[i].id/10000000))break;
            }
        }
        wikitable_bondboard += "|}";
        
        let filestream_unreleased = fs.createWriteStream(DIR_OUT_UNRELEASED_LIVES);
        filestream_unreleased.write(wikitable_bondboard,'utf-8');
        filestream_unreleased.close();
        console.log("unreleased lives generation succeeded");
        res();
    },TIMEOUT);//硬等 就硬等
})