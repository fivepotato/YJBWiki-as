"use strict";
const DIR_SRC_DATABASE_MASTERDATA = "../masterdata.db";
const DIR_SRC_DATABASE_DICTIONARY_JA_K = "../dictionary_ja_k.db";
const DIR_OUT_GIMMICK = "./gimmicks.txt";
const DIR_OUT_UNRELEASED_LIVES = "./unreleased_lives.txt";

//dependents
const fs = require("fs");
const sqlite = require("sqlite3");

class Masterdata extends sqlite.Database {
    constructor(path, callback) {
        super(path, callback);
    }
    All(sql) {
        return new Promise((resolve) => {
            this.all(sql, (err, rows) => {
                if (err) throw err;
                resolve(rows);
            })
        })
    }
    async fetch_skill(skill_master_id) {
        const [skill] = (await this.All(`select * from m_skill where id = ${skill_master_id}`));
        const [skill_effect_1] = (await this.All(`select * from m_skill_effect where id = ${skill.skill_effect_master_id1}`));
        const [skill_target_1] = (await this.All(`select * from m_skill_target where id = ${skill.skill_target_master_id1}`));

        if (!skill.skill_effect_master_id2) return {
            skill,
            skill_effect_1, skill_target_1,
            skill_effect_2: null, skill_target_2: null,
        };

        const [skill_effect_2] = (await this.All(`select * from m_skill_effect where id = ${skill.skill_effect_master_id2}`));
        const [skill_target_2] = (await this.All(`select * from m_skill_target where id = ${skill.skill_target_master_id2}`));

        return {
            skill,
            skill_effect_1, skill_target_1,
            skill_effect_2, skill_target_2,
        };
    };
}
class Dictionary extends sqlite.Database {
    constructor(path, callback) {
        super(path, callback);
    }
    All(sql) {
        return new Promise((resolve) => {
            this.all(sql, (err, rows) => {
                if (err) throw err;
                resolve(rows);
            })
        })
    }
    async get(key) {
        if (!key) return null;
        const [{ message }] = (await this.All(`select message from m_dictionary where id = "${key.slice(2)}"`));
        return message.split('\n').join('<br>');
    }
}

const masterdata = new Masterdata(DIR_SRC_DATABASE_MASTERDATA, (err) => {
    if (err) throw err;
});
const dictionary_ja_k = new Dictionary(DIR_SRC_DATABASE_DICTIONARY_JA_K, (err) => {
    if (err) throw err;
});

(async function () {
    const skills = await masterdata.All('select * from m_skill where id > 40000000 and id < 70000000 or id > 400000000 order by id');
    const skill_texts = await Promise.all(skills.map(async ({ id: skill_master_id }) => {
        const texts = []
        const { skill_effect_1, skill_target_1/*, skill_effect_2, skill_target_2*/ } = await masterdata.fetch_skill(skill_master_id);
        const { effect_type, effect_value, calc_type, finish_type, finish_value } = skill_effect_1;
        texts[0] = skill_master_id.toString();
        texts[1] = `{{SkillEffectDescription|${effect_type}|${effect_value}|${calc_type}|${finish_type}|${finish_value}}}`
        texts[2] = skill_target_1.id === 58 ? null : `对象：{{SkillTargetDescription|${skill_target_1.id}}}`;
        //find reference
        if (skill_master_id > 50000000 && skill_master_id < 60000000) {
            const gimmicks_live = await masterdata.All(`select distinct live_difficulty_master_id from m_live_difficulty_gimmick where skill_master_id = ${skill_master_id} and live_difficulty_master_id < 40000000 order by live_difficulty_master_id`);
            const gimmicks_note = await masterdata.All(`select distinct live_difficulty_id from m_live_difficulty_note_gimmick where skill_master_id = ${skill_master_id} and live_difficulty_id < 40000000 order by live_difficulty_id`);
            const gimmicks_wave = await masterdata.All(`select distinct live_difficulty_id from m_live_note_wave_gimmick_group where skill_id = ${skill_master_id} and live_difficulty_id < 40000000 order by live_difficulty_id`);
            texts[3] = gimmicks_live.length ? "Gimmick_Live: " + gimmicks_live.map(({ live_difficulty_master_id }) => live_difficulty_master_id).join(', ') : null;
            texts[4] = gimmicks_note.length ? "Gimmick_Note: " + gimmicks_note.map(({ live_difficulty_id }) => live_difficulty_id).join(', ') : null;
            texts[5] = gimmicks_wave.length ? "Gimmick_Wave: " + gimmicks_wave.map(({ live_difficulty_id }) => live_difficulty_id).join(', ') : null;
            if (!(texts[3] || texts[4] || texts[5])) texts[3] = `<span style=\"color:#F00;font-weight:bold;\"\>未出现\<\/span\>`;
        }
        return texts.filter((text) => text).join("<br>");
    }));

    const filestream_gimmick = fs.createWriteStream(DIR_OUT_GIMMICK);
    skill_texts.forEach((text) => {
        filestream_gimmick.write(text, 'utf-8');
        filestream_gimmick.write("\n\n", 'utf-8');
    })
    filestream_gimmick.end();
    console.log("gimmicks generation succeeded");
})();

//UNRELEASED_LIVES (complete(?))
const config_disabled_charts = { "12031": true, "12032": true, "12033": true, "21012": true, "41072": true, "42030": true };
(async function () {
    const difficulty_consts = await masterdata.All("select * from m_live_difficulty_const where id > 10000000 and id < 58000000");
    const g = [1, 2, 3].filter(async (num) => {
        return num === 1;
    })
    const unreleased_lives = (await Promise.all(difficulty_consts.map(async ({ id: difficulty_const_id, note_stamina_reduce, note_voltage_upper_limit }) => {
        const [live_difficulty] = await masterdata.All(`select live_difficulty_id from m_live_difficulty where difficulty_const_master_id = ${difficulty_const_id}`);
        if (live_difficulty) return null;
        //Story Lives
        if (difficulty_const_id.toString().slice(0, 2) === "33") {
            const story_id = parseInt(difficulty_const_id.toString().slice(-4)), story_difficulty = difficulty_const_id.toString()[2] === "1" ? 2 : 3;
            const id = 37000000 + 1000 * story_id + 100 * story_difficulty,
                id_str = (Math.floor((id % 10000000) / 1000) + 10000).toString().slice(1);
            return { id, id_str, song_name: "", note_stamina_reduce, note_voltage_upper_limit, difficulty_const_id };
        }
        else {
            const id = difficulty_const_id,
                id_str = (Math.floor((difficulty_const_id % 10000000) / 1000) + 10000).toString().slice(1);
            if (config_disabled_charts[id_str]) return null;
            const song_name = await dictionary_ja_k.get(`k.song_name_so${id_str}`);
            return { id, id_str, song_name, note_stamina_reduce, note_voltage_upper_limit, difficulty_const_id };
        }
    }))).filter((v) => v);

    unreleased_lives.sort((a, b) => { return a.id - b.id });
    let i = 0, wikitable_bondboard = "{| class=\"wikitable_bondboard tsticky\"  style=\"text-align:center\" \n|-\n! Song ID || Song name || Difficulty || DMG(E) || DMG(N) || DMG(H) || DMG(Ex) || Score Limit(Ex) || DMG(Mas) || Score Limit(Mas)\n";
    while (unreleased_lives[i] !== undefined) {
        switch (Math.floor(unreleased_lives[i].id / 10000000)) {
            case 1: wikitable_bondboard += "|-\n! colspan=8 | Normal Lives\n"; break;
            case 2: wikitable_bondboard += "|-\n! colspan=8 | Event Lives\n"; break;
            case 4: wikitable_bondboard += "|-\n! colspan=8 | SBL Lives\n"; break;
            case 5: wikitable_bondboard += "|-\n! colspan=8 | DLP Lives\n"; break;

            case 3: wikitable_bondboard += "|-\n! colspan=8 | Story Lives\n"; break;
            default: console.error(`unexpected chart ${unreleased_lives[i].id}, please check manually.`, unreleased_lives[i]);
        }
        let live_type = "", dmg1 = "", dmg2 = "", dmg3 = "", dmg4 = "", dmg5 = "", limit4 = "", limit5 = "";
        while (true) {
            let j = i;
            let song_name = unreleased_lives[j].song_name;

            //append while live id maintains no change
            switch (Math.floor(unreleased_lives[j].id / 100) % 10) {
                case 1:
                    live_type += "E";
                    //damage shouldn't be 1
                    if (unreleased_lives[j].note_stamina_reduce !== 1) dmg1 += (dmg1 === "") ? unreleased_lives[j].note_stamina_reduce.toString() : `<br>${unreleased_lives[j].note_stamina_reduce}`;
                    break;
                case 2:
                    live_type += "N";
                    if (unreleased_lives[j].note_stamina_reduce !== 1) dmg2 += (dmg2 === "") ? unreleased_lives[j].note_stamina_reduce.toString() : `<br>${unreleased_lives[j].note_stamina_reduce}`;
                    break;
                case 3:
                    live_type += "H";
                    if (unreleased_lives[j].note_stamina_reduce !== 1) dmg3 += (dmg3 === "") ? unreleased_lives[j].note_stamina_reduce.toString() : `<br>${unreleased_lives[j].note_stamina_reduce}`;
                    break;
                case 4:
                    live_type += "Ex";
                    if (unreleased_lives[j].note_stamina_reduce !== 1) dmg4 += (dmg4 === "") ? unreleased_lives[j].note_stamina_reduce.toString() : `<br>${unreleased_lives[j].note_stamina_reduce}`;
                    limit4 = unreleased_lives[j].note_voltage_upper_limit;
                    break;
                case 5:
                    live_type += "Mas";
                    if (unreleased_lives[j].note_stamina_reduce !== 1) dmg5 += (dmg5 === "") ? unreleased_lives[j].note_stamina_reduce.toString() : `<br>${unreleased_lives[j].note_stamina_reduce}`;
                    limit5 = unreleased_lives[j].note_voltage_upper_limit;
                    break;
            }
            //live id is going to change
            if (unreleased_lives[i + 1] === undefined || unreleased_lives[i + 1] !== undefined && unreleased_lives[j].id_str !== unreleased_lives[i + 1].id_str) {
                //note voltage upper limit depends on its last difficulty const
                let wikirow = `|-\n| ${unreleased_lives[j].id_str} || ${song_name} || ${live_type} || ${dmg1} || ${dmg2} || ${dmg3} || ${dmg4} || ${limit4} || ${dmg5} || ${limit5}\n`;
                live_type = "", dmg1 = "", dmg2 = "", dmg3 = "", dmg4 = "", dmg5 = "", limit4 = "", limit5 = "";
                wikitable_bondboard += wikirow;
            }
            i++;
            if (unreleased_lives[i] === undefined || unreleased_lives[i] !== undefined && Math.floor(unreleased_lives[j].id / 10000000) !== Math.floor(unreleased_lives[i].id / 10000000)) break;
        }
    }
    wikitable_bondboard += "|}";

    const filestream_unreleased = fs.createWriteStream(DIR_OUT_UNRELEASED_LIVES);
    filestream_unreleased.write(wikitable_bondboard, 'utf-8');
    filestream_unreleased.close();
    console.log("unreleased lives generation succeeded");
})();
