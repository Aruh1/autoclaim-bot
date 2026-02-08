import axios from "axios";
import * as cheerio from "cheerio";
import type { KbbiResult } from "../types/kbbi";
import { KBBI_BASE_URL, KBBI_USER_AGENT } from "../constants/kbbi";

const extractDefinitions = ($: cheerio.CheerioAPI, selector: string): string[] => {
    const definitions: string[] = [];
    $(selector).each((_, el) => {
        const $el = $(el);
        let label = "";

        // Capture labels from red font tags (e.g., 'n', 'v', 'p')
        const redFonts = $el.find("font[color='red']");
        if (redFonts.length > 0) {
            label = redFonts
                .map((_, f) => $(f).text().trim())
                .get()
                .filter(t => t.length > 0)
                .join(" ");
        }

        // Also check for span with class 'kelas'
        const spanTags = $el.find("span.kelas");
        if (spanTags.length > 0) {
            const spanLabel = spanTags
                .map((_, s) => $(s).text().trim())
                .get()
                .filter(t => t.length > 0)
                .join(" ");
            label = label ? `${label} ${spanLabel}` : spanLabel;
        }

        // Remove ALL font tags (including grey examples) and span.kelas
        $el.find("font").remove();
        $el.find("span.kelas").remove();

        const defText = $el.text().trim();
        if (defText) {
            const fullDef = label ? `_(${label})_ ${defText}` : defText;
            definitions.push(fullDef);
        }
    });
    return definitions;
};

export const searchKbbi = async (word: string): Promise<KbbiResult | null> => {
    try {
        const url = `${KBBI_BASE_URL}${encodeURIComponent(word)}`;
        const response = await axios.get(url, {
            headers: {
                "User-Agent": KBBI_USER_AGENT
            }
        });

        const $ = cheerio.load(response.data);
        const lemma = $("h2").first().text().trim();

        if (!lemma) {
            return null;
        }

        const definitions: string[] = [];

        definitions.push(...extractDefinitions($, "ol li"));
        definitions.push(...extractDefinitions($, "ul.adjusted-par li"));

        const cleanedDefinitions = definitions.filter(d => d.length > 0);

        return {
            lemma,
            definitions: cleanedDefinitions
        };
    } catch (error) {
        console.error(`Error fetching KBBI for ${word}:`, error);
        return null;
    }
};
