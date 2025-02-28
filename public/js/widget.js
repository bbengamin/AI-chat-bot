(function() {
	const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
	const apiBaseUrl = scriptTag.getAttribute('data-api-url');
	const assistantId = scriptTag.getAttribute('data-assistant-id');
	const targetContainerId = scriptTag.getAttribute('data-container-id');

	if (!apiBaseUrl || !assistantId) {
		console.error('API URL or Assistant ID is not provided!');
		return;
	}

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = `${apiBaseUrl}/css/widget-styles.css`;
	document.head.appendChild(link);

	const rootId = 'my-assistant-widget';

	let widgetRoot = document.getElementById(rootId) || (targetContainerId && document.getElementById(targetContainerId));

	if (!widgetRoot) {
		if (targetContainerId) {
			const targetContainer = document.getElementById(targetContainerId);
			if (targetContainer) {
				widgetRoot = targetContainer;
				widgetRoot.classList.add('custom-chat-container');
			} else {
				console.error(`Container with ID "${targetContainerId}" not found.`);
				widgetRoot = document.createElement('div');
				widgetRoot.id = rootId;
				document.body.appendChild(widgetRoot);
			}
		} else {
			widgetRoot = document.createElement('div');
			widgetRoot.id = rootId;
			document.body.appendChild(widgetRoot);
		}
	} else {
		console.warn(`Widget already exists in the container with ID "${widgetRoot.id}".`);
	}

	if (targetContainerId && document.getElementById(targetContainerId)) {
		widgetRoot.style.fontFamily = "inherit";
	} else {
		const montserratLink = document.createElement('link');
		montserratLink.rel = 'stylesheet';
		montserratLink.href = "https://fonts.googleapis.com/css2?family=Montserrat&display=swap";
		document.head.appendChild(montserratLink);
		widgetRoot.style.fontFamily = "'Montserrat', sans-serif";
	}

	const fontStyle = document.createElement('style');
	fontStyle.textContent = `
    #${widgetRoot.id} * {
      font-family: inherit;
    }
  `;
	document.head.appendChild(fontStyle);

	const adjustHeightAndWidth = () => {
		let parentHeight = widgetRoot.parentElement.offsetHeight;
		parentHeight = parentHeight  < 800 ? 800 : parentHeight;
		widgetRoot.style.height = `${parentHeight}px`;
		const parentWidth = widgetRoot.parentElement.offsetWidth;
		widgetRoot.style.width = `${parentWidth}px`;
	};

	adjustHeightAndWidth();

	const resizeObserver = new ResizeObserver(adjustHeightAndWidth);
	resizeObserver.observe(widgetRoot.parentElement);

	const closeSvgPath = `${apiBaseUrl}/close.svg`;

	widgetRoot.innerHTML = `
	  <div class="chat-toolbar">
		  <button class="close-chat-icon" id="close-chat-icon">
			<img src="${closeSvgPath}" alt="Close Chat">
		  </button>
	  </div>
	  <div class="chat-box" id="chat-box"></div>
	  <div class="input-box">
		<div class="input-box-tools">
		  <a href="#" id="clear-btn" class="clear-button-link">New Conversation</a>
		  <label for="file-input" class="file-upload-wrapper">
			<img src="${apiBaseUrl}/upload-icon.svg" alt="Upload Icon" class="upload-icon">
		  </label>
		</div>
		<input type="text" id="user-input" placeholder="Ask a question..." />
		<button id="send-btn" type="button" class="send-button">Send</button>
		<input type="file" id="file-input" accept="image/*" multiple style="display: none;">
	  </div>
	  <div id="file-preview" class="file-preview"></div>
	`;

	const style = document.createElement('style');

	if (!targetContainerId || !document.getElementById(targetContainerId)) {
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
	}

	const chatBox = document.getElementById('chat-box');
	const inputField = document.getElementById('user-input');
	const sendButton = document.getElementById('send-btn');
	const fileInput = document.getElementById('file-input');
	const filePreview = document.getElementById('file-preview');
	const clearButton = document.getElementById('clear-btn');

	const selectedFiles = [];

	const clearConversation = () => {
		chatBox.innerHTML = '';
		localStorage.removeItem('threadId');
	};

	clearButton.addEventListener('click', (e) => {
		e.preventDefault();
		showConfirmPopup();
	});

	const toggleSendButton = (isDisabled) => {
		sendButton.disabled = isDisabled;
		sendButton.classList.toggle('disabled', isDisabled);
	};

	function showConfirmPopup() {
		const confirmPopup = document.createElement('div');
		confirmPopup.id = 'confirm-popup';
		confirmPopup.innerHTML = `
        <div class="confirm-popup-overlay"></div>
        <div class="confirm-popup-content">
            <h2 class="confirm-title">Are you sure you want to clear this conversation?</h2>
            <p class="confirm-description">
                This will clear the conversation from your feed. It will not delete any saved or sent messages in your conversation.
            </p>
            <div class="confirm-popup-buttons">
                <button id="confirm-clear" class="popup-button confirm">Yes</button>
                <button id="cancel-clear" class="popup-button cancel">No</button>
            </div>
        </div>
    `;

		document.body.appendChild(confirmPopup);

		document.getElementById('confirm-clear').addEventListener('click', () => {
			clearConversation();
			document.body.removeChild(confirmPopup);
		});

		document.getElementById('cancel-clear').addEventListener('click', () => {
			document.body.removeChild(confirmPopup);
		});
	}


	fileInput.addEventListener('change', () => {
		const files = Array.from(fileInput.files);

		files.forEach((file) => {
			if (!selectedFiles.some((f) => f.name === file.name && f.size === file.size)) {
				selectedFiles.push(file);
			}
		});

		updateFilePreview();
	});

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

	const addMessageToChat = (message, isBot = false, messageId = null, images = []) => {
		const messageElem = document.createElement('div');
		messageElem.classList.add('message', isBot ? 'bot' : 'user');

		const imgElem = document.createElement('img');
		imgElem.src = isBot ? `${apiBaseUrl}/bot.png` : `${apiBaseUrl}/user.svg`;
		imgElem.style.height = "40px"
		imgElem.style.width = "40px"

		const messageWrapper = document.createElement('div');
		messageWrapper.classList.add('message-wrapper');

		if (images.length > 0) {
			const thumbnailsWrapper = document.createElement('div');
			thumbnailsWrapper.classList.add('thumbnails-wrapper');

			images.forEach((image) => {
				const imgThumbnail = document.createElement('img');
				imgThumbnail.src = URL.createObjectURL(image);
				imgThumbnail.alt = image.name;
				imgThumbnail.classList.add('thumbnail');

				imgThumbnail.addEventListener('click', () => openLightbox(image));

				thumbnailsWrapper.appendChild(imgThumbnail);
			});

			messageWrapper.appendChild(thumbnailsWrapper);
		}

		const messageContent = document.createElement('div');
		messageContent.classList.add('message-content');
		messageContent.innerHTML = formatMessage(message);

		messageWrapper.appendChild(messageContent);
		messageElem.appendChild(imgElem);
		messageElem.appendChild(messageWrapper);

		chatBox.appendChild(messageElem);
		chatBox.scrollTop = chatBox.scrollHeight;

		return messageElem;
	};

	const openLightbox = (image) => {
		const lightbox = document.createElement('div');
		lightbox.classList.add('lightbox');

		const lightboxContent = `
        <div class="lightbox-content">
            <button class="lightbox-close">&times;</button>
            <img src="${URL.createObjectURL(image)}" alt="${image.name}" class="lightbox-image">
            <p class="lightbox-caption">${image.name}</p>
        </div>
    `;
		lightbox.innerHTML = lightboxContent;

		document.body.appendChild(lightbox);

		const closeButton = lightbox.querySelector('.lightbox-close');
		closeButton.addEventListener('click', () => lightbox.remove());

		lightbox.addEventListener('click', (e) => {
			if (e.target === lightbox) lightbox.remove();
		});
	};


	const sendFeedback = async (messageId, rating = null, feedback = null) => {
		if (!messageId) return;

		try {
			const response = await fetch(`${apiBaseUrl}/api/openai/threads/feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messageId, rating, feedback }),
			});
		} catch (error) {
			console.error('Failed to send feedback:', error);
		}
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
			isStreaming = true;
			manageFeedbackVisibility();
		}
	};

	const removeTypingIndicator = () => {
		if (typingIndicator) {
			typingIndicator.remove();
			typingIndicator = null;
			isStreaming = false;
			manageFeedbackVisibility();
		}
	};

	function sanitizeBotAnswer(answer) {
		const regex = /(?:\[[^\]]*\])|(?:【[^】]*】)/g;
		const matches = answer.match(regex);

		if (matches && matches.length > 0) {
			console.log('Sanitizing bot answer. Removed substrings:', matches);
		}

		return answer.replace(regex, '');
	}

	const getAnswer = async (threadId, runId, userMessageId) => {
		try {
			const response = await fetch(`${apiBaseUrl}/api/openai/runs/${threadId}/${runId}`);
			const result = await response.json();

			if (result.status === 'completed') {
				const messages = await fetch(`${apiBaseUrl}/api/openai/messages/${threadId}`);
				const messageData = await messages.json();

				removeTypingIndicator();

				const botMessageId = messageData.messages[0].id;
				let finalAnswer = messageData.messages[0].content[0].text.value;
				finalAnswer = sanitizeBotAnswer(finalAnswer);
				addMessageToChat(finalAnswer, true, botMessageId);
			} else {
				setTimeout(() => getAnswer(threadId, runId, userMessageId), 200);
			}
		} catch (error) {
			removeTypingIndicator();
			console.error('Error retrieving answer from assistant:', error);
		}
	};



	const updateFilePreview = () => {
		filePreview.innerHTML = '';
		selectedFiles.forEach((file, index) => {
			const reader = new FileReader();

			reader.onload = (event) => {
				const previewElement = document.createElement('div');
				previewElement.classList.add('preview-item');
				previewElement.dataset.index = index;

				previewElement.innerHTML = `
                <img src="${event.target.result}" alt="${file.name}" class="preview-thumbnail">
                <span class="preview-name">${file.name}</span>
                <button class="remove-button" data-index="${index}">Remove</button>
            `;

				previewElement.querySelector('.remove-button').addEventListener('click', () => {
					selectedFiles.splice(index, 1);
					updateFilePreview();
				});

				filePreview.appendChild(previewElement);
			};

			reader.readAsDataURL(file);
		});
	};

	let lastFeedbackTimeout;
	let isStreaming = false;

	const manageFeedbackVisibility = () => {
		const feedbackSections = document.querySelectorAll('.feedback-section');
		feedbackSections.forEach((section, index) => {
			clearTimeout(lastFeedbackTimeout);

			if (index !== feedbackSections.length - 1 || isStreaming) {
				section.style.display = 'none';
			} else if (inputField === document.activeElement && !isStreaming) {
				section.style.display = 'none';
				lastFeedbackTimeout = setTimeout(() => {
					section.style.display = 'block';
				}, 15000);
			} else if (!isStreaming) {
				lastFeedbackTimeout = setTimeout(() => {
					section.style.display = 'block';
				}, 10000);
			}
		});
	};

	inputField.addEventListener('input', () => {
		clearTimeout(lastFeedbackTimeout);
		manageFeedbackVisibility();
	});

	inputField.addEventListener('focus', () => {
		manageFeedbackVisibility();
	});

	inputField.addEventListener('blur', () => {
		manageFeedbackVisibility();
	});

	const sendMessage = async () => {
		let question = inputField.value.trim();

		if (!question && selectedFiles.length === 0) return;

		isStreaming = true;
		toggleSendButton(true);

		if(!question) {
			question = "Sending images...";
		}

		addMessageToChat(question || "Sending images...", false, null, selectedFiles);

		inputField.value = "";
		addTypingIndicator();

		manageFeedbackVisibility();

		let threadId = localStorage.getItem('threadId');

		try {
			let getThread;
			if (!threadId) {
				const threadResponse = await fetch(`${apiBaseUrl}/api/openai/threads`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ assistantId }),
				});
				getThread = await threadResponse.json();
				threadId = getThread.id;
				localStorage.setItem('threadId', threadId);
			}

			const formData = new FormData();
			formData.append('threadId', threadId);
			formData.append('assistantId', assistantId);
			if (question) formData.append('message', question);

			selectedFiles.forEach((file) => {
				formData.append('files[]', file);
			});

			selectedFiles.length = 0;
			updateFilePreview();

			const response = await fetch(`${apiBaseUrl}/api/openai/threads/messages`, {
				method: 'POST',
				body: formData,
			});

			removeTypingIndicator();

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let partialMessage = '';
			let messageId = null;

			const botMessageElem = addMessageToChat('', true);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				partialMessage += decoder.decode(value, { stream: true });

				const sanitizedPartial = sanitizeBotAnswer(partialMessage);
				botMessageElem.querySelector('.message-content').innerHTML = formatMessage(sanitizedPartial);
				chatBox.scrollTop = chatBox.scrollHeight;
			}

			const sanitizedMessage = sanitizeBotAnswer(partialMessage);
			botMessageElem.querySelector('.message-content').innerHTML = formatMessage(sanitizedMessage);

			messageId = await getLastBotMessageId(threadId);

			if (messageId) {
				addFeedbackSection(messageId);
				manageFeedbackVisibility();
			} else {
				console.error('Error: Bot message ID not found.');
			}
		} catch (error) {
			removeTypingIndicator();
			console.error('Error sending message:', error);
		} finally {
			toggleSendButton(false);
		}
	};

	const getLastBotMessageId = async (threadId) => {
		try {
			const response = await fetch(`${apiBaseUrl}/api/openai/threads/messages/${threadId}`);

			const data = await response.json();

			if (data.messageId) {
				return data.messageId;
			} else {
				console.error('No bot message found');
				return null;
			}
		} catch (error) {
			console.error('Error fetching last bot message:', error);
			return null;
		}
	};

	const addFeedbackSection = (messageId) => {
		const feedbackDiv = document.createElement('div');
		feedbackDiv.classList.add('feedback-section');

		const ratingDiv = document.createElement('div');
		ratingDiv.classList.add('rating-section');

		const feedbackInputDiv = document.createElement('div');
		feedbackInputDiv.classList.add('feedback-input-section');
		feedbackInputDiv.innerHTML = `
        <input class="feedback-input" type="text" placeholder="Leave detailed feedback..." />
    `;

		const feedbackInput = feedbackInputDiv.querySelector('.feedback-input');

		let selectedFeedbackType = null;

		const createButton = (icon, feedbackType) => {
			const button = document.createElement('button');
			button.className = 'feedback-button';
			button.setAttribute('type', 'button');
			button.innerHTML = icon;

			button.onclick = () => {
				if (selectedFeedbackType === feedbackType) {
					selectedFeedbackType = null;
					button.classList.remove('active');
				} else {
					selectedFeedbackType = feedbackType;
					Array.from(ratingDiv.querySelectorAll('.feedback-button')).forEach(btn => btn.classList.remove('active'));
					button.classList.add('active');
				}
				manageSendButtonState();
			};

			return button;
		};

		const thumbsUpButton = createButton('👍', 'like');
		const thumbsDownButton = createButton('👎', 'dislike');

		ratingDiv.appendChild(thumbsUpButton);
		ratingDiv.appendChild(thumbsDownButton);

		const sendFeedbackButton = document.createElement('button');
		sendFeedbackButton.setAttribute('type', 'button');
		sendFeedbackButton.className = 'feedback-submit';
		sendFeedbackButton.innerText = 'Send Feedback';
		sendFeedbackButton.disabled = true;

		const manageSendButtonState = () => {
			sendFeedbackButton.disabled = !(selectedFeedbackType && feedbackInput.value.trim());
		};

		sendFeedbackButton.onclick = () => {
			const feedbackText = feedbackInput.value.trim();

			if (selectedFeedbackType && feedbackText) {
				sendFeedback(messageId, selectedFeedbackType === 'like' ? 'up' : 'down', feedbackText)
					.then(() => {
						feedbackInput.value = '';
						selectedFeedbackType = null;
						thumbsUpButton.classList.remove('active');
						thumbsDownButton.classList.remove('active');
						sendFeedbackButton.disabled = true;

						const confirmationMessage = document.createElement('div');
						confirmationMessage.classList.add('feedback-confirmation');
						confirmationMessage.innerText = 'Feedback submitted!';

						feedbackDiv.appendChild(confirmationMessage);

						setTimeout(() => {
							feedbackDiv.style.display = 'none';
						}, 3000);
					})
					.catch(error => {
						console.error('Error submitting feedback:', error);

						const errorMessage = document.createElement('div');
						errorMessage.classList.add('feedback-error');
						errorMessage.innerText = 'Failed to submit feedback. Please try again.';

						feedbackDiv.appendChild(errorMessage);

						setTimeout(() => {
							errorMessage.remove();
						}, 3000);
					});
			}
		};

		feedbackInput.addEventListener('input', manageSendButtonState);

		feedbackDiv.appendChild(ratingDiv);
		feedbackDiv.appendChild(feedbackInputDiv);
		feedbackDiv.appendChild(sendFeedbackButton);

		widgetRoot.insertAdjacentElement('afterend', feedbackDiv);

		chatBox.scrollTop = chatBox.scrollHeight;
	};

	sendButton.addEventListener('click', sendMessage);
	inputField.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();

			if (!sendButton.disabled) {
				sendMessage();
			}
		}
	});
})();
