---
title: "Bab 6 - Pointer"
description: "Pointer adalah variabel yang menyimpan alamat memori. Konsep ini menjadi dasar banyak fitur penting di C, termasuk pass by address, penelusuran array, alokasi memori..."
tags: [c, systems-programming]
order: 6
updated: 2026-07-02
---
Pointer adalah variabel yang menyimpan alamat memori. Konsep ini menjadi dasar banyak fitur penting di C, termasuk pass by address, penelusuran array, alokasi memori dinamis, pengelolaan string, dan struktur data dinamis.

Bab sebelumnya sudah menyiapkan beberapa konsep yang diperlukan. Bab 2 membahas alamat memori, Bab 4 membahas pass by value, dan Bab 5 menunjukkan hubungan antara pengindeksan array dan aritmetika alamat. Bab ini menyatukan konsep tersebut menjadi model pointer yang utuh.

---

## 6.1 Memori, Alamat, dan `&`

Setiap variabel disimpan pada lokasi tertentu di memori. Lokasi tersebut memiliki alamat.

```c
int x = 42;
```

Variabel `x` menyimpan nilai `42`. Operator `&` atau **address-of** digunakan untuk mendapatkan alamat variabel.

```c
#include <stdio.h>

int main(void) {
    int x = 42;

    printf("nilai x = %d\n", x);
    printf("alamat x = %p\n", (void *)&x);
    return 0;
}
```

Ekspresi `&x` menghasilkan alamat tempat `x` disimpan. Nilai alamat biasanya ditampilkan dalam bentuk heksadesimal, misalnya `0x7ffd3a2b4c5c`. Pointer adalah variabel yang menyimpan alamat seperti itu.

---

## 6.2 Deklarasi Pointer dan Operator Utama

Pointer dideklarasikan dengan menambahkan `*` pada deklarasi variabel.

```c
int x = 42;
int *p = &x;
```

Pada contoh tersebut, `p` bertipe `int *`. Artinya, `p` menyimpan alamat dari objek bertipe `int`.

Ada dua operator utama yang harus dipahami.

| Operator | Nama | Makna |
|----------|------|-------|
| `&` | address-of | Mengambil alamat sebuah variabel |
| `*` | dereference | Mengakses nilai pada alamat yang disimpan pointer |

Jika `p = &x`, maka `p` berisi alamat `x` dan `*p` mengakses nilai `x`.

```c
#include <stdio.h>

int main(void) {
    int x = 42;
    int *p = &x;

    printf("x = %d\n", x);
    printf("&x = %p\n", (void *)&x);
    printf("p = %p\n", (void *)p);
    printf("*p = %d\n", *p);

    *p = 100;
    printf("x = %d\n", x);
    return 0;
}
```

Baris `*p = 100;` tidak mengubah alamat yang disimpan di `p`. Baris tersebut mengubah nilai pada alamat yang ditunjuk oleh `p`. Karena `p` menunjuk ke `x`, nilai `x` berubah menjadi `100`.

Simbol `*` memiliki dua makna yang berbeda, tergantung konteks.

1. Pada deklarasi seperti `int *p`, `*` menyatakan bahwa `p` adalah pointer.
2. Pada ekspresi seperti `*p = 100`, `*` melakukan dereference.

Kebingungan umum terjadi ketika dua konteks ini dianggap sama. Saat membaca kode, periksa apakah `*` muncul pada deklarasi atau ekspresi.

---

## 6.3 Ukuran Pointer dan Tipe Pointer

Pointer menyimpan alamat. Pada sistem 64-bit, ukuran alamat biasanya 8 byte. Karena itu, pointer ke berbagai tipe umumnya memiliki ukuran yang sama.

```c
printf("%zu\n", sizeof(int *));
printf("%zu\n", sizeof(char *));
printf("%zu\n", sizeof(double *));
```

Walaupun ukurannya sama, pointer tetap membutuhkan tipe. Tipe pointer menentukan cara alamat tersebut digunakan.

1. Dereference membutuhkan informasi ukuran dan interpretasi data. `int *` membaca data sebagai `int`, sedangkan `char *` membaca data sebagai `char`.
2. Aritmetika pointer membutuhkan ukuran satu elemen. `p + 1` pada `int *` berbeda dari `p + 1` pada `char *`.

Dengan kata lain, pointer menyimpan alamat, tetapi tipe pointer menentukan cara compiler memperlakukan alamat tersebut.

---

## 6.4 Aritmetika Pointer

Aritmetika pointer dilakukan dalam satuan elemen, bukan byte. Jika `p` bertipe `int *`, maka `p + 1` bergerak sejauh `sizeof(int)` byte. Jika `p` bertipe `double *`, maka `p + 1` bergerak sejauh `sizeof(double)` byte.

```c
#include <stdio.h>

int main(void) {
    int arr[3] = {10, 20, 30};
    int *p = arr;

    printf("p = %p, *p = %d\n", (void *)p, *p);
    printf("p + 1 = %p, *(p + 1) = %d\n", (void *)(p + 1), *(p + 1));
    printf("p + 2 = %p, *(p + 2) = %d\n", (void *)(p + 2), *(p + 2));
    return 0;
}
```

Pada contoh tersebut, `arr` decay menjadi pointer ke elemen pertama. Karena elemen array bertipe `int`, selisih alamat antara `p` dan `p + 1` biasanya 4 byte pada sistem dengan `sizeof(int) == 4`.

Konsep ini menjelaskan hubungan antara array dan pointer.

```c
int arr[3] = {10, 20, 30};

printf("%d\n", arr[1]);
printf("%d\n", *(arr + 1));
```

Ekspresi `arr[i]` setara dengan `*(arr + i)`. Pengindeksan array adalah aritmetika pointer yang diikuti dereference.

---

## 6.5 Pointer `NULL`

Pointer sebaiknya menunjuk ke objek yang valid. Jika pointer belum menunjuk ke objek mana pun, gunakan `NULL`.

```c
int *p = NULL;
```

`NULL` adalah nilai pointer khusus yang menandakan bahwa pointer tidak menunjuk ke objek valid. Banyak fungsi mengembalikan `NULL` untuk menandakan kegagalan atau hasil yang tidak ditemukan, misalnya `malloc` dan `fopen`.

Dereference terhadap `NULL` adalah kesalahan serius.

```c
int *p = NULL;
printf("%d\n", *p);
```

Kode tersebut mengakses memori yang tidak valid dan biasanya menyebabkan `Segmentation fault`.

Jika ada kemungkinan pointer bernilai `NULL`, periksa sebelum dereference.

```c
if (p != NULL) {
    *p = 10;
}
```

Short-circuit pada operator `&&` juga dapat digunakan.

```c
if (p != NULL && *p > 0) {
    printf("valid\n");
}
```

Tiga kategori pointer yang perlu diwaspadai.

1. **NULL pointer** adalah pointer yang tidak menunjuk ke objek valid.
2. **Uninitialized pointer** adalah pointer yang belum diberi nilai awal. Isinya tidak dapat diprediksi.
3. **Dangling pointer** adalah pointer yang pernah valid, tetapi objek yang ditunjuk sudah tidak valid.

Contoh uninitialized pointer.

```c
int *p;
*p = 5;
```

Contoh tersebut menghasilkan undefined behavior karena `p` belum menunjuk ke alamat valid. Biasakan menginisialisasi pointer, minimal dengan `NULL`.

```c
int *p = NULL;
```

Dangling pointer sering muncul ketika pointer menunjuk ke variabel lokal dari fungsi yang sudah return, atau menunjuk ke memori heap yang sudah dilepas dengan `free`.

---

## 6.6 Mengubah Variabel Pemanggil dengan Pointer

C menggunakan pass by value. Artinya, argumen disalin ke parameter fungsi. Jika fungsi menerima `int x`, perubahan pada `x` tidak mengubah variabel asli milik pemanggil.

Pointer memungkinkan fungsi menerima alamat variabel pemanggil. Alamat tersebut tetap disalin, tetapi salinan alamat masih menunjuk ke objek yang sama.

```c
#include <stdio.h>

void tambah_sepuluh(int *p) {
    *p = *p + 10;
}

int main(void) {
    int a = 5;

    tambah_sepuluh(&a);
    printf("a = %d\n", a);
    return 0;
}
```

Pemanggilan `tambah_sepuluh(&a)` mengirim alamat `a`. Parameter `p` menerima salinan alamat tersebut. Ketika fungsi menulis `*p`, yang diubah adalah objek pada alamat itu, yaitu `a` milik pemanggil.

Pola ini sering disebut **pass by address**. C tetap pass by value, tetapi nilai yang dikirim adalah alamat.

---

## 6.7 Parameter Keluaran

Pointer sering digunakan untuk mengembalikan lebih dari satu hasil dari fungsi. Karena `return` hanya mengembalikan satu nilai, hasil tambahan dapat ditulis ke alamat yang dikirim oleh pemanggil.

```c
#include <stdio.h>

void bagi(int a, int b, int *hasil, int *sisa) {
    *hasil = a / b;
    *sisa = a % b;
}

int main(void) {
    int h, s;

    bagi(17, 5, &h, &s);
    printf("17 / 5 = %d sisa %d\n", h, s);
    return 0;
}
```

Parameter `hasil` dan `sisa` adalah parameter keluaran. Fungsi menulis hasil perhitungan ke alamat yang diberikan oleh pemanggil.

Pola ini umum pada API C. Nilai kembalian sering digunakan untuk status sukses atau gagal, sedangkan data hasil operasi dikembalikan melalui pointer.

---

## 6.8 Mengapa pointer penting

Pointer penting karena memberi C akses langsung ke alamat memori. Beberapa penggunaan utama pointer adalah sebagai berikut.

1. Menghindari penyalinan data besar. Fungsi dapat menerima pointer ke data, bukan menyalin seluruh data.
2. Mengizinkan beberapa bagian program bekerja pada data yang sama.
3. Mendukung struktur data dinamis seperti linked list, tree, dan graph.
4. Mengakses memori heap yang dialokasikan dengan `malloc`.
5. Berinteraksi dengan operating system dan hardware melalui buffer atau memory-mapped I/O.

Tanpa pointer, C tidak dapat menyediakan kontrol memori tingkat rendah yang menjadi alasan utama bahasa ini digunakan dalam system programming.

---

## 6.9 `void *`

`void *` adalah pointer generik. Pointer jenis ini dapat menyimpan alamat objek bertipe apa pun.

```c
void *vp;

int x = 5;
vp = &x;

double d = 3.14;
vp = &d;
```

Karena `void *` tidak membawa informasi tipe konkret, pointer ini tidak dapat langsung di-dereference. Pointer harus di-cast ke tipe yang sesuai terlebih dahulu.

```c
int x = 5;
void *vp = &x;

printf("%d\n", *(int *)vp);
```

`void *` digunakan pada API yang bekerja dengan data generik. Contohnya adalah `malloc`, yang mengembalikan `void *`, dan `memcpy`, yang menerima pointer ke byte memory tanpa peduli tipe data asalnya.

---

## 6.10 Deklarasi Beberapa Pointer

Sintaks deklarasi pointer di C perlu dibaca dengan hati-hati.

```c
int* a, b;
```

Deklarasi tersebut membuat `a` sebagai `int *`, tetapi `b` sebagai `int` biasa. Simbol `*` melekat pada declarator, bukan pada seluruh tipe di deklarasi.

Jika ingin mendeklarasikan dua pointer, tulis seperti ini.

```c
int *a, *b;
```

Alternatif yang lebih jelas adalah satu deklarasi per baris.

```c
int *a;
int *b;
```

Gaya `int *p` sering dipilih karena mencerminkan aturan deklarasi C dengan lebih jelas daripada `int* p`, terutama ketika ada lebih dari satu variabel dalam satu deklarasi.

---

## 6.11 Membaca Deklarasi Pointer Sederhana

Beberapa bentuk deklarasi pointer perlu dibedakan sejak awal.

```c
int *p;
const int *p1;
int *const p2 = &x;
```

`int *p` berarti `p` adalah pointer to `int`.

`const int *p1` berarti `p1` adalah pointer to `const int`. Nilai yang ditunjuk tidak boleh diubah melalui `p1`, tetapi `p1` boleh diarahkan ke objek lain.

`int *const p2` berarti `p2` adalah const pointer to `int`. Nilai yang ditunjuk boleh diubah, tetapi `p2` tidak boleh diarahkan ke alamat lain setelah inisialisasi.

```c
int x = 1, y = 2;

const int *p1 = &x;
/* *p1 = 5; */
p1 = &y;

int *const p2 = &x;
*p2 = 5;
/* p2 = &y; */
```

`const int *` umum digunakan pada parameter fungsi yang hanya membaca data. Contohnya adalah `strlen(const char *s)`. Dengan `const`, fungsi menyatakan bahwa data yang ditunjuk tidak akan diubah.

---

## 6.12 Rangkuman Model Mental

1. Pointer adalah variabel yang menyimpan alamat memori.
2. Operator `&` mengambil alamat sebuah variabel.
3. Operator `*` pada ekspresi melakukan dereference.
4. Simbol `*` pada deklarasi menandai declarator sebagai pointer.
5. Tipe pointer menentukan cara dereference dan aritmetika pointer dilakukan.
6. `p + 1` bergerak satu elemen, bukan satu byte.
7. `arr[i]` setara dengan `*(arr + i)`.
8. `NULL` menandakan pointer tidak menunjuk ke objek valid.
9. Uninitialized pointer dan dangling pointer menghasilkan undefined behavior ketika digunakan.
10. Pointer memungkinkan fungsi mengubah variabel milik pemanggil melalui pass by address.
11. Parameter keluaran digunakan untuk menulis hasil ke alamat yang diberikan pemanggil.
12. `void *` adalah pointer generik yang perlu di-cast sebelum dereference.

---

## 6.13 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Tulis program dengan `int x = 7; int *p = &x;`. Cetak `x`, `&x`, `p`, dan `*p`. Ubah `x` melalui `*p`, lalu cetak `x` lagi.
2. Tulis `void tukar(int *a, int *b)` untuk menukar isi dua variabel. Panggil dengan `tukar(&m, &n)` dari `main`.
3. Buat `int arr[4] = {10, 20, 30, 40}; int *p = arr;`. Cetak `*p`, `*(p + 1)`, `*(p + 2)`, dan `*(p + 3)` beserta alamatnya.
4. Ulangi latihan aritmetika pointer dengan array `char` dan `double`. Bandingkan selisih alamat antar elemen.
5. Buktikan bahwa `arr[2]` dan `*(arr + 2)` menghasilkan nilai yang sama.
6. Deklarasikan `int *p = NULL;`, lalu coba dereference. Jalankan ulang dengan `-fsanitize=address` dan baca laporan sanitizer.
7. Tulis `void bagi(int a, int b, int *hasil, int *sisa)` dan gunakan dari `main`.
8. Tulis `int* a, b;`, lalu cek `sizeof(a)` dan `sizeof(b)`. Jelaskan mengapa hanya `a` yang pointer.

### Pertanyaan Refleksi

1. Apa perbedaan antara variabel biasa dan pointer?
2. Apa perbedaan makna `*` pada `int *p;` dan `*p = 10;`?
3. Mengapa fungsi `tukar` perlu menerima pointer?
4. Mengapa `p + 1` bergantung pada tipe pointer?
5. Mengapa mengirim `&a` memungkinkan fungsi mengubah `a`, padahal C tetap pass by value?
6. Apa perbedaan NULL pointer, uninitialized pointer, dan dangling pointer?
7. Mengapa pointer penting untuk struktur data dinamis dan memori heap?
8. Apa perbedaan `const int *p` dan `int *const p`?

---

Bab ini membahas pointer sebagai variabel yang menyimpan alamat. Materi yang dibahas mencakup address-of, dereference, aritmetika pointer, `NULL`, pass by address, parameter keluaran, `void *`, dan deklarasi pointer.

Pada Bab 7, pembahasan berlanjut ke pointer lanjutan. Topiknya mencakup pointer ke pointer, hubungan array dan pointer yang lebih rinci, const correctness, dan pointer ke fungsi.

