const fs = require("fs");
const sqlite = require("sqlite3");
const util = require("util");
const path = require("path");
let dir_depth = 0;
while(true){
    try{
        fs.readFileSync(`${("../").repeat(dir_depth)}masterdata.db`);
    }catch(e){
        dir_depth += 1;
        break;
    }
}
const masterdata = new sqlite.Database(`${("../").repeat(dir_depth)}masterdata.db`,(err)=>{
    if(err)throw new Error(err);
});
const dictionary_ja_k = new sqlite.Database(`${("../").repeat(dir_depth)}dictionary_ja_k.db`,(err)=>{
    if(err)throw new Error(err);
});
masterdata.ALL = util.promisify(masterdata.all);
dictionary_ja_k.EACH = util.promisify(dictionary_ja_k.each);
const walk = async (currentDirPath, callback) => {
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
};
module.exports = {
    memid_to_fullname: {1:"高坂穗乃果",2:"绚濑绘里",3:"南小鸟",4:"园田海未",5:"星空凛",6:"西木野真姬",7:"东条希",8:"小泉花阳",9:"矢泽妮可",101:"高海千歌",102:"樱内梨子",103:"松浦果南",104:"黑泽黛雅",105:"渡边曜",106:"津岛善子",107:"国木田花丸",108:"小原鞠莉",109:"黑泽露比",201:"上原步梦",202:"中须霞",203:"樱坂雫",204:"朝香果林",205:"宫下爱",206:"近江彼方",207:"优木雪菜",208:"艾玛·维尔德",209:"天王寺璃奈",210:"三船栞子"},
    memid_to_shortname: {1:"穗乃果",2:"绘里",3:"小鸟",4:"海未",5:"凛",6:"真姬",7:"希",8:"花阳",9:"妮可",101:"千歌",102:"梨子",103:"果南",104:"黛雅",105:"曜",106:"善子",107:"花丸",108:"鞠莉",109:"露比",201:"步梦",202:"霞",203:"雫",204:"果林",205:"爱",206:"彼方",207:"雪菜",208:"艾玛",209:"璃奈",210:"栞子"},
    memid_to_onename: {1:"果",2:"绘",3:"鸟",4:"海",5:"凛",6:"姬",7:"希",8:"花",9:"妮",101:"千",102:"梨",103:"南",104:"黛",105:"曜",106:"善",107:"丸",108:"鞠",109:"露",201:"步",202:"霞",203:"雫",204:"林",205:"爱",206:"彼",207:"菜",208:"艾",209:"璃",210:"栞"},
    attribute_to_onename: {1:"粉",2:"绿",3:"蓝",4:"红",5:"黄",6:"紫",9:"无"},
    rarity_to_onename: {10:"R",20:"SR",30:"UR"},
    rarity_to_base_level: {10:40, 20:60, 30:80},
    type_to_lowername: {1:"vo",2:"sp",3:"gd",4:"sk"},
    type_to_uppername: {1:"Vo",2:"Sp",3:"Gd",4:"Sk"},
    skilltarget_to_name: {1:"全员",50:"仲间",53:"同作战",54:"同学校",55:"同小队",56:"同属性",57:"同type",59:"自身",60:"同年级"},
    base95: s => Array.from(s).map(c => c.codePointAt(0) - 32).reduce((x, y) => x * 95 + y),
    walk,
    masdat: masterdata.ALL,
    dic_k: dictionary_ja_k.EACH,
    
}