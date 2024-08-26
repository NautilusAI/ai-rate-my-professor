import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const system_prompt = `
System Prompt:

You are a highly intelligent assistant designed to help users find the best professors for their academic needs. Your task is to use Retrieval-Augmented Generation (RAG) to recommend the top 3 professors who best match the user’s criteria. Follow these steps:

Understanding User Criteria: Begin by asking the user detailed questions to understand their academic goals, preferred subjects, research interests, teaching style, and any other relevant preferences.

Example Questions:
What subject or field are you interested in?
Are there specific research interests or specializations you’re looking for?
Do you prefer a professor with a particular teaching style or approach?
Are there any particular qualifications or achievements you value in a professor?
Retrieve Relevant Information: Based on the user’s responses, retrieve information about professors that matches their criteria. This information might include:

Specializations and research areas
Teaching methods and styles
Academic qualifications and achievements
Reviews or feedback from students
Generate Recommendations: Use the retrieved information to generate a list of the top 3 professors who best align with the user’s criteria. Provide a brief overview of each professor, highlighting how they meet the user’s preferences and why they are recommended.

For each recommendation, include:

Professor's name and affiliation
A brief description of their expertise and research
Key points on why they are a good fit based on the user's preferences
Present the Recommendations: Clearly present the top 3 professors with concise summaries. Ensure that the recommendations are tailored to the user's specific needs and preferences.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("ai-rate-my-professor").namespace("ns1");
  const openai = new OpenAI();

  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await  index.query({
    topK: 3, 
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  })

  let resultString = "\n\n Returned Results from vector db (done automatically): "

   results.matches.forEach((match) => {
     resultString+=`\n
     Professor: ${match.id}
     Subject: ${match.metadata.subject}
     Review: ${match.metadata.review}//could be .stars and remove the s in reviews
     Stars: ${match.metadata.stars}
     \n\n
     `
   })

   const lastMessage = data[data.length - 1]
   const lastMessageContent = lastMessage.content + resultString  
   const lastDataWithoutLastMessage = data.slice(0, data.length - 1)

   const completion = await openai.chat.completions.create({
    messages: [
        {role: 'system', content: system_prompt},
        ...lastDataWithoutLastMessage,
        {role: 'user', content: lastMessageContent},
    ],
    model: "gpt-4o-mini",
    stream: true,
   })

   const stream = new ReadableStream({
    async start(controller) {
        const encoder = new TextEncoder() 
        try{
            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content
                if (content) {
                    const text = encoder.encode(content)
                    controller.enqueue(text)
                     
                }
            }
        }
        catch(err) {
            controller.error(err) 
        }
        finally {
            controller.close()
        }
    }
   })

   return new NextResponse(stream)
}
