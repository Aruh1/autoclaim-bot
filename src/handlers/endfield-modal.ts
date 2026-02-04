import { type ModalSubmitInteraction, MessageFlags } from "discord.js";
import { User } from "../database/models/User";
import { EndfieldService } from "../services/endfield";

export async function handleEndfieldModal(interaction: ModalSubmitInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const token = interaction.fields.getTextInputValue("endfield-token").trim();
    const gameId = interaction.fields.getTextInputValue("endfield-game-id").trim();
    const server = interaction.fields.getTextInputValue("endfield-server").trim() || "2";
    const nickname = interaction.fields.getTextInputValue("endfield-nickname")?.trim() || "Unknown";

    // Validate params using service
    const validation = EndfieldService.validateParams(token, gameId, server);
    if (!validation.valid) {
        await interaction.editReply({
            content: validation.message || "❌ Invalid parameters."
        });
        return;
    }

    // Determine if this is an account_token (for OAuth) or legacy cred
    const isAccountToken = validation.isAccountToken ?? token.length > 100;

    // Save to database
    const updateData: Record<string, any> = {
        username: interaction.user.username,
        endfield: {
            gameId,
            server,
            accountName: nickname
        }
    };

    // Store in appropriate field based on token type
    if (isAccountToken) {
        updateData.endfield.accountToken = token;
        updateData.endfield.skOAuthCredKey = undefined; // Clear legacy
    } else {
        updateData.endfield.skOAuthCredKey = token;
        updateData.endfield.accountToken = undefined; // Clear new
    }

    await User.findOneAndUpdate(
        { discordId: interaction.user.id },
        {
            $set: updateData,
            $setOnInsert: {
                settings: { notifyOnClaim: true }
            }
        },
        { upsert: true, new: true }
    );

    // Clear any cached credentials for this user
    const service = new EndfieldService({
        accountToken: isAccountToken ? token : undefined,
        legacyCred: isAccountToken ? undefined : token,
        gameId,
        server
    });
    service.clearCache();

    const serverName = server === "2" ? "Asia" : "Americas/Europe";
    const tokenType = isAccountToken ? "Account Token (OAuth)" : "Legacy Cred";

    await interaction.editReply({
        content:
            `✅ **Endfield token saved!**\n\n` +
            `**Account**: ${nickname}\n` +
            `**UID**: ${gameId}\n` +
            `**Server**: ${serverName}\n` +
            `**Token Type**: ${tokenType}\n\n` +
            `⚠️ Gunakan \`/claim endfield\` untuk test apakah token berfungsi.`
    });
}
