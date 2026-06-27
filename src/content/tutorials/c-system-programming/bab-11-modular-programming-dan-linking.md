---
title: "Bab 11 — Modular Programming & Linking"
description: "Di Bab 10, kita sudah menyentuh proyek multi-file lewat Makefile. Namun kita belum benar-benar membahas bagaimana file-file C yang terpisah disambung menjadi satu..."
tags: [c, system-programming]
order: 11
updated: 2026-06-21
---

> "Compiler melihat satu translation unit pada satu waktu. Linker kemudian menyambung object file dan library menjadi satu program."

Di Bab 10, kita sudah menyentuh proyek multi-file lewat `Makefile`. Namun kita belum benar-benar membahas *bagaimana* file-file C yang terpisah disambung menjadi satu program.

Bab ini menjawab bagian itu dan menghubungkannya kembali dengan Bab 1, terutama tahap linking dan istilah seperti **unresolved symbol**. Ini juga praktis: hampir semua program C nyata terdiri dari banyak file, dan error seperti `undefined reference` atau `multiple definition` biasanya berakar di sini.

---

## 11.1 Kenapa memecah kode ke banyak file?

Menaruh semua kode di satu file besar memang mungkin, tetapi cepat sulit dikelola. Karena itu, program C biasanya dipecah menjadi banyak file. Inilah **modular programming**.

Alasannya:

1. **Keterbacaan dan organisasi** — kode terkait dikelompokkan (`math.c`, `network.c`, `parser.c`).
2. **Compile lebih cepat** — ubah satu file, compile ulang satu file itu saja (incremental build, Bab 10).
3. **Reusability** — modul `mymath.c` bisa dipakai di banyak proyek.
4. **Kerja tim** — orang berbeda menggarap file berbeda.
5. **Enkapsulasi** — sembunyikan detail internal, ekspos hanya yang perlu (lewat `static`, Bagian 11.5).

Dalam pola yang umum, tiap modul biasanya punya sepasang file:

- **`.h` (header)** — antarmuka publik: **deklarasi** fungsi dan tipe yang boleh dipakai modul lain.
- **`.c` (source)** — implementasi: **definisi** sebenarnya.

Header bukan tempat menyalin implementasi ke banyak file. Header memberi compiler informasi yang cukup untuk memeriksa pemanggilan fungsi, ukuran tipe, dan nama symbol yang boleh dipakai. Implementasi tetap berada di `.c`, lalu disambung pada tahap linking.

---

## 11.2 Translation unit: apa yang dilihat compiler

Ini konsep kunci yang menjelaskan banyak hal tentang build C:

> **Compiler bekerja pada satu file `.c` pada satu waktu, secara terisolasi. File `.c` itu, setelah preprocessing dan setelah semua `#include` ditempel, disebut translation unit. Compiler tidak tahu isi file `.c` lain.**

Saat compiler memproses `main.c`, ia tidak melihat isi `mymath.c`. Lalu bagaimana `main.c` bisa memanggil fungsi yang didefinisikan di `mymath.c`?

Jawabannya kembali ke **deklarasi vs definisi** (kita pertama bahas di Bab 1):

- **Deklarasi** = janji bahwa "fungsi/variabel ini ada di suatu tempat, bentuknya begini". Deklarasi tidak mengalokasikan apa pun untuk fungsi atau variabel tersebut.
- **Definisi** = wujud sebenarnya, yaitu body fungsi atau memori variabel.

`main.c` hanya butuh **deklarasi** `tambah` untuk bisa memanggilnya. Dengan deklarasi itu, compiler tahu tipe argumen dan return value-nya, lalu bisa menghasilkan instruksi `call tambah` dengan alamat yang belum terisi. Alamat yang belum terselesaikan ini menjadi **unresolved symbol**.

**Definisi** sebenarnya ada di `mymath.c`, yang di-compile terpisah. Linker yang nanti menyambung keduanya (Bagian 11.4).

Inilah peran header: `mymath.h` berisi deklarasi, lalu di-`#include` oleh `main.c` supaya `main.c` mengenal fungsi-fungsi `mymath` tanpa perlu tahu implementasinya.

Saat `#include "mymath.h"` diproses, preprocessor hanya menempelkan isi header ke translation unit `main.c`. Yang ikut masuk adalah deklarasi, bukan object code dari `mymath.c`. Karena itu, program masih perlu menyertakan `mymath.o` pada tahap link agar symbol yang dipanggil dari `main.o` benar-benar punya definisi.

---

## 11.3 Contoh konkret: proyek tiga file

Mari bangun proyek nyata. Tiga file:

**`mymath.h`** — antarmuka (deklarasi saja):

```c
#ifndef MYMATH_H          // header guard (Bab 10)
#define MYMATH_H

int tambah(int a, int b);          // deklarasi: janji fungsi ini ada
int kali(int a, int b);            // deklarasi

#endif
```

**`mymath.c`** — implementasi (definisi):

```c
#include "mymath.h"       // include header sendiri (lihat catatan di bawah)

int tambah(int a, int b) {         // definisi sebenarnya
    return a + b;
}

int kali(int a, int b) {           // definisi sebenarnya
    return a * b;
}
```

**`main.c`** — pengguna:

```c
#include <stdio.h>
#include "mymath.h"       // dapatkan deklarasi tambah & kali

int main(void) {
    printf("%d\n", tambah(3, 4));   // 7
    printf("%d\n", kali(3, 4));     // 12
    return 0;
}
```

Compile dan link:

```bash
gcc -c mymath.c -o mymath.o    # compile mymath.c -> object file (definisi di sini)
gcc -c main.c   -o main.o      # compile main.c   -> object file (panggilan + lubang)
gcc main.o mymath.o -o program # LINK keduanya jadi executable
./program
```

Dua hal penting dari contoh ini:

1. **Tiap `.c` di-compile terpisah menjadi `.o`.** Saat `main.c` di-compile, ia tidak melihat `mymath.c`; ia hanya mengandalkan deklarasi di `mymath.h`. `main.o` berisi `call tambah` dengan symbol `tambah` yang belum terselesaikan.
2. **`mymath.c` meng-include `mymath.h` sendiri.** Tujuannya agar compiler mengecek bahwa **definisi** di `.c` cocok dengan **deklarasi** di `.h`. Kalau kamu menulis `int tambah(int a, int b)` di `.c` tetapi `int tambah(int a)` di `.h`, compiler bisa langsung memberi error. Ini pengaman yang berharga; biasakan include header sendiri di file implementasinya.

---

## 11.4 Linker: menyambung symbol antar file

Sekarang kita masuk ke peran linker. Setelah punya `main.o` dan `mymath.o`, kita punya dua object file yang masing-masing menyimpan bagian berbeda:

- `main.o` membutuhkan `tambah` dan `kali`, tetapi belum tahu alamatnya. Ini adalah **unresolved symbols**.
- `mymath.o` mendefinisikan `tambah` dan `kali`. Ini adalah **symbol definitions**.

**Linker** (`ld`, biasanya dipanggil oleh `gcc`) mencocokkan keduanya. Untuk tiap unresolved symbol di `main.o`, linker mencari definisinya di object file lain atau library, lalu **mengisi alamat yang benar** ke instruksi `call`. Proses ini disebut **symbol resolution**.

### Symbol table

Tiap object file punya **symbol table**, yaitu daftar nama (symbol) yang ia definisikan dan yang ia butuhkan. Kamu bisa melihatnya dengan `nm`:

```bash
nm main.o
# Contoh output (disederhanakan):
#   U tambah        <- 'U' = Undefined: main.o BUTUH 'tambah' dari luar
#   U kali          <- 'U' = Undefined
#   T main          <- 'T' = Text/code: main.o MENDEFINISIKAN 'main'

nm mymath.o
#   T tambah        <- 'T' = mymath.o MENDEFINISIKAN 'tambah'
#   T kali          <- 'T' = mymath.o MENDEFINISIKAN 'kali'
```

`U` berarti symbol yang dibutuhkan tetapi belum ada (undefined). `T` berarti symbol didefinisikan di object file itu, di section text/code. Linker mencocokkan `U tambah` di `main.o` dengan `T tambah` di `mymath.o`. Jika cocok, alamat terisi dan linking berhasil.

### Dua error linker yang umum

Sekarang dua error umum berikut akan lebih mudah dibaca:

**1. `undefined reference to 'tambah'`** — linker tidak menemukan definisi untuk symbol yang dibutuhkan. Penyebab umum: lupa menyertakan `mymath.o` saat link (`gcc main.o -o program`, lupa `mymath.o`), salah ketik nama fungsi, atau lupa link library yang diperlukan.

Ini error linker, bukan compiler. Kodenya valid secara sintaks, dan compiler sudah cukup puas karena ada deklarasi `tambah`. Masalah baru terlihat ketika semua object file disambung dan tidak ada definisi yang bisa mengisi symbol tersebut.

**2. `multiple definition of 'tambah'`** — ada **dua** definisi untuk symbol yang sama. Penyebab klasik: menaruh **definisi** fungsi, bukan hanya deklarasi, di file header. Ketika header itu di-include banyak `.c`, tiap `.c` punya definisi sendiri, lalu linker menemukan lebih dari satu definisi.

> Pakai aturan praktis ini saat menulis modul C: header (`.h`) berisi **deklarasi** saja, seperti prototype fungsi, `typedef`, deklarasi `extern` variabel, dan macro. **Definisi**, seperti body fungsi dan alokasi variabel global, berada di `.c`. Jika definisi diletakkan di header dan header itu dipakai banyak `.c`, kamu berisiko mendapat `multiple definition`. Pengecualiannya antara lain `static inline` function dan `static` variabel di header, karena `static` membatasi symbol ke tiap file (lihat Bagian 11.5).

---

## 11.5 `static` dan `extern`: mengendalikan visibilitas symbol

Dua keyword ini mengontrol **linkage**, yaitu apakah sebuah symbol terlihat oleh linker dari file lain. Ini dasar enkapsulasi di C.

### `static` (di level file): "privat untuk file ini"

Saat dipakai pada fungsi atau variabel **global** di luar fungsi, `static` membuat symbol hanya berlaku untuk translation unit itu. Symbol tersebut tidak diekspos sebagai nama yang bisa dipakai file lain. Ini disebut **internal linkage**.

```c
// di file mymath.c

static int helper(int x) {        // privat: hanya bisa dipanggil dari mymath.c
    return x * 2;
}

int tambah(int a, int b) {        // publik: bisa dipanggil file lain
    return a + b + helper(0);
}
```

`helper` tidak akan muncul sebagai symbol yang bisa diakses file lain. `nm` menampilkannya sebagai `t` huruf kecil, yaitu local symbol. Kalau `main.c` mencoba memanggil `helper`, linker akan memberi `undefined reference` karena symbol itu tersembunyi dari luar file.

Dengan mekanisme ini, C bisa melakukan **enkapsulasi** tanpa konsep `private` seperti di beberapa bahasa lain. Fungsi publik dibiarkan tanpa `static`, sedangkan helper internal diberi `static` agar tidak menjadi bagian dari antarmuka modul.

> **Catatan:** `static` punya dua makna berbeda di C, dan ini sering menjadi sumber kebingungan.
> 1. **`static` pada global/fungsi** (di sini) memberi internal linkage, sehingga symbol privat ke file.
> 2. **`static` pada variabel lokal** (di dalam fungsi) membuat variabel itu hidup selama **seluruh program** (di data/bss, bukan stack), tapi scope-nya tetap lokal. Nilainya bertahan antar pemanggilan.
> ```c
> int counter(void) {
>     static int n = 0;   // diinisialisasi SEKALI; bertahan antar panggilan
>     return ++n;         // 1, 2, 3, ... tiap dipanggil
> }
> ```
> Keyword-nya sama, tetapi maknanya berbeda tergantung lokasi. Perhatikan konteks pemakaiannya.

### `extern`: "didefinisikan di tempat lain"

`extern` bekerja dari arah sebaliknya. Keyword ini memberi tahu compiler bahwa sebuah variabel atau fungsi memang ada, tetapi definisinya berada di file lain. Ini cara berbagi **variabel global** antar file.

```c
// config.c — DEFINISI (alokasi memori sebenarnya, satu kali)
int jumlah_user = 0;

// config.h — DEKLARASI (janji; tak alokasi)
extern int jumlah_user;     // "variabel ini ada di suatu .c"

// main.c
#include "config.h"
int main(void) {
    jumlah_user = 5;        // akses variabel global dari file lain
    return 0;
}
```

Polanya: **definisi** variabel global berada di satu `.c` (`int jumlah_user = 0;`), sedangkan **deklarasi `extern`** berada di header (`extern int jumlah_user;`) yang di-include file lain. Deklarasi `extern` tidak mengalokasikan storage baru; ia hanya menyatakan bahwa storage aslinya akan ditemukan di tempat lain saat linking.

Tanpa `extern`, menaruh `int jumlah_user;` di header yang di-include banyak file bisa menyebabkan `multiple definition`, karena tiap file ikut mendefinisikannya.

> Fungsi sebenarnya `extern` secara default, jadi deklarasi fungsi di header tidak perlu ditulis `extern`, walaupun boleh. `extern` sering dipakai untuk variabel global bersama. Variabel global bersama berguna, tetapi rawan bug karena state-nya tersebar dan sulit dilacak. Pakai secukupnya.

---

## 11.6 Library: mengemas kode untuk dipakai ulang

Kalau kamu punya kumpulan fungsi yang dipakai banyak proyek, kamu bisa mengemasnya menjadi **library**. Library adalah bundel object code siap pakai. Ada dua jenis utama, dan perbedaannya penting untuk system programming.

### Static library (`.a`) — disalin ke executable

**Static library** adalah arsip berisi banyak `.o`, digabung menjadi satu file `.a`. Saat link, kode yang dipakai dari library **disalin masuk** ke executable-mu.

```bash
# buat object files
gcc -c mymath.c -o mymath.o
gcc -c utils.c  -o utils.o

# arsipkan jadi static library (ar = archiver; konvensi nama: lib<nama>.a)
ar rcs libmylib.a mymath.o utils.o

# link program dengan static library
gcc main.c -L. -lmylib -o program
#            ^^^  ^^^^^^
#            |    -l<nama>: link library bernama "mylib" (cari libmylib.a)
#            -L. : cari library di direktori saat ini
```

Opsi `-L.` menambah direktori saat ini ke daftar tempat linker mencari library. Opsi `-lmylib` tidak berarti mencari file bernama `mylib`; berdasarkan konvensi C toolchain, linker mencari file bernama `libmylib.a` atau `libmylib.so`.

Karakteristik:
- Kode library **menyatu** ke dalam executable saat link. Executable menjadi **lebih besar**, tetapi **mandiri** (self-contained): tidak butuh file library saat dijalankan.
- Update library berarti program harus **di-compile ulang**.

### Shared library (`.so`) — di-load saat runtime

**Shared library** (`.so` = shared object di Linux; `.dll` di Windows, `.dylib` di macOS) **tidak** disalin ke executable. Sebaliknya, executable hanya menyimpan catatan bahwa ia membutuhkan `libmylib.so`. Kode library di-load ke memori **saat program dijalankan** oleh komponen OS bernama **dynamic linker/loader** (`ld.so` di Linux).

```bash
# compile sebagai position-independent code (-fPIC) lalu jadikan shared object
gcc -fPIC -c mymath.c -o mymath.o
gcc -shared mymath.o -o libmylib.so

# link program terhadap shared library
gcc main.c -L. -lmylib -o program

# jalankan (beri tahu loader di mana .so-nya)
LD_LIBRARY_PATH=. ./program
```

Karakteristik:
- Kode library **tidak** berada di executable; ia di-load saat runtime. Executable menjadi **kecil**.
- **Satu copy library di memori bisa dibagi banyak program** sekaligus, karena itu disebut "shared". Ini menghemat RAM. Karena mekanisme ini, banyak program bisa memakai `libc.so` yang sama tanpa masing-masing menyalinnya.
- Library bisa diperbarui tanpa compile ulang program. Jika `.so` diganti, program yang memakainya dapat memakai versi baru saat dijalankan. Kemudahan ini juga bisa menjadi sumber masalah versi jika tidak dikelola hati-hati.
- Namun program **butuh** file `.so` itu ada saat dijalankan. Jika hilang, muncul error seperti `error while loading shared libraries`.

Perhatikan bahwa `LD_LIBRARY_PATH=.` pada contoh di atas hanya memberi tahu dynamic loader agar mencari `.so` di direktori saat ini saat program dijalankan. Ini bukan bagian dari source code dan bukan pengganti linking; program tetap harus di-link terhadap library tersebut agar dependency-nya tercatat.

Lihat shared library apa saja yang dibutuhkan sebuah program:

```bash
ldd ./program       # daftar shared library yang di-link
# contoh: libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 ...
```

### Static vs shared: kapan pakai yang mana

| | **Static (`.a`)** | **Shared (`.so`)** |
|---|---|---|
| Kode | disalin ke executable | di-load saat runtime |
| Ukuran executable | besar | kecil |
| Berbagi RAM antar program | tidak | ya (satu copy dipakai bersama) |
| Update library | compile ulang program | ganti `.so` saja |
| Ketergantungan saat jalan | tak butuh file library | butuh `.so` ada |
| Cocok untuk | distribusi mandiri, embedded | sistem dengan banyak program berbagi lib |

Cara membedakannya sederhana. Static library membuat executable membawa salinan kode yang dibutuhkan, sehingga lebih mandiri tetapi lebih besar. Shared library membuat executable membawa referensi ke kode yang akan tersedia saat runtime, sehingga lebih kecil dan bisa berbagi library dengan program lain, tetapi bergantung pada keberadaan `.so` yang cocok.

`libc` (C standard library yang berisi `printf`, `malloc`, dan lain-lain) biasanya di-link **secara shared** secara default. Karena itu, executable `hello world` dari Bab 1 sebenarnya bergantung pada `libc.so` saat dijalankan. Coba jalankan `ldd` pada executable Bab 1-mu.

---

## 11.7 Gambaran besar: dari banyak file ke satu program

Mari satukan semuanya dalam satu peta (menutup Bab 1, 10, 11):

```
main.c ──preprocess──► (main.i) ──compile──► main.s ──assemble──► main.o ─┐
mymath.c ─────────────────────────────────────────────────────► mymath.o ─┤
                                                                            ├─LINK──► program
                                              libc.so, libmylib.a/.so ──────┘
                                                                            (resolusi symbol)
```

Tiap `.c` menjadi `.o` secara terpisah. Compiler tidak melihat file `.c` lain saat compile. Linker menyambung semua `.o` dan library, menyelesaikan symbol, lalu menghasilkan executable. Untuk shared library, sebagian penyelesaian ditunda sampai runtime oleh dynamic loader.

Inilah arsitektur kompilasi C: file bisa di-compile terpisah lalu disambung, sehingga proyek besar dan library yang bisa dipakai ulang menjadi praktis.

---

## 11.8 Rangkuman model mental

1. **Modular programming** memisahkan antarmuka di `.h` (deklarasi) dan implementasi di `.c` (definisi). Pemisahan ini membuat organisasi kode lebih jelas, compile incremental lebih cepat, reuse lebih mudah, dan enkapsulasi lebih rapi.
2. **Translation unit** adalah satu `.c` beserta header yang di-include, dan itulah yang dilihat compiler **secara terisolasi**. Compiler tidak melihat file `.c` lain, sehingga ia membutuhkan deklarasi lewat header.
3. **Deklarasi vs definisi** menjadi penting saat kode berada di banyak file. Header memberi deklarasi sebagai janji bentuk symbol, sedangkan `.c` memberi definisi sebagai wujud sebenarnya. File implementasi sebaiknya selalu `#include` header sendiri agar compiler memeriksa kecocokan keduanya.
4. **Linker** mencocokkan **unresolved symbol** dengan **definisi** lewat symbol table. `nm` bisa memperlihatkan symbol yang dibutuhkan (`U`) dan symbol yang dimiliki (`T`). `undefined reference` berarti definisi tidak ditemukan; `multiple definition` berarti ada definisi ganda, sering kali karena definisi diletakkan di header.
5. **`static`** pada global/fungsi membuat symbol privat ke file lewat internal linkage. **`static`** pada variabel lokal membuat umurnya sepanjang program. **`extern`** menyatakan bahwa definisi berada di file lain, terutama untuk berbagi variabel global.
6. **Static library (`.a`)** disalin ke executable, sehingga hasilnya lebih besar tetapi mandiri. **Shared library (`.so`)** di-load saat runtime, sehingga executable lebih kecil dan library bisa dibagi antar program, tetapi file `.so` harus tersedia saat program berjalan. `ldd` dipakai untuk melihat dependency shared.

---

## 11.9 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Buat proyek tiga file (`mymath.h`, `mymath.c`, `main.c`) seperti Bagian 11.3. Compile tiap `.c` jadi `.o` terpisah, lalu link. Pastikan jalan.
2. Sengaja **lupa** sertakan `mymath.o` saat link (`gcc main.o -o program`). Apa pesan errornya? Dari compiler atau linker? Jelaskan.
3. Jalankan `nm main.o` dan `nm mymath.o`. Temukan symbol yang `U` (undefined) di `main.o` dan `T` (defined) di `mymath.o`. Cocokkan.
4. Taruh **definisi** fungsi (lengkap dengan body) di `mymath.h`, lalu include di dua `.c` berbeda dan link. Apa errornya? Lalu pindahkan definisi ke `.c` — apakah hilang?
5. Buat fungsi `static helper()` di `mymath.c` dan coba panggil dari `main.c`. Apa kata linker? Kenapa?
6. Tulis fungsi `counter()` dengan `static int n` lokal yang bertambah tiap dipanggil. Panggil 5 kali dan amati. Jelaskan kenapa `n` "ingat" nilainya.
7. Bungkus `mymath.o` jadi static library `libmylib.a` (`ar rcs`), lalu link `main.c` dengannya (`-L. -lmylib`). Lalu buat versi shared `libmylib.so` dan link ulang; jalankan dengan `LD_LIBRARY_PATH=.`.
8. Jalankan `ldd` pada salah satu executable-mu (atau pada `hello` dari Bab 1). Library apa saja yang dibutuhkannya?

**Pertanyaan refleksi:**

1. Apa itu translation unit, dan kenapa fakta "compiler melihat satu file pada satu waktu" menjelaskan kebutuhan akan header & deklarasi?
2. Jelaskan perbedaan tugas compiler dan linker. Di tahap mana `undefined reference` terjadi?
3. Kenapa header sebaiknya berisi deklarasi saja, bukan definisi? Apa yang terjadi kalau dilanggar?
4. Apa dua makna berbeda `static` di C? Beri contoh masing-masing.
5. Kapan kamu memakai `extern`? Apa masalahnya kalau variabel global didefinisikan langsung di header?
6. Jelaskan perbedaan static library dan shared library. Sebutkan satu kelebihan & satu kekurangan masing-masing.
7. Kenapa banyak program bisa "berbagi" satu `libc.so`? Apa keuntungannya bagi sistem?

---

Kita sudah membahas cara membangun program C utuh dari banyak bagian. Di Bab 12, program mulai **berinteraksi dengan dunia luar** melalui **File & I/O**. Di sana kita akan membahas **file descriptor**, perbedaan syscall mentah (`open`/`read`/`write`) dan `stdio` (`fopen`/`printf`/`FILE*`), serta bagaimana **buffering** membuat output kadang tertahan sebelum benar-benar muncul.
