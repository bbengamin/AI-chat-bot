(function() {
	const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
	const apiBaseUrl = scriptTag.getAttribute('data-api-url');
	const assistantId = scriptTag.getAttribute('data-assistant-id');

	if (!apiBaseUrl || !assistantId) {
		console.error('API URL or Assistant ID is not provided!');
		return;
	}

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = `${apiBaseUrl}/css/widget-styles.css`;
	document.head.appendChild(link);

	const rootId = 'my-assistant-widget';
	let widgetRoot = document.getElementById(rootId);
	if (!widgetRoot) {
		widgetRoot = document.createElement('div');
		widgetRoot.id = rootId;
		document.body.appendChild(widgetRoot);
	}


	const closeSvgPath = `${apiBaseUrl}/close.svg`;

	widgetRoot.innerHTML = `
	  <button class="close-chat-icon" id="close-chat-icon">
		<img src="${closeSvgPath}" alt="Close Chat">
	  </button>
	  <div class="chat-box" id="chat-box"></div>
	  <div class="input-box">
		<input type="text" id="user-input" placeholder="Ask a question..." />
		<button id="send-btn">Send</button>
	  </div>
	`;

	const toggleButton = document.createElement('button');
	toggleButton.classList.add('chat-toggle-button');
	const chatSvgPath = `${apiBaseUrl}/chat.svg`;
	toggleButton.innerHTML = `<img src="${chatSvgPath}" alt="Chat Icon">`;
	document.body.appendChild(toggleButton);

	const openChat = () => {
		widgetRoot.style.display = 'flex';
		toggleButton.style.display = 'none';
	};

	const closeChat = () => {
		widgetRoot.style.display = 'none';
		toggleButton.style.display = 'block';
	};

	toggleButton.addEventListener('click', openChat);

	const closeChatIcon = document.getElementById('close-chat-icon');
	closeChatIcon.addEventListener('click', closeChat);

	const chatBox = document.getElementById('chat-box');
	const inputField = document.getElementById('user-input');
	const sendButton = document.getElementById('send-btn');

	let typingIndicator;

	const formatMessage = (message) => {
		message = message.replace(/\\n\\n/g, '</p><p>');
		message = message.replace(/\\n/g, '<br>');
		message = message.replace(/###\s*(.*)/g, '<h3>$1</h3>');
		message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
		message = message.replace(/(\d+)\.\s*(.*?)(?=\n|$)/g, '<li>$1. $2</li>');
		message = message.replace(/<li>/g, '<ul><li>').replace(/<\/li>/g, '</li></ul>');

		return `<p>${message}</p>`;
	};

	const addMessageToChat = (message, isBot = false) => {
		const messageElem = document.createElement('div');
		messageElem.classList.add('message', isBot ? 'bot' : 'user');

		const imgElem = document.createElement('img');
		imgElem.src = isBot
			? `${apiBaseUrl}/bot.svg`
			: `${apiBaseUrl}/user.svg`;

		const messageContent = document.createElement('div');
		messageContent.classList.add('message-content');
		messageContent.innerHTML = formatMessage(message);

		if (isBot) {
			messageElem.appendChild(imgElem);
			messageElem.appendChild(messageContent);
		} else {
			messageElem.appendChild(messageContent);
			messageElem.appendChild(imgElem);
		}

		chatBox.appendChild(messageElem);
		chatBox.scrollTop = chatBox.scrollHeight;
	};

	const addTypingIndicator = () => {
		if (!typingIndicator) {
			typingIndicator = document.createElement('div');
			typingIndicator.classList.add('typing-indicator', 'message', 'bot');

			const dot1 = document.createElement('div');
			dot1.classList.add('dot');
			const dot2 = document.createElement('div');
			dot2.classList.add('dot');
			const dot3 = document.createElement('div');
			dot3.classList.add('dot');

			typingIndicator.appendChild(dot1);
			typingIndicator.appendChild(dot2);
			typingIndicator.appendChild(dot3);

			chatBox.appendChild(typingIndicator);
			chatBox.scrollTop = chatBox.scrollHeight;
		}
	};

	const removeTypingIndicator = () => {
		if (typingIndicator) {
			typingIndicator.remove();
			typingIndicator = null;
		}
	};

	const getAnswer = async (threadId, runId) => {
		try {
			addTypingIndicator();
			const response = await fetch(`${apiBaseUrl}/api/openai/runs/${threadId}/${runId}`);
			const result = await response.json();

			if (result.status === "completed") {
				const messages = await fetch(`${apiBaseUrl}/api/openai/messages/${threadId}`);
				const messageData = await messages.json();

				removeTypingIndicator();
				addMessageToChat(messageData.messages[0].content[0].text.value, true);
			} else {
				setTimeout(() => getAnswer(threadId, runId), 200);
			}
		} catch (error) {
			removeTypingIndicator();
			console.error("Error retrieving answer from assistant:", error);
		}
	};

	const sendMessage = async () => {
		const question = inputField.value.trim();
		if (!question) return;

		addMessageToChat(question, false);
		inputField.value = "";

		let threadId = localStorage.getItem('threadId');

		try {
			let getThread;
			if (!threadId) {
				const threadResponse = await fetch(`${apiBaseUrl}/api/openai/threads`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ assistantId })
				});
				getThread = await threadResponse.json();
				threadId = getThread.id;
				localStorage.setItem('threadId', threadId);
			}

			await fetch(`${apiBaseUrl}/api/openai/threads/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ threadId, assistantId, message: question })
			});

			const runResponse = await fetch(`${apiBaseUrl}/api/openai/runs/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ threadId, assistant_id: assistantId })
			});
			const runData = await runResponse.json();

			getAnswer(threadId, runData.id);
		} catch (error) {
			console.error("Error sending message:", error);
		}
	};

	sendButton.addEventListener('click', sendMessage);
	inputField.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') sendMessage();
	});
})();
