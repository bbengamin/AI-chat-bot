import OpenAI from 'openai';
import fsPromises from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const dataFilePath = path.join(process.cwd(), 'db.json');

const addCORSHeaders = (headers) => {
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	return headers;
};

const saveMessageToThread = async (assistantId, threadId, message, isBot = false) => {
	try {
		const jsonData = await fsPromises.readFile(dataFilePath, 'utf-8');
		const objectData = JSON.parse(jsonData);

		if (!objectData.assistants[assistantId] || !objectData.assistants[assistantId].threads[threadId]) {
			throw new Error(`Thread with ID ${threadId} for assistant ${assistantId} not found.`);
		}

		objectData.assistants[assistantId].threads[threadId].messages.push({
			message,
			isBot
		});

		await fsPromises.writeFile(dataFilePath, JSON.stringify(objectData, null, 2));
	} catch (err) {
		console.error('Error saving message to thread:', err);
		throw new Error('Failed to save message to thread');
	}
};

export async function POST(request) {
	const headers = new Headers();
	addCORSHeaders(headers);

	const { threadId, assistantId, message } = await request.json();
	const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

	try {
		await saveMessageToThread(assistantId, threadId, message, false);

		await openai.beta.threads.messages.create(threadId, { role: 'user', content: message });

		const runResponse = await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });
		const runId = runResponse.id;

		let responseReceived = false;
		let botMessage = '';

		while (!responseReceived) {
			const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

			if (runStatus.status === "completed") {
				const messagesResponse = await openai.beta.threads.messages.list(threadId);
				botMessage = messagesResponse.data[0].content[0].text.value; // Отримання відповіді бота
				responseReceived = true;
			} else {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		await saveMessageToThread(assistantId, threadId, botMessage, true);

		return new Response(JSON.stringify({ status: 'Message sent and bot response saved', botMessage }), { headers });
	} catch (error) {
		console.error("Error processing message:", error);
		return new Response(JSON.stringify({ error: "Failed to process message" }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
