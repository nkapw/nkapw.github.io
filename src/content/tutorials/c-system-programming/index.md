---
title: "C & System Programming"
description: "Belajar bahasa C dari dasar sampai system programming: memori, pointer, syscall, concurrency, networking, dan proyek praktik."
tags: [c, system-programming, programming]
order: 3
updated: 2026-06-26
---

Buku/materi belajar bahasa C dengan fokus **memahami cara kerja di balik layar** — memory, pointer, stack/heap, syscall, dan fondasi untuk masuk ke system programming (OS, kernel, embedded, networking level rendah).

Gaya: santai seperti senior yang lagi ngajarin teman, tapi tetap akurat secara teknis. Istilah teknis tetap pakai bahasa Inggris aslinya.

---

## Daftar Isi

### BAGIAN I — Fondasi: Bahasa & Mesin

- **Bab 1 — Pengenalan C & Cara Kerja Compiler**
  Kenapa C ada, posisi C di antara hardware dan software, dan perjalanan lengkap dari source code `.c` jadi program yang jalan (preprocessing → compile → assemble → link → load).

- **Bab 2 — Tipe Data, Variabel & Representasi di Memori**
  Bit, byte, word. Bagaimana integer, char, dan floating point benar-benar disimpan. Signed vs unsigned, two's complement, endianness, overflow.

- **Bab 3 — Operator, Control Flow & Bagaimana CPU Mengeksekusinya**
  Ekspresi, percabangan, dan loop dilihat dari sisi assembly. Apa itu register, instruction pointer, dan branch.

- **Bab 4 — Functions, Stack & Calling Convention**
  Apa yang terjadi saat fungsi dipanggil: stack frame, return address, passing arguments, recursion, dan kenapa stack overflow bisa terjadi.

### BAGIAN II — Inti C: Pointer & Memori

- **Bab 5 — Arrays & Strings**
  Memori kontigu, indexing sebagai aritmetika alamat, null-terminated string, dan jebakan klasiknya.

- **Bab 6 — Pointers (Jantungnya C)**
  Alamat memori, dereference, pointer arithmetic, `NULL`, dan kenapa pointer itu konsep paling penting di C.

- **Bab 7 — Pointer Lanjutan**
  Pointer to pointer, hubungan array vs pointer yang sebenarnya, `void*`, function pointer, dan `const` correctness.

- **Bab 8 — Struct, Union, Enum & Memory Layout**
  Bagaimana data kompleks ditata di memori: padding, alignment, bitfield, dan kenapa urutan field itu penting.

### BAGIAN III — Manajemen Memori & Build

- **Bab 9 — Stack vs Heap & Manajemen Memori Manual**
  `malloc`/`free`/`calloc`/`realloc`, cara kerja allocator di balik layar, memory leak, dangling pointer, double free.

- **Bab 10 — Preprocessor & Build System**
  `#include`, macro, conditional compilation, dan otomatisasi build dengan `make`/`Makefile`.

- **Bab 11 — Modular Programming & Linking**
  Translation unit, deklarasi vs definisi, `extern`/`static`, header guard, static library (`.a`) vs shared library (`.so`).

### BAGIAN IV — Berinteraksi dengan Sistem Operasi

- **Bab 12 — File & I/O**
  File descriptor, syscall `read`/`write`/`open`, vs `stdio` (`FILE*`), dan rahasia di balik buffering.

- **Bab 13 — Error Handling & `errno`**
  Konvensi return value, `errno`, `perror`/`strerror`, dan strategi error handling yang waras di C.

- **Bab 14 — Proses (Process)**
  Layout memori sebuah proses, `fork()`, `exec()`, `wait()`, parent/child, zombie, dan orphan.

- **Bab 15 — Signals**
  Interrupt software, signal handler, `SIGINT`/`SIGSEGV`/`SIGKILL`, dan async-safety.

- **Bab 16 — Inter-Process Communication (IPC)**
  Pipe, FIFO, shared memory, dan message queue — cara proses ngobrol satu sama lain.

- **Bab 17 — Threads & Concurrency**
  `pthreads`, shared state, race condition, mutex, deadlock, dan model memori dasar.

### BAGIAN V — Level Rendah & Lanjutan

- **Bab 18 — Networking Level Rendah (Sockets)**
  Socket API, TCP vs UDP, client/server, byte order di jaringan.

- **Bab 19 — Syscall & Interaksi Langsung dengan Kernel**
  User space vs kernel space, mekanisme syscall, mode switch, dan apa yang sebenarnya dilakukan libc.

- **Bab 20 — Tooling: Debugging & Analisis**
  `gdb`, `valgrind`, AddressSanitizer/UBSan, `strace`, `objdump`, `nm` — senjata wajib system programmer.

- **Bab 21 — Undefined Behavior & Keamanan**
  Apa itu UB dan kenapa berbahaya, buffer overflow, integer overflow, dan dasar exploitation/mitigasi.

- **Bab 22 — Menuju OS, Kernel & Embedded**
  Peta jalan langkah selanjutnya: freestanding C, bare-metal, menulis kernel sederhana, dan sumber belajar lanjutan.

---

## Proyek Praktik

Teori sudah, sekarang bangun sesuatu. Folder [`proyek/`](/tutorial/c-system-programming/23-proyek-praktik/) berisi proyek yang menyatukan banyak bab sekaligus, lengkap dengan walkthrough bertahap dan kode yang bisa di-compile:

- **[`hd` — hexdump mini](/tutorial/c-system-programming/24-proyek-hexdump/)** — lihat isi file sebagai byte mentah: offset, hex, dan ASCII. Mengikat Bab 2, 5, 12, dan 13.
- **[`calc` — interpreter ekspresi](/tutorial/c-system-programming/25-proyek-interpreter-ekspresi/)** — lexer, parser, AST, evaluator, variabel, dan error handling. Mengikat Bab 5, 6, 8, 9, 11, dan 13.
- **[`minish` — shell-mu sendiri](/tutorial/c-system-programming/26-proyek-mini-shell/)** — jalankan perintah, pipe (`|`), redirection, built-in, dan Ctrl-C. Mengikat Bab 12-16.
- **[`myalloc` — malloc buatan sendiri](/tutorial/c-system-programming/27-proyek-my-malloc/)** — tulis `malloc`/`free`/`calloc`/`realloc` sendiri di atas `sbrk` dengan free list, splitting, dan coalescing. Bikin Bab 9 benar-benar klik.
- **[`httpd` — web server statis](/tutorial/c-system-programming/28-proyek-http-server/)** — server TCP yang melayani file dari `www/`, mengirim status HTTP, dan menangani error dasar. Mengikat Bab 12, 13, 15, 18, dan 21.
- **[`chatd` — chat server multi-client](/tutorial/c-system-programming/29-proyek-chat-server/)** — event loop `select()` untuk melayani banyak client tanpa thread. Mengikat Bab 8, 12, 15, 17, dan 18.

Urutan yang enak untuk dikerjakan:

1. **`hd`** — paling kecil, langsung memperkuat representasi byte dan file I/O.
2. **`calc`** — memperkenalkan desain program yang lebih modular: token, AST, dan evaluasi rekursif.
3. **`minish`** — titik temu proses, file descriptor, pipe, signal, dan error handling.
4. **`myalloc`** — pendalaman memori manual dan metadata allocator.
5. **`httpd`** — networking pertama yang terasa nyata karena bisa dibuka dari browser.
6. **`chatd`** — langkah lanjut dari server satu-client ke server event-driven multi-client.

Semua proyek punya `Makefile`, jadi pola umumnya:

```sh
cd proyek/nama-proyek
make
./nama-binary
```

Lihat [`proyek/README.md`](/tutorial/c-system-programming/23-proyek-praktik/) untuk tabel lengkap nama binary, cara menjalankan, dan fokus tiap proyek.

---

> Cara pakai: baca berurutan. Setiap bab punya contoh kode yang bisa dijalankan dan latihan di akhir. Compiler yang dipakai: `gcc` (atau `clang`) di Linux.
