/**
 * Messages page — direct messaging interface.
 * Layout: sidebar conversation list + active chat view.
 * Uses URL search param `conversationId` for routing between conversations.
 *
 * Components:
 * - ConversationList: Shows user's conversations with avatar, name, last message preview, time ago
 * - ChatView: Messages list with auto-scroll, send input, message bubbles
 *   (own messages in blue, others in gray)
 *
 * Responsive: On mobile, shows either list or chat. On desktop, shows both side-by-side.
 * Messages auto-refresh every 2 seconds via refetchInterval.
 * Requires authentication (AuthGuard), wrapped in Suspense for useSearchParams.
 */
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import AuthGuard from "~/app/_components/AuthGuard";
import Sidebar from "~/app/_components/Sidebar";
import { api } from "~/trpc/react";
import { User, ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";

function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { data: conversations, isLoading } = api.conversation.getConversations.useQuery();
  const { data: session } = useSession();

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-black z-10 border-b border-neutral-800 px-4 py-3">
        <h1 className="text-xl font-bold">Messages</h1>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-neutral-500" size={24} />
        </div>
      )}

      {conversations?.length === 0 && (
        <div className="p-4 text-neutral-500 text-center">No conversations yet.</div>
      )}

      <div className="flex-1 overflow-y-auto">
        {conversations?.map((conv) => {
          const other = conv.otherUser;
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-900 transition-colors text-left border-b border-neutral-800 ${conv.id === selectedId ? "bg-neutral-900" : ""}`}
            >
              <div className="h-10 w-10 rounded-full bg-neutral-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {other?.image ? (
                  <Image src={other.image} alt="" className="w-full h-full object-cover" width={40} height={40} />
                ) : (
                  <User size={20} className="text-neutral-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-[15px] truncate">{other?.name ?? "Unknown"}</span>
                  {conv.lastMessage && (
                    <span className="text-neutral-500 text-[13px] flex-shrink-0 ml-2">
                      {timeAgo(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <span className="text-neutral-500 text-[15px] truncate block">
                  {conv.lastMessage ? (
                    <>
                      {conv.lastMessage.senderId === session?.user.id && "You: "}
                      {conv.lastMessage.content}
                    </>
                  ) : (
                    "No messages yet"
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChatView({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack: () => void;
}) {
  const { data: messages, isLoading } = api.conversation.getMessages.useQuery(
    { conversationId },
    { refetchInterval: 2000 }
  );
  const sendMessage = api.conversation.sendMessage.useMutation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate(
      { conversationId, content: input.trim() },
      {
        onSuccess: () => {
          setInput("");
          inputRef.current?.focus();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-neutral-500" size={24} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="sticky top-0 bg-black z-10 border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-neutral-900">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-[17px]">
          {messages && messages.length > 0
            ? messages[0]?.sender.name ?? "Chat"
            : "Chat"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages?.length === 0 && (
          <div className="text-neutral-500 text-center py-8">Send a message to start chatting</div>
        )}
        {messages?.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl text-[15px] leading-normal whitespace-pre-wrap break-words ${
                msg.isOwn
                  ? "bg-[rgb(29,155,240)] text-white rounded-br-md"
                  : "bg-neutral-800 text-white rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-neutral-900 text-white rounded-full px-4 py-2.5 text-[15px] outline-none focus:ring-1 focus:ring-[rgb(29,155,240)] placeholder-neutral-500"
            maxLength={1000}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            className="text-[rgb(29,155,240)] disabled:text-neutral-600 transition-colors p-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M2.003 21L23 12 2.003 3l-.001 7 15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams?.get("conversationId") ?? undefined;

  const selectConversation = (id: string) => {
    router.push(`/messages?conversationId=${id}`);
  };

  const clearConversation = () => {
    router.push("/messages");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white flex justify-center">
        <Sidebar />
        <main className="flex-1 max-w-[990px] border-x border-neutral-800 min-h-screen flex">
          <div className={`w-full lg:w-[350px] border-r border-neutral-800 ${conversationId ? "hidden lg:flex" : "flex"} flex-col`}>
            <ConversationList selectedId={conversationId} onSelect={selectConversation} />
          </div>

          <div className={`flex-1 flex flex-col ${conversationId ? "flex" : "hidden lg:flex"}`}>
            {conversationId ? (
              <ChatView conversationId={conversationId} onBack={clearConversation} />
            ) : (
              <div className="hidden lg:flex items-center justify-center h-full text-neutral-500">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}
