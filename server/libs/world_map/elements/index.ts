import Ambience from "./ambience";
import door from "./door";
import Interactable from "./interactable";
import Mapobj from "./mapobj";
import Music from "./music";
import PerkMachine from "./perk_machine";
import Platform from "./platform";
import PlayerSpawnZone from "./player_spawn_zone";
import PowerSwitch from "./power_switch";
import { Reverb } from "./reverb";
import SoundSource from "./sound_source";
import Wallbuy from "./wallbuy";
import Window from "./window";
import ZombieSpawnZone from "./zombie_spawn_zone";
import Zone from "./zone";

const mapElements: Record<string, any> = {
    platform: Platform,
    zone: Zone,
    ambience: Ambience,
    soundSource: SoundSource,
    door: door,
    wallbuy: Wallbuy,
    interactable: Interactable,
    window: Window,
    perkMachine: PerkMachine,
    playerSpawn: PlayerSpawnZone,
    zombieSpawn: ZombieSpawnZone,
    reverb: Reverb,
    powerSwitch: PowerSwitch,
    Music,
};

export default mapElements;
