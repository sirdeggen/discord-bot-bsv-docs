import { NextResponse } from 'next/server'

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

export async function POST(req) {
    try {
        const body = await req.json()
        const message = body.message ?? {}
        const query = message.content.slice(5).trim()
        const answer = await askGitBook(query)
        if (!answer) return NextResponse.json({ error: `Sorry, I'm not sure.` }, { status: 200 }) 
        return NextResponse.json({ answer }, { status: 200 })
    } catch (error) {
        console.error({ error })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
