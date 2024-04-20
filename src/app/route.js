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

export async function POST(req) {
    try {
        const rawBody = await req.text()
        const body = JSON.parse(rawBody)

        // Verify the request
        verifySignature(rawBody)

        console.log({ body })

        if (body?.type ===  1) return NextResponse.json({ type: 1 }, { status: 200 })

        const message = body.message ?? {}
        const query = message.content.slice(5).trim()
        const answer = await askGitBook(query)
        if (!answer) return NextResponse.json({
            type: 3, // Corresponds to 'MESSAGE_NO_SOURCE'
            data: {
                tts: false,
                content: `Sorry, I'm not sure.`,
                embeds: [],
                allowed_mentions: {}
            }
        }, {status: 200})

        return NextResponse.json({
            type: 3, // Corresponds to 'MESSAGE_NO_SOURCE'
            data: {
                tts: false,
                content: answer,
                embeds: [],
                allowed_mentions: {}
            }
        }, {status: 200})
    } catch (error) {
        console.error({ error })
        return NextResponse.json({ error: error.message ?? 'Internal Server Error' }, { status: 500 })
    }
}
