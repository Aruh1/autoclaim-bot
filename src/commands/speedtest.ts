import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("speedtest")
    .setDescription("Check hosting server network speed");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const waitingEmbed = new EmbedBuilder()
        .setTitle("🌐 Speedtest")
        .setColor(0xffff00)
        .setDescription("The Speedtest is running, please wait a bit...")
        .setThumbnail("https://www.cloudflare.com/img/cf-facebook-card.png")
        .setFooter({ text: "⏳ This takes approximately 15-30 seconds." });

    await interaction.reply({ embeds: [waitingEmbed] });

    try {
        // Dynamic import for Cloudflare speedtest
        const { default: SpeedTest } = await import("@cloudflare/speedtest");

        const speedTest = new SpeedTest({
            autoStart: false,
            measureDownloadLoadedLatency: true,
            measureUploadLoadedLatency: true
        });

        // Run the speedtest
        await new Promise<void>((resolve, reject) => {
            speedTest.onFinish = () => resolve();
            speedTest.onError = (error: string) => reject(new Error(error));
            speedTest.play();
        });

        const results = speedTest.results;
        const summary = results.getSummary();

        // Get all available metrics
        const downloadBandwidth = results.getDownloadBandwidth() ?? 0;
        const uploadBandwidth = results.getUploadBandwidth() ?? 0;
        const unloadedLatency = results.getUnloadedLatency() ?? 0;
        const unloadedJitter = results.getUnloadedJitter() ?? 0;
        const downLoadedLatency = results.getDownLoadedLatency() ?? 0;
        const downLoadedJitter = results.getDownLoadedJitter() ?? 0;
        const upLoadedLatency = results.getUpLoadedLatency() ?? 0;
        const upLoadedJitter = results.getUpLoadedJitter() ?? 0;
        const packetLoss = results.getPacketLoss();
        const packetLossDetails = results.getPacketLossDetails();
        const scores = results.getScores();

        // Convert bandwidth to Mbps
        const downloadMbps = (downloadBandwidth / 1_000_000).toFixed(2);
        const uploadMbps = (uploadBandwidth / 1_000_000).toFixed(2);

        const finishEmbed = new EmbedBuilder()
            .setTitle(`🌐 ${interaction.client.user?.username} Speedtest`)
            .setColor(0x00ff00)
            .addFields(
                // Bandwidth
                {
                    name: "📥 Download",
                    value: `\`${downloadMbps} Mbps\``,
                    inline: true
                },
                {
                    name: "📤 Upload",
                    value: `\`${uploadMbps} Mbps\``,
                    inline: true
                },
                {
                    name: "📊 Bot Ping",
                    value: `\`${interaction.client.ws.ping}ms\``,
                    inline: true
                },
                // Unloaded Latency
                {
                    name: "🔄 Idle Latency",
                    value: `\`${unloadedLatency.toFixed(2)}ms\``,
                    inline: true
                },
                {
                    name: "📶 Idle Jitter",
                    value: `\`${unloadedJitter.toFixed(2)}ms\``,
                    inline: true
                },
                {
                    name: "📦 Packet Loss",
                    value: packetLoss != null ? `\`${(packetLoss * 100).toFixed(2)}%\`` : "`N/A`",
                    inline: true
                },
                // Loaded Latency (Download)
                {
                    name: "⬇️ Download Latency",
                    value: `\`${downLoadedLatency.toFixed(2)}ms\``,
                    inline: true
                },
                {
                    name: "⬇️ Download Jitter",
                    value: `\`${downLoadedJitter.toFixed(2)}ms\``,
                    inline: true
                },
                {
                    name: "\u200B",
                    value: "\u200B",
                    inline: true
                },
                // Loaded Latency (Upload)
                {
                    name: "⬆️ Upload Latency",
                    value: `\`${upLoadedLatency.toFixed(2)}ms\``,
                    inline: true
                },
                {
                    name: "⬆️ Upload Jitter",
                    value: `\`${upLoadedJitter.toFixed(2)}ms\``,
                    inline: true
                },
                {
                    name: "\u200B",
                    value: "\u200B",
                    inline: true
                }
            )
            .setThumbnail("https://www.cloudflare.com/img/cf-facebook-card.png")
            .setFooter({ text: "Powered by Cloudflare Speed Test" })
            .setTimestamp();

        // Add AIM Scores if available
        if (scores) {
            const scoreText = [
                `**Streaming:** ${scores.streaming?.points ?? "N/A"} (${scores.streaming?.classificationName ?? "N/A"})`,
                `**Gaming:** ${scores.gaming?.points ?? "N/A"} (${scores.gaming?.classificationName ?? "N/A"})`,
                `**RTC:** ${scores.rtc?.points ?? "N/A"} (${scores.rtc?.classificationName ?? "N/A"})`
            ].join("\n");

            finishEmbed.addFields({
                name: "🎮 AIM Scores",
                value: scoreText,
                inline: false
            });
        }

        // Add Packet Loss Details if available
        if (packetLossDetails && "totalMessages" in packetLossDetails) {
            const plDetails = [
                `Total Messages: ${packetLossDetails.totalMessages}`,
                `Sent: ${packetLossDetails.numMessagesSent}`,
                `Lost: ${packetLossDetails.lostMessages.length}`
            ].join(" | ");

            finishEmbed.addFields({
                name: "📦 Packet Loss Details",
                value: `\`${plDetails}\``,
                inline: false
            });
        }

        // Add Summary
        if (summary && summary.download != null && summary.upload != null) {
            finishEmbed.setDescription(
                `**Download:** ${(summary.download / 1_000_000).toFixed(2)} Mbps | **Upload:** ${(summary.upload / 1_000_000).toFixed(2)} Mbps | **Latency:** ${summary.latency?.toFixed(2) ?? "N/A"}ms`
            );
        }

        await interaction.editReply({ embeds: [finishEmbed] });
    } catch (error) {
        console.error("Speedtest error:", error);

        const errorEmbed = new EmbedBuilder()
            .setTitle("❌ Speedtest Failed")
            .setColor(0xff0000)
            .setDescription(
                `An error occurred while running the Speedtest.\n\`\`\`${error instanceof Error ? error.message : String(error)}\`\`\``
            )
            .setFooter({ text: "Error occurred during the Speedtest." })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}
