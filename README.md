# IPMS – Indoor Pollution Monitoring System

[![ESP32](https://img.shields.io/badge/ESP32-000000?style=flat&logo=espressif&logoColor=white)](https://www.espressif.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)

An **ESP32-based indoor air quality monitor** that measures pollutants, temperature, and humidity in real time — paired with a **Next.js dashboard** for remote monitoring. Built from a breadboard prototype into a standalone, 3D-printed device with persistent Wi‑Fi configuration [1].

---

## 📖 Overview

IPMS is an end-to-end IoT project that combines embedded hardware with a modern web dashboard. The ESP32 reads sensor data from an **MQ135 gas sensor** and a **DHT22 temperature/humidity sensor**, displays live readings on an **SSD1306 OLED**, and streams everything to **Firebase Firestore**. A **Next.js dashboard** deployed on **Vercel** visualizes the data in real time, allowing you to monitor indoor air quality from anywhere [1].

---

## ✨ Features

- **Real-time air quality monitoring** — MQ135 detects harmful gases (CO₂, NH₃, benzene, smoke, etc.) alongside DHT22 temperature & humidity readings [1]
- **Live OLED display** — I²C SSD1306 shows current sensor values directly on the device [1]
- **Captive portal for Wi‑Fi setup** — No hardcoded credentials; on first boot, the ESP32 spawns a Wi‑Fi access point where you enter your network credentials. Settings persist across reboots [1]
- **Cloud dashboard** — A Next.js web app reads from Firebase Firestore and displays real-time sensor graphs and metrics [1]
- **3D-printed enclosure** — Custom-designed case turns the breadboard prototype into a compact, deployable unit [1]
- **Fully remote** — Once connected to Wi‑Fi, the device streams data autonomously; monitor from anywhere via the Vercel-hosted dashboard

---

## 🧱 Hardware Components

| Component | Purpose |
|-----------|---------|
| **ESP32** | Microcontroller with built-in Wi‑Fi — brains of the device |
| **MQ135** | Gas sensor for air quality (CO₂, NH₃, benzene, smoke) |
| **DHT22** | Temperature & humidity sensor |
| **SSD1306 OLED** | 128×64 I²C display for live local readings |
| **Custom 3D-printed enclosure** | Houses all components in a standalone form factor |

---

## 🏗️ Architecture

┌─────────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
│ ESP32 Device │ │ Firebase │ │ Next.js Dashboard │
│ │─────▶│ Firestore │─────▶│ (Vercel) │
│ - MQ135 │ │ │ │ │
│ - DHT22 │ │ Real-time DB │ │ Real-time charts │
│ - SSD1306 OLED │ │ │ │ & metrics │
│ - Captive Portal │ └──────────────────┘ └─────────────────────┘
└─────────────────────┘


1. The **ESP32** reads sensor data and pushes it to Firebase Firestore over Wi‑Fi
2. The **Next.js dashboard** listens to Firestore in real time and renders live charts
3. The **captive portal** handles first-time Wi‑Fi setup — no reflashing needed

---

## 🚀 Getting Started

### Prerequisites

- [Arduino IDE](https://www.arduino.cc/en/software) with ESP32 board support
- [Node.js](https://nodejs.org/) (v18+) and npm/yarn
- A Firebase project with Firestore enabled
- Hardware: ESP32, MQ135, DHT22, SSD1306 OLED

### 1. Firmware (ESP32)

1. Clone the repository:
   ```bash
   git clone https://github.com/Vinayak-07/ipms.git
   cd ipms/firmware

2. Open the .ino file in Arduino IDE
3. Install required libraries via Library Manager:
    Adafruit_Sensor
    DHT sensor library
    Adafruit_SSD1306
    Adafruit_GFX
    WiFiManager (for the captive portal)
    Firebase_ESP_Client
4. Update the Firebase configuration in the sketch with your project credentials
5. Flash to your ESP32
6. On first boot, connect to the "IPMS-Setup" Wi‑Fi network from your phone/laptop and enter your home Wi‑Fi credentials via the captive porta


- to install and run dashboard
- run the following command
```
  git clone https://github.com/Vinayak-07/ipms.git
```
```
  cd ipms/dashboard
```
```
  npm install
```
- and fill in your .env file
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```
ipms/
├── firmware/                  # ESP32 Arduino sketch
│   ├── ipms.ino              # Main firmware with sensor logic & captive portal
│   └── config.h              # Pin definitions & constants
├── dashboard/                 # Next.js web dashboard
│   ├── pages/                # App routes
│   ├── components/           # Reusable UI components (charts, cards, etc.)
│   ├── lib/                  # Firebase helpers & utilities
│   ├── public/               # Static assets
│   └── .env.local            # Firebase config (not committed)
├── enclosure/                 # 3D-printable STL files
│   └── ipms_case.stl
└── README.md
