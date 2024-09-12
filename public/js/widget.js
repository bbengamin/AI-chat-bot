(function() {
	const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
	const apiBaseUrl = scriptTag.getAttribute('data-api-url');
	const assistantId = scriptTag.getAttribute('data-assistant-id');

	if (!apiBaseUrl || !assistantId) {
		console.error('API URL or Assistant ID is not provided!');
		return;
	}

	const rootId = 'my-assistant-widget';
	let widgetRoot = document.getElementById(rootId);
	if (!widgetRoot) {
		widgetRoot = document.createElement('div');
		widgetRoot.id = rootId;
		document.body.appendChild(widgetRoot);
	}

	const style = document.createElement('style');
	style.innerHTML = `
      #${rootId} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        z-index: 1000;
        overflow: hidden;
        background-color: #fff;
        display: flex;
        flex-direction: column;
        padding: 10px;
        display: none;
        transition: all 0.3s ease-in-out;
      }

      .chat-box {
        flex-grow: 1;
        overflow-y: auto;
        border-bottom: 1px solid #ddd;
        padding: 10px;
        margin-bottom: 10px;
      }

      .input-box {
        display: flex;
        padding: 10px;
      }

      .input-box input {
        flex-grow: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        margin-right: 10px;
        font-size: 14px;
      }

      .input-box button {
        padding: 10px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.3s ease-in-out;
      }

      .input-box button:hover {
        background-color: #0056b3;
      }

      .chat-toggle-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: transparent;
        border: none;
        cursor: pointer;
        z-index: 1001;
      }

      .chat-toggle-button img {
        width: 50px;
        height: 50px;
      }

      .close-chat-icon {
        position: absolute;
        top: 10px;
        left: 10px;
        cursor: pointer;
        background-color: transparent;
        border: none;
        z-index: 1001;
      }

      .close-chat-icon img {
        width: 20px;
        height: 20px;
      }

      .message {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        animation: fadeIn 0.3s ease-in-out;
      }

      .message.user {
        justify-content: flex-end;
      }

      .message.bot {
        justify-content: flex-start;
      }

      .message-content {
        max-width: 70%;
        padding: 10px;
        border-radius: 10px;
        font-size: 14px;
        line-height: 1.5;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .message.user .message-content {
        background-color: #007bff;
        color: white;
        border-bottom-right-radius: 0;
      }

      .message.bot .message-content {
        background-color: #f1f1f1;
        color: #333;
        border-bottom-left-radius: 0;
      }

      .message.user img {
        margin-left: 10px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
      }

      .message.bot img {
        margin-right: 10px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
      }

      .typing-indicator {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-left: 5px;
      }

      .dot {
        width: 8px;
        height: 8px;
        margin-right: 4px;
        border-radius: 50%;
        background-color: #999;
        animation: blink 1.4s infinite both;
      }

      .dot:nth-child(1) {
        animation-delay: 0.2s;
      }

      .dot:nth-child(2) {
        animation-delay: 0.4s;
      }

      .dot:nth-child(3) {
        animation-delay: 0.6s;
      }

      @keyframes blink {
        0%, 80%, 100% {
          opacity: 0;
        }
        40% {
          opacity: 1;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
	document.head.appendChild(style);

	widgetRoot.innerHTML = `
      <button class="close-chat-icon" id="close-chat-icon">
        <img src="http://localhost:3000/close.svg" alt="Close Chat">
      </button>
      <div class="chat-box" id="chat-box"></div>
      <div class="input-box">
        <input type="text" id="user-input" placeholder="Ask a question..." />
        <button id="send-btn">Send</button>
      </div>
    `;

	const toggleButton = document.createElement('button');
	toggleButton.classList.add('chat-toggle-button');
	toggleButton.innerHTML = `<img src="http://localhost:3000/chat.svg" alt="Chat Icon">`;
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

	const addMessageToChat = (message, isBot = false) => {
		const messageElem = document.createElement('div');
		messageElem.classList.add('message', isBot ? 'bot' : 'user');

		const imgElem = document.createElement('img');
		imgElem.src = isBot
			? 'http://localhost:3000/bot.svg'
			: 'http://localhost:3000/user.svg';

		const messageContent = document.createElement('div');
		messageContent.classList.add('message-content');
		messageContent.textContent = message;

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
					headers: { 'Content-Type': 'application/json' }
				});
				getThread = await threadResponse.json();
				threadId = getThread.id;
				localStorage.setItem('threadId', threadId);
			}

			await fetch(`${apiBaseUrl}/api/openai/threads/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ threadId, message: question })
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
