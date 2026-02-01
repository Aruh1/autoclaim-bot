/**
 * Embed Fix Service
 * Detects social media URLs and provides fixed embed versions
 */

// Platform IDs for configuration
export enum PlatformId {
    TWITTER = "twitter",
    TIKTOK = "tiktok",
    REDDIT = "reddit",
    INSTAGRAM = "instagram",
    PIXIV = "pixiv",
    BLUESKY = "bluesky",
    THREADS = "threads",
    FACEBOOK = "facebook",
    WEIBO = "weibo",
    MISSKEY = "misskey",
    PLURK = "plurk"
}

// Platform configuration
export interface PlatformConfig {
    id: PlatformId;
    name: string;
    color: number;
    patterns: RegExp[];
    fixes: { oldDomain: string; newDomain: string }[];
}

// Platform configurations with patterns and fixes
export const PLATFORMS: PlatformConfig[] = [
    {
        id: PlatformId.TWITTER,
        name: "Twitter/X",
        color: 0x1da1f2,
        patterns: [
            /https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/status\/(\d+)/i,
            /https?:\/\/(www\.)?fxtwitter\.com\/\w+\/status\/(\d+)/i,
            /https?:\/\/(www\.)?fixupx\.com\/\w+\/status\/(\d+)/i
        ],
        fixes: [
            { oldDomain: "twitter.com", newDomain: "fxtwitter.com" },
            { oldDomain: "x.com", newDomain: "fixupx.com" }
        ]
    },
    {
        id: PlatformId.TIKTOK,
        name: "TikTok",
        color: 0x000000,
        patterns: [
            /https?:\/\/(www\.)?tiktok\.com\/@[\w.]+\/video\/\d+/i,
            /https?:\/\/(www\.)?tiktok\.com\/t\/\w+/i,
            /https?:\/\/vm\.tiktok\.com\/\w+/i,
            /https?:\/\/vt\.tiktok\.com\/\w+/i
        ],
        fixes: [{ oldDomain: "tiktok.com", newDomain: "tnktok.com" }]
    },
    {
        id: PlatformId.REDDIT,
        name: "Reddit",
        color: 0xff4500,
        patterns: [
            /https?:\/\/(www\.|old\.)?reddit\.com\/r\/\w+\/comments\/\w+/i,
            /https?:\/\/(www\.|old\.)?reddit\.com\/r\/\w+\/s\/\w+/i
        ],
        fixes: [{ oldDomain: "reddit.com", newDomain: "vxreddit.com" }]
    },
    {
        id: PlatformId.INSTAGRAM,
        name: "Instagram",
        color: 0xe1306c,
        patterns: [
            /https?:\/\/(www\.)?instagram\.com\/(p|reel|reels)\/[\w-]+/i,
            /https?:\/\/(www\.)?instagram\.com\/share\/(p|reel|reels?)\/[\w-]+/i
        ],
        fixes: [{ oldDomain: "instagram.com", newDomain: "eeinstagram.com" }]
    },
    {
        id: PlatformId.PIXIV,
        name: "Pixiv",
        color: 0x0096fa,
        patterns: [/https?:\/\/(www\.)?pixiv\.net(\/\w+)?\/artworks\/\d+/i],
        fixes: [{ oldDomain: "pixiv.net", newDomain: "phixiv.net" }]
    },
    {
        id: PlatformId.BLUESKY,
        name: "Bluesky",
        color: 0x0085ff,
        patterns: [/https?:\/\/bsky\.app\/profile\/[\w.]+\/post\/\w+/i],
        fixes: [{ oldDomain: "bsky.app", newDomain: "fxbsky.app" }]
    },
    {
        id: PlatformId.THREADS,
        name: "Threads",
        color: 0x000000,
        patterns: [/https?:\/\/(www\.)?threads\.net\/@?\w+\/post\/\w+/i],
        fixes: [{ oldDomain: "threads.net", newDomain: "fixthreads.net" }]
    },
    {
        id: PlatformId.FACEBOOK,
        name: "Facebook",
        color: 0x1877f2,
        patterns: [
            // Supported by Facebed: /:user/posts/:(id|hash)
            /https?:\/\/(www\.|m\.)?facebook\.com\/[\w.]+\/posts\/[\w]+/i,
            // Supported: /share/p/:hash (posts) and /share/v/:hash (videos - partial support)
            /https?:\/\/(www\.|m\.)?facebook\.com\/share\/(v|p)\/\w+/i,
            // Supported: /groups/:id/posts/:(id|hash)
            /https?:\/\/(www\.|m\.)?facebook\.com\/groups\/\d+\/posts\/[\w]+/i,
            // Supported: /permalink.php?story_fbid and /story.php?story_fbid
            /https?:\/\/(www\.|m\.)?facebook\.com\/(permalink|story)\.php\?story_fbid/i,
            // Reels (supported)
            /https?:\/\/(www\.|m\.)?facebook\.com\/reel\/\d+/i,
            // Videos and watch
            /https?:\/\/(www\.|m\.)?facebook\.com\/[\w.]+\/videos\/\d+/i,
            /https?:\/\/(www\.|m\.)?facebook\.com\/watch\/?/i,
            // fb.watch short links
            /https?:\/\/(www\.)?fb\.watch\/\w+/i
        ],
        fixes: [{ oldDomain: "facebook.com", newDomain: "facebed.com" }]
    },
    {
        id: PlatformId.WEIBO,
        name: "Weibo",
        color: 0xdf2029,
        patterns: [
            /https?:\/\/(www\.|m\.)?weibo\.(com|cn)\/\d+\/\w+/i,
            /https?:\/\/(www\.|m\.)?weibo\.(com|cn)\/detail\/\d+/i
        ],
        fixes: [] // Rich embed only, no domain replacement
    },
    {
        id: PlatformId.MISSKEY,
        name: "Misskey",
        color: 0x96d04a,
        patterns: [/https?:\/\/[\w.]+\/notes\/\w+/i],
        fixes: [] // Rich embed only
    },
    {
        id: PlatformId.PLURK,
        name: "Plurk",
        color: 0xff574d,
        patterns: [/https?:\/\/(www\.)?plurk\.com\/p\/\w+/i],
        fixes: [] // Rich embed only
    }
];

// Extract URLs from message content
export function extractUrls(content: string): { url: string; spoilered: boolean }[] {
    const results: { url: string; spoilered: boolean }[] = [];

    // Skip URLs that start with $ or are wrapped in <>
    const skipPattern = /\$https?:\/\/|<https?:\/\/[^>]+>/g;
    const cleanContent = content.replace(skipPattern, "");

    // Match spoilered URLs: ||url||
    const spoilerPattern = /\|\|(https?:\/\/[^\s|]+)\|\|/g;
    let spoilerMatch: RegExpExecArray | null;
    while ((spoilerMatch = spoilerPattern.exec(content)) !== null) {
        results.push({ url: spoilerMatch[1]!, spoilered: true });
    }

    // Match regular URLs
    const urlPattern = /(https?:\/\/[^\s<>|]+)/g;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlPattern.exec(cleanContent)) !== null) {
        // Skip if already added as spoilered
        if (!results.some(r => r.url === urlMatch![1])) {
            results.push({ url: urlMatch[1]!, spoilered: false });
        }
    }

    return results;
}

// Find matching platform for a URL
export function findPlatform(url: string): PlatformConfig | null {
    for (const platform of PLATFORMS) {
        for (const pattern of platform.patterns) {
            if (pattern.test(url)) {
                return platform;
            }
        }
    }
    return null;
}

// Apply domain fix to URL
export function applyFix(url: string, platform: PlatformConfig): string {
    let fixedUrl = url;
    for (const fix of platform.fixes) {
        if (url.includes(fix.oldDomain)) {
            fixedUrl = url.replace(fix.oldDomain, fix.newDomain);
            break;
        }
    }
    return fixedUrl;
}

// Extract status/post ID from URL based on platform
export function extractPostId(url: string, platform: PlatformConfig): string | null {
    switch (platform.id) {
        case PlatformId.TWITTER: {
            const twitterMatch = url.match(/\/status\/(\d+)/);
            return twitterMatch?.[1] ?? null;
        }
        case PlatformId.BLUESKY: {
            const bskyMatch = url.match(/\/post\/(\w+)/);
            return bskyMatch?.[1] ?? null;
        }
        case PlatformId.PIXIV: {
            const pixivMatch = url.match(/\/artworks\/(\d+)/);
            return pixivMatch?.[1] ?? null;
        }
        default:
            return null;
    }
}

// Result of processing a URL
export interface ProcessedUrl {
    originalUrl: string;
    fixedUrl: string;
    platform: PlatformConfig;
    postId: string | null;
    spoilered: boolean;
}

// Process URLs in a message
export function processUrls(content: string, disabledPlatforms: PlatformId[] = []): ProcessedUrl[] {
    const urls = extractUrls(content);
    const results: ProcessedUrl[] = [];

    for (const { url, spoilered } of urls) {
        const platform = findPlatform(url);
        if (platform && !disabledPlatforms.includes(platform.id)) {
            results.push({
                originalUrl: url,
                fixedUrl: applyFix(url, platform),
                platform,
                postId: extractPostId(url, platform),
                spoilered
            });
        }
    }

    return results;
}
