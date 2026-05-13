# PIXEL - AI Infographic Generator

PIXEL adalah platform *all-in-one* berbasis web yang memungkinkan pengguna untuk menghasilkan *prompt* infografis yang sangat spesifik dan langsung menghasilkan gambar visual menggunakan AI.

## Fitur Utama

- **Intelligent Prompt Constructor:** Pilih elemen kunci (Tipe, Gaya, Layout, dll.) untuk menyusun prompt otomatis.
- **AI Enhancement:** Gunakan LLM untuk memperkaya detail prompt agar hasil lebih sinematik.
- **Live Preview:** Lihat hasil gambar secara instan beserta metadata JSON.
- **History & Storage:** Riwayat prompt disimpan di database SQLite lokal.

## Teknologi yang Digunakan

- **Runtime:** [Bun](https://bun.sh/)
- **Frontend:** React, Vite, Tailwind CSS, Lucide React
- **Backend:** Hono
- **Database:** SQLite dengan Drizzle ORM
- **Styling:** Modern Dark UI / Glassmorphism

## Cara Penggunaan

### 1. Instalasi Dependensi
Pastikan Anda memiliki Bun terinstal, lalu jalankan:
```bash
bun install
```

### 2. Konfigurasi Database
Lakukan push schema ke database SQLite:
```bash
bun run db:push
```

### 3. Menjalankan Aplikasi
Buka dua terminal:

**Terminal 1 (Frontend):**
```bash
bun run dev
```
Aplikasi akan berjalan di `http://localhost:3333`

**Terminal 2 (Backend API):**
```bash
bun run server
```
API akan berjalan di `http://localhost:3334` (Vite akan mem-proxy permintaan `/api` ke port ini).

## Struktur Proyek

- `/api`: Logika backend (Hono, Drizzle, DB Schema)
- `/src`: Kode frontend React & Styling
- `sqlite.db`: Database SQLite lokal
- `app_summary.md`: Ringkasan fitur dan alur kerja proyek

## Deployment
Aplikasi ini sudah siap untuk di-containerize menggunakan Docker (lihat `app_summary.md` untuk rencana deployment).
