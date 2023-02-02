import { readFile } from 'fs/promises'
import fs from 'fs';
import gpxParser from 'gpxparser';


function parseGPX( filename ) {
    let gpx = new gpxParser();
    gpx.parse(fs.readFileSync(`./data/gpx/${filename}.gpx`, 'utf8'));
    
    fs.writeFile(`./data/json/${filename}.json`, JSON.stringify(gpx.tracks[0]), err => {
        return false;
    })
    return true;
}

let geojson = JSON.stringify(parseGPX('pinos'));
console.log(geojson);


