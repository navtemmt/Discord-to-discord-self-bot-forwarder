const express = require('express');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const axios = require('axios');

// --- CONFIGURATION ---
const BOT_TOKEN = 'YOUR_OFFICIAL_BOT_TOKEN_HERE';
const DESTINATION_SERVER_ID = 'YOUR_DESTINATION_SERVER_ID_HERE';
const API_PORT = 3000;
// ---------------------

const app = express();
app.use(express.json());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// This will store our source channel IDs and their corresponding webhook URLs
const channelMap = new Map();

client.once('ready', () => {
    console.log(`Writer Bot is online as ${client.user.tag}!`);
});

// API endpoint to receive and forward messages
app.post('/forward', async (req, res) => {
    const { sourceChannelId, isReply, replyingTo, newMessage } = req.body;

    if (!channelMap.has(sourceChannelId)) {
        console.warn(`Received message from unmapped source channel: ${sourceChannelId}`);
        return res.status(404).send('No webhook configured for this source channel');
    }

    const webhookUrl = channelMap.get(sourceChannelId);
    let payload = {};

    if (isReply) {
        // Create an embed to simulate a reply
        payload = {
            username: newMessage.author.name,
            avatar_url: newMessage.author.avatar,
            content: newMessage.content,
            embeds: [{
                author: { name: replyingTo.author.name, icon_url: replyingTo.author.avatar },
                description: replyingTo.content,
                color: 0x5865F2, // Discord blurple
                footer: { text: `Replying to ${replyingTo.author.name}` }
            }]
        };
    } else {
        // Create a simple message payload
        payload = {
            username: newMessage.author.name,
            avatar_url: newMessage.author.avatar,
            content: newMessage.content,
        };
    }

    try {
        await axios.post(webhookUrl, payload);
        res.status(200).send('Message forwarded successfully.');
    } catch (error) {
        console.error('Failed to send message via webhook:', error.message);
        res.status(500).send('Failed to forward message.');
    }
});

// API endpoint to create a new mirrored channel
app.post('/create-channel', async (req, res) => {
    const { sourceChannelId, channelName } = req.body;

    if (channelMap.has(sourceChannelId)) {
        return res.status(200).send('Channel already mapped.');
    }

    try {
        const guild = await client.guilds.fetch(DESTINATION_SERVER_ID);
        const newChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText, // Or other types as needed
        });

        const newWebhook = await newChannel.createWebhook('Mirror Bot Webhook', {
            reason: `Webhook for mirrored channel ${channelName}`
        });

        // Save the mapping
        channelMap.set(sourceChannelId, newWebhook.url);
        console.log(`Successfully created and mapped channel '${channelName}' (${sourceChannelId})`);
        res.status(200).json({ message: 'Channel created and mapped.', webhookUrl: newWebhook.url });

    } catch (error) {
        console.error(`Failed to create channel '${channelName}':`, error);
        res.status(500).send('Failed to create channel.');
    }
});

client.login(BOT_TOKEN);
app.listen(API_PORT, () => {
    console.log(`Writer Bot's API is listening on http://localhost:${API_PORT}`);
});

