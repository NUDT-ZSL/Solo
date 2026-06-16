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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runFullGameTest = async () => {
  console.log("=== Full Game Test Start ===\n");

  console.log("1. Create users...");
  const user1 = await post("/api/users", { name: "Alice" });
  const user2 = await post("/api/users", { name: "Bob" });
  console.log(`   Alice: ${user1.id}`);
  console.log(`   Bob: ${user2.id}\n`);

  console.log("2. Create and join room...");
  const room = await post("/api/rooms", {
    name: "Championship",
    rounds: 5,
    difficulty: "easy",
    creatorId: user1.id,
  });
  await post(`/api/rooms/${room.id}/join`, { userId: user2.id });
  console.log(`   Room: ${room.id}\n`);

  console.log("3. Start game...");
  let gameRoom = await post(`/api/rooms/${room.id}/start`, {});
  console.log(`   Game started! ${gameRoom.rounds} rounds\n`);

  for (let round = 1; round <= gameRoom.rounds; round++) {
    console.log(`--- Round ${round} ---`);
    const question = gameRoom.currentQuestion;
    console.log(`   Q: ${question.question} (${question.type})`);
    console.log(`   A: ${question.correctAnswer}`);

    const answer1 = await post(`/api/rooms/${room.id}/answer`, {
      userId: user1.id,
      answer: question.correctAnswer,
    });
    console.log(`   Alice: ${answer1.correct ? "✅" : "❌"} Score: ${answer1.score}`);

    const answer2 = await post(`/api/rooms/${room.id}/answer`, {
      userId: user2.id,
      answer: round % 2 === 0 ? question.correctAnswer : "wrong",
    });
    console.log(`   Bob:   ${answer2.correct ? "✅" : "❌"} Score: ${answer2.score}`);

    if (round < gameRoom.rounds) {
      gameRoom = await post(`/api/rooms/${room.id}/next`, {});
      console.log();
    }
  }

  console.log("\n4. Game finished! Checking final status...");
  await sleep(500);
  const finalRoom = await get(`/api/rooms/${room.id}`);
  console.log(`   Status: ${finalRoom.status}`);
  console.log(`   Alice score: ${finalRoom.players[0].score}`);
  console.log(`   Bob score: ${finalRoom.players[1].score}\n`);

  console.log("5. Checking user stats update...");
  const aliceUpdated = await get(`/api/users/${user1.id}`);
  const bobUpdated = await get(`/api/users/${user2.id}`);
  console.log(`   Alice - Games: ${aliceUpdated.totalGames}, Wins: ${aliceUpdated.wins}, Vocab: ${aliceUpdated.vocabulary}`);
  console.log(`   Bob   - Games: ${bobUpdated.totalGames}, Wins: ${bobUpdated.wins}, Vocab: ${bobUpdated.vocabulary}\n`);

  console.log("6. Checking battle records...");
  const records = await get("/api/records");
  console.log(`   Total records: ${records.length}`);
  if (records.length > 0) {
    const latest = records[records.length - 1];
    console.log(`   Latest: ${latest.roomName}, Winners: ${latest.winners.length}`);
  }

  console.log("\n=== Full Game Test Complete ===");
};

runFullGameTest().catch(console.error);
