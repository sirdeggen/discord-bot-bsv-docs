import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import nacl from 'tweetnacl'

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

function verifySignature(req) {
    const h = headers()
    const publicKey = process.env.PUBLIC_KEY
    const signature = h.get('x-signature-ed25519')
    const timestamp = h.get('x-signature-timestamp')

    console.log({ publicKey, signature, timestamp })

    if (!signature || !timestamp) {
        throw new Error('Missing headers');
    }

    const message = Buffer.from(timestamp + JSON.stringify(req.body));
    const sigBuffer = Buffer.from(signature, 'hex');

    const isValid = nacl.sign.detached.verify(message, sigBuffer, Buffer.from(publicKey, 'hex'))

    if (!isValid) {
        throw new Error('Invalid signature');
    }
}

export async function POST(req) {
    try {
        const body = await req.json()

        console.log({ body })

        // Verify the request
        verifySignature(req)

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
