"use strict";
const DIR_SRC_DATABASE_MASTERDATA = "../masterdata.db";

//dependents
const util = require('util');
const fs = require("fs");
const sqlite = require("sqlite3");

//load database before analyzing, block
let masterdata = new sqlite.Database(DIR_SRC_DATABASE_MASTERDATA, (err) => {
    if (err) throw new Error(err);
})
masterdata.EACH = util.promisify(masterdata.each);
masterdata.ALL = util.promisify(masterdata.all);

(async () => {
    const cards = await masterdata.ALL(`select id,role,max_passive_skill_slot,member_m_id,card_attribute from m_card`);
    let actions = [];
    for (let card of cards) {
        actions.push(full_livepower(card));
    }
    const list = await Promise.all(actions).then((cardlist) => {
        cardlist.sort((a, b) => { return b.livepower - a.livepower });
        const range_description = {};
        range_description[3] = {
            3800: "A+",
            3600: "A",
            3400: "A-",
            3200: "B+",
            3000: "B",
            2800: "B-",
            2600: "C+",
            2400: "C",
            2200: "C-",
            2000: "D",
        };
        range_description[2] = {
            2500: "A+",
            2400: "A",
            2300: "A-",
            2200: "B+",
            2100: "B",
            2000: "B-",
            1850: "C+",
            1700: "C",
            1550: "C-",
            1400: "D",
        };
        range_description[1] = {
            1300: "A",
            1200: "B",
            1100: "C",
            1000: "D",
        };
        const range_borders = {};
        for (let rarity of Object.keys(range_description)) {
            range_borders[rarity] = Object.keys(range_description[rarity]).sort((a, b) => -a + b);
        };
        const results = { 1: {}, 2: {}, 3: {} };
        let state = { 1: 0, 2: 0, 3: 0 };
        for (let card of cardlist) {
            const filters = card.filters;
            const rarity = card.id.toString()[5];
            while (range_borders[rarity][state[rarity]] > card.livepower) state[rarity]++;
            const current_range_border = range_borders[rarity][state[rarity]];
            if (!results[rarity][current_range_border]) results[rarity][current_range_border] = [];
            results[rarity][current_range_border].push(`<span class="button-switch-display" data-BSD-Condition="(100${filters[0]}&#124;1050)&(160${filters[6]}&#124;1650)&(170${filters[7]
                }&#124;1750)" data-hover-text="Parameters: ${parseInt(card.detail.parameter)
                }&#10;Active Skill: ${card.detail.skill.active_skill
                }&#10;Ability Passive: ${parseInt(card.detail.skill.passive_skill_passive + card.detail.passive_up)
                }&#10;Ability Active: ${card.detail.skill.passive_skill_active}&#10;">{{CardLevelDescription|${card.id}|${card.livepower}|{{{2|12}}}}}</span>`);
        }
        //return results;

        //text generation
        const wikitable_header = "{{{!}} class=\"wikitable mw-collapsible{{#if:{{{2|}}}| |&#32;hover-swap-image-trigger}}\" \n{{!}}-\n! 档位 !! 列表";
        const wikitable_end = "{{!}}}";
        const wikitable_tables = { 1: null, 2: null, 3: null };
        for (let rarity in results) {
            const range_group = results[rarity];
            const range_border = range_borders[rarity];
            const wikitable_lines = [];

            let open = false;
            for (let iter in range_border) {
                const border = range_border[iter];

                if (range_group[border]) open = true;
                else if (open) range_group[border] = [];
                else continue;

                const wikitable_range = `[${border},${iter === "0" ? "∞" : range_border[iter - 1]})`;
                const wikitable_line = `{{!}}- {{#switch:{{{2}}}|11= class="hover-swap-image-trigger" |12= class="hover-swap-image-trigger" }}\n! ${range_description[rarity][border]}<br>${wikitable_range}<br>${range_group[border].length} \n{{!}} ${range_group[border].join(' ')}`;
                wikitable_lines.push(wikitable_line);
            }
            wikitable_tables[rarity] = wikitable_header + '\n' + wikitable_lines.join('\n') + '\n' + wikitable_end;
        }
        const output = `<includeonly>{{#switch:{{{1}}}
|filter=<div style="display:flex;flex-wrap:wrap;"><div style="flex-grow:1;">
学校
<span class="button-switch-display-activate" data-BSD-Activate="1050" data-BSD-Activated="true" data-BSD-Action="/1000-,1001-,1002-"><ASImg id=7379 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1000" data-BSD-Action="/1050-"><ASImg id=1277 w=72/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1001" data-BSD-Action="/1050-"><ASImg id=2275 w=72/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1002" data-BSD-Action="/1050-"><ASImg id=3976 w=72/></span>
</div>
<div style="flex-grow:1;">
属性
<span class="button-switch-display-activate" data-BSD-Activate="1650" data-BSD-Activated="true" data-BSD-Action="/1601-,1602-,1603-,1604-,1605-,1606-"><ASImg id=7379 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1601" data-BSD-Action="/1650-"><ASImg id=355 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1602" data-BSD-Action="/1650-"><ASImg id=5528 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1603" data-BSD-Action="/1650-"><ASImg id=8513 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1604" data-BSD-Action="/1650-"><ASImg id=234 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1605" data-BSD-Action="/1650-"><ASImg id=5042 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1606" data-BSD-Action="/1650-"><ASImg id=4859 w=32/></span>
</div>
<div style="flex-grow:1;">
类型
<span class="button-switch-display-activate" data-BSD-Activate="1750" data-BSD-Activated="true" data-BSD-Action="/1701-,1702-,1703-,1704-"><ASImg id=7379 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1701" data-BSD-Action="/1750-"><ASImg id=3542 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1702" data-BSD-Action="/1750-"><ASImg id=1376 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1703" data-BSD-Action="/1750-"><ASImg id=7580 w=32/></span>
<span class="button-switch-display-activate" data-BSD-Activate="1704" data-BSD-Action="/1750-"><ASImg id=3897 w=32/></span>
</div>
|R=${wikitable_tables[1]}
|SR=${wikitable_tables[2]}
|UR=${wikitable_tables[3]}
|ERROR!({{{1}}})}}</includeonly><noinclude>
<span style="font-weight:bold;" class="button-switch-display-activate" data-BSD-Activate="30" data-BSD-Action="/20-,10-" data-BSD-Activated="true"><ASImg id=542 w=32/>Ultra Rare</span>
<span style="font-weight:bold;" class="button-switch-display-activate" data-BSD-Activate="20" data-BSD-Action="/30-,10-"><ASImg id=8567 w=32/>Super Rare</span>
<span style="font-weight:bold;" class="button-switch-display-activate" data-BSD-Activate="10" data-BSD-Action="/30-,20-"><ASImg id=1829 w=32/>Rare</span>
<div class="button-switch-display" data-BSD-Condition="10|20|30">{{LevelLivePower|filter}}</div>
<div class="button-switch-display" data-BSD-Condition="30">
<span style="font-weight:bold;">Ultra Rare</span>
{{LevelLivePower|UR|14}}
</div>
<div class="button-switch-display" data-BSD-Condition="20">
<span style="font-weight:bold;">Super Rare</span>
{{LevelLivePower|SR|12}}
</div>
<div class="button-switch-display" data-BSD-Condition="10">
<span style="font-weight:bold;">Rare</span>
{{LevelLivePower|R}}
</div></noinclude>`;
        fs.writeFileSync("Template%COLON%LevelLivePower.txt", output);
    })
    /*
    list.sort((a,b)=>{return b.livepower-a.livepower});
    for(let it of list){
        if(it.id.toString()[5] === '1')console.log(it.id,it.livepower);
    }
    */
})()

const full_livepower = (async ({ id: card_master_id, role: card_type, max_passive_skill_slot: slots, card_attribute, member_m_id }) => {
    const { raw_livepower, passive_skill, detail_livepower } = await getsklp(card_master_id);
    const passive_skill_effect = await getskill(passive_skill[passive_skill.length - 1], 'id');
    let level = 0;
    //LEVEL
    switch (card_master_id.toString()[5]) {
        case '1': level = 52; break;
        case '2': level = 68; break;
        case '3': level = 84; break;
    }
    const [parm_level, parm_awaken, parm_tree] = await Promise.all([
        masterdata.EACH(`select * from m_card_parameter where card_m_id = ${card_master_id} and level = ${level}`),
        masterdata.EACH(`select * from m_card_awaken_parameter where card_master_id = ${card_master_id}`),
        masterdata.ALL(`select * from m_training_tree_card_param where id = ${card_master_id}`)
    ]);
    let appeal = 0, stamina = 0, technique = 0;
    appeal += parm_level.appeal + parm_awaken.parameter2;
    stamina += parm_level.stamina + parm_awaken.parameter1;
    technique += parm_level.technique + parm_awaken.parameter3;

    for (let cell of parm_tree) {
        switch (cell.training_content_type) {
            case 3: appeal += cell.value; break;
            case 2: stamina += cell.value; break;
            case 4: technique += cell.value; break;
        }
    }
    //10 appeal 9 stamina 11 technique
    //BOND BONUS
    appeal = parseInt(appeal * (1 + 0.096 + 0.031));
    stamina = parseInt(stamina * (1 + 0.096 + 0.021));
    technique = parseInt(technique * (1 + 0.096 + 0.021));
    //OTHERS APPEAL
    const others = {
        appeal: 15500,
        stamina: 8500,
        technique: 12500,
        same_attribute: 3,
        same_year: 3,
        same_school: 3,
        same_unit: 1.5,
        same_type: { vo: 6.5, gd: 0.5, sp: 0.5, sk: 0.5 }
    }
    const effect_1 = passive_skill_effect.skill_effect_1;
    let passive_lp = 0;
    let other_base = 0, own_base = 0;
    switch (passive_skill_effect.skill_effect_1.effect_type) {
        case 10: other_base = 0.05 * others.appeal; own_base = 0.05 * appeal; break;
        case 9: other_base = 0.04 * others.stamina; own_base = 0.04 * stamina; break;
        case 11: other_base = 0.04 * others.technique; own_base = 0.04 * technique; break;
    }
    switch (passive_skill_effect.skill.skill_target_master_id1) {
        case 1://All
            passive_lp += 8 * other_base * effect_1.effect_value / 10000;
            passive_lp += 1 * own_base * effect_1.effect_value / 10000;
            break;
        case 50://Group
            passive_lp += 8 * other_base * effect_1.effect_value / 10000;
            break;
        case 53://Same Strategy
            passive_lp += 2 * other_base * effect_1.effect_value / 10000;
            passive_lp += 1 * own_base * effect_1.effect_value / 10000;
            break;
        case 54://Same School
            passive_lp += others.same_school * other_base * effect_1.effect_value / 10000;
            passive_lp += 1 * own_base * effect_1.effect_value / 10000;
            break;
        case 55://Same Unit
            passive_lp += others.same_unit * other_base * effect_1.effect_value / 10000;
            passive_lp += 1 * own_base * effect_1.effect_value / 10000;
            break;
        case 56://Same Attribute
            passive_lp += others.same_attribute * other_base * effect_1.effect_value / 10000;
            passive_lp += 1 * own_base * effect_1.effect_value / 10000;
            break;
        case 57://Same Type
            switch (card_type) {
                case 1: passive_lp += others.same_type.vo * other_base * effect_1.effect_value / 10000; break;
                case 2: passive_lp += others.same_type.sp * other_base * effect_1.effect_value / 10000; break;
                case 3: passive_lp += others.same_type.gd * other_base * effect_1.effect_value / 10000; break;
                case 4: passive_lp += others.same_type.sk * other_base * effect_1.effect_value / 10000; break;
            }
            passive_lp += 1 * own_base * effect_1.effect_value / 10000;
            break;
        case 59://Self
            passive_lp += 1 * own_base * effect_1.effect_value / 10000;
            break;
        case 60://Same Year
            passive_lp += 1 * own_base * effect_1.effect_value / 10000;
            passive_lp += others.same_year * other_base * effect_1.effect_value / 10000;
            break;
    }
    const effect_2 = passive_skill_effect.skill_effect_2;
    if (effect_2) {
        switch (passive_skill_effect.skill_effect_2.effect_type) {
            case 10: other_base = 0.05 * others.appeal; own_base = 0.05 * appeal; break;
            case 9: other_base = 0.04 * others.stamina; own_base = 0.04 * stamina; break;
            case 11: other_base = 0.04 * others.technique; own_base = 0.04 * technique; break;
        }
        switch (passive_skill_effect.skill.skill_target_master_id2) {
            case 1://All
                passive_lp += 8 * other_base * effect_2.effect_value / 10000;
                passive_lp += 1 * own_base * effect_2.effect_value / 10000;
                break;
            case 50://Group
                passive_lp += 8 * other_base * effect_2.effect_value / 10000;
                break;
            case 53://Same Strategy
                passive_lp += 2 * other_base * effect_2.effect_value / 10000;
                passive_lp += 1 * own_base * effect_2.effect_value / 10000;
                break;
            case 54://Same School
                passive_lp += others.same_school * other_base * effect_2.effect_value / 10000;
                passive_lp += 1 * own_base * effect_2.effect_value / 10000;
                break;
            case 55://Same Unit
                passive_lp += others.same_unit * other_base * effect_2.effect_value / 10000;
                passive_lp += 1 * own_base * effect_2.effect_value / 10000;
                break;
            case 56://Same Attribute
                passive_lp += others.same_attribute * other_base * effect_2.effect_value / 10000;
                passive_lp += 1 * own_base * effect_2.effect_value / 10000;
                break;
            case 57://Same Type
                switch (card_type) {
                    case 1: passive_lp += others.same_type.vo * other_base * effect_2.effect_value / 10000; break;
                    case 2: passive_lp += others.same_type.sp * other_base * effect_2.effect_value / 10000; break;
                    case 3: passive_lp += others.same_type.gd * other_base * effect_2.effect_value / 10000; break;
                    case 4: passive_lp += others.same_type.sk * other_base * effect_2.effect_value / 10000; break;
                }
                passive_lp += 1 * own_base * effect_2.effect_value / 10000;
                break;
            case 59://Self
                passive_lp += 1 * own_base * effect_2.effect_value / 10000;
                break;
            case 60://Same Year
                passive_lp += 1 * own_base * effect_2.effect_value / 10000;
                passive_lp += others.same_year * other_base * effect_2.effect_value / 10000;
                break;
        }
    }
    //Inspriation
    other_base = 0.05 * others.appeal; own_base = 0.05 * appeal;
    const inspire_lp = slots * (8 * other_base * 0.02 + 13);
    //console.log(inspire_lp)

    //console.log(appeal,stamina,technique,passive_lp,parseInt(appeal*0.05+stamina*0.04+technique*0.04+passive_lp));
    return {
        id: card_master_id,
        livepower: parseInt(inspire_lp + appeal * 0.05 * 2.05 + stamina * 0.04 * 1.05 + technique * 0.04 * 1.1 + passive_lp + raw_livepower),
        detail: { parameter: appeal * 0.05 + stamina * 0.04 + technique * 0.04, passive_up: passive_lp, skill: detail_livepower, inspire: inspire_lp },
        filters: [Math.floor(member_m_id / 100), 1, 2, 3, 4, 5, card_attribute, card_type],
    };
})

async function getsklp(card_master_id) {
    const results = await Promise.all([
        masterdata.ALL(`select * from m_card_active_skill where card_master_id=${card_master_id}`),
        masterdata.ALL(`select * from m_card_passive_skill_original where card_master_id=${card_master_id} and position=1`),
        masterdata.ALL(`select * from m_card_passive_skill_original where card_master_id=${card_master_id} and position=2`)
    ]);
    let a = [], p1 = [], p2 = [];
    for (let al of results[0]) {
        a.push(masterdata.EACH(`select * from m_active_skill where id=${al.active_skill_master_id}`));
    }
    for (let pl of results[1]) {
        p1.push(masterdata.EACH(`select * from m_passive_skill where id=${pl.passive_skill_master_id}`));
    }
    for (let pl2 of results[2]) {
        p2.push(masterdata.EACH(`select * from m_passive_skill where id=${pl2.passive_skill_master_id}`));
    }
    const results_1 = await Promise.all([Promise.all(a), Promise.all(p1), Promise.all(p2)]);
    let a_1 = [], p1_1 = [], p2_1 = [];
    for (let al_1 of results_1[0]) {
        a_1.push(masterdata.EACH(`select * from m_skill where id=${al_1.skill_master_id}`));
    }
    for (let pl_1 of results_1[1]) {
        p1_1.push(masterdata.EACH(`select * from m_skill where id=${pl_1.skill_master_id}`));
    }
    for (let pl2_1 of results_1[2]) {
        p2_1.push(masterdata.EACH(`select * from m_skill where id=${pl2_1.skill_master_id}`));
    }
    const results_2 = await Promise.all([Promise.all(a_1), Promise.all(p1_1), Promise.all(p2_1)]);

    const alm = results_2[0].length, plm1 = results_2[1].length, plm2 = results_2[2].length;
    /*
    for(let al of results[0]){
        console.log('appeal skill live power',al.evaluation_param)
    }
    for(let pl of results[1]){
        console.log('passive ability live power',pl.evaluation_param)
    }
    for(let pl2 of results[2]){
        console.log('active ability live power',pl2.evaluation_param)
    }
    */
    //console.log(results_2);
    return {
        raw_livepower: results_2[0][alm - 1].evaluation_param + results_2[1][plm1 - 1].evaluation_param + (results_2[2][0] ? results_2[2][plm2 - 1].evaluation_param : 0),
        passive_skill: results_2[1],
        detail_livepower: {
            active_skill: results_2[0][alm - 1].evaluation_param,
            passive_skill_passive: results_2[1][plm1 - 1].evaluation_param,
            passive_skill_active: (results_2[2][0] ? results_2[2][plm2 - 1].evaluation_param : 0),
        }
    }
}
async function getskill(obj, skill_id_key) {
    const skill = await new Promise((res, rej) => {
        masterdata.all(`select * from m_skill where id = ${obj[skill_id_key]}`, (err, sks) => {
            if (err)
                throw new Error(err);
            if (sks[0] === undefined)
                rej(`ERROR:\tskill_id:${obj[skill_id_key]}\tNo match in m_skill`);
            res(sks[0]);
        });
    });
    const results = await Promise.all([new Promise(res_1 => {
        res_1(skill);
    }), new Promise((res_2, rej_1) => {
        masterdata.all(`select * from m_skill_effect where id = ${skill.skill_effect_master_id1}`, (err_1, skes) => {
            if (err_1)
                throw new Error(err_1);
            if (skes[0] === undefined)
                rej_1(`ERROR:\tskill_effect_id:${skill.skill_effect_master_id1}\tNo match in m_skill_effect`);
            res_2(skes[0]);
        });
    }), new Promise((res_3, rej_2) => {
        if (skill.skill_effect_master_id2 === null)
            res_3(null);
        masterdata.all(`select * from m_skill_effect where id = ${skill.skill_effect_master_id2}`, (err_2, skes_1) => {
            if (err_2)
                throw new Error(err_2);
            if (skes_1[0] === undefined)
                rej_2(`ERROR:\tskill_effect_id:${skill.skill_effect_master_id2}\tNo match in m_skill_effect`);
            res_3(skes_1[0]);
        });
    })]);
    return await new Promise(res_4 => {
        res_4({ 'skill': results[0], 'skill_effect_1': results[1], 'skill_effect_2': results[2] });
    });
}
