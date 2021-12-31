"use strict";
const DIR = "./audio_cache/";
const fs = require("fs"),
    request = require("request"),
    progress = require("progress-stream"),
    audioLoader = require("audio-loader");
//const flacBindings = require("flac-bindings");

/*
audioLoader(`${DIR}music_${"0001"}.wav`).then(({ length, numberOfChannels, sampleRate, duration, _data, _channelData }) => {
    console.log(duration);
});
*/
const audio_download = async (music_id) => {
    const music_id_str4 = ("0000" + music_id).slice(-4);
    const ostream = fs.createWriteStream(`${DIR}music_${music_id_str4}.wav`);
    const str = progress({
        time: 10000,
    });
    str.on('progress', (progress) => {
        console.log("downloading music", music_id_str4, progress.runtime, progress.transferred);
    });
    return await new Promise((res, rej) => {
        const req = request(`https://cloud.tsinghua.edu.cn/d/2c5f65d221bf4f6aa764/files/?p=%2Fwav%2F%E6%AD%8C%E6%9B%B2%2F%E5%AE%8C%E6%95%B4%E6%AD%8C%E6%9B%B2%2Fmusic_${music_id_str4}.wav&dl=1`);
        req.pipe(str).pipe(ostream).on('close', () => {
            res();
        });
        req.on('error', (e) => {
            //console.log(1919810);
            rej(e);
        });
    })
}

module.exports = {
    get_music_duration: async (music_id) => {
        const music_id_str4 = ("0000" + music_id).slice(-4);
        let duration = null;
        if (!fs.existsSync(`${DIR}music_${music_id_str4}.wav`))
            await audio_download(music_id);
        ({ duration } = await audioLoader(`${DIR}music_${music_id_str4}.wav`).catch((e) => {
            return { duration: null };
        }));
        return duration;
    }
}
//audio_download(1001);

const main = async () => {
    /*
    const encoder = new flacBindings.StreamEncoder({
        channels: 2,        // 2 channels (left and right)
        bitsPerSample: 16,  // 16-bit samples
        samplerate: 44100,
    });
    const music_id_str4 = "0001";
    //const req = request(`https://cloud.tsinghua.edu.cn/d/2c5f65d221bf4f6aa764/files/?p=%2Fwav%2F%E6%AD%8C%E6%9B%B2%2F%E5%AE%8C%E6%95%B4%E6%AD%8C%E6%9B%B2%2Fmusic_${music_id_str4}.wav&dl=1`);

    const ostream = fs.createWriteStream(`${DIR}music_${music_id_str4}.flac`);
    
    //req.pipe(encoder).pipe(ostream);
    const istream = fs.createReadStream(`${DIR}music_${music_id_str4}.wav`);
    */
    if (!isNaN(parseInt(process.argv0))) {

        const t = await module.exports.get_music_duration(parseInt(process.argv0));
        console.log(t);
    }
}

main();
