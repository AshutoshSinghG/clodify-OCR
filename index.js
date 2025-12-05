const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Tesseract = require("tesseract.js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" })); // base64 images can be big

// Health check
app.get("/", (req, res) => {
  res.json({ message: "OCR Service is running" });
});

app.post("/ocr", async (req, res) => {
  try {
    const { captcha } = req.body;

    if (!captcha || typeof captcha !== "string") {
      return res.status(400).json({
        error: "Invalid request. Expected body: { \"captcha\": \"base64_string\" }"
      });
    }

    // Remove data URL prefix if present
    const base64Data = captcha.replace(/^data:image\/\w+;base64,/, "");

    // Convert base64 -> Buffer
    const imgBuffer = Buffer.from(base64Data, "base64");

    // Run OCR
    const result = await Tesseract.recognize(imgBuffer, "eng");

    // Raw text
    let text = result.data.text || "";

    // Clean up: remove spaces, newlines etc. because captchas are usually continuous
    text = text.replace(/\s+/g, "").trim();

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
