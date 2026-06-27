---
title: "Bab 7 — Pointer Lanjutan"
description: "Bab 6 membangun dasar pointer. Sekarang kita naik satu tingkat. Bab ini membahas empat topik utama: pointer-to-pointer, array vs pointer, const correctness, dan..."
tags: [c, system-programming]
order: 7
updated: 2026-06-21
---

> "Jika pointer menyimpan alamat sebuah nilai, maka pointer-to-pointer menyimpan alamat dari pointer itu sendiri."

Bab 6 membangun dasar pointer. Sekarang kita naik satu tingkat. Bab ini membahas empat topik utama: **pointer-to-pointer**, **array vs pointer**, **`const` correctness**, dan **function pointer**.

Topik-topik ini sering muncul saat membaca kode C yang lebih nyata, seperti library, API sistem operasi, kode kernel, parser, interpreter, dan program yang memakai callback. Kalau Bab 6 sudah terasa masuk akal, Bab 7 adalah pendalaman dari model yang sama.

---

## 7.1 Pointer to pointer (`int **`)

Pointer adalah variabel. Karena pointer adalah variabel, pointer juga punya alamat. Maka kita bisa membuat pointer yang menyimpan **alamat sebuah pointer**. Itulah **pointer to pointer**.

```c
#include <stdio.h>

int main(void) {
    int x = 42;
    int *p = &x;      // p menunjuk ke x
    int **pp = &p;    // pp menunjuk ke p

    printf("x    = %d\n", x);        // 42
    printf("*p   = %d\n", *p);       // 42 (isi di alamat p -> x)
    printf("**pp = %d\n", **pp);     // 42 (isi di alamat (isi di alamat pp))
    return 0;
}
```

Mari bedah `**pp`.

- `pp` menyimpan alamat `p`.
- `*pp` berarti "isi di alamat yang disimpan pp", yaitu `p`.
- `p` sendiri berisi alamat `x`.
- `**pp` berarti "isi di alamat yang disimpan oleh `p`", yaitu `x`, nilainya 42.

Rantainya bisa divisualisasikan seperti ini:

```
  pp  ───►  p  ───►  x
 (int**)  (int*)   (int = 42)

 *pp  = p
 **pp = x = 42
```

`p` bisa dibayangkan sebagai catatan berisi alamat `x`, sedangkan `pp` adalah catatan berisi alamat catatan `p`. Untuk sampai ke `x` lewat `pp`, kamu harus membuka dua lapis alamat: `*pp`, lalu `**pp`.

### Kapan ini berguna? (bukan cuma akademis)

Pointer-to-pointer muncul di situasi nyata yang penting.

**1. Fungsi yang perlu mengubah pointer milik pemanggil.** Ingat prinsip Bab 6. Untuk mengubah variabel asli, kirim alamatnya. Kalau yang ingin kamu ubah adalah sebuah **pointer**, kamu harus mengirim alamat dari pointer itu, yaitu `int **`.

```c
#include <stdio.h>
#include <stdlib.h>

// fungsi ini ingin mengeset pointer milik pemanggil ke memori baru
void alokasi(int **out) {
    *out = malloc(sizeof(int));   // ubah pointer ASLI pemanggil
    **out = 99;
}

int main(void) {
    int *p = NULL;
    alokasi(&p);                  // kirim ALAMAT pointer p
    printf("%d\n", *p);           // 99 — p sekarang menunjuk memori baru
    free(p);
    return 0;
}
```

Jika parameternya hanya `int *out`, fungsi hanya mengubah salinan pointer. `p` di `main` tetap `NULL`. Ini sama seperti masalah pass by value di Bab 4, tetapi terjadi satu tingkat lebih dalam. Pola `Type **out` umum dipakai pada API yang mengalokasikan sesuatu lalu menyerahkan hasilnya ke pemanggil.

**2. Array of strings** (`char **`). Contoh yang paling sering ditemui adalah parameter `main`:

```c
int main(int argc, char **argv) { ... }
```

`argv` adalah `char **`, yaitu pointer ke deretan `char *`, dan setiap `char *` menunjuk ke satu string argumen command-line. Kita akan membahasnya lebih lengkap di Bab 14. Untuk sekarang, kamu sudah bisa membacanya: `argv[0]` bertipe `char *` atau satu string, sedangkan `argv[0][0]` bertipe `char`, yaitu karakter pertama dari string pertama.

```c
#include <stdio.h>

int main(int argc, char **argv) {
    printf("jumlah argumen: %d\n", argc);
    for (int i = 0; i < argc; i++)
        printf("argv[%d] = %s\n", i, argv[i]);   // tiap argv[i] adalah char*
    return 0;
}
```

Jalankan dengan:

```bash
./program halo dunia
```

Kamu akan melihat `argv[0]` berisi nama program, `argv[1]` berisi `"halo"`, dan `argv[2]` berisi `"dunia"`.

---

## 7.2 Array vs pointer: mirip, tapi bukan hal yang sama

Bab 5 menjelaskan bahwa nama array sering decay menjadi pointer. Dari sini banyak orang menyimpulkan "array sama dengan pointer". Kesimpulan itu salah. Array dan pointer memang sering berperilaku mirip dalam ekspresi, tetapi keduanya tetap konsep yang berbeda.

```c
int arr[5] = {1,2,3,4,5};
int *p = arr;            // decay: p = &arr[0]
```

Persamaannya: `arr[i]`, `*(arr+i)`, `p[i]`, dan `*(p+i)` menghasilkan nilai yang sama. Namun perbedaannya penting.

### Perbedaan 1: `sizeof`

```c
printf("%zu\n", sizeof(arr));   // 20 (5 int x 4 byte) — ukuran seluruh array
printf("%zu\n", sizeof(p));     // 8  — ukuran pointer (alamat), bukan array
```

`arr` masih membawa informasi bahwa ia adalah array berisi 5 `int`, sehingga `sizeof(arr)` menghasilkan ukuran seluruh array. `p` hanya variabel yang menyimpan alamat, sehingga `sizeof(p)` menghasilkan ukuran pointer.

Ini juga menjelaskan ulang Bab 5: ketika fungsi menerima parameter `int arr[]`, parameter itu sudah diperlakukan sebagai pointer. Karena itu fungsi tidak bisa mengetahui panjang array hanya dari parameter tersebut.

### Perbedaan 2: array tidak bisa "dipindah-arahkan"

```c
int a[5], b[5];
int *p = a;
p = b;          // ok: pointer boleh diarahkan ulang ke array lain
a = b;          // error: nama array bukan variabel yang bisa di-assign
```

`a` bukan variabel pointer. `a` adalah nama untuk blok memori array tersebut. Kamu tidak bisa membuat `a` menunjuk ke array lain. Sebaliknya, `p` memang variabel pointer, sehingga isinya bisa diganti dengan alamat lain.

Ini menegaskan perbedaannya: array adalah blok memori dengan lokasi tetap, sedangkan pointer adalah variabel yang menyimpan alamat dan bisa diarahkan ulang.

### Perbedaan 3: `&arr` vs `&p`

`&arr` bertipe "pointer to array of 5 int", yaitu `int (*)[5]`. Nilai alamatnya mungkin sama dengan `arr`, tetapi tipenya berbeda. Karena tipenya pointer ke seluruh array, `&arr + 1` melompat **20 byte**, yaitu satu array penuh.

Ini memang detail yang jarang dipakai pemula, tetapi berguna untuk memahami bahwa array punya identitas tipe sendiri. Ia bukan pointer biasa.

### Lalu kenapa fungsi `void f(int arr[])` sebenarnya `void f(int *arr)`?

Karena saat array dikirim ke fungsi, array **decay** menjadi pointer ke elemen pertamanya. Dalam parameter fungsi, compiler memperlakukan `int arr[]` dan `int *arr` sebagai tipe yang sama. Tulisan `int arr[]` di parameter lebih merupakan dokumentasi niat: parameter ini dimaksudkan sebagai array. Secara teknis, yang diterima fungsi adalah pointer.

Jadi, array dan pointer berbeda. Array adalah blok memori dengan ukuran dan lokasi tetap. Pointer adalah variabel yang menyimpan alamat dan bisa diarahkan ulang. Keduanya sering bertemu karena aturan decay.

---

## 7.3 `const` correctness: kontrak yang dijaga compiler

Kita sudah mengenal `const` di Bab 2 dan Bab 6. Sekarang kita pakai lebih serius, karena di kode C nyata `const` sering muncul pada parameter pointer.

Ingat aturan baca dari Bab 6:

- `const int *p` atau `int const *p` -> **pointer to const int**. Isi yang ditunjuk tidak boleh diubah lewat `p`, tetapi `p` boleh diarahkan ulang.
- `int *const p` -> **const pointer to int**. Isi yang ditunjuk boleh diubah, tetapi `p` tidak boleh diarahkan ulang.
- `const int *const p` -> isi dan arah pointer sama-sama tidak boleh diubah.

Cara membacanya dimulai dari nama variabel, lalu bergerak keluar. `int * const p` berarti "p adalah const pointer to int". `const int *p` berarti "p adalah pointer ke int yang const".

### Kenapa `const` penting di parameter fungsi

```c
size_t strlen(const char *s);
int strcmp(const char *a, const char *b);
void *memcpy(void *dst, const void *src, size_t n);
```

Perhatikan polanya. Parameter yang hanya dibaca diberi `const`; parameter tujuan yang akan ditulis tidak diberi `const`. Ini bukan sekadar gaya, melainkan **kontrak yang ditegakkan compiler**.

Manfaatnya:

1. **Dokumentasi yang dijamin.** `const char *s` memberi tahu pemanggil bahwa fungsi tidak akan mengubah string yang dikirim. Jika implementasi fungsi mencoba menulis ke `s`, compiler akan menolak.
2. **Mencegah bug lebih awal.** Perubahan yang tidak seharusnya terjadi bisa tertangkap saat compile, bukan saat program berjalan.
3. **Lebih fleksibel untuk pemanggil.** String literal dari Bab 5 bersifat read-only. Kamu bisa mengirimnya ke fungsi yang menerima `const char *`, tetapi tidak aman mengirimnya ke fungsi yang menerima `char *` biasa jika fungsi itu mungkin menulis.

```c
void cetak(const char *s) {        // janji: tak akan mengubah s
    // s[0] = 'X';                  // error compile -> janji ditegakkan
    printf("%s\n", s);
}

int main(void) {
    cetak("literal");              // boleh kirim string literal (read-only)
    return 0;
}
```

Biasakan menandai parameter pointer yang hanya dibaca dengan `const`. Kode menjadi lebih jelas, lebih aman, dan lebih mudah dipakai oleh fungsi lain. Itulah yang disebut **const correctness**.

---

## 7.4 Function pointer: pointer yang menunjuk ke kode

Sejauh ini pointer menunjuk ke **data**, seperti variabel, array, atau blok memori. Namun kode fungsi juga berada di memori, pada alamat tertentu. Karena itu, C juga memungkinkan pointer menyimpan **alamat sebuah fungsi**. Ini disebut **function pointer**.

### Sintaks

```c
int tambah(int a, int b) { return a + b; }

int main(void) {
    int (*op)(int, int);   // op adalah pointer ke fungsi yang terima (int,int) dan return int
    op = tambah;           // arahkan op ke fungsi tambah (nama fungsi = alamatnya)
    printf("%d\n", op(3, 4));   // 7 — panggil fungsi LEWAT pointer
    return 0;
}
```

Deklarasi `int (*op)(int, int)` dibaca seperti ini:

- `op` adalah variabel.
- `(*op)` menunjukkan bahwa `op` adalah pointer. Kurung di sekitar `*op` penting. Tanpa kurung, `int *op(int,int)` berarti fungsi yang mengembalikan `int *`, bukan pointer ke fungsi.
- `(int, int)` berarti fungsi yang ditunjuk menerima dua argumen `int`.
- `int` di depan berarti fungsi yang ditunjuk mengembalikan `int`.

Pemanggilan bisa ditulis sebagai `op(3, 4)` atau bentuk eksplisit `(*op)(3, 4)`. Keduanya sah. Nama fungsi, mirip nama array, bisa dipakai sebagai alamat fungsi. Karena itu `op = tambah` valid. `op = &tambah` juga boleh.

Function pointer bisa dibayangkan seperti variabel yang menyimpan "fungsi mana yang akan dipanggil". Kamu bisa mengubah nilainya agar menunjuk ke fungsi lain dengan signature yang sama.

### Kenapa ini penting: perilaku sebagai data

Function pointer memungkinkan program memilih perilaku saat runtime dan mengirim perilaku sebagai argumen. Dengan kata lain, program tidak hanya mengirim data ke fungsi lain, tetapi juga bisa mengirim "cara bekerja" yang akan dipanggil nanti.

Ada tiga kegunaan besar.

**1. Callback — "panggil fungsi ini nanti".** Kamu memberikan fungsi ke kode lain, lalu kode itu memanggilnya kembali saat dibutuhkan.

**2. Tabel dispatch, sebagai alternatif untuk `switch` panjang.**

```c
#include <stdio.h>

int tambah(int a, int b) { return a + b; }
int kurang(int a, int b) { return a - b; }
int kali (int a, int b) { return a * b; }

int main(void) {
    // array of function pointer: "tabel operasi"
    int (*tabel[3])(int, int) = { tambah, kurang, kali };
    const char *nama[3] = { "+", "-", "*" };

    for (int i = 0; i < 3; i++)
        printf("5 %s 3 = %d\n", nama[i], tabel[i](5, 3));
    return 0;
}
```

Daripada menulis `switch (op)` panjang berisi banyak `case`, kamu bisa memakai indeks ke array fungsi. Pola ini dipakai di interpreter atau virtual machine, misalnya sebagai tabel opcode: setiap opcode dipetakan ke fungsi penanganannya.

**3. Generic algorithm via callback — contoh nyata: `qsort`.** Fungsi `qsort` di standard library bisa mengurutkan array bertipe apa pun karena kamu memberinya **function pointer** yang tahu cara membandingkan dua elemen.

```c
#include <stdio.h>
#include <stdlib.h>

// fungsi pembanding: qsort akan memanggil ini untuk tiap pasangan
int banding(const void *a, const void *b) {
    int x = *(const int *)a;       // a, b itu void* -> cast ke int* lalu dereference
    int y = *(const int *)b;
    return (x > y) - (x < y);      // <0 kalau x<y, 0 kalau sama, >0 kalau x>y
                                   // (hindari 'x - y' yang bisa overflow utk nilai ekstrem)
}

int main(void) {
    int arr[] = {5, 2, 8, 1, 9, 3};
    int n = sizeof(arr) / sizeof(arr[0]);

    qsort(arr, n, sizeof(arr[0]), banding);   // <- kirim function pointer 'banding'

    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);     // 1 2 3 5 8 9
    printf("\n");
    return 0;
}
```

`qsort` ditulis sekali, tetapi bisa mengurutkan `int`, `double`, `struct`, dan tipe lain. Caranya, logika pembanding disisipkan lewat function pointer `banding`. Di sini konsep `void *` dari Bab 6 dan `const` dari Bab 7 juga muncul bersama.

Di system programming, function pointer muncul di banyak tempat. Signal handler di Bab 15 adalah fungsi yang didaftarkan untuk dipanggil saat signal datang. `pthread_create` di Bab 17 menerima function pointer sebagai start routine thread. Driver kernel sering menyimpan tabel function pointer untuk operasi seperti `open`, `read`, dan `write`.

### `typedef` untuk function pointer

Sintaks function pointer bisa sulit dibaca. `typedef` membuatnya lebih manusiawi:

```c
typedef int (*Operasi)(int, int);   // Operasi = "pointer ke fungsi (int,int)->int"

Operasi op = tambah;                 // jauh lebih enak dibaca
int (*tabel[3])(int, int);           // tanpa typedef
Operasi tabel2[3];                   // dengan typedef — lebih jelas
```

Di kode nyata, function pointer sering diberi `typedef` agar deklarasi variabel, parameter, dan array lebih mudah dibaca.

---

## 7.5 Pointer ke struct (jembatan ke Bab 8)

Di Bab 8, kamu akan sering memakai pointer ke `struct`. Akses field lewat pointer memakai operator `->`, yang merupakan singkatan dari dereference lalu akses field:

```c
p->nama        // setara dengan (*p).nama
```

Kita akan membahasnya lebih lengkap di Bab 8. Untuk sekarang, cukup tahu bahwa pointer juga menjadi cara utama bekerja dengan struct, terutama struct besar dan struktur data dinamis.

---

## 7.6 Rangkuman model mental

1. **Pointer to pointer (`T **`)** adalah pointer ke pointer. Dereference dua kali (`**pp`) untuk sampai ke nilai akhirnya. Ini berguna untuk fungsi yang mengubah pointer pemanggil (`T **out`) dan untuk array of strings seperti `char **argv`.
2. **Array berbeda dari pointer**, walaupun sering berperilaku mirip karena decay. Perbedaannya terlihat pada `sizeof`, kemampuan pointer untuk diarahkan ulang, dan tipe khusus seperti `&arr`.
3. **`const` correctness** berarti menandai parameter pointer yang hanya dibaca dengan `const`. Ini menjadi kontrak yang dicek compiler, membantu dokumentasi, dan mencegah bug.
4. **Function pointer** adalah pointer ke kode/fungsi. Ini memungkinkan callback, tabel dispatch, dan generic algorithm seperti `qsort`. Sintaks dasarnya: `int (*op)(int,int)`.
5. Function pointer adalah fondasi banyak callback di system programming: signal handler, thread start routine, dan tabel operasi driver.

---

## 7.7 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Buat `int x = 5; int *p = &x; int **pp = &p;`. Cetak `x`, `*p`, `**pp`, dan juga `p`, `*pp` (keduanya alamat — bandingkan). Lalu ubah `x` menjadi 50 lewat `**pp` saja.
2. Tulis `void alokasi(int **out)` dari Bagian 7.1 yang men-`malloc` sebuah `int` dan mengeset `*out`. Buktikan `p` di `main`, yang awalnya `NULL`, menjadi pointer ke memori valid. Lalu coba versi salah dengan parameter `int *out`. Kenapa `p` di `main` tetap `NULL`?
3. Buat `int arr[5]` dan `int *p = arr`. Cetak `sizeof(arr)` dan `sizeof(p)`. Jelaskan kenapa berbeda. Lalu kirim `arr` ke sebuah fungsi dan cetak `sizeof` parameternya di dalam fungsi. Berapa hasilnya?
4. Tulis fungsi `void cetak(const char *s)`, lalu coba `s[0] = 'X';` di dalamnya. Apa kata compiler? Hapus `const`. Apakah sekarang boleh?
5. Buat program kalkulator memakai array of function pointer (`tambah`, `kurang`, `kali`, `bagi`) yang dipilih berdasarkan karakter operator. Bandingkan dengan versi `switch`. Mana yang lebih rapi menurutmu?
6. Pakai `qsort` untuk mengurutkan array `int` secara **menurun** (descending). Petunjuk: ubah fungsi `banding`.
7. Tulis `typedef` untuk function pointer `int (*)(int, int)`, lalu gunakan untuk mendeklarasikan variabel dan array. Bandingkan keterbacaannya dengan versi tanpa `typedef`.

**Pertanyaan refleksi:**

1. Dengan analogi alamat berlapis, jelaskan apa itu `int **` dan kenapa butuh dereference dua kali.
2. Sebutkan dua situasi nyata di mana kamu butuh pointer-to-pointer.
3. Sebutkan tiga perbedaan konkret antara array dan pointer. Kenapa "array = pointer" itu salah?
4. Kenapa `const char *s` di parameter fungsi berguna, bukan hanya untukmu, tetapi juga untuk pemanggil fungsimu?
5. Apa yang membuat function pointer berbeda dari pointer biasa? Apa yang ia tunjuk?
6. Jelaskan bagaimana `qsort` bisa mengurutkan tipe data apa pun. Apa peran function pointer dan `void *` di situ?
7. Sebutkan tiga tempat di system programming di mana function pointer atau callback dipakai.

---

Kita sudah membahas pointer dari dasar sampai konsep lanjutan yang sering muncul di kode C nyata. Di Bab 8, kita masuk ke **struct, union, dan enum**: cara C membuat tipe data majemuk, serta bagaimana data tersebut ditata di memori melalui padding, alignment, dan urutan field.
