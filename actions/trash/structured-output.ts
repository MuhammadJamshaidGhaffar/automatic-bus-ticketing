// Make sure to include these imports:
// import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyAll33cob1DqxUXiiIREFHW-SSkhBO6kAM");

const schema = {
  description: "List of recipes",
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      recipeName: {
        type: SchemaType.STRING,
        description: "Name of the recipe",
        nullable: false,
      },
    },
    required: ["recipeName"],
  },
};

async function main() {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const result = await model.generateContent(
    "List a few popular cookie recipes."
  );
  console.log(result.response.text());
}
main();
