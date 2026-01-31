import { type ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { User } from '../database/models/User';

export async function handleEndfieldModal(interaction: ModalSubmitInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const skOAuthCredKey = interaction.fields.getTextInputValue('endfield-token').trim();
    const gameId = interaction.fields.getTextInputValue('endfield-game-id').trim();
    const server = interaction.fields.getTextInputValue('endfield-server').trim() || '2';
    const nickname = interaction.fields.getTextInputValue('endfield-nickname')?.trim() || 'Unknown';

    // Validate server
    if (server !== '2' && server !== '3') {
        await interaction.editReply({
            content: '❌ Invalid server. Use **2** for Asia or **3** for Americas/Europe.',
        });
        return;
    }

    // Validate basic format
    if (!skOAuthCredKey || skOAuthCredKey.length < 20) {
        await interaction.editReply({
            content: '❌ Token terlalu pendek. Pastikan copy nilai **SK_OAUTH_CRED_KEY** yang lengkap dari cookies.',
        });
        return;
    }

    if (!gameId || !/^\d+$/.test(gameId)) {
        await interaction.editReply({
            content: '❌ Game UID harus berupa angka saja. Contoh: 10012345',
        });
        return;
    }

    // Save to database (skip API validation, let user test with /claim)
    await User.findOneAndUpdate(
        { discordId: interaction.user.id },
        {
            $set: {
                username: interaction.user.username,
                endfield: {
                    skOAuthCredKey,
                    gameId,
                    server,
                    accountName: nickname,
                },
            },
            $setOnInsert: {
                settings: { notifyOnClaim: true },
            },
        },
        { upsert: true, new: true }
    );

    const serverName = server === '2' ? 'Asia' : 'Americas/Europe';
    await interaction.editReply({
        content: `✅ **Endfield token saved!**\n\n**Account**: ${nickname}\n**UID**: ${gameId}\n**Server**: ${serverName}\n\n⚠️ Gunakan \`/claim endfield\` untuk test apakah token berfungsi.`,
    });
}
