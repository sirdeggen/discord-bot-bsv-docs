import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyKey } from 'discord-interactions'

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

function verifySignature(rawBody) {
    const h = headers()
    const publicKey = process.env.PUBLIC_KEY
    const signature = h.get('X-Signature-Ed25519')
    const timestamp = h.get('X-Signature-Timestamp')

    console.log({ publicKey, signature, timestamp })

    if (!signature || !timestamp) {
        throw new Error('Missing headers');
    }

    const isValid = verifyKey(rawBody, signature, timestamp, publicKey)

    if (!isValid) {
        throw new Error('Invalid signature');
    }
}

async function sendFollowUpMessage(token, content) {
    const url = `https://discord.com/api/v9/webhooks/${process.env.DISCORD_APP_ID}/${token}/messages/@original`
    const options = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${process.env.BOT_TOKEN}`,
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

export async function POST(req) {
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)

    // Verify the request
    verifySignature(rawBody)

    console.dir({ body }, { depth: null})

    // ping
    if (body?.type ===  1) return NextResponse.json({ type: 1 }, { status: 200 })

    if (body?.type === 2) {
        // Send an immediate response to Discord to acknowledge the interaction
        NextResponse.json({ type: 5 }) // Defer the response
    }

    try {
        // Process the request in the background
        const query = body.data.options[0].value;
        const answer = await askGitBook(query);
        
        // Use a method to handle follow-up message
        await sendFollowUpMessage(body.token, answer || "Sorry, I'm not sure.");
    } catch (error) {
        console.error({ error })
    }
    return NextResponse.json(null, { status: 200 })
}
