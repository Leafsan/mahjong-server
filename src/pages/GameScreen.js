import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function GameScreen({ socket }) {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false); // 게임 시작 여부
  const [players, setPlayers] = useState([]); // 초기 상태를 빈 배열로 설정
  const [pot, setPot] = useState(0);
  const [extend, setExtend] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [winPlayer, setWinPlayer] = useState("");
  const [ronTarget, setRonTarget] = useState("");
  const [tsumoOpen, setTsumoOpen] = useState(false);
  const [ronOpen, setRonOpen] = useState(false);
  const [han, setHan] = useState(1);
  const [fu, setFu] = useState(30);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawPlayers, setDrawPlayers] = useState([]);
  const [chonboOpen, setChonboOpen] = useState(false);
  const [chonboPlayer, setChonboPlayer] = useState("");

  const hanValue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const fuValue = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
  const winds = ["동", "남", "서", "북"];

  // 서버로부터 업데이트된 게임 상태를 받아서 처리
  useEffect(() => {
    // 서버에서 게임 상태를 수신할 때
    socket.on("gameState", (data) => {
      setGameStarted(data.started);
      console.log("Received gameState:", data);
      if (data.players) setPlayers(data.players);
      if (data.extend !== undefined) setExtend(data.extend);
      if (data.currentRound !== undefined) setCurrentRound(data.currentRound);
      if (data.pot !== undefined) setPot(data.pot);
    });

    return () => {
      socket.off("gameState"); // cleanup
    };
  }, [socket]);

  // 상태가 업데이트된 후에 emit을 보장하는 함수
  const emitGameState = (
    updatedPlayers,
    updatedPot,
    updatedExtend,
    updatedRound
  ) => {
    // 서버로 새로운 상태를 전송
    socket.emit("updateGameState", {
      players: updatedPlayers || players,
      pot: updatedPot !== undefined ? updatedPot : pot,
      extend: updatedExtend !== undefined ? updatedExtend : extend,
      currentRound: updatedRound !== undefined ? updatedRound : currentRound,
    });
  };

  // 리치 상태 업데이트
  const handleReach = (player) => {
    const updatedPlayers = players.map((p) => {
      if (p.position === player.position) {
        p.reached = !p.reached;
        p.points += p.reached ? -1000 : 1000; // 리치 점수 반영
        setPot((prevPot) => {
          const newPot = p.reached ? prevPot + 1000 : prevPot - 1000;
          emitGameState(updatedPlayers, newPot, undefined, undefined); // 상태 업데이트 후 전송
          return newPot;
        });
      }
      return p;
    });
  };

  const handleTsumo = (player) => {
    setWinPlayer(player.position);
    setTsumoOpen(true);
  };

  const handleRon = (player) => {
    setRonTarget("");
    setWinPlayer(player.position);
    setRonOpen(true);
  };

  const calculateChonboScore = () => {
    setPlayers((prevPlayers) => {
      const updatedPlayers = [...prevPlayers];

      updatedPlayers[chonboPlayer].points -= 9000;

      updatedPlayers
        .filter((p) => p.position.toString() !== chonboPlayer)
        .forEach((player) => {
          player.points += 3000;
        });
      updatedPlayers.forEach((p) => (p.reached = false));
      setChonboOpen(false);
      setChonboPlayer(null);
      emitGameState(updatedPlayers, undefined, undefined, undefined);
      return updatedPlayers;
    });
  };

  // 연장 상태 변경
  const handleExtendAdd = () => {
    setExtend((prevExtend) => {
      const newExtend = prevExtend + 1;
      emitGameState(players, pot, newExtend, undefined); // 연장 상태를 서버로 전송
      return newExtend;
    });
  };

  const handleDrawPlayerSelection = (player) => {
    setDrawPlayers((prev) =>
      prev.includes(player.position)
        ? prev.filter((p) => p !== player.position)
        : [...prev, player.position]
    );
  };

  const calculateDrawScore = () => {
    setPlayers((prevPlayers) => {
      const updatedPlayers = [...prevPlayers];
      const drawCount = drawPlayers.length;

      // 현재 라운드에서 동풍 자리에 있는 플레이어 확인
      const eastPlayerIndex = updatedPlayers.findIndex(
        (player) => player.position === currentRound % 4
      );
      const eastPlayerInDraw = drawPlayers.includes(
        updatedPlayers[eastPlayerIndex].position
      );

      if (drawCount === 1) {
        drawPlayers.forEach((position) => {
          const playerIndex = updatedPlayers.findIndex(
            (player) => player.position === position
          );
          updatedPlayers[playerIndex].points += 3000;
        });
        updatedPlayers
          .filter((player) => !drawPlayers.includes(player.position))
          .forEach((player) => (player.points -= 1000));
      } else if (drawCount === 2) {
        drawPlayers.forEach((position) => {
          const playerIndex = updatedPlayers.findIndex(
            (player) => player.position === position
          );
          updatedPlayers[playerIndex].points += 1500;
        });
        updatedPlayers
          .filter((player) => !drawPlayers.includes(player.position))
          .forEach((player) => (player.points -= 1500));
      } else if (drawCount === 3) {
        drawPlayers.forEach((position) => {
          const playerIndex = updatedPlayers.findIndex(
            (player) => player.position === position
          );
          updatedPlayers[playerIndex].points += 1000;
        });
        updatedPlayers
          .filter((player) => !drawPlayers.includes(player.position))
          .forEach((player) => (player.points -= 3000));
      }

      let newRound = currentRound;
      const newExtend = extend + 1;
      // 동풍 자리에 있는 플레이어가 텐파이를 하지 않았다면 다음 국으로 진행
      if (!eastPlayerInDraw) {
        newRound++;
        setCurrentRound(newRound);
      }

      updatedPlayers.forEach((p) => (p.reached = false));
      setExtend(newExtend); // 연장 증가
      setDrawOpen(false);
      setDrawPlayers([]);
      emitGameState(updatedPlayers, pot, newExtend, newRound);

      return updatedPlayers;
    });
  };

  // Tsumo 점수 계산 함수
  const calculateTsumoScore = () => {
    const basePoints = calculateBaseScore(); // 기본 점수를 계산

    setPlayers((prevPlayers) => {
      const updatedPlayers = [...prevPlayers];
      let updatedExtend = extend;
      let updatedRound = currentRound;

      // 승리한 플레이어가 동 위치일 경우
      if (currentRound % 4 === updatedPlayers[winPlayer].position) {
        const tsumoPoints = Math.ceil((basePoints * 2) / 100) * 100;
        updatedPlayers
          .filter((_, index) => index !== winPlayer) // 승리한 플레이어가 아닌 다른 플레이어
          .forEach((player) => {
            player.points -= tsumoPoints + extend * 100; // 각 플레이어의 점수에서 해당 포인트 차감
          });
        updatedPlayers[winPlayer].points +=
          3 * tsumoPoints + pot + extend * 300; // 승리한 플레이어는 점수 추가
        updatedExtend++;
        setExtend(updatedExtend); // 동 위치일 때 연장 1 증가
      } else {
        // 승리한 플레이어가 동 위치가 아닌 경우
        const tsumoPoints = basePoints;
        updatedPlayers
          .filter((_, index) => index !== winPlayer)
          .forEach((player) => {
            if (player.position === currentRound % 4) {
              player.points -= Math.ceil((tsumoPoints * 2) / 100) * 100; // 해당 라운드의 위치에 따른 점수 차감
            } else {
              player.points -= Math.ceil(tsumoPoints / 100) * 100;
            }
            player.points -= extend * 100;
          });
        updatedPlayers[winPlayer].points +=
          4 * tsumoPoints + pot + extend * 300; // 승리한 플레이어는 점수 추가
        updatedRound++;
        setCurrentRound(updatedRound);
        updatedExtend = 0;
        setExtend(updatedExtend); // 동 위치가 아니므로 연장 초기화
      }
      updatedPlayers.forEach((p) => (p.reached = false));
      setPot(0); // 공탁금 초기화
      setTsumoOpen(false); // 쯔모 창 닫기
      emitGameState(updatedPlayers, 0, updatedExtend, updatedRound);

      return updatedPlayers;
    });
  };

  // Ron 점수 계산 함수
  const calculateRonScore = () => {
    if (!ronTarget) {
      alert("론할 대상을 선택해주세요.");
      return;
    }

    const basePoints = calculateBaseScore(); // 기본 점수 계산
    let updatedExtend = extend;
    let updatedRound = currentRound;

    setPlayers((prevPlayers) => {
      const updatedPlayers = [...prevPlayers];
      const ronPoints =
        Math.ceil(
          (basePoints *
            (updatedPlayers[winPlayer].position === currentRound % 4 ? 6 : 4)) /
            100
        ) *
          100 +
        extend * 300;

      updatedPlayers[ronTarget].points -= ronPoints; // 론 대상 플레이어 점수 차감
      updatedPlayers[winPlayer].points += ronPoints + pot; // 승리한 플레이어 점수 추가

      // 승리한 플레이어가 동 위치일 경우
      if (updatedPlayers[winPlayer].position === currentRound % 4) {
        updatedExtend++;
        setExtend(updatedExtend); // 연장 1 증가
      } else {
        updatedRound++;
        setCurrentRound(updatedRound);
        updatedExtend = 0;
        setExtend(updatedExtend); // 동 위치가 아니므로 연장 초기화
      }
      setPot(0); // 공탁금 초기화
      updatedPlayers.forEach((p) => (p.reached = false));
      setRonOpen(false); // 론 창 닫기
      setRonTarget(null); // 론 대상 초기화

      emitGameState(updatedPlayers, 0, updatedExtend, updatedRound);
      return updatedPlayers;
    });
  };

  const calculateBaseScore = () => {
    if (han >= 13) return 8000;
    if (han >= 11) return 6000;
    if (han >= 8) return 4000;
    if (han >= 6) return 3000;
    if (han == 5 || (han == 4 && fu >= 40) || (han == 3 && fu >= 70))
      return 2000;
    if (han == 1 && fu == 20) return 2 ** 3 * 30;
    return 2 ** (han + 2) * fu;
  };

  const checkRoundName = () => {
    return `${winds[Math.floor(currentRound / 4) % 4]}${
      (currentRound % 4) + 1
    }국`;
  };

  const checkPlayerWind = (playerPosition) => {
    return `${winds[(playerPosition + 4 - (currentRound % 4)) % 4]}`;
  };

  console.log("current players: ", players);

  if (!Array.isArray(players) || players.length === 0) {
    // 처음 로딩할 때 서버에 게임 상태 요청
    socket.emit("requestGameState");
    return (
      <div>
        <h1>데이터 받기 오류 혹은 활성화 게임 없음</h1>
        <button onClick={() => navigate("/")}>홈으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>현재 라운드: {checkRoundName()}</h1>
      <h2>공탁금: {pot}</h2>
      <h2>연장: {extend}</h2>

      <ul>
        {players.map((player) => (
          <li key={player.position}>
            {player.name} ({checkPlayerWind(player.position)}) - {player.points}{" "}
            점{player.reached && <strong> [리치 선언]</strong>}
            <button onClick={() => handleReach(player)}>리치</button>
            <button onClick={() => handleRon(player)}>론</button>
            <button onClick={() => handleTsumo(player)}>쯔모</button>
          </li>
        ))}
      </ul>

      {ronOpen && (
        <div style={{ marginTop: "20px" }}>
          <h3>론 점수 계산</h3>
          <label>론할 대상 선택:</label>
          {players
            .filter((player) => player.position !== winPlayer)
            .map((player) => (
              <div key={player.position}>
                <input
                  type="radio"
                  name="player"
                  value={player.position}
                  onChange={(e) => setRonTarget(e.target.value)}
                />
                <label>{player.name}</label>
              </div>
            ))}

          <div>
            <label>판수:</label>
            <select
              value={han}
              onChange={(e) => setHan(Number(e.target.value))}
            >
              {hanValue.map((value) => (
                <option key={value} value={value}>
                  {value} 판
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>부수:</label>
            <select value={fu} onChange={(e) => setFu(Number(e.target.value))}>
              {fuValue.map((value) => (
                <option key={value} value={value}>
                  {value} 부
                </option>
              ))}
            </select>
          </div>
          <button onClick={calculateRonScore}>점수 계산</button>
        </div>
      )}

      {tsumoOpen && (
        <div style={{ marginTop: "20px" }}>
          <h3>쯔모 점수 계산</h3>
          <div>
            <label>판수:</label>
            <select
              value={han}
              onChange={(e) => setHan(Number(e.target.value))}
            >
              {hanValue.map((value) => (
                <option key={value} value={value}>
                  {value} 판
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>부수:</label>
            <select value={fu} onChange={(e) => setFu(Number(e.target.value))}>
              {fuValue.map((value) => (
                <option key={value} value={value}>
                  {value} 부
                </option>
              ))}
            </select>
          </div>
          <button onClick={calculateTsumoScore}>점수 계산</button>
        </div>
      )}

      {drawOpen && (
        <div style={{ marginTop: "20px" }}>
          <h3>유국 점수 배분</h3>
          <h4>텐파이 한 사람들을 고르세요.</h4>
          {players.map((player) => (
            <div key={player.position}>
              <input
                type="checkbox"
                checked={drawPlayers.includes(player.position)}
                onChange={() => handleDrawPlayerSelection(player)}
              />
              <label>{player.name}</label>
            </div>
          ))}
          <button onClick={calculateDrawScore}>점수 배분</button>
        </div>
      )}

      {chonboOpen && (
        <div style={{ marginTop: "20px" }}>
          <h3>촌보 대상 선택</h3>
          <select
            value={chonboPlayer}
            onChange={(e) => setChonboPlayer(e.target.value)}
          >
            <option value="">대상 선택</option>
            {players.map((player) => (
              <option key={player.position} value={player.position}>
                {player.name}
              </option>
            ))}
          </select>
          <button onClick={calculateChonboScore}>점수 배분</button>
        </div>
      )}

      <div>
        <button onClick={() => setDrawOpen(true)}>유국</button>
        <button onClick={() => setChonboOpen(true)}>촌보</button>
        <button onClick={handleExtendAdd}>연장</button>
      </div>
    </div>
  );
}

export default GameScreen;
