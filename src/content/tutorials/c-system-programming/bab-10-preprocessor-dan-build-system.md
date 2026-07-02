---
title: "Bab 10 - Preprocessor dan Build System"
description: "Setelah memahami dasar bahasa, pointer, struktur data, stack, heap, dan manajemen memori manual, langkah berikutnya adalah memahami cara program C diproses sebelum..."
tags: [c, systems-programming]
order: 10
updated: 2026-07-02
---
Setelah memahami dasar bahasa, pointer, struktur data, stack, heap, dan manajemen memori manual, langkah berikutnya adalah memahami cara program C diproses sebelum dikompilasi dan cara proyek C dibangun secara teratur.

Bab ini membahas dua hal penting. Pertama, preprocessor, yaitu tahap awal yang memproses direktif seperti `#include`, `#define`, `#ifdef`, dan `#ifndef`. Kedua, build system, terutama `make` dan `Makefile`, yang digunakan untuk mengotomatiskan proses kompilasi pada proyek yang terdiri dari banyak file.

Preprocessor sering terlihat sederhana karena bekerja sebelum compiler. Namun, kesalahan dalam penggunaan macro, header, dan conditional compilation dapat menghasilkan bug yang sulit ditemukan. Karena itu, bagian ini perlu dipahami sebagai bagian penting dari penulisan program C yang rapi dan dapat dipelihara.

---

## 10.1 Posisi Preprocessor dalam Proses Kompilasi

Proses pembuatan program C dapat diringkas sebagai berikut.

```
.c --[PREPROCESSOR]--> .i --[COMPILER]--> .s --[ASSEMBLER]--> .o --[LINKER]--> executable
```

Preprocessor berjalan sebelum compiler membaca kode C hasil akhir. Tugasnya adalah memproses baris yang diawali `#`, yang disebut directive. Preprocessor melakukan manipulasi teks. Ia tidak memeriksa tipe, scope, aturan fungsi, atau validitas ekspresi C.

Hasil kerja preprocessor dapat dilihat dengan perintah berikut.

```bash
gcc -E file.c
```

Perintah tersebut menampilkan kode C setelah semua directive preprocessor diproses. Cara ini sangat berguna ketika macro menghasilkan kode yang tidak sesuai harapan.

Directive yang paling sering digunakan adalah `#include`, `#define`, `#ifdef`, `#ifndef`, `#if`, `#endif`, `#undef`, dan `#pragma`.

---

## 10.2 `#include`

Directive `#include` memasukkan isi file header ke dalam file sumber sebelum proses kompilasi berlanjut.

```c
#include <stdio.h>
#include "mymath.h"
```

Bentuk `<...>` digunakan untuk header sistem atau library standar, misalnya `stdio.h` dan `stdlib.h`. Bentuk `"..."` digunakan untuk header milik proyek sendiri. Pada bentuk kedua, compiler biasanya mencari file di direktori sumber terlebih dahulu sebelum mencari di lokasi header sistem.

Setelah preprocessing, baris `#include` tidak lagi terlihat sebagai directive. Isinya sudah digantikan oleh deklarasi, macro, dan definisi lain yang terdapat di header tersebut. Karena itu, satu file sumber yang kecil dapat berubah menjadi file hasil preprocessing yang sangat besar.

Gunakan `#include` untuk deklarasi fungsi, definisi tipe, macro yang memang perlu dibagikan, dan konstanta yang digunakan lintas file. Hindari memasukkan implementasi fungsi biasa ke header kecuali ada alasan yang jelas, misalnya untuk `static inline`.

---

## 10.3 `#define` dan Macro

`#define` membuat macro. Macro adalah aturan substitusi teks yang diterapkan oleh preprocessor sebelum compiler memproses kode.

### Object-Like Macro

Object-like macro tidak memiliki argumen.

```c
#define PI 3.14159
#define MAX_BUFFER 1024
#define NAMA_APP "ProgramC"
```

Setiap kemunculan nama macro akan diganti dengan teks penggantinya. Misalnya, `PI` diganti menjadi `3.14159` sebelum compile.

Untuk konstanta biasa, C modern lebih baik menggunakan `const` atau `enum` ketika memungkinkan. Keduanya memiliki tipe dan lebih mudah dipahami oleh compiler maupun debugger. Macro tetap berguna untuk hal yang memang membutuhkan keputusan pada tahap preprocessing, misalnya konfigurasi build dan conditional compilation.

### Function-Like Macro

Function-like macro memiliki argumen dan terlihat seperti fungsi.

```c
#define KUADRAT(x) ((x) * (x))
```

Pemanggilan `KUADRAT(5)` akan diganti menjadi `((5) * (5))`. Walaupun bentuknya mirip fungsi, macro tetap bekerja sebagai substitusi teks. Perbedaan ini penting karena macro tidak mengevaluasi argumen seperti fungsi biasa.

Contoh macro yang buruk.

```c
#define KUADRAT_BURUK(x) x * x

int a = KUADRAT_BURUK(1 + 2);
```

Kode tersebut menjadi `1 + 2 * 1 + 2`, sehingga hasilnya `5`, bukan `9`. Hal ini terjadi karena aturan prioritas operator diterapkan setelah teks macro ditempelkan.

Macro yang lebih aman harus memberi tanda kurung pada argumen dan keseluruhan ekspresi.

```c
#define KUADRAT_BAIK(x) ((x) * (x))

int b = KUADRAT_BAIK(1 + 2);
```

Masalah lain adalah evaluasi ganda.

```c
#define KUADRAT(x) ((x) * (x))

int x = 5;
int y = KUADRAT(x++);
```

Setelah preprocessing, `x++` muncul dua kali. Akibatnya, ekspresi tersebut dapat mengubah nilai `x` lebih dari sekali dalam satu macro. Fungsi biasa tidak memiliki masalah ini karena argumen fungsi dievaluasi satu kali sebelum fungsi dipanggil.

Dalam kode C modern, function-like macro sebaiknya digunakan secara terbatas. Jika tujuan dapat dicapai dengan fungsi biasa atau `static inline`, pilihan tersebut biasanya lebih aman karena memiliki tipe, lebih mudah diuji, dan lebih mudah di-debug.

---

## 10.4 Conditional Compilation

Conditional compilation membuat preprocessor memilih bagian kode yang akan disertakan sebelum proses kompilasi. Directive yang umum digunakan adalah `#if`, `#ifdef`, `#ifndef`, `#else`, `#elif`, dan `#endif`.

```c
#include <stdio.h>

int main(void) {
#ifdef DEBUG
    printf("[debug] program mulai\n");
#endif

    return 0;
}
```

Jika macro `DEBUG` didefinisikan, baris `printf` akan ikut dikompilasi. Jika tidak, baris tersebut tidak masuk ke kode hasil preprocessing.

Macro dapat didefinisikan dari command line dengan opsi `-D`.

```bash
gcc -DDEBUG main.c -o program
```

Conditional compilation sering digunakan untuk build debug dan release.

```c
#ifdef DEBUG
#define LOG(msg) fprintf(stderr, "[LOG] %s\n", msg)
#else
#define LOG(msg)
#endif
```

Pada build release, `LOG(msg)` dapat dibuat kosong sehingga tidak menambah pekerjaan saat program berjalan.

Conditional compilation juga digunakan untuk kode lintas platform.

```c
#ifdef __linux__
    /* kode khusus Linux */
#elif defined(_WIN32)
    /* kode khusus Windows */
#elif defined(__APPLE__)
    /* kode khusus macOS */
#endif
```

Teknik ini penting karena sistem operasi dan compiler dapat menyediakan API, header, dan macro bawaan yang berbeda.

---

## 10.5 Header Guard

Setiap header sebaiknya memiliki header guard. Tujuannya adalah mencegah isi header diproses lebih dari satu kali dalam satu translation unit.

Tanpa header guard, file header yang di-include melalui beberapa jalur dapat menyebabkan definisi ganda. Masalah ini sering muncul pada `struct`, `typedef`, enum, dan deklarasi lain yang tidak boleh muncul berulang dalam bentuk yang sama.

Contoh header guard.

```c
#ifndef MYMATH_H
#define MYMATH_H

int tambah(int a, int b);
double luas_lingkaran(double r);

#endif
```

Pada include pertama, `MYMATH_H` belum didefinisikan sehingga isi header diproses. Setelah itu, `MYMATH_H` didefinisikan. Pada include berikutnya dalam translation unit yang sama, isi header dilewati karena `MYMATH_H` sudah ada.

Nama macro guard harus dibuat unik. Konvensi umum adalah memakai nama file dengan huruf besar dan underscore, misalnya `MYMATH_H` untuk `mymath.h`.

Alternatif yang sering digunakan adalah `#pragma once`.

```c
#pragma once

int tambah(int a, int b);
```

`#pragma once` lebih ringkas dan didukung oleh banyak compiler modern, tetapi secara teknis bukan bagian dari standar C. Header guard dengan `#ifndef`, `#define`, dan `#endif` tetap menjadi pilihan yang paling portable.

---

## 10.6 Macro Bawaan dan `#pragma`

Preprocessor menyediakan beberapa macro bawaan yang sering digunakan untuk debugging dan logging.

```c
printf("File %s\n", __FILE__);
printf("Baris %d\n", __LINE__);
printf("Tanggal kompilasi %s\n", __DATE__);
```

Identifier `__func__` juga sering digunakan untuk mendapatkan nama fungsi saat ini.

```c
printf("Fungsi %s\n", __func__);
```

Macro bawaan dapat dipakai untuk membuat pesan error yang menyertakan lokasi sumber.

```c
#define ASSERT(kondisi) \
    do { \
        if (!(kondisi)) { \
            fprintf(stderr, "Assert gagal %s di %s baris %d\n", \
                    #kondisi, __FILE__, __LINE__); \
            abort(); \
        } \
    } while (0)
```

Operator `#` pada macro disebut stringification. Operator ini mengubah argumen macro menjadi string literal. Pola `do { ... } while (0)` sering digunakan agar macro yang terdiri dari beberapa statement tetap aman saat dipakai di dalam `if`.

`#pragma` digunakan untuk memberi instruksi khusus kepada compiler. Perilakunya bergantung pada compiler. Contoh yang umum adalah `#pragma once` untuk header dan `#pragma pack` untuk mengatur padding pada `struct`.

---

## 10.7 Mengapa Build System Diperlukan

Program kecil dapat dikompilasi dengan satu perintah.

```bash
gcc main.c -o program
```

Proyek nyata biasanya terdiri dari banyak file `.c` dan `.h`. Kompilasi manual menjadi panjang dan rawan salah.

```bash
gcc -Wall -Wextra -g -c main.c -o main.o
gcc -Wall -Wextra -g -c mymath.c -o mymath.o
gcc -Wall -Wextra -g -c utils.c -o utils.o
gcc main.o mymath.o utils.o -o program
```

Jika hanya `utils.c` yang berubah, idealnya hanya `utils.c` yang dikompilasi ulang. File lain yang tidak berubah tidak perlu dibangun ulang. Mengelola hal ini secara manual akan menyulitkan ketika proyek membesar.

Build system menyelesaikan masalah tersebut dengan menyimpan aturan build dan menjalankan hanya perintah yang diperlukan. Dalam ekosistem C, alat klasik yang paling umum adalah `make` dengan file konfigurasi bernama `Makefile`.

---

## 10.8 `Makefile`

`make` membaca aturan dari `Makefile`. Setiap aturan menyatakan target, dependency, dan perintah untuk membangun target tersebut.

```makefile
target: dependency
	command
```

Baris perintah harus diawali karakter TAB, bukan spasi. Ini adalah aturan sintaks Makefile yang wajib dipenuhi.

Contoh `Makefile` sederhana untuk proyek yang terdiri dari tiga file sumber.

```makefile
CC = gcc
CFLAGS = -Wall -Wextra -g -std=c11
OBJ = main.o mymath.o utils.o

program: $(OBJ)
	$(CC) $(OBJ) -o program

main.o: main.c mymath.h utils.h
	$(CC) $(CFLAGS) -c main.c

mymath.o: mymath.c mymath.h
	$(CC) $(CFLAGS) -c mymath.c

utils.o: utils.c utils.h
	$(CC) $(CFLAGS) -c utils.c

clean:
	rm -f $(OBJ) program

.PHONY: clean
```

Variabel seperti `CC`, `CFLAGS`, dan `OBJ` mengurangi pengulangan. Jika flag kompilasi perlu diubah, perubahan cukup dilakukan di satu tempat.

Target pertama menjadi target default. Pada contoh di atas, menjalankan `make` tanpa argumen akan membangun `program`.

Dependency header penting untuk menjaga hasil build tetap benar. Jika `mymath.h` berubah, file object yang bergantung pada header tersebut perlu dikompilasi ulang.

Target `clean` digunakan untuk menghapus file hasil build. Karena `clean` bukan nama file yang ingin dibuat, target ini ditandai sebagai `.PHONY`.

Perintah yang umum digunakan.

```bash
make
make clean
```

`make` melakukan incremental build berdasarkan timestamp file. Jika dependency lebih baru daripada target, target dibangun ulang. Jika target masih lebih baru daripada semua dependency, perintah build tidak dijalankan.

Tool modern seperti CMake dan Meson sering digunakan pada proyek besar. Namun, memahami `make` tetap penting karena banyak proyek C masih menggunakan Makefile, dan konsep dependency build tetap sama pada banyak build system lain.

---

## 10.9 Rangkuman Model Mental

1. Preprocessor berjalan sebelum compiler dan melakukan manipulasi teks berdasarkan directive.
2. `#include` memasukkan isi header ke file sumber sebelum kompilasi.
3. `#define` membuat macro yang bekerja melalui substitusi teks.
4. Function-like macro rawan kesalahan prioritas operator dan evaluasi ganda.
5. Conditional compilation memilih kode yang disertakan berdasarkan macro yang aktif.
6. Header guard mencegah isi header diproses berulang dalam satu translation unit.
7. Macro bawaan seperti `__FILE__`, `__LINE__`, dan `__DATE__` berguna untuk logging dan debugging.
8. `make` mengotomatiskan proses build multi-file melalui aturan target dan dependency.
9. Incremental build membuat hanya file yang berubah dan dependencynya yang dibangun ulang.

---

## 10.10 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Tulis program dengan `#define PI 3.14159` dan `#define KUADRAT(x) ((x) * (x))`. Jalankan `gcc -E file.c` dan amati hasil preprocessing.
2. Buat `KUADRAT_BURUK(x)` tanpa tanda kurung dan `KUADRAT_BAIK(x)` dengan tanda kurung. Bandingkan hasil untuk argumen `1 + 2`.
3. Buat macro `LOG(msg)` yang hanya aktif ketika `DEBUG` didefinisikan. Compile program dengan dan tanpa opsi `-DDEBUG`.
4. Buat header `mymath.h` tanpa header guard, lalu include header tersebut lebih dari satu kali. Tambahkan header guard dan bandingkan hasil kompilasinya.
5. Tulis program yang mencetak `__FILE__`, `__LINE__`, dan `__func__`.
6. Pecah program menjadi `main.c`, `mymath.c`, dan `mymath.h`. Buat `Makefile` untuk membangunnya.
7. Ubah satu file sumber, lalu jalankan `make` lagi. Amati file mana yang dikompilasi ulang.
8. Ganti TAB pada baris perintah Makefile dengan spasi dan amati pesan error dari `make`.

### Pertanyaan Refleksi

1. Mengapa preprocessor tidak dianggap memahami bahasa C.
2. Apa risiko utama dari function-like macro.
3. Mengapa `const` atau `enum` sering lebih baik daripada `#define` untuk konstanta biasa.
4. Bagaimana header guard mencegah definisi ganda.
5. Apa kegunaan conditional compilation pada build debug dan kode lintas platform.
6. Apa keunggulan `make` dibanding kompilasi manual.
7. Mengapa dependency header perlu ditulis di Makefile.

---

Setelah memahami preprocessor dan build system, Anda sudah memiliki dasar untuk mengelola proyek C yang terdiri dari banyak file. Bab berikutnya membahas modular programming dan linking, termasuk translation unit, deklarasi, definisi, `extern`, `static`, symbol, serta pembuatan library static dan shared.

