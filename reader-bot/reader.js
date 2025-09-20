const { Client } = require('discord.js-selfbot-v13');
const axios = require('axios');

// --- CONFIGURATION ---
const USER_TOKEN = 'YOUR_DISCORD_USER_TOKEN_HERE';
const WRITER_API_URL = 'http://localhost:3000'; // The address of your Writer Bot's API
// ---------------------

const client = new Client({ checkUpdate: false });

client.on('ready', () => {
    console.log(`Reader Self-Bot is online as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignore messages from yourself to prevent loops
    if (message.author.id === client.user.id) return;

    let payload = {
        sourceChannelId: message.channel.id,
        isReply: false,
        newMessage: {
            author: {
                name: message.author.username,
                avatar: message.author.displayAvatarURL(),
            },
            content: message.content
        }
    };

    // Check if the message is a reply
    if (message.reference && message.reference.messageId) {
        try {
            const repliedToMessage = await message.channel.messages.fetch(message.reference.messageId);
            payload.isReply = true;
            payload.replyingTo = {
                author: {
                    name: repliedToMessage.author.username,
                    avatar: repliedToMessage.author.displayAvatarURL(),
                },
                content: repliedToMessage.content
            };
        } catch (error) {
            console.warn("Could not fetch the message being replied to. Sending as a normal message.");
        }
    }

    // Send the data to the Writer Bot
    try {
        await axios.post(`${WRITER_API_URL}/forward`, payload);
    } catch (error) {
        // This will often fail if the channel isn't mapped yet, which is expected.
        // console.error(`Could not forward message from ${message.channel.id}: ${error.message}`);
    }
});

client.on('channelCreate', async (channel) => {
    console.log(`New channel detected: ${channel.name} (${channel.id})`);
    
    const payload = {
        sourceChannelId: channel.id,
        channelName: channel.name,
    };

    // Tell the Writer bot to create a corresponding channel and webhook
    try {
        await axios.post(`${WRITER_API_URL}/create-channel`, payload);
        console.log(`Successfully reported new channel ${channel.name} to Writer Bot.`);
    } catch (error) {
        console.error(`Failed to report new channel to Writer Bot: ${error.message}`);
    }
});

client.login(USER_TOKEN);
