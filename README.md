# TrueLens — Setup Guide

---

## What You Need to Download

| Tool | Version | Link |
|------|---------|------|
| Python | 3.10 or newer | https://www.python.org/downloads/ |
| Node.js | 18 or newer | https://nodejs.org/ |
| Ollama *(optional)* | latest | https://ollama.com/download |

> **Ollama is only needed if you don't have a Groq API key.**  
> With a free Groq key the app runs entirely in the cloud — no GPU required.

---

## Step 1 — Get a Free Groq API Key *(recommended)*

1. Go to https://console.groq.com/
2. Sign up for a free account
3. Click **API Keys → Create API Key**
4. Copy the key — you will need it in Step 3

---

## Step 2 — Run the Setup Script

Double-click **`setup.bat`** in the project folder.

It will automatically install everything (Python dependencies, database, frontend packages). Wait until it says **Done!**

---

## Step 3 — Add Your Groq API Key

Inside the `backend/` folder, open the `.env` file and paste your key:

```
GROQ_API_KEY=your_key_here
```

> If you skip this step the app falls back to Ollama (see Step 4).

---

## Step 4 — Create Your Account

Open a terminal in the project folder and run:

```bash
cd backend
venv\Scripts\activate
python manage.py createsuperuser
```

Enter a username and password — this is your login for the app.

---

## Step 5 — Set Up Ollama *(optional — only if you don't have a Groq key)*

1. Install Ollama from https://ollama.com/download
2. Open a terminal and run:

```bash
ollama pull mistral
ollama pull llava
```

> `mistral` handles text/URL analysis, `llava` handles images. Each is around 4–7 GB.

---

## Step 6 — Run the Project

You need **two terminals open at the same time**.

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open your browser and go to:
```
http://localhost:5173
```

---

## Troubleshooting

**"Could not connect to server"** — Make sure the backend is running in Terminal 1.

**"AI returned UNCERTAIN / 50"** — Your Groq key is missing or wrong. Check `backend/.env`.

**"Module not found" errors** — Make sure you ran `venv\Scripts\activate` before the Python commands.

**EasyOCR is slow on first run** — It downloads its model once. After that it is fast.

**Port already in use** — Kill the existing process or restart your PC and try again.
