import path from "path";
import fs from "fs";

const files: string[] = fs.readdirSync("./libs/items/");

const exportedModules: Record<string, any> = {};

for (const fileName of files) {
    const parsedPath = path.parse(`./libs/items/${fileName}`);
    const moduleName = parsedPath.name;

    exportedModules[moduleName] = require(`./items/${moduleName}`);
}

export = exportedModules;
