import * as chrono from "chrono-node";
import { Op } from "sequelize";
import { EVENT_TYPES, EventType, LogQuery } from "./database/models/log_types";
import Server from "./networking";
import { array_to_string } from "./string_utils";

export default async function parse_log_query(
    server: Server,
    text: string
): Promise<LogQuery | undefined> {
    text = text.trim().toLowerCase();
    if (text === "all") return;
    const query: LogQuery = {};
    const parts = text
        .split("&")
        .map((line) => line.trim())
        .filter(Boolean);
    if (!parts.length) throw new Error("Invalid query");

    for (const part of parts) {
        const [attribute, value] = part.split(
            /\s+is\s+|\s+in\s+|\s+between\s+/
        );
        if (!attribute || !value)
            throw new Error(`Expected attribute and value in ${part}`);
        switch (attribute) {
            case "user":
                const usernames = value.split(",").map((name) => name.trim());
                const ids: number[] = [];
                for (const username of usernames) {
                    const id = parseInt(username);
                    if (!isNaN(id)) ids.push(id);
                    else {
                        const user = await server.database.users.findOne({
                            where: { username },
                            attributes: ["id"],
                            raw: true,
                        });
                        if (user) ids.push(user.id);
                        else
                            throw new Error(`User ${username} does not exist.`);
                    }
                }
                if (ids.length !== usernames.length)
                    throw new Error(`Some users do not exist.`);
                if (ids.length === 1) query.user = ids[0];
                else if (ids.length > 1) query.users = ids;
                else throw new Error("User list is empty.");
                break;
            case "events":
                const events = value
                    .split(",")
                    .map<string>((event) => event.toLowerCase().trim())
                    .filter((event) =>
                        EVENT_TYPES.includes(event as EventType)
                    );
                if (events.length === 0) {
                    throw new Error(
                        `No event is specified. Maybe you specified events but they don't exist? ${array_to_string(
                            EVENT_TYPES.slice(),
                            "Valid event types are"
                        )}`
                    );
                }
                query.eventTypes = events as EventType[];
                break;
            case "time":
                const time_range = value.split("and").map<Date>((time) => {
                    const parsed_tdate = chrono.parseDate(
                        time.trim(),
                        new Date()
                    );
                    if (parsed_tdate) return parsed_tdate;
                    throw new Error(`Invalid date or time specifier: ${time}`);
                });
                if (time_range.length !== 2) {
                    throw new Error(
                        `no or invalid time range is specified. Maybe you typed it wrong? In ${part}`
                    );
                }
                query.between = {
                    start: time_range[0],
                    end: time_range[1],
                };
                break;
            default:
                throw new Error(`Invalid syntax. ${attribute}`);
        }
    }
    return query;
}
