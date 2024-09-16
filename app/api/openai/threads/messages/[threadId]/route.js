import OpenAI from 'openai';
import fsPromises from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'db.json');

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

	try {
		const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });
		const messagesResponse = await openai.beta.threads.messages.list(threadId);

		const messages = messagesResponse.data;

		if (messages && messages.length > 0) {
			const lastBotMessage = messages[0];
			console.log('lastBotMessage', lastBotMessage);
			if (lastBotMessage) {
				return new Response(JSON.stringify({ messageId: lastBotMessage.id }), { headers });
			} else {
				return new Response(JSON.stringify({ error: 'No bot message found' }), { status: 404 });
			}
		} else {
			return new Response(JSON.stringify({ error: 'No messages found' }), { status: 404 });
		}

	} catch (error) {
		console.error('Error fetching messages:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), { status: 500 });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
