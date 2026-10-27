import Server from "../networking";
import perks from "../perks";
import Perk from "../perks/perk";
import WorldMap from "../world_map";
import Game_object from "./object";
import GameObject from "./object";
import Player from "./player";

export default class PerkMachine extends GameObject {
    private perkType!: typeof Perk;
    private allowDuplicate: boolean = false;
    private price: number = 0;
    private quantity: number = Infinity;
    sound: string = "";
    isActive: boolean = false;
    extraName: string = "";
    constructor(
        server: Server,
        attributes: {
            map: WorldMap;
            x: number;
            y: number;
            z: number;
            perk: string;
            quantity?: number;
            price?: number;
            allowDuplicate?: boolean;
            sound?: string;
            name?: string;
        }
    ) {
        super(
            server,
            attributes.map,
            `PerkMachine-${server.get_id()}`,
            attributes.x,
            attributes.y,
            attributes.z,
            false,
            null,
            attributes.map.game
        );
        this.initializeAttributes(attributes);
        if (!this.extraName) {
            this.activate();
        }
    }
    private initializeAttributes(attributes: any): void {
        this.extraName = attributes.name ?? "";
        this.allowDuplicate = attributes.allowDuplicate ?? false;
        this.quantity = attributes.quantity ?? Infinity;
        this.price = attributes.price ?? 0;
        this.sound = attributes.sound ?? "";
        this.setPerkType(attributes.perk);
    }
    private setPerkType(perkName: string): void {
        const foundPerk = perks.find(
            (perk) => perk.perkName.toLowerCase() === perkName.toLowerCase()
        );
        if (foundPerk) {
            this.perkType = foundPerk;
        } else {
            throw new Error(`Perk not found: ${perkName}`);
        }
    }
    activate(): void {
        this.isActive = true;
        if (this.sound && this.map.isPowerOn) {
            this.play_sound(
                this.sound,
                true,
                30,
                false,
                false,
                true,
                this.name
            );
        }
    }
    on_interact(
        interactor: Game_object,
        angle: number,
        pitch: number
    ): boolean {
        super.on_interact(interactor, angle, pitch);
        if (interactor instanceof Player) {
            if (!this.isActive || !this.map.isPowerOn) {
                interactor.speak("This machine is not operational.");
                return false;
            }
            this.handlePlayerInteraction(interactor);
        }
        return true;
    }
    private handlePlayerInteraction(player: Player): void {
        const emptySlot = player.perks.findFirstEmptySlot();
        if (emptySlot === null) {
            player.speak("You have no more available perk slots");
            return;
        }
        if (
            !this.allowDuplicate &&
            player.perks.isPerkAssigned(this.perkType)
        ) {
            player.speak(`Can't buy another ${this.perkType.perkName}`);
            return;
        }
        if (player.game && this.quantity <= 0) {
            player.speak("This machine is out of supply");
            return;
        }
        if (player.game && player.points < this.price) {
            player.speak(
                `You need at least ${this.price} points to use this machine`
            );
            return;
        }
        this.processPurchase(player, emptySlot);
    }
    private processPurchase(interactor: Player, slot: number): void {
        if (interactor.game) {
            interactor.perks.setPerkOnSlot(
                slot,
                new this.perkType(this.server)
            );
            interactor.points -= this.price;
            interactor.speak(
                `You purchased ${this.perkType.name} for ${
                    this.price
                } points. It's now active! (Perk slot ${slot + 1} of ${interactor.perks.perks.length})`
            );
            this.quantity--;
        } else {
            return interactor.speak(
                `You extend your grubby hand into the depths of the machine, snatching a bottle of ${this.perkType.perkName} with a mischievous grin plastered on your face. "Freebie!" you exclaim triumphantly. As you gulp down the liquid inside, you're met with... nothing. No sudden surge of power, no divine intervention, not even a hint of satisfaction. just the cold realization that greatness is earned, not stolen. Next time, try that inside a match`
            );
        }
    }
}
