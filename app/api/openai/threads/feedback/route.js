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

const saveFeedbackToMessage = async (messageId, rating, feedback) => {
	try {
		const jsonData = await fsPromises.readFile(dataFilePath, 'utf-8');
		const objectData = JSON.parse(jsonData);
		for (const assistantId in objectData.assistants) {
			for (const threadId in objectData.assistants[assistantId].threads) {
				const messages = objectData.assistants[assistantId].threads[threadId].messages;

				const message = messages.find((msg) => msg.id === messageId);

				if (message) {
					if (rating) message.rating = rating;
					if (feedback) message.feedback = feedback;

					await fsPromises.writeFile(dataFilePath, JSON.stringify(objectData, null, 2));
					return;
				}
			}
		}
		throw new Error(`Message with ID ${messageId} not found.`);
	} catch (err) {
		console.error('Error saving feedback:', err);
		throw new Error('Failed to save feedback');
	}
};

export async function POST(request) {
	const headers = new Headers();
	addCORSHeaders(headers);

	const { messageId, rating, feedback } = await request.json();

	try {
		await saveFeedbackToMessage(messageId, rating, feedback);
		return new Response(JSON.stringify({ status: 'Feedback saved' }), { headers });
	} catch (error) {
		console.error("Error saving feedback:", error);
		return new Response(JSON.stringify({ error: "Failed to save feedback" }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
