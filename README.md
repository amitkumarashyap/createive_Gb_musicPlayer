# 🎵 GaanaKhoj - YouTube Song Search & Player

Yeh ek mobile-first web application hai jisme koi bhi user gaane ka naam search karke uska full-length official YouTube video play kar sakta hai. Iska link aap kisi ke bhi saath share kar sakte hain—bina kuch install kiye yeh seedha phone ya computer browser mein chalta hai.

---

## ✨ Features
- **Mobile-First & Responsive:** Phone ki screen par ekdum app jaisa feel deta hai (`playsinline` enabled).
- **Safe API Key (Backend Proxy):** Aapki YouTube API Key client-side JavaScript mein nahi dikhti, balki `/api/search.js` serverless backend mein chhupi rehti hai.
- **100% Legal & Official:** Koi audio/video rip ya download nahi hota; seedha YouTube IFrame Player API use hota hai.

---

## 🔑 Step 1: YouTube Data API v3 Key Kaise Banayein aur Restrict Karein

1. [Google Cloud Console](https://console.cloud.google.com/) par jayein aur apne Google account se login karein.
2. Upar project dropdown par click karke **"New Project"** banayein (e.g., `GaanaKhoj`).
3. Left menu mein **APIs & Services > Library** par jayein.
4. Search bar mein **"YouTube Data API v3"** likhein, uspar click karein aur **Enable** daba dein.
5. Ab **APIs & Services > Credentials** mein jayein aur upar **"+ CREATE CREDENTIALS" > "API key"** par click karein. Aapki key ban jayegi!

### 🛡️ API Key ko Restrict (Safe) Kaise Karein?
Key chori hone ya quota misuse se bachane ke liye:
1. Credentials list mein apni nayi API Key par click karein.
2. **API restrictions** ke andar **"Restrict key"** chunein aur dropdown se sirf **YouTube Data API v3** tick karein.
3. (Optional) Agar aap backend proxy use kar rahe hain toh IP restriction ya Environment Variable kaafi hai. Save par click karein.

---

## 💻 Step 2: Apne Computer Par Locally Kaise Chalayein

1. Make sure aapke computer mein [Node.js](https://nodejs.org/) installed ho.
2. Project folder ke andar `.env.example` file ki ek copy banayein aur uska naam `.env` rakhein:
   ```bash
   cp .env.example .env