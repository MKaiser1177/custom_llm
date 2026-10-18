

(function () {
  'use strict';

  
  const PERSONA_PRESETS = {
    cheerful: "You are a very friendly and cheerful assistant. Always respond in a warm, casual, and encouraging tone.",
    coding: "You are an expert software engineer and Python specialist. Provide concise, clean, well-commented code and clear explanations.",
    concise: "You are a direct, efficient assistant. Answer questions accurately and concisely without unnecessary filler.",
    creative: "You are an imaginative creative writer and conversational partner. Use expressive, colorful, and engaging language.",
    custom: ""
  };

  
  const DEFAULT_SETTINGS = {
    persona: "cheerful",
    systemPrompt: PERSONA_PRESETS.cheerful,
    temperature: 0.7,
    maxTokens: 256,
    topP: 0.85,
    repetitionPenalty: 1.15
  };

  
  let state = {
    conversations: [],
    currentId: null,
    settings: { ...DEFAULT_SETTINGS },
    isGenerating: false,
    abortController: null,
    theme: 'dark'
  };

  
  const elements = {
    sidebar: document.getElementById('sidebar'),
    toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    conversationsList: document.getElementById('conversationsList'),
    sidebarStatusDot: document.getElementById('sidebarStatusDot'),
    sidebarStatusTitle: document.getElementById('sidebarStatusTitle'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    navSettingsBtn: document.getElementById('navSettingsBtn'),
    clearAllChatsBtn: document.getElementById('clearAllChatsBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    chatViewport: document.getElementById('chatViewport'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesContainer: document.getElementById('messagesContainer'),
    stopContainer: document.getElementById('stopContainer'),
    stopBtn: document.getElementById('stopBtn'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    charCount: document.getElementById('charCount'),
    
    settingsModal: document.getElementById('settingsModalBackdrop'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
    personaSelect: document.getElementById('personaSelect'),
    systemPromptInput: document.getElementById('systemPromptInput'),
    tempRange: document.getElementById('tempRange'),
    tempVal: document.getElementById('tempVal'),
    tokensRange: document.getElementById('tokensRange'),
    tokensVal: document.getElementById('tokensVal'),
    topPRange: document.getElementById('topPRange'),
    topPVal: document.getElementById('topPVal'),
    repPenaltyRange: document.getElementById('repPenaltyRange'),
    repPenaltyVal: document.getElementById('repPenaltyVal')
  };

  
  function init() {
    loadSavedTheme();
    loadSavedSettings();
    loadSavedConversations();
    bindEvents();
    checkBackendHealth();
  }

  
  function loadSavedTheme() {
    const savedTheme = localStorage.getItem('casual_llm_theme') || 'dark';
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('casual_llm_theme', state.theme);
  }

  
  function loadSavedSettings() {
    try {
      const saved = localStorage.getItem('casual_llm_settings');
      if (saved) {
        state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      state.settings = { ...DEFAULT_SETTINGS };
    }
    updateSettingsUI();
  }

  function saveSettings() {
    state.settings.persona = elements.personaSelect.value;
    state.settings.systemPrompt = elements.systemPromptInput.value.trim() || PERSONA_PRESETS.cheerful;
    state.settings.temperature = parseFloat(elements.tempRange.value);
    state.settings.maxTokens = parseInt(elements.tokensRange.value, 10);
    state.settings.topP = parseFloat(elements.topPRange.value);
    state.settings.repetitionPenalty = parseFloat(elements.repPenaltyRange.value);

    localStorage.setItem('casual_llm_settings', JSON.stringify(state.settings));
    closeSettingsModal();
  }

  function updateSettingsUI() {
    elements.personaSelect.value = state.settings.persona;
    elements.systemPromptInput.value = state.settings.systemPrompt;
    elements.tempRange.value = state.settings.temperature;
    elements.tempVal.textContent = state.settings.temperature;
    elements.tokensRange.value = state.settings.maxTokens;
    elements.tokensVal.textContent = state.settings.maxTokens;
    elements.topPRange.value = state.settings.topP;
    elements.topPVal.textContent = state.settings.topP;
    elements.repPenaltyRange.value = state.settings.repetitionPenalty;
    elements.repPenaltyVal.textContent = state.settings.repetitionPenalty;
  }

  function resetSettingsToDefault() {
    state.settings = { ...DEFAULT_SETTINGS };
    updateSettingsUI();
  }

  
  function loadSavedConversations() {
    try {
      const saved = localStorage.getItem('casual_llm_conversations');
      state.conversations = saved ? JSON.parse(saved) : [];
    } catch (e) {
      state.conversations = [];
    }

    const savedId = localStorage.getItem('casual_llm_active_id');
    if (savedId && state.conversations.some(c => c.id === savedId)) {
      state.currentId = savedId;
    } else if (state.conversations.length > 0) {
      state.currentId = state.conversations[0].id;
    } else {
      createNewConversation();
    }

    renderConversationsList();
    renderCurrentConversation();
  }

  function persistConversations() {
    localStorage.setItem('casual_llm_conversations', JSON.stringify(state.conversations));
    localStorage.setItem('casual_llm_active_id', state.currentId);
  }

  function createNewConversation() {
    const newConv = {
      id: 'conv_' + Date.now(),
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      messages: []
    };
    state.conversations.unshift(newConv);
    state.currentId = newConv.id;
    persistConversations();
    renderConversationsList();
    renderCurrentConversation();
    focusInput();
  }

  function getCurrentConversation() {
    return state.conversations.find(c => c.id === state.currentId);
  }

  function switchConversation(id) {
    if (state.isGenerating) return;
    state.currentId = id;
    persistConversations();
    renderConversationsList();
    renderCurrentConversation();
    focusInput();
  }

  function deleteConversation(id, e) {
    if (e) e.stopPropagation();
    state.conversations = state.conversations.filter(c => c.id !== id);
    if (state.currentId === id) {
      if (state.conversations.length > 0) {
        state.currentId = state.conversations[0].id;
      } else {
        createNewConversation();
        return;
      }
    }
    persistConversations();
    renderConversationsList();
    renderCurrentConversation();
  }

  function clearCurrentChat() {
    if (state.isGenerating) return;
    const current = getCurrentConversation();
    if (!current) return;
    current.messages = [];
    current.title = 'New Conversation';
    persistConversations();
    renderConversationsList();
    renderCurrentConversation();
  }

  function clearAllConversations() {
    if (state.isGenerating) return;
    if (confirm("Are you sure you want to delete all conversations?")) {
      state.conversations = [];
      createNewConversation();
    }
  }

  
  function renderConversationsList() {
    elements.conversationsList.innerHTML = '';
    state.conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = `conversation-item ${conv.id === state.currentId ? 'active' : ''}`;
      item.onclick = () => switchConversation(conv.id);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'conversation-title';
      titleSpan.textContent = conv.title || 'Untitled Chat';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'item-delete-btn';
      deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      deleteBtn.title = "Delete conversation";
      deleteBtn.onclick = (e) => deleteConversation(conv.id, e);

      item.appendChild(titleSpan);
      item.appendChild(deleteBtn);
      elements.conversationsList.appendChild(item);
    });
  }

  function renderCurrentConversation() {
    const current = getCurrentConversation();
    elements.messagesContainer.innerHTML = '';

    if (!current || current.messages.length === 0) {
      elements.welcomeScreen.style.display = 'flex';
      elements.messagesContainer.style.display = 'none';
      return;
    }

    elements.welcomeScreen.style.display = 'none';
    elements.messagesContainer.style.display = 'flex';

    current.messages.forEach((msg, index) => {
      appendMessageElement(msg.role, msg.content, index);
    });

    scrollToBottom();
  }

  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMarkdown(rawText) {
    if (!rawText) return '';

    
    const codeBlockRegex = /```([a-zA-Z0-9_\-#+.]*)?\n([\s\S]*?)```/g;
    let parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      const textBefore = rawText.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
      const lang = match[1] || 'text';
      const code = match[2];
      parts.push({ type: 'code', lang: lang, content: code });
      lastIndex = match.index + match[0].length;
    }

    const remainingText = rawText.slice(lastIndex);
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }

    let html = '';
    parts.forEach(part => {
      if (part.type === 'code') {
        const escapedCode = escapeHtml(part.content);
        html += `
          <div class="code-block-wrapper">
            <div class="code-header">
              <span>${part.lang}</span>
              <button class="code-copy-btn" onclick="window.copyToClipboard(this)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
            </div>
            <pre><code>${escapedCode}</code></pre>
          </div>
        `;
      } else {
        let text = escapeHtml(part.content);
        
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        const paragraphs = text.split(/\n\s*\n/);
        html += paragraphs.map(p => {
          const lines = p.split('\n');
          return `<p>${lines.join('<br>')}</p>`;
        }).join('');
      }
    });

    return html;
  }

  window.copyToClipboard = function (btn) {
    const codeBlock = btn.closest('.code-block-wrapper').querySelector('code');
    if (!codeBlock) return;
    navigator.clipboard.writeText(codeBlock.innerText).then(() => {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `✓ Copied!`;
      setTimeout(() => {
        btn.innerHTML = originalHtml;
      }, 2000);
    });
  };

  function appendMessageElement(role, content, msgIndex) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    row.dataset.index = msgIndex;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : 'AI';

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = 'message-bubble-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatMarkdown(content);

    bubbleWrapper.appendChild(bubble);

    
    if (role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'message-actions';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-chip-btn';
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      `;
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(content);
        copyBtn.innerText = "✓ Copied";
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          `;
        }, 1800);
      };
      actions.appendChild(copyBtn);

      bubbleWrapper.appendChild(actions);
    }

    row.appendChild(avatar);
    row.appendChild(bubbleWrapper);
    elements.messagesContainer.appendChild(row);
    return bubble;
  }

  function scrollToBottom() {
    elements.chatViewport.scrollTop = elements.chatViewport.scrollHeight;
  }

  function focusInput() {
    elements.chatInput.focus();
  }

  
  async function sendMessage(promptText) {
    const text = promptText || elements.chatInput.value.trim();
    if (!text || state.isGenerating) return;

    const current = getCurrentConversation();
    if (!current) return;

    
    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';
    elements.sendBtn.disabled = true;
    updateCharCount();

    
    if (current.messages.length === 0) {
      current.title = text.length > 28 ? text.slice(0, 28) + '...' : text;
      renderConversationsList();
    }

    
    current.messages.push({ role: 'user', content: text });
    elements.welcomeScreen.style.display = 'none';
    elements.messagesContainer.style.display = 'flex';
    appendMessageElement('user', text, current.messages.length - 1);
    scrollToBottom();

    
    const botRow = document.createElement('div');
    botRow.className = 'message-row assistant';
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = 'message-bubble-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = '<span class="typing-cursor"></span>';

    bubbleWrapper.appendChild(bubble);
    botRow.appendChild(avatar);
    botRow.appendChild(bubbleWrapper);
    elements.messagesContainer.appendChild(botRow);
    scrollToBottom();

    
    state.isGenerating = true;
    state.abortController = new AbortController();
    elements.stopContainer.style.display = 'flex';
    setSidebarStatus('generating', 'Generating...');

    let assistantResponse = '';

    try {
      
      const payloadMessages = current.messages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          system_prompt: state.settings.systemPrompt,
          temperature: state.settings.temperature,
          top_p: state.settings.topP,
          max_new_tokens: state.settings.maxTokens,
          repetition_penalty: state.settings.repetitionPenalty
        }),
        signal: state.abortController.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); 

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                assistantResponse += parsed.token;
                bubble.innerHTML = formatMarkdown(assistantResponse) + '<span class="typing-cursor"></span>';
                scrollToBottom();
              } else if (parsed.error) {
                throw new Error(parsed.error);
              } else if (parsed.done) {
                
              }
            } catch (err) {
              console.warn("Parse error for chunk:", dataStr);
            }
          }
        }
      }

      
      bubble.innerHTML = formatMarkdown(assistantResponse);
      current.messages.push({ role: 'assistant', content: assistantResponse });
      persistConversations();

      
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-chip-btn';
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      `;
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(assistantResponse);
        copyBtn.innerText = "✓ Copied";
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          `;
        }, 1800);
      };
      actions.appendChild(copyBtn);
      bubbleWrapper.appendChild(actions);

    } catch (err) {
      if (err.name === 'AbortError') {
        bubble.innerHTML = formatMarkdown(assistantResponse || "(Generation stopped)");
        if (assistantResponse) {
          current.messages.push({ role: 'assistant', content: assistantResponse });
          persistConversations();
        }
      } else {
        bubble.innerHTML = `<span style="color: var(--danger)">Error: ${escapeHtml(err.message)}</span>`;
      }
    } finally {
      state.isGenerating = false;
      state.abortController = null;
      elements.stopContainer.style.display = 'none';
      setSidebarStatus('ready', 'Model Ready');
      elements.chatInput.disabled = false;
      focusInput();
      scrollToBottom();
    }
  }

  function stopGeneration() {
    if (state.abortController) {
      state.abortController.abort();
    }
  }

  
  async function checkBackendHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ready') {
          setSidebarStatus('ready', 'Model Ready');
        } else if (data.status === 'loading') {
          setSidebarStatus('generating', 'Loading Model...');
          setTimeout(checkBackendHealth, 2000);
        } else {
          setSidebarStatus('error', 'Model Error');
        }
      } else {
        setSidebarStatus('error', 'Server Error');
        setTimeout(checkBackendHealth, 3000);
      }
    } catch (e) {
      setSidebarStatus('error', 'Offline');
      setTimeout(checkBackendHealth, 4000);
    }
  }

  function setSidebarStatus(statusClass, label) {
    elements.sidebarStatusDot.className = `status-dot ${statusClass}`;
    elements.sidebarStatusTitle.textContent = label;
  }

  
  function openSettingsModal() {
    updateSettingsUI();
    elements.settingsModal.classList.add('open');
  }

  function closeSettingsModal() {
    elements.settingsModal.classList.remove('open');
  }

  function updateCharCount() {
    const len = elements.chatInput.value.length;
    elements.charCount.textContent = `${len} character${len === 1 ? '' : 's'}`;
  }

  
  function bindEvents() {
    
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    
    elements.toggleSidebarBtn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        elements.sidebar.classList.toggle('mobile-open');
      } else {
        elements.sidebar.classList.toggle('collapsed');
      }
    });

    elements.closeSidebarBtn.addEventListener('click', () => {
      elements.sidebar.classList.remove('mobile-open');
    });

    
    elements.newChatBtn.addEventListener('click', createNewConversation);
    elements.clearChatBtn.addEventListener('click', clearCurrentChat);
    elements.clearAllChatsBtn.addEventListener('click', clearAllConversations);

    
    elements.openSettingsBtn.addEventListener('click', openSettingsModal);
    elements.navSettingsBtn.addEventListener('click', openSettingsModal);
    elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) closeSettingsModal();
    });
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.resetDefaultsBtn.addEventListener('click', resetSettingsToDefault);

    
    elements.personaSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (PERSONA_PRESETS[val]) {
        elements.systemPromptInput.value = PERSONA_PRESETS[val];
      }
    });

    
    elements.tempRange.addEventListener('input', (e) => elements.tempVal.textContent = e.target.value);
    elements.tokensRange.addEventListener('input', (e) => elements.tokensVal.textContent = e.target.value);
    elements.topPRange.addEventListener('input', (e) => elements.topPVal.textContent = e.target.value);
    elements.repPenaltyRange.addEventListener('input', (e) => elements.repPenaltyVal.textContent = e.target.value);

    
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) sendMessage(prompt);
      });
    });

    
    elements.chatInput.addEventListener('input', () => {
      
      elements.chatInput.style.height = 'auto';
      elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 160) + 'px';
      elements.sendBtn.disabled = !elements.chatInput.value.trim() || state.isGenerating;
      updateCharCount();
    });

    elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    elements.sendBtn.addEventListener('click', () => sendMessage());
    elements.stopBtn.addEventListener('click', stopGeneration);
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
