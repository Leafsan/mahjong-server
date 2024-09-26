import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // 게임 시작 후 라우팅을 위해 추가

const positionsList = ["동", "남", "서", "북"];

function Room({ socket }) {
  const [positions, setPositions] = useState({
    동: "",
    남: "",
    서: "",
    북: "",
  }); // 플레이어 이름을 입력할 상태
  const [initPoints, setInitPoints] = useState(25000); // 시작 점수
  const [gameStarted, setGameStarted] = useState(false); // 게임 시작 여부
  const [players, setPlayers] = useState([]); // 플레이어 정보
  const navigate = useNavigate(); // 게임 시작 시 GameScreen으로 이동하기 위해 사용

  useEffect(() => {
    socket.on("gameState", (data) => {
      setGameStarted(data.started);
      if (data.players) {
        setPlayers(data.players); // 서버에서 받은 플레이어 정보
      }
    });

    return () => {
      socket.off("gameState"); // cleanup
    };
  }, [socket]);

  const handleNameChange = (position, name) => {
    setPositions((prevPositions) => ({
      ...prevPositions,
      [position]: name,
    }));
  };

  const startGame = () => {
    // 플레이어 데이터를 생성
    const playerData = positionsList.map((position, index) => ({
      position: index,
      name: positions[position],
      points: initPoints,
      reached: false,
    }));

    console.log("Sending player data:", playerData); // 전송 전 데이터 확인

    // 서버에 플레이어 정보를 보내고 게임 시작 신호 전송
    socket.emit("addPlayer", playerData);
    socket.emit("startGame");
  };

  return gameStarted ? (
    navigate("/game") // 게임 시작 시 GameScreen으로 이동
  ) : (
    <div style={{ padding: "20px" }}>
      <h1>Room</h1>
      <h2>Enter player names:</h2>
      <ul>
        {positionsList.map((position) => (
          <li key={position}>
            <label>
              {position}:{" "}
              <input
                type="text"
                value={positions[position]}
                onChange={(e) => handleNameChange(position, e.target.value)}
              />
            </label>
          </li>
        ))}
      </ul>
      <div>
        <label>
          시작 점수 :
          <input
            type="text"
            value={initPoints}
            onChange={(e) => setInitPoints(e.target.value)}
          />
        </label>
      </div>

      <button onClick={startGame}>Start Game</button>

      {/* 여기에 Socket 상태를 표시 */}
      <div>
        <h3>게임 상태 확인:</h3>
        <p>게임 시작 여부: {gameStarted ? "True" : "False"}</p>
        <p>플레이어 수: {players.length}</p>
      </div>
    </div>
  );
}

export default Room;
