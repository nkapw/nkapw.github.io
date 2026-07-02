---
title: "Bab 8 - Struct, Union, Enum, dan Tata Letak Memori"
description: "Data dalam program C tidak selalu berupa nilai tunggal seperti int, char, atau array dengan elemen sejenis. Banyak data perlu disusun dari beberapa informasi yang..."
tags: [c, systems-programming]
order: 8
updated: 2026-07-02
---
Data dalam program C tidak selalu berupa nilai tunggal seperti `int`, `char`, atau array dengan elemen sejenis. Banyak data perlu disusun dari beberapa informasi yang saling berhubungan. Contohnya, data mahasiswa dapat terdiri dari nama, umur, dan IPK. C menyediakan `struct` untuk membentuk tipe data majemuk seperti itu.

Bab ini membahas penggunaan `struct`, `union`, dan `enum`, lalu menjelaskan bagaimana `struct` ditata di memori. Pembahasan tata letak memori penting karena ukuran `struct` tidak selalu sama dengan jumlah ukuran seluruh field. Kompiler dapat menambahkan padding agar setiap field memenuhi kebutuhan alignment. Pemahaman ini diperlukan saat bekerja dengan format file biner, protokol jaringan, register perangkat keras, dan struktur data yang digunakan oleh sistem operasi.

---

## 8.1 Struct untuk Menyatukan Data yang Berhubungan

`struct` digunakan untuk mengelompokkan beberapa field ke dalam satu tipe data baru. Setiap field dapat memiliki tipe yang berbeda.

```c
#include <stdio.h>

struct Mahasiswa {
    char nama[20];
    int  umur;
    float ipk;
};

int main(void) {
    struct Mahasiswa m;

    snprintf(m.nama, sizeof(m.nama), "Budi");
    m.umur = 20;
    m.ipk  = 3.75f;

    printf("%s, %d tahun, IPK %.2f\n", m.nama, m.umur, m.ipk);
    return 0;
}
```

Definisi `struct Mahasiswa` membuat tipe baru. Definisi tersebut belum mengalokasikan memori untuk data mahasiswa tertentu. Memori baru dialokasikan ketika variabel seperti `struct Mahasiswa m` dibuat.

Anggota di dalam `struct` disebut field atau member. Pada contoh di atas, field yang dimiliki `struct Mahasiswa` adalah `nama`, `umur`, dan `ipk`. Field dari variabel `struct` diakses dengan operator titik.

```c
m.umur = 20;
```

Inisialisasi dapat dilakukan langsung saat variabel dibuat.

```c
struct Mahasiswa m = {"Budi", 20, 3.75f};
struct Mahasiswa n = {.umur = 20, .nama = "Ani"};
```

Bentuk kedua disebut designated initializer dan tersedia sejak C99. Bentuk ini lebih jelas ketika `struct` memiliki banyak field, karena setiap nilai ditulis bersama nama field yang diisi.

### `typedef struct`

Menulis `struct Mahasiswa` berulang kali dapat membuat kode panjang. `typedef` sering digunakan agar tipe tersebut dapat dipakai dengan nama yang lebih ringkas.

```c
typedef struct {
    char nama[20];
    int  umur;
    float ipk;
} Mahasiswa;

Mahasiswa m;
```

Pola `typedef struct { ... } Nama;` umum digunakan dalam kode C. Setelah `typedef` dibuat, variabel dapat dideklarasikan dengan `Mahasiswa m` tanpa menulis kata `struct`.

---

## 8.2 Struct di Memori

Field dalam `struct` disimpan sebagai satu blok memori. Urutan field di memori mengikuti urutan deklarasi, tetapi field tersebut tidak selalu ditempatkan rapat tanpa jarak. Kompiler dapat menambahkan byte kosong di antara field atau di akhir `struct`.

Perhatikan contoh berikut.

```c
#include <stdio.h>

struct Contoh {
    char  a;
    int   b;
    char  c;
};

int main(void) {
    printf("ukuran struct Contoh = %zu\n", sizeof(struct Contoh));
    return 0;
}
```

Jika hanya menjumlahkan ukuran field, perkiraannya adalah 1 byte untuk `a`, 4 byte untuk `b`, dan 1 byte untuk `c`, sehingga totalnya 6 byte. Pada banyak sistem x86-64, hasil `sizeof(struct Contoh)` adalah 12 byte. Selisih tersebut berasal dari padding yang ditambahkan oleh kompiler.

---

## 8.3 Alignment dan Padding

Alignment adalah aturan penempatan data pada alamat tertentu agar akses memori lebih efisien atau sesuai dengan kebutuhan arsitektur CPU. Banyak arsitektur mengakses data lebih baik ketika alamat data merupakan kelipatan dari ukuran atau alignment tipe tersebut.

Beberapa aturan umum pada banyak sistem adalah sebagai berikut.

- `char` berukuran 1 byte dan dapat berada di alamat mana pun.
- `int` berukuran 4 byte dan biasanya ditempatkan pada alamat kelipatan 4.
- `double` berukuran 8 byte dan biasanya ditempatkan pada alamat kelipatan 8.

Jika sebuah field tidak berada pada alamat yang sesuai alignment, kompiler dapat menyisipkan padding. Padding adalah byte kosong yang tidak menyimpan field apa pun, tetapi diperlukan agar field berikutnya berada pada offset yang tepat.

### Layout `struct Contoh`

Untuk `struct Contoh`, kompiler dapat menata field seperti berikut.

```text
Offset  0    1    2    3    4    5    6    7    8    9   10   11
       +----+----+----+----+----+----+----+----+----+----+----+----+
       | a  |PAD |PAD |PAD | b  | b  | b  | b  | c  |PAD |PAD |PAD |
       +----+----+----+----+----+----+----+----+----+----+----+----+
```

Langkah penataannya dapat dijelaskan sebagai berikut.

1. `char a` ditempatkan pada offset 0 dan menggunakan 1 byte.
2. `int b` membutuhkan alignment 4. Offset berikutnya adalah 1, sehingga kompiler menambahkan 3 byte padding agar `b` mulai pada offset 4.
3. `int b` menggunakan offset 4 sampai 7.
4. `char c` ditempatkan pada offset 8 dan menggunakan 1 byte.
5. Ukuran total `struct` dibuat menjadi kelipatan alignment terbesar di dalamnya. Karena alignment terbesar adalah 4, kompiler menambahkan padding di akhir hingga ukuran total menjadi 12 byte.

Padding di akhir diperlukan agar array berisi `struct Contoh` tetap memiliki setiap elemen pada alignment yang benar.

`offsetof` dapat digunakan untuk memeriksa posisi field di dalam `struct`.

```c
#include <stdio.h>
#include <stddef.h>

struct Contoh {
    char a;
    int b;
    char c;
};

int main(void) {
    printf("ukuran   = %zu\n", sizeof(struct Contoh));
    printf("offset a = %zu\n", offsetof(struct Contoh, a));
    printf("offset b = %zu\n", offsetof(struct Contoh, b));
    printf("offset c = %zu\n", offsetof(struct Contoh, c));
    return 0;
}
```

Pada banyak sistem x86-64, `a` berada pada offset 0, `b` pada offset 4, dan `c` pada offset 8.

---

## 8.4 Urutan Field Memengaruhi Ukuran

Padding bergantung pada urutan field. Dua `struct` dengan field yang sama dapat memiliki ukuran berbeda jika urutan field-nya berbeda.

```c
struct Boros {
    char  a;
    int   b;
    char  c;
};

struct Hemat {
    int   b;
    char  a;
    char  c;
};
```

Pada banyak sistem x86-64, `struct Boros` berukuran 12 byte, sedangkan `struct Hemat` berukuran 8 byte. Perbedaannya muncul karena `struct Hemat` menempatkan field terbesar lebih dahulu, lalu field kecil dikelompokkan setelahnya.

Layout `struct Hemat` dapat terlihat seperti ini.

```text
Offset  0    1    2    3    4    5    6    7
       +----+----+----+----+----+----+----+----+
       | b  | b  | b  | b  | a  | c  |PAD |PAD |
       +----+----+----+----+----+----+----+----+
```

Untuk `struct` yang dibuat dalam jumlah besar atau digunakan pada sistem dengan memori terbatas, field sering diurutkan dari tipe berukuran besar ke tipe berukuran kecil. Urutan seperti `double`, `int`, `short`, lalu `char` dapat mengurangi padding. Namun pada kode aplikasi biasa, keterbacaan dan pengelompokan makna data tetap perlu dipertimbangkan.

### Struct Packed

Beberapa kompiler menyediakan cara untuk memaksa `struct` disimpan tanpa padding, misalnya `__attribute__((packed))` pada GCC dan Clang atau `#pragma pack` pada beberapa kompiler. Teknik ini berguna ketika tata letak byte harus sama persis dengan format eksternal, seperti header file biner atau paket jaringan.

Penggunaan packed struct perlu dibatasi. Field yang tidak selaras dengan kebutuhan alignment dapat lebih lambat diakses dan pada arsitektur tertentu dapat menyebabkan kesalahan akses memori. Gunakan packed struct hanya ketika tata letak byte yang persis memang diperlukan.

---

## 8.5 Pointer ke Struct dan Operator `->`

Struct berukuran besar sebaiknya sering dilewatkan ke fungsi melalui pointer agar tidak terjadi penyalinan seluruh isi struct. Jika fungsi perlu mengubah struct asli, pointer juga diperlukan.

```c
#include <stdio.h>

typedef struct {
    char nama[20];
    int umur;
} Orang;

void ulang_tahun(Orang *p) {
    p->umur++;
}

int main(void) {
    Orang budi = {"Budi", 20};
    ulang_tahun(&budi);
    printf("%s sekarang %d\n", budi.nama, budi.umur);
    return 0;
}
```

Ekspresi `p->umur` setara dengan `(*p).umur`. Operator `->` digunakan ketika field diakses melalui pointer ke `struct`.

```c
p->umur
(*p).umur
```

Tanda kurung pada `(*p).umur` diperlukan karena operator titik memiliki prioritas lebih tinggi daripada operator dereference `*`. Tanpa tanda kurung, ekspresi tidak memiliki makna yang diinginkan.

---

## 8.6 Struct di dalam Struct dan Struktur Data Dinamis

Struct dapat berisi struct lain. Struct juga dapat berisi pointer ke struct dengan tipe yang sama. Pola kedua menjadi dasar struktur data dinamis seperti linked list dan tree.

```c
typedef struct Node {
    int data;
    struct Node *next;
} Node;
```

Di dalam definisi, field `next` ditulis sebagai `struct Node *next` karena nama tag `struct Node` sudah dikenal ketika isi struct sedang didefinisikan. Sebaliknya, typedef `Node` baru selesai dibuat setelah definisi struct selesai.

Struct tidak boleh berisi dirinya sendiri secara langsung.

```c
struct Node {
    int data;
    struct Node next;
};
```

Bentuk di atas tidak valid karena ukuran `struct Node` tidak dapat ditentukan. Setiap `Node` akan berisi `Node` lain tanpa akhir. Namun pointer ke struct sejenis diperbolehkan karena ukuran pointer tetap diketahui.

```c
struct Node {
    int data;
    struct Node *next;
};
```

Rantai linked list dapat digambarkan seperti berikut.

```text
[10 | *] -> [20 | *] -> [30 | NULL]
 data next   data next   data next
```

Setiap node menyimpan data dan pointer ke node berikutnya. Node terakhir menyimpan `NULL` sebagai penanda akhir. Implementasi lengkap linked list akan membutuhkan alokasi dinamis dengan `malloc`, yang dibahas pada Bab 9.

---

## 8.7 Union

`union` mirip dengan `struct` dalam bentuk deklarasi, tetapi berbeda dalam penggunaan memori. Pada `struct`, setiap field memiliki ruang masing-masing. Pada `union`, semua field berbagi lokasi memori yang sama. Ukuran `union` adalah ukuran field terbesar, bukan jumlah ukuran semua field.

```c
#include <stdio.h>

union Data {
    int   i;
    float f;
    char  bytes[4];
};

int main(void) {
    union Data d;

    d.i = 1065353216;
    printf("sebagai int   = %d\n", d.i);
    printf("sebagai float = %f\n", d.f);
    printf("ukuran union  = %zu\n", sizeof(d));
    return 0;
}
```

Karena `i`, `f`, dan `bytes` menempati alamat yang sama, menulis `d.i` lalu membaca `d.f` berarti menafsirkan byte yang sama dengan tipe berbeda. Pola ini dapat digunakan untuk menghemat memori ketika suatu nilai hanya membutuhkan salah satu dari beberapa representasi pada satu waktu.

Union juga digunakan pada tagged union. Tagged union menggabungkan `enum` sebagai penanda tipe aktif dan `union` sebagai penyimpan data.

```c
typedef enum {
    TIPE_INT,
    TIPE_FLOAT,
    TIPE_STR
} TipeNilai;

typedef struct {
    TipeNilai tipe;
    union {
        int    i;
        float  f;
        char  *s;
    } nilai;
} Variant;
```

Pola `enum` dan `union` digunakan untuk merepresentasikan nilai yang dapat memiliki salah satu dari beberapa tipe. Pola ini sering muncul pada interpreter, parser, dan sistem yang perlu menyimpan nilai heterogen.

Union tidak menyimpan informasi tentang field mana yang terakhir ditulis. Jika program menulis ke `d.i` lalu membaca `d.f`, kompiler tidak akan memberi error. Program harus menjaga sendiri informasi tipe aktif. Karena itu, tagged union lebih aman daripada union tanpa penanda tipe.

---

## 8.8 Enum

`enum` atau enumeration membuat sekumpulan konstanta integer bernama. Tujuannya adalah membuat kode lebih mudah dibaca dibanding penggunaan angka langsung.

```c
#include <stdio.h>

typedef enum {
    SENIN,
    SELASA,
    RABU,
    KAMIS,
    JUMAT
} Hari;

int main(void) {
    Hari h = RABU;

    if (h == RABU)
        printf("Hari ini Rabu dengan nilai %d\n", h);
    return 0;
}
```

Secara representasi, konstanta enum adalah bilangan integer. Jika tidak diberi nilai eksplisit, konstanta pertama bernilai 0, konstanta berikutnya bernilai 1, dan seterusnya. Menulis `h == RABU` jauh lebih jelas daripada `h == 2` karena nama konstanta menyampaikan makna nilai tersebut.

Nilai enum juga dapat ditentukan secara eksplisit.

```c
typedef enum {
    OK        = 0,
    ERR_FILE  = 1,
    ERR_MEM   = 2,
    ERR_NET   = 10
} StatusKode;
```

Enum sering digunakan untuk status, kode error, state dalam state machine, dan penanda tipe pada tagged union. Dibandingkan `#define`, enum lebih sesuai untuk sekumpulan konstanta yang saling berkaitan karena namanya dikenali debugger dan nilainya dapat dibuat berurutan secara otomatis.

---

## 8.9 Pentingnya Tata Letak Memori dalam Pemrograman Sistem

Tata letak memori `struct` penting dalam pemrograman sistem karena program sering perlu membaca atau menulis data dengan bentuk byte yang sudah ditentukan.

1. Format file biner seperti BMP, WAV, dan ELF memiliki header dengan layout byte tertentu. Padding yang tidak sesuai dapat membuat field terbaca dari offset yang salah.
2. Protokol jaringan memiliki susunan byte yang ketat. Struct yang merepresentasikan paket jaringan harus memperhatikan tata letak dan endianness.
3. Register perangkat keras pada sistem embedded sering dipetakan ke alamat memori tertentu. Setiap field harus sesuai dengan posisi register yang sebenarnya.
4. Banyak syscall menerima atau mengisi `struct`, misalnya `struct stat` dan `struct sockaddr`. Program perlu menggunakan layout yang sesuai dengan definisi sistem.

Pemahaman tentang `sizeof`, `offsetof`, padding, dan alignment adalah bagian penting dari pekerjaan programmer sistem. Alat seperti `pahole` di Linux bahkan dibuat untuk memeriksa tata letak dan padding pada `struct`.

---

## 8.10 Rangkuman Model Mental

1. `struct` menyatukan beberapa field, termasuk field dengan tipe berbeda, menjadi satu tipe data baru.
2. Field `struct` diakses dengan operator titik pada variabel struct dan operator `->` pada pointer ke struct.
3. Kompiler dapat menambahkan padding agar setiap field memenuhi kebutuhan alignment.
4. `sizeof(struct)` dapat lebih besar daripada jumlah ukuran field karena adanya padding.
5. Urutan field dapat memengaruhi ukuran `struct`. Mengurutkan field dari tipe besar ke tipe kecil dapat mengurangi padding.
6. Struct dapat berisi pointer ke struct sejenis. Pola ini menjadi dasar linked list, tree, dan struktur data dinamis lain.
7. `union` membuat semua field berbagi lokasi memori yang sama. Ukurannya mengikuti field terbesar.
8. Tagged union menggabungkan `enum` dan `union` agar program mengetahui tipe data yang sedang aktif.
9. `enum` memberi nama pada konstanta integer dan membuat kode lebih mudah dibaca.
10. Tata letak memori penting untuk format file biner, protokol jaringan, register perangkat keras, dan struktur data sistem operasi.

---

## 8.11 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Buat `struct Contoh { char a; int b; char c; };`, lalu cetak `sizeof` dan `offsetof` setiap field. Cocokkan hasilnya dengan pembahasan pada Bab 8.3.
2. Ubah urutan field menjadi `{ int b; char a; char c; }`, lalu ukur kembali ukuran struct. Jelaskan penyebab perbedaannya.
3. Buat struct berisi `double`, `char`, `int`, dan `char` dalam urutan acak. Prediksi ukuran dan padding-nya, lalu verifikasi dengan program.
4. Tambahkan `__attribute__((packed))` pada salah satu struct dan ukur kembali ukurannya dengan GCC atau Clang.
5. Tulis `typedef struct { ... } Orang;` dan fungsi `void ulang_tahun(Orang *p)` yang menambah umur melalui `->`. Buktikan bahwa struct asli di `main` berubah.
6. Buat `union Data { int i; float f; };`, isi `d.i`, lalu baca `d.f`. Ulangi dengan arah sebaliknya dan jelaskan hasilnya berdasarkan representasi byte.
7. Buat tagged union dengan `enum` dan `union` untuk menyimpan nilai bertipe `int`, `float`, atau string. Tulis fungsi `void cetak(Variant v)` yang mencetak nilai sesuai tipe aktif.
8. Definisikan `enum` untuk hari dalam seminggu, lalu cetak nilai numerik setiap konstanta. Beri beberapa nilai eksplisit dan amati perubahan nilainya.

### Pertanyaan Refleksi

1. Mengapa `sizeof` sebuah struct dapat lebih besar daripada jumlah ukuran field-nya.
2. Apa yang dimaksud dengan alignment dan mengapa CPU memperhatikan posisi data di memori.
3. Mengapa urutan field dapat memengaruhi ukuran struct.
4. Kapan struct sebaiknya dilewatkan melalui pointer, bukan berdasarkan nilai.
5. Mengapa `struct Node next;` tidak valid, tetapi `struct Node *next;` valid.
6. Apa perbedaan mendasar antara struct dan union dalam penggunaan memori.
7. Mengapa enum lebih baik daripada angka langsung untuk sekumpulan konstanta yang saling berkaitan.
8. Sebutkan tiga situasi pemrograman sistem yang membuat tata letak byte struct menjadi penting.

---

Bab ini membahas cara membentuk data majemuk dan memahami tata letaknya di memori. Bab 9 akan membahas manajemen memori manual dengan `malloc` dan `free`, termasuk heap, allocator, memory leak, dangling pointer, double free, dan implementasi linked list dengan alokasi dinamis.

