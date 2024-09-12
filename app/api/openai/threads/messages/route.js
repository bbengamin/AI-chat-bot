import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const addCORSHeaders = (headers) => {
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	return headers;
};

export async function POST(request) {
	const headers = new Headers();
	addCORSHeaders(headers);

	const { threadId, message } = await request.json();
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

	try {
		await openai.beta.threads.messages.create(threadId, { role: 'user', content: message });
		return new Response(JSON.stringify({ status: 'Message sent' }), { headers });
	} catch (error) {
		console.error("Error sending message:", error);
		return new Response(JSON.stringify({ error: "Failed to send message" }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
