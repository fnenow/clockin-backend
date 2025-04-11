const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

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
