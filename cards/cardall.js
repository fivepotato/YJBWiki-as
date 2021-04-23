const sqlite = require('sqlite3');
const util = require('util');
const masterdata = new sqlite.Database('../masterdata.db',(err)=>{
    if(err)console.error(err);
});
const dictionary_ja_k = new sqlite.Database('../dictionary_ja_k.db',(err)=>{
    if(err)console.error(err);
})
masterdata.ALL = util.promisify(masterdata.all);
dictionary_ja_k.GET = util.promisify(dictionary_ja_k.each);

//active/passive/lesson/accessory/glive/gwave/gnote->trigger_type{0},trigger_prob{1},condition1{2},condition2{3}
//skill->target1{4},effect1{5},target2{11},effect2{12}
//skill_effect->effect_type{6},effect_value{7},calc_type{8},finish_type{9},finish_value{10}
const skilldescription = (effect_type)=>{
    switch (effect_type){
        case 0:'No effect.';break;
        case 1:'Gain {7} Voltage.'
    }
}
'Increase Appeal by 5% until the Live Show ends.\nCondition: On Song Start,30% Chance\nAffects:Voltage Types'
function base95(str) {
    let integer = 0;
    for (let digit of str) {
        integer = integer * 95 + digit.codePointAt(0) - 32;
    }
    return integer;
}

async function getdic(key,is_filename){
    key = key.slice(2);
    return new Promise(resolve=>{
        dictionary_ja_k.all(`select message from m_dictionary where id = '${key}'`,(err,row)=>{
            if(err){
                resolve(undefined);
                console.error(err);
            }
            if(row[0] === undefined)resolve('[function getdic]KEY NOT FOUND');
            else {
                if(row[0].message.indexOf('\n')!==-1)row[0].message = row[0].message.split('\n').join();
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

const MEMBER_NAMES_CN = {1:'高坂穗乃果',3:'南小鸟',2:'绚濑绘里',4:'园田海未',5:'星空凛',6:'西木野真姬',7:'东条希',8:'小泉花阳',9:'矢泽妮可',101:'高海千歌',103:'松浦果南',102:'樱内梨子',104:'黑泽黛雅',105:'渡边曜',106:'津岛善子',107:'国木田花丸',108:'小原鞠莉',109:'黑泽露比',201:'上原步梦',202:'中须霞',203:'樱坂雫',204:'朝香果林',205:'宫下爱',206:'近江彼方',207:'优木雪菜',208:'艾玛·维尔德',209:'天王寺璃奈',210:'三船栞子',211:'钟岚珠',212:'米娅'};

(async ()=>{
    let actions = new Array();
    const M_CARD = await masterdata.ALL('select id,member_m_id,school_idol_no,card_rarity_type,card_attribute,role,member_card_thumbnail_asset_path,training_tree_m_id,sp_point,passive_skill_slot,max_passive_skill_slot from m_card');
    for(let card of M_CARD){
        let level = ((rarity)=>{switch(rarity){case 10:return 40;case 20:return 60;case 30:return 80;default:console.error(`unexpected rarity type ${rarity}`)}})(card.card_rarity_type);
        const card_process = Promise.all([
            //0
            masterdata.ALL(`select appearance_type,card_name from m_card_appearance where card_m_id = ${card.id} order by appearance_type`),
            //1
            masterdata.ALL(`select appeal,stamina,technique from m_card_parameter where card_m_id = ${card.id} and level = ${level}`),
            //2
            masterdata.ALL(`select parameter1,parameter2,parameter3 from m_card_awaken_parameter where card_master_id = ${card.id}`),
            //3
            masterdata.ALL(`select training_tree_card_param_m_id,training_tree_card_passive_skill_increase_m_id from m_training_tree where id = ${card.training_tree_m_id}`).then((tree)=>{
                return masterdata.ALL(`select training_content_type,value from m_training_tree_card_param where id = ${tree[0].training_tree_card_param_m_id}`);
            }),
            //4
            //skill_level,name not necessary
            //this will get 5 rows(lv.1/2/3/4/5)
            masterdata.ALL(`select skill_level,name,active_skill_master_id from m_card_active_skill where card_master_id = ${card.id}`).then((card_active_skills)=>{
                let actions = new Array();
                for(let a of card_active_skills){
                    actions.push(masterdata.ALL(`select thumbnail_asset_path from m_active_skill where id = ${a.active_skill_master_id}`));
                }
                return Promise.all(actions);
            }),
            //5
            masterdata.ALL(`select skill_level,passive_skill_master_id from m_card_passive_skill_original where card_master_id = ${card.id} and position = 1`).then((card_passive_skills_1)=>{
                let actions = new Array();
                for(let p of card_passive_skills_1){
                    actions.push(masterdata.ALL(`select thumbnail_asset_path from m_passive_skill where id = ${p.passive_skill_master_id}`));
                }
                return Promise.all(actions);
            }),
            //6
            masterdata.ALL(`select skill_level,passive_skill_master_id from m_card_passive_skill_original where card_master_id = ${card.id} and position = 2`).then((card_passive_skills_2)=>{
                let actions = new Array();
                for(let p of card_passive_skills_2){
                    actions.push(masterdata.ALL(`select thumbnail_asset_path from m_passive_skill where id = ${p.passive_skill_master_id}`));
                }
                return Promise.all(actions);
            })
        ]).then(async (results)=>{
            const card_name_1 = await getdic(results[0][0].card_name);
            const card_name_2 = await getdic(results[0][1].card_name);
            const chara_name = MEMBER_NAMES_CN[card.member_m_id];
            const base_parm = [results[1][0].appeal,results[1][0].stamina,results[1][0].technique];
            const awaken_parm = [results[2][0].parameter2,results[2][0].parameter1,results[2][0].parameter3];
            let training_parm = [0,0,0];
            for(let cell of results[3]){
                switch(cell.training_content_type){
                    case 2:training_parm[1]+=cell.value;break;
                    case 3:training_parm[0]+=cell.value;break;
                    case 4:training_parm[2]+=cell.value;break;
                    default:console.error('unexpected training_content_type');
                }
            }
            const active_icon = base95(results[4][4][0].thumbnail_asset_path);
            const passive_icon_1 = base95(results[5][results[5].length-1][0].thumbnail_asset_path);//4 or 6(party)
            const passive_icon_2 = results[6][0]?base95(results[6][0][0].thumbnail_asset_path):null;
            
            const template_string_result = `{{CardDataBasic|${card.school_idol_no}|${card.id}|${card_name_1}|${card_name_2}|${chara_name}|${card.card_attribute}|${card.role}|{0}|${base_parm[0]+training_parm[0]+awaken_parm[0]}|${base_parm[1]+training_parm[1]+awaken_parm[1]}|${base_parm[2]+training_parm[2]+awaken_parm[2]}|${active_icon}|${passive_icon_1}${passive_icon_2?`|${passive_icon_2}`:new Array()}}}`;
            const parm_sum_raw = base_parm[0]+training_parm[0]+base_parm[1]+training_parm[1]+base_parm[2]+training_parm[2];
            return new Promise(res=>{res({'no':card.school_idol_no,'id':card.id,'str':template_string_result,'slots':card.max_passive_skill_slot,'parm_sum_raw':parm_sum_raw})})
        });
        actions.push(card_process);
    }
    //gacha event party fes
    Promise.all(actions).then((cards)=>{
        let file_out = new String();
        //console.log(new Date().now().toString());
        let sr_parm_sum = 16000,ur_parm_sum = 26000;
        cards.sort((a,b)=>{return a.no-b.no});
        for(card of cards){
            //there are some unexpected aspects that reminding you +1500&+500 is really ugly.
            if(card.id === 424)sr_parm_sum = 18700;ur_parm_sum = 30500;
            if(card.id === 434)sr_parm_sum = 19300;ur_parm_sum = 31500;
            let gepf;
            //there are some unexpected aspects that reminding you nijigasaki2 is really ugly too.
            if(card.no >= 284 && card.no <= 286){
                gepf = '卡池卡';
            }else{
                switch (card.id.toString()[0]+card.id.toString()[5]+card.slots.toString()){
                    case '112':case '123':case '133':gepf = '初始卡';break;
                    case '511':gepf = '卡池卡';break;
                    case '223':case '323':case '423':
                        if(card.parm_sum_raw > sr_parm_sum){
                            sr_parm_sum = card.parm_sum_raw;
                            gepf = '卡池卡';
                        }
                        else if(sr_parm_sum - card.parm_sum_raw < 307)gepf = '卡池卡';
                        else gepf = '活动卡';
                        break;
                    case '333': case '433':
                        if(card.parm_sum_raw > ur_parm_sum){
                            ur_parm_sum = card.parm_sum_raw;
                            gepf = '卡池卡';
                        }
                        else if(ur_parm_sum - card.parm_sum_raw < 507)gepf = '卡池卡';
                        else gepf = '活动卡';
                        break;
                    case '234':gepf = 'fes卡';break;
                    case '334':
                        if(card.parm_sum_raw > ur_parm_sum)ur_parm_sum = card.parm_sum_raw;
                        gepf = 'party卡';
                        break;
                    default:
                }
            }
            file_out += card.str.split('{0}').join(gepf) + '\n';
        }
        console.log(file_out)
    })
})()
