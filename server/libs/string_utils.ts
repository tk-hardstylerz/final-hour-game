import math_eval from "math-expression-evaluator";
export function array_to_string(
    the_array: string[],
    start_string = "",
    single_item_string = "",
    end_string = "and"
): string {
    var the_string = start_string;
    if (the_array.length === 1) {
        the_string = single_item_string;
    } else {
        for (let i = 0; i < the_array.length; i++) {
            if (i === the_array.length - 1) {
                the_string += `${end_string} ${the_array[i]}.`;
            } else {
                the_string += `${the_array[i]}, `;
            }
        }
    }
    return the_string;
}
export function to_num(v: string | number): number {
    if (typeof v === "number") return v;
    var res = parseFloat(v);
    if (!res) {
        res = 0;
    }
    return res;
}

export function evaluate_math(text: string): string {
    try {
        return text.replaceAll(/\[(.*?)\]/g, (match: any, p1: any) => {
            return `${match} => ${math_eval.eval(p1)}`;
        });
    } catch (e) {
        return text;
    }
}
export function parseValue(value: string): string | number | boolean | null {
    if (value === "null") {
        return null;
    } else if (value === "true" || value === "false") {
        return value === "true";
    } else if (!isNaN(parseFloat(value))) {
        return parseFloat(value);
    } else {
        return value;
    }
}
