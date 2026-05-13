## **Ringkasan Proyek PIXEL**

Aplikasi ini adalah platform *all-in-one* berbasis web yang memungkinkan pengguna (terutama guru dan kreator konten) untuk menghasilkan *prompt* infografis yang sangat spesifik dan langsung menghasilkan gambar visual menggunakan AI. Dibangun dengan *stack* modern (**Bun, Hono, Tailwind, ShadcnUI, Drizzle, SQLite**) dan dideploy menggunakan **Docker** untuk performa maksimal dan latensi rendah.

---

## **Fitur-Fitur Utama**

### **1. Intelligent Prompt Constructor**

* **Modular Selector:** UI berbasis ShadcnUI untuk memilih 6 elemen kunci (Tipe, Gaya Visual, Layout, Desain, Ikon, dan Tone).
* **Dynamic Prompt Engine:** Algoritma yang merangkai pilihan pengguna menjadi kalimat deskriptif yang dioptimalkan untuk AI Image Generator.
* **Custom Parameter Control:** Pengaturan aspek rasio (`--ar`), tingkat variasi, dan *negative prompt* (misal: menghapus teks berantakan).

### **2. LLM & Image API Integration**

* **Prompt Refiner (LLM):** Mengirimkan draft prompt ke Gemini/GPT API untuk memperkaya detail tekstur, pencahayaan, dan komposisi artistik.
* **Direct Generation:** Integrasi API (OpenAI DALL-E 3 atau Stability AI) untuk merender gambar langsung di dalam dashboard.
* **Live Preview:** Menampilkan hasil gambar beserta metadata teknisnya.

### **3. Management & Storage System**

* **JSON Export:** Menyediakan output data terstruktur untuk integrasi ke aplikasi lain.
* **History & Library:** Menyimpan riwayat prompt dan URL gambar ke **SQLite** menggunakan **Drizzle ORM**.
* **Local Caching (Rustfs):** Manajemen penyimpanan file gambar hasil generate secara lokal di dalam container untuk akses yang lebih cepat.

### **4. Deployment & Infrastructure**

* **Dockerized:** Seluruh aplikasi (DB, Server, Frontend) dibungkus dalam Docker Container.
* **High Performance:** Menggunakan Bun sebagai *runtime* dan Hono sebagai *framework* API yang ringan.

---

## **Alur Kerja Detail (Step-by-Step Flow)**

### **Tahap 1: Konfigurasi User**

1. **Input:** Pengguna masuk ke dashboard dan memilih kategori (misal: *Tipe: Edukasi, Style: Amigurumi, Tone: Friendly*).
2. **Validation:** Sistem memvalidasi kombinasi agar tidak ada elemen yang saling bertabrakan secara visual.

### **Tahap 2: Pemrosesan Backend (The Logic)**

1. **Generation:** Server Hono menerima data dan menyusun "Base Prompt".
2. **Refinement:** Jika fitur "AI Enhance" aktif, Base Prompt dikirim ke LLM API untuk diubah menjadi narasi yang lebih sinematik.
3. **Finalization:** Prompt final dikirim ke API Image Generation.

### **Tahap 3: Output & Rendering**

1. **Streaming Response:** Sambil menunggu gambar jadi, sistem menampilkan status progres kepada pengguna.
2. **Delivery:** Gambar muncul di UI. Data prompt, parameter, dan URL gambar disimpan ke dalam database SQLite.
3. **Export:** Pengguna bisa mengunduh gambar, menyalin prompt teks, atau mengambil data dalam format JSON.

---

## **Struktur Data JSON (Output Detail)**

Aplikasi ini tidak hanya memberikan gambar, tapi data yang bisa diolah kembali:

```json
{
  "project_id": "INF-2026-005",
  "timestamp": "2026-05-10T23:18:29Z",
  "content": {
    "prompt_text": "Diorama of a high-tech battery cell cutaway, miniature workers fixing wires, 3D clay style...",
    "aspect_ratio": "9:16",
    "negative_prompt": "text, letters, blurry, messy"
  },
  "api_response": {
    "image_url": "/storage/images/result_005.png",
    "model": "DALL-E-3",
    "llm_enhanced": true
  },
  "metadata": {
    "category": "Edukasi",
    "style": "Diorama",
    "tone": "Edukatif"
  }
}
```

---

## **Rencana Deployment (Docker Flow)**

1. **Build:** Membuat Docker image yang berisi Bun runtime.
2. **Containerization:** Menjalankan instance Hono server dan SQLite dalam satu network.
3. **Persistence:** Menggunakan *Docker Volumes* untuk memastikan database SQLite dan folder gambar (Rustfs) tidak hilang saat container direstart.
