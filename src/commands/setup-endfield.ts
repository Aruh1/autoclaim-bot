import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    type ModalActionRowComponentBuilder
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("setup-endfield")
    .setDescription("Setup your SKPORT/Endfield token for auto daily claim");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder().setCustomId("setup-endfield-modal").setTitle("Setup Endfield Token");

    const tokenInput = new TextInputBuilder()
        .setCustomId("endfield-token")
        .setLabel("SK_OAUTH_CRED_KEY (from Cookie)")
        .setPlaceholder("F12 > Application > Cookies > game.skport.com > SK_OAUTH_CRED_KEY")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(20);

    const gameIdInput = new TextInputBuilder()
        .setCustomId("endfield-game-id")
        .setLabel("Game UID (number only)")
        .setPlaceholder("Your Endfield UID, example: 10012345")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(20);

    const serverInput = new TextInputBuilder()
        .setCustomId("endfield-server")
        .setLabel("Server (2=Asia, 3=Americas/Europe)")
        .setPlaceholder("2")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1);

    const nicknameInput = new TextInputBuilder()
        .setCustomId("endfield-nickname")
        .setLabel("Account Nickname (optional)")
        .setPlaceholder("Your nickname")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(50);

    const row1 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(tokenInput);
    const row2 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(gameIdInput);
    const row3 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(serverInput);
    const row4 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(nicknameInput);

    modal.addComponents(row1, row2, row3, row4);

    await interaction.showModal(modal);
}
