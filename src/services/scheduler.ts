import cron from "node-cron";
import { Client, TextChannel } from "discord.js";
import { User } from "../database/models/User";
import { HoyolabService, formatHoyolabResults } from "./hoyolab";
import { EndfieldService, formatEndfieldResult } from "./endfield";
import { config } from "../config";

export function startScheduler(client: Client): void {
    const { hour, minute } = config.scheduler;
    const cronExpression = `${minute} ${hour} * * *`;

    console.log(
        `📅 Scheduler set for ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} every day`
    );

    cron.schedule(
        cronExpression,
        async () => {
            // Only run on Shard 0 to prevent duplicate claims
            if (client.shard && client.shard.ids[0] !== 0) {
                return;
            }

            console.log("🔄 Running scheduled daily claims (Shard 0)...");
            await runDailyClaims(client);
        },
        {
            timezone: "Asia/Singapore" // UTC+8
        }
    );
}

export async function runDailyClaims(client: Client): Promise<void> {
    const BATCH_SIZE = 5; // Process 5 users concurrently
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches

    try {
        // Use cursor for memory efficiency
        const cursor = User.find({
            $or: [
                { "hoyolab.token": { $exists: true, $ne: "" } },
                { "endfield.accountToken": { $exists: true, $ne: "" } },
                { "endfield.skOAuthCredKey": { $exists: true, $ne: "" } }
            ]
        }).cursor();

        let batch: Promise<void>[] = [];
        let count = 0;

        console.log("📊 Starting batch processing for daily claims...");

        for await (const user of cursor) {
            batch.push(processUserClaim(client, user));
            count++;

            if (batch.length >= BATCH_SIZE) {
                await Promise.all(batch);
                batch = []; // Clear batch
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }

        // Process remaining users in the last batch
        if (batch.length > 0) {
            await Promise.all(batch);
        }

        console.log(`✅ Daily claims completed. Processed ${count} users.`);
    } catch (error) {
        console.error("Scheduler error:", error);
    }
}

async function processUserClaim(client: Client, user: any): Promise<void> {
    const results: string[] = [];

    // Claim Hoyolab
    if (user.hoyolab?.token) {
        try {
            const hoyolab = new HoyolabService(user.hoyolab.token);
            const hoyolabResults = await hoyolab.claimAll(user.hoyolab.games);
            const resultText = formatHoyolabResults(hoyolabResults);
            results.push("**Hoyolab**\n" + resultText);

            // Update last claim
            user.hoyolab.lastClaim = new Date();
            user.hoyolab.lastClaimResult = resultText;
        } catch (error: any) {
            console.error(`Hoyolab claim error for ${user.discordId}:`, error.message);
            results.push("**Hoyolab**\n❌ Error: " + error.message);
        }
    }

    // Claim Endfield
    if (user.endfield?.accountToken || user.endfield?.skOAuthCredKey) {
        try {
            const endfield = new EndfieldService({
                accountToken: user.endfield.accountToken,
                legacyCred: user.endfield.skOAuthCredKey,
                gameId: user.endfield.gameId,
                server: user.endfield.server
            });
            const endfieldResult = await endfield.claim();
            const resultText = formatEndfieldResult(endfieldResult);
            results.push("**SKPORT/Endfield**\n" + resultText);

            // Update last claim
            user.endfield.lastClaim = new Date();
            user.endfield.lastClaimResult = resultText;
        } catch (error: any) {
            console.error(`Endfield claim error for ${user.discordId}:`, error.message);
            results.push("**SKPORT/Endfield**\n❌ Error: " + error.message);
        }
    }

    // Save updates
    try {
        await user.save();
    } catch (saveError) {
        console.error(`Failed to save user ${user.discordId}:`, saveError);
    }

    // Send DM if enabled
    if (user.settings.notifyOnClaim && results.length > 0) {
        try {
            const discordUser = await client.users.fetch(user.discordId);
            await discordUser.send({
                embeds: [
                    {
                        title: "📋 Daily Claim Results",
                        description: results.join("\n\n"),
                        color: 0x00ff00,
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        } catch (error) {
            // User might have DMs disabled or bot is blocked
            console.warn(`Could not DM user ${user.discordId} (might have DMs off)`);
        }
    }
}
