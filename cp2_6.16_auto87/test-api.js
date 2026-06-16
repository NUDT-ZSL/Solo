import http from "http";

const post = (path, data) => {
  return new Promise((resolve, reject) => {
    const jsonData = JSON.stringify(data);
    const options = {
      hostname: "localhost",
      port: 4000,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(jsonData),
      },
    };
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(JSON.parse(body)));
    });
    req.on("error", reject);
    req.write(jsonData);
    req.end();
  });
};

const get = (path) => {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:4000${path}`, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(JSON.parse(body)));
      })
      .on("error", reject);
  });
};

const runTest = async () => {
  console.log("=== API Test Start ===\n");

  console.log("1. Create User 1...");
  const user1 = await post("/api/users", { name: "Player1" });
  console.log(`   User1: ${user1.name} (${user1.id}), Color: ${user1.color}\n`);

  console.log("2. Create User 2...");
  const user2 = await post("/api/users", { name: "Player2" });
  console.log(`   User2: ${user2.name} (${user2.id}), Color: ${user2.color}\n`);

  console.log("3. Get User 1 info...");
  const user1Info = await get(`/api/users/${user1.id}`);
  console.log(`   Vocabulary: ${user1Info.vocabulary}, TotalGames: ${user1Info.totalGames}\n`);

  console.log("4. Create Room...");
  const room = await post("/api/rooms", {
    name: "Test Room",
    rounds: 5,
    difficulty: "easy",
    creatorId: user1.id,
  });
  console.log(`   Room: ${room.name} (${room.id}), Status: ${room.status}\n`);

  console.log("5. Get waiting rooms...");
  const waitingRooms = await get("/api/rooms");
  console.log(`   Waiting rooms count: ${waitingRooms.length}\n`);

  console.log("6. User2 join room...");
  const roomAfterJoin = await post(`/api/rooms/${room.id}/join`, {
    userId: user2.id,
  });
  console.log(`   Players count: ${roomAfterJoin.players.length}\n`);

  console.log("7. Start game...");
  const roomAfterStart = await post(`/api/rooms/${room.id}/start`, {});
  console.log(
    `   Status: ${roomAfterStart.status}, Round: ${roomAfterStart.currentRound}`
  );
  console.log(
    `   Question: ${roomAfterStart.currentQuestion.question} -> ${roomAfterStart.currentQuestion.correctAnswer} (${roomAfterStart.currentQuestion.type})\n`
  );

  console.log("8. Submit answer (User1 - correct)...");
  const answer1 = await post(`/api/rooms/${room.id}/answer`, {
    userId: user1.id,
    answer: roomAfterStart.currentQuestion.correctAnswer,
  });
  console.log(
    `   Correct: ${answer1.correct}, Score: ${answer1.score}, AllAnswered: ${answer1.allAnswered}`
  );

  console.log("9. Submit answer (User2 - wrong)...");
  const answer2 = await post(`/api/rooms/${room.id}/answer`, {
    userId: user2.id,
    answer: "wrong_answer",
  });
  console.log(
    `   Correct: ${answer2.correct}, Score: ${answer2.score}, AllAnswered: ${answer2.allAnswered}\n`
  );

  console.log("10. Next question...");
  const roomAfterNext = await post(`/api/rooms/${room.id}/next`, {});
  console.log(
    `   Round: ${roomAfterNext.currentRound}, Question: ${roomAfterNext.currentQuestion.question} -> ${roomAfterNext.currentQuestion.correctAnswer}\n`
  );

  console.log("11. Get room status...");
  const roomStatus = await get(`/api/rooms/${room.id}`);
  console.log(
    `   Status: ${roomStatus.status}, Round: ${roomStatus.currentRound}/${roomStatus.rounds}`
  );
  console.log(
    `   Player1 score: ${roomStatus.players[0].score}, Player2 score: ${roomStatus.players[1].score}\n`
  );

  console.log("=== API Test Complete ===");
};

runTest().catch(console.error);
