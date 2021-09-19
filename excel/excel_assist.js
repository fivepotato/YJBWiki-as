const DIR_SRC_DATABASE_MASTERDATA = "../masterdata.db";
const LAST_CARD_COUNT = 9;
//dependents
const util = require('util');
const fs = require('fs');
const sqlite = require("sqlite3").verbose();
const aslib = require("../aslib");

const pasv_sk_name = {
    9:"st+",
    10:"ap+",
    11:"te+",
};
const tar_name = {
    1:"全员",
    50:"仲间",
    53:"同作战",
    54:"同学校",
    55:"同小队",
    56:"同属性",
    57:"同type",
    59:"自身",
    60:"同年级",
};
const trig_name = {
    2:"曲开始",
    3:"AC时",
    4:"AC成功",
    5:"AC失败",
    6:"伤害时/低血量",
    7:"伤害时/大量伤害",
    9:"切队",
    10:"SP发动",
    11:"ct時",
    12:"ap時",
};
const effect_name = {
    2:"vo获得\t固定值",
    3:"sp获得\t固定值",
    4:"加盾\t固定值",
    5:"回血\t固定值",
    6:"减伤",
    17:"ap+",
    18:"vo+",
    19:"sp+",
    20:"ct+",
    21:"ct值+",
    22:"sk+",
    23:"核弹\t固定值",
    25:"核弹\tap",
    26:"ap+",
    28:"ap+元气",
    29:"sp+",
    33:"sk+",
    40:"ct+",
    60:"驱散",
    90:"vo获得\tap",
    91:"sp获得\tsp槽",
    92:"sp获得\tap",
    94:"加盾\tst",
    97:"回血\tst",
    106:"复活\t总st",
    108:"核弹\tte",
    109:"vo获得\tst",
    110:"vo获得\tte",
    112:"sp获得\tsp",
    113:"加盾\tap",
    116:"回血\tte",
    118:"Gd切队效果up\t",
    119:"ap+",
};
const 键数 = skill_effect => {
    switch(skill_effect.finish_type){
        case 1:return "infty";
        case 2:return skill_effect.finish_value;
        case 4:return "AC内";
    }
}
const 次数 = skill_trigger => {
    const id1 = skill_trigger.skill_condition_master_id1;
    const id2 = skill_trigger.skill_condition_master_id2;
    if(101<=id1 && 111>id1)return id1 - 101;
    if(101<=id2 && 111>id2)return id2 - 101;
    if(260<=id1 && 270>id1)return id1 - 260;
    if(260<=id2 && 270>id2)return id2 - 260;
}

module.exports = {excelAssist: async ()=>{
    //load database before analyzing, block
    let masterdata = new sqlite.Database(DIR_SRC_DATABASE_MASTERDATA,(err)=>{
        if(err)throw new Error(err);
    })
    masterdata.ALL = util.promisify(masterdata.all);

    const returns = [];
    const all_cards = await masterdata.ALL("select id,member_m_id,school_idol_no,card_rarity_type,card_attribute,role,training_tree_m_id from m_card order by school_idol_no");
    const cards = all_cards.slice(-LAST_CARD_COUNT);
    const raw_data = {};
    for(let card of cards){
        raw_data[card.school_idol_no] = {"Appeal":0,"Stamina":0,"Technique":0,"Passive_effect1":[],"Passive_effect2":[],"Active_effect1":[],"Active_effect2":[]};
        const training_tree = (await masterdata.ALL(`select training_tree_card_param_m_id from m_training_tree where id = ${card.training_tree_m_id}`))[0];
        const training_tree_card_param = await masterdata.ALL(`select training_content_type,value from m_training_tree_card_param where id = ${training_tree.training_tree_card_param_m_id}`);
        for(let item of training_tree_card_param){
            switch(item.training_content_type){
                case 3: raw_data[card.school_idol_no].Appeal += item.value; break;
                case 2: raw_data[card.school_idol_no].Stamina += item.value; break;
                case 4: raw_data[card.school_idol_no].Technique += item.value; break;
            }
        }
        const card_parameter = (await masterdata.ALL(`select appeal,stamina,technique from m_card_parameter where card_m_id = ${card.id} and level = ${aslib.rarity_to_base_level[card.card_rarity_type]}`))[0];
        raw_data[card.school_idol_no].Appeal += card_parameter.appeal;
        raw_data[card.school_idol_no].Stamina += card_parameter.stamina;
        raw_data[card.school_idol_no].Technique += card_parameter.technique;
    }

    returns.push("<卡片基本信息>");
    returns.push(`昵称\t颜色\tID\t数据库ID\t稀有度\t人物\t途径\t日期\t活动\ttype\t破数\t`);
    for(let card of cards){
        returns.push(`？？${aslib.memid_to_onename[card.member_m_id]}\t${aslib.attribute_to_onename[card.card_attribute]}\t${card.school_idol_no}\t${card.id}\t${aslib.rarity_to_onename[card.card_rarity_type]}\t${aslib.memid_to_shortname[card.member_m_id]}\t\t\t\t${aslib.type_to_lowername[card.role]}\t${5}\t`);
    }

    returns.push("<被动个性1强度><被动个性2强度>");
    returns.push(`类型\t范围\t...\t类型\t范围\t`);
    for(let card of cards){
        const card_passive_skill_original = await masterdata.ALL(`select skill_level,passive_skill_master_id from m_card_passive_skill_original where card_master_id = ${card.id} and position = 1`);

        let actions = [];
        for(let psk of card_passive_skill_original){
            let p = new Promise(async res=>{
                psk.skill_master_id = (await masterdata.ALL(`select skill_master_id from m_passive_skill where id = ${psk.passive_skill_master_id}`))[0].skill_master_id;
                psk.skill = (await masterdata.ALL(`select skill_target_master_id1, skill_target_master_id2,skill_effect_master_id1,skill_effect_master_id2 from m_skill where id = ${psk.skill_master_id}`))[0];
                psk.skill_effect1 = (await masterdata.ALL(`select effect_type,effect_value from m_skill_effect where id = ${psk.skill.skill_effect_master_id1}`))[0];
                if(psk.skill.skill_effect_master_id2)psk.skill_effect2 = (await masterdata.ALL(`select effect_type,effect_value from m_skill_effect where id = ${psk.skill.skill_effect_master_id2}`))[0];
                res(null);
            });
            actions.push(p);
        }

        await Promise.all(actions);
        //returns.push(card_passive_skill_original);
        if(card_passive_skill_original[0].skill_effect2)returns.push(`${pasv_sk_name[card_passive_skill_original[0].skill_effect1.effect_type]}\t${tar_name[card_passive_skill_original[0].skill.skill_target_master_id1]}\t\t${pasv_sk_name[card_passive_skill_original[0].skill_effect2.effect_type]}\t${tar_name[card_passive_skill_original[0].skill.skill_target_master_id2]}\t`);
        else returns.push(`${pasv_sk_name[card_passive_skill_original[0].skill_effect1.effect_type]}\t${tar_name[card_passive_skill_original[0].skill.skill_target_master_id1]}\t\t${"无"}\t${" "}\t`);
        
        for(let psk of card_passive_skill_original){
            raw_data[card.school_idol_no].Passive_effect1.push(psk.skill_effect1.effect_value);
            if(psk.skill.skill_effect_master_id2)raw_data[card.school_idol_no].Passive_effect2.push(psk.skill_effect2.effect_value);
        }
    }

    returns.push("<主动个性1强度>");
    returns.push("条件\t概率\t效果\t对象\t效果量\t键数\t次数\t");
    for(let card of cards){
        const card_passive_skill_original = await masterdata.ALL(`select skill_level,passive_skill_master_id from m_card_passive_skill_original where card_master_id = ${card.id} and position = 2`);

        let actions = [];
        for(let psk of card_passive_skill_original){
            let p = new Promise(async res=>{
                psk.skill_master_id = (await masterdata.ALL(`select skill_master_id from m_passive_skill where id = ${psk.passive_skill_master_id}`))[0].skill_master_id;
                psk.skill_trigger = (await masterdata.ALL(`select trigger_type,trigger_probability,skill_condition_master_id1,skill_condition_master_id2 from m_passive_skill where id = ${psk.passive_skill_master_id}`))[0];
                psk.skill = (await masterdata.ALL(`select skill_target_master_id1,skill_target_master_id2,skill_effect_master_id1,skill_effect_master_id2 from m_skill where id = ${psk.skill_master_id}`))[0];
                psk.skill_effect1 = (await masterdata.ALL(`select effect_type,effect_value,finish_type,finish_value from m_skill_effect where id = ${psk.skill.skill_effect_master_id1}`))[0];
                if(psk.skill.skill_effect_master_id2)psk.skill_effect2 = (await masterdata.ALL(`select effect_type,effect_value,finish_type,finish_value from m_skill_effect where id = ${psk.skill.skill_effect_master_id2}`))[0];
                res(null);
            });
            actions.push(p);
        }

        await Promise.all(actions);
        //returns.push(card_passive_skill_original)
        let result = trig_name[card_passive_skill_original[0].skill_trigger.trigger_type];
        result += '\t';
        result += `${card_passive_skill_original[0].skill_trigger.trigger_probability/100}%\t`;
        result += effect_name[card_passive_skill_original[0].skill_effect1.effect_type];
        //result += '\t';
        result += tar_name[card_passive_skill_original[0].skill.skill_target_master_id1] ? ('\t'+tar_name[card_passive_skill_original[0].skill.skill_target_master_id1]) : "";
        result += '\t';
        result += card_passive_skill_original[0].skill_effect1.effect_value;
        result += '\t';
        result += 键数(card_passive_skill_original[0].skill_effect1) || ' ';
        result += '\t';
        result += 次数(card_passive_skill_original[0].skill_trigger) || ' ';
        result += '\t';
        returns.push(result);
    }

    returns.push("<技能1强度><技能2强度>");
    returns.push("类型\t对象\t效果类\t键数\t...\t类型\t对象\t效果类\t键数\t");
    for(let card of cards){
        const card_active_skill = await masterdata.ALL(`select active_skill_master_id from m_card_active_skill where card_master_id = ${card.id}`);

        
        let actions = [];
        for(let ask of card_active_skill){
            let p = new Promise(async res=>{
                ask.skill_master_id = (await masterdata.ALL(`select skill_master_id from m_active_skill where id = ${ask.active_skill_master_id}`))[0].skill_master_id;
                ask.skill = (await masterdata.ALL(`select skill_target_master_id1,skill_target_master_id2,skill_effect_master_id1,skill_effect_master_id2 from m_skill where id = ${ask.skill_master_id}`))[0];
                ask.skill_effect1 = (await masterdata.ALL(`select effect_type,effect_value,finish_type,finish_value,calc_type from m_skill_effect where id = ${ask.skill.skill_effect_master_id1}`))[0];
                if(ask.skill.skill_effect_master_id2)psk.skill_effect2 = (await masterdata.ALL(`select effect_type,effect_value,finish_type,finish_value from m_skill_effect where id = ${ask.skill.skill_effect_master_id2}`))[0];
                res(null);
            });
            actions.push(p);
        }

        await Promise.all(actions);
        let 效果类型;

        switch(effect_name[card_active_skill[0].skill_effect1.effect_type].slice(-2)){
            case "ap": case "st": case "te": case "p槽": case "定值": 效果类型=" ";break;
            default: switch(card_active_skill[0].skill_effect1.calc_type){
                case 1: 效果类型 = "数值";break;
                case 2: 效果类型 = "百分比";break;
            }
        }
        let result = effect_name[card_active_skill[0].skill_effect1.effect_type];
        result += 效果类型 === " " ? "\t" : `\t\t${效果类型}`;
        result += "\t";
        result += 键数(card_active_skill[0].skill_effect1) || ' ';
        result += "\t";

        if(card_active_skill[0].skill_effect2){
            switch(effect_name[card_active_skill[0].skill_effect2.effect_type].slice(-2)){
                case "ap": case "st": case "te": case "p槽": case "定值": 效果类型=" ";break;
                default: switch(card_active_skill[0].skill_effect2.calc_type){
                    case 1: 效果类型 = "数值";break;
                    case 2: 效果类型 = "百分比";break;
                }
            }
            result += effect_name[card_active_skill[0].skill_effect2.effect_type];
            result += 效果类型 === " " ? "\t" : `\t\t${效果类型}`;
            result += "\t";
            result += 键数(card_active_skill[0].skill_effect2) || ' ';
            result += "\t";
        }
        else result += "\t无"
        returns.push(result);

        for(let ask of card_active_skill){
            raw_data[card.school_idol_no].Active_effect1.push(ask.skill_effect1.effect_value);
            if(ask.skill.skill_effect_master_id2)raw_data[card.school_idol_no].Active_effect1.push(ask.skill_effect2.effect_value);
        }
    }

    returns.push("<raw data>");
    returns.push("ap\tst\tte\t特技效果量\t个性效果量");
    for(let card of cards){
        const raw_data_single = raw_data[card.school_idol_no];
        let result = `${raw_data_single.Appeal}\t${raw_data_single.Stamina}\t${raw_data_single.Technique}\t`;
        for(let effect of raw_data_single.Active_effect1){
            result += `${effect}/`;
        }
        for(let effect of raw_data_single.Active_effect2){
            result += `${effect}/`;
        }
        result += "\t";
        for(let effect of raw_data_single.Passive_effect1){
            result += `${effect}/`;
        }
        for(let effect of raw_data_single.Passive_effect2){
            result += `${effect}/`;
        }
        returns.push(result);
    }
    return returns;
}};

(async()=>{
    console.log((await module.exports.excelAssist()).join('\n'));
})()