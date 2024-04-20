import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyKey } from 'discord-interactions'

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

        console.dir({ body }, { depth: null})

        if (body?.type ===  1) return NextResponse.json({ type: 1 }, { status: 200 })

        if (body?.type === 2) {
            fetch('https://discord-bot-bsv-docs.vercel.app/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.TOKEN}`,
                },
                body: JSON.stringify({ question: body.data.options[0].value, token: body.token }),
            })
            return NextResponse.json({ type: 5 }, { status: 200 })
        }

        return NextResponse.json({ 
            type: 4, 
            data: {
                "tts": false,
                "content": "Sorry I'm having trouble finding an answer for that.",
            }
        }, { status: 200 })
    } catch (error) {
        console.error({ error })
        return NextResponse.json({ error: error.message ?? 'Internal Server Error' }, { status: 500 })
    }
}
