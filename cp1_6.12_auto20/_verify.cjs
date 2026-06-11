const fs = require("fs");
const content = fs.readFileSync("src/server/quizData.ts", "utf8");
const matches = content.match(/id:\s*"q\d+"/g);
console.log("Total questions:", matches ? matches.length : 0);

const easyMatch = content.match(/difficulty: "easy"/g);
const mediumMatch = content.match(/difficulty: "medium"/g);
const hardMatch = content.match(/difficulty: "hard"/g);
console.log("Easy:", easyMatch ? easyMatch.length : 0);
console.log("Medium:", mediumMatch ? mediumMatch.length : 0);
console.log("Hard:", hardMatch ? hardMatch.length : 0);

const lastQ = matches ? matches[matches.length - 1] : "none";
console.log("Last question:", lastQ);
