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
        const border = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45];//1
        const multipler = 100;
        const border_description = ["SS+", "SS-", "S+", "S-", "A+", "A-", "B+", "B-", "C+", "C-", "D+", "D-"];//2
        const texts = border.map(() => []);
        const line_filters = border.map(() => [0, 1, 2, 3, 4, [], [], [], 8, 9, []]);
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["卡片基本属性"]["数据库ID"]}${line}`].v;
                const data_details = {
                    合计输出: sheet[`${structure["前排强度"]["输出"]}${line}`].v,
                    表现: sheet[`${structure["按键无溢出强度"]["输出"]}${line}`].v,
                    类型: sheet[`${structure["类型强度"]["输出"]}${line}`].v,
                    SP槽补正: sheet[`${structure["SP槽补正"]["输出"]}${line}`].v,
                    合宿: sheet[`${structure["槽强度"]["输出"]}${line}`].v,
                    特技1: sheet[`${structure["技能1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能1强度"]["输出"]}${line}`].v,
                    特技2: sheet[`${structure["技能2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能2强度"]["输出"]}${line}`].v,
                    被动个性1: sheet[`${structure["被动个性1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性1强度"]["前排输出"]}${line}`].v,
                    被动个性2: sheet[`${structure["被动个性2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性2强度"]["前排输出"]}${line}`].v,
                    主动个性1: sheet[`${structure["主动个性1强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性1强度"]["前排输出"]}${line}`].v,
                    主动个性2: sheet[`${structure["主动个性2强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性2强度"]["前排输出"]}${line}`].v,
                };
                const data = sheet[`${structure["前排强度"]["输出"]}${line}`].v / 86013;
                try {
                    const [{ member_m_id, sp_point, card_attribute, role }] = await masterdata.All(`select member_m_id,sp_point,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [0, 1, 2, 3, 4, sp_point, card_attribute, role, 8, 9, member_m_id] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data_details.合计输出 - a.data_details.合计输出)
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data * multipler < border[border_index]) border_index += 1;
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`{{CardIconText|${card_master_id}|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")
                    }|char=${filters[10]}|sppt=${filters[5]}|attr=${filters[6]}|type=${filters[7]
                    }|hover=${[
                        `合计输出: ${parseInt(data_details.合计输出)}`,
                        `点击得分: ${parseInt(data_details.表现)}`,
                        `类型: ${parseInt(data_details.类型)}`,
                        filters[5] < 3 ? `SP槽补正: ${parseInt(data_details.SP槽补正)}` : null,
                        `合宿技能: ${parseInt(data_details.合宿)}`,
                        `特技: ${parseInt(data_details.特技1)}${typeof data_details.特技2 === "number" ? ` + ${parseInt(data_details.特技2)}` : ""}`,
                        `个性1: ${parseInt(data_details.被动个性1)}${typeof data_details.被动个性2 === "number" ? ` + ${parseInt(data_details.被动个性2)}` : ""}`,
                        `个性2: ${parseInt(data_details.主动个性1)}${typeof data_details.主动个性2 === "number" ? ` + ${parseInt(data_details.主动个性2)}` : ""}`,
                    ].join("&#10;")}}}`);
                [5, 6, 7, 10].forEach((filter_type) => {
                    line_filters[border_index][filter_type][filters[filter_type]] = true;
                })
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            line_filters[border_index].map((i, filter_type) => {
                if (typeof i !== "object" || Object.keys(i).length === 0) return null;
                return `(${i.map((val, ind) => `${1000 * filter_type + ind}`).join("|")})`;
            });
            return `|- class="hover-swap-image-trigger" \n! style="text-align:center;" | <div class="grid-alter" style="grid-gap:1rem 1rem;"><div>${border_description[border_index]}&#10;${text_array.length}</div><div>${range}</div></div> \n| ${text_array.join(" ")}`;
        });
        results[0] = wikitable_lines;//4
    }
    //上限前排输出
    {
        const border = [123, 121, 119, 117, 115, 113, 111];//1
        const multipler = 100;
        const border_description = ["SS+", "SS-", "S+", "S-", "A+", "A-", "B+"];//2
        const texts = border.map(() => []);
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
                const data = sheet[`${structure["前排强度"]["真输出"]}${line}`].v / 20000;
                try {
                    const [{ member_m_id, sp_point, card_attribute, role }] = await masterdata.All(`select member_m_id,sp_point,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [0, 1, 2, 3, 4, sp_point, card_attribute, role, 8, 9, member_m_id] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data_details.合计输出 - a.data_details.合计输出)
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data * multipler < border[border_index]) border_index += 1;
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`{{CardIconText|${card_master_id}|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")
                    }|char=${filters[10]}|sppt=${filters[5]}|attr=${filters[6]}|type=${filters[7]
                    }|hover=${[
                        `合计输出: ${parseInt(data_details.合计输出)}`,
                        `点击得分: ${parseInt(data_details.表现)}`,
                        `类型: ${parseInt(data_details.类型)}`,
                        /* SP槽补正: 没有SR/R 不用 */
                        `合宿技能: ${parseInt(data_details.合宿)}`,
                        `特技: ${parseInt(data_details.特技1)}${typeof data_details.特技2 === "number" ? ` + ${parseInt(data_details.特技2)}` : ""}`,
                        `个性1: ${parseInt(data_details.被动个性1)}${typeof data_details.被动个性2 === "number" ? ` + ${parseInt(data_details.被动个性2)}` : ""}`,
                        `个性2: ${parseInt(data_details.主动个性1)}${typeof data_details.主动个性2 === "number" ? ` + ${parseInt(data_details.主动个性2)}` : ""}`,
                    ].join("&#10;")}}}`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `|- class="hover-swap-image-trigger" \n! style="text-align:center;" | <div class="grid-alter" style="grid-gap:1rem 1rem;"><div>${border_description[border_index]}&#10;${text_array.length}</div><div>${range}</div></div> \n| ${text_array.join(" ")}`;
        });
        results[1] = wikitable_lines;//4
    }
    //奶盾输出
    {
        const border = [70, 65, 60, 55, 50, 45, 40, 35, 0];//1
        const multipler = 100;
        const border_description = ["B+", "B-", "C+", "C-", "D+", "D-", "E+", "E-", "F"];//2
        const texts = border.map(() => []);
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
                    /* 特技1: sheet[`${structure["技能1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能1强度"]["输出"]}${line}`].v,
                    特技2: sheet[`${structure["技能2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["技能2强度"]["输出"]}${line}`].v, */
                    被动个性1: sheet[`${structure["被动个性1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性1强度"]["前排输出"]}${line}`].v,
                    被动个性2: sheet[`${structure["被动个性2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性2强度"]["前排输出"]}${line}`].v,
                    主动个性1: sheet[`${structure["主动个性1强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性1强度"]["前排输出"]}${line}`].v,
                    主动个性2: sheet[`${structure["主动个性2强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性2强度"]["前排输出"]}${line}`].v,
                };
                const data = sheet[`${structure["前排强度"]["输出"]}${line}`].v / 86013;
                try {
                    const [{ member_m_id, sp_point, card_attribute, role }] = await masterdata.All(`select member_m_id,sp_point,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [0, 1, 2, 3, 4, sp_point, card_attribute, role, 8, 9, member_m_id] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data_details.合计输出 - a.data_details.合计输出)
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data * multipler < border[border_index]) border_index += 1;
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`{{CardIconText|${card_master_id}|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")
                    }|char=${filters[10]}|sppt=${filters[5]}|attr=${filters[6]}|type=${filters[7]
                    }|hover=${[
                        `合计输出: ${parseInt(data_details.合计输出)}`,
                        `点击得分: ${parseInt(data_details.表现)}`,
                        `类型: ${parseInt(data_details.类型)}`,
                        /* SP槽补正: 没有SR/R 不用 */
                        `合宿技能: ${parseInt(data_details.合宿)}`,
                        /* `特技: ${parseInt(data_details.特技1)}${typeof data_details.特技2 === "number" ? ` + ${parseInt(data_details.特技2)}` : ""}`, */
                        `个性1: ${parseInt(data_details.被动个性1)}${typeof data_details.被动个性2 === "number" ? ` + ${parseInt(data_details.被动个性2)}` : ""}`,
                        `个性2: ${parseInt(data_details.主动个性1)}${typeof data_details.主动个性2 === "number" ? ` + ${parseInt(data_details.主动个性2)}` : ""}`,
                    ].join("&#10;")}}}`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `|- class="hover-swap-image-trigger" \n! style="text-align:center;" | <div class="grid-alter" style="grid-gap:1rem 1rem;"><div>${border_description[border_index]}&#10;${text_array.length}</div><div>${range}</div></div> \n| ${text_array.join(" ")}`;
        });
        results[2] = wikitable_lines;//4
    }
    //奶盾耐久
    {
        const border = [1150, 1025, 900, 775, 650, 525, 0];//1
        const multipler = 1;
        const border_description = ["SS", "S", "A", "B", "C", "D", "E"];//2
        const texts = border.map(() => []);
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
                    const [{ member_m_id, sp_point, card_attribute, role }] = await masterdata.All(`select member_m_id,sp_point,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data, filters: [0, 1, 2, 3, 4, sp_point, card_attribute, role, 8, 9, member_m_id] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data - a.data)//5
            .reduce((border_index, { card_master_id, /*epilog,*/ data, filters }) => {
                while (typeof border[border_index] === "number" && data * multipler < border[border_index]) border_index += 1;//6
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`{{CardIconText|${card_master_id}|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")
                    }|char=${filters[10]}|sppt=${filters[5]}|attr=${filters[6]}|type=${filters[7]
                    }}}`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `|- class="hover-swap-image-trigger" \n! style="text-align:center;" | <div class="grid-alter" style="grid-gap:1rem 1rem;"><div>${border_description[border_index]}&#10;${text_array.length}</div><div>${range}</div></div> \n| ${text_array.join(" ")}`;
        });
        results[3] = wikitable_lines;//4
    }
    //后排输出
    {
        const border = [18, 15, 14, 13, 12, 11, 10, 8.9];//1
        const multipler = 100;
        const border_description = ["SS", "S+", "S-", "A+", "A-", "B", "C", "D"];
        const texts = border.map(() => []);
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["卡片基本属性"]["数据库ID"]}${line}`].v;
                const data_details = {
                    合计输出: sheet[`${structure["后排强度"]["输出"]}${line}`].v,
                    合宿: sheet[`${structure["槽强度"]["输出"]}${line}`].v,
                    被动个性1: sheet[`${structure["被动个性1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性1强度"]["后排输出"]}${line}`].v,
                    被动个性2: sheet[`${structure["被动个性2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性2强度"]["后排输出"]}${line}`].v,
                    主动个性1: sheet[`${structure["主动个性1强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性1强度"]["后排输出"]}${line}`].v,
                    主动个性2: sheet[`${structure["主动个性2强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性2强度"]["后排输出"]}${line}`].v,
                };
                const data = sheet[`${structure["后排强度"]["输出"]}${line}`].v / 86013;
                try {
                    const [{ member_m_id, sp_point, card_attribute, role }] = await masterdata.All(`select member_m_id,sp_point,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [0, 1, 2, 3, 4, sp_point, card_attribute, role, 8, 9, member_m_id] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data_details.合计输出 - a.data_details.合计输出)
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data * multipler < border[border_index]) border_index += 1;
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`{{CardIconText|${card_master_id}|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")
                    }|char=${filters[10]}|sppt=${filters[5]}|attr=${filters[6]}|type=${filters[7]
                    }|hover=${[
                        `合计输出: ${parseInt(data_details.合计输出)}`,
                        `合宿技能: ${parseInt(data_details.合宿)}`,
                        `个性1: ${parseInt(data_details.被动个性1)}${typeof data_details.被动个性2 === "number" ? ` + ${parseInt(data_details.被动个性2)}` : ""}`,
                        `个性2: ${parseInt(data_details.主动个性1)}${typeof data_details.主动个性2 === "number" ? ` + ${parseInt(data_details.主动个性2)}` : ""}`,
                    ].join("&#10;")}}}`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `|- class="hover-swap-image-trigger" \n! style="text-align:center;" | <div class="grid-alter" style="grid-gap:1rem 1rem;"><div>${border_description[border_index]}&#10;${text_array.length}</div><div>${range}</div></div> \n| ${text_array.join(" ")}`;
        });
        results[4] = wikitable_lines;//4
    }
    //好友支援
    {
        const border = [20, 18, 16];//1
        const multipler = 100;
        const border_description = ["S", "A+", "A-"];
        const texts = border.map(() => []);
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["卡片基本属性"]["数据库ID"]}${line}`].v;
                const data_details = {
                    合计输出: sheet[`${structure["好友支援"]["输出"]}${line}`].v,
                    合宿: sheet[`${structure["槽强度"]["输出"]}${line}`].v,
                    被动个性1: sheet[`${structure["被动个性1强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性1强度"]["前排输出"]}${line}`].v,
                    被动个性2: sheet[`${structure["被动个性2强度"]["类型"]}${line}`].v !== "无" && sheet[`${structure["被动个性2强度"]["前排输出"]}${line}`].v,
                    主动个性1: sheet[`${structure["主动个性1强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性1强度"]["前排输出"]}${line}`].v,
                    主动个性2: sheet[`${structure["主动个性2强度"]["效果"]}${line}`].v !== "无" && sheet[`${structure["主动个性2强度"]["前排输出"]}${line}`].v,
                };
                const data = sheet[`${structure["好友支援"]["输出"]}${line}`].v / 86013;
                try {
                    const [{ member_m_id, sp_point, card_attribute, role }] = await masterdata.All(`select member_m_id,sp_point,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [0, 1, 2, 3, 4, sp_point, card_attribute, role, 8, 9, member_m_id] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data_details.合计输出 - a.data_details.合计输出)
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data * multipler < border[border_index]) border_index += 1;
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`{{CardIconText|${card_master_id}|${Math.floor(data * multipler * 10).toString().replace(/^([0-9]*)([0-9])$/, "$1.$2")
                    }|char=${filters[10]}|sppt=${filters[5]}|attr=${filters[6]}|type=${filters[7]
                    }|hover=${[
                        `合计输出: ${parseInt(data_details.合计输出)}`,
                        `合宿技能: ${parseInt(data_details.合宿)}`,
                        `个性1: ${parseInt(data_details.被动个性1)}${typeof data_details.被动个性2 === "number" ? ` + ${parseInt(data_details.被动个性2)}` : ""}`,
                        `个性2: ${parseInt(data_details.主动个性1)}${typeof data_details.主动个性2 === "number" ? ` + ${parseInt(data_details.主动个性2)}` : ""}`,
                    ].join("&#10;")}}}`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            const range = `[${border[border_index]},${border_index === 0 ? "∞" : border[border_index - 1]})`;
            return `|- class="hover-swap-image-trigger" \n! style="text-align:center;" | <div class="grid-alter" style="grid-gap:1rem 1rem;"><div>${border_description[border_index]}&#10;${text_array.length}</div><div>${range}</div></div> \n| ${text_array.join(" ")}`;
        });
        results[5] = wikitable_lines;//4
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
        const border = [124000, 121000, 118000, 116500, 115000, 113500, 112000, 109000, 106000, 103000, 100000, 0];
        const multipler = 1;
        const border_description = ["S+", "S-", "A+", "A-", "B+", "B-", "C+", "C-", "D+", "D-", "E+", "E-"];
        const texts = border.map(() => []);
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["切队奶强度"]["ID"]}${line}`].v;
                const data_details = {
                    单键300: sheet[structure["切队奶强度"]["单键300"] + line].v,
                    单键400: sheet[structure["切队奶强度"]["单键400"] + line].v,
                    单键500: sheet[structure["切队奶强度"]["单键500"] + line].v,
                    单键600: sheet[structure["切队奶强度"]["单键600"] + line].v,
                }
                const data = sheet[`${structure["切队奶强度"]["平均"]}${line}`].v;
                try {
                    const [{ member_m_id, sp_point, card_attribute, role }] = await masterdata.All(`select member_m_id,sp_point,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [0, 1, 2, 3, 4, sp_point, card_attribute, role, 8, 9, member_m_id] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data - a.data)//5
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data * multipler < border[border_index]) border_index += 1;//6
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`{{CardIconText|${card_master_id}|${Math.floor(data * multipler).toLocaleString()
                    }|char=${filters[10]}|sppt=${filters[5]}|attr=${filters[6]}|type=${filters[7]
                    }|hover=${[
                        `单键300: ${parseInt(data_details.单键300)}`,
                        `单键400: ${parseInt(data_details.单键400)}`,
                        `单键500: ${parseInt(data_details.单键500)}`,
                        `单键600: ${parseInt(data_details.单键600)}`,
                    ].join("&#10;")}}}`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            return `|- class="hover-swap-image-trigger" \n! style="text-align:center;" | ${border_description[border_index]}&#10;${text_array.length} \n| ${text_array.join(" ")}`;
        });
        results[0] = wikitable_lines;//4
    }
    {
        const card_lines = [];
        for (let line = 4; line < 10000; line++) {
            const card_master_id = sheet[`${structure["站撸奶强度"]["ID"]}${line}`];
            if (card_master_id) card_lines.push(line);
        }
        const border = [100000, 95000, 90000, 85000, 80000, 75000, 70000, 65000, 60000, 0];
        const multipler = 1;
        const border_description = ["A+", "A-", "B+", "B-", "C+", "C-", "D+", "D-", "E+", "E-"];
        const texts = border.map(() => []);
        (await Promise.all(card_lines
            .map(async (line) => {
                const card_master_id = sheet[`${structure["站撸奶强度"]["ID"]}${line}`].v;
                const data_details = {
                    单键1: sheet[structure["站撸奶强度"]["单键1"] + line].v,
                    单键500: sheet[structure["站撸奶强度"]["单键500"] + line].v,
                    单键700: sheet[structure["站撸奶强度"]["单键700"] + line].v,
                    单键900: sheet[structure["站撸奶强度"]["单键900"] + line].v,
                }
                const data = sheet[`${structure["站撸奶强度"]["平均"]}${line}`].v;
                try {
                    const [{ member_m_id, sp_point, card_attribute, role }] = await masterdata.All(`select member_m_id,sp_point,card_attribute,role from m_card where id = ${card_master_id}`);
                    return { card_master_id, data_details, data, filters: [0, 1, 2, 3, 4, sp_point, card_attribute, role, 8, 9, member_m_id] };
                } catch (e) {
                    console.log(card_master_id);
                }
            })))
            .sort((a, b) => b.data - a.data)//5
            .reduce((border_index, { card_master_id, data_details, data, filters }) => {
                while (typeof border[border_index] === "number" && data * multipler < border[border_index]) border_index += 1;//6
                if (typeof border[border_index] !== "number") return border_index;
                texts[border_index].push(`{{CardIconText|${card_master_id}|${Math.floor(data * multipler).toLocaleString()
                    }|char=${filters[10]}|sppt=${filters[5]}|attr=${filters[6]}|type=${filters[7]
                    }|hover=${[
                        `单键1: ${parseInt(data_details.单键1)}`,
                        `单键500: ${parseInt(data_details.单键500)}`,
                        `单键700: ${parseInt(data_details.单键700)}`,
                        `单键900: ${parseInt(data_details.单键900)}`,
                    ].join("&#10;")}}}`);
                return border_index;
            }, 0);
        const wikitable_lines = texts.map((text_array, border_index) => {
            return `|- class="hover-swap-image-trigger" \n! style="text-align:center;" | ${border_description[border_index]}&#10;${text_array.length} \n| ${text_array.join(" ")}`;
        });
        results[1] = wikitable_lines;//4
    }

    return results;
}
Promise.all([main(), main_2_1()]).then(([[前排输出, 上限前排输出, 奶盾输出, 奶盾效果量, 后排输出, 好友支援], [副奶盾综合, 主奶盾综合]]) => {
    const template = fs.readFileSync("templates/normal.txt").toString();
    Object.entries({ 前排输出, 上限前排输出, 奶盾输出, 奶盾效果量, 后排输出, 好友支援, 主奶盾综合, 副奶盾综合 }).forEach(([name, data_lines]) => {
        const result = template.replace("{lines}", data_lines.join("\n\n"));
        fs.writeFileSync(`Template%COLON%LevelExcel%SLASH%${name}.txt`, result);
    });
});
