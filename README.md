# HASH LOCK

A lightweight web application built with Flask that helps you evaluate password strength, generate cryptographic file hashes, and verify file integrity — all from the browser with no dependencies on third-party services.

I built this because I wanted a single tool that covers the three things I kept doing manually — checking if a password was strong enough, getting a file's hash for sharing, and verifying downloads hadn't been tampered with. Everything runs locally, nothing leaves your machine.

---

## Features

### Password Strength Analyzer
Type a password and get instant feedback — no button click needed. The analyzer checks for minimum length, uppercase and lowercase letters, numbers, special characters, and common patterns like "password123" or "qwerty". A strength meter updates in real time and tells you exactly what's missing. There's also a built-in password generator if you just want a strong one created for you — set the length between 8 and 32 characters and it generates one guaranteed to score Strong or above.

### File Hash Generator
Drag and drop any file — document, image, executable, anything — and get its MD5, SHA-1, and SHA-256 hashes within seconds. Useful for sharing files and letting the recipient verify they got the exact same thing. Copy individual hashes or all three at once.

### File Integrity Verifier
Upload a file, paste the expected hash, choose the algorithm (MD5, SHA-1, or SHA-256), and hit verify. The result is a clear matched or mismatch verdict with both the expected and actual hash shown side by side. Handy for checking software downloads against the hash published on the official site.

### Other
- Dark and light mode with preference saved locally
- Fully responsive, works on mobile
- No database, no login, no external API calls — everything is computed on the server and returned instantly

---

## Tech Stack

| Layer | Tools |
|---|---|
| Backend | Python 3, Flask |
| Hashing | hashlib (standard library) |
| Frontend | HTML, CSS, Vanilla JavaScript |
| No framework | No Bootstrap, no jQuery |

---

## Getting Started

Clone the repo and run it locally:

```bash
git clone https://github.com/divyeshdash/hashlock
cd hashlock
pip install -r requirements.txt
python app.py
```

Open your browser at `http://localhost:5000`.

That's it — no environment variables, no database setup, no config files.

### Run with Docker

You can also run the app in a container using Docker.

```bash
docker build -t hashlock .
docker run -p 5000:5000 hashlock
```

Or with Docker Compose:

```bash
docker compose up --build
```

---

## API Reference

The frontend talks to a simple REST API. You can also hit these endpoints directly if you want to integrate them elsewhere.

**POST** `/api/analyze-password`
```json
{ "password": "MyP@ssw0rd!" }
```
Returns strength label, score, per-check results, and feedback list.

**POST** `/api/generate-password`
```json
{ "length": 20 }
```
Returns a randomly generated password that meets all strength criteria.

**POST** `/api/hash-file`
Multipart form with a `file` field. Returns MD5, SHA-1, and SHA-256 of the uploaded file.

**POST** `/api/verify-integrity`
Multipart form with `file`, `expected_hash`, and `hash_type` fields. Returns a matched boolean plus both hashes for comparison.

---

## Project Structure

```
hashlock/
├── app.py                  # Flask app and all route handlers
├── requirements.txt
├── templates/
│   └── index.html          # Single-page UI
└── static/
    ├── css/style.css
    └── js/app.js
```

---

## Why I built this

I was tired of switching between online tools for each of these tasks — and most of them send your data to a server you don't control. This runs entirely on your own machine. The password never leaves your browser's JavaScript, and files are hashed server-side in memory without being saved to disk.

---

## Author

**Divyesh Dash** — [github.com/divyeshdash](https://github.com/divyeshdash)

---

## License

MIT
