import { NextResponse } from 'next/server'

async function askGitBook(query) {
    const url = 'https://api.gitbook.com/v1/spaces/YnSBe0nmmzamovXnS2Yv/ask'
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
        return data.answer || 'No answer found.'
    } catch (error) {
        console.error('Error contacting GitBook API:', error)
        return 'Error retrieving answer.'
    }
}

export async function POST(req) {
    console.log(req.body)
    const message = req.body.message ?? {}
    if (!message?.author?.bot && message.content.startsWith('?ask')) {
        const query = message.content.slice(5).trim()
        try {
            const answer = await askGitBook(query)
            return NextResponse.json({ answer }, { status: 200 })
        } catch (error) {
            console.error({ error })
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        }
    }
}
