import { LoggedEntry } from "./database/models/log_types";

export function logged_entry_to_string(entry: LoggedEntry, replacement_username?: string): string {
    let result = "";
    let eventData = entry.eventData;
    const username = entry.user
        ? entry.user.username
        : replacement_username ?? "Unknown or deleted user";
    switch (entry.eventType) {
        case "chat":
        case "map_chat":
        case "buildchat":
        case "modchat":
        case "conchat":
            result = `${entry.eventType} from ${username}`;
            if (eventData instanceof Object) {
                if (
                    "nickname" in eventData &&
                    eventData.nickname != username
                )
                    result += ` with nickname ${eventData.nickname}`;
                if ("message" in eventData)
                    result += `: ${eventData.message}`;
            }
            break;
        case "login":
        case "logout":
            result = `${entry.eventType} from ${username}`;
            if (
                eventData instanceof Object &&
                "invisible" in eventData &&
                eventData.invisible
            ) {
                result += " Invisible";
            }
            break;
        case "account_created":
            result = `New account created. ${username}`;
            break;
        case "system":
            result = `System: ${JSON.stringify(eventData)}`;
            break;
        case "kick":
        case "mute":
        case "unmute":
            if (entry.eventData instanceof Object && "actioner" in entry.eventData && "actioned" in entry.eventData) {
                result=`${entry.eventType} performed on ${entry.eventData.actioned} by ${entry.eventData.actioner} `;
                if ("reason" in entry.eventData) result+=`for ${entry.eventData.reason}`;
            }
            break;
        case "tell":
        case "tellmod":
            if (entry.eventData instanceof Object && "sender" in entry.eventData && "receiver" in entry.eventData && "message" in entry.eventData) {
                if (username == entry.eventData.sender) {
                    result=`${entry.eventData.sender} sent a ${entry.eventType} to ${entry.eventData.receiver} saying: "${entry.eventData.message}"`;
                } else {
                    result=`${entry.eventData.receiver} received a ${entry.eventType} from ${entry.eventData.sender} saying: "${entry.eventData.message}"`;
                }
            }
            break;
        case "modtell":
        case "asmod":
            result=`${entry.eventType} from ${username} saying: "${eventData}"`;
            break;
        case "server_message":
            result=`${username} changes the server message to: "${eventData}"`;
            break;
        case "nickname":
            if (eventData instanceof Object && "first" in eventData && "second" in eventData) {
                if (username != eventData.first || username != eventData.second) result = `${username} changed their nickname from "${eventData.first}" to "${eventData.second}. "`;
                else if (username == eventData.first) result=`${username} changed their nickname to ${eventData.second}`;
                else if (username == eventData.second) result=`${username} reset their nickname from ${eventData.first}. `;
            }
            break;
        case "match_create":
        case "match_destroy":
        case "match_join":
        case "match_leave":
        case "match_over":
            if (eventData instanceof Object && "name" in eventData && "player_count" in eventData) {
                result=`${entry.eventType} from ${username} on ${eventData.name} which contains ${eventData.player_count} other players`;
            }
            break;
        case "log_access":
            if (eventData instanceof Object && "query" in eventData) {
                result = `${username} just accessed logs with the query: "${eventData.query}"`;
            }
            break;
        case "ticket_close":
        case "ticket_edit":
        case "ticket_reply":
        case "ticket_submit":
            if (eventData instanceof Object && "id" in eventData) {
                result=`${entry.eventType} from ${username} on the ticket with ID: ${eventData.id}`;
            }
            break;
        case "give":
            if (eventData instanceof Object && "amount" in eventData && "item" in eventData && "provider" in eventData && "receiver" in eventData) {
                if (username == eventData.provider) result=`${eventData.provider} gave ${eventData.receiver} ${eventData.amount} of ${eventData.item}. `;
                else if (username == eventData.receiver) result=`${eventData.receiver} was given ${eventData.amount} of ${eventData.item} by ${eventData.provider}. `;
            }
            break;
        case "set_hp":
            if (eventData instanceof Object && "hp" in eventData && "actioner" in eventData && "actioned" in eventData) {
                if (username == eventData.actioner) result=`${eventData.actioner} set ${eventData.actioned}'s health to ${eventData.hp}`;
                else if (username == eventData.actioned) result = `${eventData.actioned}'s health was set to ${eventData.hp} by ${eventData.actioner}. `;
            }
            break;
        case "promote":
        case "demote":
            if (eventData instanceof Object && "rank" in eventData && "target" in eventData && "promoter" in eventData) {
                result=`${entry.eventType} by ${eventData.promoter} on ${eventData.target} to ${eventData.rank}`;
            }
            break;
        default:
            result = `${entry.eventType} from ${username}: ${JSON.stringify(eventData)}`;
            break;
    }
    if (!result.trim().endsWith(".")) {
        result += ".";
    }
    result += ` ${entry.createdAt.toString()}`;
    return result;
}

