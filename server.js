import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ========== CONFIG ==========
const GITHUB_USER = "hhkiguuu";          // Your GitHub username
const REPO = "cwuv-private";            // Your private Lua repo
const FILE_PATH = "source.lua";         // File inside repo
const GITHUB_TOKEN = "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"; // Server-side only

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1469727812284842159/wBC9pTZcTKczrCmyWQmpFU-_LAfAlTts4lJHaPcoIlMUkIDATta6s9PsvadZ2ICTj1JL"; // Server-side logging
const VALID_KEYS = ["CWUV-KEY-1"];      // Loader keys
const SECRET = "CWUV_SECRET_123";       // Encryption secret (matches loader)
// ============================

// XOR + base64 encryption
function encrypt(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(
      text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length)
    );
  }
  return Buffer.from(out).toString("base64");
}

app.post("/load", async (req, res) => {
  const { key, hwid } = req.body;

  if (!VALID_KEYS.includes(key)) {
    return res.status(403).send("Denied");
  }

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

    // Discord logging
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

app.listen(3000, () => {
  console.log("CWUV Proxy running (private repo + encrypted)");
});
