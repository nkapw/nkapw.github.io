---
title: "Bab 20 - Tooling, Debugging, dan Analisis"
description: "Dalam pemrograman C, tool debugging dan analisis sangat penting karena bahasa C memberi kontrol besar sekaligus sedikit perlindungan runtime. Bug seperti akses memori..."
tags: [c, systems-programming]
order: 20
updated: 2026-07-02
---
Dalam pemrograman C, tool debugging dan analisis sangat penting karena bahasa C memberi kontrol besar sekaligus sedikit perlindungan runtime. Bug seperti akses memori tidak valid, memory leak, undefined behavior, dan race condition sering tidak langsung terlihat dari kode sumber.

Bab ini merangkum tool yang sudah beberapa kali disebut pada bab sebelumnya, seperti `gdb`, `valgrind`, sanitizer, `strace`, `ltrace`, `objdump`, dan `nm`. Fokusnya adalah memahami tool mana yang tepat untuk jenis masalah tertentu dan bagaimana memulai penggunaannya.

Bab ini bukan referensi lengkap untuk setiap tool. Tujuannya adalah memberi alur kerja praktis yang dapat dipakai saat menulis dan men-debug program C.

---

## 20.1 Kompilasi untuk Debugging

Sebelum melakukan debugging, program sebaiknya dikompilasi dengan flag yang tepat.

```sh
gcc -Wall -Wextra -g -O0 program.c -o program
```

Flag tersebut memiliki fungsi berikut.

- **`-Wall -Wextra`** mengaktifkan banyak warning penting. Warning sering menunjukkan bug sejak tahap kompilasi, misalnya variabel belum diinisialisasi, format `printf` tidak cocok, atau konversi tipe yang berisiko.
- **`-g`** menyertakan debug information seperti nama variabel, nomor baris, dan tipe data. Informasi ini diperlukan agar `gdb` dapat menampilkan kode sumber dan variabel secara bermakna.
- **`-O0`** menonaktifkan optimasi. Saat optimasi aktif, compiler dapat menyusun ulang atau menghapus bagian kode, sehingga alur debugging menjadi lebih sulit diikuti.

Untuk proses pengembangan, warning sebaiknya diperlakukan sebagai error. Banyak masalah lebih mudah diperbaiki ketika masih berupa warning compiler daripada setelah muncul sebagai crash atau korupsi data.

---

## 20.2 Debugging dengan `gdb`

`gdb` adalah debugger yang memungkinkan program dijalankan secara terkendali. Dengan `gdb`, programmer dapat memasang breakpoint, menjalankan program langkah demi langkah, memeriksa nilai variabel, dan melihat call stack saat crash.

```sh
gdb ./program
```

Perintah dasar yang sering dipakai di dalam `gdb` adalah sebagai berikut.

| Perintah | Singkatan | Fungsi |
|----------|-----------|--------|
| `run [args]` | `r` | Menjalankan program |
| `break main` | `b main` | Memasang breakpoint di fungsi `main` |
| `break file.c 42` | | Memasang breakpoint pada baris tertentu |
| `next` | `n` | Menjalankan satu baris tanpa masuk ke fungsi |
| `step` | `s` | Menjalankan satu baris dan masuk ke fungsi |
| `continue` | `c` | Melanjutkan eksekusi sampai breakpoint berikutnya |
| `print x` | `p x` | Menampilkan nilai variabel atau ekspresi |
| `backtrace` | `bt` | Menampilkan call stack |
| `info locals` | | Menampilkan variabel lokal pada frame saat ini |
| `quit` | `q` | Keluar dari `gdb` |

### Menganalisis Crash

Saat program mengalami segmentation fault, `gdb` dapat menunjukkan lokasi crash dan kondisi call stack.

```text
gdb ./program
(gdb) run
Program received signal SIGSEGV, Segmentation fault.
0x... in proses () at program.c 15
15          *p = 42;
(gdb) print p
$1 = (int *) 0x0
(gdb) backtrace
#0  proses () at program.c 15
#1  main () at program.c 8
```

Informasi di atas menunjukkan bahwa crash terjadi pada `program.c` baris 15 karena `p` bernilai `NULL`. Perintah `backtrace` menunjukkan rantai pemanggilan fungsi sampai titik crash.

### Melihat Stack Frame

`gdb` juga dapat digunakan untuk melihat stack frame pada pemanggilan fungsi rekursif.

```text
(gdb) break faktorial
(gdb) run
(gdb) backtrace
#0  faktorial (n=1) at f.c 4
#1  faktorial (n=2) at f.c 6
#2  faktorial (n=3) at f.c 6
#3  faktorial (n=4) at f.c 6
#4  main () at f.c 11
```

Setiap baris menunjukkan satu stack frame. Ini membantu memahami hubungan antara pemanggilan fungsi, variabel lokal, dan call stack.

`gdb` juga dapat membaca core dump. Jika sistem menghasilkan file core saat program crash, perintah seperti `gdb ./program core` dapat digunakan untuk menganalisis kondisi program setelah crash terjadi.

---

## 20.3 Analisis Memori dengan `valgrind`

`valgrind` menjalankan program dengan pemantauan memori. Tool ini dapat mendeteksi memory leak, use-after-free, double free, akses di luar batas, dan pembacaan memori yang belum diinisialisasi.

```sh
valgrind ./program
valgrind --leak-check=full ./program
```

Contoh memory leak.

```c
int *p = malloc(100);
```

Jika `p` tidak pernah dilepas dengan `free`, `valgrind` dapat menampilkan laporan seperti berikut.

```text
LEAK SUMMARY
definitely lost 100 bytes in 1 blocks
at malloc (...)
by main (program.c 5)
```

Contoh use-after-free.

```c
int *p = malloc(sizeof(int));
free(p);
*p = 5;
```

Laporan `valgrind` dapat menunjukkan lokasi penulisan ke memori yang sudah dilepas dan lokasi saat memori tersebut dilepas.

```text
Invalid write of size 4
at main (program.c 7)
Address 0x... is 0 bytes inside a block of size 4 free'd
at free (...)
```

`valgrind` tidak memerlukan kompilasi ulang khusus, tetapi program dapat berjalan jauh lebih lambat. Tool ini tetap sangat berguna untuk menganalisis bug memori yang sulit ditemukan.

---

## 20.4 Sanitizer dari Compiler

Sanitizer adalah instrumentasi yang ditambahkan compiler ke program untuk mendeteksi bug saat runtime. Sanitizer biasanya lebih cepat daripada `valgrind`, tetapi program perlu dikompilasi ulang dengan flag tertentu.

**AddressSanitizer** mendeteksi bug memori seperti out-of-bounds, use-after-free, dan leak.

```sh
gcc -fsanitize=address -g program.c -o program
./program
```

Contoh laporan AddressSanitizer.

```text
ERROR AddressSanitizer heap-buffer-overflow
#0 main program.c 7
```

**UndefinedBehaviorSanitizer** mendeteksi beberapa bentuk undefined behavior, seperti signed integer overflow, shift yang tidak valid, dan akses memori misaligned.

```sh
gcc -fsanitize=undefined -g program.c -o program
./program
```

Contoh laporan UndefinedBehaviorSanitizer.

```text
program.c 5 runtime error signed integer overflow
```

**ThreadSanitizer** mendeteksi race condition pada program multi-thread.

```sh
gcc -fsanitize=thread -g program.c -o program -pthread
```

Pada tahap pengembangan, kombinasi berikut sering efektif untuk program single-thread.

```sh
gcc -Wall -Wextra -g -O0 -fsanitize=address,undefined program.c -o program
```

AddressSanitizer dan ThreadSanitizer umumnya tidak digunakan bersamaan. Pilih sanitizer sesuai jenis bug yang sedang dicari. Untuk build produksi, sanitizer biasanya dimatikan karena menambah overhead.

---

## 20.5 `strace` dan `ltrace`

`strace` menampilkan syscall yang dilakukan program, sedangkan `ltrace` menampilkan pemanggilan fungsi library. Keduanya berguna untuk melihat perilaku program dari lapisan yang berbeda.

```sh
strace ./program
strace -c ./program
ltrace ./program
```

`strace` berguna pada beberapa situasi.

- Program berhenti menunggu tanpa output. `strace` dapat menunjukkan apakah program sedang memblokir pada `read`, `accept`, `wait`, atau syscall lain.
- Program gagal membuka file atau koneksi. `strace` dapat menunjukkan syscall yang gagal dan kode error seperti `ENOENT`, `EACCES`, atau `ECONNREFUSED`.
- Program pihak ketiga perlu dianalisis. `strace` dapat menunjukkan file yang dibuka, proses yang dibuat, dan koneksi yang dicoba.

`gdb` melihat state internal program seperti variabel dan call stack. `strace` melihat interaksi program dengan kernel. Kedua tool ini saling melengkapi.

---

## 20.6 `objdump`, `nm`, `ldd`, dan `file`

Beberapa tool berguna untuk memeriksa binary, symbol, dan library.

**`objdump -d`** menampilkan disassembly dari executable atau object file.

```sh
objdump -d program
```

Outputnya memperlihatkan instruksi assembly yang akan dijalankan CPU. Tool ini berguna untuk memahami hasil kompilasi, efek optimasi, dan debugging tingkat rendah.

**`nm`** menampilkan daftar symbol pada object file atau executable.

```sh
nm program.o
```

Contoh output.

```text
U printf
T main
```

Symbol `U printf` berarti `printf` belum didefinisikan di object file tersebut dan harus diselesaikan saat linking. Symbol `T main` berarti `main` berada pada bagian text dan didefinisikan di file tersebut.

**`ldd`** menampilkan shared library yang dibutuhkan executable.

```sh
ldd program
```

**`file`** menampilkan jenis file, misalnya ELF executable, object file, shared object, atau file teks.

```sh
file program
```

Tool ini membantu ketika debugging masalah linking, format binary, atau dependensi runtime.

---

## 20.7 Alur Debugging yang Sistematis

Tool yang banyak tidak berguna tanpa alur kerja yang jelas. Berikut alur debugging yang praktis untuk program C.

1. Baca warning compiler dan perbaiki terlebih dahulu.
2. Pastikan bug dapat direproduksi dengan input atau kondisi yang jelas.
3. Gunakan sanitizer untuk mencari bug memori dan undefined behavior.
4. Jika program crash, jalankan dengan `gdb` dan gunakan `backtrace`.
5. Jika ada dugaan memory leak atau akses memori ilegal, jalankan `valgrind`.
6. Jika masalah berkaitan dengan file, proses, jaringan, atau program yang berhenti menunggu, gunakan `strace`.
7. Jika masalahnya adalah bug logika, gunakan breakpoint, `print`, dan eksekusi langkah demi langkah di `gdb`.
8. Verifikasi asumsi satu per satu dengan data dari tool, bukan dengan menebak.

Debugging yang baik adalah proses investigasi yang terukur. Setiap tool memberi sudut pandang berbeda. `gdb` menunjukkan state internal program, `valgrind` dan sanitizer menunjukkan bug memori atau undefined behavior, `strace` menunjukkan interaksi dengan kernel, sedangkan `objdump` dan `nm` membantu memahami binary dan symbol.

---

## 20.8 Rangkuman Model Mental

1. C memberi sedikit perlindungan runtime, sehingga tool debugging dan analisis perlu digunakan sejak awal pengembangan.
2. Kompilasi untuk debugging biasanya memakai `-Wall -Wextra -g -O0`.
3. `gdb` digunakan untuk breakpoint, inspeksi variabel, eksekusi langkah demi langkah, backtrace, dan core dump.
4. `valgrind` digunakan untuk mendeteksi memory leak, use-after-free, double free, out-of-bounds, dan memori belum diinisialisasi.
5. AddressSanitizer mendeteksi banyak bug memori saat runtime.
6. UndefinedBehaviorSanitizer mendeteksi beberapa bentuk undefined behavior.
7. ThreadSanitizer mendeteksi race condition.
8. `strace` menampilkan syscall, sedangkan `ltrace` menampilkan pemanggilan fungsi library.
9. `objdump`, `nm`, `ldd`, dan `file` membantu menganalisis binary, symbol, dan dependensi.
10. Alur debugging yang baik dimulai dari warning compiler, reproduksi bug, sanitizer, lalu tool yang sesuai dengan gejala.

---

## 20.9 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Tulis program yang melakukan dereference pointer `NULL`. Kompilasi dengan `-g`, jalankan di `gdb`, lalu gunakan `run`, `backtrace`, dan `print p`.
2. Jalankan fungsi `faktorial` rekursif di `gdb`. Pasang breakpoint di fungsi tersebut dan gunakan `backtrace` saat rekursi berjalan.
3. Buat memory leak dengan `malloc` tanpa `free`, lalu jalankan `valgrind --leak-check=full`. Tambahkan `free` dan pastikan laporan leak hilang.
4. Buat use-after-free, lalu jalankan dengan `valgrind` dan AddressSanitizer. Bandingkan informasi yang diberikan.
5. Buat signed integer overflow dan jalankan dengan UndefinedBehaviorSanitizer.
6. Buat race condition dari Bab 17 dan jalankan dengan ThreadSanitizer.
7. Jalankan `strace` pada program yang membuka file tidak ada. Temukan syscall yang gagal dan kode error yang muncul.
8. Jalankan `strace -c` pada program yang memanggil `printf` berkali-kali. Periksa jumlah syscall `write`.
9. Jalankan `objdump -d` pada salah satu program. Temukan fungsi `main` dan amati instruksi assembly yang dihasilkan.
10. Bandingkan output `objdump -d` dari program yang dikompilasi dengan `-O0` dan `-O2`.

### Pertanyaan Refleksi

1. Mengapa tool debugging dan analisis sangat penting dalam pemrograman C.
2. Apa fungsi `-g`, `-Wall`, `-Wextra`, dan `-O0`.
3. Mengapa optimasi biasanya dimatikan saat debugging.
4. Informasi apa yang diberikan `backtrace` saat program crash.
5. Apa perbedaan utama antara `valgrind` dan AddressSanitizer.
6. Jenis bug apa yang dapat dideteksi oleh AddressSanitizer, UndefinedBehaviorSanitizer, dan ThreadSanitizer.
7. Kapan `strace` lebih berguna daripada `gdb`.
8. Apa kegunaan `objdump` dan `nm`.
9. Mengapa reproduksi bug penting sebelum debugging.
10. Bagaimana alur debugging sistematis membantu menghindari perubahan kode secara acak.

---

Bab ini membahas tool utama untuk menemukan dan menganalisis bug pada program C. Bab berikutnya membahas undefined behavior dan celah keamanan, termasuk buffer overflow, integer overflow, dan prinsip dasar penulisan kode C yang lebih aman.

