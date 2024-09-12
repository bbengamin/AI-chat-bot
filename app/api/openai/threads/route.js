import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const addCORSHeaders = (headers) => {
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	return headers;
};

export async function POST(request) {
	const headers = new Headers();
	addCORSHeaders(headers);

	const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

	try {
		const thread = await openai.beta.threads.create();
		return new Response(JSON.stringify({ id: thread.id }), { headers });
	} catch (error) {
		console.error("Error creating thread:", error);
		return new Response(JSON.stringify({ error: "Failed to create thread" }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
