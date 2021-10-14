const DIR_NOTICES = '../../notice/';
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const sqlite = require("sqlite3");
const util = require("util");

sqlite.Database.prototype.EACH = util.promisify(sqlite.Database.prototype.each);
sqlite.Database.prototype.ALL = util.promisify(sqlite.Database.prototype.all);
const masterdata = new sqlite.Database("../masterdata.db", (err) => {
    if (err) throw new Error(err);
});
const dictionary_ja_k = new sqlite.Database("../dictionary_ja_k.db", (err) => {
    if (err) throw new Error(err);
});

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

const group_name = new Map([
    ["全", "全员"],
    ["1年生", "1年生"],
    ["2年生", "2年生"],
    ["3年生", "3年生"],
    ["μ's", "μ's"],
    ["Aqours", "Aqours"],
    ["ニジガク", "虹咲学园学园偶像同好会"],
]);

const sbl_name = (index) => {
    switch (index) {
        case 0: return "SBL预活动";
        default: return `第${index}回SBL`;
    }
};

const duration_text = (start_at_sec, end_at_sec) => {
    const start_at = new Date(start_at_sec * 1000), end_at = new Date(end_at_sec * 1000);
    const start = `${start_at.getFullYear()}/${start_at.getMonth() + 1}/${start_at.getDate()} ${('0' + start_at.getHours().toString()).slice(-2)}:${('0' + start_at.getMinutes().toString()).slice(-2)}`;
    const end = `${end_at.getFullYear()}/${end_at.getMonth() + 1}/${end_at.getDate()} ${('0' + end_at.getHours().toString()).slice(-2)}:${('0' + end_at.getMinutes().toString()).slice(-2)}`;
    return `${start} - ${end}`;
};
const memid_to_fullname = { 1: "高坂穗乃果", 2: "绚濑绘里", 3: "南小鸟", 4: "园田海未", 5: "星空凛", 6: "西木野真姬", 7: "东条希", 8: "小泉花阳", 9: "矢泽妮可", 101: "高海千歌", 102: "樱内梨子", 103: "松浦果南", 104: "黑泽黛雅", 105: "渡边曜", 106: "津岛善子", 107: "国木田花丸", 108: "小原鞠莉", 109: "黑泽露比", 201: "上原步梦", 202: "中须霞", 203: "樱坂雫", 204: "朝香果林", 205: "宫下爱", 206: "近江彼方", 207: "优木雪菜", 208: "艾玛·维尔德", 209: "天王寺璃奈", 210: "三船栞子", 211: "米娅·泰勒", 212: "钟岚珠" };
const base95 = (s) => Array.from(s).map((c) => c.codePointAt(0) - 32).reduce((x, y) => x * 95 + y);
const base95_inv = (n) => {
    let a = "";
    while (n > 0) {
        p = parseInt(n / 95);
        c = n - p * 95 + 32;
        a += String.fromCharCode(c);
        n = p;
    };
    return a;
}

const main = async () => {
    const collection = [];
    const walk_callback = async (filePath, stat) => {
        const notice = fsPromises.readFile(filePath);
        const { category, title: { dot_under_text: title }, detail_text: { dot_under_text: text }, date } = JSON.parse(await notice);
        if (category === 3 && (/スクスタ(スーパー)?ビッグライブ/).exec(title)) {
            const { 1: start_at_sec, 2: end_at_sec } = (/<align="center"><color value="#3088ff">【開催期間】1 ([0-9]+) ～ 1 ([0-9]+)<\/color><\/align>/).exec(text);
            //console.log((/大人数で協力してライブを成功させるイベント<color value="#ff3494">「(.+)」<\/color>を開催いたします。/).exec(text));
            //大人数で協力してライブを成功させる(新しい)イベント<color value="#ff3494">「スクスタビッグライブ」</color>のプレイベントが始まりました！
            /*
            if (!text.match(/大人数で協力してライブを成功させるイベント<color value="#ff3494">「(.+)」<\/color>を開催いたします。/g)) {
                console.log(text);
            }
            */
            const song_names = text.match(/(?<=今回の対象曲はこちら！\n\n・(.+\n・){0,2}).+(?=(\n・.+){0,2}\n\n(.+)?\n*ビッグライブのライブに挑戦できる1日の回数には制限があり、各楽曲[0-9]+回、合計で[0-9]+回しかプレイすることができません。)/g);
            //今回のビッグライブでは<color value="#ff3494">(.+)メンバー<\/color>のアピール、スタミナ、テクニックの数値がなんと<color value="#ff3494">50%</color>強化されます！
            //今回のビッグライブでは、1周年を記念して<color value="#ff3494">全メンバー</color>のアピール、スタミナ、テクニックの数値が10%強化されます！
            const [, , buff_target, , buff_value_100] = text.match(/今回のビッグライブでは(.*)<color value="#ff3494">(.+)メンバー<\/color>のアピール、スタミナ、テクニックの数値が(.*?)([0-9]+)%(.*)強化されます！/);

            const exchange_updates = text.match(/(?<=今回は過去に開催されたイベント\n\n・(.+\n・){0,2}).+(?=(\n・.+){0,2}\n\nで登場した報酬スクールアイドルが(既に)?ラインナップに追加されています。)/g);
            collection.push({
                date,
                title,
                start_at_sec, end_at_sec,
                song_names,
                buff_target, buff_value_100,
            });
        };
    };
    const [, awards_full] = await Promise.all([walk(DIR_NOTICES, walk_callback), get_sbl_award()]);
    const awards = awards_full.filter(({ event_id }) => event_id < 100000);

    collection.sort((a, b) => a.date - b.date).forEach(({ date, title, start_at_sec, end_at_sec, song_names, buff_target, buff_value_100 }, index) => {
        console.log(new Date(date * 1000), title);
        console.log(new Date(start_at_sec * 1000), new Date(end_at_sec * 1000));
        console.log(song_names);
        console.log(awards[index]);
        const start_at = new Date(start_at_sec * 1000), end_at = new Date(end_at_sec * 1000);
        const start = `${start_at.getFullYear()}/${start_at.getMonth() + 1}/${start_at.getDate()} ${('0' + start_at.getHours().toString()).slice(-2)}:${('0' + start_at.getMinutes().toString()).slice(-2)}`;
        const end = `${end_at.getFullYear()}/${end_at.getMonth() + 1}/${end_at.getDate()} ${('0' + end_at.getHours().toString()).slice(-2)}:${('0' + end_at.getMinutes().toString()).slice(-2)}`;

        console.log(`${sbl_name(index)} | ${start} - ${end} | ${buff_target}<br>全属性+${buff_value_100}% | ${song_names.map((value) => `[[${value}]]`).join('\n')} | ${awards[index].awards.join('\n')}`);
    });
};

const award_name = new Map([
    [3, "得分赏"],
    [4, "特技赏"],
    [5, "SP赏"],
    [6, "回复赏"],
]);
const award_order = [, , , 3, 6, 4, 5, 7, 8];

const get_sbl_award = async () => {
    const award_rec = JSON.parse(await fsPromises.readFile("awards.json"));
    const sbls = await masterdata.ALL('select distinct event_id from m_coop_live');
    const awards = []
    sbls.sort(({ event_id: v1 }, { event_id: v2 }) => {
        let s1 = v1 > 99999 ? Math.floor(v1 / 10) : v1;
        let s2 = v2 > 99999 ? Math.floor(v2 / 10) : v2;
        return s2 - s1;
    });
    let lives = await masterdata.ALL('select distinct id from m_coop_live');
    for (const { event_id } of sbls) {
        const event_lives = await masterdata.ALL(`select id from m_coop_live where event_id = ${event_id}`);
        const available_event_live_ids = [];
        lives = lives.filter(({ id: live_id }) => {
            let res = true;
            event_lives.forEach(({ id: selected_live_id }) => {
                if (live_id === selected_live_id) {
                    res = false;
                    available_event_live_ids.push(selected_live_id);
                    return;
                }
            });
            return res;
        });
        if (!available_event_live_ids[0]) awards.push({ event_id: event_id, awards: null });
        else {
            const live_awards = await masterdata.ALL(`select award_type from m_coop_live_award where live_id = ${available_event_live_ids[0]} and weight = 1`);
            live_awards.sort(({ award_type: v1 }, { award_type: v2 }) => award_order[v1] - award_order[v2]);
            awards.push({ event_id, awards: live_awards.map(({ award_type }) => award_name.get(award_type)) });
        };
    };

    //incremental update
    let changed = false;

    awards.forEach(({ event_id, awards: live_awards }, index, array) => {
        if (award_rec[event_id]) {
            array[index] = { event_id, awards: award_rec[event_id] };
            return;
        }
        award_rec[event_id] = live_awards;
        changed = true;
    });
    if (changed) await fsPromises.writeFile("awards.json", JSON.stringify(award_rec));

    return awards.sort(({ event_id: v1 }, { event_id: v2 }) => {
        let s1 = v1 > 99999 ? Math.floor(v1 / 10) : v1;
        let s2 = v2 > 99999 ? Math.floor(v2 / 10) : v2;
        return s1 - s2;
    });
};

//main();

const main_2 = async () => {
    const results = [];
    const event_order = [
        /*
        { event_id: 30001, start_at_sec: 1 },
        { event_id: 30002, start_at_sec: 2 },
        { event_id: 30003, start_at_sec: 3 },
        { event_id: 30004, start_at_sec: 4 },
        { event_id: 30005, start_at_sec: 5 },
        { event_id: 30006, start_at_sec: 6 },
        */
    ];
    const exchange_id_info = new Map();
    const story_id_info = new Map([
        /*
        [30001, { event_name: "秘密のパーティー！", start_at_sec: 1, end_at_sec: 2, ecards: ["400013001", "402012001", "401012001"] }],
        [30002, { event_name: "和装モデルはお任せあれ！", start_at_sec: 1, end_at_sec: 2, ecards: ["401093001", "400092001", "402022001"] }],
        [30003, { event_name: "下町巡り珍道中", start_at_sec: 1, end_at_sec: 2, ecards: ["400083001", "401082001", "402052001"] }],
        [30004, { event_name: "ハイキングでリフレッシュ！", start_at_sec: 1, end_at_sec: 2, ecards: ["401073001", "400042001", "402062001"] }],
        [30005, { event_name: "素敵なところへご招待！", start_at_sec: 1, end_at_sec: 2, ecards: ["400073001", "401022001", "402082001"] }],
        [30006, { event_name: "スクールアイドルトレイン発車！", start_at_sec: 1, end_at_sec: 2, ecards: ["401083001", "400012001", "402092001"] }],
        */
    ]);
    const gacha_p1_name_info = new Map();
    const gacha_p2_name_info = new Map();
    const gacha_pp_name_info = new Map([
        /*
        ["秘密のパーティー！", { gacha_id: 20002, start_at_sec: 1, end_at_sec: 2, gcards: ["300033001", "301052001"] }],
        ["和装モデルはお任せあれ！", { gacha_id: 20017, start_at_sec: 1, end_at_sec: 2, gcards: ["301043001", "300062001"] }],
        ["下町巡り珍道中", { gacha_id: 20023, start_at_sec: 1, end_at_sec: 2, gcards: ["301033001", "300052001"] }],
        ["ハイキングでリフレッシュ！", { gacha_id: 20028, start_at_sec: 1, end_at_sec: 2, gcards: ["300023001", "301062001"] }],
        ["素敵なところへご招待！", { gacha_id: 20035, start_at_sec: 1, end_at_sec: 2, gcards: ["301013001", "300082001"] }],
        ["スクールアイドルトレイン発車！", { gacha_id: 20036, start_at_sec: 1, end_at_sec: 2, gcards: ["300093001", "301042001"] }],
        */
    ]);
    const walk_callback = async (filePath, stat) => {
        const notice = fsPromises.readFile(filePath);
        const { category, title: { dot_under_text: title }, detail_text: { dot_under_text: text }, date } = JSON.parse(await notice);
        if (category === 3 && title.match(/(【追記】)?(交換所|ストーリー)イベント「.+」開催/)) {
            let event_name;
            try {
                ({ 2: event_type, 3: event_name } = title.match(/(【追記】)?(交換所|ストーリー)イベント「(.+)」開催/));
            } catch (e) { return; }
            const { 1: start_at_sec, 2: end_at_sec } = (/<align="center"><color value="#3088ff">【開催期間】1 ([0-9]+) ～ 1 ([0-9]+)<\/color><\/align>/).exec(text);
            const card_ids = text.match(/(?<=<card[ ]+value=\")[0-9]+(?=\"[ ]*\/>)/g);
            let event_id;
            if (event_type === "交換所") {
                ({ 1: event_id } = text.match(/<sprite src="Common\/InlineImage\/Banner\/Event\/Mining\/([0-9]+)\/tex_banner_notice_l_[0-9]+" width="1120px" height="334px"\/>/));
                exchange_id_info.set(parseInt(event_id), { event_name, start_at_sec, end_at_sec, ecards: card_ids });
            } else if (event_type === "ストーリー") {
                ({ 1: event_id } = text.match(/<sprite src="Common\/InlineImage\/Banner\/Event\/Marathon\/([0-9]+)\/tex_banner_notice_l_[0-9]+" width="1120px" height="334px"\/>/));
                story_id_info.set(parseInt(event_id), { event_name, start_at_sec, end_at_sec, ecards: card_ids });
            }
            event_order.push({ event_id: parseInt(event_id), start_at_sec });
            //console.log(event_id,event_name,card_ids);
        };
        if (category === 2 && title.match(/(【追記】)?.+ガチャ開催(（前編）|（後編）)?/)) {
            let event_name;
            try {
                ({ 2: event_name } = text.match(/※詳しくは[「『](交換所|ストーリー)イベント[「『](.+)[』」]開催[』」]のお知らせをご確認ください。/));
            } catch (e) { return; }
            if (title.match(/ステップアップ/)) return;
            const { 1: gacha_id } = text.match(/<sprite src=\"Common\/InlineImage\/Banner\/Gacha\/([0-9]+)\/tex_banner_notice_l_([0-9]+)\" width=\"1120px\" height=\"334px\"\/>/);
            const { 1: start_at_sec, 2: end_at_sec } = text.match(/<align="center"><color value="#3088ff">【開催期間】1 ([0-9]+) ～ 1 ([0-9]+)<\/color><\/align>/);
            const card_ids = text.match(/(?<=<card[ ]+value=\")[0-9]+(?=\"[ ]*\/>)/g);
            const { 2: phase } = title.match(/(【追記】)?.+ガチャ開催(（前編）|（後編）)?/);
            if (phase === "（前編）") gacha_p1_name_info.set(event_name, { gacha_id, start_at_sec, end_at_sec, gcards: card_ids });
            else if (phase === "（後編）") gacha_p2_name_info.set(event_name, { gacha_id, start_at_sec, end_at_sec, gcards: card_ids });
            else gacha_pp_name_info.set(event_name, { gacha_id, start_at_sec, end_at_sec, gcards: card_ids });
            //console.log(gacha_id, event_name, card_ids);
        };

    };
    await walk(DIR_NOTICES, walk_callback);
    //global event order
    const event_no = new Map(event_order.sort((a, b) => a.start_at_sec - b.start_at_sec).map((value, index) => [value.event_id, index + 7]));

    const exchange_event_ids = [];
    for (let event_id = 31001; exchange_id_info.get(event_id); event_id += 1)exchange_event_ids.push(event_id);
    const p = exchange_event_ids.sort().map(async (event_id) => {
        const text = [];
        const { event_name, start_at_sec, end_at_sec, ecards } = exchange_id_info.get(event_id);
        text[0] = event_no.get(event_id);
        text[2] = duration_text(start_at_sec, end_at_sec);
        text[3] = template_card_id_to_link_swap(ecards[0]);
        text[4] = template_card_id_to_link_swap(ecards[1]);
        text[5] = template_card_id_to_link_swap(ecards[2]);
        const { path: banner_b95 } = await masterdata.EACH(`select path from m_decoration_texture where id = "Common\/InlineImage\/Banner\/Event\/Mining\/${event_id}\/tex_banner_notice_s_${event_id}"`);
        const banner_id = base95(banner_b95);
        try {
            const { gacha_id, gcards } = gacha_pp_name_info.get(event_name);
            const { path: banner_b95 } = await masterdata.EACH(`select path from m_decoration_texture where id = "Common\/InlineImage\/Banner\/Gacha\/${gacha_id}\/tex_banner_notice_s_${gacha_id}"`);
            const banner_id_gacha = base95(banner_b95);
            text[1] = `<div class="hover-swap-image"><ASImg id=${banner_id} w=160/><ASImg id=${banner_id_gacha} w=160/></div><br>${event_name}`;
            text[6] = "colspan=2 {{!}} " + gcards.filter((card_id) => Array.from(card_id)[5] === '3').map(template_card_id_to_link_swap).join(' ');
            text[7] = gcards.filter((card_id) => Array.from(card_id)[5] === '2').map(template_card_id_to_link_swap).join(' ');
        } catch (e) {
            const { gacha_id: gacha_id_1, gcards: gcards_1 } = gacha_p1_name_info.get(event_name);
            const { gacha_id: gacha_id_2, gcards: gcards_2 } = gacha_p2_name_info.get(event_name);
            const { path: banner_b95 } = await masterdata.EACH(`select path from m_decoration_texture where id = "Common\/InlineImage\/Banner\/Gacha\/${gacha_id_1}\/tex_banner_notice_s_${gacha_id_1}"`);
            const banner_id_gacha = base95(banner_b95);
            text[1] = `<div class="hover-swap-image"><ASImg id=${banner_id} w=160/><ASImg id=${banner_id_gacha} w=160/></div><br>${event_name}`;
            text[6] = template_card_id_to_link_swap(gcards_1[0]);
            text[7] = template_card_id_to_link_swap(gcards_2[0]);
            text[8] = template_card_id_to_link_swap(gcards_1[1]);
        };
        return "{{!}} " + text.join(" \n{{!}} ");
    });
    const lines = await Promise.all(p);

    results.push(`{{{!}} class="wikitable tsticky2" style="text-align:center"
{{!}}-
! rowspan=2 {{!}} 活&#x2060;动<br>编&#x2060;号 !! rowspan=2 {{!}} 活动名 !! rowspan=2 {{!}} 时间 !! colspan=3 {{!}} 活动卡 !! colspan=3 {{!}} 活动卡池卡 
{{!}}-
! style="top:27px" {{!}} UR 
{{!}} style="top:27px" {{!}} 上位SR 
{{!}} style="top:27px" {{!}} 下位SR 
{{!}} style="top:27px" {{!}} 前篇UR 
{{!}} style="top:27px" {{!}} 后篇UR 
{{!}} style="top:27px" {{!}} SR 
${"{{!}}- class=\"hover-swap-image-trigger\" \n" + lines.join(" \n{{!}}- class=\"hover-swap-image-trigger\" \n")}
{{!}}}`);

    const story_event_ids = [];
    for (let event_id = 30007; story_id_info.get(event_id); event_id += 1)story_event_ids.push(event_id);
    const p_story = story_event_ids.sort().map(line_generation(event_no, story_id_info, gacha_p1_name_info, gacha_p2_name_info, gacha_pp_name_info));

    //console.log(event_no,story_id_info, gacha_p1_name_info, gacha_p2_name_info, gacha_pp_name_info);
    const lines_story = await Promise.all(p_story);
    results.push(`{{{!}} class="wikitable tsticky2" style="text-align:center"
{{!}}-
! rowspan=2 {{!}} 活&#x2060;动<br>编&#x2060;号 !! rowspan=2 {{!}} 活动名 !! rowspan=2 {{!}} 时间 !! colspan=3 {{!}} 活动卡 !! colspan=3 {{!}} 活动卡池卡 
{{!}}-
! style="top:27px" {{!}} UR
{{!}} style="top:27px" {{!}} 上位SR
{{!}} style="top:27px" {{!}} 下位SR
{{!}} style="top:27px" {{!}} 前篇UR
{{!}} style="top:27px" {{!}} 后篇UR
{{!}} style="top:27px" {{!}} SR
{{!}}- class="hover-swap-image-trigger"
{{!}} 1
{{!}} <div class="hover-swap-image"><ASImg id=127091 w=160/><ASImg id=256481 w=160/></div><br>秘密のパーティー！
{{!}} 2019/10/3 - 2019/10/15
{{!}} [[高坂穗乃果#card_long_id_400013001{{!}}<div class="hover-swap-image"><ASIcon id=400013001 w=64/><ASIcon id=400013001 w=64 up/></div>]]
{{!}} [[上原步梦#card_long_id_402012001{{!}}<div class="hover-swap-image"><ASIcon id=402012001 w=64/><ASIcon id=402012001 w=64 up/></div>]]
{{!}} [[高海千歌#card_long_id_401012001{{!}}<div class="hover-swap-image"><ASIcon id=401012001 w=64/><ASIcon id=401012001 w=64 up/></div>]]
{{!}} colspan=2 {{!}} [[南小鸟#card_long_id_300033001{{!}}<div class="hover-swap-image"><ASIcon id=300033001 w=64/><ASIcon id=300033001 w=64 up/></div>]]
{{!}} [[渡边曜#card_long_id_301052001{{!}}<div class="hover-swap-image"><ASIcon id=301052001 w=64/><ASIcon id=301052001 w=64 up/></div>]]
{{!}}- class="hover-swap-image-trigger"
{{!}} 2
{{!}} <div class="hover-swap-image"><ASImg id=745847 w=160/><ASImg id=53901 w=160/></div><br>和装モデルはお任せあれ！
{{!}} 2019/10/21 - 2019/10/31
{{!}} [[黑泽露比#card_long_id_401093001{{!}}<div class="hover-swap-image"><ASIcon id=401093001 w=64/><ASIcon id=401093001 w=64 up/></div>]]
{{!}} [[矢泽妮可#card_long_id_400092001{{!}}<div class="hover-swap-image"><ASIcon id=400092001 w=64/><ASIcon id=400092001 w=64 up/></div>]]
{{!}} [[中须霞#card_long_id_402022001{{!}}<div class="hover-swap-image"><ASIcon id=402022001 w=64/><ASIcon id=402022001 w=64 up/></div>]]
{{!}} colspan=2 {{!}} [[黑泽黛雅#card_long_id_301043001{{!}}<div class="hover-swap-image"><ASIcon id=301043001 w=64/><ASIcon id=301043001 w=64 up/></div>]]
{{!}} [[西木野真姬#card_long_id_300062001{{!}}<div class="hover-swap-image"><ASIcon id=300062001 w=64/><ASIcon id=300062001 w=64 up/></div>]]
{{!}}- class="hover-swap-image-trigger"
{{!}} 3
{{!}} <div class="hover-swap-image"><ASImg id=510325 w=160/><ASImg id=501223 w=160/></div><br>下町巡り珍道中
{{!}} 2019/11/6 - 2019/11/15
{{!}} [[小泉花阳#card_long_id_400083001{{!}}<div class="hover-swap-image"><ASIcon id=400083001 w=64/><ASIcon id=400083001 w=64 up/></div>]]
{{!}} [[小原鞠莉#card_long_id_401082001{{!}}<div class="hover-swap-image"><ASIcon id=401082001 w=64/><ASIcon id=401082001 w=64 up/></div>]]
{{!}} [[宫下爱#card_long_id_402052001{{!}}<div class="hover-swap-image"><ASIcon id=402052001 w=64/><ASIcon id=402052001 w=64 up/></div>]]
{{!}} colspan=2 {{!}} [[松浦果南#card_long_id_301033001{{!}}<div class="hover-swap-image"><ASIcon id=301033001 w=64/><ASIcon id=301033001 w=64 up/></div>]]
{{!}} [[星空凛#card_long_id_300052001{{!}}<div class="hover-swap-image"><ASIcon id=300052001 w=64/><ASIcon id=300052001 w=64 up/></div>]]
{{!}}- class="hover-swap-image-trigger"
{{!}} 4
{{!}} <div class="hover-swap-image"><ASImg id=160703 w=160/><ASImg id=727951 w=160/></div><br>ハイキングでリフレッシュ！
{{!}} 2019/11/21 - 2019/11/30
{{!}} [[国木田花丸#card_long_id_401073001{{!}}<div class="hover-swap-image"><ASIcon id=401073001 w=64/><ASIcon id=401073001 w=64 up/></div>]]
{{!}} [[园田海未#card_long_id_400042001{{!}}<div class="hover-swap-image"><ASIcon id=400042001 w=64/><ASIcon id=400042001 w=64 up/></div>]]
{{!}} [[近江彼方#card_long_id_402062001{{!}}<div class="hover-swap-image"><ASIcon id=402062001 w=64/><ASIcon id=402062001 w=64 up/></div>]]
{{!}} colspan=2 {{!}} [[绚濑绘里#card_long_id_300023001{{!}}<div class="hover-swap-image"><ASIcon id=300023001 w=64/><ASIcon id=300023001 w=64 up/></div>]]
{{!}} [[津岛善子#card_long_id_301062001{{!}}<div class="hover-swap-image"><ASIcon id=301062001 w=64/><ASIcon id=301062001 w=64 up/></div>]]
{{!}}- class="hover-swap-image-trigger"
{{!}} 5
{{!}} <div class="hover-swap-image"><ASImg id=337705 w=160/><ASImg id=55135 w=160/></div><br>素敵なところへご招待！
{{!}} 2019/12/6 - 2019/12/16
{{!}} [[东条希#card_long_id_400073001{{!}}<div class="hover-swap-image"><ASIcon id=400073001 w=64/><ASIcon id=400073001 w=64 up/></div>]]
{{!}} [[樱内梨子#card_long_id_401022001{{!}}<div class="hover-swap-image"><ASIcon id=401022001 w=64/><ASIcon id=401022001 w=64 up/></div>]]
{{!}} [[艾玛·维尔德#card_long_id_402082001{{!}}<div class="hover-swap-image"><ASIcon id=402082001 w=64/><ASIcon id=402082001 w=64 up/></div>]]
{{!}} colspan=2 {{!}} [[高海千歌#card_long_id_301013001{{!}}<div class="hover-swap-image"><ASIcon id=301013001 w=64/><ASIcon id=301013001 w=64 up/></div>]]
{{!}} [[小泉花阳#card_long_id_300082001{{!}}<div class="hover-swap-image"><ASIcon id=300082001 w=64/><ASIcon id=300082001 w=64 up/></div>]]
{{!}}- class="hover-swap-image-trigger"
{{!}} 6
{{!}} <div class="hover-swap-image"><ASImg id=17719 w=160/><ASImg id=217966 w=160/></div><br>スクールアイドルトレイン発車！
{{!}} 2019/12/23 - 2019/12/31
{{!}} [[小原鞠莉#card_long_id_401083001{{!}}<div class="hover-swap-image"><ASIcon id=401083001 w=64/><ASIcon id=401083001 w=64 up/></div>]]
{{!}} [[高坂穗乃果#card_long_id_400012001{{!}}<div class="hover-swap-image"><ASIcon id=400012001 w=64/><ASIcon id=400012001 w=64 up/></div>]]
{{!}} [[天王寺璃奈#card_long_id_402092001{{!}}<div class="hover-swap-image"><ASIcon id=402092001 w=64/><ASIcon id=402092001 w=64 up/></div>]]
{{!}} colspan=2 {{!}} [[矢泽妮可#card_long_id_300093001{{!}}<div class="hover-swap-image"><ASIcon id=300093001 w=64/><ASIcon id=300093001 w=64 up/></div>]]
{{!}} [[黑泽黛雅#card_long_id_301042001{{!}}<div class="hover-swap-image"><ASIcon id=301042001 w=64/><ASIcon id=301042001 w=64 up/></div>]]
${"{{!}}- class=\"hover-swap-image-trigger\" \n" + lines_story.join(" \n{{!}}- class=\"hover-swap-image-trigger\" \n")}
{{!}}}`);
    return results;
};

main_2().then(([exchange, story]) => {
    fs.writeFileSync("Template%COLON%EventHistory.txt", `<includeonly>{{#switch:{{{1}}}
|1=${exchange}
|0=${story}
|ERROR!({{{1}}}) No such type of event.}}</includeonly><noinclude>{{EventHistory|1}}{{EventHistory|0}}</noinclude>`);
})

const template_card_id_to_link_swap = (card_id) => `[[${memid_to_fullname[parseInt(Array.from(card_id).filter((value, index) => index >= 2 && index <= 4).join(""))]}#card_long_id_${card_id}{{!}}<div class="hover-swap-image"><ASIcon id=${card_id} w=64/><ASIcon id=${card_id} w=64 up/></div>]]`;
const line_generation = (event_no, event_id_info, gacha_p1_name_info, gacha_p2_name_info, gacha_pp_name_info) => async (event_id) => {
    const text = [];
    const { event_name, start_at_sec, end_at_sec, ecards } = event_id_info.get(event_id);
    text[0] = event_no.get(event_id);
    text[2] = duration_text(start_at_sec, end_at_sec);
    text[3] = template_card_id_to_link_swap(ecards[0]);
    text[4] = template_card_id_to_link_swap(ecards[1]);
    text[5] = template_card_id_to_link_swap(ecards[2]);
    const { path: banner_b95 } = await masterdata.EACH(`select path from m_decoration_texture where id = "Common\/InlineImage\/Banner\/Event\/Marathon\/${event_id}\/tex_banner_notice_s_${event_id}"`);
    const banner_id = base95(banner_b95);
    try {
        const { gacha_id, gcards } = gacha_pp_name_info.get(event_name);
        const { path: banner_b95 } = await masterdata.EACH(`select path from m_decoration_texture where id = "Common\/InlineImage\/Banner\/Gacha\/${gacha_id}\/tex_banner_notice_s_${gacha_id}"`);
        const banner_id_gacha = base95(banner_b95);
        text[1] = `<div class="hover-swap-image"><ASImg id=${banner_id} w=160/><ASImg id=${banner_id_gacha} w=160/></div><br>${event_name}`;
        text[6] = "colspan=2 {{!}} " + gcards.filter((card_id) => Array.from(card_id)[5] === '3').map(template_card_id_to_link_swap).join(' ');
        text[7] = gcards.filter((card_id) => Array.from(card_id)[5] === '2').map(template_card_id_to_link_swap).join(' ');
    } catch (e) {
        try {
            const { gacha_id: gacha_id_1, gcards: gcards_1 } = gacha_p1_name_info.get(event_name);
            const { gacha_id: gacha_id_2, gcards: gcards_2 } = gacha_p2_name_info.get(event_name);
            const { path: banner_b95 } = await masterdata.EACH(`select path from m_decoration_texture where id = "Common\/InlineImage\/Banner\/Gacha\/${gacha_id_1}\/tex_banner_notice_s_${gacha_id_1}"`);
            const banner_id_gacha = base95(banner_b95);
            text[1] = `<div class="hover-swap-image"><ASImg id=${banner_id} w=160/><ASImg id=${banner_id_gacha} w=160/></div><br>${event_name}`;
            text[6] = template_card_id_to_link_swap(gcards_1[0]);
            text[7] = template_card_id_to_link_swap(gcards_2[0]);
            text[8] = template_card_id_to_link_swap(gcards_1[1]);
        } catch (e) {
            console.log(e);
        }
    };
    return "{{!}} " + text.join(" \n{{!}} ");
}
