//directory constants
const DIR_SRC_CHARTS = "../difficulty/";
const DIR_SRC_DATABASE_MASTERDATA = "./masterdata.db";
const DIR_SRC_DATABASE_DICTIONARY_JA_K = "./dictionary_ja_k.db";
const DIR_OUT_CHARTTEXT_FULLFILLED = "./charttext/";
const DIR_OUT_CHARTTEXT_NOT_FULLFILLED = "./charttextIncomplete/";
const DIR_IMG_MAPPING = "./img_mapping.json";

//dependents
const util = require('util');
const fs = require("fs");
const sqlite = require("sqlite3").verbose();
//load img mapping
const itemimg = JSON.parse(fs.readFileSync(DIR_IMG_MAPPING));

//load database before analyzing, block
let masterdata = new sqlite.Database(DIR_SRC_DATABASE_MASTERDATA,(err)=>{
    if(err)throw new Error(err);
})
let dictionary_ja_k = new sqlite.Database(DIR_SRC_DATABASE_DICTIONARY_JA_K,(err)=>{
    if(err)throw new Error(err);
})
//match the first one in dictionary_ja_k, return undefined on not found or error
//will 
async function getdic(key,is_filename){
    key = key.slice(2);
    return new Promise(resolve=>{
        dictionary_ja_k.all(`select message from m_dictionary where id = '${key}'`,(err,row)=>{
            if(err){
                resolve(undefined);
                throw new Error(err);
            }
            if(row[0] === undefined)resolve('[function getdic]KEY NOT FOUND');
            else {
                if(row[0].message.indexOf('\n')!==-1)row[0].message = row[0].message.split('\n').join('');
                if(is_filename){
                    row[0].message = row[0].message.split('\\').join('%5C').split('/').join('%2F').split(':').join('%3A').split('*').join('%2A').split('?').join('%3F').split('"').join('%22').split('<').join('%3C').split('>').join('%3E').split('|').join('%7C');
                    row[0].message = row[0].message.split('&amp;').join('&').split('&apos;').join('\'');
                }else{
                    row[0].message = row[0].message.split('!!').join('&#33;&#33;');
                }
                resolve(row[0].message);
            }
        });
    })
}
function base95(str) {
    let integer = 0;
    for (let digit of str) {
        integer = integer * 95 + digit.codePointAt(0) - 32;
    }
    return integer;
}
//get all skill data from m_skill->m_skill_effect
async function getskill(obj,skill_id_key){
    return new Promise((res,rej)=>{
        masterdata.all(`select * from m_skill where id = ${obj[skill_id_key]}`,(err,sks)=>{
            if(err)throw new Error(err);
            if(sks[0]===undefined)rej(`ERROR:\tskill_id:${obj[skill_id_key]}\tNo match in m_skill`);
            res(sks[0]);
        })
    }).then((skill)=>{
        return Promise.all([new Promise(res=>{
            res(skill);
        }),new Promise((res,rej)=>{
            masterdata.all(`select * from m_skill_effect where id = ${skill.skill_effect_master_id1}`,(err,skes)=>{
                if(err)throw new Error(err);
                if(skes[0]===undefined)rej(`ERROR:\tskill_effect_id:${skill.skill_effect_master_id1}\tNo match in m_skill_effect`);
                res(skes[0]);
            })
        }),new Promise((res,rej)=>{
            if(skill.skill_effect_master_id2 === null)res(null);
            masterdata.all(`select * from m_skill_effect where id = ${skill.skill_effect_master_id2}`,(err,skes)=>{
                if(err)throw new Error(err);
                if(skes[0]===undefined)rej(`ERROR:\tskill_effect_id:${skill.skill_effect_master_id2}\tNo match in m_skill_effect`);
                res(skes[0]);
            })
        })])
    }).then(results=>{
        return new Promise(res=>{
            res({'skill':results[0],'skill_effect1':results[1],'skill_effect_2':results[2]});
        })
    })
}
//d must have live_id,live_difficulty_id,live_difficulty_type,unlock_pattern, return full file object.
//permanent123/SBL7/DLP123 involved in replace.
//not really strict (LIKE used),unlike main parts
async function chartreplace(d){
    return new Promise((res,rej)=>{
        let chart;
        try{
            chart = JSON.parse(fs.readFileSync(`${DIR_SRC_CHARTS}${d.live_difficulty_id}.json`));
        }catch(e){
            //TODO:(1<->4<->5)<->3:compare wave and ???
            if(d.unlock_pattern === 9 || d.live_difficulty_id.toString()[0] === '2'){
                res(null)
            }
            //TODO:(1<->4<->5)<->2:remove AC vo/dmg
            //1<->4<->5
            masterdata.all(`select live_difficulty_id,unlock_pattern,live_difficulty_type from m_live_difficulty where live_id like '_${d.live_id.toString().slice(1)}' and (unlock_pattern < 8 or unlock_pattern = 10) and live_difficulty_type = ${d.live_difficulty_type === 35 ? 114514 : d.live_difficulty_type}`,(err,reps)=>{
                if(err)rej(`[function chartreplace]error occured in sqlite3:`,err);
                for(let rep of reps){
                    //SBL:only adv
                    if(d.unlock_pattern === 5 || rep.unlock_pattern === 5){
                        if(d.live_difficulty_type !== 30)continue;
                    }
                    if(rep.live_difficulty_id.toString()[0] === '2')continue;
                    try{
                        chart = JSON.parse(fs.readFileSync(`${DIR_SRC_CHARTS}${rep.live_difficulty_id}.json`));
                    }catch(e){
                        continue;
                    }
                    res(chart);
                    break;
                }
                res(null);
            })
        }
        if(chart)res(chart);
    }).then((c)=>{//convert potato type to stat type
        return new Promise((res)=>{
            if(c){
                if(c.live_stage)res(c.live_stage);
                else res(c);
            }
            else res(null);
        })
    })
}
//judge difficulty type by note count
async function chartcomparison(d){
    return new Promise((res,rej)=>{
        if(d.unlock_pattern < 5 || d.unlock_pattern === 7 || d.unlock_pattern === 10){res('[function chartcomparison]this function is not designed for permanent charts');return;}
        masterdata.all(`select live_id,live_difficulty_id,live_difficulty_type,unlock_pattern from m_live_difficulty where live_id = '1${d.live_id.toString().slice(1)}' and (unlock_pattern < 5 or unlock_pattern = 7 or unlock_pattern = 10)`,(err,cmps)=>{
            if(err)rej(err);
            let actions = new Array();
            actions.push(chartreplace(d));
            for(let cmp of cmps)actions.push(chartreplace(cmp));
            
            cmps.unshift(null);
            Promise.all(actions).then((cmpchts)=>{
                if(cmpchts[0] === null){res('未知');return;}//自己没谱 must return here or will cause an error
                for(let i=1;i<cmpchts.length;i++){
                    //console.log(cmps[i].live_difficulty_type,cmpchts[i]?cmpchts[i].live_notes.length:null);
                    if(cmpchts[i] === null)continue;//对比没谱
                    let j=0;k=0;
                    //console.log(cmpchts[0].live_difficulty_id,cmpchts[i].live_difficulty_id)
                    while(cmpchts[i].live_notes[j] && cmpchts[0].live_notes[k]){
                        if(cmpchts[i].live_notes[j].note_type > 3){j++;continue;}
                        if(cmpchts[0].live_notes[k].note_type > 3){k++;continue;}
                        if(cmpchts[i].live_notes[j].call_time !== cmpchts[0].live_notes[k].call_time)break;
                        j++;k++;
                    }
                    while(cmpchts[i].live_notes[j] && cmpchts[i].live_notes[j].note_type > 3)j++;
                    while(cmpchts[0].live_notes[k] && cmpchts[0].live_notes[k].note_type > 3)k++;
                    if(cmpchts[i].live_notes[j] || cmpchts[0].live_notes[k])continue;
                    else{
                        res(((dif)=>{switch(dif){case 10:return '初级';case 20:return '中级';case 30:return '上级';case 35:return '上级+';case 37:return 'Challenge';default:return 'ERROR_DIFFICULTY_TYPE'}})(cmps[i].live_difficulty_type));
                        return;
                    }
                }
                res('未知');
            })
        })
    })
}
//CHARTS, parallel, select by music_id (4 digits) (not complete)
//not really necessary to make a parallel process in one song, so it is not
const display_order = [10,8,6,4,2,1,3,5,7,9];
const memid_to_name = {1:"高坂穗乃果",2:"绚濑绘里",3:"南小鸟",4:"园田海未",5:"星空凛",6:"西木野真姬",7:"东条希",8:"小泉花阳",9:"矢泽妮可",101:"高海千歌",102:"樱内梨子",103:"松浦果南",104:"黑泽黛雅",105:"渡边曜",106:"津岛善子",107:"国木田花丸",108:"小原鞠莉",109:"黑泽露比",201:"上原步梦",202:"中须霞",203:"樱坂雫",204:"朝香果林",205:"宫下爱",206:"近江彼方",207:"优木雪菜",208:"艾玛·维尔德",209:"天王寺璃奈",210:"三船栞子"};
function member_icon_gen(memid){
    if(memid !== 210) return `<ASCharaIcon id=${memid} w=80/>`;
    else return `<ASImg id=538328 w=80/>`
}
function inverse_wavetext(str){
    let type,arg;
    switch(str[0]){
        case '1':type=5;break;
        case '4':case'5':case '6':case '7':case'8':case'9':type=7;break;
        case 'N':type=2;break;
        case 'G':type=3;break;
        case 'W':type=4;break;
        case '合':type=1;break;
        case 'S':type=6;break;
        case 'ク':type=8;break;
        case '特':type=9;break;
        case 'ス':type=16;break;
        default:type=114514;console.error(`unknown AC description ${str}`);
    }
    let beg = [null,2,10,11,15,3,7,0,9,3,null,null,null,null,null,null,5],end;
    switch(type){
        case 1:case 5:case 6:
            end='ボ';break;
        case 2:case 3:case 4:case 8:case 9:
            end='回';break;
        case 7:
            end='人';break;
        case 16:
            end='%';break;
    }
    arg=parseInt(str.substring(beg[type],str.indexOf(end)).split(',').join(''));
    return {'mission_type':type,'arg_1':arg}
}
async function story_dlp_epilogs(unlock_pat,live_diff_id){
    return new Promise((res,rej)=>{
        switch (unlock_pat){
            case 1:case 2:case 3:case 4:case 10:
                if(live_diff_id===11072101||live_diff_id===11072201||live_diff_id===11072301){rej(`Will skip HSN ${live_diff_id}`);return;}
                if(live_diff_id===11014102||live_diff_id===11014202||live_diff_id===11014302){rej(`Will skip A2Z ${live_diff_id}`);return;}
                if(live_diff_id===12034102||live_diff_id===12034202||live_diff_id===12034302){rej(`Will skip TKMK17 ${live_diff_id}`);return;}
                res({'sort_key':parseInt(live_diff_id/100)});break;
            case 7:res({'sort_key':parseInt(live_diff_id/100/10)*10+50000+live_diff_id%10});break;
            case 5:case 8:rej(`Will skip SBL or intro chart ${live_diff_id}`);break;
            case 6://DLP
                masterdata.all(`select * from m_tower_composition where live_difficulty_id = ${live_diff_id}`,(err,layers)=>{
                    if(err)rej(err);
                    if(!layers[0]){rej(`Will skip unresolved parade chart ${live_diff_id}`);return;}
                    //for story cells in DLP
                    let floorno = 0;
                    masterdata.all(`select * from m_tower_composition where tower_id = ${layers[0].tower_id} order by floor_no`,(err,tower)=>{
                        if(err)rej(err);
                        for(let flo of tower){
                            if(flo.live_difficulty_id)floorno++;
                            if(flo.live_difficulty_id === layers[0].live_difficulty_id)break;
                        }
                        res({'head':`${layers[0].tower_id%1000}塔${floorno}层`,'sort_key':500000+(layers[0].tower_id%1000)*100+layers[0].floor_no,'tarvo':layers[0].target_voltage})
                    })
                });
                break;
            case 9://STORY
                if(live_diff_id==32002301||live_diff_id==32003301||live_diff_id==32004301||live_diff_id==32005301||live_diff_id==32006301||live_diff_id==32007301||live_diff_id==32008301||live_diff_id==32009301||live_diff_id==32010301){
                    res({'head':`2章10话`,'sort_key':302016});
                }
                masterdata.all(`select * from m_story_main_cell where live_difficulty_id = ${live_diff_id} or hard_live_difficulty_id = ${live_diff_id}`,(err,st)=>{
                    if(err)rej(err);
                    if(st[0])masterdata.all(`select * from m_story_main_cell where chapter_id = ${st[0].chapter_id}`,(err,chap)=>{
                        if(err)rej(err);
                        for(let sto in chap){
                            if(chap[sto].live_difficulty_id === live_diff_id){//NORMAL
                                for(let i=sto;i>=0;i--){
                                    //append 'NORMAL' if has hard_live_difficulty_id
                                    if(chap[i].number)res({'head':`${st[0].chapter_id}章${chap[i].number}话${st[0].hard_live_difficulty_id?' NORMAL':''}`,'sort_key':300000+st[0].id})
                                }
                                res({'head':`${st[0].chapter_id}章${0}话${st[0].hard_live_difficulty_id?' NORMAL':''}`,'sort_key':300000+st[0].id});
                            }
                            else if(chap[sto].hard_live_difficulty_id === live_diff_id){//HARD
                                for(let i=sto;i>=0;i--){
                                    if(chap[i].number)res({'head':`${st[0].chapter_id}章${chap[i].number}话 HARD`,'sort_key':300001+st[0].id});
                                }
                                res({'head':`${st[0].chapter_id}章${0}话 HARD`,'sort_key':300001+st[0].id});
                            }
                        }
                    });
                    //(HARD)
                    else rej(`Will skip deleted story chart ${live_diff_id}`);
                });
                break;
        }
    })
}
//#main
masterdata.each('select distinct music_id,is_2d_live,name,jacket_asset_path,live_member_mapping_id,member_group from m_live',(err,music)=>{
    //console.log(music);
    let wikitext_header = new String();
    Promise.all([
        getdic(music.name).then((song_name)=>{//dictionary->song_name
            wikitext_header = `= 歌曲基本信息 =\n\n<ASImg id=${base95(music.jacket_asset_path)} w=256/>\n\n<strong>歌曲名称</strong>：{{ja|${song_name}}}\n\n<strong>所属团队</strong>：${((name)=>{switch (name){case 1:return"μ's";case 2:return"Aqours";case 3:return"虹咲学园学园偶像同好会";case 4:return"Liella!";default:return`ERROR GROUP ${name}`}})(music.member_group)}\n\n<strong>是否有3D MV</strong>：${music.is_2d_live===1?"无":"有"}\n\n<strong>演唱者站位和衣装</strong>：\n\n`;
            return Promise.all([new Promise((res,rej)=>{
                masterdata.all(`select mapping_id,position,member_master_id,is_center,card_position,suit_master_id from m_live_member_mapping where mapping_id = ${music.live_member_mapping_id} order by position`,(err,mapping)=>{
                    if(err)throw new Error(err);
                    if(mapping[0]===undefined)console.error(`mapping ${music.live_member_mapping_id} not found`);
                    //get all suit thumbnails
                    let actions = new Array();
                    for(let mapping_suit of mapping){
                        actions.push(new Promise((res,rej)=>{
                            if(mapping_suit.suit_master_id){
                                masterdata.each(`select thumbnail_image_asset_path from m_suit where id = ${mapping_suit.suit_master_id}`,(err,path)=>{
                                    mapping_suit.thumbnail_image_asset_path = path.thumbnail_image_asset_path;
                                    res();
                                })
                            }else{
                                mapping_suit.thumbnail_image_asset_path = null;res();
                            }
                        }));
                        actions.push(new Promise((res,rej)=>{
                            masterdata.all(`select card_m_id from m_training_tree_card_suit where suit_m_id = ${mapping_suit.suit_master_id}`,(err,card)=>{
                                if(card[0]===undefined)mapping_suit.card_m_id = null;
                                else mapping_suit.card_m_id = card[0].card_m_id;
                                res();
                            })
                        }));
                    }
                    Promise.all(actions).then(()=>{res(mapping)});
                })
            }), new Promise((res,rej)=>{
                masterdata.all(`select mapping_id,position,member_master_id,is_center,card_position,suit_master_id from m_live_override_member_mapping where mapping_id = ${music.live_member_mapping_id} order by position`,(err,mapping_override)=>{
                    if(err)throw new Error(err);
                    //no override match
                    if(mapping_override[0]===undefined)res(null);
                    //Shioriko
                    for(let member of mapping_override){
                        if(member.mapping_id === 12034 && member.member_master_id === 210)member.suit_master_id = 102102001;
                        //if(member.mapping_id === 12053 && member.member_master_id === 210)member.suit_master_id = 啥啥啥;
                    }
                    //get all suit thumbnails
                    let actions = new Array();
                    for(let mapping_suit of mapping_override){
                        //override.is_center = false
                        mapping_suit.is_center = 0;
                        actions.push(new Promise((res,rej)=>{
                            if(mapping_suit.suit_master_id){
                                masterdata.each(`select thumbnail_image_asset_path from m_suit where id = ${mapping_suit.suit_master_id}`,(err,path)=>{
                                    mapping_suit.thumbnail_image_asset_path = path.thumbnail_image_asset_path;
                                    res();
                                })
                            }
                            else{//no suit
                                mapping_suit.thumbnail_image_asset_path = null;
                                res();
                            }
                        }))
                        actions.push(new Promise((res,rej)=>{
                            masterdata.all(`select card_m_id from m_training_tree_card_suit where suit_m_id = ${mapping_suit.suit_master_id}`,(err,card)=>{
                                if(card[0]===undefined)mapping_suit.card_m_id = null;
                                else mapping_suit.card_m_id = card[0].card_m_id;
                                res();
                            })
                        }));
                    }
                    Promise.all(actions).then(()=>{res(mapping_override)},()=>{console.error('unknown error occured on checking suits')});
                })
            })])
        }).then((mappings)=>{//member_suit
            return new Promise((res,rej)=>{
                let wikitext_member_table = new String();
                if(mappings[1])for(let member of mappings[1])mappings[0].push(member);
                let wikitext_member_table_line1 = '\n|-', wikitext_member_table_line2 = '\n|-', wikitext_member_table_line3 = '\n|-';
                if(mappings[0] && mappings[0].length > 0){
                    wikitext_member_table += `{| class="wikitable" style="text-align:center"`
                    for(let order of display_order){
                        if(order <= mappings[0].length){
                            let member = mappings[0][order-1];
                            wikitext_member_table_line1 += `\n!${order}${member.is_center?` (Center)`:new String()}`;
                            wikitext_member_table_line2 += `\n|${member_icon_gen(member.member_master_id)}`;
                            wikitext_member_table_line3 += `\n|`+(member.card_m_id?(`[[${memid_to_name[member.member_master_id]}#card_long_id_${member.card_m_id}|${member.suit_master_id?`<ASImg id=${base95(member.thumbnail_image_asset_path)} w=80/>]]`:""}`):(member.suit_master_id?`<ASImg id=${base95(member.thumbnail_image_asset_path)} w=80/>`:""));
                        }
                    }
                    //in the previous version, the row of suits would only available on all suits released.
                    //now it will show if more than just one suit released, for editing 4 times a month is no longer impossible.
                    //You can restore this configuration by swapping the 'true' and 'false'
                    let has_suits = false;
                    for(let member of mappings[0]){
                        if(member.suit_master_id)has_suits = true;
                    }
                    wikitext_member_table += (wikitext_member_table_line1 + wikitext_member_table_line2 + (has_suits?wikitext_member_table_line3:new String()) + "\n|}");
                }
                res(wikitext_member_table);
            })
        }),
        walk_all_difficulty(music.music_id)
    ]).then((results)=>{
        let wikitext_diffs = results[1].texts, is_fullfilled = results[1].is_fullfilled;
        wikitext_diffs.sort((a,b)=>{
            return a.sort_key-b.sort_key;
        });
        const header = `${wikitext_header}${results[0]}`;
        const part1 = "\n\n== 通常Live ==", part3 = "\n\n== 剧情Live ==", part5 = "\n\n== DLP Live ==";
        let contents = new String();
        let i = 0;
        if(wikitext_diffs[i])contents += '\n\n= 各难度信息 =';
        if(wikitext_diffs[i] && wikitext_diffs[i].sort_key < 300000)contents += part1;
        while(wikitext_diffs[i] && wikitext_diffs[i].sort_key < 300000){
            contents += '\n\n'+wikitext_diffs[i].text;i++;
        }
        if(wikitext_diffs[i] && wikitext_diffs[i].sort_key < 500000)contents += part3;
        while(wikitext_diffs[i] && wikitext_diffs[i].sort_key < 500000){
            contents += '\n\n'+wikitext_diffs[i].text;i++;
        }
        if(wikitext_diffs[i] && wikitext_diffs[i].sort_key < 600000)contents += part5;
        while(wikitext_diffs[i] && wikitext_diffs[i].sort_key < 600000){
            contents += '\n\n'+wikitext_diffs[i].text;i++;
        }
        getdic(music.name,true).then((file_name)=>{
            if(is_fullfilled && i > 0)fs.writeFile(`${DIR_OUT_CHARTTEXT_FULLFILLED}${music.live_member_mapping_id%10000} ${file_name}.txt`,header+contents,'utf-8',(err)=>{if(err)console.error(err)});
            else fs.writeFile(`${DIR_OUT_CHARTTEXT_NOT_FULLFILLED}${music.live_member_mapping_id%10000} ${file_name}.txt`,header+contents,'utf-8',(err)=>{if(err)console.error(err)});
        })
    });
})




function walk_all_difficulty(music_id){
    return new Promise(resolve=>{
        let wikitext_difficulties = new Array();
        let is_fullfilled = true;
        //非常不文明 千万不要学
        //but you can try to understand why this is correct hahahahaha
        //(this *correct* means: if i tested this for several times sometimes with unplugged power, then this is correct .jpg)
        //(in other words, i thought its correct, but the tests can never prove it)
        let counter = 0;
        let phase = 0;
        let max_phase = null;
        function checkcounter(){
            counter--;
            //console.log(`${phase}/${max_phase}`,counter,'-');
            if(counter===0 && phase===max_phase){resolve({'texts':wikitext_difficulties,'is_fullfilled':is_fullfilled})};
        }
        function pushcounter(a){
            if(a)counter += a;
            else counter++;
            phase++;
            //console.log(`${phase}/${max_phase}`,counter,'+');
        }
        masterdata.all(`select live_id from m_live where music_id=${music_id}`,(err,musics)=>{
            max_phase = musics.length;
            if(err)throw new Error(err);
            for(let music of musics){
                masterdata.all(`select live_difficulty_id,live_id,live_difficulty_type,unlock_pattern,default_attribute,recommended_score,recommended_stamina,consumed_lp,reward_user_exp,judge_id,bottom_technique,additional_drop_decay_technique,reward_base_love_point,evaluation_s_score,evaluation_a_score,evaluation_b_score,evaluation_c_score,stamina_voltage_group_id,combo_voltage_group_id,difficulty_const_master_id from m_live_difficulty where live_id = ${music.live_id}`,(err,difficulties)=>{
                    pushcounter(difficulties.length);
                    if(err)throw new Error(err);
                    for(let difficulty of difficulties){
                        let wikitext_difficulty = new String();
                        let sort_key;
                        chartreplace(difficulty).then((chart)=>{//convert charts and find DLP/Story pos
                            if(chart === null)console.log(`The chart ${difficulty.live_difficulty_id} has not been collected.`);
                            return Promise.all([new Promise((res,rej)=>{
                                masterdata.all(`select * from m_live_difficulty_const where id = ${difficulty.difficulty_const_master_id}`,(err,consts)=>{
                                    if(err)throw new Error(err);
                                    if(consts[0] === undefined)console.error(`difficulty ${difficulty.live_difficulty_id} has no difficulty const`);
                                    res({'chart':chart, 'diff_const':consts[0]});
                                })
                            }),
                            //this will reject the promise on deleted story or dlp charts, so those won't generate any text.
                            story_dlp_epilogs(difficulty.unlock_pattern,difficulty.live_difficulty_id,difficulty.default_attribute),
                            chartcomparison(difficulty)
                            ]).then(results=>{
                                return new Promise(res=>{
                                    results[0].epilog = results[1];//all sort key/story position/dlp position&voltage
                                    results[0].epilog2 = results[2];//story/dlp difficulty
                                    res(results[0]);
                                })
                            })
                        }).then((results)=>{//LiveData generation and get skills/skill effects
                            let chart = results.chart, diff_const = results.diff_const;
                            sort_key = results.epilog.sort_key;
                            let note_count = chart?(chart.live_notes.length-2*chart.live_wave_settings.length):'未知';
                            switch(difficulty.unlock_pattern){
                                case 1:case 2:case 3:case 4:case 7:case 10:
                                    /*PERM & EVENT*/
                                    wikitext_difficulty += `=== <ASCommonIcon name="icon_attribute_${difficulty.default_attribute}" w=26/>${difficulty.default_attribute===9?'活动':new String()}${((dif)=>{switch(dif){case 10:return '初级';case 20:return '中级';case 30:return '上级';case 35:return '上级+';case 37:return 'Challenge';default:return 'ERROR_DIFFICULTY_TYPE'}})(difficulty.live_difficulty_type)} ===`;
                                    wikitext_difficulty += `\n\n{{NormalLiveData|${difficulty.consumed_lp}|${difficulty.recommended_score.toLocaleString()}|${difficulty.recommended_stamina.toLocaleString()}|${difficulty.evaluation_c_score.toLocaleString()}|${difficulty.evaluation_b_score.toLocaleString()}|${difficulty.evaluation_a_score.toLocaleString()}|${difficulty.evaluation_s_score.toLocaleString()}|${note_count}|${diff_const.note_stamina_reduce}|${diff_const.sp_gauge_length}|${diff_const.sp_gauge_reducing_point}|${diff_const.note_voltage_upper_limit.toLocaleString()}|${diff_const.collabo_voltage_upper_limit.toLocaleString()}|${diff_const.skill_voltage_upper_limit.toLocaleString()}|${diff_const.squad_change_voltage_upper_limit.toLocaleString()}|${difficulty.reward_user_exp}|${difficulty.reward_base_love_point}}}`;
                                    break;
                                case 6:
                                    /*DLP*/
                                    wikitext_difficulty += `=== <ASCommonIcon name="icon_attribute_${difficulty.default_attribute}" w=26/>${results.epilog.head} ===`;
                                    wikitext_difficulty += `\n\n{{DLPLiveData|${difficulty.recommended_score.toLocaleString()}|${difficulty.recommended_stamina.toLocaleString()}|${results.epilog.tarvo.toLocaleString()}|${note_count}|${results.epilog2}|${diff_const.note_stamina_reduce}|${diff_const.sp_gauge_length}|${diff_const.sp_gauge_reducing_point}|${diff_const.note_voltage_upper_limit.toLocaleString()}|${diff_const.collabo_voltage_upper_limit.toLocaleString()}|${diff_const.skill_voltage_upper_limit.toLocaleString()}|${diff_const.squad_change_voltage_upper_limit.toLocaleString()}}}`;
                                    break;
                                case 9:
                                    /*story*/
                                    let exchangeitem = ((dif)=>{switch(dif){case 10:return 180;case 20:return 300;case 30:return 460;case 35:return 700;default:return "ERR_DIFFICULTY_TYPE";}})(difficulty.live_difficulty_type);
                                    //TODO: 对应通常难度
                                    wikitext_difficulty += `=== <ASCommonIcon name="icon_attribute_${difficulty.default_attribute}" w=26/>${results.epilog.head} ===`;
                                    wikitext_difficulty += `\n\n{{StoryLiveData|${difficulty.consumed_lp}|${difficulty.recommended_score.toLocaleString()}|${difficulty.recommended_stamina.toLocaleString()}|${difficulty.evaluation_c_score.toLocaleString()}|${difficulty.evaluation_b_score.toLocaleString()}|${difficulty.evaluation_a_score.toLocaleString()}|${difficulty.evaluation_s_score.toLocaleString()}|${note_count}|${results.epilog2}|${diff_const.note_stamina_reduce}|${diff_const.sp_gauge_length}|${diff_const.sp_gauge_reducing_point}|${diff_const.note_voltage_upper_limit.toLocaleString()}|${diff_const.collabo_voltage_upper_limit.toLocaleString()}|${diff_const.skill_voltage_upper_limit.toLocaleString()}|${diff_const.squad_change_voltage_upper_limit.toLocaleString()}|${difficulty.reward_user_exp}|${difficulty.reward_base_love_point}|${exchangeitem}}}`;
                                    break;
                                default:console.error(`[ASWIKI LIVE GEN]unexpected unlock_pattern ${difficulty.unlock_pattern} from chart ${difficulty.live_difficulty_id}`);
                            }
                            //return new Promise(res=>{res()});
                            //data pretreatment
                            return Promise.all([
                                new Promise((res,rej)=>{
                                    masterdata.all(`select * from m_live_difficulty_gimmick where live_difficulty_master_id = ${difficulty.live_difficulty_id}`,(err,glives)=>{
                                        if(glives[0] === undefined){
                                            rej(`No Live Gimmick from difficulty:${difficulty.live_difficulty_id}, will skip`);//for 9999/92999101/92998101
                                            return;
                                        };
                                        let actions = new Array();
                                        for(let glive of glives){
                                            actions.push(
                                                Promise.all([getdic(glive.description),getskill(glive,'skill_master_id')]).then(results=>{
                                                    glive.description = results[0];
                                                    glive.sk = results[1];
                                                    return new Promise(resolve=>{resolve(glive)});
                                                })
                                            )
                                        }
                                        Promise.all(actions).then(()=>res(glives));
                                    });
                                }),
                                new Promise((res,rej)=>{
                                    masterdata.all(`select * from m_live_difficulty_note_gimmick where live_difficulty_id = ${difficulty.live_difficulty_id} order by note_id`,(err,gnotes)=>{
                                        let actions = new Array();
                                        for(let gnote of gnotes){
                                            actions.push(
                                                Promise.all([getdic(gnote.name),getskill(gnote,'skill_master_id')]).then(results=>{
                                                    gnote.name_notag = results[0].slice(results[0].lastIndexOf("/>")+2);
                                                    gnote.sk = results[1];
                                                    return new Promise(resolve=>{resolve(gnote)});
                                                })
                                            )
                                        }
                                        Promise.all(actions).then(()=>res(gnotes));
                                    });
                                }),
                                new Promise((res,rej)=>{
                                    masterdata.all(`select * from m_live_note_wave_gimmick_group where live_difficulty_id = ${difficulty.live_difficulty_id} order by wave_id`,(err,gwaves)=>{
                                        let actions = new Array();
                                        for(let gwave of gwaves){
                                            actions.push(
                                                Promise.all([getdic(gwave.name),getskill(gwave,'skill_id')]).then(results=>{
                                                    gwave.name = results[0];
                                                    gwave.live_wave_setting = inverse_wavetext(results[0]);
                                                    gwave.sk = results[1];
                                                    return new Promise(resolve=>resolve(gwave));
                                                })
                                            )
                                        }
                                        Promise.all(actions).then(()=>res(gwaves));
                                    });
                                })
                            ]).then(gimmicks=>{
                                //if(gimmicks[0][0].live_difficulty_master_id===11009501)console.log(gimmicks);
                                return new Promise(res=>{
                                    res({'chart':results.chart,'live':gimmicks[0],'note':gimmicks[1],'wave':gimmicks[2]});
                                })
                            },onrej=>{
                                //for 9999/92999101/92998101
                                console.log(onrej);
                                return new Promise((res,rej)=>{res(null)});
                            });
                        },(onrejection)=>{
                            console.log(`[ASWIKI LIVE GEN]${onrejection}`);
                            return new Promise(res=>{res(null)});
                        }).then((gimmicks)=>{//all data got,generate text
                            //onskip
                            if(!gimmicks){
                                checkcounter();
                                return;
                            }
                            //before
                            if(gimmicks.chart){
                                if(difficulty.live_difficulty_id !== gimmicks.chart.live_difficulty_id)
                                console.log(`[function chartreplace]The chart ${difficulty.live_difficulty_id} is replaced by ${gimmicks.chart.live_difficulty_id}`);
                            }else{
                                is_fullfilled = false;
                            }
                
                            //gimmickLive
                            let Part1 = new String();
                            for(let glive of gimmicks.live){
                                //
                                let gimmickLiveDescription2 = glive.sk.skill.skill_target_master_id2?`|${glive.sk.skill.skill_target_master_id2}|${glive.sk.skill_effect2.effect_type}|${glive.sk.skill_effect2.calc_type}|${glive.sk.skill_effect2.effect_value}`:"";
                                let gimmickLiveDescription = glive.skill_master_id===50000001?"无特效":`{{GimmickLiveDescription|${glive.sk.skill.skill_target_master_id1}|${glive.sk.skill_effect1.effect_type}|${glive.sk.skill_effect1.calc_type}|${glive.sk.skill_effect1.effect_value}${gimmickLiveDescription2}}}`;
                                //slice 7 char (【攻略hinto】)
                                Part1 += `{{GimmickLive|【Live特征】${gimmickLiveDescription}|【攻略提示】{{ja|${glive.description.slice(7)}}}}}`;
                            }
                           
                            //gimmickNote
                            const chart_avail = gimmicks.chart?true:false;
                            let ac_begs = new Array(), ac_ends = new Array(), shift = 0;
                            if(chart_avail){
                                for(let note of gimmicks.chart.live_notes){
                                    if(note.note_type === 4){note.shift = shift++;ac_begs.push(note.id-note.shift);}
                                    else if(note.note_type === 5){note.shift = ++shift;ac_ends.push(note.id-note.shift);}
                                    else note.shift = shift;
                                }
                            }
                
                            let gimmick_note_group = new Object();
                            let Part2 = new String();
                            for(let gnote of gimmicks.note){
                                if(gimmick_note_group[gnote.name]===undefined){
                                    gimmick_note_group[gnote.name] = gnote
                                    gimmick_note_group[gnote.name].note_ids = new Array();
                                }
                                if(chart_avail)gimmick_note_group[gnote.name].note_ids.push(gnote.note_id-gimmicks.chart.live_notes[gnote.note_id].shift);
                                else gimmick_note_group[gnote.name].note_ids.push('???');
                            }
                            for(let gnoten in gimmick_note_group){
                                let gnote = gimmick_note_group[gnoten];
                                const sk_note = gnote.sk;
                                //gimmick_type/target/type/value/valv/ftype/fvalue
                                let gimmickNoteDescription2 = sk_note.skill.skill_target_master_id2?`|${sk_note.skill.skill_target_master_id2}|${sk_note.skill_effect2.effect_type}|${sk_note.skill_effect2.effect_value}|${sk_note.skill_effect2.calc_type}|${sk_note.skill_effect2.finish_type}|${sk_note.skill_effect2.finish_value}`:"";
                                let gimmickNoteDesctiption = `{{GimmickNoteDescription|${gnote.note_gimmick_type}|${sk_note.skill.skill_target_master_id1}|${sk_note.skill_effect1.effect_type}|${sk_note.skill_effect1.effect_value}|${sk_note.skill_effect1.calc_type}|${sk_note.skill_effect1.finish_type}|${sk_note.skill_effect1.finish_value}${gimmickNoteDescription2}}}`;
                                let gimmickNotePositions = "";
                                for(let pos of gnote.note_ids)gimmickNotePositions+=`|${pos}`;
                                //icon/jp_name/desc/pos1/pos2/...
                                Part2 += `{{GimmickNote|${((icon)=>{if(icon<14)icon+=1000;else if(icon===25)icon=1014;else if(icon===53)icon=2027;else icon+=1987;return icon})(gnote.note_gimmick_icon_type)}|{{ja|${gnote.name_notag}}}|${gimmickNoteDesctiption}${gimmickNotePositions}}}`;
                            }
                            if(gimmicks.note.length === 0)Part2 += '此Live没有特效节奏图示。';
                
                            //gimmickWave
                            let Part3 = new String();
                            for(let gwave of gimmicks.wave){
                                //no arg_2
                                let waveMissionDetail = `{{WaveMissionDetail|${gwave.live_wave_setting.mission_type}|${gwave.live_wave_setting.arg_1.toLocaleString()}}}`;
                                let waveSettings = chart_avail?`|${ac_begs[gwave.wave_id-1]}|${ac_ends[gwave.wave_id-1]}|${gimmicks.chart.live_wave_settings[gwave.wave_id-1].reward_voltage.toLocaleString()}|${gimmicks.chart.live_wave_settings[gwave.wave_id-1].wave_damage.toLocaleString()}`:"";
                                let gimmickWaveDescription2 = gwave.sk.skill.skill_target_master_id2?`|${gwave.sk.skill.skill_target_master_id2}|${gwave.sk.skill_effect2.effect_type}|${gwave.sk.skill_effect2.effect_value}|${gwave.sk.skill_effect2.calc_type}|${gwave.sk.skill_effect2.finish_type}|${gwave.sk.skill_effect2.finish_value}`:"";
                                //trigger(state)/target/type/value/calc/ftype/fvalue
                                let gimmickWaveDescription = `{{GimmickWaveDescription|${gwave.state}|${gwave.sk.skill.skill_target_master_id1}|${gwave.sk.skill_effect1.effect_type}|${gwave.sk.skill_effect1.effect_value}|${gwave.sk.skill_effect1.calc_type}|${gwave.sk.skill_effect1.finish_type}|${gwave.sk.skill_effect1.finish_value}${gimmickWaveDescription2}}}`;
                                Part3 += `{{GimmickWave|${waveMissionDetail}|${gimmickWaveDescription}${waveSettings}}}`;
                            }
                            if(gimmicks.wave.length === 0)Part3 += '此Live没有Appeal Chance。';
                
                            const final = `\n\n{{GimmickData|${Part1}|${Part2}|${Part3}}}`;
                            wikitext_difficulty += final;
                            wikitext_difficulties.push({'sort_key':sort_key,'text':wikitext_difficulty});
                            checkcounter();
                        })
                    }
                });
            }
        });
    })
}
