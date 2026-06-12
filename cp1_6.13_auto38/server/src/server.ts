import express from "express";
import cors from "cors";
import Datastore from "nedb-promises";
import path from "path";
import { layersData } from "./layersData.js";
import { fossilsData } from "./fossilsData.js";

const app = express();

const layersDB = Datastore.create({ filename: "data/layers.db", autoload: true });
const fossilsDB = Datastore.create({ filename: "data/fossils.db", autoload: true });

async function initData() {
  await layersDB.remove({}, { multi: true });
  await fossilsDB.remove({}, { multi: true });
  await layersDB.insert(layersData);
  await fossilsDB.insert(fossilsData);
}

app.use(cors());
app.use(express.json());

app.get("/api/layers", async (req, res) => {
  const layers = await layersDB.find({}).sort({ order: 1 });
  res.json(layers);
});

app.get("/api/layers/:id/fossils", async (req, res) => {
  const layer = await layersDB.findOne({ _id: req.params.id });
  if (!layer) {
    return res.status(404).json({ error: "Layer not found" });
  }
  const fossils = await fossilsDB.find({ _id: { $in: layer.fossilIds } });
  res.json(fossils);
});

initData().then(() => {
  app.listen(3001, () => {
    console.log("Server running on port 3001");
  });
});
