import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

// ===== CONFIG =====
const GITHUB_USER = "hhkiguuu";
const REPO = "cwuv-private";
const FILE_PATH = "source.lua";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // server env
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK; // server env
const SECRET = "CWUV_SECRET_123";
const VALID_KEYS = ["CWUV-KEY-1"];
const KILL_SWITCH_FILE = "./killflag.json"; // store kill switch flag

// ===== Helpers =====
function encrypt(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(
      text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length)
    );
  }
  return Buffer.from(out).toString("base64");
}

// Initialize kill flag if not exist
if (!fs.existsSync(KILL_SWITCH_FILE)) {
  fs.writeFileSync(KILL_SWITCH_FILE, JSON.stringify({ active: false }));
}

// ===== Routes =====

// Loader requests code
app.post("/load", async (req, res) => {
  const { key, hwid } = req.body;

  if (!VALID_KEYS.includes(key)) return res.status(403).send("Denied");

  // Check kill switch
  const killData = JSON.parse(fs.readFileSync(KILL_SWITCH_FILE, "utf8"));
  if (killData.active) return res.send("KILL");

  try {
    // Fetch private Lua source from GitHub
    const ghRes = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3.raw"
        }
      }
    );
    if (!ghRes.ok) return res.status(500).send("Failed to fetch source");

    const code = await ghRes.text();
    const encrypted = encrypt(code);

    // Discord log
    fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "CWUV Logger",
        embeds: [{
          title: "CWUV HUB EXECUTED",
          color: 0x2ecc71,
          fields: [
            { name: "Key", value: key, inline: true },
            { name: "HWID", value: hwid || "N/A", inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    }).catch(() => {});

    res.send(encrypted);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Bot endpoint to toggle kill switch
app.post("/kill", (req, res) => {
  const { action, secret } = req.body;

  if (secret !== SECRET) return res.status(403).send("Forbidden");
  const active = action === "on";
  fs.writeFileSync(KILL_SWITCH_FILE, JSON.stringify({ active }));
  res.send({ status: active ? "KILL ACTIVE" : "KILL OFF" });
});

app.listen(3000, () => {
  console.log("CWUV Proxy running with Kill Switch");
});
