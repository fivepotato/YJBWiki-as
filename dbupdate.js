const fs = require("fs");
const request = require("request");
const sqlite = require("sqlite3");
const progress = require("progress-stream");
const db_differ = require("./db_differ");
const DIR_DIFF = `./diff_results/`;
const DIR_RESULT = `${DIR_DIFF}${new Date().valueOf()}/`;
const DIR_OLD_DATABASE_MASTERDATA = `${DIR_DIFF}masterdata_old.db`;
const DIR_OLD_DATABASE_DICTIONARY_JA_K = `${DIR_DIFF}dictionary_ja_k_old.db`;

const database_download = async (dir, name) => {
    const ostream = fs.createWriteStream(`${dir}${name}.db`);
    const str = progress({
        time: 5000,
    });
    str.on('progress', (progress) => {
        console.log(name, progress.transferred);
    });
    return await new Promise(res => {
        request(`https://as.lovelive.eu.org/downloads/${name}.db`)
            .pipe(str)
            .pipe(ostream)
            .on('close', err => {
                res(err);
            })
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

(async () => {
    //download new database temporarily
    const p1 = database_download(DIR_DIFF, "masterdata");
    const p2 = database_download(DIR_DIFF, "dictionary_ja_k");
    await Promise.all([p1, p2]);
    //try open
    const rec = true;
    const masterdata = new sqlite.Database(`${DIR_DIFF}masterdata.db`, (err) => {
        if (err) rec = false;
        masterdata.close();
    });
    const dictionary_ja_k = new sqlite.Database(`${DIR_DIFF}dictionary_ja_k.db`, (err) => {
        if (err) rec = false;
        dictionary_ja_k.close();
    });
    if (rec === false) {
        console.log("Download Failed.");
        return;
    }
    console.log("Download End.");

    //move old database
    await copyFile('./masterdata.db', DIR_OLD_DATABASE_MASTERDATA);
    await copyFile('./dictionary_ja_k.db', DIR_OLD_DATABASE_DICTIONARY_JA_K);
    //move new database
    await copyFile(`${DIR_DIFF}masterdata.db`, './masterdata.db');
    await copyFile(`${DIR_DIFF}dictionary_ja_k.db`, './dictionary_ja_k.db');

    console.log("Main database updated.")

    //start diff log
    fs.mkdir(DIR_RESULT, (err) => { if (err) throw new Error(err) });
    console.log("Start diffing masterdata.db and dictionary_ja_k.db");
    const d1 = db_differ.db_diff(DIR_RESULT, DIR_OLD_DATABASE_MASTERDATA, `${DIR_DIFF}masterdata.db`, "abstract_masterdata.txt");
    const d2 = db_differ.db_diff(DIR_RESULT, DIR_OLD_DATABASE_DICTIONARY_JA_K, `${DIR_DIFF}dictionary_ja_k.db`, "abstract_dictionary_ja_k.txt");
    const [mCh, dCh] = await Promise.all([d1, d2]);
    if (mCh === false) console.log("no change from masterdata.db");
    else {
        //save new database to result directory
        console.log("saving changes from masterdata.db");
        copyFile(`${DIR_DIFF}masterdata.db`, `${DIR_RESULT}masterdata.db`);
    }
    if (dCh === false) console.log("no change from dictionary_ja_k.db");
    else {
        //save new database to result directory
        console.log("saving changes from dictionary_ja_k.db");
        copyFile(`${DIR_DIFF}dictionary_ja_k.db`, `${DIR_RESULT}dictionary_ja_k.db`)
    }
})()