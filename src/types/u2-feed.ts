/**
 * U2 Torrent Feed Types
 * Types for U2 (u2.dmhy.org) RSS feed parsing
 */

import type { IU2FeedSettings } from "../database/models/GuildSettings";

export type { IU2FeedSettings };

/** Formatted feed item ready for Discord embed */
export interface FormattedU2Item {
    /** Cleaned title */
    title: string;
    /** Details page URL */
    link: string;
    /** First image found in description */
    image: string | null;
    /** Category (e.g. "BDMV") */
    category: string;
    /** Uploader name (extracted from author field) */
    uploader: string;
    /** Human-readable file size */
    size: string;
    /** Publication date */
    pubDate: Date;
    /** Torrent info hash (used as unique ID) */
    guid: string;
}
