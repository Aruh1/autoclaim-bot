import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, version as djsVersion } from 'discord.js';
import os from 'os';
import { version as nodeVersion } from 'process';

export const data = new SlashCommandBuilder()
    .setName('statistic')
    .setDescription('Displays detailed bot and system statistics');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const client = interaction.client;

    // Fetch application owner
    if (!client.application?.owner) await client.application?.fetch();
    const owner = client.application?.owner;

    // Get system stats
    const cpu = os.cpus()[0];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / 1024 / 1024).toFixed(2);
    const osUptime = os.uptime();

    // Get bot stats (with sharding support)
    let totalGuilds = client.guilds.cache.size;
    let totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    let totalChannels = client.channels.cache.size;

    if (client.shard) {
        try {
            const results = await client.shard.broadcastEval(c => ({
                guilds: c.guilds.cache.size,
                users: c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
                channels: c.channels.cache.size
            }));

            totalGuilds = results.reduce((acc, val) => acc + val.guilds, 0);
            totalUsers = results.reduce((acc, val) => acc + val.users, 0);
            totalChannels = results.reduce((acc, val) => acc + val.channels, 0);
        } catch (error) {
            console.error('Error fetching shard stats:', error);
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`${client.user?.username} Statistics`)
        .setColor('#0099ff')
        .addFields(
            { name: '• Owner', value: owner?.toString() || 'Unknown', inline: false },
            { name: '• Total Users', value: totalUsers.toString(), inline: true },
            { name: '• Total Guilds', value: totalGuilds.toString(), inline: true },
            { name: '• Total Channels', value: totalChannels.toString(), inline: true },
            { name: '• Total Shards', value: client.shard ? client.shard.count.toString() : '1', inline: true },
            // { name: '• Voice Connections', value: client.voice.adapters.size.toString(), inline: true }, // Simple check
            { name: '• Uptime', value: formatUptime(process.uptime()), inline: true },
            { name: '• Network Latency', value: `${client.ws.ping}ms`, inline: true },
            { name: '• Memory Usage', value: `${memUsage} MB`, inline: true },
            { name: '• CPU', value: `${os.cpus().length} cores - ${os.arch()}`, inline: true },
            { name: '• Model', value: cpu?.model || 'Unknown', inline: false },
            { name: '• Free Memory', value: `${freeMem} bytes`, inline: true },
            { name: '• Platform', value: `${os.platform()} ${os.release()}`, inline: true },
            { name: '• Node.js', value: nodeVersion, inline: true },
            { name: '• Discord.js', value: `v${djsVersion}`, inline: true },
            { name: '• OS Uptime', value: formatUptime(osUptime), inline: true },
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}
