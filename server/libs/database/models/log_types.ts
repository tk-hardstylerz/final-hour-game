export const EVENT_TYPES = [
    "system",
    "login",
    "logout",
    "chat",
    "map_chat",
    "buildchat",
    "modchat",
    "conchat",
    "account_created",
    "tell",
    "match_join",
    "match_leave",
    "match_create",
    "match_destroy",
    "match_over",
    "ticket_submit",
    "ticket_edit",
    "ticket_reply",
    "ticket_close",
    "log_access",
    "kick",
    "mute",
    "unmute",
    "ban",
    "asmod",
    "modtell",
    "tellmod",
    "server_message",
    "nickname",
    "give",
    "set_hp",
    "promote",
    "demote",

] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type JSONable =
    | string
    | number
    | boolean
    | null
    | JSONObject
    | JSONArray;
interface JSONObject {
    [key: string]: JSONable | undefined;
}
interface JSONArray extends Array<JSONable | undefined> {}
export interface LogEntry {
    userId?: number | null;
    eventType: EventType;
    eventData: JSONable;
}
export interface LoggedEntry extends LogEntry {
    createdAt: Date;
    userId: number | null;
    id: number;
    user?: {
        username: string;
    } | null; // The entire user object could be null if userId is null
}
export interface LogQuery {
    user?: number;
    users?: number[];
    eventTypes?: EventType[];
    between?: {
        start: Date;
        end?: Date;
    };
}
