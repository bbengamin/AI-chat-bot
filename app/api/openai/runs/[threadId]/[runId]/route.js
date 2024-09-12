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

	const { threadId, runId } = params;
	const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

	try {
		const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
		return new Response(JSON.stringify(runStatus), { headers });
	} catch (error) {
		console.error("Error retrieving run status:", error);
		return new Response(JSON.stringify({ error: "Failed to retrieve run status" }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
