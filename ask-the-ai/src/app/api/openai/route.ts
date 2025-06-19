import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Parse the JSON body to extract the query property.
    const requestBody = await req.json();
    const query: string = requestBody.query;

    if (typeof query !== "string") {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // You can use 'gpt-4' if you have access
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: query },
      ],
    });

    const responseText =
      chatResponse.choices[0]?.message?.content ?? "No response";

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate a response" },
      { status: 500 }
    );
  }
}
