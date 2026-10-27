import consts from "./consts";
import * as string_utils from "./string_utils";
import * as random from "./random";
import zomby from "./objects/zomby";
import hellhound from "./objects/hellhound";
import game from "./game_mode";
import character from "./character";
import WorldMap from "./world_map";
import Server from "./networking";
import Player from "./objects/player";
import MaxAmmoPowerup from "./powerups/max_ammo";
import Powerup from "./powerups/powerup";
import LongtimePowerup from "./powerups/long_time_powerup";
import DoublePointsPowerup from "./powerups/double_points";
import InstakillPowerup from "./powerups/instakill";
import TickExecutor from "./tick_executor";
import NukePowerUp from "./powerups/nuke";
import * as movement from "./movement";
import timer from "./timer";
import * as aria_voice from "./aria_voice";
import GroqAi from "./groq_ai";
import fs from "fs";

type AriaIntent =
    | "attack"
    | "hold"
    | "retreat"
    | "follow"
    | "defend"
    | "reload"
    | "wander";
type AriaThreat = { target: any; dist: number };
export default class Zomby_game extends game {
    round_sounds_path: string;
    possible_powerups: (typeof Powerup)[] = [
        MaxAmmoPowerup,
        DoublePointsPowerup,
        InstakillPowerup,
        NukePowerUp,
    ];
    current_long_time_powerups: LongtimePowerup[] = [];
    gotten_powerups: number;
    dog_round: boolean;
    next_round_in_progress: boolean;
    currentRoundSounds: number = 1;
    lastDogRound: number = -3;
    is_looping: boolean;
    round: number = 0;
    current_zombies: number = 0;
    total_zombies: number = 0;
    max_zombies: number = 0;
    killed_zombies: number = 0;
    double_points: boolean = false;
    instakill: boolean = false;
    mode: string = "multiplayer";
    aria_bot?: Player;
    aria_bot_active: boolean = false;
    aria_decision_ms: number = 260;
    aria_fire_delay_ms: number = 320;
    aria_move_ms: number = 340;
    aria_max_weapon_range: number = 24;
    aria_stance: AriaIntent = "attack";
    private aria_brain_enabled: boolean = false;
    private aria_brain_groq: GroqAi | null = null;
    private aria_brain_timer?: timer;
    private aria_brain_ms: number = 3000;
    private aria_brain_inflight: boolean = false;
    private aria_brain_failures: number = 0;
    private aria_brain_context: string = "";
    private aria_path_key: string = "";
    private aria_path: any[] = [];
    private aria_path_at: number = 0;
    private aria_path_pending: boolean = false;
    private aria_think_timer?: timer;
    private aria_fire_timer?: timer;
    private aria_move_timer?: timer;
    private aria_voice_timer?: timer;
    private aria_random_quip_ms: number = 45000;
    private aria_low_hp_spoken: boolean = false;
    private aria_was_dead: boolean = false;
    private aria_kills_seen: number = 0;
    private aria_voice_playing: boolean = false;
    protected tickExecutor: TickExecutor;
    constructor(server: Server, owner: Player, name: string, map: WorldMap) {
        super(server, owner, name, map);
        this.zomby_game = true;
        this.round_sounds_path = `rounds`;
        this.currentRoundSounds = random.random_number(0, 4);
        var self = this;
        this.gotten_powerups = 0;
        this.setup_round(1);
        this.dog_round = false;
        this.killed_zombies = 0;
        this.is_looping = false;
        this.next_round_in_progress = false;
        this.tickExecutor = new TickExecutor(this.server, this.loop.bind(this));
    }
    format_scores_as_string() {
        var scores_string: string[] = [];
        for (var [player, score] of Object.entries<Record<string, any>>(
            this.scores
        )) {
            scores_string.push(`${player}: ${score.kills} kills`);
        }
        return string_utils.array_to_string(
            scores_string,
            "Total kills per player: ",
            scores_string[0],
            "and"
        );
    }
    add_player(player: Player, speak = true) {
        super.add_player(player, speak);
        player.character = new character(
            this.server,
            player,
            this.zomby_character_names.pop() ?? ""
        );
        this.scores[player.name].kills = 0;
        this.scores[player.name].points = 0;
        return true;
    }
    remove_player(player: Player, speak = true, destroy_if_empty = true) {
        super.remove_player(player, speak, destroy_if_empty);
        if (player.character) {
            this.zomby_character_names.push(player.character.name);
            random.shuffle_array(this.zomby_character_names);
        }
        player.character = undefined;
    }
    spawn_aria_bot(): void {
        if (this.aria_bot || this.started) return;
        const stub_peer: any = {
            send: () => {},
            disconnect: () => {},
        };
        const stub_user: any = {
            username: "Aria",
            muted: false,
            moderator: false,
            builder: false,
            contributor: false,
            high_kills: 0,
            high_points: 0,
            high_accuracy: 0,
            block_list: [],
            invisible: false,
            save: async () => {},
            log: () => {},
        };
        const bot = new Player({
            server: this.server,
            peer: stub_peer,
            user: stub_user,
            map: this.map,
            hp: 500,
        });
        bot.isBot = true;
        this.add_player(bot, true);
        bot.weapon_manager.switch_weapon(
            Math.max(
                0,
                bot.weapon_manager.weapons.findIndex((w) => w.name === "mp7")
            )
        );
        this.aria_bot = bot;
        this.aria_bot_active = true;
        this.aria_think_timer = new timer();
        this.aria_fire_timer = new timer();
        this.aria_move_timer = new timer();
        this.aria_voice_timer = new timer();
        this.aria_random_quip_ms = random.random_number(30000, 90000);
        this.aria_low_hp_spoken = false;
        this.aria_was_dead = false;
        this.aria_voice_playing = false;
        this.aria_kills_seen = this.scores[bot.name] ? this.scores[bot.name].kills || 0 : 0;
        this.aria_stance = "attack";
        this.aria_brain_enabled = false;
        const brain_flag = process.env.ARIA_BRAIN;
        const want_brain =
            brain_flag &&
            brain_flag !== "0" &&
            brain_flag.toLowerCase() !== "false";
        if (want_brain) {
            const groq = new GroqAi();
            groq.load();
            if (groq.enabled) {
                try {
                    this.aria_brain_context = fs
                        .readFileSync("./ai_fh_battle_context.txt", "utf8")
                        .trim();
                } catch {
                    this.aria_brain_context = "";
                }
                if (this.aria_brain_context) {
                    this.aria_brain_groq = groq;
                    this.aria_brain_enabled = true;
                    if (this.server && (this.server as any).system_log)
                        (this.server as any).system_log(
                            "Aria brain enabled (ARIA_BRAIN)."
                        );
                } else if (this.server && (this.server as any).system_log) {
                    (this.server as any).system_log(
                        "Aria brain: ai_fh_battle_context.txt not found."
                    );
                }
            }
        }
        this.aria_brain_timer = new timer();
        bot.change_map(this.map);
        this.speak(`${bot.name} joins the match!`, false, "match");
    }
    private aria_say_voice(category: aria_voice.QuipCategory): void {
        if (this.aria_voice_playing) return;
        const bot = this.aria_bot;
        if (!bot) return;
        const quips = aria_voice.ARIA_QUIPS[category];
        if (!quips || quips.length === 0) return;
        const text = quips[random.random_number(0, quips.length - 1)];
        if (this.server && (this.server as any).system_log) {
            (this.server as any).system_log(`Aria says (voice): ${text}`);
        }
        this.aria_voice_playing = true;
        aria_voice
            .synthesize_frames(text)
            .then((frames: Buffer[] | null) => aria_voice.stream_opus_frames(bot, frames))
            .catch(() => {})
            .finally(() => {
                this.aria_voice_playing = false;
            });
    }
    async aria_bot_behavior(): Promise<void> {
        const bot = this.aria_bot;
        if (!bot || !this.started || !this.aria_bot_active) return;
        if (!bot.weapon_manager.active_weapon) {
            const idx = bot.weapon_manager.weapons.findIndex(
                (w) => w.name === "mp7" && !w.melee
            );
            if (idx >= 0) bot.weapon_manager.switch_weapon(idx);
        }
        const score: any = this.scores[bot.name];
        const kills = score ? score.kills || 0 : 0;
        if (bot.dead && !this.aria_was_dead) {
            this.aria_was_dead = true;
            this.aria_low_hp_spoken = false;
            this.aria_say_voice("death");
            return;
        }
        if (!bot.dead && this.aria_was_dead) {
            this.aria_was_dead = false;
            this.aria_say_voice("revive");
        }
        if (bot.dead) return;
        if (bot.maxHp > 0) {
            if (bot.hp <= bot.maxHp * 0.3) {
                if (!this.aria_low_hp_spoken) {
                    this.aria_low_hp_spoken = true;
                    this.aria_say_voice("low_hp");
                }
            } else {
                this.aria_low_hp_spoken = false;
            }
        }
        if (kills > this.aria_kills_seen) {
            this.aria_kills_seen = kills;
            if (random.random_number(1, 100) <= 50) this.aria_say_voice("kill");
        }
        if (this.aria_voice_timer!.elapsed >= this.aria_random_quip_ms) {
            this.aria_say_voice("random");
            this.aria_random_quip_ms = random.random_number(30000, 90000);
            this.aria_voice_timer!.restart();
        }
        if (this.aria_think_timer!.elapsed < this.aria_decision_ms) return;
        // LLM brain: coarse tactical intent, non-blocking (starts a request,
        // never holds the game tick). Falls back to the scripted controller.
        if (this.aria_brain_enabled) void this.aria_think_brain();
        // reload as soon as the magazine is empty
        const weapon = bot.weapon_manager.active_weapon;
        if (weapon && !weapon.melee && weapon.ammo <= 0) {
            bot.weapon_manager.reload();
            this.aria_think_timer!.restart();
            return;
        }
        this.aria_think_timer!.restart();
        const zombies = this.aria_alive_zombies();
        if (zombies.length === 0) {
            this.aria_path = [];
            if (random.random_number(1, 100) <= 40) this.aria_wander();
            return;
        }
        // self-defense: melee anything that got too close
        const closest = zombies[0];
        if (closest.dist <= 1.4) {
            this.aria_use_knife();
            if (this.aria_fire_timer!.elapsed >= this.aria_fire_delay_ms) {
                this.aria_fire_timer!.restart();
                this.aria_fire_at(closest.target);
            }
            return;
        }
        const stance = this.aria_stance || "attack";
        switch (stance) {
            case "retreat":
                this.aria_combat_retreat(zombies);
                break;
            case "hold":
                this.aria_hold_position(zombies);
                break;
            case "follow":
                this.aria_follow_teammate(zombies);
                break;
            case "defend":
                this.aria_defend_player(zombies);
                break;
            case "reload":
                this.aria_hold_position(zombies);
                break;
            default:
                this.aria_attack_mode(zombies);
                break;
        }
    }
    private aria_alive_zombies(): AriaThreat[] {
        const bot = this.aria_bot as Player;
        const out: AriaThreat[] = [];
        const objects: any[] = this.map.objects.get({});
        for (const obj of objects) {
            if (
                (obj instanceof zomby || obj instanceof hellhound) &&
                !obj.dead
            ) {
                out.push({
                    target: obj,
                    dist: movement.get_distance(bot, obj),
                });
            }
        }
        out.sort((a, b) => a.dist - b.dist);
        return out;
    }
    private aria_heading_to(target: any): number {
        const bot = this.aria_bot as Player;
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        return (Math.atan2(dx, dy) * (180 / Math.PI) + 360) % 360;
    }
    private aria_line_of_fire(target: any): boolean {
        const bot = this.aria_bot as Player;
        const dist = movement.get_distance(bot, target);
        if (dist <= 1) return true;
        const angle = this.aria_heading_to(target);
        let pitch = 0;
        if (Math.abs(target.z - bot.z) > 1) {
            pitch = Math.atan((target.z - bot.z) / dist) * (180 / Math.PI);
        }
        const steps = Math.max(1, Math.ceil(dist));
        let x = bot.x;
        let y = bot.y;
        let z = bot.z;
        for (let i = 0; i < steps; i++) {
            const next = movement.move([x, y, z], angle, pitch, 1);
            x = next.x;
            y = next.y;
            z = next.z;
            const tx = Math.trunc(x);
            const ty = Math.trunc(y);
            if (tx === Math.trunc(target.x) && ty === Math.trunc(target.y)) {
                return true;
            }
            const tile = this.map.get_tile_at(tx, ty, Math.trunc(z));
            if (tile && tile.startsWith("wall")) return false;
        }
        return true;
    }
    private aria_fire_at(target: any): void {
        const bot = this.aria_bot as Player;
        const dist = movement.get_distance(bot, target);
        const angle = this.aria_heading_to(target);
        let pitch = 0;
        if (Math.abs(target.z - bot.z) > 1 && dist > 1) {
            pitch = Math.atan((target.z - bot.z) / dist) * (180 / Math.PI);
        }
        bot.weapon_manager.fire(angle, pitch);
    }
    private aria_use_knife(): void {
        const bot = this.aria_bot as Player;
        const active = bot.weapon_manager.active_weapon;
        if (active && active.melee) return;
        const knifeIdx = bot.weapon_manager.weapons.findIndex((w) => w.melee);
        if (knifeIdx >= 0) bot.weapon_manager.switch_weapon(knifeIdx);
    }
    private aria_ensure_ranged(): void {
        const bot = this.aria_bot as Player;
        const active = bot.weapon_manager.active_weapon;
        if (active && !active.melee && active.ammo > 0) return;
        let best = -1;
        let bestRange = -1;
        bot.weapon_manager.weapons.forEach((w, i) => {
            if (!w.melee && w.range > bestRange) {
                bestRange = w.range;
                best = i;
            }
        });
        if (best >= 0) bot.weapon_manager.switch_weapon(best);
    }
    private aria_attack_mode(zombies: AriaThreat[]): void {
        this.aria_ensure_ranged();
        const shootable = zombies.filter(
            (t) =>
                t.dist <= this.aria_max_weapon_range &&
                this.aria_line_of_fire(t.target)
        );
        if (shootable.length > 0) {
            if (this.aria_fire_timer!.elapsed >= this.aria_fire_delay_ms) {
                this.aria_fire_timer!.restart();
                if (random.random_number(1, 100) <= 18) this.aria_sidestep();
                this.aria_fire_at(shootable[0].target);
            }
            return;
        }
        this.aria_move_towards(zombies[0].target);
    }
    private aria_hold_position(zombies: AriaThreat[]): void {
        this.aria_ensure_ranged();
        const shootable = zombies.filter(
            (t) =>
                t.dist <= this.aria_max_weapon_range &&
                this.aria_line_of_fire(t.target)
        );
        if (shootable.length > 0) {
            if (this.aria_fire_timer!.elapsed >= this.aria_fire_delay_ms) {
                this.aria_fire_timer!.restart();
                this.aria_fire_at(shootable[0].target);
            }
            return;
        }
        if (zombies[0].dist <= 2.0) this.aria_back_away();
    }
    private aria_combat_retreat(zombies: AriaThreat[]): void {
        this.aria_ensure_ranged();
        const shootable = zombies.filter(
            (t) =>
                t.dist <= this.aria_max_weapon_range &&
                this.aria_line_of_fire(t.target)
        );
        if (
            shootable.length > 0 &&
            this.aria_fire_timer!.elapsed >= this.aria_fire_delay_ms
        ) {
            this.aria_fire_timer!.restart();
            this.aria_fire_at(shootable[0].target);
        }
        this.aria_back_away();
    }
    private aria_follow_teammate(zombies: AriaThreat[]): void {
        this.aria_ensure_ranged();
        const shootable = zombies.filter(
            (t) =>
                t.dist <= this.aria_max_weapon_range &&
                this.aria_line_of_fire(t.target)
        );
        if (
            shootable.length > 0 &&
            this.aria_fire_timer!.elapsed >= this.aria_fire_delay_ms
        ) {
            this.aria_fire_timer!.restart();
            this.aria_fire_at(shootable[0].target);
            return;
        }
        const ally = this.aria_teammate();
        if (ally) {
            this.aria_move_to(
                Math.trunc(ally.x),
                Math.trunc(ally.y),
                Math.trunc(ally.z),
                true
            );
        }
    }
    private aria_defend_player(zombies: AriaThreat[]): void {
        this.aria_ensure_ranged();
        const shootable = zombies.filter(
            (t) =>
                t.dist <= this.aria_max_weapon_range &&
                this.aria_line_of_fire(t.target)
        );
        if (
            shootable.length > 0 &&
            this.aria_fire_timer!.elapsed >= this.aria_fire_delay_ms
        ) {
            this.aria_fire_timer!.restart();
            this.aria_fire_at(shootable[0].target);
            return;
        }
        const ally = this.aria_teammate();
        if (ally && movement.get_distance(this.aria_bot!, ally) > 3) {
            this.aria_move_to(
                Math.trunc(ally.x),
                Math.trunc(ally.y),
                Math.trunc(ally.z),
                false
            );
        }
    }
    private aria_teammate(): Player | null {
        const bot = this.aria_bot as Player;
        let best: Player | null = null;
        let bestDist = Infinity;
        for (const p of this.players) {
            if (p === bot || p.dead || p.spectator) continue;
            const d = movement.get_distance(bot, p);
            if (d < bestDist) {
                bestDist = d;
                best = p;
            }
        }
        return best;
    }
    private aria_sidestep(): void {
        const bot = this.aria_bot as Player;
        if (this.aria_move_timer!.elapsed < this.aria_move_ms) return;
        const zombies = this.aria_alive_zombies();
        if (zombies.length === 0) return;
        this.aria_move_timer!.restart();
        const n = zombies[0].target;
        const dx = n.x - bot.x;
        const dy = n.y - bot.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const side = random.random_number(0, 1) === 0 ? -2 : 2;
        const tx = Math.trunc(bot.x + (-dy / len) * side);
        const ty = Math.trunc(bot.y + (dx / len) * side);
        if (this.map.is_unwalkable(this.map, tx, ty, bot.z)) return;
        bot.move(tx, ty, bot.z, true, "walk");
    }
    private aria_back_away(): void {
        const bot = this.aria_bot as Player;
        const zombies = this.aria_alive_zombies();
        if (zombies.length === 0) return;
        const ally = this.aria_teammate();
        if (ally && movement.get_distance(bot, ally) > 1.5) {
            this.aria_move_to(
                Math.trunc(ally.x),
                Math.trunc(ally.y),
                Math.trunc(ally.z),
                true
            );
            return;
        }
        const n = zombies[0].target;
        const tx = Math.trunc(bot.x + (bot.x - n.x));
        const ty = Math.trunc(bot.y + (bot.y - n.y));
        if (this.aria_move_timer!.elapsed < this.aria_move_ms) return;
        if (this.map.is_unwalkable(this.map, tx, ty, bot.z)) return;
        this.aria_move_timer!.restart();
        bot.move(tx, ty, bot.z, true, "run");
    }
    private aria_move_towards(target: any): void {
        const bot = this.aria_bot as Player;
        const dist = movement.get_distance(bot, target);
        const run = dist > this.aria_max_weapon_range * 1.5;
        this.aria_move_to(
            Math.trunc(target.x),
            Math.trunc(target.y),
            Math.trunc(target.z),
            run
        );
    }
    private aria_move_to(
        tx: number,
        ty: number,
        tz: number,
        run: boolean
    ): void {
        const bot = this.aria_bot as Player;
        if (this.aria_move_timer!.elapsed < this.aria_move_ms) return;
        this.aria_move_timer!.restart();
        const key = `${tx},${ty},${tz}`;
        const now = Date.now();
        const stale = this.aria_path_key !== key || now - this.aria_path_at > 600;
        if (stale && !this.aria_path_pending) {
            this.aria_path_key = key;
            this.aria_path_at = now;
            this.aria_path_pending = true;
            this.map
                .find_path(
                    Math.trunc(bot.x),
                    Math.trunc(bot.y),
                    Math.trunc(bot.z),
                    tx,
                    ty,
                    tz
                )
                .then((path: any) => {
                    this.aria_path_pending = false;
                    this.aria_path = path || [];
                    const b = this.aria_bot as Player | undefined;
                    if (b) this.aria_step_along(this.aria_path, run);
                })
                .catch(() => {
                    this.aria_path_pending = false;
                    this.aria_path = [];
                });
            return;
        }
        this.aria_step_along(this.aria_path, run);
    }
    private aria_step_along(path: any[], run: boolean): void {
        const bot = this.aria_bot as Player;
        if (!path || path.length === 0) return;
        for (const point of path) {
            if (point.x !== Math.trunc(bot.x) || point.y !== Math.trunc(bot.y)) {
                bot.move(
                    point.x,
                    point.y,
                    point.z ?? bot.z,
                    true,
                    run ? "run" : "walk"
                );
                return;
            }
        }
    }
    private aria_wander(): void {
        const bot = this.aria_bot as Player;
        if (this.aria_move_timer!.elapsed < this.aria_move_ms) return;
        this.aria_move_timer!.restart();
        const tx = Math.trunc(bot.x + random.random_number(-4, 4));
        const ty = Math.trunc(bot.y + random.random_number(-4, 4));
        if (this.map.is_unwalkable(this.map, tx, ty, bot.z)) return;
        bot.move(tx, ty, bot.z, true, "walk");
    }
    private aria_compass(deg: number): string {
        const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const idx = ((Math.round(deg / 45) % 8) + 8) % 8;
        return dirs[idx];
    }
    private aria_snapshot_state(): string {
        const bot = this.aria_bot as Player;
        const weapon = bot.weapon_manager.active_weapon;
        const zombies = this.aria_alive_zombies();
        const near = zombies.filter((t) => t.dist <= 10).length;
        let nearest = "none";
        if (zombies.length > 0) {
            const n = zombies[0].target;
            const angle = this.aria_heading_to(n);
            nearest = `dist=${Math.round(zombies[0].dist)} dir=${this.aria_compass(angle)}`;
        }
        const allies: string[] = [];
        for (const p of this.players) {
            if (p === bot) continue;
            allies.push(`${p.user.username} ${p.dead ? "dead" : "alive"}`);
        }
        const ammoInfo =
            weapon && !weapon.melee
                ? `${weapon.ammo} / ${weapon.max_ammo}`
                : "melee";
        const score = this.scores[bot.name];
        const lines = [
            `round=${this.round}`,
            `zombies_current=${this.current_zombies}`,
            `zombies_total_left=${this.total_zombies}`,
            `dog_round=${this.dog_round ? "yes" : "no"}`,
            `hp_percent=${bot.maxHp ? Math.round((bot.hp / bot.maxHp) * 100) : 0}`,
            `weapon=${weapon ? weapon.name : "none"}`,
            `ammo=${ammoInfo}`,
            `points=${score ? score.points : 0}`,
            `kills=${score ? score.kills : 0}`,
            `nearest_zombie=${nearest}`,
            `zombies_close_10=${near}`,
            `teammates=${allies.join(", ") || "none"}`,
        ];
        return lines.join("\n");
    }
    private aria_parse_intent(raw: string): AriaIntent {
        const m = raw.match(/"intent"\s*:\s*"(\w+)"/i);
        if (m) {
            const v = m[1].toLowerCase();
            const allowed: AriaIntent[] = [
                "attack",
                "hold",
                "retreat",
                "follow",
                "defend",
                "reload",
                "wander",
            ];
            if ((allowed as string[]).includes(v)) return v as AriaIntent;
        }
        return "attack";
    }
    private async aria_think_brain(): Promise<void> {
        if (!this.aria_brain_enabled || this.aria_brain_inflight) return;
        if (!this.aria_brain_timer) return;
        if (this.aria_brain_timer.elapsed < this.aria_brain_ms) return;
        if (this.aria_brain_failures >= 3) return;
        this.aria_brain_timer.restart();
        this.aria_brain_inflight = true;
        const snapshot = this.aria_snapshot_state();
        try {
            const raw = await this.aria_brain_groq!.complete(
                this.aria_brain_context,
                snapshot,
                80
            );
            const intent = this.aria_parse_intent(raw);
            if (intent !== this.aria_stance) {
                this.aria_stance = intent;
                if (this.server && (this.server as any).system_log) {
                    (this.server as any).system_log(
                        `Aria brain: stance -> ${intent}`
                    );
                }
            }
            this.aria_brain_failures = 0;
        } catch (err) {
            this.aria_brain_failures++;
            if (this.aria_brain_failures >= 3) {
                if (this.server && (this.server as any).system_log) {
                    (this.server as any).system_log(
                        "Aria brain disabled (3 consecutive errors): " +
                            (err instanceof Error ? err.message : String(err))
                    );
                }
            }
        } finally {
            this.aria_brain_inflight = false;
        }
    }
    /// `powerup_list` is meant to only be set when you want to limit the chosen powerups.
    async randomize_powerup(
        percentage = 2,
        powerup_list?: (typeof Powerup)[]
    ): Promise<void> {
        if (this.gotten_powerups > 4) return;
        if (random.random_number(0, 100) <= percentage) {
            powerup_list = [...(powerup_list ?? this.possible_powerups)]; // make a copy
            random.shuffle_array(powerup_list);
            for (let chosen_powerup_type of powerup_list) {
                const chosen_powerup = new chosen_powerup_type(this);
                if (chosen_powerup instanceof LongtimePowerup) {
                    if (this.is_longtime_powerup_active(chosen_powerup_type)) {
                        continue; // Skip this powerup if it's already active
                    }
                    this.add_long_time_powerup(chosen_powerup);
                }
                chosen_powerup.activate();
                this.gotten_powerups++;
                break;
            }
        }
    }
    is_longtime_powerup_active(powerup_type: typeof Powerup): boolean {
        return this.current_long_time_powerups.some(
            (powerup) => powerup instanceof powerup_type
        );
    }
    add_long_time_powerup(powerup: LongtimePowerup): void {
        this.current_long_time_powerups.push(powerup);
    }
    remove_long_time_powerup(powerup: LongtimePowerup): void {
        this.current_long_time_powerups.splice(
            this.current_long_time_powerups.indexOf(powerup),
            1
        );
    }

    revive_all() {
        for (var i of this.players) {
            i.revive(true);
        }
    }
    start(): void {
        super.start();
        this.players.forEach((player) => player.reset_to_defaults());
        if (this.aria_bot) {
            const idx = this.aria_bot.weapon_manager.weapons.findIndex(
                (w) => w.name === "mp7"
            );
            if (idx >= 0) this.aria_bot.weapon_manager.switch_weapon(idx);
        }
        this.tickExecutor.start();
    }
    end() {
        this.started = false;
        for (const player of this.players) {
            player.play_direct(
                `${this.round_sounds_path}/gameover.ogg`,
                false,
                100,
                false,
                false,
                "",
                "music"
            );
            player.speak(
                `Game over! ${this.format_scores_as_string()}`,
                true,
                "match"
            );
            player.user.log({
                eventType: "match_over",
                eventData: {
                    name: this.name,
                    player_count: this.players.size- 1,
                },
            });
        }
        this.call_after(500, () => this.destroy());
    }
    get_dead_players(): number {
        var dead_players = 0;
        for (var i of this.players) {
            if (i.dead) dead_players++;
        }
        return dead_players;
    }
    setup_round(round: number, is_dog_round = false) {
        this.round = round;
        this.killed_zombies = 0;
        if (is_dog_round) {
            this.dog_round = true;
            this.current_zombies = 0;
            this.total_zombies = this.players.size;
            this.max_zombies = 1;
        } else {
            this.current_zombies = 0;
            this.total_zombies = this.calculate_zombies_amount(round);
            this.max_zombies = 24;
        }
    }
    async loop() {
        if (this.destroied) return;
        if (this.aria_bot_active && this.aria_bot) {
            try {
                await this.aria_bot_behavior();
            } catch (err) {
                console.log(err);
            }
        }
        const powerups_to_remove: LongtimePowerup[] = [];
        for (let powerup of this.current_long_time_powerups) {
            if (
                !powerup.is_active ||
                powerup.active_timer.elapsed >= powerup.powerup_time
            ) {
                await powerup.deactivate();
                powerups_to_remove.push(powerup);
            }
        }
        powerups_to_remove.forEach(this.remove_long_time_powerup, this);
        if (!this.next_round_in_progress && this.total_zombies <= 0 && this.current_zombies <= 0) {
            await this.next_round();
        }
        if (this.current_zombies < this.max_zombies && this.total_zombies > 0) {
            return this.spawn_zomby();
        }
    }
    spawn_zomby(): void {
        var location = this.map.get_zomby_spawn();
        if (this.dog_round) {
            new hellhound(
                this.server,
                location.x,
                location.y,
                location.z,
                1000 * this.round,
                this.map
            );
        } else {
            new zomby(
                this.server,
                this.map,
                this.calculate_hp(this.round),
                this.calculate_damage(this.round),
                location.x,
                location.y,
                location.z
            );
        }
    }
    async next_round(): Promise<void> {
        if (this.next_round_in_progress) return;
        this.next_round_in_progress = true;
        this.gotten_powerups = 0;
        this.currentRoundSounds = random.random_number(0, 4);
        if (this.dog_round) {
            this.randomize_powerup(100);
            this.map.playersQuadtree.each((i) => i.set_hp(100));
        }
        var sound = this.dog_round
            ? `${this.round_sounds_path}/dog/end.ogg`
            : `${this.round_sounds_path}/${this.currentRoundSounds}/end.ogg`;
        this.dog_round = false;
        this.speak(
            `End of round ${this.round}! ${this.format_scores_as_string()}`,
            false,
            "match",
            sound
        );
        await this.server.sleep_for(10000);
        this.revive_all();
        var is_dog_round = (this.round + 1 - this.lastDogRound >= 3) && random.random_number(1, 100) <= 15;
        if (is_dog_round) this.lastDogRound = this.round + 1;
        var sound = is_dog_round
            ? `${this.round_sounds_path}/dog/start.ogg`
            : `${this.round_sounds_path}/${this.currentRoundSounds}/start.ogg`;
        this.speak(`Round ${this.round + 1}!`, false, "match", sound);
        if (is_dog_round) await this.server.sleep_for(12500);
        for (var i of this.players) {
            var activity = {
                round: this.round,
                character: i.character?.char_name,
                map: this.map.mapName,
                party_id: this.owner.user.username + "'s match",
                size: this.players.size,
            };
            i.send(consts.channel_misc, "update_activity", activity);
        }
        this.setup_round(this.round + 1, is_dog_round);
        this.next_round_in_progress = false;
    }
    calculate_damage(round: number): number {
        if (round < 10) {
            return 20;
        } else if (round < 30) {
            return 35;
        } else if (round < 50) {
            return 55;
        } else {
            return 70;
        }
    }
    calculate_hp(round: number): number {
        if (round < 10) {
            return 100 * round + 50;
        } else {
            var hp = 950;
            for (let i = 0; i != round - 9; i++) {
                hp = hp * 1.1;
            }
            return hp;
        }
    }
    calculate_zombies_amount(round: number): number {
        var amount = 1;
        if (this.players.size== 1) {
            amount =
                0.000058 * round ** 3 +
                0.074032 * round ** 2 +
                0.718119 * round +
                14.738699;
        } else if (this.players.size== 2) {
            amount =
                0.000054 * round ** 3 +
                0.169717 * round ** 2 +
                0.541627 * round +
                15.917041;
        } else if (this.players.size== 3) {
            amount =
                0.000169 * round ** 3 +
                0.238079 * round ** 2 +
                1.307276 * round +
                21.291046;
        } else if (this.players.size== 4) {
            amount =
                0.000225 * round ** 3 +
                0.314314 * round ** 2 +
                1.835712 * round +
                27.596132;
        }
        return amount;
    }
    calculate_max_zombies(round: number): number {
        var amount = 24 * (this.players.size* 6);
        if (round <= 4) {
            amount = amount * 0.6;
        }
        return amount;
    }
    destroy(): void {
        if (!this.destroied) {
            if (this.aria_bot) {
                const bot = this.aria_bot;
                this.aria_bot = undefined;
                this.aria_bot_active = false;
                bot.game = undefined;
                this.remove(bot);
                bot.destroy();
            }
            this.tickExecutor.cancel();
            this.players.forEach((player) => player.reset_to_defaults());
            this.revive_all();
            super.destroy();
            this.map.destroy_objects();
        }
    }
}
