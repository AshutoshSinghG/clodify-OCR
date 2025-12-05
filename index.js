const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Tesseract = require("tesseract.js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "15mb" }));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "OCR Service is running" });
});

// OCR endpoint — Cloudify always calls POST /
app.post("/", async (req, res) => {
  try {
    const { captcha } = req.body;

    if (!captcha || typeof captcha !== "string") {
      return res.status(400).json({
        error: "Invalid request. Expected: { \"captcha\": \"base64_string\" }"
      });
    }

    // Remove prefix if present
    const base64Data = captcha.replace(/^data:image\/\w+;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");

    // OCR with Tesseract
    const result = await Tesseract.recognize(imgBuffer, "eng");
    let text = result.data.text || "";

    // ================= CLEANUP FOR CLOUDIFY =================
    text = text.toUpperCase();                // Convert to uppercase
    text = text.replace(/[^A-Z]/g, "");        // Keep only A–Z letters

    // Captchas always 4 letters — sliding window to extract most likely segment
    if (text.length > 4) {
      let best = text.slice(0, 4);
      for (let i = 0; i <= text.length - 4; i++) {
        const segment = text.slice(i, i + 4);
        if (new Set(segment).size >= new Set(best).size) {
          best = segment;
        }
      }
      text = best;
    }

    text = text.trim();

    return res.json({ solution: text });
  } catch (err) {
    console.error("OCR error:", err);
    return res.status(500).json({
      error: "Failed to process captcha",
      details: err.message || String(err)
    });
  }
});

app.listen(PORT, () => {
  console.log(`OCR Service listening on port ${PORT}`);
});
