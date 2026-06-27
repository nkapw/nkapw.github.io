---
title: "Bab 10 — Preprocessor & Build System"
description: "Kita sudah membahas inti bahasa dan memori. Mulai sekarang, fokusnya bergeser ke cara program C nyata dirakit dan dijalankan."
tags: [c, system-programming]
order: 10
updated: 2026-06-21
---

> "Preprocessor bekerja sebelum compiler. Ia membaca directive seperti `#include` dan `#define`, lalu menghasilkan teks C yang akan dikompilasi."

Kita sudah membahas inti bahasa dan memori. Mulai sekarang, fokusnya bergeser ke cara program C nyata dirakit dan dijalankan.

Bab ini punya dua bagian besar. Pertama, **preprocessor**, yang sudah kita lihat sekilas di Bab 1 sebagai tahap pertama kompilasi. Kedua, **build system**, terutama `Makefile`, yaitu cara mengotomatiskan build agar kamu tidak mengetik perintah `gcc` panjang berulang-ulang.

Preprocessor sering terlihat sederhana karena kerjanya banyak berupa tempel dan ganti teks. Namun justru karena ia bekerja di level teks, macro bisa menimbulkan bug yang tidak terlihat seperti bug C biasa. Bagian ini akan menjelaskan cara berpikirnya sebelum kita masuk ke proyek multi-file.

---

## 10.1 Rekap: di mana posisi preprocessor

Ingat pipeline Bab 1:

```
.c --[PREPROCESSOR]--> .i --[COMPILER]--> .s --[ASSEMBLER]--> .o --[LINKER]--> executable
     ^^^^^^^^^^^^^^^
     kita di sini
```

**Preprocessor** berjalan **paling awal**, sebelum compiler melihat kodemu. Tugasnya murni manipulasi teks. Ia memproses semua baris yang diawali `#`, yang disebut **directive**.

Preprocessor **tidak** memahami tipe, fungsi, scope, atau aturan C seperti compiler. Ia hanya memotong, menempel, dan mengganti teks. Ini penting karena error akibat macro sering baru terlihat setelah teks hasil preprocessing masuk ke compiler. Saat membaca kode yang banyak memakai macro, jangan bayangkan macro sebagai fungsi kecil; bayangkan sebagai aturan pengubahan teks sebelum compile.

Kamu bisa melihat hasilnya kapan saja dengan `gcc -E file.c`. Saat macro berperilaku aneh, command ini membantu karena kamu bisa melihat teks akhir yang benar-benar masuk ke compiler.

Directive utama yang perlu kamu kenal adalah `#include`, `#define`, `#ifdef`/`#ifndef`/`#if`/`#endif`, `#undef`, dan `#pragma`. Mari bahas satu per satu.

---

## 10.2 `#include`: menempel isi file

Kita sudah melihat `#include` di Bab 1. Directive ini **mengganti dirinya dengan seluruh isi file** yang disebut. Ada dua bentuk:

```c
#include <stdio.h>     // cari di direktori sistem (library standar, dll)
#include "myheader.h"  // cari dulu di direktori file ini, baru sistem
```

- **`<...>`** untuk header sistem/library (`stdio.h`, `stdlib.h`, ...).
- **`"..."`** untuk header buatanmu sendiri.

Hal pentingnya, tidak ada mekanisme tersembunyi di `#include`. Setelah preprocessing, baris `#include <stdio.h>` benar-benar **lenyap**, digantikan oleh isi `stdio.h`. Compiler tidak pernah melihat `#include`; yang ia lihat hanya satu file besar hasil preprocessing.

Kamu bisa membuktikannya dengan:

```bash
gcc -E hello.c | wc -l
```

Command itu menghitung jumlah baris setelah semua include ditempel.

---

## 10.3 `#define`: macro dan jebakannya

`#define` membuat **macro**, yaitu aturan cari-dan-ganti teks. Ada dua jenis yang paling sering ditemui.

### Object-like macro (konstanta)

```c
#define PI 3.14159
#define MAX_BUFFER 1024
#define NAMA_APP "MyProgram"
```

Sebelum compile, preprocessor mengganti **setiap** kemunculan `PI` dengan teks `3.14159`, `MAX_BUFFER` dengan `1024`, dan seterusnya. Ini hanya substitusi teks: tidak ada tipe dan tidak ada memori. Setelah preprocessing, `double luas = PI * r * r;` menjadi `double luas = 3.14159 * r * r;`.

Dulu ini cara utama membuat konstanta. Namun di C modern, untuk konstanta sebaiknya pakai `const` atau `enum` (Bab 2 dan 8), karena keduanya punya **tipe** dan dikenali debugger. Macro hanya teks. `#define` tetap dipakai untuk hal yang tidak bisa dilakukan `const`, misalnya toggle kompilasi atau beberapa kebutuhan yang harus diproses sebelum compile.

### Function-like macro (dan jebakannya)

Macro bisa menerima "argumen":

```c
#define KUADRAT(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
```

`KUADRAT(5)` menjadi `((5) * (5))`. Kelihatannya seperti fungsi, tetapi **bukan**. Ini tetap substitusi teks. Karena itu, penempatan kurung menjadi sangat penting:

```c
#define KUADRAT_BURUK(x) x * x        // tanpa kurung -> bahaya
#define KUADRAT_BAIK(x)  ((x) * (x))  // dengan kurung -> aman

int a = KUADRAT_BURUK(1 + 2);   // jadi: 1 + 2 * 1 + 2 = 5  (bukan 9)
int b = KUADRAT_BAIK(1 + 2);    // jadi: ((1 + 2) * (1 + 2)) = 9  (benar)
```

`KUADRAT_BURUK(1 + 2)` menjadi `1 + 2 * 1 + 2`. Karena `*` punya precedence lebih tinggi daripada `+` (Bab 3), hasilnya `1 + 2 + 2 = 5`, bukan 9. Karena macro hanya menempel teks mentah, bungkus tiap argumen dan seluruh ekspresi dengan kurung.

Jebakan kedua — **double evaluation**:

```c
#define MAX(a, b) ((a) > (b) ? (a) : (b))

int x = 5;
int m = MAX(x++, 10);   // x++ bisa dievaluasi DUA kali -> bug halus
```

Karena `MAX(x++, 10)` menjadi `((x++) > (10) ? (x++) : (10))`, `x++` muncul dua kali dan bisa dieksekusi dua kali. Ini bug yang sulit dilacak. Fungsi biasa tidak punya masalah ini karena argumen fungsi dievaluasi sekali sebelum fungsi dipanggil.

> Di C modern, biasanya lebih baik memakai fungsi, atau `static inline` function, daripada function-like macro. Fungsi punya tipe, mengevaluasi argumen sekali, lebih aman dari masalah precedence, dan bisa di-debug. Macro tetap berguna saat kamu benar-benar butuh sesuatu yang fungsi tidak bisa lakukan, misalnya generik tanpa tipe atau manipulasi token.

Macro bisa dibayangkan seperti fitur "Find & Replace" di editor teks yang dijalankan otomatis. Berguna, tetapi tidak memahami konteks. Ia hanya mengganti teks sesuai aturan.

Karena itu, saat macro terlihat aneh, jangan hanya membaca source aslinya. Jalankan `gcc -E` dan lihat hasil ekspansinya. Sering kali bug macro baru jelas setelah kamu melihat bentuk teks yang benar-benar dikirim ke compiler.

---

## 10.4 Conditional compilation: memilih kode saat compile

Directive `#if`, `#ifdef`, `#ifndef`, `#else`, dan `#endif` membuat preprocessor **memasukkan atau membuang** potongan kode *sebelum* compile, berdasarkan kondisi. Ini disebut **conditional compilation**.

```c
#define DEBUG 1

int main(void) {
#if DEBUG
    printf("[debug] program mulai\n");   // ikut di-compile HANYA jika DEBUG
#endif
    // ... kode utama
    return 0;
}
```

Kegunaan utamanya:

**1. Build debug vs release.** Kode logging/diagnostik cuma ikut saat build debug:

```c
#ifdef DEBUG
    #define LOG(msg) fprintf(stderr, "[LOG] %s\n", msg)
#else
    #define LOG(msg)              // di release, LOG(...) jadi tidak ada (kosong)
#endif
```

Saat build release, semua pemanggilan `LOG(...)` hilang dari hasil preprocessing, sehingga tidak ada overhead runtime. Kamu mengaktifkannya dengan `gcc -DDEBUG ...`. Flag `-D` mendefinisikan macro dari command line, dan ini menghubungkan preprocessor dengan build system di Bagian 10.7.

**2. Portability (kode lintas platform).** Compiler/OS mendefinisikan macro tertentu otomatis, sehingga kamu bisa menulis kode berbeda per platform:

```c
#ifdef __linux__
    // kode khusus Linux
#elif defined(_WIN32)
    // kode khusus Windows
#elif defined(__APPLE__)
    // kode khusus macOS
#endif
```

Inilah cara library lintas-platform menangani perbedaan OS. Ini relevan di system programming karena syscall dan API sistem berbeda antar OS.

---

## 10.5 Header guard: mencegah dobel-include

Header guard adalah pola yang perlu ada di setiap header file. Alasannya sederhana, tetapi efeknya penting.

Misalnya `a.h` di-`#include` oleh dua header lain, lalu kedua header itu sama-sama di-include ke `main.c`. Tanpa pencegahan, isi `a.h` ditempel **dua kali** ke `main.c`. Kalau `a.h` berisi definisi struct atau `typedef`, compiler melihat definisi ganda dan menghasilkan error **"redefinition"**.

Solusinya **header guard** (disebut juga include guard):

```c
// file: mymath.h
#ifndef MYMATH_H      // kalau MYMATH_H belum didefinisikan
#define MYMATH_H      // definisikan sekarang, lalu masukkan isi header

int tambah(int a, int b);
double luas_lingkaran(double r);

#endif  // MYMATH_H   // akhir guard
```

Cara kerjanya:

1. **Include pertama:** `MYMATH_H` belum ada → `#ifndef` bernilai benar → isi dimasukkan → `MYMATH_H` jadi terdefinisi.
2. **Include kedua (di file yang sama):** `MYMATH_H` sudah ada → `#ifndef` bernilai salah → seluruh isi dilewati.

Hasilnya, isi header masuk **maksimal sekali** per translation unit, walaupun di-include berkali-kali. Konvensi nama guard biasanya memakai nama file dalam huruf besar dengan underscore, seperti `MYMATH_H`. Buat namanya unik agar tidak bentrok dengan header lain.

Yang dijaga oleh header guard adalah pengulangan isi header di satu translation unit. Header yang sama tetap bisa masuk ke banyak file `.c` berbeda, dan itu memang normal. Nanti di Bab 11, perbedaan antara deklarasi di header dan definisi di file `.c` akan menjadi penting supaya pola ini tidak menimbulkan symbol ganda saat linking.

> Alternatif modern yang lebih ringkas adalah `#pragma once` di baris pertama header. Bentuk ini lebih singkat dan tidak butuh nama unik, serta didukung hampir semua compiler. Namun `#pragma once` secara teknis non-standar, sedangkan header guard `#ifndef` dijamin portable. Banyak proyek memakai salah satu; kenali keduanya.

Tanpa header guard, proyek multi-file mudah sekali gagal compile. Ini akan muncul lagi saat kita memecah kode ke banyak file di Bab 11.

---

## 10.6 Macro bawaan & `#pragma`

Preprocessor menyediakan beberapa macro bawaan yang berguna:

```c
printf("File: %s\n", __FILE__);    // nama file sumber
printf("Baris: %d\n", __LINE__);   // nomor baris saat ini
printf("Tanggal: %s\n", __DATE__); // tanggal kompilasi
// __func__ (sebenarnya identifier, bukan macro) -> nama fungsi saat ini
```

Ini sering dipakai untuk membuat macro logging/assert yang menunjukkan lokasi error:

```c
#define ASSERT(kondisi) \
    do { \
        if (!(kondisi)) { \
            fprintf(stderr, "Assert gagal: %s (file %s, baris %d)\n", \
                    #kondisi, __FILE__, __LINE__); \
            abort(); \
        } \
    } while (0)
```

Dua trik baru muncul di contoh ini. Pertama, `#kondisi` adalah operator **stringification** `#` yang mengubah argumen macro menjadi string literal. Kedua, pola `do { ... } while (0)` membungkus macro multi-statement agar aman dipakai di `if` tanpa kurung. Backslash `\` di akhir baris menyambung macro ke baris berikutnya, karena macro secara default hanya satu baris.

Pola `do { ... } while (0)` terlihat aneh pada awalnya, tetapi tujuannya praktis: macro bisa dipakai seperti satu statement biasa dan tetap membutuhkan titik koma setelah pemanggilan. Tanpa pola ini, macro yang berisi beberapa statement mudah merusak struktur `if/else` di tempat pemanggilan.

Kamu belum perlu menulis pola seperti ini sekarang, tetapi mengenalinya akan membantu saat membaca kode C yang lebih besar.

`#pragma` memberi instruksi khusus ke compiler. Sifatnya non-standar dan tergantung compiler. Contoh yang umum adalah `#pragma once` (Bagian 10.5) dan `#pragma pack`, yang mengatur padding struct seperti di Bab 8.

---

## 10.7 Build system: kenapa `gcc file.c` saja tak cukup

Sejauh ini program kita masih satu file, jadi `gcc hello.c -o hello` cukup. Namun proyek nyata punya **banyak file** `.c` dan `.h`. Mengetik perintah compile panjang berulang-ulang melelahkan dan rawan salah:

```bash
gcc -Wall -Wextra -g -c main.c -o main.o
gcc -Wall -Wextra -g -c mymath.c -o mymath.o
gcc -Wall -Wextra -g -c utils.c -o utils.o
gcc main.o mymath.o utils.o -o program
```

Masalah berikutnya muncul saat hanya sebagian file berubah. Kalau kamu hanya mengubah `utils.c`, idealnya kamu hanya perlu meng-compile ulang `utils.c`, bukan semuanya. Melacak ini secara manual cepat menjadi tidak praktis saat proyek membesar.

Solusinya adalah **build system**. Salah satu yang paling klasik dan fundamental di dunia C adalah **`make`** dengan file bernama `Makefile`.

---

## 10.8 `Makefile`: otomatisasi build

`make` bekerja berdasarkan **rules** (aturan) yang kamu tulis di `Makefile`. Tiap rule berbentuk:

```
target: dependencies
	command       <- harus diawali TAB, bukan spasi
```

Rule itu bisa dibaca begini: untuk membuat `target`, dibutuhkan `dependencies`; kalau ada dependency yang lebih baru daripada target, jalankan `command` untuk membangun ulang target.

Inilah keunggulan utama `make`: ia membandingkan **timestamp** file. Kalau `utils.c` lebih baru daripada `utils.o`, `make` tahu bahwa `utils.o` perlu di-compile ulang. File lain yang tidak berubah dibiarkan. Ini disebut **incremental build**, dan bisa menghemat banyak waktu di proyek besar.

Contoh `Makefile` untuk proyek tiga file:

```makefile
# Variabel — biar tak mengulang
CC = gcc
CFLAGS = -Wall -Wextra -g -std=c11
OBJ = main.o mymath.o utils.o

# Target pertama = target default (dijalankan saat ketik "make" saja)
program: $(OBJ)
	$(CC) $(OBJ) -o program

# Aturan: tiap .o butuh .c-nya. (Pola implicit make sudah tahu .o dari .c,
# tapi kita tulis eksplisit + header dependency untuk kejelasan)
main.o: main.c mymath.h utils.h
	$(CC) $(CFLAGS) -c main.c

mymath.o: mymath.c mymath.h
	$(CC) $(CFLAGS) -c mymath.c

utils.o: utils.c utils.h
	$(CC) $(CFLAGS) -c utils.c

# Target "phony" — bukan file, cuma perintah
clean:
	rm -f $(OBJ) program

.PHONY: clean
```

Bagian-bagian pentingnya:

- **Variabel** (`CC`, `CFLAGS`, `OBJ`) didefinisikan sekali dan dipakai dengan `$(...)`. Kalau flag berubah, kamu cukup mengubah satu tempat.
- **Target `program`** adalah target pertama, jadi default. Untuk membuatnya, `make` membutuhkan semua `.o`, lalu menautkannya menjadi executable.
- **Dependency header** seperti `main.o: main.c mymath.h utils.h` berarti: kalau `mymath.h` berubah, `main.o` ikut di-compile ulang karena `main.c` meng-include header itu. Ini penting dan sering terlupa.
- **`clean`** adalah target `.PHONY`, bukan nama file sungguhan, untuk menghapus hasil build. Dijalankan dengan `make clean`.
- **TAB, bukan spasi.** Baris command harus diawali karakter TAB. Jika memakai spasi, `make` biasanya error dengan pesan "missing separator". Hati-hati editor yang mengubah TAB menjadi spasi.

Pakai:
```bash
make            # build (incremental — cuma yang berubah)
make clean      # bersihkan hasil build
```

> `make` adalah fondasi. Proyek besar modern sering memakai tool di atasnya, seperti CMake atau Meson, yang menghasilkan Makefile/build files, atau sistem lain seperti Bazel. Namun memahami `make` langsung membuatmu mengerti apa yang terjadi di balik tool-tool itu. Makefile juga masih sering ditemui di proyek C dan kernel.

`Makefile` bisa dibayangkan sebagai resep dengan dependency. Untuk membuat target, `make` melihat bahan apa yang dibutuhkan dan hanya mengulang langkah yang input-nya berubah.

Dependency header layak ditulis dengan hati-hati. Jika `mymath.h` berubah tetapi `main.o` tidak dibangun ulang, executable bisa memakai asumsi lama tentang prototype, struct, atau konstanta. Bug seperti ini membingungkan karena source sudah tampak benar, tetapi object file yang dipakai masih hasil compile lama.

---

## 10.9 Rangkuman model mental

1. **Preprocessor** berjalan paling awal; tugasnya manipulasi teks seperti menempel dan mengganti. Lihat hasilnya dengan `gcc -E`.
2. **`#include`** menempel isi file. `<...>` untuk sistem, `"..."` untuk header sendiri.
3. **`#define`** = substitusi teks. Untuk konstanta, lebih baik `const`/`enum` karena punya tipe. Function-like macro rawan masalah precedence dan double evaluation; di C modern, pilih fungsi saat memungkinkan.
4. **Conditional compilation** (`#ifdef`/`#if`) memilih kode saat compile untuk build debug/release dan portability lintas platform. Aktifkan macro dari command line dengan `-DNAMA`.
5. **Header guard** (`#ifndef/#define/#endif` atau `#pragma once`) perlu ada di tiap header untuk mencegah dobel-include yang menyebabkan error redefinition.
6. Macro bawaan (`__FILE__`, `__LINE__`) berguna untuk logging/assert.
7. **Build system (`make` + `Makefile`)** mengotomatiskan compile multi-file dengan incremental build berbasis timestamp. Di Makefile, baris command diawali **TAB**.

---

## 10.10 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program dengan `#define PI 3.14159` dan `#define KUADRAT(x) ((x)*(x))`. Jalankan `gcc -E file.c` dan temukan bagaimana keduanya menjadi teks setelah preprocessing.
2. Buktikan jebakan macro: definisikan `KUADRAT_BURUK(x) x*x` dan `KUADRAT_BAIK(x) ((x)*(x))`. Hitung `KUADRAT_BURUK(1+2)` dan `KUADRAT_BAIK(1+2)`. Jelaskan kenapa hasilnya beda pakai aturan precedence.
3. Buat macro `LOG(msg)` yang aktif hanya saat `DEBUG` didefinisikan (Bagian 10.4). Compile sekali biasa, sekali dengan `gcc -DDEBUG`. Bandingkan output.
4. Buat header `mymath.h` berisi prototype fungsi, **tanpa** header guard. Include dua kali di file yang sama (`#include "mymath.h"` dua kali). Apa errornya? Lalu tambahkan header guard — apakah error hilang?
5. Tulis program kecil yang mencetak `__FILE__`, `__LINE__`, dan `__func__`. Pindahkan baris-barisnya dan amati `__LINE__` berubah.
6. Pecah sebuah program jadi tiga file (`main.c`, `mymath.c`, `mymath.h`) dan tulis `Makefile` untuk membangunnya. Sertakan target `clean`. Jalankan `make`, ubah satu file, jalankan `make` lagi — amati hanya file yang berubah yang di-compile ulang.
7. Sengaja pakai spasi (bukan TAB) di baris command Makefile. Apa pesan errornya?

**Pertanyaan refleksi:**

1. Kenapa preprocessor disebut "tidak mengerti C"? Apa konsekuensi dari sifat ini?
2. Kenapa function-like macro berbahaya? Sebutkan dua jenis bug yang bisa muncul, dan kenapa fungsi tak punya masalah itu.
3. Kenapa di C modern `const`/`enum` lebih disukai daripada `#define` untuk konstanta?
4. Jelaskan langkah demi langkah cara kerja header guard. Apa yang terjadi tanpa guard di proyek multi-file?
5. Sebutkan dua kegunaan utama conditional compilation. Bagaimana `-DDEBUG` menghubungkan command line dengan preprocessor?
6. Apa keunggulan utama `make` dibanding mengetik perintah `gcc` manual? Apa itu incremental build?
7. Kenapa dependency header (`main.o: main.c mymath.h`) penting ditulis di Makefile?

---

Kita sudah membahas preprocessor dan build otomatis. Namun kita belum benar-benar memecah program ke banyak file dan menyambungnya kembali.

Di Bab 11, kita akan membahas **modular programming & linking**. Kita akan melihat apa itu translation unit, perbedaan **deklarasi vs definisi** dalam konteks lintas-file, peran `extern` dan `static`, bagaimana linker menyambung symbol antar file, serta cara membuat dan memakai **library** seperti static `.a` dan shared `.so`.
