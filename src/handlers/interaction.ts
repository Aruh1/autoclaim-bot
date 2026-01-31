import { ChatInputCommandInteraction, type Interaction, MessageFlags, Collection } from 'discord.js';
import { commands } from '../commands';
import { handleHoyolabModal } from './hoyolab-modal';
import { handleEndfieldModal } from './endfield-modal';

// Store commands in collection
const commandCollection = new Collection<string, typeof commands[0]>();
for (const command of commands) {
    commandCollection.set(command.data.name, command);
}

export async function handleInteraction(interaction: Interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = commandCollection.get(interaction.commandName);

        if (!command) {
            console.error(`Command ${interaction.commandName} not found`);
            return;
        }

        try {
            await command.execute(interaction as ChatInputCommandInteraction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ An error occurred while executing this command.',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while executing this command.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
        try {
            if (interaction.customId === 'setup-hoyolab-modal') {
                await handleHoyolabModal(interaction);
            } else if (interaction.customId === 'setup-endfield-modal') {
                await handleEndfieldModal(interaction);
            }
        } catch (error) {
            console.error('Error handling modal:', error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ An error occurred while processing your input.',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while processing your input.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    }
}
