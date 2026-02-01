import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { UniversalSpeedTest, SpeedUnits } from "universal-speedtest";
import { createCanvas } from "@napi-rs/canvas";

export const data = new SlashCommandBuilder().setName("speedtest").setDescription("Check hosting server network speed");

interface SpeedtestData {
    downloadSpeed: number;
    uploadSpeed: number;
    latency: number;
    jitter: number;
    totalTime: number;
    serverName: string;
    sponsor: string;
    isp: string;
    country: string;
}

function generateSpeedtestImage(data: SpeedtestData, botPing: number): Buffer {
    const width = 800;
    const height = 420;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f3460");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Speed Test Result", width / 2, 50);

    // Server info
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#a0a0a0";
    ctx.fillText(`${data.serverName} (${data.sponsor})`, width / 2, 80);
    ctx.fillText(`${data.isp} • ${data.country}`, width / 2, 100);

    // Download circle
    drawSpeedCircle(ctx, 200, 220, 90, data.downloadSpeed, "#00d4ff", "DOWNLOAD");

    // Upload circle
    drawSpeedCircle(ctx, 600, 220, 90, data.uploadSpeed, "#9c27b0", "UPLOAD");

    // Ping and Jitter boxes
    const boxY = 350;
    const boxHeight = 50;

    // Latency box
    drawInfoBox(ctx, 100, boxY, 140, boxHeight, "PING", `${data.latency.toFixed(0)} ms`, "#4caf50");

    // Jitter box
    drawInfoBox(ctx, 260, boxY, 140, boxHeight, "JITTER", `${data.jitter.toFixed(1)} ms`, "#ff9800");

    // Bot Ping box
    drawInfoBox(ctx, 440, boxY, 140, boxHeight, "BOT PING", `${botPing} ms`, "#2196f3");

    // Test Duration box
    drawInfoBox(ctx, 600, boxY, 140, boxHeight, "DURATION", `${data.totalTime.toFixed(1)}s`, "#e91e63");

    return Buffer.from(canvas.toBuffer("image/png"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSpeedCircle(ctx: any, x: number, y: number, radius: number, speed: number, color: string, label: string) {
    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Progress arc (based on speed, max 1000 Mbps for full circle)
    const progress = Math.min(speed / 1000, 1);
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.stroke();

    // Speed value
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(speed.toFixed(1), x, y - 10);

    // Unit
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#a0a0a0";
    ctx.fillText("Mbps", x, y + 20);

    // Label
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(label, x, y + radius + 25);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawInfoBox(
    ctx: any,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    color: string
) {
    // Box background
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 8);
    ctx.fill();

    // Label
    ctx.fillStyle = color;
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y - 12);

    // Value
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(value, x, y + 10);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const waitingEmbed = new EmbedBuilder()
        .setTitle("🌐 Speedtest")
        .setColor(0xffff00)
        .setDescription("The Speedtest is running, please wait a bit...")
        .setThumbnail(
            "https://store-images.s-microsoft.com/image/apps.52586.13510798887693184.740d7baf-50aa-4e26-adec-ae739ac12068.c9ef9495-f245-4367-872b-c5cc7b48841d"
        )
        .setImage("https://b.cdnst.net/images/share-logo.png")
        .setFooter({ text: "⏳ This takes approximately 30 seconds." });

    await interaction.reply({ embeds: [waitingEmbed] });

    try {
        const speedTest = new UniversalSpeedTest({
            tests: {
                measureDownload: true,
                measureUpload: true
            },
            units: {
                downloadUnit: SpeedUnits.Mbps,
                uploadUnit: SpeedUnits.Mbps
            }
        });

        const result = await speedTest.performOoklaTest();
        const botPing = interaction.client.ws.ping;

        // Generate speedtest image
        const imageData: SpeedtestData = {
            downloadSpeed: result.downloadResult?.speed ?? 0,
            uploadSpeed: result.uploadResult?.speed ?? 0,
            latency: result.pingResult.latency,
            jitter: result.pingResult.jitter,
            totalTime: result.totalTime,
            serverName: result.bestServer.name,
            sponsor: result.bestServer.sponsor,
            isp: result.client.isp,
            country: result.client.country
        };

        const imageBuffer = generateSpeedtestImage(imageData, botPing);
        const attachment = new AttachmentBuilder(imageBuffer, { name: "speedtest-result.png" });

        const finishEmbed = new EmbedBuilder()
            .setTitle(`🌐 ${interaction.client.user?.username} Speedtest`)
            .setColor(0x00ff00)
            .setDescription(
                [
                    `**ISP:** ${result.client.isp}`,
                    `**Location:** ${result.client.country}`,
                    `**IP:** ${result.client.ip}`,
                    `**Server:** ${result.bestServer.name} (${result.bestServer.sponsor})`,
                    `**Server Location:** ${result.bestServer.country}`
                ].join("\n")
            )
            .addFields(
                {
                    name: "📥 Download",
                    value: `\`${result.downloadResult?.speed.toFixed(2) ?? "N/A"} Mbps\``,
                    inline: true
                },
                {
                    name: "📤 Upload",
                    value: `\`${result.uploadResult?.speed.toFixed(2) ?? "N/A"} Mbps\``,
                    inline: true
                },
                {
                    name: "📊 Bot Ping",
                    value: `\`${botPing}ms\``,
                    inline: true
                },
                {
                    name: "🔄 Latency",
                    value: `\`${result.pingResult.latency.toFixed(2)}ms\``,
                    inline: true
                },
                {
                    name: "📶 Jitter",
                    value: `\`${result.pingResult.jitter.toFixed(2)}ms\``,
                    inline: true
                },
                {
                    name: "⏱️ Test Duration",
                    value: `\`${result.totalTime.toFixed(2)}s\``,
                    inline: true
                }
            )
            .setImage("attachment://speedtest-result.png")
            .setThumbnail(
                "https://store-images.s-microsoft.com/image/apps.52586.13510798887693184.740d7baf-50aa-4e26-adec-ae739ac12068.c9ef9495-f245-4367-872b-c5cc7b48841d"
            )
            .setFooter({ text: "Powered by Ookla Speedtest" })
            .setTimestamp();

        // Add download details if available
        if (result.downloadResult) {
            finishEmbed.addFields({
                name: "📥 Download Details",
                value: [
                    `Transferred: \`${(result.downloadResult.transferredBytes / 1_000_000).toFixed(2)} MB\``,
                    `Latency: \`${result.downloadResult.latency.toFixed(2)}ms\``,
                    `Jitter: \`${result.downloadResult.jitter.toFixed(2)}ms\``
                ].join(" | "),
                inline: false
            });
        }

        // Add upload details if available
        if (result.uploadResult) {
            finishEmbed.addFields({
                name: "📤 Upload Details",
                value: [
                    `Transferred: \`${(result.uploadResult.transferredBytes / 1_000_000).toFixed(2)} MB\``,
                    `Latency: \`${result.uploadResult.latency.toFixed(2)}ms\``,
                    `Jitter: \`${result.uploadResult.jitter.toFixed(2)}ms\``
                ].join(" | "),
                inline: false
            });
        }

        await interaction.editReply({ embeds: [finishEmbed], files: [attachment] });
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
