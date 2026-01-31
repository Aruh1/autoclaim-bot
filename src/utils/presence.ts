import { Client } from 'discord.js';

export function startPresenceUpdater(client: Client) {
    const update = () => {
        const now = new Date();
        const utc8 = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        const timeStr = utc8.toISOString().substring(11, 16); // HH:MM

        client.user?.setActivity(`Server Time: ${timeStr} | /help`, { type: 3 }); // Watching
    };

    update();
    setInterval(update, 60 * 1000); // Update every minute
}
