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

const rawItems = await service.fetchFeed(feedUrl);
console.log(`Found ${rawItems.length} raw items\n`);

for (const raw of rawItems.slice(0, 5)) {
    const item = service.formatItem(raw);
    console.log("─".repeat(60));
    console.log(`📋 Title: ${item.title.substring(0, 120)}${item.title.length > 120 ? "..." : ""}`);
    console.log(`🔗 Link: ${item.link}`);
    console.log(`📁 Category: ${item.category}`);
    console.log(`📦 Size: ${item.size}`);
    console.log(`👤 Uploader: ${item.uploader}`);
    console.log(`🖼️  Image: ${item.image || "none"}`);
    console.log(`📅 Date: ${item.pubDate.toISOString()}`);
    console.log(`⏰ Unix: ${item.pubDateUnix}`);
    console.log(`🆔 GUID: ${item.guid}`);
    console.log(`📝 Description snippet: ${raw.description.substring(0, 100)}...`);
    console.log();
}

console.log(`\n✅ Done! Showing ${Math.min(5, rawItems.length)} of ${rawItems.length} items.`);
