# discord-bot-bsv-docs
A Bot for Discord which takes questions and answers with Gitbooks AI.

## ChatGPT solution to start from
```javascript
require('dotenv').config();
const { Client, Intents } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (!message.author.bot && message.content.startsWith('!ask')) {
        const query = message.content.slice(5).trim();
        if (query.length > 0) {
            const response = await askGitBook(query);
            message.channel.send(response);
        } else {
            message.channel.send("Please provide a question.");
        }
    }
});

async function askGitBook(query) {
    const url = 'https://api.gitbook.com/v1/spaces/your-space-id/ask';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GITBOOK_API_KEY}`
        },
        body: JSON.stringify({ query })
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data.answer || "No answer found.";
    } catch (error) {
        console.error('Error contacting GitBook API:', error);
        return "Error retrieving answer.";
    }
}

client.login(process.env.DISCORD_BOT_TOKEN);
```
