const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const cheerio = require('cheerio');
const { DateTime } = require('luxon');
// Use California time (America/Los_Angeles), subtract 2 minutes
const receivedTime = DateTime.now()
  .setZone('America/Los_Angeles')
  .minus({ minutes: 2 });

const clockDate = receivedTime.toFormat('yyyy-MM-dd');      // e.g. 2025-04-11
const clockTime = receivedTime.toFormat('HH:mm:ss');        // e.g. 13:28:00



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/email', (req, res) => {
  console.log('📩 Email received!');
  console.log('From:', req.body.from);
  console.log('Subject:', req.body.subject);
  console.log('Body:', req.body['body-plain']);
  res.status(200).send('Email received successfully!');
});

app.get('/', (req, res) => {
  res.send('✅ Clock-in backend is live!');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
