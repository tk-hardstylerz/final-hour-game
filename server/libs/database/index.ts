import { Sequelize } from "@sequelize/core";
import User from "./models/player";
import Server from "../networking";
import Log from "./models/log";
import Ticket from "./models/tickets";
import Behavior from "./models/behavior";
import IPBan from "./models/ipbans";
export default class Database {
    static readonly path = "database.sqlite3";
    readonly server: Server;
    readonly db: Sequelize;
    readonly users = User;
    readonly logs = Log;
    readonly tickets = Ticket;
    readonly behaviors = Behavior;
    readonly IPBans = IPBan;
    constructor(server: Server) {
        this.server = server;
        this.db = new Sequelize({
            dialect: "sqlite",
            storage: Database.path,
            models: [User, Log, Ticket, Behavior, IPBan],
            logging: false,
        });
    }
    async initialize(): Promise<void> {
        await this.db.authenticate();
        await this.db.sync({ alter: { drop: false } });
    }
    async close(): Promise<void> {
        await this.db.close();
    }
}
