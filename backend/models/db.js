const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.postgresql://postgres:ePvXuTjGStlgRlpHdqnKTGgNAQTdNHei@$,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
