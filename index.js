const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Tesseract = require("tesseract.js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "15mb" })); // large base64 support

// Health check (Cloudify calls GET / before testing)
app.get("/", (req, res) => {
  res.json({ message: "OCR Service is running" });
});

// OCR endpoint (Cloudify sends POST /, not /ocr)
app.post("/", async (req, res) => {
  try {
    const { captcha } = req.body;

    if (!captcha || typeof captcha !== "string") {
      return res.status(400).json({
        error: "Invalid request. Expected: { \"captcha\": \"base64_string\" }"
      });
    }

    // Remove "data:image/...;base64," prefix if present
    const base64Data = captcha.replace(/^data:image\/\w+;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");

    // Run OCR using Tesseract
    const result = await Tesseract.recognize(imgBuffer, "eng");

    // Raw OCR text
    let text = result.data.text || "";

    // === Required cleanup for Cloudify evaluator ===
    text = text.toUpperCase();        // convert to uppercase
    text = text.replace(/[^A-Z]/g, ""); // keep only A–Z letters
    text = text.slice(0, 6);          // captchas are always 4–6 chars
    text = text.trim();               // final trim

    return res.json({ solution: text });
  } catch (err) {
    console.error("OCR Error:", err);
    return res.status(500).json({
      error: "Failed to process captcha",
      details: err.message || String(err)
    });
  }
});

// start server
app.listen(PORT, () => {
  console.log(`OCR Service listening on port ${PORT}`);
});
