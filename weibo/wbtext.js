const DIR_NOTICES = '../../notice/';
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const sqlite = require("sqlite3");
const util = require("util");
const request = require("request");
const progress = require("progress-stream");

sqlite.Database.prototype.EACH = util.promisify(sqlite.Database.prototype.each);
const masterdata = new sqlite.Database("../masterdata.db", (err) => {
    if (err) throw new Error(err);
});
const dictionary_ja_k = new sqlite.Database("../dictionary_ja_k.db", (err) => {
    if (err) throw new Error(err);
});

const image_download = async (event_name, image_id) => {
    const ostream = fs.createWriteStream(`${event_name}/${image_id}.png`);
    const str = progress({
        time: 5000,
    });
    str.on('progress', (progress) => {
        console.log(image_id, progress.transferred);
    });
    return await new Promise((res, rej) => {
        const req = request(`https://as.lovelive.eu.org/images_b95/${image_id}.png`);
        req.pipe(str).pipe(ostream).on('close', () => {
            res();
        });
        req.on('error', (e) => {
            rej(e);
        });
    })
}

const text_download = async (event_name, card_info, banner_b95) => {
    try { fs.mkdirSync(`${event_name}`) } catch (e) { }
    (await Promise.all(card_info)).forEach((value) => {
        image_download(event_name, value.view);
        image_download(event_name, value.view_awaken);
    });
    image_download(event_name, base95(banner_b95));
}

const walk = async (currentDirPath, callback) => {
    const tasks = [];
    try {
        const files = await fsPromises.readdir(currentDirPath);
        files.forEach((name) => {
            const filePath = path.join(currentDirPath, name);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                tasks.push(callback(filePath, stat));
            } else if (stat.isDirectory()) {
                walk(filePath, callback);
            }
        })
    } catch (err) {
        console.error(err);
    };
    return Promise.all(tasks);
}
const memid_to_fullname = { 1: "高坂穗乃果", 2: "绚濑绘里", 3: "南小鸟", 4: "园田海未", 5: "星空凛", 6: "西木野真姬", 7: "东条希", 8: "小泉花阳", 9: "矢泽妮可", 101: "高海千歌", 102: "樱内梨子", 103: "松浦果南", 104: "黑泽黛雅", 105: "渡边曜", 106: "津岛善子", 107: "国木田花丸", 108: "小原鞠莉", 109: "黑泽露比", 201: "上原步梦", 202: "中须霞", 203: "樱坂雫", 204: "朝香果林", 205: "宫下爱", 206: "近江彼方", 207: "优木雪菜", 208: "艾玛·维尔德", 209: "天王寺璃奈", 210: "三船栞子", 211: "米娅·泰勒", 212: "钟岚珠" };
const rarity_to_name = { 10: "R", 20: "SR", 30: "UR" };
const base95 = (s) => Array.from(s).map((c) => c.codePointAt(0) - 32).reduce((x, y) => x * 95 + y);

const Regs = {
    title_exchange: new RegExp(/(【追記】)?交換所イベント「(.+)」開催/),
    title_story: /(【追記】)?ストーリーイベント「(.+)」開催/,
    title_exchange_gacha: new RegExp(/※詳しくは[「『]交換所イベント[「『](.+)[』」]開催[』」]のお知らせをご確認ください。/),
    title_story_gacha: new RegExp(/※詳しくは[「『]ストーリーイベント[「『](.+)[』」]開催[』」]のお知らせをご確認ください。/),
    banner_exchange: new RegExp(/(?<=<sprite src=\")Common\/InlineImage\/Banner\/Event\/Mining\/[0-9]+\/tex_banner_notice_l_[0-9]+(?=\".*\/>)/),
    banner_story: new RegExp(/(?<=<sprite src=\")Common\/InlineImage\/Banner\/Event\/Marathon\/[0-9]+\/tex_banner_notice_l_[0-9]+(?=\".*\/>)/),
    duration: new RegExp(/【開催期間】1 ([0-9]+) ～ 1 ([0-9]+)/),
    card_id: new RegExp(/(?<=<card[ ]+value=\")[0-9]+(?=\"[ ]*\/>)/g),
    nasong_exchange: new RegExp(/(?<=今回のイベントから(\<.+\>)*(3D楽曲となった)?「)(.+)(?=」(\<.+\>)*を先行配信いたします！)/),
    nasong_story: /(?<=前回のイベント同様、(\<.+\>)*「)(.+)(?=」(\<.+\>)*を先行配信中です！)/,
    banner_gacha: /(?<=<sprite src=\")Common\/InlineImage\/Banner\/Gacha\/[0-9]+\/tex_banner_notice_l_[0-9]+(?=\".*\/>)/,
};
const main = async () => {
    //EXCHANGE EVENT
    const latest_exchange = { date: 0, path: null }, latest_exchange_gacha = { date: 0, path: null };
    const latest_party_gacha = { date: 0, path: null };
    const latest_story = { date: 0, path: null }, latest_story_gacha = { date: 0, path: null };
    const latest_festival_gacha = { date: 0, path: null };

    await walk(DIR_NOTICES, async (filePath, stat) => {
        const notice = fsPromises.readFile(filePath);
        const { category, title: { dot_under_text: title }, detail_text: { dot_under_text: text }, date } = JSON.parse(await notice);
        if (category === 3) {
            if (date > latest_exchange.date)
                try {
                    const { 1: event_name } = Regs.title_exchange.exec(title);
                    Object.assign(latest_exchange, { date, path: filePath });
                    return;
                } catch (e) { };
            if (date > latest_story.date)
                try {
                    const { 1: event_name } = Regs.title_story.exec(title);
                    Object.assign(latest_story, { date, path: filePath });
                    return;
                } catch (e) { };
        };
        if (category === 2 && !(/ステップアップ/).exec(title)) {//no stepup
            if (date > latest_exchange_gacha.date)
                try {
                    const { 1: event_name } = Regs.title_exchange_gacha.exec(text);
                    latest_exchange_gacha.date = date; latest_exchange_gacha.path = filePath;
                    return;
                } catch (e) { };
            if (date > latest_party_gacha.date && (/(【追記】)?パーティーガチャ開催！！/).exec(title)) {
                Object.assign(latest_party_gacha, { date, path: filePath });
                return;
            }
            if (date > latest_story_gacha.date)
                try {
                    const { 1: event_name } = Regs.title_story_gacha.exec(text);
                    Object.assign(latest_story_gacha, { date, path: filePath });
                    return;
                } catch (e) { };
            if (date > latest_festival_gacha.date && (/(【追記】)?スクスタフェス開催！！/).exec(title)) {
                Object.assign(latest_festival_gacha, { date, path: filePath });
                return;
            }
        };
    });
    //exchange
    console.log(await text_event_exchange(latest_exchange.path));
    console.log(await text_gacha(latest_exchange_gacha.path, Regs.title_exchange_gacha, "exchange"));
    //party
    console.log(await text_gacha(latest_party_gacha.path, /「\<color value=\"#ff3494\"\>(パーティーガチャ)\<\/color\>\」を開催いたします！/, "party"));
    //story
    console.log(await text_event_story(latest_story.path));
    console.log(await text_gacha(latest_story_gacha.path, Regs.title_story_gacha,"story"));
    //fes
    console.log(await text_gacha(latest_festival_gacha.path, /「\<color value=\"#ff3494\"\>(スクスタフェス)\<\/color\>\」を開催いたします！/, "festival"));
}

main();

const text_event_exchange = async (filePath) => {
    const notice = fsPromises.readFile(filePath);
    const { category, title: { dot_under_text: title }, detail_text: { dot_under_text: text }, date } = JSON.parse(await notice);
    const { 2: event_name } = (Regs.title_exchange.exec(title));
    //event duration
    const { 1: start_at_sec, 2: end_at_sec } = Regs.duration.exec(text);
    const { 0: banner_key } = text.match(Regs.banner_exchange);
    let nasong_name;
    try {
        ({ 0: nasong_name } = text.match(Regs.nasong_exchange));
    } catch (e) { }

    const p_banner_b95 = masterdata.EACH(`select path from m_decoration_texture where id = "${banner_key}"`);
    const card_info = text_cards(text.match(Regs.card_id));

    const { path: banner_b95 } = await p_banner_b95;

    //console.log(await Promise.all(card_info), base95(banner_b95), nasong_name, timerange(start_at_sec, end_at_sec));
    text_download(event_name, card_info, banner_b95);

    return `${timerange(start_at_sec, end_at_sec)}，新的交换所活动【${event_name}】将会举办！

本次活动期间可以获得活动卡：
${(await Promise.all(card_info.map(async (value) => (await value).text))).join('\n')}
本次活动先行曲为【${nasong_name}】。`;
};

const text_event_story = async (filePath) => {
    const notice = fsPromises.readFile(filePath);
    const { category, title: { dot_under_text: title }, detail_text: { dot_under_text: text }, date } = JSON.parse(await notice);
    const { 2: event_name } = (Regs.title_story.exec(title));

    const { 1: start_at_sec, 2: end_at_sec } = Regs.duration.exec(text);
    const { 0: banner_key } = text.match(Regs.banner_story);
    const { 0: nasong_name } = text.match(Regs.nasong_story);

    const p_banner_b95 = masterdata.EACH(`select path from m_decoration_texture where id = "${banner_key}"`);
    const card_info = text_cards(text.match(Regs.card_id));

    const { path: banner_b95 } = await p_banner_b95;

    text_download(event_name, card_info, banner_b95);

    return `${timerange(start_at_sec, end_at_sec)}，新的剧情活动【${event_name}】将会举办！

本次活动期间可以获得活动卡：
${(await Promise.all(card_info.map(async (value) => (await value).text))).join('\n')}
本次活动先行曲为【${nasong_name}】。`;
};

const text_gacha = async (filePath, eventType_textReg, type) => {
    const notice = fsPromises.readFile(filePath);
    const { category, title: { dot_under_text: title }, detail_text: { dot_under_text: text }, date } = JSON.parse(await notice);
    const { 1: event_name } = (eventType_textReg.exec(text));
    //gacha duration
    const { 1: start_at_sec, 2: end_at_sec } = Regs.duration.exec(text);
    let banner_key;
    try{
    ( { 0: banner_key } = text.match(Regs.banner_gacha));
    }catch(e){
        console.log("banner key error",type,event_name,text);
    }

    const p_banner_b95 = masterdata.EACH(`select path from m_decoration_texture where id = "${banner_key}"`);

    const card_info = text_cards(text.match(Regs.card_id));

    const { path: banner_b95 } = await p_banner_b95;

    //console.log(await Promise.all(card_info), timerange(start_at_sec, end_at_sec));
    text_download(event_name + ((type === "festival" || type === "party") ? (new Date(start_at_sec * 1000).getFullYear() * 100 + new Date(start_at_sec * 1000).getMonth() + 1) : ""), card_info, banner_b95);
    switch (type) {
        case "festival": {
            return `${timerange(start_at_sec, end_at_sec)}，新的Fes卡池将会开放！！

本次卡池新添Fes限定卡：
${(await Promise.all(card_info)).filter((value) => value.limited).map((value) => value.text).join('\n')}

本次卡池新添卡池卡:
${(await Promise.all(card_info)).filter((value) => !value.limited).map((value) => value.text).join('\n')}
`;
        }
        case "party": {
            return `${timerange(start_at_sec, end_at_sec)}，新的Party卡池将会开放！！

本次卡池新添Party限定卡：
${(await Promise.all(card_info)).filter((value) => value.limited).map((value) => value.text).join('\n')}

本次卡池新添卡池卡:
${(await Promise.all(card_info)).filter((value) => !value.limited).map((value) => value.text).join('\n')}
`;
        }
        case "exchange": case "story": default: {
            return `${timerange(start_at_sec, end_at_sec)}，新的活动卡池【${event_name}招募】和【${event_name}阶梯招募】将会开放。

本次卡池新添卡池卡：
${(await Promise.all(card_info.map(async (value) => (await value).text))).join('\n')}`;
        }
    }

};

const text_cards = (card_ids) =>
    card_ids.map(async (value) => {
        const p_card = masterdata.EACH(`select card_rarity_type,member_m_id,max_passive_skill_slot from m_card where id = ${value}`);
        const p_appearance_1 = masterdata.EACH(`select card_name,image_asset_path from m_card_appearance where card_m_id = ${value} and appearance_type = 1`);
        const p_appearance_2 = masterdata.EACH(`select card_name,image_asset_path from m_card_appearance where card_m_id = ${value} and appearance_type = 2`);
        const [{ card_name: card_name_key, image_asset_path: view_b95 }, { card_name: card_name_awaken_key, image_asset_path: view_awaken_b95 }] = await Promise.all([p_appearance_1, p_appearance_2]);
        const p_appearance_name_1 = dictionary_ja_k.EACH(`select message from m_dictionary where id = "${card_name_key.slice(2)}"`);
        const p_appearance_name_2 = dictionary_ja_k.EACH(`select message from m_dictionary where id = "${card_name_awaken_key.slice(2)}"`);
        const [{ member_m_id, card_rarity_type, max_passive_skill_slot }, { message: card_name }, { message: card_name_awaken }] = await Promise.all([p_card, p_appearance_name_1, p_appearance_name_2]);
        return {
            text: `【${rarity_to_name[card_rarity_type]}】[${card_name}]/[${card_name_awaken}] #${memid_to_fullname[member_m_id]}# `,
            view: base95(view_b95),
            view_awaken: base95(view_awaken_b95),
            limited: max_passive_skill_slot === 4,
        };
    });

const days = new Map([[1, "月"], [2, "火"], [3, "水"], [4, "木"], [5, "金"], [6, "土"], [0, "日"]]);
const timerange = (start_at_sec, end_at_sec) => {
    const start_at = new Date(start_at_sec * 1000), end_at = new Date(end_at_sec * 1000 + 60 * 1000);
    const offset = (-start_at.getTimezoneOffset() / 60);
    const start = `${start_at.getFullYear()}年${start_at.getMonth() + 1}月${start_at.getDate()}日(${days.get(start_at.getDay())})${start_at.getHours()}时`;
    const zone = `(UTC${offset >= 0 ? '+' : ""}${offset})`;
    let end;
    if (start_at.getFullYear() === end_at.getFullYear()) {
        if (start_at.getMonth() === end_at.getMonth()) {
            if (start_at.getDate() === end_at.getDate()) {
                end = `至${end_at.getHours()}时`;
            }
            else end = `至${end_at.getMonth() + 1}月${end_at.getDate()}日(${days.get(end_at.getDay())})${end_at.getHours()}时`;
        } else end = `至${end_at.getMonth() + 1}月${end_at.getDate()}日(${days.get(end_at.getDay())})${end_at.getHours()}时`;
    } else end = `至${end_at.getFullYear()}年${end_at.getMonth() + 1}月${end_at.getDate()}日(${days.get(end_at.getDay())})${end_at.getHours()}时`;
    return start + end + zone;
}