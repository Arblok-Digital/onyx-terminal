# Integrasi AMD Terminal Onyx: Dokumentasi Demo & Uji Coba yang Ditingkatkan

Dokumen ini menguraikan cara menjalankan rangkaian uji coba yang ditingkatkan untuk integrasi AMD (Advanced Market Dynamics) Intelligence di Onyx Terminal dan memberikan gambaran umum laporan intelijen yang dihasilkan.

## 1. Ikhtisar Fitur Intelijen yang Ditingkatkan

Integrasi AMD Intelligence kini mencakup fitur-fitur canggih berikut:

-   **Indeks Peluang Awal (EOI):** Mengidentifikasi token dengan potensi pertumbuhan awal berdasarkan kecepatan dan pertumbuhan dompet baru.
-   **Intelijen Naratif:** Mengkategorikan token berdasarkan narasi pasar dominannya (misalnya, Meme, AI, DeFi) dan mengukur kekuatan narasi.
-   **Skor Uang Cerdas (Smart Money Score):** Menilai keberadaan dan aktivitas pedagang berpengalaman dengan ROI tinggi (paus) dalam suatu token.
-   **Probabilitas Bertahan Hidup (Survival Probability):** Memperkirakan kemungkinan token bertahan dari volatilitas awal dan memberikan perkiraan masa pakainya.
-   **Penilaian Risiko Komprehensif:** Rincian mendalam tentang berbagai risiko termasuk konsentrasi paus, risiko likuiditas, risiko kontrak, dan indikator risiko rug pull yang jelas.
-   **Rekomendasi Strategis:** Saran yang dapat ditindaklanjuti berdasarkan peringkat intelijen keseluruhan, termasuk titik masuk, manajemen risiko, dan saran pemantauan.

## 2. Menjalankan Uji Coba yang Ditingkatkan

Skrip `enhancedTest.js` yang terletak di `amd_integration/test/` menunjukkan kemampuan penuh sistem AMD Intelligence dengan mensimulasikan data dari semua agen dan menghasilkan laporan komprehensif.

**Untuk menjalankan uji coba:**

1.  Buka terminal atau command prompt Anda.
2.  Navigasikan ke direktori root proyek (`onyx-terminal`).
3.  Jalankan perintah berikut:
    ```bash
    node amd_integration/test/enhancedTest.js
    ```

**Output yang Diharapkan:**

Skrip akan menampilkan log terperinci ke konsol, termasuk:

-   Pengujian agen intelijen individual (Peluang Awal, Naratif, Uang Cerdas, Bertahan Hidup).
-   Beberapa Laporan Intelijen yang Ditingkatkan untuk token sampel yang berbeda (misalnya, AI_TOKEN, MEME_TOKEN, YUNO).
-   Setiap laporan akan mencakup:
    -   Ringkasan Eksekutif
    -   Wawasan Utama yang dikategorikan berdasarkan area intelijen
    -   Penilaian Peluang
    -   Penilaian Risiko (termasuk Risiko Rug Pull)
    -   Peringkat Intelijen (dengan skor dan peringkat keseluruhan)
    -   Sumber Data yang digunakan dalam analisis tiruan

## 3. Memahami Struktur Laporan Intelijen

Laporan intelijen yang dihasilkan memberikan analisis multi-lapis untuk membantu pengguna membuat keputusan perdagangan yang terinformasi.

### Ringkasan Eksekutif (Executive Summary)

Gambaran umum yang ringkas tentang status token saat ini, menyoroti metrik utama seperti:

-   Pertumbuhan volume dan pola akumulasi.
-   Indeks Peluang Awal dan peringkatnya.
-   Narasi pasar yang teridentifikasi dan kekuatannya.
-   Kehadiran dan aktivitas Uang Cerdas.
-   Perkiraan probabilitas bertahan hidup dan masa pakai.
-   **Peringatan kritis** untuk risiko rug pull yang tinggi.

### Wawasan Utama (Key Insights)

Daftar wawasan spesifik berbasis data yang dikategorikan berdasarkan agen intelijen yang menghasilkannya (misalnya, `FLOW`, `ONCHAIN`, `MARKET`, `OPPORTUNITY`, `NARRATIVE`, `SMART-MONEY`, `SURVIVAL`, `SENTIMENT`). Setiap wawasan mencakup skor kepercayaan.

### Penilaian Peluang (Opportunity Assessment)

Mengevaluasi potensi token berdasarkan berbagai faktor:

-   **Entri Awal:** Kemungkinan menjadi peluang investasi awal.
-   **Potensi Pertumbuhan:** Potensi keseluruhan untuk apresiasi harga.
-   **Waktu Pasar:** Waktu yang tepat untuk masuk.
-   **Risiko/Imbalan:** Keseimbangan antara potensi keuntungan dan kerugian.

### Penilaian Risiko (Risk Assessment)

Mengidentifikasi potensi risiko yang terkait dengan token:

-   **Konsentrasi Paus:** Risiko karena pemegang besar mengendalikan pasokan yang signifikan.
-   **Risiko Likuiditas:** Masalah terkait kedalaman dan konsentrasi likuiditas.
-   **Risiko Kontrak:** Risiko yang terkait dengan kontrak pintar token.
-   **Volatilitas:** Fluktuasi harga yang diharapkan.
-   **Risiko Rug Pull:** Indikator kritis aktivitas berbahaya yang potensial, dikategorikan sebagai Rendah, Sedang, Tinggi, atau Kritis.

### Peringkat Intelijen (Intelligence Ranking)

Skor dan peringkat terkonsolidasi yang mencerminkan daya tarik/risiko keseluruhan token:

-   **Skor Peluang**
-   **Skor Risiko**
-   **Skor Uang Cerdas**
-   **Skor Bertahan Hidup**
-   **Skor Narasi**
-   **Skor Keseluruhan (dari 100)**
-   **Peringkat:** (misalnya, HINDARI, HATI-HATI, PANTAU, AWASI, POTENSIAL, PELUANG, PELUANG KUAT)

### Rekomendasi Strategis (Strategic Recommendation)

Panduan yang dapat ditindaklanjuti berdasarkan peringkat intelijen, termasuk:

-   Rekomendasi spesifik (misalnya, PANTAU DENGAN SEKSAMA, AKUMULASI, HATI-HATI).
-   Pertimbangan untuk titik masuk, manajemen risiko, dan pemantauan.
-   Penekanan pada peringatan risiko tinggi jika berlaku.

### Sumber Data (Data Sources)

Mencantumkan semua sumber data (tiruan dalam uji coba ini) yang berkontribusi pada laporan intelijen.

## 4. Data Tiruan (`mockData.ts`)

File `amd_integration/test/mockData.ts` menyediakan fungsi untuk menghasilkan laporan intelijen tiruan yang terstruktur. File ini dirancang murni data, tanpa dependensi API eksternal, sehingga aman untuk digunakan dalam konteks browser (Vite) untuk pengujian dan pengembangan UI.

Fungsi utama:

-   `SAMPLE_TOKENS`: Mendefinisikan alamat token sampel untuk pengujian.
-   `createMockIntelligenceReport(tokenAddress: string)`: Menghasilkan laporan intelijen tiruan yang lengkap untuk alamat token tertentu, meniru struktur laporan nyata dari sistem AMD Intelligence.

Dokumentasi ini akan membantu pengguna memahami cara menguji dan menginterpretasikan output sistem AMD Intelligence yang ditingkatkan di Onyx Terminal.