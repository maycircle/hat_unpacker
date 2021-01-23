import { mkdir, readdirSync, stat } from "fs";
import { basename, extname, join, isAbsolute, resolve } from "path";

import { HatDecryptor, exportDecryptedHat } from "./hatlib";

function hatExport(path) {
    console.log("Decrypting \"" + basename(path) + "\" ...");
    let hat = HatDecryptor.fromFile(path).decrypt();

    console.log("Exporting \"" + basename(path) + "\" ...");
    let unpackedPath = resolve(path, "../../unpacked/" + basename(path, ".hat") + ".png");
    exportDecryptedHat(unpackedPath, hat);
}

// Extracts multiple files from folder.
function hatsFolderExtract(path) {
    readdirSync(path).forEach(file => {
        if (extname(file) == ".hat")
            hatExport(join(path, file));
    });
}

function main(path) {
    stat(path, (err, stat) => {
        if (err) throw err;

        if (stat.isFile()) hatExport(path);
        else if (stat.isDirectory()) hatsFolderExtract(path);
    });
}

// Check command-line arguments before calling `main`
if (process.argv.length != 3) {
    console.log("Using \".\\packed\" directory as default path");
    mkdir(".\\packed", err => { if (err && err.code != "EEXIST") throw err });
    main(".\\packed");
}
else {
    let path = process.argv[2];
    main(extname(path) == '' ?
        path : isAbsolute(path) ?
            path : join("packed", path));
}
