import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { jwtVerify } from "jose";
import { db } from "./db.js";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// JWT 検証ミドルウェア
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    return next(new Error("Unauthorized"));
  }
  try {
    const { payload } = await jwtVerify(token, secret);
    socket.data.userId = payload.userId as string;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket: Socket) => {
  console.log(`User connected: ${socket.id} (userId: ${socket.data.userId})`);

  socket.on("join_room", (roomId: string) => {
    socket.join(roomId);
    console.log(`Joined room: ${roomId}`);
  });

  socket.on(
    "send_message",
    async (data: { roomId: string; text: string }) => {
      try {
        const message = await db.message.create({
          data: {
            content: data.text,
            channelId: data.roomId,
            userId: socket.data.userId,
          },
          include: { user: true },
        });
        io.to(data.roomId).emit("receive_message", message);
      } catch (error) {
        console.error("DB Error:", error);
        socket.emit("error", { message: "メッセージの保存に失敗しました" });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = Number(process.env.SOCKET_PORT) || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`);
});
