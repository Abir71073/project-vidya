const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
async function main() {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image_url', image_url: { url: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Plum_pie_%28cropped%29.jpg' } }
          ]
        }
      ],
      model: 'openai/gpt-oss-120b',
    });
    console.log("Success:", chatCompletion.choices[0].message.content);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
main();
