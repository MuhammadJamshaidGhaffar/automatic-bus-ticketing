const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI("AIzaSyAll33cob1DqxUXiiIREFHW-SSkhBO6kAM");

const functionDeclarations = [
  {
    name: "getCurrentWeather",
    description: "Get the current weather in a given location",
    parameters: {
      type: "OBJECT",
      properties: {
        location: {
          type: "STRING",
          description: "The city and state, e.g. San Francisco, CA",
        },
        unit: {fuinc
          type: "STRING",
          enum: ["celsius", "fahrenheit"],
        },
      },
      required: ["location"],
    },
  },
  {
    name: "getNews",
    description: "Gets the latest news on a specific topic",
    parameters: {
      type: "OBJECT",
      properties: {
        topic: {
          type: "STRING",
          description: "The topic of the news to retrieve",
        },
      },
      required: ["topic"],
    },
  },
];

const functions = {
  getCurrentWeather: async ({ location, unit }) =>
    getCurrentWeather(location, unit),
  getNews: async ({ topic }) => getNews(topic),
};

async function run(prompt) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: {
      functionDeclarations,
    },
    generationConfig: {
      temperature: 0.8,
    },
  });

  const chat = model.startChat();

  const result = await chat.sendMessage(prompt);

  const response = result.response;

  const textResponse = response.text();
  const functionCalls = response.functionCalls();

  console.log("Gemini response:", textResponse);
  console.log("Function calls:", functionCalls);

  if (!functionCalls) {
    return textResponse;
  }

  const second_request = [];

  if (functionCalls) {
    for (const call of functionCalls) {
      const function_result = await functions[call.name](call.args);
      console.log("Function result:", function_result);

      second_request.push({
        functionResponse: {
          name: call.name,
          response: {
            name: call.name,
            response: [function_result],
          },
        },
      });
    }
  }

  console.log("Second request:", second_request);

  const second_response = await chat.sendMessage(second_request);

  console.log("Second response:", second_response.response.text());
}

// Example function implementations (replace with your actual logic).
async function getCurrentWeather(location, unit) {
  // Replace with your actual weather API call.
  return {
    location: location,
    temperature: Math.floor(Math.random() * 30), // Example temperature
    unit: unit || "celsius",
    description: "Sunny",
  };
}

async function getNews(topic) {
  // Replace with your actual news API call.
  return {
    topic: topic,
    articles: [
      {
        title: `Breaking News: ${topic} Event`,
        summary: `Summary of the ${topic} event.`,
        url: "https://example.com/news",
      },
    ],
  };
}

// Example usage.
run("what's the weather of london");
//run("Get me the latest news about AI");
