---
title: "Bab 7 - Pointer Lanjutan"
description: "Bab 6 telah membahas dasar pointer, termasuk alamat, dereference, hubungan pointer dengan array, dan penggunaan pointer sebagai parameter fungsi. Bab ini melanjutkan..."
tags: [c, systems-programming]
order: 7
updated: 2026-07-02
---
Bab 6 telah membahas dasar pointer, termasuk alamat, dereference, hubungan pointer dengan array, dan penggunaan pointer sebagai parameter fungsi. Bab ini melanjutkan pembahasan tersebut ke beberapa konsep yang lebih sering muncul dalam kode C nyata, terutama pada pemrograman sistem, pustaka, API sistem operasi, dan struktur data dinamis.

Empat topik utama yang dibahas adalah pointer ke pointer, perbedaan array dan pointer, ketepatan penggunaan `const`, serta pointer ke fungsi. Keempatnya penting karena banyak API C menggunakan pola ini untuk mengelola memori, menerima argumen baris perintah, menjaga kontrak parameter, dan mengirim perilaku melalui callback.

---

## 7.1 Pointer ke Pointer (`int **`)

Pointer adalah variabel yang menyimpan alamat. Karena pointer juga merupakan variabel, pointer memiliki alamat sendiri. Pointer ke pointer adalah pointer yang menyimpan alamat dari pointer lain.

```c
#include <stdio.h>

int main(void) {
    int x = 42;
    int *p = &x;      // p menunjuk ke x
    int **pp = &p;    // pp menunjuk ke p

    printf("x    = %d\n", x);        // 42
    printf("*p   = %d\n", *p);       // 42
    printf("**pp = %d\n", **pp);     // 42
    return 0;
}
```

Urutan evaluasi `**pp` dapat dibaca sebagai berikut.

- `pp` menyimpan alamat `p`.
- `*pp` menghasilkan nilai yang tersimpan di alamat tersebut, yaitu `p`.
- `p` menyimpan alamat `x`.
- `**pp` menghasilkan nilai yang tersimpan di alamat `x`, yaitu `42`.

Hubungan memorinya dapat digambarkan seperti ini.

```text
pp ----> p ----> x
int**   int*    int

*pp  menghasilkan p
**pp menghasilkan x
```

### Kapan Pointer ke Pointer Digunakan

Pointer ke pointer sering digunakan ketika sebuah fungsi perlu mengubah pointer milik pemanggil. Prinsipnya sama dengan parameter berbasis alamat yang sudah dibahas sebelumnya. Jika fungsi ingin mengubah variabel asli, fungsi harus menerima alamat variabel tersebut. Jika variabel yang ingin diubah adalah pointer, maka yang dikirim adalah alamat dari pointer itu.

```c
#include <stdio.h>
#include <stdlib.h>

void alokasi(int **out) {
    *out = malloc(sizeof(int));   // mengubah pointer milik pemanggil
    **out = 99;
}

int main(void) {
    int *p = NULL;
    alokasi(&p);
    printf("%d\n", *p);           // 99
    free(p);
    return 0;
}
```

Jika parameter `alokasi` ditulis sebagai `int *out`, fungsi hanya menerima salinan pointer. Perubahan pada `out` tidak akan mengubah `p` di `main`. Karena itu, pola `T **out` umum digunakan pada fungsi yang mengalokasikan sumber daya lalu menyerahkan alamatnya kepada pemanggil.

Pointer ke pointer juga muncul pada array berisi string. Contoh paling umum adalah parameter `argv` pada fungsi `main`.

```c
int main(int argc, char **argv) { ... }
```

`argv` bertipe `char **`. Nilai `argv` menunjuk ke elemen-elemen bertipe `char *`, dan setiap `char *` menunjuk ke satu string argumen baris perintah. Dengan demikian, `argv[0]` bertipe `char *`, sedangkan `argv[0][0]` bertipe `char`.

```c
#include <stdio.h>

int main(int argc, char **argv) {
    printf("jumlah argumen = %d\n", argc);
    for (int i = 0; i < argc; i++)
        printf("argv[%d] = %s\n", i, argv[i]);
    return 0;
}
```

Jika program dijalankan dengan `./program halo dunia`, maka `argv[0]` berisi nama program, `argv[1]` berisi `"halo"`, dan `argv[2]` berisi `"dunia"`.

---

## 7.2 Array dan Pointer adalah Konsep yang Berbeda

Bab 5 menjelaskan bahwa nama array dapat mengalami decay menjadi pointer ke elemen pertamanya. Aturan ini sering membuat pemula menyimpulkan bahwa array sama dengan pointer. Kesimpulan tersebut keliru. Array dan pointer memang dapat digunakan dengan sintaks yang mirip pada beberapa konteks, tetapi keduanya tetap memiliki makna dan perilaku yang berbeda.

```c
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;            // arr decay menjadi &arr[0]
```

Ekspresi `arr[i]`, `*(arr + i)`, `p[i]`, dan `*(p + i)` menghasilkan nilai yang sama pada contoh di atas. Kesamaan ini tidak berarti `arr` dan `p` adalah jenis objek yang sama.

### Perbedaan 1 - `sizeof`

```c
printf("%zu\n", sizeof(arr));   // 20 jika int berukuran 4 byte
printf("%zu\n", sizeof(p));     // ukuran pointer
```

`sizeof(arr)` menghasilkan ukuran seluruh array. Jika `arr` berisi 5 elemen `int` dan setiap `int` berukuran 4 byte, hasilnya adalah 20 byte. Sebaliknya, `sizeof(p)` menghasilkan ukuran pointer, bukan ukuran array yang ditunjuk. Pada sistem 64-bit, ukuran pointer umumnya 8 byte.

Perbedaan ini juga menjelaskan mengapa fungsi yang menerima parameter `int arr[]` tidak dapat mengetahui panjang array hanya dari parameter tersebut. Di parameter fungsi, array sudah disesuaikan menjadi pointer.

### Perbedaan 2 - Array Tidak Dapat Diarahkan Ulang

```c
int a[5], b[5];
int *p = a;

p = b;          // valid
a = b;          // tidak valid
```

Pointer adalah variabel yang dapat diisi alamat baru. Array bukan variabel pointer. Nama array merepresentasikan blok memori dengan ukuran tetap dan lokasi yang tetap selama masa hidupnya. Karena itu, nama array tidak dapat diberi nilai array lain.

### Perbedaan 3 - `&arr` dan `&p` Memiliki Tipe Berbeda

Jika `arr` dideklarasikan sebagai `int arr[5]`, maka `&arr` bertipe `int (*)[5]`, yaitu pointer ke array berisi 5 `int`. Alamat numeriknya sama dengan alamat elemen pertama, tetapi tipe hasilnya berbeda. Akibatnya, ekspresi `&arr + 1` bergerak sejauh satu array penuh, bukan sejauh satu elemen.

Sementara itu, jika `p` dideklarasikan sebagai `int *p`, maka `&p` bertipe `int **`, yaitu pointer ke variabel pointer.

### Parameter `int arr[]` dan `int *arr`

Pada parameter fungsi, penulisan berikut diperlakukan sama oleh compiler.

```c
void f(int arr[]);
void f(int *arr);
```

Penulisan `int arr[]` pada parameter dapat membantu pembaca memahami bahwa fungsi tersebut menerima deretan elemen. Namun secara tipe, parameter tersebut tetap pointer. Karena itu, informasi panjang array harus dikirim secara terpisah jika fungsi membutuhkannya.

Array adalah blok memori berukuran tetap. Pointer adalah variabel yang menyimpan alamat dan dapat diarahkan ulang. Aturan decay membuat keduanya sering dipakai berdampingan, tetapi tidak menghapus perbedaan konsep di antara keduanya.

---

## 7.3 Ketepatan Penggunaan `const`

`const` pada parameter pointer digunakan untuk menyatakan bahwa data yang ditunjuk tidak akan diubah melalui pointer tersebut. Pada kode C yang baik, `const` bukan sekadar hiasan sintaks. `const` adalah bagian dari kontrak fungsi yang dapat diperiksa oleh compiler.

Tiga bentuk deklarasi berikut perlu dibedakan.

- `const int *p` atau `int const *p` berarti pointer ke `int` yang tidak boleh diubah melalui `p`. Nilai `p` masih dapat diarahkan ke alamat lain.
- `int *const p` berarti pointer konstan ke `int`. Data yang ditunjuk dapat diubah, tetapi `p` tidak dapat diarahkan ulang.
- `const int *const p` berarti pointer konstan ke data yang tidak boleh diubah melalui pointer tersebut.

Cara membacanya adalah dari kanan ke kiri. Deklarasi `int *const p` berarti `p` adalah pointer konstan ke `int`. Deklarasi `const int *p` berarti `p` adalah pointer ke `int` yang diperlakukan sebagai konstan melalui pointer tersebut.

### `const` pada Parameter Fungsi

Beberapa fungsi pustaka standar menggunakan `const` untuk membedakan parameter yang hanya dibaca dan parameter yang dapat ditulis.

```c
size_t strlen(const char *s);
int strcmp(const char *a, const char *b);
void *memcpy(void *dst, const void *src, size_t n);
```

Parameter yang hanya dibaca diberi `const`. Parameter tujuan yang akan ditulis tidak diberi `const`. Dengan cara ini, tanda tangan fungsi menyampaikan niat fungsi secara jelas, dan compiler dapat menolak perubahan yang melanggar kontrak tersebut.

```c
void cetak(const char *s) {
    // s[0] = 'X';   // error karena s menunjuk data yang diperlakukan konstan
    printf("%s\n", s);
}

int main(void) {
    cetak("literal");
    return 0;
}
```

Pada contoh di atas, `cetak` menerima `const char *` karena fungsi hanya membaca string. Jika ada kode di dalam fungsi yang mencoba mengubah `s[0]`, compiler dapat memberi error. Keuntungan lainnya adalah fungsi tersebut dapat menerima string literal, karena string literal tidak boleh dimodifikasi.

Biasakan memberi `const` pada parameter pointer yang hanya dibaca. Praktik ini membuat fungsi lebih jelas, lebih aman, dan lebih mudah digunakan oleh pemanggil.

---

## 7.4 Pointer ke Fungsi

Pointer biasanya menunjuk ke data, seperti variabel atau elemen array. Dalam C, fungsi juga memiliki alamat di memori. Karena itu, C memungkinkan sebuah pointer menyimpan alamat fungsi. Pointer semacam ini disebut pointer ke fungsi.

### Sintaks Dasar

```c
int tambah(int a, int b) { return a + b; }

int main(void) {
    int (*op)(int, int);
    op = tambah;
    printf("%d\n", op(3, 4));   // 7
    return 0;
}
```

Deklarasi `int (*op)(int, int)` dapat dibaca dengan urutan berikut.

- `op` adalah variabel.
- `(*op)` menunjukkan bahwa `op` adalah pointer.
- `(int, int)` menunjukkan bahwa fungsi yang ditunjuk menerima dua parameter `int`.
- `int` di depan menunjukkan bahwa fungsi tersebut mengembalikan `int`.

Tanda kurung pada `(*op)` wajib digunakan. Tanpa tanda kurung, deklarasi `int *op(int, int)` berarti `op` adalah fungsi yang mengembalikan `int *`, bukan pointer ke fungsi.

Pemanggilan pointer ke fungsi dapat ditulis sebagai `op(3, 4)` atau `(*op)(3, 4)`. Keduanya sah. Nama fungsi, seperti nama array pada konteks tertentu, dapat dikonversi menjadi alamatnya. Karena itu, `op = tambah` dan `op = &tambah` sama-sama dapat digunakan.

### Kegunaan Pointer ke Fungsi

Pointer ke fungsi memungkinkan program memilih perilaku saat waktu eksekusi dan mengirim fungsi sebagai argumen. Pola ini digunakan untuk callback, tabel dispatch, dan algoritma generik.

Callback adalah pola ketika sebuah fungsi diberikan kepada kode lain agar dipanggil kembali pada waktu tertentu. Pola ini umum pada event handler, signal handler, thread start routine, dan API pustaka.

Tabel dispatch menggunakan array berisi pointer ke fungsi untuk memilih fungsi berdasarkan indeks atau kode operasi.

```c
#include <stdio.h>

int tambah(int a, int b) { return a + b; }
int kurang(int a, int b) { return a - b; }
int kali (int a, int b) { return a * b; }

int main(void) {
    int (*tabel[3])(int, int) = { tambah, kurang, kali };
    const char *nama[3] = { "+", "-", "*" };

    for (int i = 0; i < 3; i++)
        printf("5 %s 3 = %d\n", nama[i], tabel[i](5, 3));
    return 0;
}
```

Dengan tabel seperti ini, program dapat memilih fungsi berdasarkan indeks tanpa menulis percabangan panjang. Pola yang sama sering digunakan pada interpreter, virtual machine, dan driver yang memiliki tabel operasi.

Contoh pointer ke fungsi yang sangat penting adalah fungsi pembanding untuk `qsort`.

```c
#include <stdio.h>
#include <stdlib.h>

int banding(const void *a, const void *b) {
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}

int main(void) {
    int arr[] = {5, 2, 8, 1, 9, 3};
    size_t n = sizeof(arr) / sizeof(arr[0]);

    qsort(arr, n, sizeof(arr[0]), banding);

    for (size_t i = 0; i < n; i++)
        printf("%d ", arr[i]);
    printf("\n");
    return 0;
}
```

`qsort` dapat mengurutkan array dengan tipe elemen apa pun karena ia tidak perlu mengetahui makna setiap elemen. Fungsi pembanding yang diberikan oleh pemanggil menentukan urutan elemen. Parameter `void *` memungkinkan `qsort` bekerja dengan alamat elemen dari berbagai tipe, sedangkan `const` menyatakan bahwa fungsi pembanding hanya membaca elemen.

### `typedef` untuk Pointer ke Fungsi

Sintaks pointer ke fungsi dapat sulit dibaca, terutama jika dipakai berulang kali. `typedef` dapat digunakan untuk memberi nama pada tipe pointer ke fungsi.

```c
typedef int (*Operasi)(int, int);

Operasi op = tambah;
int (*tabel[3])(int, int);
Operasi tabel2[3];
```

Dengan `typedef`, deklarasi variabel dan array pointer ke fungsi menjadi lebih ringkas. Pada kode C yang besar, pointer ke fungsi sering diberi `typedef` agar tanda tangan fungsi lebih mudah dibaca dan dipertahankan.

---

## 7.5 Pointer ke Struct

Pointer ke `struct` akan sering digunakan ketika bekerja dengan data berukuran besar atau struktur data dinamis. Untuk mengakses anggota `struct` melalui pointer, C menyediakan operator `->`.

```c
p->nama        // setara dengan (*p).nama
```

Pembahasan lengkap tentang `struct`, termasuk penggunaan pointer ke `struct`, akan dibahas pada Bab 8.

---

## 7.6 Rangkuman Model Mental

1. Pointer ke pointer `T **` adalah pointer yang menunjuk ke pointer lain. Dereference dilakukan dua kali untuk mencapai data akhir.
2. Pointer ke pointer berguna ketika fungsi perlu mengubah pointer milik pemanggil dan ketika program bekerja dengan array berisi string seperti `char **argv`.
3. Array dan pointer bukan konsep yang sama. Array adalah blok memori berukuran tetap, sedangkan pointer adalah variabel yang menyimpan alamat dan dapat diarahkan ulang.
4. Pada parameter fungsi, array mengalami penyesuaian menjadi pointer. Karena itu, panjang array harus dikirim secara terpisah jika dibutuhkan.
5. `const` pada parameter pointer menyatakan bahwa data yang ditunjuk hanya dibaca melalui pointer tersebut.
6. Pointer ke fungsi menyimpan alamat fungsi dan memungkinkan program menggunakan callback, tabel dispatch, serta algoritma generik seperti `qsort`.
7. `typedef` dapat membuat deklarasi pointer ke fungsi lebih mudah dibaca.

---

## 7.7 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Buat `int x = 5; int *p = &x; int **pp = &p;`. Cetak `x`, `*p`, `**pp`, `p`, dan `*pp`. Ubah `x` menjadi `50` hanya melalui `**pp`.
2. Tulis fungsi `void alokasi(int **out)` yang melakukan `malloc` untuk satu `int` dan mengisi `*out`. Buktikan bahwa pointer di `main` yang awalnya `NULL` menjadi menunjuk memori valid. Setelah itu, tulis versi salah dengan parameter `int *out` dan jelaskan mengapa pointer di `main` tetap `NULL`.
3. Buat `int arr[5]` dan `int *p = arr`. Cetak `sizeof(arr)` dan `sizeof(p)`. Jelaskan mengapa hasilnya berbeda. Kirim `arr` ke sebuah fungsi dan cetak `sizeof` parameter di dalam fungsi tersebut.
4. Tulis fungsi `void cetak(const char *s)`, lalu coba ubah `s[0]` di dalam fungsi. Amati pesan compiler. Hapus `const` dan bandingkan perilakunya.
5. Buat program kalkulator dengan array berisi pointer ke fungsi untuk operasi tambah, kurang, kali, dan bagi. Pilih operasi berdasarkan karakter operator.
6. Gunakan `qsort` untuk mengurutkan array `int` secara menurun. Ubah fungsi `banding` agar menghasilkan urutan descending.
7. Tulis `typedef` untuk pointer ke fungsi bertipe `int (*)(int, int)`, lalu gunakan untuk mendeklarasikan variabel dan array.

### Pertanyaan Refleksi

1. Jelaskan apa itu `int **` dan mengapa dereference perlu dilakukan dua kali.
2. Sebutkan dua situasi nyata yang membutuhkan pointer ke pointer.
3. Sebutkan tiga perbedaan konkret antara array dan pointer.
4. Jelaskan manfaat `const char *s` pada parameter fungsi.
5. Jelaskan perbedaan pointer ke fungsi dengan pointer biasa.
6. Jelaskan bagaimana `qsort` dapat mengurutkan tipe data yang berbeda-beda.
7. Sebutkan tiga contoh penggunaan pointer ke fungsi pada pemrograman sistem.

---

Bab ini menyelesaikan pembahasan pointer dari dasar hingga konsep lanjutan yang sering muncul dalam kode C. Bab 8 akan membahas `struct`, `union`, dan `enum`, termasuk bagaimana data majemuk ditata di memori melalui padding dan alignment.

