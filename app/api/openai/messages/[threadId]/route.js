import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const addCORSHeaders = (headers) => {
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	return headers;
};

export async function GET(request, { params }) {
	const headers = new Headers();
	addCORSHeaders(headers);

	const { threadId } = params;
	const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

	try {
		const messages = await openai.beta.threads.messages.list(threadId);
		return new Response(JSON.stringify({ messages: messages.data }), { headers });
	} catch (error) {
		console.error("Error retrieving messages:", error);
		return new Response(JSON.stringify({ error: "Failed to retrieve messages" }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
