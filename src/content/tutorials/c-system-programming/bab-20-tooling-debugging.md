---
title: "Bab 20 — Tooling: Debugging & Analisis"
description: "Sepanjang buku ini kita beberapa kali menyebut gdb, valgrind, AddressSanitizer, strace, dan objdump. Sekarang kita kumpulkan dalam satu bab. Tooling penting di C..."
tags: [c, system-programming]
order: 20
updated: 2026-06-20
---

> "Saat program C crash atau menghasilkan data yang salah, menebak biasanya tidak cukup. Tool seperti `gdb`, sanitizer, `valgrind`, dan `strace` membantu melihat apa yang terjadi di dalam program dan di batas antara program dengan sistem."

Sepanjang buku ini kita beberapa kali menyebut `gdb`, `valgrind`, AddressSanitizer, `strace`, dan `objdump`. Sekarang kita kumpulkan dalam satu bab. Tooling penting di C karena, seperti kita tekankan sejak Bab 1, **C tidak banyak melindungimu**. Tidak ada exception yang otomatis menunjuk baris error, tidak ada garbage collector, dan banyak bug memori baru terlihat setelah efeknya menyebar. Data bisa korup perlahan, crash bisa muncul jauh dari penyebabnya, dan perilaku program bisa berubah-ubah.

Bab ini bukan referensi lengkap untuk tiap tool. Fokusnya adalah peta praktis: tool mana cocok untuk gejala apa, dan contoh minimal untuk mulai memakainya.

---

## 20.1 Persiapan: compile untuk debugging

Sebelum tool debugging benar-benar berguna, biasakan compile dengan flag yang tepat (ingat Bab 1 dan 10):

```bash
gcc -Wall -Wextra -g -O0 program.c -o program
```

- **`-Wall -Wextra`** menyalakan warning. Warning adalah lapisan debugging pertama dan murah. Banyak bug seperti signed/unsigned mismatch, uninitialized variable, dan format mismatch bisa terlihat di sini sebelum program berjalan. Untuk latihan dan development, perlakukan warning sebagai error.
- **`-g`** menyertakan **debug info** seperti nama variabel, nomor baris, dan tipe. Tanpa ini, `gdb` hanya menampilkan alamat mentah, bukan kode sumbermu. Flag ini penting untuk debugging.
- **`-O0`** mematikan optimasi. Optimasi compiler bisa menyusun ulang atau menghapus kode, sehingga debugging membingungkan karena eksekusi tampak "loncat-loncat" antar baris. Saat debug, pakai `-O0`.

Pelajaran praktisnya: **debugging dimulai dari pencegahan.** Warning yang dinyalakan dan sanitizer (Section 20.4) sering menangkap bug sebelum kamu perlu masuk ke `gdb`.

---

## 20.2 `gdb`: debugger — melihat program saat berjalan

**`gdb`** (GNU Debugger) membiarkanmu menjeda program, memeriksa nilai variabel, melangkah baris demi baris, dan melihat alur eksekusi secara langsung. Ini bukan pengganti total untuk `printf`, tetapi memberi kontrol yang jauh lebih besar saat bug tidak jelas.

```bash
gdb ./program
```

Perintah esensial di dalam gdb:

| Perintah | Singkatan | Fungsi |
|----------|-----------|--------|
| `run [args]` | `r` | jalankan program |
| `break main` / `break file.c:42` | `b` | pasang breakpoint (titik jeda) |
| `next` | `n` | eksekusi satu baris (lewati pemanggilan fungsi) |
| `step` | `s` | eksekusi satu baris (masuk ke fungsi) |
| `continue` | `c` | lanjut sampai breakpoint berikutnya |
| `print x` | `p x` | tampilkan nilai variabel/ekspresi |
| `backtrace` | `bt` | tampilkan **call stack** (rantai pemanggilan fungsi) |
| `info locals` | | tampilkan semua variabel lokal |
| `quit` | `q` | keluar |

### Use case 1: membedah crash (segfault)

Ini skenario paling umum. Program crash dengan "Segmentation fault" (ingat Bab 6 dan 15; itu `SIGSEGV`). Dengan gdb, kamu bisa mencari **baris mana** yang crash dan nilai apa yang menyebabkannya.

```bash
gdb ./program
(gdb) run
# ... program crash ...
Program received signal SIGSEGV, Segmentation fault.
0x... in proses () at program.c:15
15          *p = 42;            # <- gdb menunjuk baris crash!
(gdb) print p
$1 = (int *) 0x0                # <- p adalah NULL! itu penyebabnya
(gdb) backtrace
#0  proses () at program.c:15
#1  main () at program.c:8      # <- dipanggil dari main baris 8
```

Dalam tiga perintah, kamu tahu crash terjadi di baris 15 karena `p` adalah `NULL`, dan pemanggilnya adalah `main` baris 8. **`backtrace` adalah salah satu perintah gdb paling penting**: ia menampilkan call stack (ingat stack frame Bab 4) dan menunjukkan rantai "siapa memanggil siapa" sampai ke titik crash.

### Use case 2: melihat stack frame (menghidupkan Bab 4)

```bash
(gdb) break faktorial
(gdb) run
(gdb) backtrace      # saat rekursi dalam, lihat tumpukan frame menumpuk!
#0  faktorial (n=1) at f.c:4
#1  faktorial (n=2) at f.c:6
#2  faktorial (n=3) at f.c:6
#3  faktorial (n=4) at f.c:6
#4  main () at f.c:11
```

Inilah stack frame dari Bab 4 dalam bentuk yang bisa diperiksa langsung. Tiap baris adalah satu frame, dengan nilai `n` masing-masing. Ini menunjukkan bahwa tiap pemanggilan rekursif punya konteks terpisah.

> gdb juga bisa membaca **core dump**, yaitu snapshot memori yang dibuat saat crash (ingat Bab 15: `SIGSEGV` dapat menghasilkan core dump). `gdb ./program core` membantumu menganalisis crash setelah kejadian, bahkan tanpa menjalankan ulang program.

---

## 20.3 `valgrind`: detektif memori

**`valgrind`** membantu menemukan masalah memori dari Bab 9, seperti leak, use-after-free, dan double free, serta jebakan Bab 5 seperti out-of-bounds. Ia menjalankan program di atas lapisan instrumentasi yang mengawasi **setiap** akses memori.

```bash
valgrind ./program
valgrind --leak-check=full ./program      # detail kebocoran
```

### Mendeteksi memory leak (Bab 9)

```c
int *p = malloc(100);
// lupa free(p)
```

```bash
valgrind --leak-check=full ./program
# ...
# LEAK SUMMARY:
#    definitely lost: 100 bytes in 1 blocks
#    at malloc (...)
#    by main (program.c:5)        <- valgrind menunjuk baris malloc yang bocor!
```

valgrind menunjukkan **baris tempat memori yang bocor dialokasikan**. Ini alasan di Bab 9 kita berulang kali memakai valgrind saat membahas manajemen memori manual.

### Mendeteksi use-after-free & out-of-bounds

```c
int *p = malloc(sizeof(int));
free(p);
*p = 5;                  // use-after-free
```

```bash
valgrind ./program
# Invalid write of size 4
#    at main (program.c:7)        <- baris yang menulis ke memori bebas
#  Address 0x... is 0 bytes inside a block of size 4 free'd
#    at free (...)                 <- dan di mana ia di-free
```

valgrind menangkap akses ke memori yang sudah di-`free`, akses di luar batas array, membaca memori tak-terinisialisasi (`malloc` yang belum ditulis; Bab 9), dan banyak lagi. Laporannya memberi lokasi yang membantu mengubah bug "kadang crash kadang tidak" menjadi kasus yang bisa ditelusuri.

**Kapan valgrind vs sanitizer?** valgrind tidak perlu compile ulang khusus karena bisa berjalan pada binary biasa, tetapi membuat program **jauh lebih lambat** (10-50x). Sanitizer lebih cepat, tetapi perlu recompile dengan flag khusus. Keduanya saling melengkapi.

---

## 20.4 Sanitizers: detektor bug bawaan compiler

**Sanitizers** adalah instrumentasi yang ditanam compiler ke dalam program untuk mendeteksi bug saat runtime. Kamu cukup menambahkan flag saat compile. Sanitizer biasanya lebih cepat dari valgrind dan sering memberi pesan yang lebih langsung.

**AddressSanitizer (ASan)** — mendeteksi bug memori (out-of-bounds, use-after-free, leak):

```bash
gcc -fsanitize=address -g program.c -o program
./program
# Langsung crash dengan laporan rinci saat bug terjadi:
# ==12345==ERROR: AddressSanitizer: heap-buffer-overflow ...
#    #0 main program.c:7
```

**UndefinedBehaviorSanitizer (UBSan)** — mendeteksi **undefined behavior** (ingat Bab 2 dan Bab 21): signed integer overflow, shift berlebihan, dereference misaligned, dll:

```bash
gcc -fsanitize=undefined -g program.c -o program
./program
# program.c:5:10: runtime error: signed integer overflow: 2147483647 + 1 ...
```

**ThreadSanitizer (TSan)** — mendeteksi **race condition** (Bab 17):

```bash
gcc -fsanitize=thread -g program.c -o program -pthread
```

> Praktik yang sangat berguna saat development: compile dengan `-fsanitize=address,undefined`. Ini menangkap banyak bug memori dan UB secara otomatis, langsung saat terjadi, bukan beberapa baris kemudian. ASan dan TSan tidak bisa dipakai bersamaan; pilih sesuai jenis bug. Untuk build produksi, sanitizer biasanya dimatikan karena ada overhead.

Sanitizer menjadi jaring pengaman praktis untuk bahasa yang tidak banyak melakukan pengecekan runtime secara default.

---

## 20.5 `strace` & `ltrace`: mengintip interaksi dengan sistem

Tool ini sudah kita kenalkan di Bab 19. **`strace`** menampilkan setiap **syscall**; **`ltrace`** menampilkan setiap pemanggilan **fungsi library**.

```bash
strace ./program          # semua syscall + argumen + return
strace -c ./program       # ringkasan: hitungan & waktu per syscall
ltrace ./program          # pemanggilan fungsi library (malloc, printf, dll)
```

Kapan dipakai:

- Program "menggantung" — `strace` menunjukkan syscall mana yang memblokir, misalnya `read` menunggu input atau `accept` menunggu koneksi (Bab 18).
- Program gagal dengan gejala yang tidak jelas — `strace` menunjukkan syscall yang gagal dan `errno`-nya, misalnya `openat(...) = -1 ENOENT` -> file tidak ada.
- Memahami program orang lain (atau closed-source) — lihat file apa yang ia buka dan koneksi apa yang ia buat.

`strace` melihat program dari "luar", yaitu interaksinya dengan kernel. gdb melihat program dari "dalam", yaitu variabel dan alur eksekusinya. Keduanya memberi sudut pandang berbeda yang saling melengkapi.

---

## 20.6 `objdump` & `nm`: membongkar binary

Untuk melihat level machine code dan symbol (menutup Bab 1 dan 11), dua tool ini sering dipakai.

**`objdump -d`** — **disassemble**: menampilkan machine code program sebagai assembly. Ini cara melihat instruksi yang akhirnya dijalankan CPU (ingat Bab 1 dan 3):

```bash
objdump -d program | less
# main:
#   push   rbp
#   mov    rbp, rsp
#   ...                          <- assembly dari kode-mu (Bab 4!)
```

Berguna untuk memahami apa yang compiler hasilkan, melihat efek optimasi (bandingkan `-O0` vs `-O2`), dan debugging tingkat rendah.

**`nm`** — menampilkan daftar **symbol** sebuah object file atau executable (sudah kita pakai di Bab 11):

```bash
nm program.o
#   U printf          <- Undefined: butuh dari luar (akan di-link)
#   T main            <- Text: didefinisikan di sini
```

Berguna untuk men-debug masalah linking (`undefined reference`, Bab 11), karena kamu bisa mengecek symbol mana yang ada atau hilang.

**`ldd`** (Bab 11) menampilkan daftar shared library yang dibutuhkan executable. **`file`** mengidentifikasi jenis file, misalnya ELF executable atau object file. Tool kecil seperti ini menghubungkan pembahasan Bab 1, 11, dan 19.

---

## 20.7 Alur debugging yang waras

Punya banyak tool tidak cukup kalau tidak ada metode. Berikut alur praktis saat menghadapi bug:

1. **Baca pesan compiler.** Nyalakan `-Wall -Wextra`. Banyak bug selesai di sini.
2. **Reproduksi konsisten.** Bug yang tidak bisa direproduksi sulit diperbaiki dengan andal. Cari input atau kondisi minimal yang memicunya.
3. **Pakai sanitizer dulu** (`-fsanitize=address,undefined`). Untuk bug memori/UB, ini sering langsung menunjuk akar masalah.
4. **Crash? Pakai gdb** — `run`, lalu `backtrace` saat crash. Lihat baris dan nilai variabel.
5. **Bug memori halus / leak? Pakai valgrind.**
6. **Masalah dengan file/jaringan/menggantung? Pakai strace.**
7. **Bug logika (bukan crash)? Pakai gdb** dengan breakpoint dan `print`, langkahi kode, lalu periksa nilai di titik-titik penting.
8. **Uji asumsimu.** Bug sering bersembunyi di tempat yang kamu anggap benar. Verifikasi, jangan hanya mengandalkan dugaan.

> Debugging bukan menebak; ia **investigasi sistematis**. Tiap tool memberi sudut pandang: gdb (alur dan state internal), valgrind/ASan (memori), strace (interaksi sistem), objdump (machine code). Tujuannya adalah mempersempit masalah secara metodis, bukan mengubah kode acak sambil berharap bug hilang.

---

## 20.8 Rangkuman model mental

1. C tidak banyak melindungimu, sehingga tool debugging dan analisis sangat penting.
2. **Compile untuk debug:** `-Wall -Wextra` (warning = lapisan pertama), `-g` (debug info untuk gdb), `-O0` (tanpa optimasi saat debug).
3. **`gdb`** — debugger: jeda, periksa variabel, langkahi baris. **`backtrace`** (call stack — Bab 4) untuk crash; `print` untuk nilai; bisa baca core dump.
4. **`valgrind`** — detektif memori: leak, use-after-free, out-of-bounds, uninitialized (Bab 5 & 9), dengan lokasi presisi. Lambat tapi jalan pada binary biasa.
5. **Sanitizers** (`-fsanitize=address,undefined,thread`) — instrumentasi compiler: bug memori (ASan), undefined behavior (UBSan, Bab 2/21), race (TSan, Bab 17). Sangat berguna saat development.
6. **`strace`/`ltrace`** — interaksi dengan sistem (syscall/library), untuk hang, gagal misterius, memahami program.
7. **`objdump -d`** (disassemble -> machine code), **`nm`** (symbol -> debug linking), **`ldd`/`file`**. Menutup Bab 1, 11, 19.
8. **Alur yang sehat:** warning -> reproduksi -> sanitizer -> gdb/valgrind/strace sesuai gejala. Debugging = investigasi sistematis, bukan menebak.

---

## 20.9 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program yang dereference NULL (crash). Compile dengan `-g`, jalankan di `gdb`: `run`, lalu `backtrace` dan `print p`. Temukan baris & penyebab crash. Bandingkan dengan menebak tanpa gdb.
2. Hidupkan kembali Bab 4: jalankan fungsi `faktorial` rekursif di gdb, pasang `break faktorial`, dan `backtrace` di kedalaman rekursi. Lihat stack frame menumpuk dengan nilai `n` masing-masing.
3. Buat memory leak (malloc tanpa free) dan jalankan `valgrind --leak-check=full`. Temukan baris yang bocor. Lalu tambahkan `free` dan konfirmasi "no leaks".
4. Buat use-after-free, jalankan dengan valgrind DAN dengan `-fsanitize=address`. Bandingkan kedua laporan — mana lebih jelas/cepat menurutmu?
5. Buat signed integer overflow (Bab 2) dan jalankan dengan `-fsanitize=undefined`. Apakah UBSan menangkapnya? Apa pesannya?
6. Buat race condition dari Bab 17 dan jalankan dengan `-fsanitize=thread`. Baca laporan race-nya.
7. `strace` sebuah program yang membuka file tak ada. Temukan syscall yang gagal & `errno`-nya. Lalu `strace -c` program yang `printf` banyak — berapa syscall `write`?
8. `objdump -d` salah satu programmu. Temukan fungsi `main` dan kenali prolog (`push rbp`) & epilog (Bab 4). Bandingkan disassembly `-O0` vs `-O2`.

**Pertanyaan refleksi:**

1. Kenapa tools sangat penting di C secara khusus (dibanding bahasa dengan exception/GC)?
2. Apa fungsi `-g`, `-Wall`, dan `-O0` saat debugging? Kenapa optimasi dimatikan?
3. Apa perintah gdb terpenting saat program crash, dan informasi apa yang ia berikan? Hubungkan dengan Bab 4.
4. Apa beda valgrind dan AddressSanitizer? Kapan kamu memilih masing-masing?
5. Sebutkan tiga jenis bug yang ditangkap sanitizer, dan kaitkan tiap satu dengan bab yang membahas bug itu.
6. Kapan `strace` lebih berguna daripada `gdb`? Berikan dua skenario.
7. Jelaskan alur debugging sistematis. Kenapa "menebak & ubah kode acak" itu pendekatan buruk?

---

Kita sudah punya alat untuk menemukan dan menganalisis bug. Berikutnya, kita membahas satu kategori bug yang sangat penting dalam C: **undefined behavior** dan celah keamanan.

Di **Bab 21**, kita membahas apa itu UB, kenapa compiler boleh membuat asumsi agresif, bagaimana **buffer overflow** bisa menimpa return address, apa risiko integer overflow, dan bagaimana bug C dapat berubah menjadi celah keamanan serta cara mengurangi risikonya.
