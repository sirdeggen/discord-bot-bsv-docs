const express = require('express')
const bodyParser = require('body-parser')
const { verifyKey } = require('discord-interactions')
const env = require('dotenv').config()

const app = express()
const port = 3000

app.use(bodyParser.json())

async function askGitBook(query) {
    const url = `https://api.gitbook.com/v1/spaces/${env.parsed.GITBOOK_SPACES_ID}/search/ask`
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.parsed.GITBOOK_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    }

    try {
        const response = await fetch(url, options)
        const data = await response.json()
        console.log({ data })
        return data?.answer?.text || false
    } catch (error) {
        console.error('Error contacting GitBook API:', error)
        return 'Error retrieving answer.'
    }
}

async function sendFollowUpMessage(question, token, content) {
    const url = `https://discord.com/api/webhooks/${env.parsed.DISCORD_APP_ID}/${token}/messages/@original`
    const options = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${env.parsed.TOKEN}`,
        },
        body: JSON.stringify({ content: question + '\n\n' + content }),
    }

    try {
        const response = await fetch(url, options)
        const data = await response.json()
        console.log({ data })
    } catch (error) {
        console.error('Error sending follow-up message:', error)
    }
}


app.post('/', async (req, res) => {
    try {
        const publicKey = env.parsed.PUBLIC_KEY
        const signature = req.get('X-Signature-Ed25519')
        const timestamp = req.get('X-Signature-Timestamp')
        const rawBody = JSON.stringify(req.body)

        if (!signature || !timestamp) {
            throw new Error('Missing headers')
        }

        const isValid = verifyKey(rawBody, signature, timestamp, publicKey)
        if (!isValid) {
            throw new Error('Invalid signature')
        }

        if (req.body?.type === 1) {
            res.status(200).json({ type: 1 })
            return
        }

        if (req.body?.type === 2) {
            res.status(200).json({ type: 5 })
            const question = req.body.data.options[0].value
            const answer = await askGitBook(question)
            await sendFollowUpMessage(question, req.body.token, answer || 'Sorry, I\'m not sure.')
            return
        }
        res.status(200).json({})
    } catch (error) {
        console.error({ error })
        res.status(500).json({ error: error.message ?? 'Internal Server Error' })
    }
})

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})