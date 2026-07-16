import {
    Sequelize,
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    NonAttribute,
} from "@sequelize/core";
import {
    Attribute,
    PrimaryKey,
    BelongsTo,
    AutoIncrement,
    NotNull,
    Default,
    Table,
} from "@sequelize/core/decorators-legacy";
import Server from "../../networking";
import User from "./player";


export default class Ticket extends Model<
    InferAttributes<Ticket>,
    InferCreationAttributes<Ticket>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare ticket_id: CreationOptional<number>;

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare user_id: number;

    @Attribute(DataTypes.STRING)
    @NotNull
    @Default("unknown")
    declare discord_message_id: CreationOptional<string>;

    @Attribute(DataTypes.STRING)
    @NotNull
    @Default("Unknown")
    declare author: string;

    @Attribute(DataTypes.STRING)
    @NotNull
    @Default("open")
    declare status: string;

    @Attribute(DataTypes.STRING)
    @NotNull
    declare category: string;

    @Attribute(DataTypes.JSON)
    @NotNull
    declare message_list: CreationOptional<string[]>;
    static async get_all_tickets(): Promise<Ticket[]> {
        var closed_tickets = await Ticket.findAll({
            where: { status: "closed" }
        });

        var open_tickets = await Ticket.findAll({
            where: { status: ["open", "seen"] },
        });
        var tickets: Ticket[]=[];
        for (var ticket of closed_tickets) {
            tickets.push(ticket);
        }
        for (var ticket of open_tickets) {
            tickets.push(ticket);
        }
        if (tickets) return tickets.reverse();
        else return [];
    }
    static async get_building_tickets(): Promise<Ticket[]> {
        var closed_tickets = await Ticket.findAll({
            where: { status: "closed", category: "building" }
        });

        var open_tickets = await Ticket.findAll({
            where: { status: ["open", "seen"], category: "building" },
        });
        var tickets: Ticket[]=[];
        for (var ticket of closed_tickets) {
            tickets.push(ticket);
        }
        for (var ticket of open_tickets) {
            tickets.push(ticket);
        }
        if (tickets) return tickets.reverse();
        else return [];
    }
    static async get_all_tickets_by_userid(uid: number): Promise<Ticket[]> {
        var closed_tickets = await Ticket.findAll({
            where: { status: "closed", user_id: uid }
        });

        var open_tickets = await Ticket.findAll({
            where: { status: ["open", "seen"], user_id: uid },
        });
        var tickets: Ticket[]=[];
        for (var ticket of closed_tickets) {
            tickets.push(ticket);
        }
        for (var ticket of open_tickets) {
            tickets.push(ticket);
        }
        if (tickets) return tickets.reverse();
        else return [];

    }
    static async get_open_tickets(): Promise<Ticket[]> {
        const tickets = await Ticket.findAll({
            where: { status: ["open", "seen"] }
        });
        if (tickets) return tickets.reverse();
        else return [];
    }
    static async get_closed_tickets(): Promise<Ticket[]> {
        const Tickets = await Ticket.findAll({
            where: { status: "closed" }
        });
        if (Tickets) return Tickets.reverse();
        else return [];
    }
    static async get_ticket_by_id(id: number): Promise<Ticket> {
        const ticket = await Ticket.findOne({
            where: { ticket_id: id }
        });
        if (ticket) return ticket;
        throw Error("This ticket doesn't exist");
    }
}