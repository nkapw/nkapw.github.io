---
title: "Bab 11 - Modular Programming dan Linking"
description: "Pada Bab 10, proyek multi-file telah diperkenalkan melalui Makefile. Bab ini membahas cara beberapa file C dikompilasi secara terpisah, ditautkan oleh linker, lalu..."
tags: [c, systems-programming]
order: 11
updated: 2026-07-02
---
Pada Bab 10, proyek multi-file telah diperkenalkan melalui `Makefile`. Bab ini membahas cara beberapa file C dikompilasi secara terpisah, ditautkan oleh linker, lalu menghasilkan satu program yang dapat dijalankan.

Materi ini penting karena hampir semua program C berukuran menengah hingga besar terdiri dari banyak file. Pesan kesalahan seperti `undefined reference` dan `multiple definition` umumnya muncul dari hubungan antara kompilasi per file dan proses linking. Dengan memahami alurnya, pesan tersebut dapat dibaca sebagai informasi teknis yang menunjukkan lokasi masalah.

---

## 11.1 Alasan Memecah Kode ke Banyak File

Menempatkan seluruh kode dalam satu file memang mungkin, tetapi pendekatan tersebut sulit dipelihara ketika program berkembang. Modular programming memecah program menjadi bagian-bagian yang lebih kecil dengan tanggung jawab yang jelas.

Manfaat utamanya meliputi hal berikut.

1. **Keterbacaan dan organisasi**. Kode yang berkaitan dapat dikelompokkan dalam file seperti `math.c`, `network.c`, atau `parser.c`.
2. **Kompilasi lebih efisien**. Ketika satu file berubah, hanya file tersebut yang perlu dikompilasi ulang sebelum proses linking.
3. **Pemakaian ulang**. Modul seperti `mymath.c` dapat digunakan kembali di beberapa proyek.
4. **Kerja tim lebih teratur**. Beberapa pengembang dapat mengerjakan file berbeda tanpa sering mengubah satu file besar yang sama.
5. **Enkapsulasi**. Detail implementasi dapat disembunyikan, sementara antarmuka publik tetap jelas.

Pola yang umum digunakan adalah memasangkan file header dan file sumber.

- **`.h` atau header** berisi antarmuka publik, seperti deklarasi fungsi, tipe data, makro, dan deklarasi `extern`.
- **`.c` atau file sumber** berisi implementasi, yaitu definisi fungsi dan data yang benar-benar dialokasikan.

---

## 11.2 Translation Unit dan Cara Kerja Compiler

Konsep penting dalam kompilasi C adalah **translation unit**. Translation unit adalah satu file `.c` setelah tahap preprocessing selesai, termasuk seluruh isi header yang masuk melalui `#include`.

Compiler memproses satu translation unit pada satu waktu. Saat compiler memproses `main.c`, compiler tidak membaca isi `mymath.c`. Karena itu, `main.c` memerlukan deklarasi fungsi yang akan dipanggil, meskipun definisi fungsi tersebut berada di file lain.

Perbedaan antara deklarasi dan definisi menjadi penting pada titik ini.

- **Deklarasi** menyatakan bahwa sebuah fungsi atau variabel tersedia dengan bentuk tertentu. Deklarasi tidak membuat isi fungsi dan tidak selalu mengalokasikan memori.
- **Definisi** menyediakan bentuk sebenarnya. Untuk fungsi, definisi berisi isi fungsi. Untuk variabel global, definisi mengalokasikan penyimpanan.

`main.c` hanya memerlukan deklarasi `tambah` agar compiler mengetahui tipe argumen dan nilai kembalian fungsi tersebut. Compiler kemudian dapat menghasilkan instruksi pemanggilan dengan simbol yang belum diselesaikan. Definisi sebenarnya berada di `mymath.c`, yang dikompilasi secara terpisah. Linker menyelesaikan hubungan tersebut pada tahap berikutnya.

Header berperan sebagai tempat deklarasi bersama. File `mymath.h` berisi deklarasi fungsi dari modul `mymath`, lalu di-`#include` oleh `main.c`. Dengan cara ini, compiler dapat memeriksa pemanggilan fungsi tanpa mengetahui detail implementasinya.

---

## 11.3 Contoh Proyek Tiga File

Contoh berikut menunjukkan bentuk dasar proyek C yang terdiri dari header, implementasi, dan file pengguna.

**`mymath.h`**

```c
#ifndef MYMATH_H
#define MYMATH_H

int tambah(int a, int b);
int kali(int a, int b);

#endif
```

**`mymath.c`**

```c
#include "mymath.h"

int tambah(int a, int b) {
    return a + b;
}

int kali(int a, int b) {
    return a * b;
}
```

**`main.c`**

```c
#include <stdio.h>
#include "mymath.h"

int main(void) {
    printf("%d\n", tambah(3, 4));
    printf("%d\n", kali(3, 4));
    return 0;
}
```

Kompilasi dan linking dilakukan secara bertahap.

```bash
gcc -c mymath.c -o mymath.o
gcc -c main.c -o main.o
gcc main.o mymath.o -o program
./program
```

Ada dua hal yang perlu diperhatikan.

1. Setiap file `.c` dikompilasi secara terpisah menjadi file `.o`. Saat `main.c` dikompilasi, compiler hanya melihat deklarasi dari `mymath.h`, bukan implementasi dalam `mymath.c`.
2. File implementasi sebaiknya menyertakan header miliknya sendiri. Dengan menulis `#include "mymath.h"` di `mymath.c`, compiler dapat memastikan deklarasi di header sesuai dengan definisi di file sumber. Jika prototipe di header berbeda dari definisi di file sumber, kesalahan dapat terdeteksi lebih awal.

---

## 11.4 Linker dan Simbol Antar File

Setelah `main.o` dan `mymath.o` dibuat, masing-masing file objek menyimpan informasi simbol.

- `main.o` memiliki pemanggilan ke `tambah` dan `kali`, tetapi belum memiliki alamat final untuk kedua fungsi tersebut.
- `mymath.o` memiliki definisi `tambah` dan `kali`.

Linker mencocokkan simbol yang dibutuhkan oleh satu file objek dengan definisi yang tersedia di file objek lain atau di library. Proses ini disebut **resolusi simbol**. Jika semua simbol yang dibutuhkan berhasil ditemukan, linker menghasilkan executable.

### Tabel Simbol

Setiap file objek memiliki **tabel simbol**. Tabel ini menyimpan nama simbol yang didefinisikan oleh file tersebut dan simbol yang masih dibutuhkan dari luar. Isi tabel simbol dapat dilihat dengan `nm`.

```bash
nm main.o
# Contoh output yang disederhanakan
#   U tambah        <- main.o membutuhkan tambah dari luar
#   U kali          <- main.o membutuhkan kali dari luar
#   T main          <- main.o mendefinisikan main

nm mymath.o
#   T tambah        <- mymath.o mendefinisikan tambah
#   T kali          <- mymath.o mendefinisikan kali
```

Huruf `U` menunjukkan simbol yang belum terdefinisi di file objek tersebut. Huruf `T` menunjukkan simbol yang didefinisikan di bagian text atau kode. Linker mencocokkan `U tambah` di `main.o` dengan `T tambah` di `mymath.o`.

### Error Linker yang Umum

**`undefined reference to 'tambah'`**

Pesan ini berarti linker tidak menemukan definisi untuk simbol yang dibutuhkan. Penyebab yang umum adalah lupa menyertakan `mymath.o` saat linking, salah menulis nama fungsi, atau lupa menautkan library yang diperlukan. Ini adalah error linker, bukan error compiler. Kode dapat valid secara sintaks, tetapi executable tidak dapat dibuat karena masih ada simbol yang belum ditemukan.

**`multiple definition of 'tambah'`**

Pesan ini berarti ada lebih dari satu definisi untuk simbol yang sama. Penyebab yang sering terjadi adalah definisi fungsi ditulis di header, lalu header tersebut di-`include` oleh beberapa file `.c`. Akibatnya, setiap translation unit memiliki salinan definisi yang sama, dan linker tidak dapat menerima lebih dari satu definisi untuk simbol tersebut.

Dalam C modular, header sebaiknya berisi deklarasi, prototipe fungsi, `typedef`, deklarasi `extern`, dan makro. Definisi fungsi serta alokasi variabel global ditempatkan di file `.c`. Pengecualian tertentu seperti `static inline` memerlukan pembahasan khusus, tetapi aturan umum tersebut sudah memadai untuk sebagian besar kode C.

---

## 11.5 `static` dan `extern`

Kata kunci `static` dan `extern` mengatur **linkage**, yaitu aturan tentang apakah sebuah simbol dapat terlihat dari translation unit lain.

### `static` pada Level File

Jika digunakan pada fungsi atau variabel global, `static` memberikan **internal linkage**. Simbol tersebut hanya berlaku di translation unit tempat ia didefinisikan.

```c
// mymath.c

static int helper(int x) {
    return x * 2;
}

int tambah(int a, int b) {
    return a + b + helper(0);
}
```

Fungsi `helper` hanya dapat dipanggil dari `mymath.c`. File lain tidak dapat mengaksesnya secara langsung. Dengan pendekatan ini, modul dapat menyediakan fungsi publik tanpa membuka detail implementasi internal.

`static` juga memiliki arti lain jika digunakan pada variabel lokal di dalam fungsi. Variabel lokal `static` memiliki masa hidup selama program berjalan, tetapi scope-nya tetap berada di dalam fungsi.

```c
int counter(void) {
    static int n = 0;
    return ++n;
}
```

Pada contoh tersebut, `n` diinisialisasi satu kali dan nilainya tetap tersimpan di antara pemanggilan fungsi.

### `extern`

`extern` menyatakan bahwa sebuah variabel didefinisikan di file lain. Pola ini digunakan ketika beberapa file perlu mengakses variabel global yang sama.

```c
// config.c
int jumlah_user = 0;

// config.h
extern int jumlah_user;

// main.c
#include "config.h"

int main(void) {
    jumlah_user = 5;
    return 0;
}
```

Definisi variabel global ditempatkan satu kali di file `.c`. Header hanya memuat deklarasi `extern`. Jika `int jumlah_user;` ditulis langsung di header dan header tersebut di-`include` oleh banyak file, program berisiko mengalami `multiple definition`.

Deklarasi fungsi pada header pada dasarnya sudah memiliki external linkage, sehingga `extern` jarang perlu ditulis untuk fungsi. Untuk variabel global bersama, `extern` tetap penting. Meski demikian, variabel global sebaiknya digunakan secara terbatas karena dapat membuat alur perubahan data lebih sulit dilacak.

---

## 11.6 Library

Library mengemas kode objek agar dapat digunakan ulang oleh program lain. Dalam C, dua bentuk library yang umum adalah static library dan shared library.

### Static Library `.a`

Static library adalah arsip berisi satu atau lebih file `.o`. Saat linking, kode yang diperlukan dari library disalin ke executable.

```bash
gcc -c mymath.c -o mymath.o
gcc -c utils.c -o utils.o

ar rcs libmylib.a mymath.o utils.o

gcc main.c -L. -lmylib -o program
```

Pada perintah di atas, `-L.` meminta linker mencari library di direktori saat ini. Opsi `-lmylib` meminta linker menautkan library bernama `libmylib.a` atau bentuk lain yang cocok dengan nama `mylib`.

Karakteristik static library meliputi hal berikut.

- Kode yang digunakan dari library masuk ke executable saat linking.
- Ukuran executable cenderung lebih besar.
- Executable dapat lebih mandiri karena tidak memerlukan file library tersebut saat dijalankan.
- Jika library diperbarui, program perlu di-link ulang agar memakai versi baru.

### Shared Library `.so`

Shared library tidak disalin ke executable. Executable menyimpan informasi bahwa ia membutuhkan library tertentu, lalu library dimuat ke memori saat program dijalankan oleh dynamic linker atau loader.

```bash
gcc -fPIC -c mymath.c -o mymath.o
gcc -shared mymath.o -o libmylib.so

gcc main.c -L. -lmylib -o program

LD_LIBRARY_PATH=. ./program
```

Karakteristik shared library meliputi hal berikut.

- Kode library tidak masuk langsung ke executable.
- Ukuran executable cenderung lebih kecil.
- Satu salinan library di memori dapat dipakai bersama oleh beberapa program.
- Library dapat diperbarui tanpa mengompilasi ulang program, selama kompatibilitas antarmuka tetap dijaga.
- Program membutuhkan file `.so` yang sesuai saat dijalankan.

Daftar shared library yang dibutuhkan sebuah program dapat dilihat dengan `ldd`.

```bash
ldd ./program
# libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 ...
```

### Perbandingan Static dan Shared Library

| Aspek | Static `.a` | Shared `.so` |
|---|---|---|
| Penempatan kode | Disalin ke executable | Dimuat saat runtime |
| Ukuran executable | Lebih besar | Lebih kecil |
| Pemakaian memori bersama | Tidak | Ya |
| Pembaruan library | Perlu link ulang | Dapat diganti tanpa link ulang jika kompatibel |
| Ketergantungan saat runtime | Tidak memerlukan file library terpisah | Memerlukan file `.so` |
| Cocok untuk | Distribusi mandiri dan embedded | Sistem dengan banyak program yang berbagi library |

`libc`, yaitu C standard library yang menyediakan fungsi seperti `printf` dan `malloc`, biasanya ditautkan sebagai shared library secara default. Karena itu, executable sederhana seperti program `hello world` tetap dapat bergantung pada `libc.so` saat dijalankan.

---

## 11.7 Dari Banyak File Menjadi Satu Program

Alur umum kompilasi program C multi-file dapat dilihat sebagai berikut.

```text
main.c   -> preprocess -> compile -> assemble -> main.o   \
mymath.c -> preprocess -> compile -> assemble -> mymath.o  -> link -> program
library  ----------------------------------------------- /
```

Setiap file `.c` dikompilasi menjadi `.o` secara terpisah. Linker kemudian menggabungkan file objek dan library, menyelesaikan simbol yang dibutuhkan, lalu menghasilkan executable. Untuk shared library, sebagian penyelesaian dilakukan saat runtime oleh dynamic loader.

Arsitektur ini memungkinkan proyek besar dikompilasi bertahap. File yang tidak berubah tidak perlu dikompilasi ulang, sementara library dapat digunakan kembali oleh banyak program.

---

## 11.8 Rangkuman Model Mental

1. Modular programming memisahkan antarmuka di `.h` dan implementasi di `.c`.
2. Translation unit adalah satu file `.c` setelah preprocessing, termasuk header yang masuk melalui `#include`.
3. Compiler memproses satu translation unit pada satu waktu, sehingga deklarasi di header diperlukan agar pemanggilan fungsi dapat diperiksa.
4. Deklarasi menyatakan bentuk simbol, sedangkan definisi menyediakan implementasi atau penyimpanan sebenarnya.
5. Linker mencocokkan simbol yang dibutuhkan dengan definisi yang tersedia di file objek atau library.
6. `undefined reference` muncul ketika linker tidak menemukan definisi simbol yang dibutuhkan.
7. `multiple definition` muncul ketika simbol yang sama didefinisikan lebih dari satu kali.
8. `static` pada level file membatasi simbol agar hanya terlihat di translation unit tersebut.
9. `static` pada variabel lokal membuat variabel bertahan selama program berjalan, meskipun scope-nya tetap lokal.
10. `extern` digunakan untuk mendeklarasikan variabel global yang definisinya berada di file lain.
11. Static library menyalin kode yang diperlukan ke executable, sedangkan shared library dimuat saat runtime.

---

## 11.9 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Buat proyek tiga file `mymath.h`, `mymath.c`, dan `main.c` seperti contoh pada bagian 11.3. Kompilasi setiap file `.c` menjadi `.o`, lalu lakukan linking.
2. Lakukan linking hanya dengan `gcc main.o -o program` tanpa menyertakan `mymath.o`. Catat pesan error yang muncul dan tentukan apakah error tersebut berasal dari compiler atau linker.
3. Jalankan `nm main.o` dan `nm mymath.o`. Temukan simbol yang ditandai `U` di `main.o` dan simbol yang ditandai `T` di `mymath.o`.
4. Pindahkan definisi lengkap fungsi ke `mymath.h`, lalu sertakan header tersebut di dua file `.c` berbeda. Link program dan amati error yang muncul. Setelah itu, pindahkan kembali definisi fungsi ke `.c`.
5. Buat fungsi `static helper()` di `mymath.c`, lalu coba panggil fungsi tersebut dari `main.c`. Amati pesan dari linker.
6. Tulis fungsi `counter()` dengan variabel lokal `static int n`. Panggil fungsi tersebut beberapa kali dan amati perubahan nilainya.
7. Bentuk `mymath.o` menjadi static library `libmylib.a` dengan `ar rcs`, lalu link `main.c` menggunakan `-L. -lmylib`.
8. Buat shared library `libmylib.so`, link ulang program, lalu jalankan dengan `LD_LIBRARY_PATH=.`.
9. Jalankan `ldd` pada salah satu executable. Catat shared library yang dibutuhkan.

### Pertanyaan Refleksi

1. Apa yang dimaksud dengan translation unit?
2. Mengapa compiler memerlukan deklarasi fungsi meskipun definisinya berada di file lain?
3. Apa perbedaan tugas compiler dan linker?
4. Pada tahap apa `undefined reference` terjadi?
5. Mengapa header sebaiknya berisi deklarasi, bukan definisi fungsi?
6. Apa dua makna `static` dalam C?
7. Kapan `extern` digunakan?
8. Apa masalah yang muncul jika variabel global didefinisikan langsung di header?
9. Apa perbedaan static library dan shared library?
10. Mengapa shared library dapat menghemat memori pada sistem yang menjalankan banyak program?

---

Bab ini menjelaskan cara program C dibangun dari banyak file, mulai dari translation unit, file objek, simbol, linker, hingga library. Pada Bab 12, pembahasan berlanjut ke File dan I/O, termasuk file descriptor, syscall seperti `open`, `read`, dan `write`, serta antarmuka `stdio` seperti `fopen`, `printf`, dan `FILE*`.

