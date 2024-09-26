import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import io from "socket.io-client";
import Room from "./pages/Room";
import GameScreen from "./pages/GameScreen";

function App() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // 소켓 연결
    const newSocket = io("http://localhost:3200", {
      transports: ["websocket"],
    });
    setSocket(newSocket);

    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      newSocket.disconnect();
    };
  }, []);

  if (!socket) {
    return <div>Loading...</div>; // 소켓 연결 전 로딩 표시
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Room socket={socket} />} />
        <Route path="/game" element={<GameScreen socket={socket} />} />
      </Routes>
    </Router>
  );
}

export default App;
