import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show how to use this bot');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
        .setTitle('📖 Auto-Claim Bot Help')
        .setColor(0x5865F2)
        .setDescription('Bot ini membantu kamu claim daily reward otomatis untuk Hoyolab dan Arknights: Endfield.')
        .addFields(
            {
                name: '🔧 Setup Commands',
                value: [
                    '`/setup-hoyolab` - Setup token Hoyolab',
                    '`/setup-endfield` - Setup token SKPORT/Endfield',
                ].join('\n'),
                inline: false,
            },
            {
                name: '🎮 Claim Commands',
                value: [
                    '`/claim` - Claim manual semua reward',
                    '`/claim hoyolab` - Claim Hoyolab saja',
                    '`/claim endfield` - Claim Endfield saja',
                ].join('\n'),
                inline: false,
            },
            {
                name: '📊 Info Commands',
                value: [
                    '`/status` - Lihat status token & riwayat claim',
                    '`/ping` - Cek latency bot',
                ].join('\n'),
                inline: false,
            },
            {
                name: '⚙️ Settings Commands',
                value: [
                    '`/settings notify true/false` - Toggle notifikasi DM',
                    '`/remove all/hoyolab/endfield` - Hapus token',
                ].join('\n'),
                inline: false,
            },
            {
                name: '📝 Cara Mendapatkan Token',
                value: '━━━━━━━━━━━━━━━━━━━━━',
                inline: false,
            },
            {
                name: '🌟 Hoyolab Token',
                value: [
                    '1. Buka https://www.hoyolab.com dan login',
                    '2. Tekan F12 → Application → Cookies',
                    '3. Copy nilai `ltoken_v2` dan `ltuid_v2`',
                    '4. Format: `ltoken_v2=xxx; ltuid_v2=xxx`',
                ].join('\n'),
                inline: false,
            },
            {
                name: '🎮 Endfield Token',
                value: [
                    '1. Buka https://game.skport.com/endfield/sign-in dan login',
                    '2. Tekan F12 → Console',
                    '3. Paste dan jalankan script berikut:',
                ].join('\n'),
                inline: false,
            },
            {
                name: '📋 getToken.js Script',
                value: '```js\n' +
                    'function getCookie(n){const v=`; ${document.cookie}`;const p=v.split(`; ${n}=`);if(p.length===2)return p.pop().split(";").shift()}\n' +
                    'console.log("SK_OAUTH_CRED_KEY:", getCookie("SK_OAUTH_CRED_KEY"))\n' +
                    '```',
                inline: false,
            },
            {
                name: '📝 Endfield Setup Info',
                value: [
                    '• **SK_OAUTH_CRED_KEY**: hasil dari script di atas',
                    '• **Game UID**: buka profil in-game, copy angka UID',
                    '• **Server**: 2 = Asia, 3 = Americas/Europe',
                ].join('\n'),
                inline: false,
            },
            {
                name: '⏰ Auto-Claim Schedule',
                value: 'Daily rewards akan di-claim otomatis setiap **00:00 UTC+8** (tengah malam).',
                inline: false,
            }
        )
        .setFooter({ text: 'Auto-Claim Bot • Hoyolab & Endfield' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
