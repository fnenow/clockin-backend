# ⏰ Clockin Backend

This is a Node.js backend server for managing timecard data via email-based clock-in/clock-out using SMS forwarded by NumberBarn. The system parses emails, stores the data in a PostgreSQL database (hosted on Railway), and provides a basic API for logging and status.

## 🚀 Features

- Parses incoming SMS emails from NumberBarn
- Extracts worker phone number, clock in/out action, project, and optional notes
- Stores time entries in a PostgreSQL database with both UTC and PST timestamps
- Automatically adjusts time based on clock in/out
- REST endpoint to confirm backend is live

## 🛠 Technologies Used

- Node.js
- Express
- PostgreSQL (via Railway)
- Luxon (for date/time management)
- Cheerio (for HTML email parsing)

## 📥 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/clockin-backend.git
   cd clockin-backend
