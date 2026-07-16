import channel_id from "./libs/channel_id";
import events from "./libs/event_handeler";
import net from "./libs/networking";
try {
    var s = new net("localhost", 13000, events, "FH_NO_DISCORD" in process.env);
    process.once("SIGTERM", async function () {
        //when the server is (most likely) being restarted by docker. I'll assume that to always be the case
        s.updating=true;
        s.discord.send_message(" the server is updating", channel_id.botannouncements, "Server Status");
        for (let i of s.players) {
            i.speak(
                "the server is going offline to update in 5seconds.",
                true,
                "notifications",
                "ui/notify1.ogg"
            );
        }
        s.system_log("requested shutdown. Shutting down...");
        setTimeout(function () {
            for (let i of s.players) {
                i.send(0, "quit", {
                    message:
                        "the server is updating now! please login again in about 5 seconds",
                });
            }
        }, 4500);
        setTimeout(function () {
            process.kill(process.pid, "SIGTERM");
        }, 5000);
    });
} catch (err) {
    console.log(err);
    process.exit(1);
}
