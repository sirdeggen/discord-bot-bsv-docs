const express = require('express')
const bodyParser = require('body-parser')
const { verifyKey } = require('discord-interactions')

const app = express()
const port = process.env.PORT || 3000

app.use(bodyParser.json())

async function askGitBook(query) {
    const url = `https://api.gitbook.com/v1/spaces/${process.env.GITBOOK_SPACES_ID}/search/ask`
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GITBOOK_API_KEY}`,
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

async function sendFollowUpMessage(token, content) {
    const url = `https://discord.com/api/webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`
    const options = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${process.env.TOKEN}`,
        },
        body: JSON.stringify({ content }),
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
        const publicKey = process.env.PUBLIC_KEY
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
            const answer = await askGitBook(req.body.data.options[0].value)
            await sendFollowUpMessage(req.body.token, answer || 'Sorry, I\'m not sure.')
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