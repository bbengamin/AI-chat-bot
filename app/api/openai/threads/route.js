import fsPromises from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const dataFilePath = path.join(process.cwd(), 'db.json');

const addCORSHeaders = (headers) => {
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	return headers;
};

const saveThreadToDatabase = async (assistantId, threadId) => {
	try {
		const jsonData = await fsPromises.readFile(dataFilePath, 'utf-8');
		const objectData = JSON.parse(jsonData);

		if (!objectData.assistants[assistantId]) {
			throw new Error(`Assistant with ID ${assistantId} not found.`);
		}

		if (!objectData.assistants[assistantId].threads) {
			objectData.assistants[assistantId].threads = {};
		}

		objectData.assistants[assistantId].threads[threadId] = {
			id: threadId,
			messages: [],
			rating: null,
			feedback: null,
		};

		await fsPromises.writeFile(dataFilePath, JSON.stringify(objectData, null, 2));

	} catch (err) {
		console.error('Error saving thread to database:', err);
		throw new Error('Failed to save thread to database');
	}
};

export async function POST(request) {
	const headers = new Headers();
	addCORSHeaders(headers);

	try {
		const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });
		const thread = await openai.beta.threads.create();
		const threadId = thread.id;

		const { assistantId } = await request.json();

		if (!assistantId) {
			return new Response(JSON.stringify({ error: 'Assistant ID is required' }), { status: 400, headers });
		}

		await saveThreadToDatabase(assistantId, threadId);

		return new Response(JSON.stringify({ id: threadId }), { headers });
	} catch (error) {
		console.error("Error creating thread:", error);
		return new Response(JSON.stringify({ error: 'Failed to create thread' }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
