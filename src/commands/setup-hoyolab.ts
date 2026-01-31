import {
    SlashCommandBuilder,
    type ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    type ModalActionRowComponentBuilder,
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('setup-hoyolab')
    .setDescription('Setup your Hoyolab token for auto daily claim');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
        .setCustomId('setup-hoyolab-modal')
        .setTitle('Setup Hoyolab Token');

    const tokenInput = new TextInputBuilder()
        .setCustomId('hoyolab-token')
        .setLabel('Token (ltoken_v2 + ltuid_v2 + cookie_token)')
        .setPlaceholder('Paste result of document.cookie from https://genshin.hoyoverse.com/en/gift')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(20);

    const nicknameInput = new TextInputBuilder()
        .setCustomId('hoyolab-nickname')
        .setLabel('Account Nickname (optional)')
        .setPlaceholder('Your nickname')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(50);

    const row1 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(tokenInput);
    const row2 = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(nicknameInput);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
}
