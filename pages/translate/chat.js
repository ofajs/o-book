import { storage } from "/gh/kirakiray/ever-cache/src/main.js";

const API_ENDPOINTS = {
  kimi: "https://api.moonshot.cn/v1/chat/completions",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  glm: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  minimax: "https://api.minimax.chat/v1/text/chatcompletion_v2",
};

const DEFAULT_MODELS = {
  kimi: "moonshot-v1-8k",
  deepseek: "deepseek-chat",
  glm: "glm-4-flash",
  minimax: "abab6.5s-chat",
};

let apiKeys = [];
let currentProvider = "kimi";
let currentConcurrency = 1;
let activeRequests = 0;
let requestQueue = [];

export async function init() {
  apiKeys = (await storage.getItem("ai-keys")) || [];
  if (apiKeys.length > 0) {
    currentProvider = apiKeys[0].provider;
  }
}

export async function getApiKeys() {
  if (apiKeys.length === 0) {
    await init();
  }
  return apiKeys;
}

export async function getApiKey(provider) {
  const keys = await getApiKeys();
  return keys.find((k) => k.provider === provider);
}

export function setProvider(provider) {
  currentProvider = provider;
}

export function setConcurrency(concurrency) {
  currentConcurrency = concurrency;
}

export function getCurrentProvider() {
  return currentProvider;
}

export function getCurrentConcurrency() {
  return currentConcurrency;
}

async function callKimiApi(apiKey, messages, options = {}) {
  const isStream = options.stream === true;
  const response = await fetch(API_ENDPOINTS.kimi, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODELS.kimi,
      messages,
      temperature: options.temperature || 0.7,
      stream: isStream,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Kimi API error: ${response.status} ${response.statusText}`,
    );
  }

  if (isStream) {
    return response.body;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callDeepSeekApi(apiKey, messages, options = {}) {
  const isStream = options.stream === true;
  const response = await fetch(API_ENDPOINTS.deepseek, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODELS.deepseek,
      messages,
      temperature: options.temperature || 0.7,
      stream: isStream,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `DeepSeek API error: ${response.status} ${response.statusText}`,
    );
  }

  if (isStream) {
    return response.body;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGLMApi(apiKey, messages, options = {}) {
  const isStream = options.stream === true;
  const response = await fetch(API_ENDPOINTS.glm, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODELS.glm,
      messages,
      temperature: options.temperature || 0.7,
      stream: isStream,
    }),
  });

  if (!response.ok) {
    throw new Error(`GLM API error: ${response.status} ${response.statusText}`);
  }

  if (isStream) {
    return response.body;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callMiniMaxApi(apiKey, messages, options = {}) {
  const isStream = options.stream === true;
  const response = await fetch(API_ENDPOINTS.minimax, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODELS.minimax,
      messages,
      temperature: options.temperature || 0.7,
      stream: isStream,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `MiniMax API error: ${response.status} ${response.statusText}`,
    );
  }

  if (isStream) {
    return response.body;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callApi(provider, apiKey, messages, options) {
  switch (provider) {
    case "kimi":
      return await callKimiApi(apiKey, messages, options);
    case "deepseek":
      return await callDeepSeekApi(apiKey, messages, options);
    case "glm":
      return await callGLMApi(apiKey, messages, options);
    case "minimax":
      return await callMiniMaxApi(apiKey, messages, options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function* parseStream(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith(":")) {
        continue;
      }

      if (trimmedLine.startsWith("data: ")) {
        const data = trimmedLine.slice(6);
        if (data === "[DONE]") {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            yield delta.content;
          }
        } catch (e) {
          console.warn("Failed to parse stream data:", e, trimmedLine);
        }
      }
    }
  }
}

function processQueue() {
  if (activeRequests >= currentConcurrency || requestQueue.length === 0) {
    return;
  }

  const { resolve, reject, provider, apiKey, messages, options, onStream } =
    requestQueue.shift();
  activeRequests++;

  callApi(provider, apiKey, messages, options)
    .then((result) => {
      if (onStream && result instanceof ReadableStream) {
        onStream(result).then(() => resolve());
      } else {
        resolve(result);
      }
    })
    .catch(reject)
    .finally(() => {
      activeRequests--;
      processQueue();
    });
}

export async function translate(text, targetLang, options = {}) {
  const provider = options.provider || currentProvider;
  const apiKeyData = await getApiKey(provider);

  if (!apiKeyData) {
    throw new Error(`No API key found for provider: ${provider}`);
  }

  const messages = [
    {
      role: "system",
      content: `You are a professional translator. Please translate the following text to ${targetLang}. Only provide the translation, no explanations.`,
    },
    {
      role: "user",
      content: text,
    },
  ];

  const isStream = options.stream === true;

  return new Promise((resolve, reject) => {
    const requestItem = {
      provider,
      apiKey: apiKeyData.key,
      messages,
      options: {
        ...options,
        concurrency: apiKeyData.concurrency || 1,
      },
    };

    if (isStream && options.onChunk) {
      requestItem.onStream = async (stream) => {
        try {
          for await (const chunk of parseStream(stream)) {
            options.onChunk(chunk);
          }
        } catch (error) {
          reject(error);
        }
      };
      requestItem.resolve = () => {};
      requestItem.reject = reject;
    } else {
      requestItem.resolve = resolve;
      requestItem.reject = reject;
    }

    requestQueue.push(requestItem);
    processQueue();
  });
}

export async function chat(messages, options = {}) {
  const provider = options.provider || currentProvider;
  const apiKeyData = await getApiKey(provider);

  if (!apiKeyData) {
    throw new Error(`No API key found for provider: ${provider}`);
  }

  const isStream = options.stream === true;

  return new Promise((resolve, reject) => {
    const requestItem = {
      provider,
      apiKey: apiKeyData.key,
      messages,
      options: {
        ...options,
        concurrency: apiKeyData.concurrency || 1,
      },
    };

    if (isStream && options.onChunk) {
      requestItem.onStream = async (stream) => {
        try {
          for await (const chunk of parseStream(stream)) {
            options.onChunk(chunk);
          }
        } catch (error) {
          reject(error);
        }
      };
      requestItem.resolve = () => {};
      requestItem.reject = reject;
    } else {
      requestItem.resolve = resolve;
      requestItem.reject = reject;
    }

    requestQueue.push(requestItem);
    processQueue();
  });
}
