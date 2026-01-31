import {
    Client,
    GatewayIntentBits,
    Events,
} from 'discord.js';
import { config } from './config';
import { connectDatabase } from './database/connection';
import { startScheduler } from './services/scheduler';
import { handleInteraction } from './handlers/interaction';
import { startPresenceUpdater } from './utils/presence';

// Create client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

// Ready event
client.once(Events.ClientReady, (readyClient) => {
    console.log(`✅ Logged in as ${readyClient.user.tag}`);
    console.log(`📊 Serving ${readyClient.guilds.cache.size} guilds`);

    // Start scheduler
    startScheduler(client);

    // Start presence updater
    startPresenceUpdater(readyClient);
});

// Interaction handler
client.on(Events.InteractionCreate, handleInteraction);

// Main function
async function main() {
    console.log('🚀 Starting Auto-Claim Bot Shard...');

    // Connect to database
    await connectDatabase();

    // Login to Discord
    await client.login(config.discord.token);
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Start
main().catch(console.error);
