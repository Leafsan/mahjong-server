import { io } from "socket.io-client";

const socket = io("http://localhost:3200", {
  transports: ["websocket", "polling"],
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});

socket.on("welcome", (message) => {
  console.log(message); // 이 메시지가 콘솔에 출력되어야 합니다
});

socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket server");
});

export default socket;
