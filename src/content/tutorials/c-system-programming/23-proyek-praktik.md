---
title: "Proyek Praktik"
description: "Setelah membaca buku, cara terbaik mengikat semuanya adalah membangun sesuatu. Tiap proyek di sini memakai banyak bab sekaligus, dengan walkthrough bergaya buku plus..."
tags: [c, system-programming]
order: 23
updated: 2026-06-26
---

Setelah membaca buku, cara terbaik mengikat semuanya adalah **membangun sesuatu**. Tiap proyek di sini memakai banyak bab sekaligus, dengan walkthrough bergaya buku plus kode yang bisa langsung di-compile dan dioprek.

## Daftar proyek

| Proyek | Folder | Binary | Bab utama | Fokus |
|--------|--------|--------|-----------|-------|
| **Hexdump mini** | [`hexdump/`](/tutorial/c-system-programming/24-proyek-hexdump/) | `hd` | 2, 5, 12, 13 | Membaca byte mentah file dan menampilkannya sebagai offset, hex, dan ASCII. |
| **Interpreter ekspresi** | [`interpreter-ekspresi/`](/tutorial/c-system-programming/25-proyek-interpreter-ekspresi/) | `calc` | 5, 6, 8, 9, 11, 13 | Lexer, parser recursive descent, AST, evaluator, variabel, dan error yang rapi. |
| **Mini shell** | [`mini-shell/`](/tutorial/c-system-programming/26-proyek-mini-shell/) | `minish` | 12, 13, 14, 15, 16 | `fork`/`exec`, pipe, redirection, built-in, dan Ctrl-C. |
| **Malloc buatan sendiri** | [`my-malloc/`](/tutorial/c-system-programming/27-proyek-my-malloc/) | `demo` | 6, 8, 9, 21 | Allocator sederhana: metadata blok, free list, splitting, coalescing, `calloc`, `realloc`. |
| **Web server statis** | [`http-server/`](/tutorial/c-system-programming/28-proyek-http-server/) | `httpd` | 12, 13, 15, 18, 21 | Socket TCP, parsing HTTP dasar, file serving, status code, partial write, path traversal. |
| **Chat server multi-client** | [`chat-server/`](/tutorial/c-system-programming/29-proyek-chat-server/) | `chatd` | 8, 12, 15, 17, 18 | Event loop `select()`, banyak client dalam satu thread, broadcast, dan `SIGPIPE`. |

## Cara pakai

Tiap folder berdiri sendiri:

```sh
cd proyek/mini-shell
make          # compile
./minish      # jalankan
```

Contoh dari root repo:

```sh
(cd proyek/hexdump && make && ./hd hd.c)
(cd proyek/interpreter-ekspresi && make && ./calc "1 + 2 * 3")
(cd proyek/mini-shell && make && ./minish)
(cd proyek/my-malloc && make && ./demo)
(cd proyek/http-server && make && ./httpd)
(cd proyek/chat-server && make && ./chatd)
```

Catatan: `httpd`, `chatd`, dan `minish` berjalan interaktif atau menunggu koneksi, jadi biasanya dijalankan satu per satu, bukan sebagai satu script panjang.

Baca `README.md` di dalam tiap folder. Setiap walkthrough membangun proyeknya **bertahap** (v1 -> versi lengkap), menjelaskan keputusan desain, lalu menutup dengan latihan untuk mengembangkannya sendiri.

## Urutan belajar yang disarankan

1. **Mulai dari `hexdump/`** kalau kamu ingin proyek kecil yang cepat selesai. Ini membuat Bab 2 dan Bab 12 terasa konkret.
2. **Lanjut ke `interpreter-ekspresi/`** untuk belajar memecah masalah besar menjadi lexer, parser, dan evaluator.
3. **Kerjakan `mini-shell/`** setelah Bab 14-16. Ini proyek paling kuat untuk memahami proses, pipe, redirection, dan signal.
4. **Masuk ke `my-malloc/`** setelah Bab 9. Cocok kalau pointer dan heap sudah mulai terasa masuk akal.
5. **Coba `http-server/`** setelah Bab 18. Kamu akan melihat socket, file descriptor, dan HTTP bertemu.
6. **Tutup dengan `chat-server/`** untuk memahami model event-driven dan I/O multiplexing.

## Checklist kualitas

Sebelum menganggap sebuah proyek selesai, cek hal-hal ini:

- `make` harus bersih dari warning.
- Jalankan contoh perintah di README proyek.
- Untuk proyek memori (`my-malloc`, `calc`), coba juga sanitizer. Contoh:

```sh
(cd proyek/my-malloc && gcc -Wall -Wextra -g -fsanitize=address,undefined -o demo demo.c myalloc.c && ./demo)
(cd proyek/interpreter-ekspresi && gcc -Wall -Wextra -g -fsanitize=address,undefined -o calc main.c calc.c -lm && ./calc "1 + 2 * 3")
```

- Untuk proyek server (`httpd`, `chatd`), uji minimal dua kondisi: request normal dan client yang putus lebih awal.
- Untuk proyek yang menerima input user, coba input rusak: file tidak ada, ekspresi salah, path HTTP aneh, atau command shell kosong.

Intinya: proyek di folder ini bukan sekadar contoh kode jadi. Ia adalah latihan membaca sistem dari bawah: byte, file descriptor, proses, memori, socket, dan event loop.
