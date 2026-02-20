/**
 * U2 Feed Service
 * Parses U2 (u2.dmhy.org) RSS feed for BDMV torrents
 */

import Parser from "rss-parser";
import type { FormattedU2Item } from "../types/u2-feed";
import { U2_IMAGE_PATTERN, U2_ATTACH_IMAGE_PATTERN } from "../constants/u2-feed";

export class U2FeedService {
    private parser: Parser;

    constructor() {
        this.parser = new Parser({
            customFields: {
                item: ["author", "category", "description", "guid", "pubDate"]
            }
        });
    }

    /**
     * Fetch and parse RSS feed from U2
     */
    async fetchFeed(feedUrl: string): Promise<FormattedU2Item[]> {
        try {
            // Setup timeout abort controller
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(feedUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; AutoClaimBot/1.0)"
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error("U2 RSS fetch failed:", response.status);
                return [];
            }

            const xml = await response.text();
            const feed = await this.parser.parseString(xml);

            return feed.items.map(item => this.formatItem(item));
        } catch (error) {
            console.error("U2 RSS fetch error:", error);
            return [];
        }
    }

    /**
     * Extract first image URL from HTML description
     * Follows Rimuru-Bot's pattern
     */
    extractImage(description?: string): string | null {
        if (!description || description.trim() === "") return null;

        // Find all img src attributes and pick the first valid one
        const imgSrcRegex = /src=['"]([^'"]+\.(?:jpg|jpeg|png|gif|webp))/gi;
        let imgMatch;
        while ((imgMatch = imgSrcRegex.exec(description)) !== null) {
            let url = imgMatch[1];
            if (!url) continue;

            // Skip relative placeholders (e.g. pic/trans.gif)
            if (!url.startsWith("http") && !url.startsWith("//") && !U2_ATTACH_IMAGE_PATTERN.test(url)) {
                continue;
            }

            if (U2_ATTACH_IMAGE_PATTERN.test(url)) {
                url = `https://u2.dmhy.org/${url}`;
            } else if (url.startsWith("//")) {
                url = `https:${url}`;
            }
            return url;
        }

        // Fall back to general URL pattern
        const match = U2_IMAGE_PATTERN.exec(description);
        if (match) {
            let url = match[0];
            if (U2_ATTACH_IMAGE_PATTERN.test(url)) {
                url = `https://u2.dmhy.org/${url}`;
            } else if (url.startsWith("//")) {
                url = `https:${url}`;
            }
            return url;
        }

        return null;
    }

    /**
     * Extract uploader name from author field
     * Format: "username@u2.dmhy.org (username)"
     */
    private extractUploader(author?: string): string {
        if (!author) return "Unknown";

        // Remove HTML tags
        const cleaned = author.replace(/<[^>]+>/g, "").trim();
        // Extract name from parentheses
        const parenMatch = cleaned.match(/\(([^)]+)\)/);
        if (parenMatch?.[1]) return parenMatch[1].trim();

        const atMatch = cleaned.match(/^([^@]+)@/);
        if (atMatch?.[1]) return atMatch[1].trim();

        return cleaned || "Unknown";
    }

    /**
     * Estimate size from title since rss-parser might miss enclosure when missing standard tags
     */
    private extractSizeFromTitle(title?: string): string {
        if (!title) return "Unknown";
        const sizeMatch = title.match(/\[(\d+(?:\.\d+)?\s*[KMG]i?B)\]/i);
        return sizeMatch ? sizeMatch[1] || "Unknown" : "Unknown";
    }

    /**
     * Format a raw feed item for Discord embed
     */
    formatItem(item: any): FormattedU2Item {
        const title = item.title || "Unknown Title";

        return {
            title: title.replace(/<[^>]+>/g, "").trim(),
            link: item.link || "",
            image: this.extractImage(item.description as string | undefined) || null,
            category: item.categories?.[0] || item.category || "BDMV",
            uploader: this.extractUploader(item.author),
            size: this.extractSizeFromTitle(item.title),
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            guid: item.guid || item.link || title
        };
    }
}
