# 🛡️ PhishGuard – AI Powered Phishing Detection Extension

> A real-time browser extension that detects phishing websites using Machine Learning, Deep Learning, and threat intelligence.

---

## 🚀 Overview

**PhishGuard** is a smart cybersecurity tool designed to protect users from phishing attacks while browsing.
It combines multiple detection techniques like **Random Forest, LSTM neural networks, and VirusTotal API** to analyze URLs in real time.

---

## ✨ Features

* 🔍 **Real-time URL scanning**
* 🤖 **Machine Learning detection (Random Forest)**
* 🧠 **Deep Learning model (LSTM)**
* 🌐 **VirusTotal integration**
* 📊 **Risk score & confidence meter**
* ⚠️ **Threat explanation system**
* 🕘 **Scan history tracking**
* 🌙 **Dark/Light mode UI**
* 📤 **One-click WhatsApp sharing**
* 🛡️ **Auto-block phishing sites (optional)**

---

## 🧠 Detection Architecture

PhishGuard uses an **ensemble model**:

* Random Forest → fast & reliable detection
* LSTM Neural Network → detects complex patterns
* VirusTotal → external threat intelligence

👉 Final decision is based on **combined confidence score**

---

## 🖼️ UI Preview

(Add screenshots here)

---

## 🏗️ Project Structure

```
phishguard/
│
├── extension/
│   ├── popup.html
│   ├── popup.js
│   ├── background.js
│   └── content.js
│
├── backend/
│   ├── app.py
│   ├── features.py
│   ├── train.py
│   ├── train_dl.py
│   └── dataset/
│
└── README.md
```

---

## ⚙️ Installation

### 🔹 1. Clone the repo

```bash
git clone https://github.com/Nayanx0013/phishguard-extension.git
cd phishguard-extension
```

---

### 🔹 2. Setup Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

---

### 🔹 3. Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the `extension` folder

---

## 🧪 Training Models (Optional)

```bash
python train.py
python train_dl.py
```

---

## 📡 API Endpoints

* `POST /scan` → Scan URL
* `POST /report` → Report phishing/safe
* `GET /history` → Fetch scan history
* `GET /` → Health check

---

## 🔐 Security Features

* URL entropy analysis
* Suspicious keywords detection
* Domain age checking
* Redirect detection
* IP-based URL detection
* Brand impersonation detection

---

## ⚠️ Disclaimer

This tool is developed for **educational and defensive cybersecurity purposes only**.
Do not use it for malicious activities.

---

## 👨‍💻 Author

**Nayan Ghosh**
Cybersecurity Enthusiast

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

👉 This means:

* You can use, modify, and distribute the code
* BUT any modified version **must also be open-source under GPL**

See the full license in the `LICENSE` file.

---

## ⭐ Support

If you like this project:

👉 Give it a ⭐ on GitHub
👉 Share with others
👉 Contribute improvements

---
