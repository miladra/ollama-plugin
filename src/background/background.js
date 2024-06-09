chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateAndExplain",
    title: "Translate and Explain",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateAndExplain") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { text: info.selectionText });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showPopup') {
    chrome.action.setPopup({
      tabId: sender.tab.id,
      popup: 'views/popup.html'
    });

    chrome.storage.local.set({
      translation: message.translation,
      explanation: message.explanation,
      breakdown: message.breakdown
    }, () => {
      chrome.action.openPopup();
    });
  } else if (message.action === 'translateAndExplain') {
    translateAndExplain(message.text).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }
});

async function translateAndExplain(text) {
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  // Retrieve the API key from Chrome storage
  const { OPENAI_API_KEY } = await new Promise((resolve, reject) => {
    chrome.storage.local.get('OPENAI_API_KEY', resolve);
  });

  if (!OPENAI_API_KEY) {
    throw new Error('API Key not set');
  }

  const messages = [
    { role: 'system', content: 'You are a helpful assistant that translates text, provides explanations, and breaks down the text word by word.' },
    { role: 'user', content: `Translate the following text to English, provide an explanation, and give a word-by-word breakdown:\n\n"${text}"` }
  ];

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 150
    })
  });

  const data = await response.json();
  if (response.ok) {
    const result = data.choices[0].message.content.trim();
    const [translation, explanation, breakdown] = result.split('\n\n');

    return {
      translation: translation || "Translation not available",
      explanation: explanation || "Explanation not available",
      breakdown: breakdown || "Breakdown not available"
    };
  } else {
    throw new Error(data.error.message || 'Error fetching translation');
  }
}