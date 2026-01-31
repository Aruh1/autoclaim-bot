import { ShardingManager } from 'discord.js';
import path from 'path';
import { config } from './config';

const manager = new ShardingManager(path.join(__dirname, 'bot.ts'), {
    token: config.discord.token,
    totalShards: 'auto',
});

manager.on('shardCreate', (shard) => {
    console.log(`💎 Launched shard ${shard.id}`);
});

manager.spawn().catch(console.error);
