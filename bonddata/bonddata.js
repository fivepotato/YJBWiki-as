//directory constants
let DIR_SRC_DATABASE_MASTERDATA = "../masterdata.db";
let DIR_SRC_DATABASE_DICTIONARY_JA_K = "../dictionary_ja_k.db";
let DIR_IMG_MAPPING = "../img_mapping.json";
let DIR_OUT_BOND = "./绊数据.txt";
let DIR_SRC_BOND = "./绊数据_format.txt";

//硬等运行完.jpg
let TIMEOUT = 3000;

//dependents
const fs = require("fs");
const sqlite = require("sqlite3").verbose();
const format = require("string-format");

//load img mapping
let itemimg = JSON.parse(fs.readFileSync(DIR_IMG_MAPPING));

//load database before analyzing, block
let masterdata = new sqlite.Database(DIR_SRC_DATABASE_MASTERDATA,(err)=>{
    if(err)console.error(err);
})
let dictionary_ja_k = new sqlite.Database(DIR_SRC_DATABASE_DICTIONARY_JA_K,(err)=>{
    if(err)console.error(err);
})

//BOND_DATA (complete)
//1.bond board table
function description_panel(arg1,arg2){
    switch (arg1){
        case 1:return`<ASImg id=446 w=30/>+${(arg2/100).toFixed(1)}%`;
        case 2:return`<ASImg id=7916 w=30/>+${(arg2/100).toFixed(1)}%`;
        case 3:return`<ASImg id=219 w=30/>+${(arg2/100).toFixed(1)}%`;
        case 4:return`暴击率 +${(arg2/100).toFixed(1)}%`;
        case 5:return`暴击得分 +${(arg2/100).toFixed(1)}%`;
        case 6:return`SP槽获得量 +${(arg2/100).toFixed(1)}%`;
        case 7:return`SP得分 +${(arg2/100).toFixed(1)}%`;
        case 8:return`Vo类型debuff -${(arg2/100).toFixed(1)}%`;
        case 9:return`Sp类型debuff -${(arg2/100).toFixed(1)}%`;
        case 10:return`Gd类型debuff -${(arg2/100).toFixed(1)}%`;
        case 11:return`Sk类型debuff -${(arg2/100).toFixed(1)}%`;
        case 12:return`同属性加成 +${(arg2/100).toFixed(1)}%`;
        case 13:return`R等级上限 +${arg2}`;
        case 14:return`SR等级上限 +${arg2}`;
        case 15:return`UR等级上限 +${arg2}`;
    }
}
let cell_content = [];//data cache
masterdata.each("select id,love_level_master_love_level from m_member_love_panel where member_master_id = 1",(err0,panel)=>{
    masterdata.each(`select id,bonus_type,bonus_value from m_member_love_panel_cell where member_love_panel_master_id = ${panel.id}`,(err1,cell)=>{
        masterdata.all(`select * from m_member_love_panel_cell_source_content where member_love_panel_cell_master_id = ${cell.id} order by display_order`,(err2,source)=>{
            source[0].level = panel.love_level_master_love_level, source[0].description = description_panel(cell.bonus_type,cell.bonus_value);
            cell_content.push(source);
        })
    })
})
let cell_bonus = [];
for (let i=0;i<9900;i++){
    masterdata.all(`select * from m_member_love_panel_bonus where member_love_panel_master_id = ${1000*i+1} order by bonus_type`,(err,bonuses)=>{
        if(bonuses[0]!==undefined){
            cell_bonus.push(bonuses);
        };
    })
}
//2.bond ep reward
let config_enabled_members = [1,101,201,210,211];
function item_episode(content_type,content_amount){
    switch(content_type){
        case 0: return`<ASImg id=3650 w=30/>×${content_amount}`;
        default: return`<ASImg id=${itemimg[content_type]} w=30/>×${content_amount}`;
    }
}
let episode_reward = {};
for (let memid of config_enabled_members){
    episode_reward[memid.toString()] = [];
    masterdata.each(`select * from m_story_member where member_m_id = ${memid}`,(err,story)=>{
        if(err)console.error(err);
        masterdata.all(`select * from m_story_member_rewards where story_member_master_id = ${story.id}`,(err,rewards)=>{
            if(err)console.error(err);
            if(rewards[0]!==undefined)episode_reward[memid.toString()].push({"story":story,"reward":rewards[0]});
            else episode_reward[memid.toString()].push({"story":story,"reward":null});
        });
    });
}
//3.bond level
let bond_level = [];
masterdata.each("select * from m_member_love_level",(err,love)=>{
    new Promise((res,rej)=>{
        masterdata.all(`select bonus_rate from m_love_parameter where love_level = ${love.love_level}`,(err,para)=>{
            if(para[0] !== undefined)res(para[0].bonus_rate);
            else rej();
        })
    }).then((para)=>{
        return new Promise((res)=>{
            love.parameter = para;
            masterdata.all(`select content_id,content_amount from m_member_love_level_reward where member_m_id = 1 and love_level = ${love.love_level}`,(err,reward)=>{
                if(reward[0]!==undefined)res(reward[0]);
                else res(null);
            })
        })
    },()=>{
        console.error(`ERROR: Bond Level ${love.love_level}'s parameter not found.`)
    }).then((rew)=>{
        love.reward = rew;
        bond_level.push(love);
    })
})
//123.
new Promise((res,rej)=>{
    setTimeout(()=>{
        //bond_board_table
        if(cell_content.length != cell_bonus.length*5)console.error(`ERROR: ${cell_content.length} cells of bond but ${cell_bonus.length} layers.`);
        let wikitable_bondboard = '{|class="wikitable tsticky2" style="text-align:center" \n|-\n! rowspan="2" | 层数 !! rowspan="2" | 所需<br>绊等级 !! colspan="5" | 开启一个格子的消耗 !! colspan="6" | 加成\n|-\n! style="top:28px" | <ASCommonItem name="1700" w=40/> !! style="top:28px" | <ASImg id=77728 w=40/> !! style="top:28px" | <ASImg id=495947 w=40/> !! style="top:28px" | <ASImg id=428060 w=40/> !! style="top:28px" | <ASCommonItem name="1200" w=40/> !! colspan="3" style="top:28px" | 属性加成 !! colspan="2" style="top:28px" | 其他加成 !! style="top:28px" | 本层额外加成';
        cell_content.sort((a,b)=>{return a[0].member_love_panel_cell_master_id-b[0].member_love_panel_cell_master_id;});
        cell_bonus.sort((a,b)=>{return a[0].member_love_panel_master_id-b[0].member_love_panel_master_id;});
        for(let i in cell_bonus){
            let item1,item2,item3,item4,item5;
            item1=item2=item3=item4=item5="";
            for (let j=0;j<5;j++){
                for (item of cell_content[5*i+j]){
                    switch(item.content_id){
                        case 1700:item1=item.content_amount;break;
                        case 28001:item2=item.content_amount;break;
                        case 18001:item3=item.content_amount;break;
                        case 8001:item4=item.content_amount;break;
                        case 0:item5=item.content_amount;break;
                        default:console.error(`ERROR: invalid cell content ${item}`);
                    }
                }
            }
            let bonus_description = ((b)=>{res="";for(let a of b){res+=(res===""?description_panel(a.bonus_type,a.bonus_value):`<br>${description_panel(a.bonus_type,a.bonus_value)}`)};return res;})(cell_bonus[i]);
            wikitable_bondboard += `\n|-\n| ${i*1+1} || ${cell_content[5*i][0].level} || ${item1} || ${item2} || ${item3} || ${item4} || ${item5} || ${cell_content[5*i][0].description} || ${cell_content[5*i+1][0].description} || ${cell_content[5*i+2][0].description} || ${cell_content[5*i+3][0].description} || ${cell_content[5*i+4][0].description} || ${bonus_description}`
        }
        wikitable_bondboard += '\n|}';

        //episode_reward_table
        let wikitable_ep_collection = {};
        for (let memid of config_enabled_members){
            episode_reward[memid.toString()].sort((a,b)=>{return a.story.story_no - b.story.story_no});
            let wikitable_eprew = `{|class="wikitable tsticky mw-collapsible mw-collapsed" style="text-align:center"\n|-\n! 序号 !! 绊等级 !! 奖励`;
            for (let ep of episode_reward[memid.toString()]){
                wikitable_eprew += `\n|-\n| ${ep.story.story_no} || ${ep.story.love_level} || ${ep.reward === null ? "" : item_episode(ep.reward.content_id,ep.reward.content_amount)}`;
            }
            wikitable_eprew += "\n|}";
            wikitable_ep_collection[memid.toString()] = wikitable_eprew;
        }

        //bond level/reward
        let wikitable_bondlevel = `{|class="wikitable tsticky mw-collapsible mw-collapsed" style="text-align:center"\n|-\n! 绊等级 !! 需要经验 !! 总经验 !! 绊加成 !! 获得奖励`;
        bond_level.sort((a,b)=>{return a.love_level-b.love_level});
        let prev_love_points = 0;
        for(let bdb of bond_level){
            wikitable_bondlevel += `\n|-\n| ${bdb.love_level} || ${bdb.love_point-prev_love_points} || ${bdb.love_point} || ${(bdb.parameter/100).toFixed(2)}% || ${bdb.reward === null ? "" : item_episode(bdb.reward.content_id,bdb.reward.content_amount)}`;
            prev_love_points = bdb.love_point;
        }
        wikitable_bondlevel += "\n|}";
        fs.writeFileSync(DIR_OUT_BOND,format(fs.readFileSync(DIR_SRC_BOND).toString(),wikitable_bondboard,wikitable_ep_collection[1],wikitable_ep_collection[101],wikitable_ep_collection[201],wikitable_ep_collection[210],wikitable_ep_collection[211],wikitable_bondlevel));


    },TIMEOUT);//硬等 就硬等
})
