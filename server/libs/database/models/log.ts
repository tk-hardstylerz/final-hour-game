import {
    Sequelize,
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    Op,
} from "@sequelize/core";
import {
    Attribute,
    PrimaryKey,
    AutoIncrement,
    NotNull,
    Default,
    Table,
    BelongsTo,
} from "@sequelize/core/decorators-legacy";
import { NonAttribute, WhereOptions } from "sequelize";
import User from "./player";
import {
    EVENT_TYPES,
    EventType,
    JSONable,
    LogEntry,
    LogQuery,
    LoggedEntry,
} from "./log_types";

@Table({
    indexes: [
        {
            fields: ["userId"],
        },
        {
            fields: ["eventType"],
        },
        {
            fields: ["userId", "eventType", "createdAt"],
        },
        {
            fields: ["userId", "createdAt"],
        },
    ],
})
export default class Log extends Model<
    InferAttributes<Log>,
    InferCreationAttributes<Log>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>;
    @Attribute(DataTypes.DATE)
    declare createdAt: CreationOptional<Date>;
    @Attribute(DataTypes.DATE)
    declare updatedAt: CreationOptional<Date>;
    @Attribute(DataTypes.INTEGER)
    declare userId: CreationOptional<number | null>;
    @Attribute(DataTypes.ENUM(EVENT_TYPES))
    @NotNull
    declare eventType: EventType;
    @Attribute(DataTypes.JSON)
    @NotNull
    declare eventData: JSONable;
    @BelongsTo(() => User, {
        foreignKey: {
            onDelete: "SET NULL",
            onUpdate: "SET NULL",
            name: "userId",
        },
    })
    declare user: NonAttribute<User | null>;
    static createEntry(entry: LogEntry): Promise<LoggedEntry> {
        entry.eventData = entry.eventData ?? {};
        return Log.create(entry);
    }
    /**
     * Queries for logs.
     *
     * This method supports filtering by many conditions. You can optionally specify a user id, or multiple user ids to filter by, one or more event types, and/or a time period to retrieve logs for, as well as combining any of these conditions.
     *
     * @returns a promise that will be resolved with an array of log entries
     */
    static query(filter?: LogQuery): Promise<LoggedEntry[]> {
        const includeUser = {
            model: User,
            attributes: ["username"], // Only grab the username field
        };
        const databaseQuery = Log.buildDatabaseQueryFromFilter(filter);
        return Log.findAll({
            where: databaseQuery,
            include: includeUser,
            nest: true,
        });
    }
    static countLogs(filter?: LogQuery): Promise<number> {
        return Log.count({
            where: Log.buildDatabaseQueryFromFilter(filter),
        });
    }
    /**
     * Builds an sql filter, to be used by the `where` specifier, from a LogQuery` object
     */
    static buildDatabaseQueryFromFilter(
        filter?: LogQuery
    ): LogDatabaseFilterQuery | undefined {
        if (!filter) return;
        const databaseQuery: LogDatabaseFilterQuery = {};
        if (filter.user) databaseQuery.userId = filter.user;
        else if (filter.users) databaseQuery.userId = { [Op.in]: filter.users };
        if (filter.eventTypes) {
            databaseQuery.eventType = { [Op.in]: filter.eventTypes };
        }
        if (filter.between) {
            databaseQuery.createdAt = {
                [Op.between]: [
                    filter.between.start,
                    filter.between.end ?? new Date(),
                ],
            };
        }
        return databaseQuery;
    }
}
type LogDatabaseFilterQuery = {
    userId?:
        | number
        | {
              [Op.in]: number[];
          };
    eventType?: {
        [Op.in]: EventType[];
    };
    createdAt?: {
        [Op.between]: [Date, Date];
    };
};
