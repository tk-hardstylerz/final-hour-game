interface Bounds {
    minx: number; maxx: number;
    miny: number; maxy: number;
    minz: number; maxz: number;
}

export interface ParsedMapElement {
    type: string;
    properties: Record<string, any>;
}

export interface TextParseResult {
    bounds: Bounds;
    public_: boolean;
    roundSounds: number;
    elements: ParsedMapElement[];
}

function parseBoundsFrom6(args: string[], offset: number): Bounds {
    return {
        minx: parseInt(args[offset], 10),
        maxx: parseInt(args[offset + 1], 10),
        miny: parseInt(args[offset + 2], 10),
        maxy: parseInt(args[offset + 3], 10),
        minz: parseInt(args[offset + 4], 10),
        maxz: parseInt(args[offset + 5], 10),
    };
}

function isNumeric(s: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(s);
}

function parseNamedParams(args: string[], startIdx: number): Record<string, string> {
    const params: Record<string, string> = {};
    for (let i = startIdx; i < args.length; i++) {
        const eqIdx = args[i].indexOf("=");
        if (eqIdx > 0) {
            const key = args[i].substring(0, eqIdx);
            const value = args[i].substring(eqIdx + 1);
            params[key] = value;
        }
    }
    return params;
}

function findAllNumeric(args: string[], startIdx: number): string[] {
    const nums: string[] = [];
    for (let i = startIdx; i < args.length; i++) {
        if (isNumeric(args[i])) {
            nums.push(args[i]);
        } else {
            break;
        }
    }
    return nums;
}

export function parseTextFormat(text: string): TextParseResult {
    const bounds: Bounds = { minx: 0, maxx: 10, miny: 0, maxy: 10, minz: 0, maxz: 10 };
    let public_ = false;
    let roundSounds = 1;
    const elements: ParsedMapElement[] = [];

    const lines = text.split("\n");
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith("#") || line.startsWith("//")) continue;

        const args = line.split(/\s+/);
        const cmd = args[0];
        const rest = args.slice(1);

        switch (cmd) {
            case "bounds":
                if (rest.length >= 6) {
                    const b = parseBoundsFrom6(rest, 0);
                    bounds.minx = b.minx; bounds.maxx = b.maxx;
                    bounds.miny = b.miny; bounds.maxy = b.maxy;
                    bounds.minz = b.minz; bounds.maxz = b.maxz;
                }
                break;

            case "maxx":
                if (rest.length >= 1) bounds.maxx = parseInt(rest[0], 10);
                break;
            case "maxy":
                if (rest.length >= 1) bounds.maxy = parseInt(rest[0], 10);
                break;
            case "maxz":
                if (rest.length >= 1) bounds.maxz = parseInt(rest[0], 10);
                break;
            case "minx":
                if (rest.length >= 1) bounds.minx = parseInt(rest[0], 10);
                break;
            case "miny":
                if (rest.length >= 1) bounds.miny = parseInt(rest[0], 10);
                break;
            case "minz":
                if (rest.length >= 1) bounds.minz = parseInt(rest[0], 10);
                break;

            case "public":
                public_ = true;
                break;

            case "roundSounds":
                if (rest.length >= 1) roundSounds = parseInt(rest[0], 10);
                break;

            case "platform":
                if (rest.length >= 7) {
                    const b = parseBoundsFrom6(rest, 0);
                    elements.push({
                        type: "platform",
                        properties: { ...b, type: rest[6] },
                    });
                }
                break;

            case "wall":
                if (rest.length >= 7) {
                    const b = parseBoundsFrom6(rest, 0);
                    const props: Record<string, any> = { ...b, type: rest[6] };
                    if (rest.length >= 8 && isNumeric(rest[7])) {
                        props.strength = parseInt(rest[7], 10);
                    }
                    elements.push({ type: "platform", properties: { ...props } });
                }
                break;

            case "zone":
                if (rest.length >= 7) {
                    const b = parseBoundsFrom6(rest, 0);
                    const textStart = line.indexOf(rest[6]);
                    const zoneText = textStart >= 0 ? line.substring(textStart).trim() : "";
                    elements.push({
                        type: "zone",
                        properties: { ...b, innerText: zoneText },
                    });
                }
                break;

            case "door":
                if (rest.length >= 8) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = {
                        ...b,
                        walltype: rest[6],
                        tiletype: rest[7],
                        minpoints: parseInt(rest[8], 10),
                    };
                    if (rest.length >= 10) params.activates = rest[9];
                    if (rest.length >= 11 && rest[10] === "open") params.open = true;
                    elements.push({ type: "door", properties: params });
                }
                break;

            case "soundSource":
            case "src":
                if (rest.length >= 7) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = { ...b, sound: rest[6] };
                    if (rest.length >= 8 && isNumeric(rest[7])) {
                        params.volume = parseInt(rest[7], 10);
                    }
                    elements.push({ type: "soundSource", properties: params });
                }
                break;

            case "ambience":
                if (rest.length >= 7) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = { ...b, sound: rest[6] };
                    if (rest.length >= 8 && isNumeric(rest[7])) {
                        params.volume = parseInt(rest[7], 10);
                    }
                    elements.push({ type: "ambience", properties: params });
                }
                break;

            case "music":
                if (rest.length >= 7) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = { ...b, sound: rest[6] };
                    if (rest.length >= 8 && isNumeric(rest[7])) {
                        params.volume = parseInt(rest[7], 10);
                    }
                    elements.push({ type: "Music", properties: params });
                }
                break;

            case "reverb":
            case "rv":
                if (rest.length >= 6) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = { ...b };
                    const namedParams = parseNamedParams(rest, 6);
                    for (const [key, value] of Object.entries(namedParams)) {
                        const num = parseFloat(value);
                        params[key] = isNaN(num) ? value : num;
                    }
                    if (rest.length >= 8 && isNumeric(rest[6]) && isNumeric(rest[7])) {
                        params.mix = parseInt(rest[7], 10);
                        params.reverb = parseInt(rest[6], 10);
                    }
                    elements.push({ type: "reverb", properties: params });
                }
                break;

            case "playerSpawn":
                if (rest.length >= 6) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = { ...b };
                    if (rest.length >= 7) params.name = rest[6];
                    elements.push({ type: "playerSpawn", properties: params });
                }
                break;

            case "zombieSpawn":
                if (rest.length >= 6) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = { ...b };
                    if (rest.length >= 7) params.name = rest[6];
                    if (rest.length >= 8 && rest[7] === "zBound") params.zBound = true;
                    elements.push({ type: "zombieSpawn", properties: params });
                }
                break;

            case "wallbuy":
                if (rest.length >= 9) {
                    const b = parseBoundsFrom6(rest, 0);
                    elements.push({
                        type: "wallbuy",
                        properties: {
                            ...b,
                            weaponName: rest[6],
                            weaponCost: parseInt(rest[7], 10),
                            ammoCost: parseInt(rest[8], 10),
                        },
                    });
                }
                break;

            case "window":
                if (rest.length >= 7) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = { ...b };
                    const named = parseNamedParams(rest, 6);
                    if (named.hp) {
                        params.hp = parseInt(named.hp, 10);
                    } else if (rest.length >= 7 && isNumeric(rest[6])) {
                        params.hp = parseInt(rest[6], 10);
                    }
                    elements.push({ type: "window", properties: params });
                }
                break;

            case "perkMachine":
                if (rest.length >= 6) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = { ...b };
                    const named = parseNamedParams(rest, 6);
                    if (named.perk) params.perk = named.perk;
                    if (named.sound) params.sound = named.sound;
                    if (named.quantity) params.quantity = parseInt(named.quantity, 10);
                    if (named.price) params.price = parseInt(named.price, 10);
                    if (named.allowDuplicate) params.allowDuplicate = named.allowDuplicate === "true";
                    if (named.name) params.name = named.name;
                    if (rest.length >= 7 && !rest[6].includes("=")) params.perk = rest[6];
                    elements.push({ type: "perkMachine", properties: params });
                }
                break;

            case "powerSwitch":
                if (rest.length >= 6) {
                    const b = parseBoundsFrom6(rest, 0);
                    const named = parseNamedParams(rest, 6);
                    const params: Record<string, any> = { ...b, cost: 0 };
                    if (named.cost) params.cost = parseInt(named.cost, 10);
                    if (rest.length >= 7 && isNumeric(rest[6])) params.cost = parseInt(rest[6], 10);
                    elements.push({ type: "powerSwitch", properties: params });
                }
                break;

            case "interactable":
                if (rest.length >= 6) {
                    const b = parseBoundsFrom6(rest, 0);
                    elements.push({ type: "interactable", properties: { ...b } });
                }
                break;

            case "staircase":
                if (rest.length >= 9) {
                    const b = parseBoundsFrom6(rest, 0);
                    const params: Record<string, any> = {
                        ...b,
                        tile: rest[6],
                        walltile: rest[7],
                        dir: parseInt(rest[8], 10),
                    };
                    if (rest.length >= 10) {
                        const textStart = line.indexOf(rest[9]);
                        if (textStart >= 0) params.zonetext = line.substring(textStart).trim();
                    }
                    elements.push({ type: "staircase", properties: params });
                }
                break;

            case "location":
                if (rest.length >= 4 && isNumeric(rest[0]) && isNumeric(rest[1]) && isNumeric(rest[2])) {
                    const x = parseInt(rest[0], 10);
                    const y = parseInt(rest[1], 10);
                    const z = parseInt(rest[2], 10);
                    const textStart = line.indexOf(rest[3]);
                    const name = textStart >= 0 ? line.substring(textStart).trim() : "";
                    elements.push({
                        type: "location",
                        properties: { minx: x, maxx: x, miny: y, maxy: y, minz: z, maxz: z, name },
                    });
                }
                break;

            case "dz":
                if (rest.length >= 8) {
                    const b = parseBoundsFrom6(rest, 0);
                    elements.push({
                        type: "dz",
                        properties: {
                            ...b,
                            soundname: rest[6],
                            volume: parseInt(rest[7], 10),
                        },
                    });
                }
                break;

            case "bounded_source":
                if (rest.length >= 8) {
                    const b = parseBoundsFrom6(rest, 0);
                    const textStart = line.indexOf(rest[7]);
                    const dataIdx = line.indexOf(rest[7]);
                    let data = "";
                    if (dataIdx >= 0) {
                        data = line.substring(dataIdx + rest[7].length).trim();
                    }
                    elements.push({
                        type: "bounded_source",
                        properties: {
                            ...b,
                            soundname: rest[6],
                            volume: parseInt(rest[7], 10),
                            data,
                        },
                    });
                }
                break;

            case "sub_tile":
                if (rest.length >= 7) {
                    const b = parseBoundsFrom6(rest, 0);
                    elements.push({
                        type: "sub_tile",
                        properties: { ...b, type: rest[6] },
                    });
                }
                break;

            case "object":
                if (rest.length >= 8) {
                    const b = parseBoundsFrom6(rest, 0);
                    elements.push({
                        type: "object",
                        properties: {
                            ...b,
                            name: rest[6],
                            dir: parseInt(rest[7], 10),
                            id: rest.length >= 9 ? parseInt(rest[8], 10) : undefined,
                        },
                    });
                }
                break;
        }
    }

    return { bounds, public_, roundSounds, elements };
}
