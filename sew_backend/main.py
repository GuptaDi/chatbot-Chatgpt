from redis.exceptions import ConnectionError as RedisConnectionError
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.llms import Ollama
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from langchain_community.chat_message_histories import RedisChatMessageHistory
from redis import Redis

app = FastAPI()

# CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Redis connection
redis_conn = Redis(host="localhost", port=6379, decode_responses=True)


# Load PDF and split
loader = PyPDFLoader("./sew_docs/sew_docs.pdf")
documents = loader.load()
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=50)
split_docs = splitter.split_documents(documents)

# Embedding and vector store
embeddings = OllamaEmbeddings(model="mxbai-embed-large")
vectordb = Chroma.from_documents(
    split_docs, embedding=embeddings, persist_directory="./chroma_db")

# LLM and memory
llm = Ollama(model="llama3")


def get_memory(session_id: str = "default") -> ConversationBufferMemory:
    try:
        redis_history = RedisChatMessageHistory(
            session_id=session_id, url="redis://localhost:6379"
        )
        return ConversationBufferMemory(
            memory_key="chat_history",
            chat_memory=redis_history,
            return_messages=True
        )
    except RedisConnectionError:
        print("⚠️ Redis connection failed. Using in-memory fallback.")
        return ConversationBufferMemory(memory_key="chat_history", return_messages=True)


# Inside your /chat route
class ChatRequest(BaseModel):
    question: str
    session_id: str = "default"  # allows multi-user sessions


@app.post("/chat")
async def chat(req: ChatRequest):
    memory = get_memory(req.session_id)
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vectordb.as_retriever(),
        memory=memory,
        return_source_documents=False
    )
    result = qa_chain.invoke({"question": req.question})
    return {"answer": result["answer"]}


@app.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    memory = get_memory(session_id)
    return {
        "history": [
            {"role": msg.type, "content": msg.content}
            for msg in memory.chat_memory.messages
        ]
    }
