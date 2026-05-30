"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import AuthGuard from "~/app/_components/AuthGuard";
import ShellLayout from "~/app/_components/ShellLayout";
import { api } from "~/trpc/react";
import { User, ArrowLeft, Loader2, Plus, X } from "lucide-react";

function formatTime(date: Date | string): string {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

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

function NewMessageModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = api.user.search.useQuery(
    { query: search },
    { enabled: search.length >= 2 }
  );
  const utilsN = api.useUtils();
  const createConv = api.conversation.getOrCreate.useMutation({
    onSuccess: (data) => {
      void utilsN.conversation.getConversations.invalidate();
      router.push(`/messages?conversationId=${data.id}`);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-black border border-neutral-700 rounded-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-800 transition-colors"><X size={20} className="text-neutral-500" /></button>
            <h2 className="text-lg font-bold">New message</h2>
          </div>
        </div>
        <div className="p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people"
            className="w-full bg-neutral-900 text-white rounded-full px-4 py-2.5 text-[15px] outline-none focus:ring-1 focus:ring-[rgb(29,155,240)] placeholder-neutral-500"
            autoFocus
          />
        </div>
        {search.length >= 2 && (
          <div className="max-h-60 overflow-y-auto border-t border-neutral-800">
            {isLoading && <div className="p-4 text-neutral-500 text-center"><Loader2 className="inline animate-spin" size={18} /></div>}
            {users?.map((u) => (
              <button
                key={u.id}
                onClick={() => createConv.mutate({ participantId: u.id })}
                disabled={createConv.isPending}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-900 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-neutral-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {u.image ? <img src={u.image} alt="" className="w-full h-full object-cover" width={40} height={40} /> : <User size={20} className="text-neutral-400" />}
                </div>
                <div className="text-left">
                  <p className="font-bold text-[15px]">{u.name}</p>
                  <p className="text-neutral-500 text-[13px]">@{u.username}</p>
                </div>
              </button>
            ))}
            {users?.length === 0 && <div className="p-4 text-neutral-500 text-center">No users found</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationList({ selectedId, onSelect }: { selectedId?: string; onSelect: (id: string) => void }) {
  const { data: conversations, isLoading } = api.conversation.getConversations.useQuery();
  const { data: session } = useSession();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-black z-10 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Messages</h1>
        <button onClick={() => setShowNew(true)} className="p-2 rounded-full hover:bg-neutral-900 transition-colors">
          <Plus size={20} />
        </button>
      </div>

      {showNew && <NewMessageModal onClose={() => setShowNew(false)} />}

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
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-900 transition-colors text-left border-b border-neutral-800 relative ${conv.id === selectedId ? "bg-neutral-900" : ""}`}
            >
              <div className="h-10 w-10 rounded-full bg-neutral-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {other?.image ? (
                  <img src={other.image} alt="" className="w-full h-full object-cover" width={40} height={40} />
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
                    <>{conv.lastMessage.senderId === session?.user.id && "You: "}{conv.lastMessage.content}</>
                  ) : (
                    "No messages yet"
                  )}
                </span>
              </div>
              {conv.unreadCount > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-[rgb(29,155,240)] text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChatView({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { data: messages, isLoading } = api.conversation.getMessages.useQuery(
    { conversationId },
    { refetchInterval: 2000 }
  );
  const utils = api.useUtils();
  const markAsRead = api.conversation.markAsRead.useMutation({
    onSuccess: () => { void utils.conversation.getConversations.invalidate(); },
  });
  const sendMessage = api.conversation.sendMessage.useMutation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate({ conversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || sendMessage.isPending) return;
    sendMessage.mutate(
      { conversationId, content: input.trim() },
      { onSuccess: () => { setInput(""); inputRef.current?.focus(); void utils.conversation.getConversations.invalidate(); } }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-neutral-500" size={24} /></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-black z-10 border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-neutral-900"><ArrowLeft size={20} /></button>
        <span className="font-bold text-[17px]">
          {messages && messages.length > 0 ? messages[0]?.sender.name ?? "Chat" : "Chat"}
        </span>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-4">
        {messages?.length === 0 && <div className="text-neutral-500 text-center py-8 mt-auto">Send a message to start chatting</div>}
        <div className="mt-auto space-y-2">
          {messages?.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-[15px] leading-normal whitespace-pre-wrap break-words ${msg.isOwn ? "bg-[rgb(29,155,240)] text-white rounded-br-md" : "bg-neutral-800 text-white rounded-bl-md"}`}>
                <div className="flex items-end gap-1">
                  <span className="flex-1">{msg.content}</span>
                  <span className={`text-[11px] whitespace-nowrap flex-shrink-0 ${msg.isOwn ? "text-blue-200" : "text-neutral-400"}`}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

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
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M2.003 21L23 12 2.003 3l-.001 7 15 2-15 2z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = api.useUtils();
  const conversationId = searchParams?.get("conversationId") ?? undefined;
  const markAsRead = api.conversation.markAsRead.useMutation({
    onSuccess: () => { void utils.conversation.getConversations.invalidate(); },
  });

  const selectConversation = (id: string) => {
    markAsRead.mutate({ conversationId: id });
    router.push(`/messages?conversationId=${id}`);
  };
  const clearConversation = () => router.push("/messages");

  return (
    <AuthGuard>
      <ShellLayout wide hideRightSidebar>
        <div className="flex min-h-screen">
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
        </div>
      </ShellLayout>
    </AuthGuard>
  );
}

export default function MessagesPage() {
  return <Suspense><MessagesContent /></Suspense>;
}
