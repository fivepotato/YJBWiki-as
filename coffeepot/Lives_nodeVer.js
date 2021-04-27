var TABLES=1000;
const sqlite = require('sqlite3');
const util = require('util');
const masterdata = new sqlite.Database('../masterdata.db',(err)=>{
    if(err)console.error(err);
});
const dictionary_ja_k = new sqlite.Database('../dictionary_ja_k.db',(err)=>{
    if(err)console.error(err);
})
masterdata.ALL = util.promisify(masterdata.all);
dictionary_ja_k.GET = util.promisify(dictionary_ja_k.each);

let normal_lives=[
    10001, 10002, 10014, 10011, 10016, 10013, 10008, 10003, 10017, 10062, 
    10037, 10012, 10036, 10010, 10060, 10071, 10077, 10009, 10068, 10021,
    10089, 
    10005, 10004, 10015, 

    11007, 11001, 11002, 11014, 11008, 11012, 11003, 11011, 11078, 11015, 
    11009, 11013, 11079, 11049, 11030, 11072, 11017,
    11005, 11044, 11004, 11042, 11006, 11046, 

    12001, 12034, 12037, 12057,
    12002, 12011, 12021,
    12003, 12012, 12022, 
    12004, 12013, 12023,
    12005, 12014, 12024, 
    12006, 12015, 12025,
    12007, 12016, 12026,
    12008, 12017, 12027,
    12009, 12018, 12028,
    12010, 12019, 12029,
    12030
]

let normal_live_unlock_description=[
    "初期解锁",
    "完成剧情第2章第1个Live解锁",
    "完成剧情第2章第5个Live解锁",
    "完成剧情第6章第10个Live解锁",
    "完成剧情第8章第1个Live解锁",
    "完成剧情第9章第10个Live解锁",
    "完成剧情第10章第1个Live解锁",
    "完成剧情第11章第1个Live解锁",
    "完成剧情第12章第1个Live解锁",
    "完成剧情第13章第10个Live解锁",
    "完成剧情第14章第1个Live解锁",
    "完成剧情第15章第1个Live解锁",
    "完成剧情第16章第1个Live解锁",
    "完成剧情第18章第1个Live解锁",
    "完成剧情第19章第1个Live解锁",
    "完成剧情第20章第10个Live解锁",
    "完成剧情第21章第10个Live解锁",
    "完成剧情第22章第10个Live解锁",
    "完成剧情第23章第10个Live解锁",
    "完成剧情第24章第1个Live解锁",
    "完成剧情第25章第10个Live解锁",

    "完成剧情第5章第4个Live解锁",
    "完成剧情第6章第3个Live解锁",
    "完成剧情第5章第2个Live解锁",

    "初期解锁",
    "初期解锁",
    "完成剧情第3章第1个Live解锁",
    "完成剧情第4章第10个Live解锁",
    "完成剧情第8章第10个Live解锁",
    "完成剧情第9章第1个Live解锁",
    "完成剧情第10章第10个Live解锁",
    "完成剧情第11章第10个Live解锁",
    "完成剧情第12章第10个Live解锁",
    "完成剧情第13章第1个Live解锁",
    "完成剧情第14章第10个Live解锁",
    "完成剧情第18章第10个Live解锁",
    "完成剧情第19章第10个Live解锁",
    "完成剧情第20章第1个Live解锁",
    "完成剧情第22章第1个Live解锁",
    "完成剧情第23章第1个Live解锁",
    "完成剧情第24章第10个Live解锁",
    
    "完成剧情第3章第5个Live解锁",
    "完成剧情第15章第10个Live解锁",
    "完成剧情第4章第2个Live解锁",
    "完成剧情第16章第10个Live解锁",
    "完成剧情第3章第3个Live解锁",
    "完成剧情第17章第1个Live解锁",
    
    "完成剧情第7章第10个Live解锁",
    "完成剧情第17章第10个Live解锁",
    "完成剧情第21章第1个Live解锁",
    "完成剧情第25章第1个Live解锁",

    "完成剧情第2章第7个Live解锁",
    "完成上原步梦绊剧情第12话解锁",
    "完成上原步梦绊剧情第21话解锁",
    "完成剧情第2章第7个Live解锁",
    "完成中须霞绊剧情第12话解锁",
    "完成中须霞绊剧情第20话解锁",
    "完成剧情第2章第7个Live解锁",
    "完成樱坂雫绊剧情第12话解锁",
    "完成樱坂雫绊剧情第21话解锁",
    "完成剧情第2章第7个Live解锁",
    "完成朝香果林绊剧情第12话解锁",
    "完成朝香果林绊剧情第20话解锁",
    "完成剧情第2章第7个Live解锁",
    "完成宫下爱绊剧情第12话解锁",
    "完成宫下爱绊剧情第21话解锁",
    "完成剧情第2章第7个Live解锁",
    "完成近江彼方绊剧情第12话解锁",
    "完成近江彼方绊剧情第21话解锁",
    "完成剧情第2章第7个Live解锁",
    "完成优木雪菜绊剧情第12话解锁",
    "完成优木雪菜绊剧情第21话解锁",
    "完成剧情第2章第7个Live解锁",
    "完成艾玛·维尔德绊剧情第12话解锁",
    "完成艾玛·维尔德绊剧情第21话解锁",
    "完成剧情第2章第7个Live解锁",
    "完成天王寺璃奈绊剧情第12话解锁",
    "完成天王寺璃奈绊剧情第21话解锁",
    "完成三船栞子绊剧情第6话解锁"
]

let higawari_lives=[
    10070, 10076, 10066, 10067, 10061, 10064, 10054, 10059, 10073, 
    11066, 11059, 11068, 11064, 11067, 11065, 11070, 11062, 11069, 
    12031, 12032, 12033
]

let higawari_live_unlock_description=[
    "每周一配信",
    "每周二配信",
    "每周三配信",
    "每周四配信",
    "每周五配信",
    "每周六配信",
    "每周六配信",
    "每周日配信",
    "每周日配信",
    "每周一配信",
    "每周二配信",
    "每周三配信",
    "每周四配信",
    "每周五配信",
    "每周六配信",
    "每周六配信",
    "每周日配信",
    "每周日配信",
    "每周三六日配信",
    "每周二五日配信",
    "每周一四六配信"
]

let time_limited_lives=[
    12020, 11080, 11081, 11082, 10118, 11085, 12039, 11084, 12053, 12042, 
    12043, 12040, 12048, 12046, 12049, 12050, 12047, 12044, 12045, 12041, 
    12052, 12051, 12067, 12064, 12065, 12066, 12068, 11089
]

let time_limited_live_unlock_description=[
    "2019/12/06 14时-2020/01/06 14时<br>2020/03/31 14时-2020/04/15 14时",
    "2020/01/31 14时-2020/02/14 14时<br>2020/04/30 14时-2020/05/15 14时",
    "2020/02/14 14时-2020/02/28 14时<br>2020/04/30 14时-2020/05/15 14时",
    "2020/02/28 14时-2020/03/16 14时<br>2020/04/30 14时-2020/05/15 14时<br>2020/05/21 14时-2020/06/05 14时",
    "2020/03/27 14时-2020/04/21 12时<br>2020/05/21 14时-2020/06/05 14时<br>2020/12/20 14时-2020/12/31 14时",
    "2020/07/22 14时至今",
    "2020/07/28 14时-2020/08/31 14时",
    "2020/08/26 14时至今",
    "2020/09/02 14时至今",
    "2020/10/03 23时-2020/10/17 23时",
    "2020/10/10 23时-2020/10/24 23时",
    "2020/10/10 23时-2021/01/31 23时",
    "2020/10/17 23时-2020/10/31 23时",
    "2020/10/24 23时-2020/11/07 23时",
    "2020/10/31 23时-2020/11/14 23时",
    "2020/11/07 23时-2020/11/21 23时",
    "2020/11/14 23时-2020/11/28 23时",
    "2020/11/21 23时-2020/12/05 23时",
    "2020/11/28 23时-2020/12/12 23时",
    "2020/12/05 23时-2021/01/31 23时",
    "2020/12/19 23时-2021/01/03 23时",
    "2020/12/26 23时-2021/01/10 23时",
    "2021/01/29 14时-2021/03/31 14时",
    "2021/02/12 14时至今",
    "2021/02/19 14时至今",
    "2021/02/26 14时至今",
    "2021/03/05 14时至????????",
    "2021/03/31 14时-2021/04/30 14时",
]

let event_prerelease_lives=[
    20016, 21012, 20008, 20003, 20017, 21015, 20037, 20012, 20036, 21046, 
    20010, 20060, 21049, 22037, 21030, 21072, 20021, 22057
]

let event_prerelease_live_unlock_description=[
    "2019/10/03 14时-2019/10/31 14时",
    "2019/11/06 14时-2019/11/30 14时",
    "2019/12/06 14时-2019/12/31 14时",
    "2020/01/06 14时-2020/01/31 14时",
    "2020/02/06 14时-2020/02/28 14时",
    "2020/03/06 14时-2020/03/31 14时",
    "2020/04/06 14时-2020/04/30 14时",
    "2020/05/07 14时-2020/05/29 14时",
    "2020/06/05 14时-2020/06/30 14时",
    "2020/07/06 14时-2020/07/31 14时",
    "2020/08/06 14时-2020/08/31 14时",
    "2020/09/07 14时-2020/09/30 14时",
    "2020/10/07 14时-2020/10/31 14时",
    "2020/11/08 14时-2020/11/30 14时",
    "2020/12/07 14时-2020/12/29 14时",
    "2020/12/31 23时-2021/01/30 14时",
    "2021/02/07 14时-2021/02/28 14时",
    "2021/03/07 14时-2021/03/31 14时",
]

let expert_lives=[
    10011401, 11008401, 12001401, 11080401, 11081401, 
    11082401, 10118401, 10001401, 11007401, 12001402, 
    11002401, 10011402, 12062401, 10014401, 12063401,
    11001401
]

let expert_live_unlock_description=[
    "2019/12/23 14时-2020/01/22 14时",
    "2019/12/23 14时-2020/01/22 14时",
    "2019/12/23 14时-2020/01/22 14时",
    "2020/01/31 14时-2020/02/14 14时<br>2020/04/30 14时-2020/05/15 14时",
    "2020/02/14 14时-2020/02/28 14时<br>2020/04/30 14时-2020/05/15 14时",
    "2020/02/28 14时-2020/03/16 14时<br>2020/04/30 14时-2020/05/15 14时<br>2020/05/21 14时-2020/06/05 14时",
    "2020/03/27 14时-2020/04/21 12时<br>2020/05/21 14时-2020/06/05 14时",
    "2020/06/18 14时至今",
    "2020/06/18 14时至今",
    "2020/06/18 14时至今",
    "2020/12/11 14时至今",
    "2020/12/22 14时至今",
    "2021/01/29 14时至今",
    "2021/03/12 14时至今",
    "2021/03/19 14时至今",
    "2021/03/26 14时至今",
]

let song_length=[
    [   1,"1:34"],[   2,"1:56"],[   3,"2:01"],[   4,"1:55"],[   5,"1:58"],                            [   8,"2:01"],[   9,"    "],[  10,"2:01"],
    [  11,"1:58"],[  12,"1:48"],[  13,"2:03"],[  14,"2:02"],[  15,"2:02"],[  16,"1:58"],[  17,"2:03"],
    [  21,"    "],
                                                                          [  36,"1:41"],[  37,"2:03"],

                                              [  54,"2:00"],                                                        [  59,"1:52"],[  60,"1:34"],
    [  61,"1:35"],[  62,"2:02"],              [  64,"1:43"],              [  66,"1:36"],[  67,"1:37"],[  68,"    "],              [  70,"2:04"],
    [  71,"2:02"],              [  73,"2:02"],                            [  76,"1:48"],[  77,"2:00"],
                                                                                                                    [  89,"    "],



                                                                                                      [ 118,"2:01"],



    
    [1001,"2:02"],[1002,"1:34"],[1003,"1:59"],[1004,"2:03"],[1005,"1:40"],[1006,"1:36"],[1007,"1:32"],[1008,"1:55"],[1009,"2:01"],
    [1011,"1:42"],[1012,"1:58"],[1013,"1:43"],[1014,"1:52"],[1015,"1:56"],              [1017,"    "],
                                                                                                                                  [1030,"2:01"],

                  [1042,"1:56"],              [1044,"1:49"],              [1046,"1:46"],                            [1049,"2:03"],
                                                                                                                    [1059,"1:53"],
                  [1062,"1:48"],              [1064,"1:49"],[1065,"1:57"],[1066,"2:01"],[1067,"2:00"],[1068,"2:02"],[1069,"2:01"],[1070,"2:00"],
                  [1072,"1:47"],                                                                      [1078,"2:01"],[1079,"1:56"],[1080,"2:00"],
    [1081,"2:00"],[1082,"1:49"],              [1084,"2:03"],[1085,"1:55"],                                          [1089,"    "],




    [2001,"1:36"],[2002,"2:05"],[2003,"1:46"],[2004,"2:04"],[2005,"1:36"],[2006,"2:03"],[2007,"1:52"],[2008,"1:43"],[2009,"1:40"],[2010,"1:37"],
    [2011,"2:01"],[2012,"2:02"],[2013,"1:55"],[2014,"2:00"],[2015,"1:40"],[2016,"1:58"],[2017,"1:53"],[2018,"1:51"],[2019,"1:58"],[2020,"1:45"],
    [2021,"1:48"],[2022,"2:05"],[2023,"2:00"],[2024,"1:45"],[2025,"1:48"],[2026,"1:52"],[2027,"1:50"],[2028,"1:37"],[2029,"1:51"],[2030,"1:34"],
    [2031,"1:42"],[2032,"1:40"],[2033,"1:59"],[2034,"1:52"],                            [2037,"1:45"],              [2039,"1:37"],[2040,"1:37"],
    [2041,"1:33"],[2042,"1:54"],[2043,"1:36"],[2044,"1:41"],[2045,"1:43"],[2046,"1:46"],[2047,"1:34"],[2048,"1:57"],[2049,"1:50"],[2050,"1:47"],
    [2051,"1:47"],[2052,"1:51"],[2053,"2:04"],                                          [2057,"    "],
    [2061,"1:50"],[2062,"    "],              [2064,"    "],[2065,"    "],[2066,"    "],[2067,"    "],[2068,"    "],
]

function base95(str) {
    let integer = 0;
    for (let digit of str) {
        integer = integer * 95 + digit.codePointAt(0) - 32;
    }
    return integer;
}


//根据id查找字典描述
/*
function getdic(str) {
    //默认是dic_k
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

//指定表中依参数序查找第一个 通配用null
/*
function await searchdb(m_list) {
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

/*$(document).ready(function () {
    let resstr="{";
    var M_LIVE;
    for(M_LIVE=0;M_LIVE<TABLES;M_LIVE++){
        if(dataBase.objects[M_LIVE].name=="m_live_difficulty")break;
    }
    for(let i=0;i<dataBase.objects[M_LIVE].rows.length;i++){
        resstr+=dataBase.objects[M_LIVE].rows[i][0]+", "
    }
    resstr+="}";
    console.log(resstr);
})*/

(async function () {
    console.log("|-bgcolor=CCFFFF\n| colspan=13 | '''常驻歌曲'''");
    for(let i=0;i<normal_lives.length;i++){
        let resstr = "{{NormalLiveDataBasic|";
        let id=normal_lives[i];
        resstr+=Math.floor(id/1000)%10+1;
        let tmplist1=await searchdb("m_live",id);
        resstr+="|"+await getdic(tmplist1[6]);
        let tmplist2=await searchdb("m_live_difficulty",id*1000+101+(id==11072?1:0));
        resstr+="|"+tmplist2[5];
        resstr+="|"+normal_live_unlock_description[i]+"|";
        for(let j=0;j<song_length.length;j++)if(song_length[j][0]==id%10000){
            resstr+=song_length[j][1];
            break;
        }
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        tmplist2=await searchdb("m_live_difficulty",id*1000+201+(id==11072?1:0));
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        tmplist2=await searchdb("m_live_difficulty",id*1000+301+(id==11072?1:0));
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        resstr+="}}";
        console.log(resstr);
    }
    console.log("|-bgcolor=CCFFFF\n| colspan=13 | '''日替歌曲'''");
    for(let i=0;i<higawari_lives.length;i++){
        let resstr = "{{NormalLiveDataBasic|";
        let id=higawari_lives[i];
        resstr+=Math.floor(id/1000)%10+1;
        let tmplist1=await searchdb("m_live",id);
        resstr+="|"+await getdic(tmplist1[6]);
        let tmplist2=await searchdb("m_live_difficulty",id*1000+101);
        resstr+="|"+tmplist2[5];
        resstr+="|"+higawari_live_unlock_description[i]+"|";
        for(let j=0;j<song_length.length;j++)if(song_length[j][0]==id%10000){
            resstr+=song_length[j][1];
            break;
        }
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        tmplist2=await searchdb("m_live_difficulty",id*1000+201);
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        tmplist2=await searchdb("m_live_difficulty",id*1000+301);
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        resstr+="}}";
        console.log(resstr);
    }
    console.log("|-bgcolor=CCFFFF\n| colspan=13 | '''活动先行配信歌曲'''");
    for(let i=0;i<event_prerelease_lives.length;i++){
        if(i==1){
            console.log("{{NormalLiveDataBasic|2|スリリング・ワンウェイ|9|2019/11/06 14时-2019/11/30 14时|1:58|1450|10800|451000|3400|26100|1363000|6250|47700|2885000}}");
            continue;
        }
        let resstr = "{{NormalLiveDataBasic|";
        let id=event_prerelease_lives[i];
        resstr+=Math.floor(id/1000)%10+1;
        let tmplist1=await searchdb("m_live",id-10000);
        resstr+="|"+await getdic(tmplist1[6]);
        let tmplist2=await searchdb("m_live_difficulty",id*1000+101);
        resstr+="|"+tmplist2[5];
        resstr+="|"+event_prerelease_live_unlock_description[i]+"|";
        for(let j=0;j<song_length.length;j++)if(song_length[j][0]==id%10000){
            resstr+=song_length[j][1];
            break;
        }
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        tmplist2=await searchdb("m_live_difficulty",id*1000+201);
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        tmplist2=await searchdb("m_live_difficulty",id*1000+301);
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        resstr+="}}";
        console.log(resstr);
    }
    console.log("|-bgcolor=CCFFFF\n| colspan=13 | '''限时歌曲'''");
    for(let i=0;i<time_limited_lives.length;i++){
        let resstr = "{{NormalLiveDataBasic|";
        let id=time_limited_lives[i];
        resstr+=Math.floor(id/1000)%10+1;
        let tmplist1=await searchdb("m_live",id);
        resstr+="|"+await getdic(tmplist1[6]);
        let tmplist2=await searchdb("m_live_difficulty",id*1000+101);
        resstr+="|"+tmplist2[5];
        resstr+="|"+time_limited_live_unlock_description[i]+"|";
        for(let j=0;j<song_length.length;j++)if(song_length[j][0]==id%10000){
            resstr+=song_length[j][1];
            break;
        }
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        tmplist2=await searchdb("m_live_difficulty",id*1000+201);
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        tmplist2=await searchdb("m_live_difficulty",id*1000+301);
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        resstr+="}}";
        console.log(resstr);
    }

    console.log("\n\n\n\n");
    for(let i=0;i<expert_lives.length;i++){
        let resstr = "{{ExpertLiveDataBasic|";
        let id=expert_lives[i];
        resstr+=Math.floor(id/1000000)%10+1;
        let tmplist1=await searchdb("m_live",Math.floor(id/1000));
        resstr+="|"+await getdic(tmplist1[6]);
        let tmplist2=await searchdb("m_live_difficulty",id);
        resstr+="|"+tmplist2[5];
        resstr+="|"+expert_live_unlock_description[i];
        resstr+="|"+tmplist2[8];
        resstr+="|"+tmplist2[9];
        resstr+="|"+tmplist2[6];
        resstr+="}}";
        console.log(resstr);
    }

    const STORY_TABLE = await masterdata.ALL('select * from m_story_main_cell');
    let STORY_OLD = new Array();
    for(let row of STORY_TABLE){
        let row_old = new Array();
        for(let column in row){
            row_old.push(row[column]);
        }
        STORY_OLD.push(row_old);
    }
    const STORY_LINKAGE_TABLE = await masterdata.ALL('select * from m_story_main_cell_transformation');
    let STORY_LINKAGE_OLD = new Array();
    for(let row of STORY_LINKAGE_TABLE){
        let row_old = new Array();
        for(let column in row){
            row_old.push(row[column]);
        }
        STORY_LINKAGE_OLD.push(row_old);
    }
    const TOWER_TABLE = await masterdata.ALL('select * from m_tower_composition order by tower_id');
    let TOWER_OLD = new Array();
    for(let row of TOWER_TABLE){
        let row_old = new Array();
        for(let column in row){
            row_old.push(row[column]);
        }
        TOWER_OLD.push(row_old);
    }
    console.log("\n\n\n\n");
    let chpt=0,sect=0,song=0;
    /*
    var M_STORY;
    for(M_STORY=0;M_STORY<TABLES;M_STORY++){
        if(dataBase.objects[M_STORY].name=="m_story_main_cell")break;
    }
    */
    for(let i=0;i</*dataBase.objects[M_STORY].rows*/STORY_OLD.length;i++){
        let tmplist0=/*dataBase.objects[M_STORY].rows*/STORY_OLD[i];
        if(tmplist0[2]>chpt){
            chpt=tmplist0[2];
            sect=0;
            song=0;
            console.log("|-bgcolor=CCFFFF\n| colspan=9 | '''第"+chpt+"章'''");
        }
        if(tmplist0[4]>sect){
            sect=tmplist0[4];
            song=0;
        }
        if(tmplist0[5]==1||tmplist0[5]==3)continue;
        song+=1;
        if(tmplist0[0]!=2017){
            let resstr="{{StoryLiveDataBasic|";
            let tmpstr=chpt+"章"+sect+"话";
            //tmpstr+="-"+song;
            let id=tmplist0[14];
            let tmplist1=await searchdb("m_live_difficulty",id);
            let songid=tmplist1[1];
            resstr+=Math.floor(songid/1000)%10+1;
            resstr+="|"+tmpstr;
            let tmplist2=await searchdb("m_live",songid);
            resstr+="|"+await getdic(tmplist2[6]);
            resstr+="|"+tmplist1[5];
            resstr+="|"+tmplist1[8];
            resstr+="|"+tmplist1[9];
            resstr+="|"+tmplist1[6];
            if(tmplist0[15]){
                let id=tmplist0[15];
                let tmplist1=await searchdb("m_live_difficulty",id);
                resstr+="|"+tmplist1[8];
                resstr+="|"+tmplist1[9];
                resstr+="|"+tmplist1[6];
            }
            resstr+="}}";
            console.log(resstr);
        }
        else{
            for(let j=0;j<9;j++){
                let tmplist3=/*dataBase.objects[M_STORY+3].rows*/STORY_LINKAGE_OLD[j];
                let resstr="{{StoryLiveDataBasic|";
                let tmpstr="2章10话("+(j+1)+"/9)";
                let id=tmplist3[9];
                let tmplist1=await searchdb("m_live_difficulty",id);
                let songid=tmplist1[1];
                resstr+=Math.floor(songid/1000)%10+1;
                resstr+="|"+tmpstr;
                let tmplist2=await searchdb("m_live",songid);
                resstr+="|"+await getdic(tmplist2[6]);
                resstr+="|"+tmplist1[5];
                resstr+="|"+tmplist1[8];
                resstr+="|"+tmplist1[9];
                resstr+="|"+tmplist1[6];
                resstr+="}}";
                console.log(resstr);
            }
        }
    }

    console.log("\n\n\n\n");
    let tower=0;
    /*
    var M_TOWER;
    for(M_TOWER=0;M_TOWER<TABLES;M_TOWER++){
        if(dataBase.objects[M_TOWER].name=="m_tower_composition")break;
    }
    */
    for(let i=0;i</*dataBase.objects[M_TOWER].rows*/TOWER_OLD.length;i++){
        let tmplist0=/*dataBase.objects[M_TOWER].rows*/TOWER_OLD[i];
        if(tmplist0[0]>33000+tower){
            tower=tmplist0[0]-33000;
            song=0;
            console.log("|-bgcolor=CCFFFF\n| colspan=6 | '''第"+tower+"个DLP塔'''");
        }
        if(tmplist0[8]==null)continue;
        song+=1;
        let resstr="{{DLPLiveDataBasic|";
        let tmpstr=tower+"-"+song;
        let id=tmplist0[8];
        let tmplist1=await searchdb("m_live_difficulty",id);
        let songid=tmplist1[1];
        resstr+=Math.floor(songid/1000)%10+1;
        resstr+="|"+tmpstr;
        let tmplist2=await searchdb("m_live",songid);
        resstr+="|"+await getdic(tmplist2[6]);
        resstr+="|"+tmplist1[5];
        resstr+="|"+tmplist1[8];
        resstr+="|"+tmplist1[9];
        resstr+="|"+tmplist0[9];
        resstr+="}}";
        console.log(resstr);
    }
    
    console.log("\n\n");
    tower=0;
    for(let i=0;i</*dataBase.objects[M_TOWER].rows*/TOWER_OLD.length;i++){
        let tmplist0=/*dataBase.objects[M_TOWER].rows*/TOWER_OLD[i];
        if(tmplist0[0]>33000+tower){
            tower=tmplist0[0]-33000;
            song=0;
            console.log("\n\n");
        }
        if(tmplist0[8]==null){
            console.log("|-\n! colspan=8 | 剧情");
            continue;
        }
        song+=1;
        let resstr="{{DLPLive|";
        resstr+=song;
        let id=tmplist0[8];
        let tmplist1=await searchdb("m_live_difficulty",id);
        let songid=tmplist1[1];
        let tmplist2=await searchdb("m_live",songid);
        resstr+="|"+tmplist1[5];
        resstr+="|"+await getdic(tmplist2[6]);
        resstr+="|"+tower;
        resstr+="|"+tmplist0[9];
        let tmplist3=await searchdb("m_tower_clear_reward",tmplist0[13],null,21);
        resstr+="|"+tmplist3[4];
        let tmplist4=await searchdb("m_tower_clear_reward",tmplist0[13],null,1);
        if(tmplist4!=undefined)resstr+="|"+tmplist4[4];
        else resstr+="|";
        if(tmplist0[14]!=undefined){
            let tmplist5=await searchdb("m_tower_progress_reward",tmplist0[14],null,21);
            resstr+="|"+tmplist5[4];
            let tmplist6=await searchdb("m_tower_progress_reward",tmplist0[14],null,1);
            if(tmplist6!=undefined)resstr+="|"+tmplist6[4];
        }
        resstr+="}}";
        console.log(resstr);
    }
})()

