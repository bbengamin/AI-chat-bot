import OpenAI from 'openai';
import fsPromises from 'fs/promises';
import path from 'path';
import { ReadableStream } from 'stream/web';

const dataFilePath = path.join(process.cwd(), 'db.json');

const addCORSHeaders = (headers) => {
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	headers.set('Access-Control-Allow-Credentials', 'true');
	headers.set('Cache-Control', 'no-cache');
	headers.set('Connection', 'keep-alive');
	headers.set('Content-Type', 'text/event-stream');
	return headers;
};

const saveMessageToThread = async (assistantId, threadId, message, isBot = false, openaiMessageId = null) => {
	try {
		const jsonData = await fsPromises.readFile(dataFilePath, 'utf-8');
		const objectData = JSON.parse(jsonData);

		if (!objectData.assistants[assistantId]) {
			throw new Error(`Assistant with ID ${assistantId} not found.`);
		}

		if (!objectData.assistants[assistantId].threads) {
			objectData.assistants[assistantId].threads = {};
		}

		if (!objectData.assistants[assistantId].threads[threadId]) {
			objectData.assistants[assistantId].threads[threadId] = {
				id: threadId,
				messages: [],
			};
		}

		objectData.assistants[assistantId].threads[threadId].messages.push({
			id: openaiMessageId,
			message,
			isBot,
			rating: null,
			feedback: null,
		});

		await fsPromises.writeFile(dataFilePath, JSON.stringify(objectData, null, 2));

		return openaiMessageId;
	} catch (err) {
		console.error('Error saving message to thread:', err);
		throw new Error('Failed to save message to thread');
	}
};

export async function POST(request) {
	const headers = new Headers();
	addCORSHeaders(headers);

	const contentType = request.headers.get('Content-Type');

	if (!contentType.startsWith('multipart/form-data')) {
		return new Response(JSON.stringify({ error: 'Invalid content type' }), { status: 400, headers });
	}

	const formData = await request.formData();
	const threadId = formData.get('threadId');
	const assistantId = formData.get('assistantId');
	const message = formData.get('message');
	const files = formData.getAll('files[]');

	if (!threadId || !assistantId) {
		return new Response(JSON.stringify({ error: 'Missing threadId or assistantId' }), { status: 400, headers });
	}

	const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

	try {
		const createMessageResponse = await openai.beta.threads.messages.create(threadId, {
			role: 'user',
			content: message,
		});
		const userMessageId = createMessageResponse.id;

		await saveMessageToThread(assistantId, threadId, message, false, userMessageId);

		let botMessage = '';

		const stream = new ReadableStream({
			async start(controller) {
				try {
					if (files && files.length > 0) {
						const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

						for (const file of files) {
							if (!allowedImageTypes.includes(file.type)) {
								throw new Error(`Invalid file type: ${file.type}. Only images are supported.`);
							}

							const fileBuffer = await file.arrayBuffer();
							const base64Image = `data:${file.type};base64,${Buffer.from(fileBuffer).toString('base64')}`;

							const visionResponse = await openai.chat.completions.create({
								model: 'gpt-4-turbo',
								messages: [
									{
										role: 'user',
										content: [
											{ type: 'text', text: message || 'What’s in this image?' },
											{ type: 'image_url', image_url: { url: base64Image } },
										],
									},
								],
								stream: true,
							});

							let partialResponse = '';

							for await (const chunk of visionResponse) {
								const delta = chunk.choices[0].delta?.content || '';
								partialResponse += delta;

								controller.enqueue(new TextEncoder().encode(delta));
							}

							const botMessageResponse = await openai.beta.threads.messages.create(threadId, {
								role: 'assistant',
								content: partialResponse.trim(),
							});

							const botMessageId = botMessageResponse.id;
							await saveMessageToThread(assistantId, threadId, partialResponse.trim(), true, botMessageId);
						}

						controller.close();
					} else {
						const runStream = await openai.beta.threads.runs.create(threadId, {
							assistant_id: assistantId,
							stream: true,
						});

						for await (const event of runStream) {
							if (event.event === 'thread.message.delta') {
								const deltaContent = event.data.delta.content[0]?.text?.value || '';
								botMessage += deltaContent;
								controller.enqueue(new TextEncoder().encode(deltaContent));
							}
							if (event.event === 'thread.run.completed') {
								const messagesResponse = await openai.beta.threads.messages.list(threadId);
								const messages = messagesResponse.data;

								const firstMessage = messages[0];
								const botMessageId = firstMessage.id;

								await saveMessageToThread(assistantId, threadId, botMessage, true, botMessageId);

								controller.close();
							}
						}
					}
				} catch (err) {
					console.error('Error in stream:', err);
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: headers,
		});
	} catch (error) {
		console.error('Error processing message:', error);
		return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
	}
}

export async function OPTIONS() {
	const headers = new Headers();
	addCORSHeaders(headers);
	return new Response(null, { status: 204, headers });
}
