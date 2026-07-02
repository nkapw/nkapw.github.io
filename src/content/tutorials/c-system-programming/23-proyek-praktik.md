---
title: "Proyek Praktik"
description: "Bagian ini berisi proyek pendamping untuk menerapkan materi dalam buku. Setiap proyek menggabungkan beberapa bab sekaligus dan disertai penjelasan bertahap agar dapat..."
tags: [c, systems-programming, projects]
order: 23
updated: 2026-07-02
---
Bagian ini berisi proyek pendamping untuk menerapkan materi dalam buku. Setiap proyek menggabungkan beberapa bab sekaligus dan disertai penjelasan bertahap agar dapat dibaca, dikompilasi, diuji, dan dikembangkan kembali.

| Proyek | Folder | Bab Utama | Status |
|--------|--------|-----------|--------|
| **`minish` shell sederhana** | [`mini-shell/`](/tutorial/c-system-programming/24-proyek-mini-shell/) | 12, 13, 14, 15, 16 | Siap |
| **Allocator sederhana** | [`my-malloc/`](/tutorial/c-system-programming/25-proyek-my-malloc/) | 6, 8, 9, 21 | Siap |
| HTTP server mini | _menyusul_ | 12, 13, 18 | Menyusul |
| Interpreter ekspresi | _menyusul_ | 5, 6, 8 | Menyusul |

## Cara Pakai

Setiap folder proyek berdiri sendiri.

```sh
cd mini-shell
make
./minish
```

Baca `README.md` di dalam folder proyek sebelum mengubah kode. Dokumentasi di setiap proyek menjelaskan tahapan implementasi, keputusan desain, dan latihan lanjutan.

Mulai dari `mini-shell` jika ingin mengulang materi proses, pipe, signal, file I/O, dan error handling. Setelah itu, lanjutkan ke `my-malloc` untuk memperdalam pemahaman tentang heap, metadata allocator, alignment, dan hubungan antara manajemen memori dengan keamanan.

