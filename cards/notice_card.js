//公告分析
//you must run this first to get release date for the card info gen.
//防止没有公告库时难以使用，用按顺序的School Idol No.做标记而不是更方便的master id
const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite3');
const util = require('util');
const DIR_NOTICES = '../../notice/';//THIS CANNOT GET RELEASE DATE OF CARDS WITHOUT NOTICES
const PATH_OUT = './notice_card.json';
//硬等跑完 单位ms 如果结果不对自己加时间.jpg
const TIMEOUT = 1000;
async function walk(currentDirPath, callback) {
    fs.readdir(currentDirPath, function (err, files) {
        if (err) {
            throw new Error(err);
        }
        files.forEach(function (name) {
            var filePath = path.join(currentDirPath, name);
            var stat = fs.statSync(filePath);
            if (stat.isFile()) {
                callback(filePath, stat);
            } else if (stat.isDirectory()) {
                walk(filePath, callback);
            }
        });
    });
}
const masterdata = new sqlite.Database('../masterdata.db',(err)=>{
    if(err)console.error(err);
});
masterdata.ALL = util.promisify(masterdata.all);

let RELEASE_TS = new Object();
//2019.12.30(Kotori&Yoshiko&Setsuna Fes)之前没有公告
//如果之后的卡没有公告, 请在此处手动填写生成
//活动卡和卡池卡的判定使用三围和，暂时不通过公告生成。
//solid:gained from in-game screenchots(of the notice) or official accounts(twt@LLAS_STAFF)
//初始 9/26 0:00
for(i=1;i<100;i++)RELEASE_TS[i]={'released':new Date('2019-09-26T00:00:00.000+09:00').valueOf()};
//e1 gacha: 9/30 15:00 ~ 10/15 14:59 solid
for(i=100;i<102;i++)RELEASE_TS[i]={'released':new Date('2019-09-30T15:00:00.000+09:00').valueOf()};
//e1 event: 10/03 maintainance ~ 10/15 14:59 solid
for(i=102;i<105;i++)RELEASE_TS[i]={'released':new Date('2019-10-03T15:00:00.000+09:00').valueOf()};
//s1.5 gacha: 10/15 15:00 ~ 10/21 12:59 solid
for(i=105;i<107;i++)RELEASE_TS[i]={'released':new Date('2019-10-15T00:00:00.000+09:00').valueOf(),'gepf':'pu'};
//e2 event: 10/21 ??? ~ 10/31 14:59 solid
//e2 gacha:
for(i=107;i<112;i++)RELEASE_TS[i]={'released':new Date('2019-10-21T15:00:00.000+09:00').valueOf()};
//s2.5 gacha: 10/31 ??? ~ 11/06 12:59 solid
for(i=112;i<115;i++)RELEASE_TS[i]={'released':new Date('2019-10-31T00:00:00.000+09:00').valueOf(),'gepf':'pu'};
//e3 event: 11/6 ??? ~ 11/15 14:59 solid
//e3 gacha: 11/6 maintainance ~ 11/15 14:59 solid
for(i=115;i<120;i++)RELEASE_TS[i]={'released':new Date('2019-11-06T15:00:00.000+09:00').valueOf()};
//s3.5 gacha: 11/15 15:00 ~ ??? solid
for(i=120;i<122;i++)RELEASE_TS[i]={'released':new Date('2019-11-15T00:00:00.000+09:00').valueOf(),'gepf':'pu'};
//e4 event: 11/21 maintainance ~ 11/30 14:59 solid
//e4 gacha: 11/21 maintainance ~ 11/30 14:59 solid
for(i=122;i<127;i++)RELEASE_TS[i]={'released':new Date('2019-11-21T15:00:00.000+09:00').valueOf()};
//f1 gacha: 11/30 maintainance ~ 12/06 15:00 solid
for(i=127;i<132;i++)RELEASE_TS[i]={'released':new Date('2019-11-30T00:00:00.000+09:00').valueOf()};
//e5 event: 12/06 15:00 ~ 12/16 14:59 solid
for(i=132;i<137;i++)RELEASE_TS[i]={'released':new Date('2019-12-06T15:00:00.000+09:00').valueOf()};
//s5.5 gacha: 12/16  ~ 12/23 14:59 solid
for(i=137;i<139;i++)RELEASE_TS[i]={'released':new Date('2019-12-16T00:00:00.000+09:00').valueOf(),'gepf':'pu'};
//e6 event: 12/23 15:00 ~ 12/31 14:59 solid
//e6 gacha: 12/23 15:00 ~ 12/31 14:59 solid
for(i=139;i<144;i++)RELEASE_TS[i]={'released':new Date('2019-12-23T15:00:00.000+09:00').valueOf()};


//虹R(4月5日运营公告 没有具体卡)
for(i=203;i<212;i++)RELEASE_TS[i]={'released':new Date('2020-04-06T15:00:00.000+09:00').valueOf()};
//栞R(虹fes公告 没有具体卡)
for(i=284;i<286;i++)RELEASE_TS[i]={'released':new Date('2020-08-05T15:00:00.000+09:00').valueOf()};
//米岚R(没有具体卡)
for(i=526;i<528;i++)RELEASE_TS[i]={'released':new Date('2021-09-03T15:00:00.000+09:00').valueOf()};
for(i=529;i<531;i++)RELEASE_TS[i]={'released':new Date('2021-09-03T15:00:00.000+09:00').valueOf()};

function update(card_m_id,date,gepf){
    masterdata.ALL(`select school_idol_no from m_card where id = ${card_m_id}`).then(card=>{
        if(!card[0])throw new Error('Your database is earlier than notice');
        const sin = card[0].school_idol_no;
        if(!RELEASE_TS[sin]){
            RELEASE_TS[sin] = {'released':date, 'gepf':gepf};
        }else if(RELEASE_TS[sin].released > date){
            RELEASE_TS[sin].released = date;
            if(gepf)RELEASE_TS[sin].gepf = gepf;
        }else if(RELEASE_TS[sin].released === date && !RELEASE_TS[sin].gepf){
            RELEASE_TS[sin].gepf = gepf;
        }
    })
}

walk(DIR_NOTICES,async (filePath,stat)=>{
    const notice = JSON.parse(fs.readFileSync(filePath));
    if(notice.category===2 || notice.category===3){//Gacha or Event
        const text = notice.detail_text.dot_under_text;
        const date_sub = text.indexOf('>【開催期間】1');
        if(date_sub!==-1){
            //It should not be wrong before the service ends.
            const date = parseInt(text.slice(date_sub+10,date_sub+20))*1000;
            //console.log(date,new Date(date));
            const texparts = text.split('<card value="');
            for(let i=1; i<texparts.length; i++){//the first part is not a card
                //gepf
                let gepf = null;
                if(notice.category===3)gepf = 'evt';
                else if(notice.title.dot_under_text.indexOf('パーティーガチャ開催！！')!==-1)gepf = 'pu';
                else if(notice.title.dot_under_text.indexOf('スクスタフェス')!==-1)gepf = 'fes';
                else if(notice.title.dot_under_text.indexOf('ピックアップ')!==-1)gepf = 'pu';
                else gepf = 'gac';
                update(texparts[i].slice(0,9),date,gepf);
            }
        }

        //patch for part 1 and part 2 (event scouting)
        if(notice.title.dot_under_text.indexOf('登場スクールアイドル紹介')!==-1){
            //console.log(new Date(notice.date*1000));
            const texparts_2 = text.split('後編</color>');
            const texparts_1 = text.split('前編</color>');
            if(texparts_2[1]){
                //sometimes there is a space and sometimes there isn't, so it is 12~23
                const date = parseInt(texparts_2[1].slice(12,23))*1000;
                if(date === NaN) throw new Error(texparts_2[1].slice(13,23));
                //console.log(date,new Date(date));
                const m_id = texparts_2[1].split("<subtitle text=\"後編ガチャ登場スクールアイドル\" /><card value=\"")[1].slice(0,9);
                update(m_id,date);
            }
            else {
                console.log('unexpected notice type');
                console.log(texparts_2);
            }
            if(texparts_1[1]){
                //sometimes there is a space and sometimes there isn't
                const date = parseInt(texparts_1[1].slice(12,23))*1000;
                if(date === NaN) throw new Error(texparts_1[1].slice(13,23));
                //console.log(date,new Date(date));
                const m_id = texparts_1[1].split("<subtitle text=\"前編ガチャ登場スクールアイドル\" /><card value=\"")[1].slice(0,9);
                update(m_id,date);
            }
            else {
                console.log('unexpected notice type');
                console.log(texparts_1);
            }
        }

    }
});

setTimeout(()=>{
    for(let key in RELEASE_TS){
        console.log(key,RELEASE_TS[key].gepf,new Date(RELEASE_TS[key].released));
    }
    fs.writeFileSync(PATH_OUT,JSON.stringify(RELEASE_TS));
},1000)
