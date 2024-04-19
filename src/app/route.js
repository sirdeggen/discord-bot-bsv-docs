import { NextResponse } from 'next/server'
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
    const publicKey = process.env.PUBLIC_KEY
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];

    if (!signature || !timestamp) {
        throw new Error('Missing headers');
    }

    const message = Buffer.from(timestamp + JSON.stringify(req.body));
    const sigBuffer = Buffer.from(signature, 'hex');
    const key = nacl.signing.VerifyKey.fromPublicKey(Buffer.from(publicKey, 'hex'));

    const isValid = key.verify(message, sigBuffer);

    if (!isValid) {
        throw new Error('Invalid signature');
    }
}

export async function POST(req) {
    try {
        const body = await req.json()

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
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
