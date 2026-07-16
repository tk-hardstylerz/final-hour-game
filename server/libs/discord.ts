import consts from "./consts";
import discord, { ActivityType, Message, TextChannel, WebhookClient } from "discord.js";
import Server from "./networking";
import channel_id from "./channel_id";
import { to_num } from "./string_utils";
import TickExecutor from "./tick_executor";
import Timer from "./timer";
import Ticket from "./database/models/tickets";

const client = new discord.Client({
    intents: [
        "GuildIntegrations",
        "GuildMessages",
        "Guilds",
        "MessageContent",
        "GuildPresences",
        "GuildWebhooks",
    ],
});
const applicationId = 1022541507430993981;
export default class discord_intergration {
    server: Server;
    ignore_everything: boolean = false;
    private executor: TickExecutor;
    update_timer: Timer;
    webhooks: Record<string, any>;
    constructor(server: Server, ignore_everything: boolean = false) {
        this.server = server;
        this.ignore_everything = ignore_everything;
        this.update_timer = new Timer();
        this.executor = new TickExecutor(
            this.server,
            this.loop.bind(this)
        );
        this.executor.start();
        this.webhooks = {};
    }
    async callbacks(): Promise<void> {
        if (this.ignore_everything) return;
        client.on("ready", () => {
            console.log(`Logged in as ${client.user?.tag}!`);
            client.user?.setStatus("online");
            client.user?.setActivity(
                `${this.server.players.length} players online and ${this.server.games.length} matches for ${this.get_uptime()}. `,
                {
                    type: ActivityType.Playing,
                }
            );
            this.send_message(
                `you can now connect to the server`,
                channel_id.botannouncements,
                "Server Status"
            );
        });
        client.on("messageCreate", async (msg) => {
            if (msg.author == client.user || msg.webhookId) {
                if (msg.channel.id === channel_id.building_tickets || msg.channel.id === channel_id.tickets) {
                    let id = to_num(msg.author.username.toString().trim());
                    let ticket_return = await this.server.database.tickets.findOne({
                        where: { ticket_id: id }
                    });
                    if (!ticket_return) return;
                    if (ticket_return.discord_message_id == "unknown") {
                        ticket_return.discord_message_id = msg.id;
                        ticket_return.save();
                    }
                    if (msg.reactions.cache.size == 0) msg.react('✉️');
                } 
                return;
            }
            if (
                msg.channel.id === channel_id.development &&
                msg.author != client.user
            ) {
                this.server.speakcontributors(
                    `discord Contributor chat ${msg.author.username}: ${msg.cleanContent}. `,
                    true,
                    "staff",
                    "ui/notify2.ogg"
                );
            }  else if (
                msg.channel.id === channel_id.building &&
                msg.author != client.user
            ) {
                this.server.speakbuilders(
                    `discord builder chat ${msg.author.username}: ${msg.cleanContent}. `,
                    true,
                    "staff",
                    "ui/notify2.ogg"
                );
            } else if (
                msg.channelId == channel_id.gamechat &&
                msg.author != client.user
            ) {
                this.server.speak(
                    `Discord ${msg.author.username}: ${msg.cleanContent}. `,
                    true,
                    "chat",
                    "ui/chat.ogg"
                );
            }
        });
        client.on("messageUpdate", (_, msg) => {
            if (msg.author == client.user || msg.webhookId) return;
            if (
                msg.channel.id === channel_id.development &&
                msg.author != client.user
            ) {
                this.server.speakcontributors(
                    `discord Contributor chat (edited) ${msg.author?.username}: ${msg.cleanContent}. `,
                    true,
                    "staff",
                    "ui/notify2.ogg"
                );
            } else if (
                msg.channel.id === channel_id.building &&
                msg.author != client.user
            ) {
                this.server.speakbuilders(
                    `discord builder chat (edited) ${msg.author?.username}: ${msg.cleanContent}. `,
                    true,
                    "staff",
                    "ui/notify2.ogg"
                );
            } else if (
                msg.channelId == channel_id.gamechat &&
                msg.author != client.user
            ) {
                this.server.speak(
                    `edited discord ${msg.author?.username}: ${msg.cleanContent}`,
                    true,
                    "chat",
                    "ui/chat.ogg"
                );
            }
        });
    }
    async send_message(message: string, channel_ID: string, name: string="Final Hour"): Promise<Message | void> {
        if (this.ignore_everything) return;
        client.channels.fetch(channel_ID).then((channel) => {
            if (channel instanceof TextChannel) {
                if (!this.webhooks[channel_ID]) {
                    channel.fetchWebhooks().then(
                        async webhooks => {
                            if (webhooks.size > 0) {
                                this.webhooks[channel_ID] = webhooks.first();
                                return await this.send_message(message, channel_ID, name);
                            } else {
                                channel.createWebhook({
                                    name: "Final Hour"
                                }).then(async webhook => {
                                    this.webhooks[channel_ID] = webhook;
                                    return await this.send_message(message, channel_ID, name);
                                });
                            }
                        }
                    );

                }
                let webhook = this.webhooks[channel_ID];
                if (webhook) {
                return  webhook.send({
                        content: message,
                        username: name
                    });
                }
            }
        });
    }
    get_uptime(): string {
        let seconds = to_num(`${client.uptime?.toString()}`) / 1000;
        const days = Math.floor(seconds / 86400);
        seconds %= 86400;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);

        return `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds`;
    }
    async loop() {
        if (this.update_timer.elapsed < 1000) return;
        client.user?.setActivity(
            `${this.server.players.length} players online and ${this.server.games.length} matches for ${this.get_uptime()}. `,
            {
                type: ActivityType.Playing,
            }
        );
        this.update_timer.restart();
}
    update(message: string) {
        if (this.ignore_everything) return;
        client.user?.setActivity(`${message} for ${this.get_uptime()}`, {
            type: ActivityType.Playing,
        });
    }
    async edit_ticket(ticket_msg_id: string, ticket: Ticket) {
        let cat = channel_id.tickets;
        if  (ticket.category == "building") cat = channel_id.building_tickets;
        const channel = await client.channels.cache.get(cat);
        if (channel instanceof TextChannel) {
            const msg = await channel.messages.fetch(ticket_msg_id);
            let new_msg = await this.send_message(`Author: ${ticket.author}\r\nCategory: ${ticket.category}\r\n\r\n> ${ticket.message_list[0]}\r\n\r\nResponses: ${ticket.message_list.length-1}`, cat, msg.author.username);
            if (!new_msg) return;
            console.log(msg.deletable);
            msg.delete();
            new_msg.reactions.removeAll();
            if (ticket.status == "open") new_msg.react('✉️');
            else if (ticket.status == "seen") new_msg.react('🟩');
            else if (ticket.status == "closed") new_msg.react('🔐');
        }
    }
}
if (!("FH_NO_DISCORD" in process.env) && process.env.DISCORD_TOKEN) client.login(process.env.DISCORD_TOKEN);
