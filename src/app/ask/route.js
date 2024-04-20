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

export async function POST(req) {
    try {
        const body = await req.json()
        const answer = await askGitBook(body?.question || 'no question')
        await sendFollowUpMessage(body.token, answer || 'Sorry, I\'m not sure.')
        return NextResponse.json({}, { status: 200 })
    } catch (error) {
        console.error({ error })
        return NextResponse.json({ error: error.message ?? 'Internal Server Error' }, { status: 500 })
    }
}
