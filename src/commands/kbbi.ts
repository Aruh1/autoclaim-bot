import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { searchKbbi } from "../services/kbbi";
import { KBBI_BASE_URL } from "../constants/kbbi";

export const data = new SlashCommandBuilder()
    .setName("kbbi")
    .setDescription("Cari definisi kata di Kamus Besar Bahasa Indonesia (KBBI)")
    .addStringOption(option => option.setName("kata").setDescription("Kata yang ingin dicari").setRequired(true));

export async function execute(interaction: any) {
    await interaction.deferReply();

    const word = interaction.options.getString("kata");

    try {
        const result = await searchKbbi(word);

        if (!result) {
            return interaction.editReply({
                content: `Kata **"${word}"** tidak ditemukan di KBBI.`
            });
        }

        const embed = new EmbedBuilder()
            .setColor("#00a2e8")
            .setTitle(`KBBI: ${result.lemma}`)
            .setURL(`${KBBI_BASE_URL}${encodeURIComponent(word)}`)
            .setFooter({ text: "Sumber: KBBI Daring Kemdikbud" });

        if (result.definitions.length > 0) {
            embed.setDescription(result.definitions.map((def, index) => `${index + 1}. ${def}`).join("\n"));
        } else {
            embed.setDescription("Tidak ada definisi ditemukan.");
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error("KBBI Command Error:", error);
        await interaction.editReply({ content: "Terjadi kesalahan saat mencari kata di KBBI." });
    }
}
