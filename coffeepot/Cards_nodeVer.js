//var M_ACTIVE_SKILL = 22, M_CARD = 32, M_CARD_ACTIVE_SKILL = 33, M_CARD_APPEARANCE = 34, M_CARD_ATTRIBUTE = 35, M_CARD_AWAKEN_PARAMETER = 36, M_CARD_LIVE_CONST = 40, M_CARD_PARAMETER = 41, M_CARD_PASSIVE_SKILL_ORIGINAL = 43, M_DICTIONARY = 91, M_PASSIVE_SKILL = 283, M_SKILL = 315, M_SKILL_CONDITION = 316, M_SKILL_EFFECT = 317, M_SKILL_EFFECT_TYPE_SETTING = 318, M_SKILL_EFFECT_VALUE_COUNT = 319, M_SKILL_TARGET = 320, M_TRAINING_TREE = 363, M_TRAINING_TREE_CARD_PARAM = 365, M_TRAINING_TREE_PASSIVE_SKILL_INCREASE = 366, M_TRAINING_TREE_CELL_CONTENT = 370;
//console.warn(dataBase.objects[406]);
/*var M_ACTIVE_SKILL = 22,
M_CARD = 37,
M_CARD_ACTIVE_SKILL = 38,
M_CARD_APPEARANCE = 39,
M_CARD_ATTRIBUTE = 40,
M_CARD_AWAKEN_PARAMETER = 41,
M_CARD_LIVE_CONST = 45,
M_CARD_PARAMETER = 46,
M_CARD_PASSIVE_SKILL_ORIGINAL = 48,
M_DIC = 81,
M_PASSIVE_SKILL = 302,
M_SKILL = 335,
M_SKILL_CONDITION = 336,
M_SKILL_EFFECT = 337,
M_SKILL_EFFECT_TYPE_SETTING = 338,
M_SKILL_EFFECT_VALUE_COUNT = 339,
M_SKILL_TARGET = 340,
M_SUIT = 376,
M_TRAINING_TREE = 402,
M_TRAINING_TREE_CARD_PARAM = 404,
M_TRAINING_TREE_PASSIVE_SKILL_INCREASE = 405,
M_TRAINING_TREE_CELL_CONTENT = 409;*/
//var TABLES=1000;
const sqlite = require('sqlite3');
const util = require('util');
const fs = require('fs');
const masterdata = new sqlite.Database('../masterdata.db',(err)=>{
    if(err)console.error(err);
});
const dictionary_ja_k = new sqlite.Database('../dictionary_ja_k.db',(err)=>{
    if(err)console.error(err);
})
const cardEpilog = JSON.parse(fs.readFileSync('./gachaorevent.json'));

masterdata.ALL = util.promisify(masterdata.all);
dictionary_ja_k.GET = util.promisify(dictionary_ja_k.each);

/*
function getImage(d, str) {
    d.src = srclink(str);
}

function srclink(str) {
    let integer = 0;
    for (let digit of str) {
        integer = integer * 95 + digit.codePointAt(0) - 32;
    }
    return "https://as.lovelive.eu.org/images_b95/" + integer + ".png";
}
*/

function base95(str) {
    let integer = 0;
    for (let digit of str) {
        integer = integer * 95 + digit.codePointAt(0) - 32;
    }
    return integer;
}

//??????id??????????????????
/*
function getdic(str) {
    //?????????dic_k
    var cmp = str.slice(2); 
    for (let tmp of dictionaryK.objects[0].rows) {
        if (tmp[0] == cmp) { return tmp[1]; }
    }
}
*/
async function getdic(key){
    let a = await dictionary_ja_k.GET(`select message from m_dictionary where id = "${key.slice(2)}"`);
    if(a.message)return a.message;
    else return '[getdic0]DIC_K ERROR';
}

//??????????????????????????????????????? ?????????null
/*
function searchdb(m_list) {
    var i;
    for(i=0;i<TABLES;i++){
        if(dataBase.objects[i].name==m_list)break;
    }
    var j;
    for (let tmp of dataBase.objects[i].rows) {
        j = 0;
        for (let k = 1; k < arguments.length;k++) {
            if (arguments[k] != null && arguments[k] != tmp[j]) break;
            else j++;
        }
        if (++j == arguments.length) {
            return tmp;
        }
    }
}
*/
async function searchdb(m_list){
    const a = await masterdata.ALL(`select * from ${m_list}`);
    for(let b of a){
        let i = 1;
        for(let column in b){
            if(arguments[i]&&arguments[i]!=b[column])break;//?
            else i++;
            if(i===arguments.length)break;
        }
        if(i===arguments.length){
            let res = new Array();
            for(let column in b){res.push(b[column]);}
            return res;
        }
    }
}



(async function () {
    //?????????????????????
    const TRAINING_TREE_TABLE = await masterdata.ALL('select * from m_training_tree_card_param');
    let TREE_OLD = new Array();
    for(let row of TRAINING_TREE_TABLE){
        let row_old = new Array();
        for(let column in row){
            row_old.push(row[column]);
        }
        TREE_OLD.push(row_old);
    };
    function treemax(card_id) {
        let appeal = 0, stamina = 0, technique = 0;
        /*
        let M_TRAINING_TREE_CARD_PARAM;
        for(M_TRAINING_TREE_CARD_PARAM=0;M_TRAINING_TREE_CARD_PARAM<TABLES;M_TRAINING_TREE_CARD_PARAM++){
            if(dataBase.objects[M_TRAINING_TREE_CARD_PARAM].name=="m_training_tree_card_param")break;
        }
        */
        for (let tmp of TREE_OLD/*dataBase.objects[M_TRAINING_TREE_CARD_PARAM].rows*/) {
            if (tmp[0] == card_id) {
                if (tmp[2] == 3) appeal += tmp[3];
                if (tmp[2] == 2) stamina += tmp[3];
                if (tmp[2] == 4) technique += tmp[3];
            }
        }
        var param = [appeal, stamina, technique];
        return param;
    }

    //#main
    for (var i = 1; i <= 439; i++) {
        let resstr = "{{CardDataBasic";
        let tmplist = await searchdb("m_card", null, null, i);
        if (tmplist == undefined) { alert("school idol No. " + i + " Not Found"); continue; }
        //!idolno !id !name1 !nameawaken !character !attribute !type !gacha/event !p1 !p2 !p3 !ask !psk1 !psk2
        let card_id = tmplist[0];
        resstr += "|" + i;
        resstr += "|" + tmplist[0];
        resstr += "|" + await getdic("k.card_name_"+tmplist[0]);
        resstr += "|" + await getdic("k.card_name_awaken_" + tmplist[0]);
        let chara;
        switch (tmplist[1]){
            case 1: chara = "???????????????"; break;
            case 2: chara = "????????????"; break;
            case 3: chara = "?????????"; break;
            case 4: chara = "????????????"; break;
            case 5: chara = "?????????"; break;
            case 6: chara = "???????????????"; break;
            case 7: chara = "?????????"; break;
            case 8: chara = "????????????"; break;
            case 9: chara = "????????????"; break;
            case 101: chara = "????????????"; break;
            case 102: chara = "????????????"; break;
            case 103: chara = "????????????"; break;
            case 104: chara = "????????????"; break;
            case 105: chara = "?????????"; break;
            case 106: chara = "????????????"; break;
            case 107: chara = "???????????????"; break;
            case 108: chara = "????????????"; break;
            case 201: chara = "????????????"; break;
            case 202: chara = "?????????"; break;
            case 203: chara = "?????????"; break;
            case 109: chara = "????????????"; break;
            case 205: chara = "?????????"; break;
            case 204: chara = "????????????"; break;
            case 206: chara = "????????????"; break;
            case 207: chara = "????????????"; break;
            case 208: chara = "?????????????????"; break;
            case 209: chara = "???????????????"; break;
            case 210: chara = "????????????"; break;
        }
        resstr += "|" + chara;
        resstr += "|" + tmplist[4];
        resstr += "|" + tmplist[5];

        let gachaorevent;
        let rarity = tmplist[3];
        for (let r of cardEpilog.main) {
            if (r[0] == card_id) gachaorevent = r[1];
        }
        resstr += "|" + gachaorevent;

        //id->??????
        let appeal, stamina, technique;
        tmplist = await searchdb("m_card_parameter", card_id, 20 + 2 * rarity);
        appeal = tmplist[2]; stamina = tmplist[3]; technique = tmplist[4];
        //id->????????????
        tmplist = await searchdb("m_card_awaken_parameter", card_id);
        appeal += tmplist[2]; stamina += tmplist[1]; technique += tmplist[3];
        //id->???
        let param = treemax(card_id);
        //console.log(param);
        appeal += param[0]; stamina += param[1]; technique += param[2];
        resstr += "|" + appeal;
        resstr += "|" + stamina;
        resstr += "|" + technique;

        //id->???????????????
        tmplist = await searchdb("m_card_active_skill", card_id);
        //???????????????->????????????
        tmplist = await searchdb("m_active_skill", tmplist[3]);
        resstr += "|" + base95(tmplist[9]);

        //id->?????????1
        tmplist = await searchdb("m_card_passive_skill_original", card_id, null, 1);
        //?????????1->??????
        tmplist = await searchdb("m_passive_skill", tmplist[4]);
        resstr += "|" + base95(tmplist[6]);

        //id->?????????2
        tmplist = await searchdb("m_card_passive_skill_original", card_id, null, 2);
        if (tmplist == undefined);//resstr += "|???";
        else {
            //?????????2->??????
            tmplist = await searchdb("m_passive_skill", tmplist[4]);
            resstr += "|" + base95(tmplist[6]);
        }
        resstr += "}}";
        console.log(resstr);
    }
})();