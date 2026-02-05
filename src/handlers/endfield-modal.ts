import { type ModalSubmitInteraction, MessageFlags } from "discord.js";
import { User } from "../database/models/User";
import { EndfieldService } from "../services/endfield";

export async function handleEndfieldModal(interaction: ModalSubmitInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const cred = interaction.fields.getTextInputValue("endfield-token").trim();
    const gameId = interaction.fields.getTextInputValue("endfield-game-id").trim();
    const server = interaction.fields.getTextInputValue("endfield-server").trim() || "2";
    const nickname = interaction.fields.getTextInputValue("endfield-nickname")?.trim() || "Unknown";

    // URL-decode if needed
    let decodedCred = cred;
    if (cred.includes("%")) {
        try {
            decodedCred = decodeURIComponent(cred);
        } catch {
            // Not URL-encoded, use as-is
        }
    }

    // Validate params using service
    const validation = EndfieldService.validateParams(decodedCred, gameId, server);
    if (!validation.valid) {
        await interaction.editReply({
            content: validation.message || "❌ Invalid parameters."
        });
        return;
    }

    // Save to database
    await User.findOneAndUpdate(
        { discordId: interaction.user.id },
        {
            $set: {
                username: interaction.user.username,
                endfield: {
                    skOAuthCredKey: decodedCred,
                    gameId,
                    server,
                    accountName: nickname
                }
            },
            $setOnInsert: {
                settings: { notifyOnClaim: true }
            }
        },
        { upsert: true, new: true }
    );

    const serverName = server === "2" ? "Asia" : "Americas/Europe";

    await interaction.editReply({
        content:
            `✅ **Endfield token saved!**\n\n` +
            `**Account**: ${nickname}\n` +
            `**UID**: ${gameId}\n` +
            `**Server**: ${serverName}\n\n` +
            `⚠️ Gunakan \`/claim endfield\` untuk test apakah token berfungsi.`
    });
}
