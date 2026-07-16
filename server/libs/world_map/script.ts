import vm from "vm";
import WorldMap from ".";
import WrappedWorldMap from "../map_scripts/wrapped_world_map";
export default class MapScript {
    script: vm.Script;
    context: vm.Context;
    constructor(map: WorldMap, script: string) {
        this.script = new vm.Script(script, {
            filename: `Map script in ${map.mapName}`,
        });
        this.context = vm.createContext(WrappedWorldMap(map), {});
    }
    async execute(): Promise<void> {
        await this.script.runInContext(this.context, {
            displayErrors: true,
        });
    }
}
