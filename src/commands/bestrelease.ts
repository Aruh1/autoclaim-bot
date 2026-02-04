import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

interface AnimeRelease {
    id: number;
    name: string;
    anime_id: number;
    created_at: string;
    description: string | null;
    download_links: string[] | null;
}

interface AnimeEntry {
    id: number;
    mal_id: number;
    title: string;
    title_english: string | null;
    title_japanese: string | null;
    image_url: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    releases: AnimeRelease[];
    alternatives: unknown[];
    unmuxed: unknown[];
    comparisons: unknown[];
}

export const data = new SlashCommandBuilder()
    .setName("bestrelease")
    .setDescription("Cari rilis subtitle Indonesia terbaik untuk anime")
    .addStringOption(opt => opt.setName("anime").setDescription("Nama anime yang ingin dicari").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const query = interaction.options.getString("anime", true).toLowerCase();

    try {
        const response = await fetch("https://best-release.kazeuta.com/__data.json");
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const json = (await response.json()) as { nodes?: { data?: unknown[] }[] };

        // Parse the SvelteKit data format
        const animeList = parseApiData(json);

        // Search for matching anime
        const results = animeList.filter(anime => {
            const title = anime.title?.toLowerCase() || "";
            const titleEng = anime.title_english?.toLowerCase() || "";
            const titleJp = anime.title_japanese?.toLowerCase() || "";
            return title.includes(query) || titleEng.includes(query) || titleJp.includes(query);
        });

        if (results.length === 0) {
            await interaction.editReply({
                content: `❌ Tidak ditemukan anime dengan kata kunci: **${query}**`
            });
            return;
        }

        // Limit to first 5 results
        const displayResults = results.slice(0, 5);

        const embed = new EmbedBuilder()
            .setTitle("🎬 Best Release Indonesia")
            .setDescription(`Hasil pencarian untuk: **${query}**`)
            .setColor(0x3498db)
            .setTimestamp()
            .setFooter({
                text: `Menampilkan ${displayResults.length} dari ${results.length} hasil • Data dari best-release.kazeuta.com`
            });

        for (const anime of displayResults) {
            const title = anime.title_english || anime.title;
            const releases = anime.releases || [];

            let releaseInfo = "";
            if (releases.length > 0) {
                releaseInfo = releases
                    .slice(0, 3)
                    .map(r => {
                        const desc = r.description ? ` (${r.description})` : "";
                        const links =
                            r.download_links && r.download_links.length > 0
                                ? ` [Download](${r.download_links[0]})`
                                : "";
                        return `• ${r.name}${desc}${links}`;
                    })
                    .join("\n");

                if (releases.length > 3) {
                    releaseInfo += `\n*... dan ${releases.length - 3} rilis lainnya*`;
                }
            } else {
                releaseInfo = "*Belum ada rilis*";
            }

            // Notes if any
            const notes = anime.notes ? `\n📝 *${anime.notes.split("\n")[0]}*` : "";

            embed.addFields({
                name: `${title}`,
                value: `${releaseInfo}${notes}\n[MAL](https://myanimelist.net/anime/${anime.mal_id})`,
                inline: false
            });
        }

        // Set thumbnail from first result
        if (displayResults[0]?.image_url) {
            embed.setThumbnail(displayResults[0].image_url);
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error("Best release error:", error);
        await interaction.editReply({
            content: "❌ Terjadi kesalahan saat mencari data. Silakan coba lagi nanti."
        });
    }
}

function parseApiData(json: { nodes?: { data?: unknown[] }[] }): AnimeEntry[] {
    const animeList: AnimeEntry[] = [];

    try {
        // SvelteKit data format stores values in a flat array with indices
        const node = json.nodes?.[1];
        if (!node?.data) return [];

        const data = node.data as unknown[];

        // Find the anime array indices (second element in data array)
        const animeIndices = data[1] as number[];
        if (!Array.isArray(animeIndices)) return [];

        // Template object at index 2
        const template = data[2] as Record<string, number>;
        if (!template) return [];

        for (const idx of animeIndices) {
            const entry = data[idx] as Record<string, number>;
            if (!entry) continue;

            const anime: AnimeEntry = {
                id: getValue(data, entry.id) as number,
                mal_id: getValue(data, entry.mal_id) as number,
                title: getValue(data, entry.title) as string,
                title_english: getValue(data, entry.title_english) as string | null,
                title_japanese: getValue(data, entry.title_japanese) as string | null,
                image_url: getValue(data, entry.image_url) as string,
                notes: getValue(data, entry.notes) as string | null,
                created_at: getValue(data, entry.created_at) as string,
                updated_at: getValue(data, entry.updated_at) as string,
                releases: [],
                alternatives: [],
                unmuxed: [],
                comparisons: []
            };

            // Parse releases
            const releaseIndices = getValue(data, entry.releases);
            if (Array.isArray(releaseIndices)) {
                for (const relIdx of releaseIndices) {
                    const relEntry = data[relIdx as number] as Record<string, number>;
                    if (!relEntry) continue;

                    const release: AnimeRelease = {
                        id: getValue(data, relEntry.id) as number,
                        name: getValue(data, relEntry.name) as string,
                        anime_id: getValue(data, relEntry.anime_id) as number,
                        created_at: getValue(data, relEntry.created_at) as string,
                        description: getValue(data, relEntry.description) as string | null,
                        download_links: getValue(data, relEntry.download_links) as string[] | null
                    };
                    anime.releases.push(release);
                }
            }

            animeList.push(anime);
        }
    } catch (e) {
        console.error("Error parsing API data:", e);
    }

    return animeList;
}

function getValue(data: unknown[], index: number | undefined): unknown {
    if (index === undefined || index === null) return null;
    return data[index];
}
