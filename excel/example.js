"use strict";
const fs = require("fs");
const xlsx = require("xlsx");
const sqlite = require("sqlite3");
const util = require("util");
sqlite.Database.prototype.All = util.promisify(sqlite.Database.prototype.all);
const masterdata = new sqlite.Database("../masterdata.db");

const table_column = (number) => {
    if (number < 1) throw `number ${number} < 1`;
    if (number > 702) throw `number ${number} > 702`;
    let code = [];
    code[1] = (number - 1) % 26 + 65;
    number = Math.floor((number - 1) / 26);
    if (number) code[0] = number + 64;
    return code.map(c => String.fromCharCode(c)).join("");
}

const workbook = xlsx.readFile("example.xlsm");
const main = async () => {
    const sheet = workbook.Sheets["卡片强度"];
    const structure = {};
    let classify_line2 = null;
    for (let col = 2; col <= 146; col++) {
        const line2 = sheet[`${table_column(col)}2`];
        const line3 = sheet[`${table_column(col)}3`];
        if (!line3) continue;
        if (line2) structure[line2.v] = {};
        classify_line2 = line2 || classify_line2;
        structure[classify_line2.v][line3.v] = table_column(col);
    }
    const card_lines = [];
    for (let line = 4; line < 10000; line++) {
        const card_master_id = sheet[`${structure["卡片基本属性"]["数据库ID"]}${line}`];
        if (card_master_id) {
            card_lines.push(line);
        }
    }
    const results = [];

    //前排输出
    {
        const border = [100, 95, 90, 85, 80, 75, 70, 65];//1
        const multipler = 100;
        const border_description = ["SS", "S+", "S-", "A+", "A-", "B+", "B-", "C+"];//2
        const texts = [[], [], [], [], [], [], [], []];//3
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["卡片基本属性"]["数据库ID"]}${line}`].v;
                const data_details = {
                    合计输出: sheet[`${structure["前排强度"]["输出"]}${line}`].v,
                    表现: sheet[`${structure["按键无溢出强度"]["输出"]}${line}`].v,
                    类型: sheet[`${structure["类型强度"]["输出"]}${line}`].v,
                    合宿: sheet[`${structure["槽强度"]["输出"]}${line}`].v,
                    特技1: sheet[`${structure["技能1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能1强度"]["输出"]}${line}`].v,
                    特技2: sheet[`${structure["技能2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能2强度"]["输出"]}${line}`].v,
                    被动个性1: sheet[`${structure["被动个性1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性1强度"]["前排输出"]}${line}`].v,
                    被动个性2: sheet[`${structure["被动个性2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性2强度"]["前排输出"]}${line}`].v,
                    主动个性1: sheet[`${structure["主动个性1强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性1强度"]["前排输出"]}${line}`].v,
                    主动个性2: sheet[`${structure["主动个性2强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性2强度"]["前排输出"]}${line}`].v,
                };
                const data = sheet[`${structure["前排强度"]["相对输出"]}${line}`].v;
                try {
                    const [{ member_m_id, card_rarity_type, card_attribute, role }] = await masterdata.All(`select member_m_id,card_rarity_type,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [Math.floor(member_m_id / 100), 1, 2, 3, 4, card_rarity_type / 10, card_attribute, role] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data_details.合计输出 - a.data_details.合计输出)
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data < border[border_index] / multipler) border_index += 1;
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`<span class="button-switch-display" data-BSD-Condition="(100${filters[0]}&#124;1050)&(150${filters[5]}&#124;1550)&(160${filters[6]}&#124;1650)&(170${filters[7]
                    }&#124;1750)" data-hover-text="${[
                        `合计输出: ${parseInt(data_details.合计输出)}`,
                        `点击得分: ${parseInt(data_details.表现)}`,
                        `类型: ${parseInt(data_details.类型)}`,
                        /* SP槽补正: 没有SR/R 不用 */
                        `合宿技能: ${parseInt(data_details.合宿)}`,
                        `特技: ${parseInt(data_details.特技1)}${typeof data_details.特技2 === "number" ? ` + ${parseInt(data_details.特技2)}` : ""}`,
                        `个性1: ${parseInt(data_details.被动个性1)}${typeof data_details.被动个性2 === "number" ? ` + ${parseInt(data_details.被动个性2)}` : ""}`,
                        `个性2: ${parseInt(data_details.主动个性1)}${typeof data_details.主动个性2 === "number" ? ` + ${parseInt(data_details.主动个性2)}` : ""}`,
                    ].join("&#10;")
                    }">{{CardLevelDescription|${card_master_id
                    }|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")}|{{{type|12}}}}}</span>`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `{{!}}- class="hover-swap-image-trigger" \n! ${border_description[border_index]}<br>${text_array.length} \n{{!}} ${range} \n{{!}} ${text_array.join("")}`;
        });
        results[0] = wikitable_lines;//4
    }
    //上限前排输出
    {
        const border = [120, 118, 116, 114, 112, 110, 108];//1
        const multipler = 100;
        const border_description = ["SS", "S+", "S-", "A+", "A-", "B+", "B-"];//2
        const texts = [[], [], [], [], [], [], []];//3
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["卡片基本属性"]["数据库ID"]}${line}`].v;
                const data_details = {
                    合计输出: sheet[`${structure["前排强度"]["真输出"]}${line}`].v,
                    表现: sheet[`${structure["按键真输出"]["真输出"]}${line}`].v,
                    类型: sheet[`${structure["类型强度"]["真输出"]}${line}`].v,
                    合宿: sheet[`${structure["槽强度"]["真输出"]}${line}`].v,
                    特技1: sheet[`${structure["技能1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能1强度"]["真输出"]}${line}`].v,
                    特技2: sheet[`${structure["技能2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能2强度"]["真输出"]}${line}`].v,
                    被动个性1: sheet[`${structure["被动个性1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性1强度"]["真输出"]}${line}`].v,
                    被动个性2: sheet[`${structure["被动个性2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性2强度"]["真输出"]}${line}`].v,
                    主动个性1: sheet[`${structure["主动个性1强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性1强度"]["真输出"]}${line}`].v,
                    主动个性2: sheet[`${structure["主动个性2强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性2强度"]["真输出"]}${line}`].v,
                };
                const data = sheet[`${structure["前排强度"]["相对真输出"]}${line}`].v;
                try {
                    const [{ member_m_id, card_rarity_type, card_attribute, role }] = await masterdata.All(`select member_m_id,card_rarity_type,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [Math.floor(member_m_id / 100), 1, 2, 3, 4, card_rarity_type / 10, card_attribute, role] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data_details.合计输出 - a.data_details.合计输出)
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data < border[border_index] / multipler) border_index += 1;
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`<span class="button-switch-display" data-BSD-Condition="(100${filters[0]}&#124;1050)&(150${filters[5]}&#124;1550)&(160${filters[6]}&#124;1650)&(170${filters[7]
                    }&#124;1750)" data-hover-text="${[
                        `合计输出: ${parseInt(data_details.合计输出)}`,
                        `点击得分: ${parseInt(data_details.表现)}`,
                        `类型: ${parseInt(data_details.类型)}`,
                        /* SP槽补正: 没有SR/R 不用 */
                        `合宿技能: ${parseInt(data_details.合宿)}`,
                        `特技: ${parseInt(data_details.特技1)}${typeof data_details.特技2 === "number" ? ` + ${parseInt(data_details.特技2)}` : ""}`,
                        `个性1: ${parseInt(data_details.被动个性1)}${typeof data_details.被动个性2 === "number" ? ` + ${parseInt(data_details.被动个性2)}` : ""}`,
                        `个性2: ${parseInt(data_details.主动个性1)}${typeof data_details.主动个性2 === "number" ? ` + ${parseInt(data_details.主动个性2)}` : ""}`,
                    ].join("&#10;")
                    }">{{CardLevelDescription|${card_master_id
                    }|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")}|{{{type|12}}}}}</span>`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `{{!}}- class="hover-swap-image-trigger" \n! ${border_description[border_index]}<br>${text_array.length} \n{{!}} ${range} \n{{!}} ${text_array.join("")}`;
        });
        results[1] = wikitable_lines;//4
    }
    //奶盾输出
    {
        const border = [70, 65, 60, 55, 50, 45, 40, 0];//1
        const multipler = 100;
        const border_description = ["B-", "C+", "C-", "D+", "D-", "E+", "E-", "F"];//2
        const texts = [[], [], [], [], [], [], [], []];//3
        (await Promise.all(card_lines
            .filter((line) => {
                return sheet[`${structure["卡片基本属性"]["稀有度"]}${line}`].v === "UR"
                    && (sheet[`${structure["技能1强度"]["类型"]}${line}`].v === "回血" || sheet[`${structure["技能1强度"]["类型"]}${line}`].v === "加盾" || sheet[`${structure["技能2强度"]["类型"]}${line}`].v === "回血" || sheet[`${structure["技能2强度"]["类型"]}${line}`].v === "加盾")
            })
            .map(async (line) => {
                const card_master_id = sheet[`${structure["卡片基本属性"]["数据库ID"]}${line}`].v;
                const data_details = {
                    合计输出: sheet[`${structure["前排强度"]["输出"]}${line}`].v,
                    表现: sheet[`${structure["按键无溢出强度"]["输出"]}${line}`].v,
                    类型: sheet[`${structure["类型强度"]["输出"]}${line}`].v,
                    合宿: sheet[`${structure["槽强度"]["输出"]}${line}`].v,
                    特技1: sheet[`${structure["技能1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能1强度"]["输出"]}${line}`].v,
                    特技2: sheet[`${structure["技能2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能2强度"]["输出"]}${line}`].v,
                    被动个性1: sheet[`${structure["被动个性1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性1强度"]["前排输出"]}${line}`].v,
                    被动个性2: sheet[`${structure["被动个性2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性2强度"]["前排输出"]}${line}`].v,
                    主动个性1: sheet[`${structure["主动个性1强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性1强度"]["前排输出"]}${line}`].v,
                    主动个性2: sheet[`${structure["主动个性2强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性2强度"]["前排输出"]}${line}`].v,
                };
                const data = sheet[`${structure["前排强度"]["相对输出"]}${line}`].v;
                try {
                    const [{ member_m_id, card_rarity_type, card_attribute, role }] = await masterdata.All(`select member_m_id,card_rarity_type,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [Math.floor(member_m_id / 100), 1, 2, 3, 4, card_rarity_type / 10, card_attribute, role] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data_details.合计输出 - a.data_details.合计输出)
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data < border[border_index] / multipler) border_index += 1;
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`<span class="button-switch-display" data-BSD-Condition="(100${filters[0]}&#124;1050)&(150${filters[5]}&#124;1550)&(160${filters[6]}&#124;1650)&(170${filters[7]
                    }&#124;1750)" data-hover-text="${[
                        `合计输出: ${parseInt(data_details.合计输出)}`,
                        `点击得分: ${parseInt(data_details.表现)}`,
                        `类型: ${parseInt(data_details.类型)}`,
                        /* SP槽补正: 没有SR/R 不用 */
                        `合宿技能: ${parseInt(data_details.合宿)}`,
                        `特技: ${parseInt(data_details.特技1)}${typeof data_details.特技2 === "number" ? ` + ${parseInt(data_details.特技2)}` : ""}`,
                        `个性1: ${parseInt(data_details.被动个性1)}${typeof data_details.被动个性2 === "number" ? ` + ${parseInt(data_details.被动个性2)}` : ""}`,
                        `个性2: ${parseInt(data_details.主动个性1)}${typeof data_details.主动个性2 === "number" ? ` + ${parseInt(data_details.主动个性2)}` : ""}`,
                    ].join("&#10;")
                    }">{{CardLevelDescription|${card_master_id
                    }|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")}|{{{type|12}}}}}</span>`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `{{!}}- class="hover-swap-image-trigger" \n! ${border_description[border_index]}<br>${text_array.length} \n{{!}} ${range} \n{{!}} ${text_array.join("")}`;
        });
        results[2] = wikitable_lines;//4
    }
    //奶盾耐久
    {
        const border = [1150, 1000, 850, 700, 550, 400, 0];//1
        const multipler = 1;
        const border_description = ["SS", "S", "A", "B", "C", "D", "E"];//2
        const texts = [[], [], [], [], [], [], []];//3
        (await Promise.all(card_lines
            .filter((line) => {
                return sheet[`${structure["卡片基本属性"]["稀有度"]}${line}`].v === "UR"
                    && (sheet[`${structure["技能1强度"]["类型"]}${line}`].v === "回血" || sheet[`${structure["技能1强度"]["类型"]}${line}`].v === "加盾" || sheet[`${structure["技能2强度"]["类型"]}${line}`].v === "回血" || sheet[`${structure["技能2强度"]["类型"]}${line}`].v === "加盾")
            })
            .map(async (line) => {
                const card_master_id = sheet[`${structure["卡片基本属性"]["数据库ID"]}${line}`].v;
                //const epilog = sheet[`${structure["前排强度"]["输出"]}${line}`].v;
                const data = sheet[`${structure["前排强度"]["耐久/键"]}${line}`].v;
                try {
                    const [{ member_m_id, card_rarity_type, card_attribute, role }] = await masterdata.All(`select member_m_id,card_rarity_type,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, /*epilog,*/ data, filters: [Math.floor(member_m_id / 100), 1, 2, 3, 4, card_rarity_type / 10, card_attribute, role] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data - a.data)//5
            .reduce((border_index, { card_master_id, /*epilog,*/ data, filters }) => {
                while (typeof border[border_index] === "number" && data < border[border_index] / multipler) border_index += 1;//6
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`<span class="button-switch-display" data-BSD-Condition="(100${filters[0]}&#124;1050)&(150${filters[5]}&#124;1550)&(160${filters[6]}&#124;1650)&(170${filters[7]}&#124;1750)">{{CardLevelDescription|${card_master_id}|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")}|{{{type|12}}}}}</span>`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `{{!}}- class="hover-swap-image-trigger" \n! ${border_description[border_index]}<br>${text_array.length} \n{{!}} ${range} \n{{!}} ${text_array.join("")}`;
        });
        results[3] = wikitable_lines;//4
    }
    return results;
}
const main_2_1 = async () => {
    const sheet = workbook.Sheets["奶盾强度计算"];
    const structure = {};
    let classify_line2 = null;
    for (let col = 2; col <= 20; col++) {
        const line2 = sheet[`${table_column(col)}2`];
        const line3 = sheet[`${table_column(col)}3`];
        if (!line3) continue;
        if (line2) structure[line2.v] = {};
        classify_line2 = line2 || classify_line2;
        structure[classify_line2.v][line3.v] = table_column(col);
    }

    const results = [];
    {
        const card_lines = [];
        for (let line = 4; line < 10000; line++) {
            const card_master_id = sheet[`${structure["切队奶强度"]["ID"]}${line}`];
            if (card_master_id) card_lines.push(line);
        }
        const border = [109500, 108000, 106500, 105000, 102500];
        const multipler = 1;
        const border_description = ["A-", "B+", "B-", "C+", "C-"];
        const texts = [[], [], [], [], []];
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["切队奶强度"]["ID"]}${line}`].v;
                //const epilog = sheet[`${structure["前排强度"]["输出"]}${line}`].v;
                const data = sheet[`${structure["切队奶强度"]["平均"]}${line}`].v;
                try {
                    const [{ member_m_id, card_rarity_type, card_attribute, role }] = await masterdata.All(`select member_m_id,card_rarity_type,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, /*epilog,*/ data, filters: [Math.floor(member_m_id / 100), 1, 2, 3, 4, card_rarity_type / 10, card_attribute, role] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data - a.data)//5
            .reduce((border_index, { card_master_id, /*epilog,*/ data, filters }) => {
                while (typeof border[border_index] === "number" && data < border[border_index] / multipler) border_index += 1;//6
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`<span class="button-switch-display" data-BSD-Condition="(100${filters[0]}&#124;1050)&(150${filters[5]}&#124;1550)&(160${filters[6]}&#124;1650)&(170${filters[7]}&#124;1750)">{{CardLevelDescription|${card_master_id}|${Math.floor(data * multipler).toString()}|{{{type|12}}}}}</span>`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            //const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `{{!}}- class="hover-swap-image-trigger" \n! ${border_description[border_index]}<br>${text_array.length} \n{{!}} ${text_array.join("")}`;
            //return `{{!}}- class="hover-swap-image-trigger" \n! ${border_description[border_index]}<br>${text_array.length} \n{{!}} ${range} \n{{!}} ${text_array.join("")}`;
        });
        results[0] = wikitable_lines;//4
    }
    {
        const card_lines = [];
        for (let line = 4; line < 10000; line++) {
            const card_master_id = sheet[`${structure["站撸奶强度"]["ID"]}${line}`];
            if (card_master_id) card_lines.push(line);
        }
        const border = [90000, 86000, 82000, 78000, 74000, 70000, 66000, 62000, 58000, 54000, 0];
        const multipler = 1;
        const border_description = ["S-", "A+", "A-", "B+", "B-", "C+", "C-", "D+", "D-", "E+", "E-"];
        const texts = [[], [], [], [], [], [], [], [], [], [], []];
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["站撸奶强度"]["ID"]}${line}`].v;
                //const epilog = sheet[`${structure["前排强度"]["输出"]}${line}`].v;
                const data = sheet[`${structure["站撸奶强度"]["平均"]}${line}`].v;
                try {
                    const [{ member_m_id, card_rarity_type, card_attribute, role }] = await masterdata.All(`select member_m_id,card_rarity_type,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, /*epilog,*/ data, filters: [Math.floor(member_m_id / 100), 1, 2, 3, 4, card_rarity_type / 10, card_attribute, role] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data - a.data)//5
            .reduce((border_index, { card_master_id, /*epilog,*/ data, filters }) => {
                while (typeof border[border_index] === "number" && data < border[border_index] / multipler) border_index += 1;//6
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`<span class="button-switch-display" data-BSD-Condition="(100${filters[0]}&#124;1050)&(150${filters[5]}&#124;1550)&(160${filters[6]}&#124;1650)&(170${filters[7]}&#124;1750)">{{CardLevelDescription|${card_master_id}|${Math.floor(data * multipler).toString()}|{{{type|12}}}}}</span>`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            //const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `{{!}}- class="hover-swap-image-trigger" \n! ${border_description[border_index]}<br>${text_array.length} \n{{!}} ${text_array.join("")}`;
            //return `{{!}}- class="hover-swap-image-trigger" \n! ${border_description[border_index]}<br>${text_array.length} \n{{!}} ${range} \n{{!}} ${text_array.join("")}`;
        });
        results[1] = wikitable_lines;//4
    }

    return results;
}
Promise.all([main(), main_2_1()]).then(([[lnes_frontline_voltage, capped, healer_voltage, healer_heal], [healer_2st, healer_1st]]) => {
    const template = fs.readFileSync("template.txt").toString();
    const result = template
        .replace("{0}", lnes_frontline_voltage.join("\n"))
        .replace("{1}", capped.join("\n"))
        .replace("{2}", healer_voltage.join("\n"))
        .replace("{3}", healer_heal.join("\n"))
        .replace("{21}", healer_1st.join("\n"))
        .replace("{22}", healer_2st.join("\n"));
    fs.writeFileSync("Template%COLON%LevelExcel.txt", result);
});
