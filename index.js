const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());

let gameStarted = false;
let players = [];
let extend = 0;
let pot = 0;
let currentRound = 0;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("Hello from server");
});

io.on("connection", (socket) => {
  console.log("New client connected");

  // 새 클라이언트에 현재 게임 상태 전송
  socket.emit("gameState", {
    started: gameStarted,
    players,
    extend,
    currentRound,
    pot,
  });

  // 클라이언트가 게임 상태를 요청했을 때
  socket.on("requestGameState", () => {
    console.log("Game state requested by client");
    socket.emit("gameState", { players, pot, extend, currentRound }); // 게임 상태 전송
  });

  // 클라이언트로부터 플레이어 업데이트 수신
  socket.on("updateGameState", (data) => {
    console.log("Received: ", data);
    if (data.players) players = data.players;
    if (data.extend !== undefined) extend = data.extend;
    if (data.currentRound !== undefined) currentRound = data.currentRound;
    if (data.pot !== undefined) pot = data.pot;

    // 모든 클라이언트에게 업데이트된 게임 상태 전송
    io.emit("gameState", { players, extend, currentRound, pot });
  });

  // 클라이언트가 플레이어 데이터를 전송할 때 처리
  socket.on("addPlayer", (playerData) => {
    console.log("Received player data:", playerData); // 서버에서 데이터 수신 확인
    players = playerData; // 받은 플레이어 데이터를 저장
    io.emit("gameState", { started: gameStarted, players }); // 모든 클라이언트에 업데이트된 상태 전송
  });

  socket.on("startGame", () => {
    gameStarted = true;
    io.emit("gameState", { started: gameStarted, players });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(3200, () => {
  console.log("Server running on port 3200");
});
