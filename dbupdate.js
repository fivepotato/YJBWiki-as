"use strict";
const fs = require("fs");
const request = require("request");
const sqlite = require("sqlite3");
const util = require("util");
const progress = require("progress-stream");
const db_differ = require("./db_differ");
const DIR_DIFF = `./diff_results/`;
const DIR_RESULT = `${DIR_DIFF}${new Date().valueOf()}/`;
const DIR_OLD_DATABASE_MASTERDATA = `${DIR_DIFF}masterdata_old.db`;
const DIR_OLD_DATABASE_DICTIONARY_JA_K = `${DIR_DIFF}dictionary_ja_k_old.db`;

sqlite.Database.prototype.All = util.promisify(sqlite.Database.prototype.all);
const database_download = async (dir, name) => {
    const ostream = fs.createWriteStream(`${dir}${name}.db`);
    const str = progress({
        time: 5000,
    });
    str.on('progress', (progress) => {
        console.log(name, progress.transferred);
    });
    return await new Promise((res, rej) => {
        const req = request(`https://as.lovelive.eu.org/downloads/${name}.db`);
        req.pipe(str).pipe(ostream).on('close', () => {
            res();
        });
        req.on('error', (e) => {
            console.log(1919810);
            rej(e);
        });
    })
}
const copyFile = async (src, des) => {
    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(des);
    readStream.pipe(writeStream);
    return await new Promise((res) => {
        readStream.on('end', () => {
            res();
        })
    })
}
async function check_new_availbility() {
    let rec = true;
    try {
        fs.statSync(`${DIR_DIFF}masterdata.db`);
        fs.statSync(`${DIR_DIFF}dictionary_ja_k.db`);
    } catch (e) {
        console.log(e);
        return false;
    }
    const masterdata = new sqlite.Database(`${DIR_DIFF}masterdata.db`, (err) => {
        if (err) rec = false;
    });
    const dictionary_ja_k = new sqlite.Database(`${DIR_DIFF}dictionary_ja_k.db`, (err) => {
        if (err) rec = false;
    });
    await masterdata.All(`select * from sqlite_master`).catch((e) => {
        console.log(e);
        rec = false;
        console.log("masterdata database file download error");
    });
    await dictionary_ja_k.All(`select * from sqlite_master`).catch((e) => {
        console.log(e);
        rec = false;
        console.log("dictionary_ja_k database file download error");
    });

    masterdata.close();
    dictionary_ja_k.close();

    if (rec === false) {
        console.log("SQLite file invalid.");
        return false;
    }
    return true;
}

(async () => {
    //download new database temporarily
    if (process.argv[2] === "nodownload") {
        console.log("download skipped");
    } else {
        const p1 = database_download(DIR_DIFF, "masterdata");
        const p2 = database_download(DIR_DIFF, "dictionary_ja_k");
        const p = Promise.all([p1, p2]);
        console.log("download start");
        p.catch((onrej) => {
            throw new Error(onrej);
        });
        await p;
    }

    //try open
    let rec = await check_new_availbility();

    if (rec === false) {
        console.log("New database Error, please download again.");
        return;
    }
    console.log("New database Available");

    //move old database
    await copyFile('./masterdata.db', DIR_OLD_DATABASE_MASTERDATA);
    await copyFile('./dictionary_ja_k.db', DIR_OLD_DATABASE_DICTIONARY_JA_K);
    //move new database
    await copyFile(`${DIR_DIFF}masterdata.db`, './masterdata.db');
    await copyFile(`${DIR_DIFF}dictionary_ja_k.db`, './dictionary_ja_k.db');
    //delete temporary file
    fs.unlinkSync(`${DIR_DIFF}masterdata.db`);
    fs.unlinkSync(`${DIR_DIFF}dictionary_ja_k.db`);

    console.log("Main database updated.");

    //start diff log
    fs.mkdir(DIR_RESULT, (err) => { if (err) throw new Error(err) });
    console.log("Start diffing masterdata.db and dictionary_ja_k.db");
    const d1 = db_differ.db_diff(DIR_RESULT, DIR_OLD_DATABASE_MASTERDATA, `./masterdata.db`, "abstract_masterdata.txt");
    const d2 = db_differ.db_diff(DIR_RESULT, DIR_OLD_DATABASE_DICTIONARY_JA_K, `./dictionary_ja_k.db`, "abstract_dictionary_ja_k.txt");
    const [mCh, dCh] = await Promise.all([d1, d2]);
    if (mCh === false) console.log("NO CHANGE from masterdata.db");
    else {
        //save new database to result directory
        console.log("saving changes from masterdata.db");
        copyFile(`./masterdata.db`, `${DIR_RESULT}masterdata.db`);
    }
    if (dCh === false) console.log("NO CHANGE from dictionary_ja_k.db");
    else {
        //save new database to result directory
        console.log("saving changes from dictionary_ja_k.db");
        copyFile(`./dictionary_ja_k.db`, `${DIR_RESULT}dictionary_ja_k.db`)
    }
})().catch((e) => {
    console.log('error:???', e);
})
