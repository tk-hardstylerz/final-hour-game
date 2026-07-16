export default function parseData(data: string): Record<string, any> {
    const parsed: Record<string, any[]>= {};
    const lines = data.split(/\r?\n/);
    const stack: any[] = [];
    for (let line of lines) {
        line = line.trim();
        if (!line) {
            continue;
        }
        if (line.startsWith("//")) {
            continue;
        }
        if (line.endsWith("{")) {
            const objType = line.slice(0, -1).trim();
            const obj = {};
            if (stack.length) {
                if (!stack[stack.length - 1][objType]) {
                    stack[stack.length - 1][objType] = [];
                }
                stack[stack.length - 1][objType].push(obj);
            } else {
                if (!parsed[objType]) {
                    parsed[objType] = [];
                }
                parsed[objType].push(obj);
            }
            stack.push(obj);
        } else if (line === "}") {
            stack.pop();
        } else {
            const splitLine = line.split("=", 2);
            const name = splitLine[0].trim();
            const value = toValue(splitLine[1]);
            stack[stack.length - 1][name] = value;
        }
    }
    return parsed;
}

function toValue(text: string): string | number | boolean {
    try {
        if (text.toLowerCase() === "true" || text.toLowerCase() === "false") {
            return text.toLowerCase() === "true";
        }
    } catch {}
    const intValue = parseInt(text, 10);
    if (!isNaN(intValue)) {
        return intValue;
    }
    const floatValue = parseFloat(text);
    if (!isNaN(floatValue)) {
        return floatValue;
    }
    return text.trim();
}
