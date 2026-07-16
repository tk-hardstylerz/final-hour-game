import { PathLike } from "fs";
import fs from "fs/promises";

export async function exists(path: PathLike): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch (err) {
        return false;
    }
}
