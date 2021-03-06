"use strict";

const fsPromises = require("fs/promises");
const { Database } = require("sqlite3");
const DIR_SRC_CHARTS = "../../sifas_live_stage-main/";
const DATA_CACHE = "./db_cache/";
const { get_music_duration } = require("./audio_download");
const crypt = require("crypto");

const base95: (path: string) => number = (path: string) => (Array.from(path).map((character) => character.codePointAt(0) - 32).reduce((x, y) => x * 95 + y));
type m_live_t = { live_id: number; is_2d_live: number; music_id: number; bgm_path: string; chorus_bgm_path: string; live_member_mapping_id: number; name: string; pronunciation: string | null; member_group: number; member_unit: number | null; original_deck_name: string | null; copyright: string; source: string | null; jacket_asset_path: string; background_asset_path: string; display_order: number; };
enum unlock_patterns {
    permanent = 1,
    from_main_story = 2,
    eliminated = 3,
    from_bond_story = 4,
    SBL = 5, DLP = 6,
    expert_challenge = 7,
    tutorial = 8,
    main_story = 9,
    daily = 10
}
enum difficulty_difficulties { beginner = 10, intermediate = 20, advanced = 30, expert = 35, challenge = 37 }
type m_live_difficulty_t = { live_difficulty_id: number; live_id: number; live_3d_asset_master_id: number | null; live_difficulty_type: difficulty_difficulties; unlock_pattern: unlock_patterns; default_attribute: number; target_voltage: number; note_emit_msec: number; recommended_score: number; recommended_stamina: number; consumed_lp: number; reward_user_exp: number; judge_id: number; note_drop_group_id: number; drop_choose_count: number; rare_drop_rate: number; drop_content_group_id: number; rare_drop_content_group_id: number; additional_drop_max_count: number; additional_drop_content_group_id: number; bottom_technique: number; additional_drop_decay_technique: number; reward_base_love_point: number; evaluation_s_score: number; evaluation_a_score: number; evaluation_b_score: number; evaluation_c_score: number; updated_at: number; lose_at_death: boolean; autoplay_requirement_id: number | null; skip_master_id: number | null; stamina_voltage_group_id: number; combo_voltage_group_id: number; difficulty_const_master_id: number; is_count_target: boolean; insufficient_rate: number; };
type m_live_difficulty_const_t = { id: number; sp_gauge_length: number; sp_gauge_additional_rate: number; sp_gauge_reducing_point: number; sp_skill_voltage_magnification: number; note_stamina_reduce: number; note_voltage_upper_limit: number; collabo_voltage_upper_limit: number; skill_voltage_upper_limit: number; squad_change_voltage_upper_limit: number; };
type m_live_difficulty_gimmick_t = { id: number; live_difficulty_master_id: number; trigger_type: number; condition_master_id1: number; condition_master_id2: number | null; skill_master_id: number; name: string; description: string; };
type m_live_difficulty_note_gimmick_t = { live_difficulty_id: number; note_id: number; note_gimmick_type: number; note_gimmick_icon_type: number; skill_master_id: number; name: string; description: string; };
type m_live_difficulty_note_gimmick_ext = { id: number; live_difficulty_id: number; note_id: number; note_gimmick_type: number; note_gimmick_icon_type: number; skill_master_id: number; name: string; description: string; };
type m_live_note_wave_gimmick_group_t = { live_difficulty_id: number; wave_id: number; state: number; skill_id: number; name: string; description: string; };
type difficulty_const_info = { difficulty: m_live_difficulty_t; difficulty_const: m_live_difficulty_const_t; gimmick_lives: m_live_difficulty_gimmick_t[]; gimmick_notes: m_live_difficulty_note_gimmick_ext[]; gimmick_waves: m_live_note_wave_gimmick_group_t[]; };
type m_live_member_mapping_t = { mapping_id: number; position: number; member_master_id: number; is_center: boolean; card_position: number; suit_master_id: number | null; x_2d: number; y_2d: number; z_2d: number; };
type m_live_override_member_mapping_t = { mapping_id: number; position: number; member_master_id: number | null; member_non_playable_master_id: number | null; is_center: boolean; card_position: number; suit_master_id: number | null; suit_non_playable_master_id: number | null; x_2d: number; y_2d: number; z_2d: number; };
type m_suit_t = { id: number; member_m_id: number; name: string; thumbnail_image_asset_path: string; suit_release_route: number; suit_release_value: number; model_asset_path: string; display_order: number; };
type m_tower_composition_t = { tower_id: number; floor_no: number; name: string; thumbnail_asset_path: string | null; popup_thumbnail_asset_path: string | null; consume_performance: number; tower_cell_type: number; scenario_script_asset_path: string | null; live_difficulty_id: number; target_voltage: number; };
type m_story_main_cell_t = { id: number; part_id: number; chapter_id: number; display_order: number; number: number | null; type: number; index_text: string; title: string; summary: string; member_group: number; thumbnail_asset_path: string | null; popup_thumbnail_asset_path: string | null; scenraio_script_asset_path: string | null; movie_asset_path: string | null; live_difficulty_id: number | null; hard_live_difficulty_id: number | null; unlock_live_id: string | null; live_icon_asset_path: string | null; transformation_reference_cell_id: number | null; stage_no: number | null; };
type m_skill_t = { id: number; evaluation_param: number; skill_target_master_id1: number; skill_target_master_id2: number | null; skill_effect_master_id1: number; skill_effect_master_id2: number | null; };
type m_skill_effect_t = { id: number; target_parameter: number; effect_type: number; effect_value: number; scale_type: number; calc_type: number; timing: number; icon_asset_path: string | null; finish_type: number; finish_value: number; };
type m_skill_target_t = { id: number; only_owner: number; excluding_owner: number; random_choose_count: number; target_attribute_group_id: number | null; target_member_group_id: number | null; target_unit_group_id: number | null; target_school_group_id: number | null; target_school_grade_group_id: number | null; target_role_group_id: number | null; checking_owner_party: number; checking_owner_school: number; checking_owner_grade: number; checking_owner_unit: number; checking_owner_attribute: number; checking_owner_role: number; target_party_type_id: number | null; };
type skill_target_effect = { skill: m_skill_t; skill_effect_1: m_skill_effect_t; skill_target_1: m_skill_target_t; skill_effect_2?: m_skill_effect_t; skill_target_2?: m_skill_target_t; };
type chart_t = {
    live_difficulty_id: number;
    live_notes: Array<{ id: number; call_time: number; note_type: note_types; note_position: number; gimmick_id: number; note_action: note_actions; wave_id: number; note_random_drop_color: number; auto_judge_type: number; }>;
    live_wave_settings: Array<{ id: number; wave_damage: number; mission_type: wave_mission_types; arg_1: number; arg_2: number; reward_voltage: number; }>;
    note_gimmicks: Array<{ uniq_id: number; id: number; note_gimmick_type: number; arg_1: number; arg_2: number; effect_m_id: number; icon_type: number; }>;
    stage_gimmick_dict: [number, Array<{ gimmick_master_id: number; condition_master_id_1: number; condition_master_id_2: number; skill_master_id: number; uniq_id: number; }>];
};
enum note_actions { normal = 1, up = 4, down, left, right }
enum note_types {
    normal = 1,
    long_start, long_end,
    ac_start, ac_end, set_wonderful
}
enum wave_mission_types {
    gain_voltage = 1,
    judge_nice, judge_great, judge_wonderful,
    appeal_once,
    gain_voltage_sp,
    appeal_unique,
    critical_count, skill_count,
    maintain_stamina = 16,
}

class WaveMissionNames {
    static regs = new Map([
        [wave_mission_types.gain_voltage, /^??????([0-9]{1,3}(,[0-9]{3})*)??????????????????????????????$/],
        [wave_mission_types.gain_voltage_sp, /^SP???????????????([0-9]{1,3}(,[0-9]{3})*)??????????????????????????????$/],
        [wave_mission_types.skill_count, /^?????????([0-9]{1,3})???????????????$/],
        [wave_mission_types.critical_count, /^???????????????????????????([0-9]{1,3})?????????$/],
        [wave_mission_types.judge_nice, /^NICE??????????????????([0-9]{1,3})?????????$/],
        [wave_mission_types.judge_great, /^GREAT??????????????????([0-9]{1,3}(,[0-9]{3})*)?????????$/],
        [wave_mission_types.appeal_once, /^1??????([0-9]{1,3}(,[0-9]{3})*)??????????????????????????????$/],
        [wave_mission_types.appeal_unique, /^([0-9])???????????????????????????????????????????????????$/],
        [wave_mission_types.maintain_stamina, /^???????????????([0-9]{1,2})%??????????????????$/],
        [wave_mission_types.judge_wonderful, /^WONDERFUL??????????????????([0-9]{1,3})?????????$/],
    ]);
    static parse_name(name: string): { mission_type: wave_mission_types; arg_1: number; } {
        const iterator = this.regs.entries();
        for (const [mission_type, reg] of iterator) {
            const a = name.match(reg);
            if (a) return { mission_type, arg_1: parseInt(a[1].split(',').join("")) }
        }
        throw `unknown wave type from name ${name}`;
    };
}

class MasterData extends Database {
    All(SQLString: string): Promise<any[]> {
        return new Promise((res, rej) => {
            this.all(SQLString, (err: Error, rows: any[]) => {
                if (err) rej(`Masterdata Error: ${err}, on ${SQLString}`);
                res(rows);
            })
        })
    }
    constructor(path: string, callback: (err: Error | null) => void,) {
        super(path, callback);
        this.dictionary_k = null;
    }
    dictionary_k: Dictionary;
    bind_dictionary_k(dic: Dictionary): MasterData {
        this.dictionary_k = dic;
        return this;
    }
    async fetch_skill(skill_master_id: number): Promise<skill_target_effect> {
        const [skill] = (await this.All(`select * from m_skill where id = ${skill_master_id}`)) as m_skill_t[];
        const [skill_effect_1] = (await this.All(`select * from m_skill_effect where id = ${skill.skill_effect_master_id1}`)) as m_skill_effect_t[];
        const [skill_target_1] = (await this.All(`select * from m_skill_target where id = ${skill.skill_target_master_id1}`)) as m_skill_target_t[];

        if (!skill.skill_effect_master_id2) return {
            skill,
            skill_effect_1, skill_target_1,
            skill_effect_2: null, skill_target_2: null,
        };

        const [skill_effect_2] = (await this.All(`select * from m_skill_effect where id = ${skill.skill_effect_master_id2}`)) as m_skill_effect_t[];
        const [skill_target_2] = (await this.All(`select * from m_skill_target where id = ${skill.skill_target_master_id2}`)) as m_skill_target_t[];

        return {
            skill,
            skill_effect_1, skill_target_1,
            skill_effect_2, skill_target_2,
        };
    };
    async fetch_live(live_id: number) {
        if (!this.dictionary_k) throw "please bind dictionary_ja_k first";
        const [{ is_2d_live, music_id, live_member_mapping_id, member_group, member_unit,
            name, pronunciation, original_deck_name, copyright, source,
            jacket_asset_path }] = await this.All(`select * from m_live where live_id = ${live_id}`) as [m_live_t];
        return {
            is_2d_live, music_id, live_member_mapping_id,
            member_group, member_unit,
            name: await this.dictionary_k.get(name),
            pronunciation: await this.dictionary_k.get(pronunciation),
            original_deck_name: await this.dictionary_k.get(original_deck_name),
            copyright: await this.dictionary_k.get(copyright),
            source: await this.dictionary_k.get(source),
            jacket: base95(jacket_asset_path),
        };
    };
    async fetch_live_difficulty_id_config_by_music_id(music_id: number) {
        let live_difficulty_id_configuration: any;
        let has_new_difficulty = false;
        try { await fsPromises.stat(`${DATA_CACHE}${music_id}/`) } catch (e) { await fsPromises.mkdir(`${DATA_CACHE}${music_id}/`); }
        try {
            live_difficulty_id_configuration = JSON.parse((await fsPromises.readFile(`${DATA_CACHE}${music_id}/index.json`)).toString());
        } catch (e) {
            has_new_difficulty = true;
            live_difficulty_id_configuration = {};
        }

        const live_ids = (await this.All(`select live_id from m_live where music_id = ${music_id}`) as { live_id: number }[]).map(({ live_id }) => live_id);
        await Promise.all(live_ids.map(async (live_id) => {
            const live_difficulty_ids = (await this.All(`select live_difficulty_id from m_live_difficulty where live_id = ${live_id}`) as { live_difficulty_id: number }[]).map(({ live_difficulty_id }) => live_difficulty_id);
            live_difficulty_ids.forEach((live_difficulty_id) => {
                if (live_difficulty_id_configuration[live_difficulty_id]) return;
                //for SBL set false?
                (live_difficulty_id_configuration[live_difficulty_id] = { display: "normal" });
                has_new_difficulty = true;
            })
        }));
        if (has_new_difficulty) await fsPromises.writeFile(`${DATA_CACHE}${music_id}/index.json`, JSON.stringify(live_difficulty_id_configuration));
        return new Map(Object.entries(live_difficulty_id_configuration).map(([live_difficulty_id_str, config]) => {
            return [parseInt(live_difficulty_id_str), config];
        })) as Map<number, { display: "normal" | "expire" | "hide" }>;
    }
    async fetch_difficulty(music_id: number, difficulty_m_id: number): Promise<difficulty_const_info> {
        if (!this.dictionary_k) throw "please bind dictionary_ja_k first";
        try {
            const { difficulty, difficulty_const, gimmick_lives, gimmick_notes, gimmick_waves } = JSON.parse((await fsPromises.readFile(`${DATA_CACHE}${music_id}/${difficulty_m_id}.json`)).toString()) as difficulty_const_info;
            return { difficulty, difficulty_const, gimmick_lives, gimmick_notes, gimmick_waves };
        } catch (e) {
            const p_live_difficulty = this.All(`select * from m_live_difficulty where live_difficulty_id = ${difficulty_m_id}`) as Promise<m_live_difficulty_t[]>;
            const p_difficulty_const = p_live_difficulty.then(([{ difficulty_const_master_id }]) => {
                return this.All(`select * from m_live_difficulty_const where id = ${difficulty_const_master_id}`) as Promise<m_live_difficulty_const_t[]>;
            });
            const p_live_difficulty_gimmick = this.All(`select * from m_live_difficulty_gimmick where live_difficulty_master_id = ${difficulty_m_id} order by id`) as Promise<m_live_difficulty_gimmick_t[]>;
            const p_live_difficulty_note_gimmick = this.All(`select * from m_live_difficulty_note_gimmick where live_difficulty_id = ${difficulty_m_id} order by note_id`) as Promise<m_live_difficulty_note_gimmick_t[]>;
            const p_live_note_wave_gimmick_group = this.All(`select * from m_live_note_wave_gimmick_group where live_difficulty_id = ${difficulty_m_id} order by wave_id`) as Promise<m_live_note_wave_gimmick_group_t[]>;
            const [[difficulty], [difficulty_const], gimmick_lives, gimmick_notes, gimmick_waves] = await Promise.all([p_live_difficulty, p_difficulty_const,
                p_live_difficulty_gimmick.then((live_gimmicks) =>
                    Promise.all(live_gimmicks.map(async (live_gimmick) => {
                        [live_gimmick.name, live_gimmick.description] = await this.dictionary_k.getall(live_gimmick.name, live_gimmick.description);
                        return live_gimmick;
                    }))),
                p_live_difficulty_note_gimmick.then((note_gimmicks) =>
                    Promise.all(note_gimmicks.map(async (note_gimmick) => {
                        const [, id_str] = note_gimmick.name.match(/^k.live_detail_notes_name_([0-9]+)$/);
                        const note_gimmick_with_id = { id: parseInt(id_str) } as unknown as m_live_difficulty_note_gimmick_ext;
                        Object.assign(note_gimmick_with_id, note_gimmick) as m_live_difficulty_note_gimmick_ext;
                        [note_gimmick_with_id.name, note_gimmick_with_id.description] = await this.dictionary_k.getall(note_gimmick_with_id.name, note_gimmick_with_id.description);
                        return note_gimmick_with_id;
                    }))),
                p_live_note_wave_gimmick_group.then((wave_gimmicks) =>
                    Promise.all(wave_gimmicks.map(async (wave_gimmick) => {
                        [wave_gimmick.name, wave_gimmick.description] = await this.dictionary_k.getall(wave_gimmick.name, wave_gimmick.description);
                        return wave_gimmick;
                    }))
                )]);

            try { await fsPromises.stat(`${DATA_CACHE}${music_id}/`) } catch (e) { await fsPromises.mkdir(`${DATA_CACHE}${music_id}/`); }
            fsPromises.writeFile(`${DATA_CACHE}${music_id}/${difficulty_m_id}.json`, JSON.stringify({ difficulty, difficulty_const, gimmick_lives, gimmick_notes, gimmick_waves }));
            return { difficulty, difficulty_const, gimmick_lives, gimmick_notes, gimmick_waves };
        }
    };
    async fetch_member_mapping(mapping_id: number) {
        const p_live_member_mapping = (this.All(`select * from m_live_member_mapping where mapping_id = ${mapping_id}`) as Promise<m_live_member_mapping_t[]>);
        const p_live_override_member_mapping = this.All(`select * from m_live_override_member_mapping where mapping_id = ${mapping_id}`) as Promise<m_live_override_member_mapping_t[]>;
        const maplist: [number, { is_center: boolean, member_master_id: number, thumbnail: number, card_master_id: number }][] = await Promise.all((await p_live_member_mapping).concat(await p_live_override_member_mapping).map(async ({ position, is_center, member_master_id, suit_master_id }) => {
            if (!suit_master_id) return [position, { is_center, member_master_id, thumbnail: null, card_master_id: null }];
            const [suit] = await this.All(`select * from m_suit where id = ${suit_master_id}`) as m_suit_t[];
            if (suit.suit_release_route === 1) return [position, { is_center, member_master_id, thumbnail: base95(suit.thumbnail_image_asset_path), card_master_id: suit.suit_release_value }];
            else return [position, { is_center, member_master_id, thumbnail: base95(suit.thumbnail_image_asset_path), card_master_id: null }];
        }));
        return new Map(maplist);
    }
}

type dictionary_k_key = string;
class Dictionary extends Database {
    All(SQLString: string) {
        return new Promise((res, rej) => {
            this.all(SQLString, (err: Error, rows: any[]) => {
                if (err) rej(`Dictionary Error: ${err}, on ${SQLString}`);
                res(rows);
            })
        })
    }
    constructor(path: string, callback: (err: Error | null) => void) {
        super(path, callback);
    }
    get: (key: dictionary_k_key) => Promise<string> = async (key: dictionary_k_key) => {
        if (!key) return null;
        try {
            const [{ message }] = (await this.All(`select message from m_dictionary where id = "${key.slice(2)}"`)) as { message: string }[];
            return message.replace(/\n/g, "");
        }
        catch (e) {
            console.log("NOT FOUND in dictionary:", key);
            return `DICTIONARY ERROR: ${key}`;
        }
    }
    getall: (...keys: dictionary_k_key[]) => Promise<string[]> = async (...keys: dictionary_k_key[]) => Promise.all(keys.map((arg) => this.get(arg)));
}
const dictionary_ja_k = new Dictionary("../dictionary_ja_k.db", (err) => {
    if (err) throw err;
});
const masterdata = new MasterData("../masterdata.db", (err) => {
    if (err) throw err;
}).bind_dictionary_k(dictionary_ja_k);

async function story_main_info_by_live_difficulty_id(live_difficulty_id: number) {
    if ([32002301, 32003301, 32004301, 32005301, 32006301, 32007301, 32008301, 32009301, 32010301].indexOf(live_difficulty_id) !== -1)
        return { is_normal: false, is_hard: false, part_id: 1, chapter_id: 2, stage_no: 7, number: 10, number_ab: '10a' };

    const [normal] = await masterdata.All(`select part_id,chapter_id,stage_no,hard_live_difficulty_id from m_story_main_cell where live_difficulty_id = ${live_difficulty_id}`);
    const [hard] = await masterdata.All(`select part_id,chapter_id,stage_no from m_story_main_cell where hard_live_difficulty_id = ${live_difficulty_id}`);
    if (!normal && !hard) return null;

    let is_hard = normal ? false : true;
    let is_normal = normal && normal.hard_live_difficulty_id ? true : false;
    const { part_id, chapter_id, stage_no } = normal || hard;

    const chapter_cells = await masterdata.All(`select number,title,stage_no from m_story_main_cell where chapter_id = ${chapter_id} order by display_order`) as { number: number, title: string, stage_no: number }[];
    let phase = 0;
    for (const { number, title, stage_no: s } of chapter_cells.reverse()) {
        switch (phase) {
            case 0: if (stage_no === s) {
                phase = 1;
            } break;
            case 1: try {
                const [, number_ab] = title.match(/^m\.story_main_title_[0-9]{1,2}_([0-9]{1,2}(a|b)?)$/);
                return { is_normal, is_hard, part_id, chapter_id, stage_no, number, number_ab };
            } catch (e) { continue; }
        }
    }
}

async function tower_info_by_live_difficulty_id(live_difficulty_id: number) {
    const tower_composition: { tower_id: number, floor_no: number, target_voltage: number }[]
        = await masterdata.All(`select tower_id,floor_no,target_voltage from m_tower_composition where live_difficulty_id = ${live_difficulty_id}`);
    if (tower_composition.length < 1) return null;

    const { tower_id, floor_no, target_voltage } = tower_composition[0];
    const live_no = (await masterdata.All(`select live_difficulty_id from m_tower_composition where tower_id = ${tower_id} order by floor_no`) as { floor_no: number, live_difficulty_id: number }[])
        .map(({ live_difficulty_id }) => live_difficulty_id)
        .filter((live_difficulty_id) => live_difficulty_id)
        .indexOf(live_difficulty_id) + 1;
    return { tower_id, floor_no, live_no, target_voltage };
}

async function coop_live_by_live_difficulty_id(live_difficulty_id: number) {
    //?????????live_id???live_difficulty_id?????????
    const id_str = live_difficulty_id.toString();
    const sbl_live_id_str = id_str.slice(0, 5);
    const event_ids = await masterdata.All(`select event_id, display_order from m_coop_live where id = ${sbl_live_id_str}`) as { event_id: number, display_order: number }[];

    let main_difficulty_type = 30;
    if (id_str[5] === "4" || id_str[6] === "1") {
        //???????????????+SBL
        main_difficulty_type = 35;
        return { main_difficulty_type, events: event_ids.filter(({ event_id }) => [32020, 32021].indexOf(event_id) !== -1) };
    } else {
        //????????????????????????
        //32005 Snow halation
        if (sbl_live_id_str === "40011") event_ids.push({ event_id: 32005, display_order: 1 });
        //32006 Tokimeki Runners Chapter 17 Ver.
        if (sbl_live_id_str === "42034") event_ids.push({ event_id: 32006, display_order: 3 });
        //32007 Ketsui no Hikari
        if (sbl_live_id_str === "42030") event_ids.push({ event_id: 32007, display_order: 3 });
        return { main_difficulty_type, events: event_ids.filter(({ event_id }) => [32020, 32021].indexOf(event_id) === -1) };
    }
}

//FULL replace judge ????????????????????????: ??????live_id????????????
function chart_replace_judge({ live_difficulty_id: id1, live_difficulty_type: t1, unlock_pattern: p1 }: { live_difficulty_id: number, live_difficulty_type: difficulty_difficulties, unlock_pattern: unlock_patterns }
    , { live_difficulty_id: id2, live_difficulty_type: t2, unlock_pattern: p2 }: { live_difficulty_id: number, live_difficulty_type: difficulty_difficulties, unlock_pattern: unlock_patterns }) {
    /**
     * FULL (???????????????FULL)
     * permanent 101/201/301/401 <-> permanent 102/202/302/402
     * permanent 10/20/30/35 <-> DLP 10/20/30/35
     * permanent 401 <-> SBL 401
     * permanent 402 <-> SBL 402
     *
     * PARTIALLY (exclude ACvo/dmg)
     * permanent 101/201/301/401 <-> no-attr 101/201/301/401
     * story with same gimmick position (note and wave)
     */
    if (id1 === id2) return false;
    if (t1 !== t2) return false;//???????????? ??????????????????
    if ([difficulty_difficulties.beginner, difficulty_difficulties.intermediate, difficulty_difficulties.advanced].indexOf(t1) !== -1) {
        //?????? ?????? ??????
        const first1 = id1.toString()[0], first2 = id2.toString()[0];
        if (["1", "5"].indexOf(first1) !== -1 && ["1", "5"].indexOf(first2) !== -1) {
            //????????????1???5
            //console.log(`FULL REPLACE on ${id1} - ${id2}, type 1`, id1, t1, p1, id2, t2, p2);
            return true;
        } else {
            //???????????????4?????? ?????????15???????????????
            if (t1 === difficulty_difficulties.advanced && (first1 === "4" && ["1", "5"].indexOf(first2) !== -1 || first2 === "4" && ["1", "5"].indexOf(first1) !== -1)) {
                //console.log(`FULL REPLACE on ${id1} - ${id2}, type 1`, id1, t1, p1, id2, t2, p2);
                return true;
            }
            else return false;
        }
    }
    else if ([difficulty_difficulties.expert, difficulty_difficulties.challenge].indexOf(t1) !== -1) {
        //??????+ Challenge
        if ([unlock_patterns.SBL, unlock_patterns.DLP, unlock_patterns.expert_challenge].indexOf(p1) !== -1
            && [unlock_patterns.SBL, unlock_patterns.DLP, unlock_patterns.expert_challenge].indexOf(p2) !== -1) {
            //????????????????????????+?????????(unlock_patterns.eliminated)
            //console.log(`FULL REPLACE on ${id1} - ${id2}, type 2`, id1, t1, p1, id2, t2, p2);
            return true;
        } else return false;
    }
    else return false;
}
//PARTIALLY replace judge: note?????? ac????????????????????????
async function difficulty_compare_masterdata_note_wave(music_id: number, live_difficulty_id_1: number, live_difficulty_id_2: number) {
    const { gimmick_notes: gimmick_notes_1, gimmick_waves: gimmick_waves_1 } = await masterdata.fetch_difficulty(music_id, live_difficulty_id_1);
    const { gimmick_notes: gimmick_notes_2, gimmick_waves: gimmick_waves_2 } = await masterdata.fetch_difficulty(music_id, live_difficulty_id_2);

    //appeal chance
    if (gimmick_waves_1.length !== gimmick_waves_2.length) return false;
    //note gimmick
    for (let i = 0; ; i += 1) {
        if (!(gimmick_notes_1[i] && gimmick_notes_2[i])) {
            if (gimmick_notes_1[i] || gimmick_notes_2[i]) return false;
            else return true;
        }
        const { note_id: note_id1 } = gimmick_notes_1[i], { note_id: note_id2 } = gimmick_notes_2[i];
        if (note_id1 !== note_id2) {
            return false;
        }
    }
}

// Step 1
async function grouping_2d_3d() {
    const lives = await masterdata.All(`select * from m_live`) as m_live_t[];
    const page_map_live: Map<string, [number[], number[]]> = new Map();
    await Promise.all(lives.map(async ({ live_id, music_id, is_2d_live, name }) => {
        const [, page] = (await dictionary_ja_k.get(name)).match(/^(.+?)(\((2|3)D\))?$/);
        page_map_live.has(page) || page_map_live.set(page, [[], []]);
        page_map_live.get(page)[is_2d_live][Math.floor(live_id / 10000) as unlock_patterns] = (live_id);
    }));
    return page_map_live;
}

// Step 2
async function page_generation(live_ids_3d: number[], live_ids_2d: number[]) {
    // TODO: group by music_id
    // music_id???2D/3D????????????????????????

    const diffs_3d = await music_difficulties_generation(live_ids_3d), diffs_2d = await music_difficulties_generation(live_ids_2d);

    const { live_id: live_id_3d, text: base_info_3d, center_count: center_count_3d } = (await live_base_info_gen(live_ids_3d)) || { live_id: null, text: null, center_count: null };
    const { live_id: live_id_2d, text: base_info_2d, center_count: center_count_2d } = (await live_base_info_gen(live_ids_2d)) || { live_id: null, text: null, center_count: null };
    let chart_complete_state = true;//???????????? ????????????
    // Step 5
    const [??????_2D, ??????_3D] = await Promise.all([
        { main_live_id: live_id_2d, diffs: diffs_2d, base_info: base_info_2d, center_count: center_count_2d },
        { main_live_id: live_id_3d, diffs: diffs_3d, base_info: base_info_3d, center_count: center_count_3d }
    ].map(async ({ main_live_id, diffs, base_info, center_count }) => {
        if (!diffs) return null;
        const ???????????????: string[] = [];
        const ?????????: string[] = [];
        const generated_difficulty_ids: number[] = [];
        //????????????GimmickData
        const GimmickData2_by_difficulty_id: Map<number, string> = new Map();
        diffs.difficulties.forEach(({ difficulty, difficulty_const, descriptions_live, descriptions_note, descriptions_wave, range_note, range_wave, epilog, is_complete }, difficulty_id) => {
            chart_complete_state = is_complete && chart_complete_state;
            const { chart_note_count } = epilog;
            if (chart_note_count) {
                //???????????????
                GimmickData2_by_difficulty_id.set(difficulty_id, `{{GimmickData2 | MID = ${main_live_id} | ID = ${difficulty_id}\n| ${descriptions_live.join("\n  ")
                    }\n| ${descriptions_note.join("\n  ")
                    }\n| ${descriptions_wave.join("\n  ")}\n| ${chart_note_count}\n| ${range_note.concat(range_wave).join("\n  ")}\n}}`);
            } else {
                //??????????????????
                GimmickData2_by_difficulty_id.set(difficulty_id, `{{GimmickData2 | MID = ${main_live_id} | ID = ${difficulty_id}\n| ${descriptions_live.join("\n  ")
                    }\n| ${descriptions_note.join("\n  ")
                    }\n| ${descriptions_wave.join("\n  ")}\n}}`);
            }
        });

        const normal_lives = [] as { text: string, sort_value: number }[];
        const normal_selectors = [] as { text: string, sort_value: number }[];
        const tmp_note_count_for_story_difficulty_compare = { [difficulty_difficulties.beginner]: null as number, [difficulty_difficulties.intermediate]: null as number, [difficulty_difficulties.advanced]: null as number };
        for (const [difficulty_id, { difficulty, difficulty_const, descriptions_live, descriptions_note, descriptions_wave, range_note, range_wave, epilog }] of diffs.difficulties.entries()) {
            if ([unlock_patterns.permanent, unlock_patterns.eliminated, unlock_patterns.expert_challenge, unlock_patterns.daily, unlock_patterns.from_main_story, unlock_patterns.from_bond_story].indexOf(difficulty.unlock_pattern) === -1) continue;
            //???????????????1???????????????????????????
            if (difficulty_id.toString()[0] === "1" && difficulty.live_difficulty_type <= 30 && tmp_note_count_for_story_difficulty_compare[difficulty.live_difficulty_type]) continue;

            const texts = [] as string[];

            const { live_difficulty_type, default_attribute, consumed_lp, recommended_score, recommended_stamina,
                evaluation_c_score, evaluation_b_score, evaluation_a_score, evaluation_s_score,
                reward_user_exp, reward_base_love_point,
            } = difficulty;
            const { chart_note_count, total_success_voltage } = epilog;
            const { note_stamina_reduce, sp_gauge_length, sp_gauge_reducing_point, note_voltage_upper_limit, collabo_voltage_upper_limit, skill_voltage_upper_limit, squad_change_voltage_upper_limit } = difficulty_const;
            //??????Story Live??????CDT??????????????????
            if (chart_note_count) tmp_note_count_for_story_difficulty_compare[live_difficulty_type] = chart_note_count;
            const parms_text = Object.entries({
                MID: main_live_id,
                ID: difficulty_id, DT: live_difficulty_type, ATTR: default_attribute, SLP: recommended_score, SST: recommended_stamina,
                VC: evaluation_c_score, VB: evaluation_b_score, VA: evaluation_a_score, VS: evaluation_s_score,
                DMG: note_stamina_reduce,
                NN: chart_note_count, ACVO: total_success_voltage,
                LP: consumed_lp !== { 10: 10, 20: 12, 30: 15, 35: 20, 37: 20 }[live_difficulty_type] && consumed_lp,
                EXP: reward_user_exp !== { 10: 8, 20: 13, 30: 21, 35: 34, 37: 34 }[live_difficulty_type] && reward_user_exp,
                BOND: reward_base_love_point !== { 10: 12, 20: 16, 30: 24, 35: 36, 37: 36 }[live_difficulty_type] && reward_base_love_point,
                BONDC: center_count !== 1 && center_count,
                MSP: sp_gauge_length !== { 10: 3600, 20: 4800, 30: 6000, 35: 7200, 37: 8400 }[live_difficulty_type] && sp_gauge_length,
                LSP: sp_gauge_reducing_point !== { 10: 50, 20: 75, 30: 100, 35: 100, 37: 100 }[live_difficulty_type] && sp_gauge_reducing_point,
                CAP1: note_voltage_upper_limit !== { 10: 50000, 20: 50000, 30: 50000, 35: 250000, 37: 300000 }[live_difficulty_type] && note_voltage_upper_limit,
                CAP2: collabo_voltage_upper_limit !== { 10: 250000, 20: 250000, 30: 250000, 35: 500000, 37: 750000 }[live_difficulty_type] && collabo_voltage_upper_limit,
                CAP3: skill_voltage_upper_limit !== { 10: 50000, 20: 50000, 30: 50000, 35: 100000, 37: 150000 }[live_difficulty_type] && skill_voltage_upper_limit,
                CAP4: squad_change_voltage_upper_limit !== 30000 && squad_change_voltage_upper_limit,
            }).filter(([k, v]) => v).map(([k, v]) => `${k}=${v}`).join('|');
            texts.push(`{{NormalLiveData2|${parms_text}}}`);
            texts.push(GimmickData2_by_difficulty_id.get(difficulty_id));

            const sort_value = difficulty.live_difficulty_type + (difficulty_id.toString()[0] === "2" ? 100 : 0);
            normal_lives.push({ text: texts.join("\n\n"), sort_value });
            normal_selectors.push({ text: `{{NormalLiveSelector|${parms_text}}}`, sort_value });
            generated_difficulty_ids.push(difficulty_id);
        }
        if (normal_lives.length) {
            normal_lives.sort((a, b) => a.sort_value - b.sort_value);
            normal_selectors.sort((a, b) => a.sort_value - b.sort_value);
            //normal_lives.unshift({ text: "== ??????Live ==", sort_value: 0 });
            ???????????????.push(normal_lives.map(({ text }) => text).join("\n\n"));
            const f1 = normal_selectors.filter(({ sort_value }) => sort_value < 100), f2 = normal_selectors.filter(({ sort_value }) => sort_value >= 100);
            if (f1.length) {
                ?????????.push(`<div class=difficulty-selector-header data-permanent></div>`);
                ?????????.push('<div class=difficulty-selector-content>');
                ?????????.push(f1.map(({ text }) => text).join("\n"));
                ?????????.push('</div>');
            }
            if (f2.length) {
                ?????????.push(`<div class=difficulty-selector-header data-event></div>`);
                ?????????.push('<div class=difficulty-selector-content>');
                ?????????.push(f2.map(({ text }) => text).join("\n"));
                ?????????.push('</div>');
            }
        }

        const story_lives = [] as { text: string, sort_value: number }[];
        const story_selectors = [] as { text: string, sort_value: number }[];
        for (const [difficulty_id, { difficulty, difficulty_const, descriptions_live, descriptions_note, descriptions_wave, epilog }] of diffs.difficulties.entries()) {
            if (difficulty.unlock_pattern !== unlock_patterns.main_story) continue;
            const story_main_info = await story_main_info_by_live_difficulty_id(difficulty_id);
            if (!story_main_info) continue;

            const texts = [] as string[];
            const { is_normal, is_hard, chapter_id, number } = story_main_info;

            const { live_difficulty_type, default_attribute, consumed_lp, recommended_score, recommended_stamina,
                evaluation_c_score, evaluation_b_score, evaluation_a_score, evaluation_s_score,
                reward_user_exp, reward_base_love_point,
            } = difficulty;
            const { chart_note_count, total_success_voltage } = epilog;
            // Story Live ????????????(?????? ?????? ??????)
            const CDT = Object.entries(tmp_note_count_for_story_difficulty_compare).reduce((prev, [k, v]) => {
                if (v === chart_note_count) return k;
                else return prev;
            }, null as any);
            const { note_stamina_reduce, sp_gauge_length, sp_gauge_reducing_point, note_voltage_upper_limit, collabo_voltage_upper_limit, skill_voltage_upper_limit, squad_change_voltage_upper_limit } = difficulty_const;

            const parms_text = Object.entries({
                MID: main_live_id,
                PART: story_main_info.part_id, CHAPTER: story_main_info.chapter_id, STAGE: story_main_info.stage_no, EPISODE: story_main_info.number,
                ESUB: story_main_info.number_ab.match(/(a|b)$/) && Array.from(story_main_info.number_ab).pop(),
                TYPE: is_normal && "NORMAL" || is_hard && "HARD" || null,
                CDT,
                ID: difficulty_id, DT: live_difficulty_type, ATTR: default_attribute, SLP: recommended_score, SST: recommended_stamina,
                LP: consumed_lp,
                VC: evaluation_c_score, VB: evaluation_b_score, VA: evaluation_a_score, VS: evaluation_s_score,
                DMG: note_stamina_reduce,
                NN: chart_note_count, ACVO: total_success_voltage,
                EXP: reward_user_exp !== { 9: 7, 10: 8, 12: 10, 13: 10, 15: 12, 16: 13 }[consumed_lp] && reward_user_exp,
                BOND: reward_base_love_point !== consumed_lp && reward_base_love_point,
                BONDC: center_count !== 1 && center_count,
                MSP: (!(is_normal || is_hard) || is_normal && sp_gauge_length !== 4800 || is_hard && sp_gauge_length !== 6000) && sp_gauge_length,
                LSP: (!(is_normal || is_hard) || sp_gauge_reducing_point !== 75) && sp_gauge_reducing_point,
                CAP1: note_voltage_upper_limit !== { 10: 50000, 20: 50000, 30: 50000, 35: 250000, 37: 300000 }[live_difficulty_type] && note_voltage_upper_limit,
                CAP2: collabo_voltage_upper_limit !== { 10: 250000, 20: 250000, 30: 250000, 35: 500000, 37: 750000 }[live_difficulty_type] && collabo_voltage_upper_limit,
                CAP3: skill_voltage_upper_limit !== { 10: 50000, 20: 50000, 30: 50000, 35: 100000, 37: 150000 }[live_difficulty_type] && skill_voltage_upper_limit,
                CAP4: squad_change_voltage_upper_limit !== 30000 && squad_change_voltage_upper_limit,
            }).filter(([k, v]) => v).map(([k, v]) => `${k}=${v}`).join('|');
            texts.push(`{{StoryLiveData2|${parms_text}}}`);
            texts.push(GimmickData2_by_difficulty_id.get(difficulty_id));

            const sort_value = chapter_id * 1000 + number * 10 + (is_hard ? 1 : 0);
            story_lives.push({ text: texts.join("\n\n"), sort_value });
            story_selectors.push({ text: `{{StoryLiveSelector|${parms_text}}}`, sort_value });
            generated_difficulty_ids.push(difficulty_id);
        }
        if (story_lives.length) {
            story_lives.sort((a, b) => a.sort_value - b.sort_value);
            story_selectors.sort((a, b) => a.sort_value - b.sort_value);
            //story_lives.unshift({ text: "== ??????Live ==", sort_value: 0 });
            ???????????????.push(story_lives.map(({ text }) => text).join("\n\n"));
            ?????????.push(`<div class=difficulty-selector-header data-story-main></div>`);
            ?????????.push('<div class=difficulty-selector-content>');
            ?????????.push(story_selectors.map(({ text }) => text).join("\n"));
            ?????????.push('</div>');
        }

        const dlp_lives = [] as { text: string, sort_value: number }[];
        const dlp_selectors = [] as { text: string, sort_value: number }[];
        for (const [difficulty_id, { difficulty, difficulty_const, descriptions_live, descriptions_note, descriptions_wave, epilog }] of diffs.difficulties.entries()) {
            if (difficulty.unlock_pattern !== unlock_patterns.DLP) continue;
            //???????????????DLP Live
            const tower_info = await tower_info_by_live_difficulty_id(difficulty_id);
            if (!tower_info) continue;

            const texts = [] as string[];
            const { tower_id, target_voltage, floor_no, live_no } = tower_info;

            const { live_difficulty_type, default_attribute, consumed_lp, recommended_score, recommended_stamina,
                evaluation_c_score, evaluation_b_score, evaluation_a_score, evaluation_s_score,
                reward_user_exp, reward_base_love_point,
            } = difficulty;
            const { chart_note_count, total_success_voltage } = epilog;
            const { note_stamina_reduce, sp_gauge_length, sp_gauge_reducing_point, note_voltage_upper_limit, collabo_voltage_upper_limit, skill_voltage_upper_limit, squad_change_voltage_upper_limit } = difficulty_const;

            const parms_text = Object.entries({
                MID: main_live_id,
                TOWER: tower_id, FLOOR: floor_no, STAGE: live_no,
                ID: difficulty_id, DT: live_difficulty_type, ATTR: default_attribute, SLP: recommended_score, SST: recommended_stamina,
                VP: target_voltage,
                DMG: note_stamina_reduce,
                NN: chart_note_count, ACVO: total_success_voltage,
                LP: consumed_lp !== 0 && consumed_lp,
                EXP: reward_user_exp !== 0 && reward_user_exp,
                MSP: sp_gauge_length !== { 10: 3600, 20: 4800, 30: 6000, 35: 7200, 37: 8400 }[live_difficulty_type] && sp_gauge_length,
                LSP: sp_gauge_reducing_point !== { 10: 50, 20: 75, 30: 100, 35: 100, 37: 100 }[live_difficulty_type] && sp_gauge_reducing_point,
                CAP1: note_voltage_upper_limit !== { 10: 50000, 20: 50000, 30: 50000, 35: 250000, 37: 300000 }[live_difficulty_type] && note_voltage_upper_limit,
                CAP2: collabo_voltage_upper_limit !== { 10: 250000, 20: 250000, 30: 250000, 35: 500000, 37: 750000 }[live_difficulty_type] && collabo_voltage_upper_limit,
                CAP3: skill_voltage_upper_limit !== { 10: 50000, 20: 50000, 30: 50000, 35: 100000, 37: 150000 }[live_difficulty_type] && skill_voltage_upper_limit,
                CAP4: squad_change_voltage_upper_limit !== 30000 && squad_change_voltage_upper_limit,
            }).filter(([k, v]) => v).map(([k, v]) => `${k}=${v}`).join('|');
            texts.push(`{{DLPLiveData2|${parms_text}}}`);
            texts.push(GimmickData2_by_difficulty_id.get(difficulty_id));

            const sort_value = tower_id * 1000 + live_no;
            dlp_lives.push({ text: texts.join("\n\n"), sort_value });
            dlp_selectors.push({ text: `{{DLPLiveSelector|${parms_text}}}`, sort_value });
            generated_difficulty_ids.push(difficulty_id);
        }
        if (dlp_lives.length) {
            dlp_lives.sort((a, b) => a.sort_value - b.sort_value);
            dlp_selectors.sort((a, b) => a.sort_value - b.sort_value);
            //dlp_lives.unshift({ text: "== DLP Live ==", sort_value: 0 });
            ???????????????.push(dlp_lives.map(({ text }) => text).join("\n\n"));
            ?????????.push(`<div class=difficulty-selector-header data-dlp></div>`);
            ?????????.push('<div class=difficulty-selector-content>');
            ?????????.push(dlp_selectors.map(({ text }) => text).join("\n"));
            ?????????.push('</div>');
        }

        const sbl_lives = [] as { text: string, sort_value: number }[];
        const sbl_selectors = [] as { text: string, sort_value: number }[];
        for (const [difficulty_id, { difficulty, difficulty_const, descriptions_live, descriptions_note, descriptions_wave, epilog }] of diffs.difficulties.entries()) {
            if (difficulty.unlock_pattern !== unlock_patterns.SBL) continue;

            const sbl_info = await coop_live_by_live_difficulty_id(difficulty_id);
            if (!sbl_info) continue;

            const texts = [] as string[];
            const { main_difficulty_type } = sbl_info;

            const { default_attribute, consumed_lp, recommended_score, recommended_stamina,
                evaluation_c_score, evaluation_b_score, evaluation_a_score, evaluation_s_score,
                reward_user_exp, reward_base_love_point,
                live_difficulty_type,
            } = difficulty;
            const { chart_note_count, total_success_voltage } = epilog;
            const { note_stamina_reduce, sp_gauge_length, sp_gauge_reducing_point, note_voltage_upper_limit, collabo_voltage_upper_limit, skill_voltage_upper_limit, squad_change_voltage_upper_limit } = difficulty_const;

            const parms_text = Object.entries({
                MID: main_live_id,
                MDT: main_difficulty_type,
                ID: difficulty_id, DT: live_difficulty_type, ATTR: default_attribute, SLP: recommended_score, SST: recommended_stamina,
                VC: evaluation_c_score, VB: evaluation_b_score, VA: evaluation_a_score, VS: evaluation_s_score,
                DMG: note_stamina_reduce,
                NN: chart_note_count, ACVO: total_success_voltage,
                EXP: reward_user_exp !== { 10: 8, 20: 13, 30: 21, 35: 34, 37: 34 }[live_difficulty_type] && reward_user_exp,
                BOND: reward_base_love_point !== { 10: 12, 20: 16, 30: 24, 35: 36, 37: 36 }[live_difficulty_type] && reward_base_love_point,
                BONDC: center_count !== 1 && center_count,
                MSP: sp_gauge_length !== { 10: 3600, 20: 4800, 30: 6000, 35: 7200, 37: 8400 }[main_difficulty_type] && sp_gauge_length,
                LSP: sp_gauge_reducing_point !== { 10: 50, 20: 75, 30: 100, 35: 100, 37: 100 }[main_difficulty_type] && sp_gauge_reducing_point,
                CAP1: note_voltage_upper_limit !== { 10: 50000, 20: 50000, 30: 50000, 35: 250000, 37: 300000 }[main_difficulty_type] && note_voltage_upper_limit,
                CAP2: collabo_voltage_upper_limit !== { 10: 250000, 20: 250000, 30: 250000, 35: 500000, 37: 750000 }[main_difficulty_type] && collabo_voltage_upper_limit,
                CAP3: skill_voltage_upper_limit !== { 10: 50000, 20: 50000, 30: 50000, 35: 100000, 37: 150000 }[main_difficulty_type] && skill_voltage_upper_limit,
                CAP4: squad_change_voltage_upper_limit !== 30000 && squad_change_voltage_upper_limit,
            }).filter(([k, v]) => v).map(([k, v]) => `${k}=${v}`).join('|');
            texts.push(`{{SBLLiveData2|${parms_text}}}`);
            texts.push(GimmickData2_by_difficulty_id.get(difficulty_id));

            const sort_value = difficulty_id % 1000 + 1000 * main_difficulty_type;
            sbl_lives.push({ text: texts.join("\n\n"), sort_value });
            sbl_selectors.push({ text: `{{SBLLiveSelector|${parms_text}}}`, sort_value });
            generated_difficulty_ids.push(difficulty_id);
        }
        if (sbl_lives.length) {
            sbl_lives.sort((a, b) => a.sort_value - b.sort_value);
            sbl_selectors.sort((a, b) => a.sort_value - b.sort_value);
            //sbl_lives.unshift({ text: "== SBL Live ==", sort_value: 0 });
            ???????????????.push(sbl_lives.map(({ text }) => text).join("\n\n"));
            ?????????.push(`<div class=difficulty-selector-header data-sbl></div>`);
            ?????????.push('<div class=difficulty-selector-content>');
            ?????????.push(sbl_selectors.map(({ text }) => text).join("\n"));
            ?????????.push('</div>');
        }

        return { generated_difficulty_ids, base_info_text: base_info, selector_text: ?????????.join("\n"), chart_text: ???????????????.join("\n\n") };
    }));


    if (diffs_3d && diffs_2d) {
        const selector_frames = [] as string[];
        selector_frames.push(`<div class=difficulty-selector-frame>
<div class=difficulty-selector-header data-2d3d></div>
<div class=difficulty-selector-content>
<div class=chart-digest data-bsd-activate=${live_id_2d} data-bsd-activated=true data-bsd-action="${live_id_2d}+/${live_id_3d}-">2D Version</div>
<div class=chart-digest data-bsd-activate=${live_id_3d} data-bsd-activated=false data-bsd-action="${live_id_3d}+/${live_id_2d}-">3D Version</div>
</div>
</div>`);
        selector_frames.push(`<div class=difficulty-selector-frame data-bsd-condition=${live_id_2d}>
${??????_2D.selector_text}
</div>`);
        selector_frames.push(`<div class=difficulty-selector-frame data-bsd-condition=${live_id_3d} data-bsd-activated=true>
${??????_3D.selector_text}
</div>`);
        return [
            '{{CSSChartText}}',
            `<div id=difficulty-selector>\n${selector_frames.join('\n')}\n</div>`,
            `<div data-bsd-condition="${live_id_2d}${??????_2D.generated_difficulty_ids.length ? `&!(${??????_2D.generated_difficulty_ids.join('|')})` : ''}">\n${??????_2D.base_info_text}\n</div>`,
            (??????_2D).chart_text,
            `<div data-bsd-condition="${live_id_3d}${??????_3D.generated_difficulty_ids.length ? `&!(${??????_3D.generated_difficulty_ids.join('|')})` : ''}">\n${??????_3D.base_info_text}\n</div>`,
            (??????_3D).chart_text,
            `[[??????:??????]]${chart_complete_state ? "" : "\n[[??????:????????????????????????]]"}`,
        ].join("\n\n");
    } else if (diffs_3d || diffs_2d) {
        const selector_frames = [] as string[];
        const ?????? = ??????_2D || ??????_3D;
        selector_frames.push(`<div class=difficulty-selector-frame data-bsd-condition=${live_id_2d || live_id_3d} data-bsd-activated=true>
${??????.selector_text}
</div>`);
        return [
            '{{CSSChartText}}',
            `<div id=difficulty-selector>\n${selector_frames.join('\n')}\n</div>`,
            `<div data-bsd-condition="${live_id_2d || live_id_3d}${??????.generated_difficulty_ids.length ? `&!(${??????.generated_difficulty_ids.join('|')})` : ''}">\n${??????.base_info_text}\n</div>`,
            (??????).chart_text,
            `[[??????:??????]]${chart_complete_state ? "" : "\n[[??????:????????????????????????]]"}`,
        ].join("\n\n");
    }
}

// Step 3
async function music_difficulties_generation(live_ids: number[]) {
    //???????????????9???Live
    const main_live_id = live_ids[1] || live_ids[4] || live_ids[5];
    if (!main_live_id) return null;

    const music_id = main_live_id % 10000;
    const difficulty_id_config = await masterdata.fetch_live_difficulty_id_config_by_music_id(music_id);
    const live_difficulties = [] as difficulty_const_info[];
    for (const difficulty_id of difficulty_id_config.keys()) {
        live_difficulties.push(await masterdata.fetch_difficulty(music_id, difficulty_id));
    }

    const result_map = new Map() as Map<number, {
        difficulty: m_live_difficulty_t, difficulty_const: m_live_difficulty_const_t,
        descriptions_live: string[], descriptions_note: string[], descriptions_wave: string[],
        range_note: string[], range_wave: string[],
        epilog: {
            chart_note_count: number;
            natural_damage_rate_100: number;
            in_appeal_chance_notes: number;
            minimum_damage_note: any;
            maximum_damage_note_on_success: number;
            total_special_damage: number;
            total_success_voltage: number;
            total_success_voltage_rate_100: any;
            total_failure_damage: number;
            total_failure_damage_rate_100: any;
        },
        is_complete: boolean;
    }>;

    for (const const_info of live_difficulties.values()) {
        const { live_difficulty_id } = const_info.difficulty;
        //check visibility
        if (difficulty_id_config.get(live_difficulty_id).display === "hide") continue;
        //get chart
        let chart_raw: any;
        try {
            //try direct read
            chart_raw = JSON.parse((await fsPromises.readFile(`${DIR_SRC_CHARTS}${live_difficulty_id}.json`)).toString()) as chart_t;
        } catch (e) {
            //try all other charts to replace
            for (const { difficulty: difficulty_rep } of live_difficulties.values()) {
                const is_full_replace = chart_replace_judge(const_info.difficulty, difficulty_rep);
                if (is_full_replace) {
                    try {
                        chart_raw = JSON.parse((await fsPromises.readFile(`${DIR_SRC_CHARTS}${difficulty_rep.live_difficulty_id}.json`)).toString()) as chart_t;
                        //console.log(`FULL REPLACE on ${live_difficulty_id} <- ${difficulty_rep.live_difficulty_id}`);
                        break;
                    } catch (e) { continue; }
                } else continue;
            }
        }
        const chart = chart_raw && (chart_raw[3] && chart_raw[3].live && chart_raw[3].live.live_stage as chart_t
            || chart_raw.live && chart_raw.live_stage as chart_t
            || chart_raw.live_stage as chart_t
            || chart_raw as chart_t)
            || null;
        if (!chart) console.log(`[CHART WARNING] ${live_difficulty_id} available chart not found`);

        result_map.set(live_difficulty_id, await difficulty_gimmick_generation(const_info, chart));
    }
    return { difficulties: result_map };
}

// Step 4
/* will throw error on 9999/92999101/92998101 */
async function difficulty_gimmick_generation(const_info: difficulty_const_info, chart: chart_t | null) {
    const {
        difficulty, difficulty_const, gimmick_lives, gimmick_notes, gimmick_waves
    } = const_info;
    const chart_notes: Array<{ id: number; note_type: note_types; note_action: note_actions; note_position: 1 | 2; call_time: number; }> = [];
    const chart_waves_by_wave_id: Map<number, { mission_type: number; target_1: number; start_at_note: number; end_at_note: number; failure_damage: number; success_voltage: number; }> = new Map();
    const chart_notes_by_gimmick_id: Map<number, { note_gimmick_type: number; note_gimmick_icon_type: number; skill_master_id: number; note_ids: (number | string)[]; }> = new Map();
    //???????????????note?????????AC??????
    let chart_note_count = null as number;
    if (chart) {
        chart_note_count = chart.live_notes.reduce((note_count, { id, gimmick_id, wave_id, note_type, note_action, note_position, call_time }) => {
            switch (note_type) {
                case note_types.normal: case note_types.long_start: case note_types.long_end: case note_types.set_wonderful:
                    note_count += 1;
                    chart_notes.push({ id, note_type, note_action, note_position: note_position as 1 | 2, call_time });
                    if (gimmick_id !== 0) {
                        chart_notes_by_gimmick_id.has(gimmick_id) || chart_notes_by_gimmick_id.set(gimmick_id, { note_gimmick_type: null, note_gimmick_icon_type: null, skill_master_id: null, note_ids: [] });
                        chart_notes_by_gimmick_id.get(gimmick_id).note_ids.push(note_count);
                    }
                    break;
                case note_types.ac_start:
                    chart_waves_by_wave_id.set(wave_id, { mission_type: null, target_1: null, start_at_note: note_count + 1, end_at_note: null, failure_damage: null, success_voltage: null });
                    break;
                case note_types.ac_end:
                    chart_waves_by_wave_id.get(wave_id).end_at_note = note_count;
                    //30014102
                    if (gimmick_id !== 0) {
                        chart_notes_by_gimmick_id.has(gimmick_id) || chart_notes_by_gimmick_id.set(gimmick_id, { note_gimmick_type: null, note_gimmick_icon_type: null, skill_master_id: null, note_ids: [] });
                        chart_notes_by_gimmick_id.get(gimmick_id).note_ids.push(note_count);
                    }
                    break;
                default:
                    console.log(difficulty.live_difficulty_id);
                    throw `unknown note type ${note_type}`;
            }
            return note_count;
        }, 0);
        //collect note gimmick and AC gimmick with chart
        chart.note_gimmicks.forEach(({ id: gimmick_id, note_gimmick_type, icon_type: note_gimmick_icon_type, effect_m_id: skill_master_id }) => {
            if (!chart_notes_by_gimmick_id.has(gimmick_id))
                return; // ignore SBL gimmick (does not in chart.live_notes.gimmick_id)
            const ref = chart_notes_by_gimmick_id.get(gimmick_id);
            [ref.note_gimmick_type, ref.note_gimmick_icon_type, ref.skill_master_id] = [note_gimmick_type, note_gimmick_icon_type, skill_master_id];
        });
        //????????????gimmick??????
        gimmick_notes.forEach(({ id: gimmick_id, note_id, note_gimmick_type, note_gimmick_icon_type, skill_master_id, name }) => {
            let ref = chart_notes_by_gimmick_id.get(gimmick_id);
            if (!ref) {
                if (skill_master_id === 50023801) {
                    //???SBL?????????????????????400?????????????????????????????????
                    ref = chart_notes_by_gimmick_id.get(50000122) || chart_notes_by_gimmick_id.get(50000422);
                } else console.log(11415, difficulty.live_difficulty_id, gimmick_notes, chart.note_gimmicks, chart_notes_by_gimmick_id, skill_master_id);
            }
            if (ref.skill_master_id) return;
            [ref.note_gimmick_type, ref.note_gimmick_icon_type, ref.skill_master_id] = [note_gimmick_type, note_gimmick_icon_type, skill_master_id];
        });

        chart.live_wave_settings.forEach(({ id, mission_type: unused, arg_1: unused2, reward_voltage, wave_damage }) => {
            const ref = chart_waves_by_wave_id.get(id);
            //??????No brand girls?????????AC??????
            for (const { wave_id, name } of gimmick_waves.values()) {
                if (id === wave_id) {
                    const { mission_type, arg_1 } = WaveMissionNames.parse_name(name);
                    [ref.mission_type, ref.target_1, ref.success_voltage, ref.failure_damage] = [mission_type, arg_1, reward_voltage, wave_damage];
                    return;
                }
            }
        });
    } else {
        gimmick_notes.forEach(({ id: gimmick_id, note_id, note_gimmick_type, note_gimmick_icon_type, skill_master_id, name }) => {
            chart_notes_by_gimmick_id.has(gimmick_id) || chart_notes_by_gimmick_id.set(gimmick_id, { note_gimmick_type, note_gimmick_icon_type, skill_master_id, note_ids: [] });
            chart_notes_by_gimmick_id.get(gimmick_id).note_ids.push("???");
        });
        gimmick_waves.forEach(({ wave_id, name }) => {
            const { mission_type, arg_1: target_1 } = WaveMissionNames.parse_name(name);
            chart_waves_by_wave_id.set(wave_id, { mission_type, target_1, start_at_note: null, end_at_note: null, success_voltage: null, failure_damage: null });
        });
    }

    const descriptions_live = await Promise.all(gimmick_lives.map(async ({ skill_master_id, name, description }, index): Promise<string> => {
        const { skill_effect_1, skill_effect_2, skill_target_1, skill_target_2 } = await masterdata.fetch_skill(skill_master_id);
        return `{{GimmickLive2|LID=${index + 1}|TARG=${skill_target_1.id}|ET=${skill_master_id === 50000001 ? 1 : skill_effect_1.effect_type}|EV=${skill_effect_1.effect_value}|CALC=${skill_effect_1.calc_type}|HINT=??????????????????{{ja|${description.slice(7)}}}}}`;
    }));

    const epilog = {
        chart_note_count,
        natural_damage_rate_100: 0,
        in_appeal_chance_notes: 0,
        minimum_damage_note: undefined,//TODO: how to describe?
        maximum_damage_note_on_success: chart_note_count,
        total_special_damage: 0,
        total_success_voltage: 0,
        total_success_voltage_rate_100: undefined,
        total_failure_damage: 0,
        total_failure_damage_rate_100: undefined,
    };

    const parms_note_p: Promise<string>[] = [];
    for (const [gimmick_id, { note_gimmick_type, note_gimmick_icon_type, skill_master_id, note_ids }] of chart_notes_by_gimmick_id.entries()) {
        const parms = (async () => {
            const [, name] = (await dictionary_ja_k.get(`k.live_detail_notes_name_${gimmick_id}`)).match(/^<img .+\/>(.+)$/);
            const { skill_effect_1, skill_effect_2, skill_target_1, skill_target_2 } = await masterdata.fetch_skill(skill_master_id).catch((e) => {
                console.log(difficulty.live_difficulty_id, gimmick_notes, chart.note_gimmicks, chart_notes_by_gimmick_id, skill_master_id, e);
                throw "";
            })
            // const SE_2 = skill_target_2 ? `|${skill_target_2.id}|${skill_effect_2.effect_type}|${skill_effect_2.effect_value}|${skill_effect_2.calc_type}|${skill_effect_2.finish_type}|${skill_effect_2.finish_value}` : "";
            //<epilog>
            if ([52, 154].indexOf(skill_effect_1.effect_type) !== -1)
                epilog.total_special_damage += skill_effect_1.effect_value;
            //</epilog>
            const parms = `NAME={{ja|${name}}}|NT=${note_gimmick_type}|TARG=${skill_target_1.id}|ET=${skill_master_id === 50000001 ? 1 : skill_effect_1.effect_type}|EV=${skill_effect_1.effect_value}|CALC=${skill_effect_1.calc_type}|FT=${skill_effect_1.finish_type}|FV=${skill_effect_1.finish_value}|${note_ids.join("|")}`;
            return parms;
        })();
        parms_note_p.push(parms);
    }
    const descriptions_note = (await Promise.all(parms_note_p)).map((s, i) => `{{GimmickNote2|LID=${i + 1}|${s}}}`);
    const range_note = (await Promise.all(parms_note_p)).map((s, i) => `{{GimmickNoteRange|LID=${i + 1}|${s}}}`);

    epilog.natural_damage_rate_100 = ((suggested_stamina, natural_damage, total_notes, sugg_rate = 1) => {
        const base = Math.ceil(suggested_stamina / total_notes * sugg_rate);
        const rate = Math.ceil(natural_damage / base * 100);
        return Math.floor(base * rate / 100) === natural_damage && rate;
    })(difficulty.recommended_stamina, difficulty_const.note_stamina_reduce, chart_note_count, 1);

    //epilog success_voltage_rate and failure_damage_rate
    //const success_voltages = [] as number[], failure_damages = [] as number[];
    const parms_wave = await Promise.all(gimmick_waves.map(async ({ wave_id, state, skill_id }, index) => {
        // TODO: PARTIALLY chart replace
        const { skill_effect_1, skill_effect_2, skill_target_1, skill_target_2 } = await masterdata.fetch_skill(skill_id);
        const { mission_type, target_1, start_at_note, end_at_note, success_voltage, failure_damage } = chart_waves_by_wave_id.get(wave_id);
        // TODO: calculate skill-ac pass rate
        const MN = start_at_note ? `MT=${mission_type}|ARG=${target_1}|BEG=${start_at_note}|END=${end_at_note}|VO=${success_voltage}|DMG=${failure_damage}` : `MT=${mission_type}|ARG=${target_1}`;
        // const SE_2 = ``;
        const SE = `WS=${state}|TARG=${skill_target_1.id}|ET=${skill_id === 50000001 ? 1 : skill_effect_1.effect_type}|EV=${skill_effect_1.effect_value}|CALC=${skill_effect_1.calc_type}|FT=${skill_effect_1.finish_type}|FV=${skill_effect_1.finish_value}`;
        //<epilog>
        if ([52, 154].indexOf(skill_effect_1.effect_type) !== -1)
            epilog.total_special_damage += skill_effect_1.effect_value;
        if (start_at_note /* same to if(chart) */) {
            epilog.in_appeal_chance_notes += end_at_note - start_at_note + 1;
            epilog.maximum_damage_note_on_success += 0.1 * (end_at_note - start_at_note);
            if (mission_type === wave_mission_types.gain_voltage_sp)
                epilog.maximum_damage_note_on_success -= 1.1;
            epilog.total_success_voltage += success_voltage;
            epilog.total_failure_damage += failure_damage;
            // TODO: PARTIALLY chart replace
            //success_voltages.push(success_voltage);
            //failure_damages.push(failure_damage);
        }
        //</epilog>
        return `LID=${index + 1}|${SE}|${MN}`;

    }));
    const descriptions_wave = parms_wave.map((s) => `{{GimmickWave2|${s}}}`);
    const range_wave = parms_wave.map((s) => `{{GimmickWaveRange|${s}}}`);

    //epilog success_voltage_rate and failure_damage_rate
    //??????
    return { difficulty, difficulty_const, descriptions_live, descriptions_note, descriptions_wave, range_note, range_wave, epilog, is_complete: !!chart_note_count };
}

async function main() {

    try { await fsPromises.stat(DATA_CACHE) } catch (e) { await fsPromises.mkdir(DATA_CACHE); }
    try { await fsPromises.stat("./audio_cache/") } catch (e) { await fsPromises.mkdir("./audio_cache/"); }

    const page_map_live = await grouping_2d_3d();

    //const text = await page_generation(...page_map_live.get("Hop? Stop? Nonstop!"));
    //console.log(text);

    
    page_map_live.forEach(async (l, n) => {
        const text = await page_generation(...page_map_live.get(n));
        if (!text) return;
        const file_n = n.split('\\').join('%5C').split('/').join('%2F').split(':').join('%3A').split('*').join('%2A').split('?').join('%3F').split('"').join('%22').split('<').join('%3C').split('>').join('%3E').split('|').join('%7C');
        try {
            const text_old = (await fsPromises.readFile(`./pages/${file_n}.txt`)).toString();
            const hash_old = crypt.createHash('md5'), hash = crypt.createHash('md5');
            hash_old.update(text_old);
            hash.update(text);
            const a = hash_old.digest('hex'), b = hash.digest('hex');
            if (a !== b) {
                console.log(n, a, "->", b);
                throw null;
            }
        } catch (e) {
            try { await fsPromises.stat(`./pages/`) } catch (e) { await fsPromises.mkdir(`./pages/`); }
            await fsPromises.writeFile(`./pages/${file_n}.txt`, text);
        }
    });
    
    
    /*
    for (const [n, l] of page_map_live.entries()) {
        const text = await page_generation(...page_map_live.get(n));
        if (!text) return;
        const file_n = n.split('\\').join('%5C').split('/').join('%2F').split(':').join('%3A').split('*').join('%2A').split('?').join('%3F').split('"').join('%22').split('<').join('%3C').split('>').join('%3E').split('|').join('%7C');
        try {
            const text_old = (await fsPromises.readFile(`./pages/${file_n}.txt`)).toString();
            const hash_old = crypt.createHash('md5'), hash = crypt.createHash('md5');
            hash_old.update(text_old);
            hash.update(text);
            const a = hash_old.digest('hex'), b = hash.digest('hex');
            if (a !== b) {
                console.log(n, a, "->", b);
                throw null;
            }
        } catch (e) {
            try { await fsPromises.stat(`./pages/`) } catch (e) { await fsPromises.mkdir(`./pages/`); }
            await fsPromises.writeFile(`./pages/${file_n}.txt`, text);
        }
    }
    */
}
main();

// in Step 3
const live_base_info_gen = async (live_ids: number[]) => {
    //???LiveID: 1???4???5???????????????live_id???????????????????????????
    const live_id = live_ids[1] || live_ids[4] || live_ids[5];
    if (!live_id) return null;
    const { name, pronunciation, member_group, member_unit, original_deck_name, copyright, source, jacket, is_2d_live, music_id, live_member_mapping_id } = await masterdata.fetch_live(live_id);
    const duration_sec = await get_music_duration(music_id) as number, duration_sec_fixed2 = duration_sec ? duration_sec.toFixed(2) : null;
    const member_mapping_by_position = await masterdata.fetch_member_mapping(live_member_mapping_id);
    let center_count = 0;
    const member_mapping_texts = [12, 10, 8, 6, 4, 2, 1, 3, 5, 7, 9, 11].map((position) => {
        if (!member_mapping_by_position.get(position))
            return { line0_cell: null, line1_cell: null, line2_cell: null }; //position fullfilled
        const { is_center, member_master_id, thumbnail, card_master_id } = member_mapping_by_position.get(position);
        if (is_center) center_count += 1;
        /* TODO: find suit sets in shop */
        let line1_cell: string, line2_cell: string;
        line1_cell = `<ASCharaIcon id=${member_master_id} w=80/>`;
        if (card_master_id)
            line2_cell = `[[${{ 1: "???????????????", 2: "????????????", 3: "?????????", 4: "????????????", 5: "?????????", 6: "???????????????", 7: "?????????", 8: "????????????", 9: "????????????", 101: "????????????", 102: "????????????", 103: "????????????", 104: "????????????", 105: "?????????", 106: "????????????", 107: "???????????????", 108: "????????????", 109: "????????????", 201: "????????????", 202: "?????????", 203: "?????????", 204: "????????????", 205: "?????????", 206: "????????????", 207: "????????????", 208: "?????????????????", 209: "???????????????", 210: "????????????", 211: "??????????????", 212: "?????????" }[member_master_id]}#card_long_id_${card_master_id}|<ASImg id=${thumbnail} w=80/>]]`;
        else if (thumbnail)
            line2_cell = `<ASImg id=${thumbnail} w=80/>`;
        else
            line2_cell = null;
        return { line0_cell: position.toString() + (is_center ? " (Center)" : ""), line1_cell, line2_cell };
    }).filter(({ line0_cell }) => line0_cell);

    console.log(name, duration_sec_fixed2 ? (duration_sec_fixed2 + "???") : "??????");
    const text = `<div class=base-info>
<ASImg id=${jacket} w=256/>

<strong>{{ja|${name}}}</strong>

<div>
<strong>????????????</strong>???${{ 1: "??'s", 2: "Aqours", 3: "?????????????????????????????????", 4: "Liella!" }[member_group]}

<strong>?????????3D MV</strong>???${is_2d_live ? "???" : "???"}

<strong>SIFAS??????????????????</strong>???${duration_sec_fixed2 ? (duration_sec_fixed2 + "???") : "??????"}

{{LiveUnlockMethod|${live_id}}}
</div>

{| class="wikitable" style="text-align:center"
|-
! ${member_mapping_texts.map(a => a.line0_cell).join(" \n! ")} 
|-
| ${member_mapping_texts.map(a => a.line1_cell).join(" \n| ")} 
${member_mapping_texts.map(a => a.line2_cell).filter(a => a).join(" \n| ").length ? `|-
| ${member_mapping_texts.map(a => a.line2_cell).join(" \n| ")} 
` : ""}|}

</div>`;
    return { live_id, text, center_count };
    //
    //<strong>SIFAS??????????????????</strong>???${duration_sec_fixed2 + "???" || "??????"}
};
