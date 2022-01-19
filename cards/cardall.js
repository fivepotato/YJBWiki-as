const sqlite = require('sqlite3');
const util = require('util');
const fs = require('fs');
const format = require('string-format');
const crypt = require("crypto");
const masterdata = new sqlite.Database('../masterdata.db', (err) => {
    if (err) console.error(err);
});
const dictionary_ja_k = new sqlite.Database('../dictionary_ja_k.db', (err) => {
    if (err) console.error(err);
})
masterdata.ALL = util.promisify(masterdata.all);
dictionary_ja_k.GET = util.promisify(dictionary_ja_k.each);
const PATH_TEMPLATE_0 = './formats/卡片数据.txt';
const PATH_OUT = './卡片数据.txt';
const DIR_FORMAT = './formats/';
const PATH_RELEASE_DATE = './notice_card.json';
const PATH_TEMPLATE_1 = './formats/出卡循环.txt';
const PATH_OUT_1 = './出卡循环.txt';

function base95(str) {
    let integer = 0;
    for (let digit of str) {
        integer = integer * 95 + digit.codePointAt(0) - 32;
    }
    return integer;
}
async function getdic(key, is_filename) {
    key = key.slice(2);
    return new Promise(resolve => {
        dictionary_ja_k.all(`select message from m_dictionary where id = '${key}'`, (err, row) => {
            if (err) {
                resolve(undefined);
                console.error(err);
            }
            if (row[0] === undefined) {
                console.error(`[function getdic]k.key:${key} NOT FOUND, please check your dictionary_ja_k.db is up to date.`);
                resolve('[function getdic]KEY NOT FOUND');
            }
            else {
                if (row[0].message.indexOf('\n') !== -1) row[0].message = row[0].message.split('\n').join();
                if (is_filename) {
                    row[0].message = row[0].message.split('\\').join('%5C').split('/').join('%2F').split(':').join('%3A').split('*').join('%2A').split('?').join('%3F').split('"').join('%22').split('<').join('%3C').split('>').join('%3E').split('|').join('%7C');
                    row[0].message = row[0].message.split('&amp;').join('&').split('&apos;').join('\'');
                } else {
                    row[0].message = row[0].message.split('!!').join('&#33;&#33;');
                }
                resolve(row[0].message);
            }
        });
    })
}
//get all skill data from m_skill->m_skill_effect
async function getskill(obj, skill_id_key) {
    return new Promise((res, rej) => {
        masterdata.all(`select * from m_skill where id = ${obj[skill_id_key]}`, (err, sks) => {
            if (err) console.error(err);
            if (sks[0] === undefined) rej(`ERROR:\tskill_id:${obj[skill_id_key]}\tNo match in m_skill`);
            res(sks[0]);
        })
    }).then((skill) => {
        return Promise.all([new Promise(res => {
            res(skill);
        }), new Promise((res, rej) => {
            masterdata.all(`select * from m_skill_effect where id = ${skill.skill_effect_master_id1}`, (err, skes) => {
                if (err) console.error(err);
                if (skes[0] === undefined) rej(`ERROR:\tskill_effect_id:${skill.skill_effect_master_id1}\tNo match in m_skill_effect`);
                res(skes[0]);
            })
        }), new Promise((res, rej) => {
            if (skill.skill_effect_master_id2 === null) res(null);
            masterdata.all(`select * from m_skill_effect where id = ${skill.skill_effect_master_id2}`, (err, skes) => {
                if (err) console.error(err);
                if (skes[0] === undefined) rej(`ERROR:\tskill_effect_id:${skill.skill_effect_master_id2}\tNo match in m_skill_effect`);
                res(skes[0]);
            })
        })])
    }).then(results => {
        return new Promise(res => {
            res({ 'skill': results[0], 'skill_effect_1': results[1], 'skill_effect_2': results[2] });
        })
    })
}
//default UTC+9
function dateymdstr(ts, offset) {
    if (!offset) offset = 9;
    const date = new Date(ts + offset * 3600 * 1000).toUTCString().split(' ');
    return `${date[3]}年${{ 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12 }[date[2]]}月${parseInt(date[1]).toString()}日`;
}


const MEMBER_NAMES_CN = { 1: '高坂穗乃果', 3: '南小鸟', 2: '绚濑绘里', 4: '园田海未', 5: '星空凛', 6: '西木野真姬', 7: '东条希', 8: '小泉花阳', 9: '矢泽妮可', 101: '高海千歌', 103: '松浦果南', 102: '樱内梨子', 104: '黑泽黛雅', 105: '渡边曜', 106: '津岛善子', 107: '国木田花丸', 108: '小原鞠莉', 109: '黑泽露比', 201: '上原步梦', 202: '中须霞', 203: '樱坂雫', 204: '朝香果林', 205: '宫下爱', 206: '近江彼方', 207: '优木雪菜', 208: '艾玛·维尔德', 209: '天王寺璃奈', 210: '三船栞子', 212: '钟岚珠', 211: '米娅·泰勒' };
const RELEASE_DATE = JSON.parse(fs.readFileSync(PATH_RELEASE_DATE));

new Promise(async (resolve, reject) => {
    let actions = new Array();
    const M_CARD = await masterdata.ALL('select id,member_m_id,school_idol_no,card_rarity_type,card_attribute,role,member_card_thumbnail_asset_path,training_tree_m_id,sp_point,passive_skill_slot,max_passive_skill_slot from m_card');
    for (let card of M_CARD) {
        let level = ((rarity) => { switch (rarity) { case 10: return 40; case 20: return 60; case 30: return 80; default: console.error(`unexpected rarity type ${rarity}`) } })(card.card_rarity_type);
        const card_process = Promise.all([
            //0
            masterdata.ALL(`select appearance_type,card_name from m_card_appearance where card_m_id = ${card.id} order by appearance_type`),
            //1
            masterdata.ALL(`select appeal,stamina,technique from m_card_parameter where card_m_id = ${card.id} and level = ${level}`),
            //2
            masterdata.ALL(`select parameter1,parameter2,parameter3 from m_card_awaken_parameter where card_master_id = ${card.id}`),
            //3
            masterdata.ALL(`select training_tree_card_param_m_id,training_tree_card_passive_skill_increase_m_id from m_training_tree where id = ${card.training_tree_m_id}`).then((tree) => {
                return masterdata.ALL(`select training_content_type,value from m_training_tree_card_param where id = ${tree[0].training_tree_card_param_m_id}`);
            }),
            //4
            //this will get 5 rows(lv.1/2/3/4/5)
            masterdata.ALL(`select skill_level,active_skill_master_id from m_card_active_skill where card_master_id = ${card.id}`).then((card_active_skills) => {
                let actions = new Array();
                for (let a of card_active_skills) {
                    actions.push(masterdata.ALL(`select thumbnail_asset_path from m_active_skill where id = ${a.active_skill_master_id}`));
                }
                return Promise.all(actions);
            }),
            //5
            masterdata.ALL(`select skill_level,passive_skill_master_id from m_card_passive_skill_original where card_master_id = ${card.id} and position = 1`).then((card_passive_skills_1) => {
                let actions = new Array();
                for (let p of card_passive_skills_1) {
                    actions.push(masterdata.ALL(`select thumbnail_asset_path from m_passive_skill where id = ${p.passive_skill_master_id}`));
                }
                return Promise.all(actions);
            }),
            //6
            masterdata.ALL(`select skill_level,passive_skill_master_id from m_card_passive_skill_original where card_master_id = ${card.id} and position = 2`).then((card_passive_skills_2) => {
                let actions = new Array();
                for (let p of card_passive_skills_2) {
                    actions.push(masterdata.ALL(`select thumbnail_asset_path from m_passive_skill where id = ${p.passive_skill_master_id}`));
                }
                return Promise.all(actions);
            })
        ]).then(async (results) => {
            const card_name_1 = await getdic(results[0][0].card_name);
            const card_name_2 = await getdic(results[0][1].card_name);
            const chara_name = MEMBER_NAMES_CN[card.member_m_id];
            const base_parm = [results[1][0].appeal, results[1][0].stamina, results[1][0].technique];
            const awaken_parm = [results[2][0].parameter2, results[2][0].parameter1, results[2][0].parameter3];
            let training_parm = [0, 0, 0];
            for (let cell of results[3]) {
                switch (cell.training_content_type) {
                    case 2: training_parm[1] += cell.value; break;
                    case 3: training_parm[0] += cell.value; break;
                    case 4: training_parm[2] += cell.value; break;
                    default: console.error('unexpected training_content_type');
                }
            }
            const active_icon = base95(results[4][4][0].thumbnail_asset_path);
            const passive_icon_1 = base95(results[5][results[5].length - 1][0].thumbnail_asset_path);//4 or 6(party)
            const passive_icon_2 = results[6][0] ? base95(results[6][0][0].thumbnail_asset_path) : null;

            const template_string_result = `{{CardDataBasic|${card.school_idol_no}|${card.id}|${card_name_1}|${card_name_2}|${chara_name}|${card.card_attribute}|${card.role}|{0}|${base_parm[0] + training_parm[0] + awaken_parm[0]}|${base_parm[1] + training_parm[1] + awaken_parm[1]}|${base_parm[2] + training_parm[2] + awaken_parm[2]}|${active_icon}|${passive_icon_1}${passive_icon_2 ? `|${passive_icon_2}` : new Array()}}}`;
            const parm_sum_raw = base_parm[0] + training_parm[0] + base_parm[1] + training_parm[1] + base_parm[2] + training_parm[2];
            return new Promise(res => { res({ 'no': card.school_idol_no, 'id': card.id, 'str': template_string_result, 'slots': card.max_passive_skill_slot, 'parm_sum_raw': parm_sum_raw }) });
        });
        actions.push(card_process);
    }
    //gacha event party fes
    Promise.all(actions).then((cards) => {
        let file_out = new String();

        cards.sort((a, b) => { return a.no - b.no });
        //get the last notice date as text
        if (RELEASE_DATE[cards[cards.length - 1].no] === undefined) throw new Error('probably the RELEASE_DATE is not up to date, cannot get the newest update time.');
        const date_string = dateymdstr(RELEASE_DATE[cards[cards.length - 1].no].released);

        let sr_parm_sum = 16000, ur_parm_sum = 26000;
        for (let card of cards) {
            //there are some unexpected aspects that reminding you +1500&+500 is really ugly.
            if (card.id === 424) { sr_parm_sum = 18700; ur_parm_sum = 30500; }
            if (card.id === 434) { sr_parm_sum = 19300; ur_parm_sum = 31500; }
            let gepf;
            //there are some unexpected aspects that reminding you nijigasaki2 is really ugly too.
            if (card.no >= 284 && card.no <= 286 || card.no >= 526 && card.no < 528 || card.no >= 529 && card.no < 531) {
                gepf = '卡池卡';
            } else {
                switch (card.id.toString()[0] + card.id.toString()[5] + card.slots.toString()) {
                    case '112': case '123': case '133': gepf = '初始卡'; break;
                    case '512': gepf = '卡池卡'; break;
                    case '223': case '323': case '423':
                        if (card.parm_sum_raw > sr_parm_sum) {
                            sr_parm_sum = card.parm_sum_raw;
                            gepf = '卡池卡';
                        }
                        else if (sr_parm_sum - card.parm_sum_raw < 307) gepf = '卡池卡';
                        else gepf = '活动卡';
                        break;
                    case '333': case '433':
                        if (card.parm_sum_raw > ur_parm_sum) {
                            ur_parm_sum = card.parm_sum_raw;
                            gepf = '卡池卡';
                        }
                        else if (ur_parm_sum - card.parm_sum_raw < 507) gepf = '卡池卡';
                        else gepf = '活动卡';
                        break;
                    case '234': gepf = 'fes卡'; break;
                    case '334':
                        if (card.parm_sum_raw > ur_parm_sum) ur_parm_sum = card.parm_sum_raw;
                        gepf = 'party卡';
                        break;
                    default:
                }
            }
            file_out += card.str.split('{0}').join(gepf) + '\n';
            //console.log(sr_parm_sum,ur_parm_sum,gepf,card.str);
            card.gepf = gepf;//for next step: card data (character)
        }
        //writefile
        const template = fs.readFileSync(PATH_TEMPLATE_0);
        fs.writeFileSync(PATH_OUT, format(template.toString(), date_string, cards.length, file_out));
        console.log('card data (all) generation completed.');
        resolve(cards);
    })
}).then(async gepf => {
    //出卡循环
    card_rotation(gepf);
    //卡片数据分页面
    for (let chara in MEMBER_NAMES_CN) {
        let cardtexts = new Array();
        let cards = await masterdata.ALL(`select id,school_idol_no,card_rarity_type,card_attribute,role,training_tree_m_id,passive_skill_slot,max_passive_skill_slot from m_card where member_m_id=${chara}`);
        let actions = new Array();
        for (let card of cards) {
            let info = new Object();
            let level = ((rarity) => { switch (rarity) { case 10: return 40; case 20: return 60; case 30: return 80; default: console.error(`unexpected rarity type ${rarity}`) } })(card.card_rarity_type);
            let a = Promise.all([
                masterdata.ALL(`select * from m_card_appearance where card_m_id = ${card.id} order by appearance_type`),
                masterdata.ALL(`select * from m_card_parameter where card_m_id = ${card.id} and (level = 1 or level = ${level}) order by level`),
                masterdata.ALL(`select * from m_card_awaken_parameter where card_master_id = ${card.id}`),
                masterdata.ALL(`select * from m_training_tree where id = ${card.training_tree_m_id}`),
                masterdata.ALL(`select * from m_card_active_skill where card_master_id = ${card.id} order by skill_level`),
                masterdata.ALL(`select * from m_card_passive_skill_original where card_master_id = ${card.id} and position = 1 order by skill_level`),
                masterdata.ALL(`select * from m_card_passive_skill_original where card_master_id = ${card.id} and position = 2 order by skill_level`),
                masterdata.ALL(`select suit_m_id from m_training_tree_card_suit where card_m_id = ${card.id}`),
                masterdata.ALL(`select content_id from m_training_tree_progress_reward where card_master_id = ${card.id} and content_type = 7`)
            ]).then(results => {
                info.appearance = results[0];
                info.parameter = results[1];
                info.awaken_parameter = results[2][0];
                //info.card_active_skill = results[4];
                //info.card_passive_skill_original_1 = results[5];
                //info.card_passive_skill_original_2 = results[6];
                //info.suit_id_1 = results[7][0].suit_m_id;
                //info.suit_id_2 = results[8][0].content_id;
                let actions = new Array();

                let actions_skill = new Array();
                for (let card_active_skill of results[4])
                    actions_skill.push(masterdata.ALL(`select * from m_active_skill where id = ${card_active_skill.active_skill_master_id}`));
                actions.push(Promise.all(actions_skill));

                let actions_ability_1 = new Array();
                for (let card_passive_skill_1 of results[5])
                    actions_ability_1.push(masterdata.ALL(`select * from m_passive_skill where id = ${card_passive_skill_1.passive_skill_master_id}`));
                actions.push(Promise.all(actions_ability_1));

                let actions_ability_2 = new Array();
                for (let card_passive_skill_2 of results[6])
                    actions_ability_2.push(masterdata.ALL(`select * from m_passive_skill where id = ${card_passive_skill_2.passive_skill_master_id}`));
                actions.push(Promise.all(actions_ability_2));

                actions.push(masterdata.ALL(`select * from m_training_tree_mapping where id = ${results[3][0].training_tree_mapping_m_id}`));

                actions.push(masterdata.ALL(`select * from m_training_tree_card_param where id = ${results[3][0].training_tree_card_param_m_id} order by training_content_no`));

                if (results[7][0]) actions.push(masterdata.ALL(`select * from m_suit where id = ${results[7][0].suit_m_id}`));
                if (results[8][0]) actions.push(masterdata.ALL(`select * from m_suit where id = ${results[8][0].content_id}`));

                return Promise.all(actions);
            }).then(results => {
                info.training_tree_card_param = results[1];
                info.active_skill = results[0];
                info.passive_skill_1 = results[1];
                info.passive_skill_2 = results[2];
                info.training_tree_card_param = results[4];
                //this is undefined if no suits
                info.suit_1 = results[5];
                info.suit_2 = results[6];
                let actions = new Array();

                let actions_0 = new Array();
                for (let active_skill of results[0]) actions_0.push(getskill(active_skill[0], 'skill_master_id'));
                actions.push(Promise.all(actions_0));

                let actions_1 = new Array();
                for (let passive_skill_1 of results[1]) actions_1.push(getskill(passive_skill_1[0], 'skill_master_id'));
                actions.push(Promise.all(actions_1));

                let actions_2 = new Array();
                for (let passive_skill_2 of results[2]) actions_2.push(getskill(passive_skill_2[0], 'skill_master_id'));
                actions.push(Promise.all(actions_2));

                actions.push(masterdata.ALL(`select * from m_training_tree_cell_content where id = ${results[3][0].training_tree_cell_content_m_id}`));

                return Promise.all(actions);
            }).then(async results => {
                info.skill_active = results[0];
                info.skill_passive_1 = results[1];
                info.skill_passive_2 = results[2];
                info.training_tree_cell_content = results[3];//.sort((a,b)=>{return a.required_grade-b.required_grade})
                //calculate 0~5 limit increase param
                let tree_param = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
                for (let cell of info.training_tree_cell_content) {
                    switch (cell.training_tree_cell_type) {
                        //1root 2parm 4story 5idolize 9abili 7skill 3voice 8slot 6suit
                        case 2:
                            const cell_param = info.training_tree_card_param[cell.training_content_no - 1];//this may corrupt at any time in the future;
                            switch (cell_param.training_content_type) {
                                case 2: tree_param[cell.required_grade][1] += cell_param.value; break;
                                case 3: tree_param[cell.required_grade][0] += cell_param.value; break;
                                case 4: tree_param[cell.required_grade][2] += cell_param.value; break;
                            }
                            break;
                        case 5:
                            tree_param[cell.required_grade][0] += info.awaken_parameter.parameter2;
                            tree_param[cell.required_grade][1] += info.awaken_parameter.parameter1;
                            tree_param[cell.required_grade][2] += info.awaken_parameter.parameter3;
                            break;
                    }
                }
                tree_param[0][0] += info.parameter[1].appeal;
                tree_param[0][1] += info.parameter[1].stamina;
                tree_param[0][2] += info.parameter[1].technique;
                for (let i = 1; i < tree_param.length; i++) {
                    tree_param[i][0] += tree_param[i - 1][0];
                    tree_param[i][1] += tree_param[i - 1][1];
                    tree_param[i][2] += tree_param[i - 1][2];
                }

                const critical_sense = tree_param[0][2] > tree_param[0][1] && tree_param[0][2] > tree_param[0][0] ? "是" : "否";

                const line1 = `${card.school_idol_no}|${card.id}|${await getdic(info.appearance[0].card_name)}|${await getdic(info.appearance[1].card_name)}`;
                //may corrupt
                const line2 = `${MEMBER_NAMES_CN[chara]}|${card.card_attribute}|${card.role}|${dateymdstr(RELEASE_DATE[card.school_idol_no].released)}作为${gepf[card.school_idol_no - 1].gepf}登场|${base95(info.appearance[0].image_asset_path)}|${base95(info.appearance[1].image_asset_path)}`;
                const line3 = `${info.parameter[0].appeal}|${info.parameter[1].appeal}|${tree_param[0][0]}|${tree_param[1][0]}|${tree_param[2][0]}|${tree_param[3][0]}|${tree_param[4][0]}|${tree_param[5][0]}`;
                const line4 = `${info.parameter[0].stamina}|${info.parameter[1].stamina}|${tree_param[0][1]}|${tree_param[1][1]}|${tree_param[2][1]}|${tree_param[3][1]}|${tree_param[4][1]}|${tree_param[5][1]}`;
                const line5 = `${info.parameter[0].technique}|${info.parameter[1].technique}|${tree_param[0][2]}|${tree_param[1][2]}|${tree_param[2][2]}|${tree_param[3][2]}|${tree_param[4][2]}|${tree_param[5][2]}`;
                const line6 = `${critical_sense}|${card.passive_skill_slot}|${card.max_passive_skill_slot}`;
                //Lv.5
                const line11_1 = `${info.active_skill[4][0].trigger_probability}|${info.skill_active[0].skill.skill_target_master_id1}|${info.skill_active[0].skill_effect_1.effect_type}|${info.skill_active[0].skill_effect_1.effect_value}|${info.skill_active[0].skill_effect_1.calc_type}|${info.skill_active[0].skill_effect_1.finish_type}|${info.skill_active[0].skill_effect_1.finish_value}|${info.skill_active[1].skill_effect_1.effect_value}|${info.skill_active[2].skill_effect_1.effect_value}|${info.skill_active[3].skill_effect_1.effect_value}|${info.skill_active[4].skill_effect_1.effect_value}`;
                const line11_2 = info.skill_active[0].skill_effect_2 ? `|${info.skill_active[0].skill.skill_target_master_id2}|${info.skill_active[0].skill_effect_2.effect_type}|${info.skill_active[0].skill_effect_2.effect_value}|${info.skill_active[0].skill_effect_2.calc_type}|${info.skill_active[0].skill_effect_2.finish_type}|${info.skill_active[0].skill_effect_2.finish_value}|${info.skill_active[1].skill_effect_2.effect_value}|${info.skill_active[2].skill_effect_2.effect_value}|${info.skill_active[3].skill_effect_2.effect_value}|${info.skill_active[4].skill_effect_2.effect_value}` : new String();
                const line11 = `${base95(info.active_skill[4][0].thumbnail_asset_path)}|${await getdic(info.active_skill[4][0].name)}|{{ActiveSkillDescription|${line11_1}${line11_2}}}`;
                //Lv.1
                const line12_1 = `${info.skill_passive_1[0].skill.skill_target_master_id1}|${info.skill_passive_1[0].skill_effect_1.effect_type}|${info.skill_passive_1[0].skill_effect_1.effect_value}|${info.skill_passive_1[0].skill_effect_1.calc_type}|${info.skill_passive_1[1].skill_effect_1.effect_value}|${info.skill_passive_1[2].skill_effect_1.effect_value}|${info.skill_passive_1[3].skill_effect_1.effect_value}|${info.skill_passive_1[4].skill_effect_1.effect_value}`
                const line12_1_p = info.skill_passive_1[5] ? `|${info.skill_passive_1[5].skill_effect_1.effect_value}|${info.skill_passive_1[6].skill_effect_1.effect_value}` : "||";
                let line12_2, line12_2_p = new String();
                if (info.skill_passive_1[0].skill_effect_2) {
                    line12_2 = `|${info.skill_passive_1[0].skill.skill_target_master_id2}|${info.skill_passive_1[0].skill_effect_2.effect_type}|${info.skill_passive_1[0].skill_effect_2.effect_value}|${info.skill_passive_1[0].skill_effect_2.calc_type}|${info.skill_passive_1[1].skill_effect_2.effect_value}|${info.skill_passive_1[2].skill_effect_2.effect_value}|${info.skill_passive_1[3].skill_effect_2.effect_value}|${info.skill_passive_1[4].skill_effect_2.effect_value}`;
                    if (info.skill_passive_1[5]) {
                        line12_2_p = `|${info.skill_passive_1[5].skill_effect_2.effect_value}|${info.skill_passive_1[6].skill_effect_2.effect_value}`;
                    }
                }
                else line12_2 = new String();
                const line12 = `${base95(info.passive_skill_1[0][0].thumbnail_asset_path)}|${await getdic(info.passive_skill_1[0][0].name)}|{{PassiveSkillDescription1|${line12_1}${line12_1_p}${line12_2}${line12_2_p}}}`;
                //Lv.1
                let line13;
                if (!info.passive_skill_2[0]) line13 = "||";
                else {
                    //console.log(info.passive_skill_2);
                    //if skill_condition_master_id2 is null, it will still be 'null'.
                    const line13_1 = `${info.passive_skill_2[0][0].trigger_type}|${info.passive_skill_2[0][0].skill_condition_master_id1}|${info.passive_skill_2[0][0].skill_condition_master_id2}|${info.passive_skill_2[0][0].trigger_probability}|${info.skill_passive_2[0].skill.skill_target_master_id1}|${info.skill_passive_2[0].skill_effect_1.effect_type}|${info.skill_passive_2[0].skill_effect_1.effect_value}|${info.skill_passive_2[0].skill_effect_1.calc_type}|${info.skill_passive_2[0].skill_effect_1.finish_type}|${info.skill_passive_2[0].skill_effect_1.finish_value}`;
                    const line13_2 = info.skill_passive_2[0].skill_effect_2 ? `|${info.skill_passive_2[0].skill.skill_target_master_id2}|${info.skill_passive_2[0].skill_effect_2.effect_type}|${info.skill_passive_2[0].skill_effect_2.effect_value}|${info.skill_passive_2[0].skill_effect_2.calc_type}|${info.skill_passive_2[0].skill_effect_2.finish_type}|${info.skill_passive_2[0].skill_effect_2.finish_value}` : new String();
                    line13 = `${base95(info.passive_skill_2[0][0].thumbnail_asset_path)}|${await getdic(info.passive_skill_2[0][0].name)}|{{PassiveSkillDescription2|${line13_1}${line13_2}}}`;
                }

                //suit
                //info.suit_1 is undefined if no suits
                let line14 = new String();
                if (info.suit_1) {
                    line14 += `${base95(info.suit_1[0].thumbnail_image_asset_path)}|${await getdic(info.suit_1[0].name)}`;
                    if (info.suit_2) {
                        line14 += `|${base95(info.suit_2[0].thumbnail_image_asset_path)}|${await getdic(info.suit_2[0].name)}`;
                    }
                }
                cardtexts.push({ 'no': card.school_idol_no, 'rarity': card.card_rarity_type, 'text': `{{CardDataFull|${line1}|${line2}|${line3}|${line4}|${line5}|${line6}|${line11}|${line12}|${line13}|${line14}}}` });
                //console.log(line11);
                //console.log(info.skill_active);
                //console.log(line11);
                return new Promise(res => { res() });
            });
            actions.push(a);
        }
        //on all card texts get
        Promise.all(actions).then(() => {
            let text_final = new String();
            cardtexts.sort((a, b) => { return a.no - b.no }).sort((a, b) => { return a.rarity - b.rarity });
            let i = 0;
            if (cardtexts[i] && cardtexts[i].rarity === 10) text_final += '\n===R卡===\n';
            while (cardtexts[i] && cardtexts[i].rarity === 10) {
                text_final += cardtexts[i].text + '\n';
                i++;
            }
            if (cardtexts[i] && cardtexts[i].rarity === 20) text_final += '\n===SR卡===\n';
            while (cardtexts[i] && cardtexts[i].rarity === 20) {
                text_final += cardtexts[i].text + '\n';
                i++;
            }
            if (cardtexts[i] && cardtexts[i].rarity === 30) text_final += '\n===UR卡===\n';
            while (cardtexts[i] && cardtexts[i].rarity === 30) {
                text_final += cardtexts[i].text + '\n';
                i++;
            }

            {
                let template;
                try {
                    template = fs.readFileSync(`${DIR_FORMAT}${MEMBER_NAMES_CN[chara]}.txt`).toString();
                } catch (e) {
                    throw new Error(e);
                }
                const text = template.split('{0}').join(text_final);
                try {
                    const text_old = (fs.readFileSync(`./${MEMBER_NAMES_CN[chara]}.txt`)).toString();
                    const hash_old = crypt.createHash('md5'), hash = crypt.createHash('md5');
                    hash_old.update(text_old);
                    hash.update(text);
                    const a = hash_old.digest('hex'), b = hash.digest('hex');
                    if (a !== b) {
                        console.log(MEMBER_NAMES_CN[chara], a, "->", b);
                        throw null;
                    }
                } catch (e) {
                    fs.writeFileSync(`./${MEMBER_NAMES_CN[chara]}.txt`, text);
                }
            }
        })
    }
}, onrej => {
    console.log('the generation of card data (all) crashed, so the generation of (character) will not execute. ERROR:', onrej);
})


//出卡循环
function date6digitstr(ts, offset) {
    if (!offset) offset = 9;
    const date = new Date(ts + offset * 3600 * 1000).toUTCString().split(' ');
    return `${date[3].slice(2, 4)}${{ 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' }[date[2]]}${date[1]}`;
}
//210323: +900/+1500
//210404: +300/+500
const parm_shift = (time, rarity, gepf) => {
    if (time < 210320 || rarity === 3 && gepf === "fes") return 0;
    if (time < 210404) return (rarity * 200 - 100) * 3;
    return (rarity * 200 - 100) * 4;
}
const card_rotation = async (cards/*{no:... id:... parm_sum_raw:... gepf:...} */) => {
    let text_arrays = {}, text_arrays_stat = {};
    for (let key in MEMBER_NAMES_CN) {
        text_arrays[key] = [];
        text_arrays_stat[key] = [];
    }
    for (let card of cards.sort((a, b) => { return a.no - b.no })) {
        const parm_sum = parseInt((card.parm_sum_raw + 6) / 50) * 50;
        let gepf_rotation = new String();

        const rarity = parseInt(card.id.toString()[5]);
        if (rarity > 1) {
            if (rarity === 3) {
                if (RELEASE_DATE[card.no].gepf) {
                    switch (RELEASE_DATE[card.no].gepf) {
                        case 'fes': gepf_rotation = '|fes'; break;
                        case 'pu': gepf_rotation = '|pu'; break;
                        case 'prt': gepf_rotation = '|pu'; break;
                    }
                }
                else switch (card.gepf) {
                    case 'fes卡': gepf_rotation = '|fes'; break;
                }
            }
            switch (card.id) {
                case 402073003: case 302072003: case 402073004: case 202072001:
                    gepf_rotation = '|wtf'; break;
            }
            const time = parseInt(date6digitstr(RELEASE_DATE[card.no].released));
            const obj = { 'time': time, 'rarity': rarity, 'gepf': RELEASE_DATE[card.no].gepf, 'parm_sum': parm_sum, 'text': `{{CardRotationCell|${card.id}|${parm_sum}|${time}${gepf_rotation}}}` };
            text_arrays[parseInt(card.id.toString().slice(2, 5))].unshift(obj);
            text_arrays_stat[parseInt(card.id.toString().slice(2, 5))].unshift(obj);
        }
    }
    //potato
    const time_limits = [190926, 190926, 191115, 191231, 200804, 200804, 200804, 200804, 201125, 201125, 211118, 211118, 211118, 211118, 211118, 211118, 211118, 211118];
    let round_line = new Array();
    for (let round = 0; ; round++) {
        round_line[round] = new String();
        let is_empty = true;
        for (let key in text_arrays) {
            if (text_arrays[key][0] && (!time_limits[round] || text_arrays[key][text_arrays[key].length - 1].time <= time_limits[round])) {
                round_line[round] += text_arrays[key].pop().text;
                is_empty = false;
            }
            else round_line[round] += "{{CardRotationCell}}";
            round_line[round] += ' ';
        }
        if (is_empty) break;
    }
    let final = new String();
    for (let round = 0; round < round_line.length - 1; round++) {
        if (round % 2 === 0) final += `=第${parseInt(round / 2)}周期=`;
        final += '\n';
        final += round_line[round];
        final += '\n\n';
    }
    //stat ？？？
    let round_line_stat = [[], []];
    let parm_base = { 3: { "fes": 28500, "pu": 26000, "gac": 26000, "evt": 21000, }, 2: { "fes": 16000, "pu": 16000, "gac": 16000, "evt": 13000 } };
    for (let round_stat = 0; ; round_stat++) {
        round_line_stat[0][round_stat] = "";
        round_line_stat[1][round_stat] = "";
        let is_empty = true;
        for (let mid in text_arrays_stat) {
            let is_empty_cell = [true, true];
            for (let txt of text_arrays_stat[mid]) {
                //console.log(txt,txt.parm_sum - parm_shift(txt.time,txt.rarity,txt.gepf) - round_stat*(txt.rarity*200-100),(parm_base[txt.rarity][txt.gepf] || 10000*txt.rarity - 4000));
                if (txt.parm_sum - parm_shift(txt.time, txt.rarity, txt.gepf) - round_stat * (txt.rarity * 200 - 100) !== (parm_base[txt.rarity][txt.gepf] || 10000 * txt.rarity - 4000)) continue;
                //if(txt.used)continue;//'used' flag for duplicate parm sums
                //console.log("good")
                if (txt.time === 210326) console.log(txt.parm_sum, parm_shift(txt.time, txt.rarity, txt.gepf), round_stat * (txt.rarity * 200 - 100), parm_base[txt.rarity][txt.gepf], 10000 * txt.rarity - 4000);
                if (is_empty_cell[txt.rarity - 2]) is_empty_cell[txt.rarity - 2] = false;
                else continue;
                //txt.used = true;
                round_line_stat[txt.rarity - 2][round_stat] += txt.text;
                is_empty = false;

            }
            if (is_empty_cell[0]) round_line_stat[0][round_stat] += "{{CardRotationCell}}";
            if (is_empty_cell[1]) round_line_stat[1][round_stat] += "{{CardRotationCell}}";
        }
        if (is_empty) break;
    }
    console.log(round_line_stat[0].join('\n\n\n') + "\n\n\n" + round_line_stat[1].join('\n\n\n'))

    {
        const template = fs.readFileSync(PATH_TEMPLATE_1).toString();
        const text = format(template, final);
        try {
            const text_old = (fs.readFileSync(PATH_OUT_1)).toString();
            const hash_old = crypt.createHash('md5'), hash = crypt.createHash('md5');
            hash_old.update(text_old);
            hash.update(text);
            const a = hash_old.digest('hex'), b = hash.digest('hex');
            if (a !== b) {
                console.log("出卡循环", a, "->", b);
                throw null;
            }
        } catch (e) {
            fs.writeFileSync(PATH_OUT_1, text);
        }
    }
}
