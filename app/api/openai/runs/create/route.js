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

	const { threadId, assistant_id } = await request.json();
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

	try {
		const run = await openai.beta.threads.runs.create(threadId, {
			assistant_id: assistant_id
		});

		return new Response(JSON.stringify({ id: run.id }), { headers });
	} catch (error) {
		console.error("Error creating run:", error);
		return new Response(JSON.stringify({ error: "Failed to create run" }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
