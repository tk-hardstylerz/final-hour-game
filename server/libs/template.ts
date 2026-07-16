import util from "util";
import nunjucks from "nunjucks";
const env = nunjucks.configure("./maps/", {
    autoescape: false,
    //lstripBlocks: true,
});
export const render_string = (
    str: string,
    context?: Object
): Promise<string> => {
    return new Promise((resolve, reject) => {
        env.renderString(str, context ?? {}, (err, data) => {
            if (err) return reject(err);
            resolve(data ?? str);
        });
    });
};
