// index.js or routes/telegram.js
app.post('/telegram-webhook', async (req, res) => {
  try {
    const message = req.body.message?.text || '';
    const chatId = req.body.message?.chat.id;

    if (message && chatId) {
      console.log(`Received from ${chatId}: ${message}`);
      // Save to database or parse "Clock in / out" here
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    res.sendStatus(500);
  }
});
