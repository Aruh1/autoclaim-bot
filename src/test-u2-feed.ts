/**
 * Quick test script for U2 feed
 * Run: bun run src/test-u2-feed.ts
 */

import { U2FeedService } from "./services/u2-feed";

const feedUrl = process.env.U2_RSS_URL || "";

if (!feedUrl) {
    console.error("❌ Set U2_RSS_URL environment variable first");
    process.exit(1);
}

const service = new U2FeedService();

console.log("📦 Fetching U2 RSS feed...\n");

const items = await service.fetchFeed(feedUrl);
console.log(`Found ${items.length} items\n`);

for (const item of items.slice(0, 5)) {
    const formatted = service.formatItem(item);
    console.log("─".repeat(60));
    console.log(`📋 Title: ${formatted.title.substring(0, 100)}...`);
    console.log(`🔗 Link: ${formatted.link}`);
    console.log(`📁 Category: ${formatted.category}`);
    console.log(`📦 Size: ${formatted.size}`);
    console.log(`👤 Uploader: ${formatted.uploader}`);
    console.log(`🖼️  Image: ${formatted.image || "none"}`);
    console.log(`📅 Date: ${formatted.pubDate.toISOString()}`);
    console.log(`🆔 GUID: ${formatted.guid}`);
    console.log();
}

console.log(`\n✅ Done! Showing ${Math.min(5, items.length)} of ${items.length} items.`);
