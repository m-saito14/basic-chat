"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

type User = { userId: string; name: string; email: string; token: string };
type Channel = { id: string; name: string };
type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
};

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 初期化: /api/me でセッション取得 → Socket.io 接続
  useEffect(() => {
    let socketInstance: Socket | null = null;
    let isActive = true;

    fetch("/api/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json() as Promise<User>;
      })
      .then((data) => {
        if (!data || !isActive) return;
        setUser(data);

        const socket = io(
          process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001",
          { auth: { token: data.token } }
        );
        socketInstance = socket;
        socketRef.current = socket;

        socket.on("receive_message", (message: Message) => {
          setMessages((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message]
          );
        });

        socket.on("connect_error", (err) => {
          console.error("Socket error:", err.message);
        });

        // チャンネル一覧取得
        fetch("/api/channels")
          .then((r) => r.json())
          .then((list: Channel[]) => {
            if (!isActive) return;
            setChannels(list);
            if (list.length > 0) selectChannel(list[0], socket);
          });
      });

    return () => {
      isActive = false;
      socketInstance?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // メッセージ末尾にスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectChannel(channel: Channel, socket?: Socket) {
    const s = socket ?? socketRef.current;
    setActiveChannel(channel);
    setMessages([]);

    fetch(`/api/messages?channelId=${channel.id}`)
      .then((r) => r.json())
      .then((list: Message[]) => setMessages(list));

    s?.emit("join_room", channel.id);
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activeChannel || !socketRef.current) return;
    socketRef.current.emit("send_message", {
      roomId: activeChannel.id,
      text: text.trim(),
    });
    setText("");
  }

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChannelName.trim() }),
    });

    if (res.ok) {
      const channel: Channel = await res.json();
      setChannels((prev) => [...prev, channel]);
      setNewChannelName("");
      setShowNewChannel(false);
      selectChannel(channel);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-zinc-700 bg-zinc-800">
        <div className="flex items-center gap-2 border-b border-zinc-700 px-4 py-3">
          <span className="font-bold text-white">my-slack</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              チャンネル
            </span>
            <button
              onClick={() => setShowNewChannel((v) => !v)}
              className="rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              title="チャンネルを追加"
            >
              +
            </button>
          </div>

          {showNewChannel && (
            <form onSubmit={createChannel} className="mb-2 px-2">
              <input
                autoFocus
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="チャンネル名"
                className="w-full rounded bg-zinc-700 px-2 py-1 text-sm text-white outline-none"
              />
            </form>
          )}

          <ul className="flex flex-col gap-0.5">
            {channels.map((ch) => (
              <li key={ch.id}>
                <button
                  onClick={() => selectChannel(ch)}
                  className={`w-full rounded px-2 py-1 text-left text-sm transition ${
                    activeChannel?.id === ch.id
                      ? "bg-zinc-600 text-white"
                      : "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  # {ch.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-zinc-700 px-4 py-3">
          <p className="mb-1 text-sm font-medium text-white">{user.name}</p>
          <p className="mb-2 text-xs text-zinc-400">{user.email}</p>
          <button
            onClick={logout}
            className="w-full rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-600 hover:text-white"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* Message Area */}
      <main className="flex flex-1 flex-col">
        {activeChannel ? (
          <>
            <header className="border-b border-zinc-700 px-6 py-3 font-semibold">
              # {activeChannel.name}
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-zinc-100">
                      {msg.user.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(msg.createdAt).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-300">{msg.content}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={sendMessage}
              className="border-t border-zinc-700 px-6 py-4"
            >
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`# ${activeChannel.name} にメッセージを送信`}
                  className="flex-1 rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-zinc-500"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-500 disabled:opacity-40"
                >
                  送信
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-zinc-500">
            チャンネルを選択してください
          </div>
        )}
      </main>
    </div>
  );
}
