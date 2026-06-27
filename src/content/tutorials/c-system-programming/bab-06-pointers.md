---
title: "Bab 6 — Pointers (Jantungnya C)"
description: "Bab ini sering dianggap sebagai bagian yang membuat C terasa sulit. Namun fondasinya sebenarnya sudah kita bangun sejak beberapa bab sebelumnya. Bab 2 membahas alamat..."
tags: [c, system-programming]
order: 6
updated: 2026-06-21
---

> "Variabel menyimpan nilai. Pointer menyimpan alamat tempat nilai itu berada."

Bab ini sering dianggap sebagai bagian yang membuat C terasa sulit. Namun fondasinya sebenarnya sudah kita bangun sejak beberapa bab sebelumnya. Bab 2 membahas alamat dan operator `&`, Bab 4 membahas pass by value dan kebutuhan mengirim alamat, lalu Bab 5 menunjukkan bahwa `arr[i]` berkaitan dengan `*(arr + i)` dan array decay menjadi pointer.

Jadi kita tidak mulai dari nol. Di bab ini, potongan-potongan itu kita susun menjadi satu model yang utuh.

Pointer tidak sulit karena rumit secara matematika. Pointer terasa sulit karena konsepnya tidak familiar. Begitu modelnya terbentuk, pointer menjadi alat yang masuk akal untuk bekerja langsung dengan alamat memori.

---

## 6.1 Rekap: memori, alamat, dan `&`

Ingat Bab 2: memori adalah deretan byte bernomor. Nomor itu disebut **alamat**. Setiap variabel hidup di alamat tertentu.

```c
int x = 42;
```

Kode ini menaruh nilai `42` di sepetak memori, biasanya 4 byte untuk `int`. Petak memori itu punya **alamat**. Operator `&`, yang disebut **address-of**, memberi kita alamat tersebut:

```c
#include <stdio.h>

int main(void) {
    int x = 42;
    printf("nilai x       : %d\n", x);
    printf("alamat x (&x) : %p\n", (void *)&x);
    return 0;
}
```

`&x` dibaca "alamat dari `x`". Outputnya bisa berupa nilai seperti `0x7ffd3a2b4c5c`. Itu adalah alamat tempat nilai `42` disimpan.

**Pointer adalah variabel yang khusus dipakai untuk menyimpan alamat seperti itu.**

---

## 6.2 Mendeklarasikan pointer & dua operator kuncinya

```c
int x = 42;
int *p = &x;     // p adalah pointer ke int; isinya alamat x
```

Mari bedah `int *p`.

- `p` adalah sebuah variabel.
- Tipenya `int *`, dibaca "pointer to int". Artinya, `p` menyimpan alamat dari sebuah `int`.
- `*` di deklarasi menandai bahwa variabel ini adalah pointer. Simbol `*` juga dipakai untuk operasi lain, dan sebentar lagi kita bedakan.

Dua operator ini perlu jelas sejak awal:

| Operator | Nama | Arti |
|----------|------|------|
| `&` | address-of | "berikan **alamat** dari variabel ini" |
| `*` | dereference | "berikan **isi** yang ada di alamat ini" |

`&` dan `*` saling berpasangan. `&x` menghasilkan alamat `x`. `*p` mengambil isi di alamat yang disimpan dalam `p`. Jika `p = &x`, maka `*p` adalah nilai `x`.

```c
#include <stdio.h>

int main(void) {
    int x = 42;
    int *p = &x;

    printf("x       = %d\n", x);          // 42
    printf("&x      = %p\n", (void *)&x); // alamat x
    printf("p       = %p\n", (void *)p);  // SAMA dengan &x (p menyimpan alamat x)
    printf("*p      = %d\n", *p);         // 42 (isi di alamat p) -> dereference

    *p = 100;                              // ubah ISI di alamat p
    printf("x       = %d\n", x);          // 100! x berubah lewat p
    return 0;
}
```

Baris `*p = 100;` adalah inti contoh ini. Kita tidak mengubah nilai `p`. Alamat yang disimpan di `p` tetap sama. Yang diubah adalah **isi di alamat yang ditunjuk oleh `p`**. Karena alamat itu adalah alamat `x`, maka `x` berubah menjadi 100.

Pointer memberi kita akses tidak langsung, atau indirect access, untuk membaca dan menulis data di alamat tertentu.

### Analogi: alamat rumah

Pikirkan seperti ini:

- **Variabel `x`** adalah rumah yang berisi barang, misalnya nilai 42.
- **Alamat `&x`** adalah alamat rumah itu, misalnya "Jl. Memori No. 1000".
- **Pointer `p`** adalah kertas yang menyimpan alamat rumah tersebut.
- **`*p` (dereference)** berarti pergi ke alamat yang tertulis di kertas, lalu melihat atau mengubah isi rumahnya.

`p = &x` berarti menyalin alamat rumah ke kertas. `*p = 100` berarti pergi ke rumah itu dan mengganti isinya. Rumahnya tetap sama, yaitu `x`, tetapi isinya berubah.

> **Bedakan dua makna `*`:**
>
> - Di **deklarasi** (`int *p`), `*` berarti "ini pointer".
> - Di **ekspresi** (`*p = 100`, `y = *p`), `*` berarti "dereference", yaitu akses isi di alamat ini.
>
> Simbolnya sama, tetapi konteksnya berbeda. Saat melihat `*`, tanyakan dulu apakah ini bagian dari deklarasi atau ekspresi.

---

## 6.3 Ukuran pointer & kenapa pointer "punya tipe"

Pointer selalu menyimpan alamat. Ukuran alamat itu seragam dalam satu arsitektur. Di mesin 64-bit, alamat berukuran 64 bit, atau **8 byte**.

```c
printf("%zu\n", sizeof(int *));    // 8 (di mesin 64-bit)
printf("%zu\n", sizeof(char *));   // 8 juga
printf("%zu\n", sizeof(double *)); // 8 juga
```

`int *`, `char *`, dan `double *` sama-sama berukuran 8 byte di mesin 64-bit, karena semuanya menyimpan alamat.

Lalu kenapa pointer perlu tipe seperti `int *`, `char *`, atau `double *` jika ukurannya sama? Ada dua alasan penting:

1. **Dereference perlu tahu berapa byte yang dibaca.** Saat kamu menulis `*p`, compiler perlu tahu apakah harus membaca 4 byte seperti `int *`, 1 byte seperti `char *`, atau 8 byte seperti `double *`. Tipe pointer adalah cara compiler menafsirkan byte di alamat tujuan.
2. **Pointer arithmetic perlu tahu ukuran satu langkah.** Ini dibahas di Bagian 6.4.

Jadi pointer memang menyimpan alamat, tetapi tipenya menentukan bagaimana alamat itu dipakai.

---

## 6.4 Pointer arithmetic: maju mundur dalam satuan elemen

Di sinilah hubungan pointer dan array dari Bab 5 menjadi jelas. Pointer bisa dipakai dalam aritmetika, tetapi aturannya penting:

> **`p + 1` tidak berarti "alamat + 1 byte". `p + 1` berarti "maju satu elemen", yaitu `+ sizeof(tipe)` byte.**

```c
#include <stdio.h>

int main(void) {
    int arr[3] = {10, 20, 30};
    int *p = arr;          // ingat Bab 5: nama array decay jadi &arr[0]

    printf("p     = %p -> %d\n", (void *)p,     *p);       // arr[0] = 10
    printf("p + 1 = %p -> %d\n", (void *)(p+1), *(p+1));   // arr[1] = 20
    printf("p + 2 = %p -> %d\n", (void *)(p+2), *(p+2));   // arr[2] = 30
    return 0;
}
```

Perhatikan alamatnya. `p + 1` biasanya lebih besar 4 byte dari `p`, bukan 1 byte, karena `p` bertipe `int *` dan `int` biasanya 4 byte. Compiler otomatis mengalikan langkah dengan `sizeof(int)`.

Jika `p` bertipe `char *`, maka `p + 1` maju 1 byte. Jika `p` bertipe `double *`, maka `p + 1` maju 8 byte.

Sekarang rumus dari Bab 5 menjadi lengkap:

> **`arr[i]` sama dengan `*(arr + i)`**

Indexing array adalah pointer arithmetic ditambah dereference, hanya dibungkus dengan sintaks yang lebih nyaman.

```c
int arr[3] = {10, 20, 30};
printf("%d\n", arr[1]);      // 20
printf("%d\n", *(arr + 1));  // 20 — identik
```

Pointer arithmetic mirip naik tangga. "Maju satu langkah" tidak berarti maju satu sentimeter; jarak satu langkah tergantung ukuran anak tangga. Dalam pointer, ukuran anak tangga ditentukan oleh tipe pointer.

---

## 6.5 `NULL`: pointer yang menunjuk ke "tidak ada"

Pointer seharusnya menunjuk ke alamat yang valid. Namun kadang kita butuh pointer yang secara eksplisit berarti "belum menunjuk ke apa pun" atau "tidak ada hasil". Untuk itu ada **`NULL`**.

```c
int *p = NULL;     // p sengaja tidak menunjuk apa-apa (belum)
```

`NULL` adalah nilai pointer khusus yang secara konsep berarti "tidak menunjuk ke mana pun". Ini sering dipakai sebagai penanda. Misalnya, fungsi yang mengembalikan pointer bisa mengembalikan `NULL` untuk menandakan gagal atau tidak menemukan data. Kamu akan melihat pola ini lagi pada `malloc` di Bab 9 dan `fopen` di Bab 12.

Bahaya muncul ketika program melakukan dereference pada `NULL`:

```c
int *p = NULL;
printf("%d\n", *p);   // crash: "Segmentation fault"
```

Dereference pada `NULL`, atau pointer lain yang tidak valid, biasanya menyebabkan **segmentation fault**. Itu sinyal dari OS bahwa program mencoba mengakses memori yang tidak boleh diakses. Dalam banyak kasus, crash langsung seperti ini lebih mudah di-debug daripada bug yang merusak data diam-diam.

> Karena itu pola defensif dari Bab 3 penting. `if (p != NULL) { *p = ...; }` memastikan pointer dicek sebelum dereference. Short-circuit juga membantu: `if (p != NULL && *p > 0)` aman; jika urutannya dibalik, program bisa crash.

### Tiga jenis pointer "bahaya"

1. **NULL pointer** — menunjuk ke "tidak ada". Dereference biasanya crash. Setidaknya error-nya jelas.
2. **Uninitialized pointer (wild pointer)** — pointer yang belum diberi nilai. Isinya adalah sampah acak dari stack. Dereference bisa menyebabkan crash, menulis ke memori acak, atau perilaku lain yang tidak terduga. **Selalu inisialisasi pointer**, minimal ke `NULL`.
   ```c
   int *p;          // bahaya: isi p adalah sampah
   *p = 5;          // menulis ke alamat acak
   int *q = NULL;   // lebih baik: setidaknya jelas "belum menunjuk apa-apa"
   ```
3. **Dangling pointer** — pointer yang dulu valid, tetapi sekarang menunjuk ke memori yang sudah tidak berlaku. Contohnya alamat variabel lokal yang fungsinya sudah return (Bab 4 Bagian 4.9), atau memori heap yang sudah di-`free` (Bab 9). Dereference menghasilkan undefined behavior.

Tiga jenis pointer ini adalah sumber banyak bug dan crash dalam program C. Kenali polanya sejak awal.

---

## 6.6 Pointer = cara C "mengubah variabel asli"

Ingat Bab 4: C selalu **pass by value**. Argumen disalin, sehingga fungsi tidak bisa mengubah variabel asli milik pemanggil jika yang dikirim hanya nilainya. Solusinya adalah mengirim **alamat** variabel tersebut.

```c
#include <stdio.h>

void tambah_sepuluh(int *p) {   // terima ALAMAT sebuah int
    *p = *p + 10;               // ubah ISI di alamat itu
}

int main(void) {
    int a = 5;
    tambah_sepuluh(&a);          // kirim ALAMAT a, bukan nilainya
    printf("a = %d\n", a);       // 15! a asli berubah
    return 0;
}
```

Kenapa ini bekerja, padahal C tetap pass by value? Karena yang disalin sekarang adalah **alamat** `a`, bukan nilai `a`. Parameter `p` memang salinan, tetapi salinan alamat itu tetap menunjuk ke tempat yang sama, yaitu variabel `a` di `main`. Jadi `*p = ...` benar-benar mengubah `a`.

Bandingkan dengan versi gagal di Bab 4:

```c
void coba_ubah(int x)
```

Pada versi itu, yang disalin adalah nilai. `x` adalah variabel baru yang terpisah. Pada versi pointer, yang disalin adalah alamat, sehingga fungsi masih bisa menjangkau memori variabel asli lewat `*p`.

Ini perbedaan kecil secara sintaks, tetapi besar secara perilaku.

### Pola "output parameter" & mengembalikan banyak nilai

Karena `return` hanya bisa mengembalikan satu nilai, pointer sering dipakai untuk "mengembalikan" beberapa nilai lewat parameter:

```c
#include <stdio.h>

// kembalikan hasil bagi DAN sisa sekaligus, lewat pointer
void bagi(int a, int b, int *hasil, int *sisa) {
    *hasil = a / b;
    *sisa  = a % b;
}

int main(void) {
    int h, s;
    bagi(17, 5, &h, &s);
    printf("17 / 5 = %d sisa %d\n", h, s);   // 3 sisa 2
    return 0;
}
```

Pola ini muncul di banyak API sistem. Sering kali fungsi mengembalikan status sukses/gagal lewat return value, sedangkan hasil utamanya ditulis ke alamat yang dikirim sebagai parameter. Kamu akan sering melihat pola seperti ini di bab-bab berikutnya.

---

## 6.7 Kenapa pointer begitu penting (gambaran besar)

Mungkin kamu bertanya kenapa C memberi akses langsung ke alamat, dan kenapa konsep ini begitu sentral.

Beberapa alasannya:

1. **Efisiensi.** Mengirim alamat, yang biasanya 8 byte di mesin 64-bit, jauh lebih murah daripada menyalin struktur data besar. Jika fungsi menerima array berisi 1 juta elemen, kita tidak ingin menyalin seluruh array setiap kali fungsi dipanggil. Kita cukup mengirim alamat awalnya.
2. **Berbagi dan memodifikasi data.** Beberapa bagian program bisa bekerja pada data yang sama lewat pointer, bukan salinan yang terpisah. Contohnya output parameter, array yang dikirim ke fungsi, dan struktur data dinamis.
3. **Struktur data dinamis.** Linked list, tree, graph, dan hash table dibangun dari node yang menunjuk node lain. Tanpa pointer, struktur seperti ini tidak bisa dibentuk secara fleksibel. Kita akan membangun linked list di Bab 9.
4. **Manajemen memori manual.** `malloc` di Bab 9 mengembalikan **pointer** ke memori yang baru dialokasikan. Memori heap diakses lewat pointer.
5. **Berinteraksi dengan hardware dan OS.** Dalam system programming, alamat memori adalah konsep utama. Memory-mapped I/O, buffer yang dibagi dengan kernel, dan banyak API level rendah bekerja lewat pointer.

Singkatnya, **pointer adalah cara C memberi kontrol langsung atas memori.** Itu yang membuat C cocok untuk system programming, sekaligus menuntut disiplin lebih tinggi dari programmer.

---

## 6.8 `void *`: pointer generik

Kadang kita membutuhkan pointer yang bisa menunjuk ke tipe apa pun. Untuk itu C menyediakan **`void *`**, yaitu pointer generik. Ia berarti "alamat sesuatu, tetapi tipenya belum ditentukan".

```c
void *vp;
int x = 5;
vp = &x;            // boleh menunjuk int
double d = 3.14;
vp = &d;            // boleh juga menunjuk double
```

`void *` adalah alamat tanpa informasi tipe. Karena compiler tidak tahu tipe data yang ditunjuk, kamu **tidak bisa langsung men-dereference** `void *` atau melakukan pointer arithmetic padanya. Kamu harus **cast** dulu ke tipe pointer yang konkret:

```c
int x = 5;
void *vp = &x;
// printf("%d", *vp);        // error: void* tak bisa di-dereference
printf("%d\n", *(int *)vp);  // ok: cast ke int* dulu, baru dereference
```

`void *` muncul di tempat penting. `malloc` mengembalikan `void *` karena ia hanya mengalokasikan memori, dan tidak tahu kamu akan memakai memori itu sebagai tipe apa. Fungsi seperti `memcpy(void *dst, const void *src, size_t n)` juga memakai `void *` agar bisa menyalin byte dari tipe apa pun. Ini salah satu cara C melakukan generic programming secara sederhana.

---

## 6.9 Jebakan deklarasi multi-pointer

Sintaks deklarasi pointer punya jebakan klasik:

```c
int* a, b;     // hati-hati: a adalah int*, tapi b adalah int biasa (bukan pointer)
```

`*` menempel ke variabel, bukan ke tipe secara keseluruhan. Jadi `int* a, b;` berarti `a` adalah pointer, tetapi `b` adalah `int` biasa. Banyak orang mengira keduanya pointer.

Cara yang lebih aman:

```c
int *a, *b;    // jelas: keduanya pointer
// atau deklarasikan satu per baris
int *a;
int *b;
```

Karena alasan ini, banyak programmer C menulis `int *p` daripada `int* p`. Gaya `int *p` lebih sesuai dengan aturan deklarasi C: bintang melekat pada nama variabel yang menjadi pointer.

---

## 6.10 Membaca tipe pointer (latihan kecil membaca deklarasi)

Di Bab 7, kita akan masuk ke pointer-to-pointer dan function pointer yang lebih rumit. Untuk sekarang, biasakan membaca deklarasi sederhana dari nama variabel ke luar.

- `int *p;` -> `p` adalah pointer to int.
- `const int *p;` -> `p` adalah pointer to **const int**. Kamu tidak boleh mengubah `*p`, yaitu isi yang ditunjuk, tetapi boleh mengubah `p` agar menunjuk ke tempat lain.
- `int *const p;` -> `p` adalah **const pointer** to int. Kamu boleh mengubah `*p`, tetapi `p` sendiri tidak boleh diarahkan ke alamat lain.

```c
int x = 1, y = 2;

const int *p1 = &x;
// *p1 = 5;       // error: tak boleh ubah isi yang ditunjuk
p1 = &y;          // ok: boleh ubah arah

int *const p2 = &x;
*p2 = 5;          // ok: boleh ubah isi
// p2 = &y;       // error: tak boleh ubah arah
```

`const int *p` sangat umum dipakai untuk parameter fungsi yang hanya membaca data dan berjanji tidak mengubahnya. Contohnya `size_t strlen(const char *s)`. `const` di situ adalah kontrak: fungsi ini tidak akan mengubah string yang kamu kirim. Kita akan membahas `const` lebih dalam di Bab 7.

---

## 6.11 Rangkuman model mental

1. **Pointer adalah variabel yang menyimpan alamat.**
2. **`&x`** menghasilkan alamat `x` (address-of). **`*p`** mengambil isi di alamat yang disimpan `p` (dereference).
3. **`*` punya dua makna.** Di deklarasi, `*` berarti "ini pointer". Di ekspresi, `*` berarti dereference.
4. Pointer **punya tipe** walaupun ukuran alamatnya sama di satu arsitektur. Tipe menentukan berapa byte dibaca saat dereference dan berapa byte maju saat pointer arithmetic.
5. **`p + 1` maju satu elemen**, bukan satu byte. Karena itu `arr[i]` sama dengan `*(arr + i)`.
6. **`NULL`** berarti pointer tidak menunjuk ke apa pun. Dereference `NULL` biasanya menyebabkan segfault. Selalu inisialisasi pointer; waspadai NULL pointer, wild pointer, dan dangling pointer.
7. **Mengirim alamat ke fungsi adalah cara C mengubah variabel asli** dan mengembalikan banyak nilai lewat output parameter.
8. **`void *`** adalah pointer generik yang perlu di-cast sebelum dipakai. Hati-hati dengan deklarasi seperti `int* a, b`, karena `b` bukan pointer.

---

## 6.12 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program: `int x = 7; int *p = &x;`. Cetak `x`, `&x`, `p`, `*p`. Konfirmasi `&x == p` dan `*p == x`. Lalu ubah `x` lewat `*p` dan cetak `x` lagi.
2. Tulis `void tukar(int *a, int *b)` yang menukar isi dua variabel (swap). Panggil dari `main` dengan `tukar(&m, &n)` dan buktikan `m` dan `n` benar-benar tertukar. Ini latihan pointer klasik; pastikan kamu paham kenapa harus memakai pointer.
3. Buat `int arr[4] = {10,20,30,40}; int *p = arr;`. Cetak `*p`, `*(p+1)`, `*(p+2)`, `*(p+3)` dan alamat masing-masing. Berapa selisih tiap alamat? Lalu ulangi dengan `char` dan `double`, kemudian bandingkan selisihnya.
4. Buktikan `arr[2]` dan `*(arr+2)` menghasilkan nilai yang sama. Lalu coba juga `*(2 + arr)`.
5. Deklarasikan `int *p = NULL;`, lalu tulis `*p = 5;` dan jalankan. Error apa yang muncul? Lalu compile dengan `-fsanitize=address`. Apa kata sanitizer?
6. Tulis `void bagi(int a, int b, int *hasil, int *sisa)` dari Bagian 6.6 dan pakai dari `main`. Pahami kenapa hasil dan sisa "kembali" tanpa lewat `return`.
7. Tulis `int* a, b;`, lalu cek `sizeof(a)` dan `sizeof(b)`. Apakah keduanya pointer? Kenapa?

**Pertanyaan refleksi:**

1. Dengan kata-katamu sendiri, memakai analogi rumah dan alamat, apa beda variabel biasa dan pointer?
2. Apa beda makna `*` di `int *p;` dan di `*p = 10;`?
3. Kenapa `tukar` atau swap **harus** memakai pointer? Apa yang terjadi kalau parameternya `int a, int b` biasa?
4. Kenapa `p + 1` tidak selalu berarti "alamat + 1"? Bagaimana tipe pointer memengaruhinya?
5. Jelaskan kenapa mengirim `&a` ke fungsi memungkinkan fungsi mengubah `a`, padahal C tetap pass by value.
6. Apa beda NULL pointer, uninitialized atau wild pointer, dan dangling pointer? Mana yang paling jelas saat error?
7. Kenapa pointer begitu sentral dalam C? Sebutkan minimal tiga hal yang sulit atau tidak mungkin dilakukan tanpa pointer.
8. Apa beda `const int *p` dan `int *const p`?

---

Di Bab 7, kita lanjut ke **pointer lanjutan**: pointer-to-pointer (`int **`), hubungan array dan pointer yang lebih detail, `const` correctness, dan **function pointer**, yaitu pointer yang menunjuk ke kode, bukan data. Konsep-konsep ini menjadi dasar callback, handler, dan banyak API C.
