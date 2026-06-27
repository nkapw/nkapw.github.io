---
title: "Bab 8 — Struct, Union, Enum & Memory Layout"
description: "Sejauh ini, data yang kita pakai masih tunggal atau seragam: satu int, satu char, atau array berisi tipe yang sama. Dalam program nyata, data sering berupa gabungan..."
tags: [c, system-programming]
order: 8
updated: 2026-06-21
---

> "Struct bukan hanya wadah beberapa variabel. Struct juga memberi tahu compiler bagaimana byte-byte data itu harus ditata di memori."

Sejauh ini, data yang kita pakai masih tunggal atau seragam: satu `int`, satu `char`, atau array berisi tipe yang sama. Dalam program nyata, data sering berupa gabungan beberapa hal sekaligus. Seorang mahasiswa, misalnya, punya nama, umur, dan IPK. Untuk bentuk data seperti ini, C menyediakan **struct**.

Bab ini punya dua lapis. Lapis pertama adalah cara memakai `struct`, `union`, dan `enum`. Lapis kedua, yang penting untuk system programming, adalah bagaimana struct benar-benar ditata di memori. Dari sana kita akan melihat kenapa ukurannya bisa lebih besar dari jumlah field-nya, apa itu **padding**, apa itu **alignment**, dan kenapa layout byte penting saat membaca format file biner, protokol jaringan, atau register hardware.

---

## 8.1 Struct: menyatukan data yang berhubungan

```c
#include <stdio.h>

struct Mahasiswa {
    char nama[20];
    int  umur;
    float ipk;
};

int main(void) {
    struct Mahasiswa m;            // deklarasi variabel bertipe struct Mahasiswa
    // isi field dengan operator titik '.'
    snprintf(m.nama, sizeof(m.nama), "Budi");
    m.umur = 20;
    m.ipk  = 3.75f;

    printf("%s, %d tahun, IPK %.2f\n", m.nama, m.umur, m.ipk);
    return 0;
}
```

Beberapa istilah perlu jelas sejak awal:

- `struct Mahasiswa { ... };` adalah **definisi tipe** baru. Ini baru blueprint; belum ada memori untuk data mahasiswa yang dibuat. Perhatikan tanda `;` setelah `}`, karena ini harus ada dan sering terlupa.
- `struct Mahasiswa m;` membuat **variabel** atau instance bernama `m`. Di titik ini, memori baru dialokasikan.
- **Field** atau **member** adalah anggota struct, seperti `nama`, `umur`, dan `ipk`.
- Operator `.` dipakai untuk mengakses field dari variabel struct.

Struct juga bisa diinisialisasi langsung:

```c
struct Mahasiswa m = {"Budi", 20, 3.75f};        // berurutan
struct Mahasiswa n = {.umur = 20, .nama = "Ani"}; // designated initializer (C99) — lebih jelas
```

Struct bisa dibayangkan seperti formulir dengan beberapa kolom. Definisi struct adalah desain formulirnya; variabel struct adalah satu formulir yang sudah diisi.

### `typedef struct`: agar tidak menulis "struct" terus

Menulis `struct Mahasiswa` berulang-ulang bisa terasa panjang. Pola umum di C adalah membungkusnya dengan `typedef`:

```c
typedef struct {
    char nama[20];
    int  umur;
    float ipk;
} Mahasiswa;

Mahasiswa m;          // sekarang cukup "Mahasiswa", tanpa "struct"
```

Kamu akan sering melihat bentuk `typedef struct { ... } Nama;` di kode C nyata.

---

## 8.2 Struct di memori: field berderet (tapi tidak selalu rapat!)

Field-field struct disimpan sebagai satu blok memori. Urutan field mengikuti urutan deklarasi. Sekilas ini mirip array, tetapi field struct bisa memiliki tipe berbeda, sehingga ukurannya juga bisa berbeda.

Secara naif, kita mungkin menebak `struct Mahasiswa` berukuran 20 byte untuk `nama`, 4 byte untuk `umur`, dan 4 byte untuk `ipk`, total 28 byte. Kadang tebakan seperti ini benar, kadang tidak. Untuk melihat masalahnya dengan lebih jelas, kita pakai contoh yang lebih kecil:

```c
#include <stdio.h>

struct Contoh {
    char  a;     // 1 byte
    int   b;     // 4 byte
    char  c;     // 1 byte
};

int main(void) {
    printf("sizeof(struct Contoh) = %zu\n", sizeof(struct Contoh));
    // Tebakan naif: 1 + 4 + 1 = 6. Hasil sebenarnya sering 12 di x86-64
    return 0;
}
```

Kenapa hasilnya sering **12**, bukan 6? Selisih itu berasal dari **padding**. Untuk memahami padding, kita perlu memahami **alignment**.

---

## 8.3 Alignment & padding: ruang kosong yang diselipkan compiler

### Apa itu alignment?

CPU tidak selalu membaca memori byte demi byte secara bebas. Demi efisiensi, dan pada beberapa arsitektur demi mencegah crash, data sebaiknya berada di alamat yang cocok dengan ukurannya. Ini disebut **alignment requirement**.

Contoh umum:

- `char` (1 byte) boleh berada di alamat mana saja.
- `int` (4 byte) sebaiknya berada di alamat kelipatan 4: 4, 8, 12, dan seterusnya.
- `double` (8 byte) sebaiknya berada di alamat kelipatan 8.

Kenapa ini penting? CPU sering mengambil data dari memori dalam blok yang sejajar dengan ukuran tertentu, misalnya 4 atau 8 byte. Jika sebuah `int` 4-byte berada di alamat yang menyeberangi dua blok, misalnya alamat 3 sampai 6, CPU mungkin perlu melakukan dua akses memori lalu menggabungkan hasilnya. Itu lebih lambat. Di beberapa arsitektur lama, akses yang tidak ter-align bahkan bisa menyebabkan crash, misalnya bus error.

Karena itu compiler menyelipkan byte kosong agar field-field struct berada di alamat yang sesuai. Byte kosong inilah yang disebut **padding**.

Bayangkan rak dengan sekat tiap 4 cm. Buku setebal 4 cm paling mudah diambil jika diletakkan mulai tepat di awal sekat. Jika buku mulai di posisi yang menyeberangi dua sekat, aksesnya menjadi lebih merepotkan. Padding adalah ruang kosong yang dipakai compiler agar data jatuh di posisi yang pas.

### Membongkar `struct Contoh` byte-per-byte

Sekarang kita lihat kenapa `struct Contoh` menjadi 12 byte. Compiler menata field satu per satu sambil memastikan alignment terpenuhi:

```
offset:  0    1    2    3    4    5    6    7    8    9   10   11
        +----+----+----+----+----+----+----+----+----+----+----+----+
        | a  |PAD |PAD |PAD | b  | b  | b  | b  | c  |PAD |PAD |PAD |
        +----+----+----+----+----+----+----+----+----+----+----+----+
          ^                   ^                   ^
        char a              int b               char c
        (offset 0)        (offset 4,            (offset 8)
                          harus kelipatan 4)
```

Langkah penataannya:

1. `char a` diletakkan di offset 0 dan memakai 1 byte. Posisi berikutnya adalah offset 1.
2. `int b` butuh alignment 4. Offset 1 bukan kelipatan 4, jadi compiler menyelipkan 3 byte padding di offset 1, 2, dan 3. `b` lalu diletakkan di offset 4 sampai 7.
3. `char c` diletakkan di offset 8 dan memakai 1 byte. Posisi berikutnya adalah offset 9.
4. **Trailing padding:** ukuran struct biasanya dibuat kelipatan dari alignment terbesar di dalamnya. Di sini alignment terbesar adalah 4, karena ada `int`. Offset 9 bukan kelipatan 4, jadi compiler menambah padding sampai ukuran total menjadi 12.

Totalnya: 12 byte. Ada 3 byte padding di tengah dan 3 byte padding di akhir.

Buktikan dengan `offsetof`:

```c
#include <stdio.h>
#include <stddef.h>   // untuk offsetof

struct Contoh { char a; int b; char c; };

int main(void) {
    printf("ukuran   = %zu\n", sizeof(struct Contoh));        // 12
    printf("offset a = %zu\n", offsetof(struct Contoh, a));   // 0
    printf("offset b = %zu\n", offsetof(struct Contoh, b));   // 4  (bukan 1!)
    printf("offset c = %zu\n", offsetof(struct Contoh, c));   // 8
    return 0;
}
```

`offsetof(tipe, field)` memberi posisi byte sebuah field di dalam struct. `b` berada di offset 4, bukan 1. Itulah padding yang bekerja.

---

## 8.4 Urutan field penting untuk menghemat memori

Karena padding bergantung pada urutan field, mengubah urutan field bisa mengubah ukuran struct. Bandingkan dua struct berikut:

```c
struct Boros {        // char, int, char  -> 12 byte (seperti di atas)
    char  a;
    int   b;
    char  c;
};

struct Hemat {        // char, char, int  -> 8 byte
    char  a;
    char  c;
    int   b;
};
```

Layout `struct Hemat`:

```
offset:  0    1    2    3    4    5    6    7
        +----+----+----+----+----+----+----+----+
        | a  | c  |PAD |PAD | b  | b  | b  | b  |
        +----+----+----+----+----+----+----+----+
```

`a` dan `c`, masing-masing 1 byte, bisa berdampingan di offset 0 dan 1. Setelah itu compiler hanya perlu 2 byte padding agar `b` jatuh di offset 4. Totalnya 8 byte, lebih hemat 4 byte dibanding `struct Boros`, padahal field-nya sama.

Aturan praktisnya, untuk struct yang dibuat dalam jumlah besar atau untuk sistem dengan memori terbatas seperti embedded, urutkan field dari yang terbesar ke yang terkecil. Contohnya `double`, `int`, `short`, lalu `char`. Ini sering mengurangi padding.

Namun jangan terlalu obsesif untuk struct kecil yang jarang dibuat. Dalam banyak kode aplikasi, keterbacaan tetap lebih penting. Yang perlu kamu ingat adalah bahwa urutan field memengaruhi ukuran.

> **Bisa memaksa tanpa padding?** Bisa, dengan `#pragma pack` atau atribut `__attribute__((packed))` di GCC/Clang. Ini memberi tahu compiler agar field dirapatkan. Teknik ini berguna saat struct harus mengikuti layout byte yang ketat, misalnya header file biner atau paket jaringan. Namun struct packed bisa berisi field yang tidak ter-align, sehingga aksesnya lebih lambat dan pada arsitektur tertentu bisa crash. Pakai hanya saat benar-benar butuh layout byte yang persis.

---

## 8.5 Pointer ke struct & operator `->`

Ingat dari Bab 7: struct besar sebaiknya sering dilewatkan ke fungsi lewat pointer agar tidak menyalin seluruh struct. Jika kamu punya pointer ke struct, field-nya diakses dengan operator `->`.

```c
#include <stdio.h>

typedef struct { char nama[20]; int umur; } Orang;

void ulang_tahun(Orang *p) {
    // (*p).umur++;     // cara panjang: dereference dulu, baru akses field
    p->umur++;          // cara ringkas dengan operator panah '->', hasilnya sama
}

int main(void) {
    Orang budi = {"Budi", 20};
    ulang_tahun(&budi);       // kirim alamat -> fungsi bisa mengubah aslinya
    printf("%s sekarang %d\n", budi.nama, budi.umur);  // 21
    return 0;
}
```

`p->umur` adalah singkatan dari `(*p).umur`. Artinya, dereference `p`, lalu ambil field `umur`. Kurung di `(*p).umur` diperlukan karena operator `.` punya precedence lebih tinggi daripada `*`. Operator `->` dibuat agar akses field lewat pointer lebih ringkas dan mudah dibaca.

Contoh ini menunjukkan dua manfaat sekaligus:

1. Mengirim `Orang *` lebih murah daripada menyalin seluruh struct.
2. Fungsi bisa memodifikasi struct asli, karena yang dikirim adalah alamatnya.

Karena alasan ini, banyak API yang bekerja dengan struct memakai pointer.

---

## 8.6 Struct di dalam struct & struktur data dinamis

Struct bisa berisi struct lain. Struct juga bisa berisi **pointer ke struct sejenis**. Ini penting karena menjadi fondasi struktur data dinamis seperti **linked list**.

```c
typedef struct Node {
    int data;
    struct Node *next;    // pointer ke Node berikutnya
} Node;
```

Perhatikan bahwa di dalam definisi, kita menulis `struct Node *next`, yaitu memakai nama tag `Node`, bukan typedef `Node` yang belum selesai dibuat.

Sebuah struct **tidak boleh berisi dirinya sendiri secara langsung**:

```c
struct Node next;   // ilegal jika ditaruh di dalam struct Node
```

Alasannya, ukurannya menjadi tak berhingga. Sebaliknya, struct **boleh berisi pointer ke dirinya sendiri**:

```c
struct Node *next;
```

Pointer ukurannya tetap, misalnya 8 byte di mesin 64-bit, apa pun tipe yang ditunjuk.

Dengan pola ini, kita bisa membuat rantai data yang panjangnya tidak ditentukan sejak awal:

```
[10 | *]──►[20 | *]──►[30 | NULL]
 data next   data next  data next
```

Setiap node menyimpan data dan pointer ke node berikutnya. Node terakhir menunjuk `NULL` sebagai penanda akhir. Kita akan benar-benar membangun linked list di Bab 9 setelah membahas `malloc`, karena setiap node biasanya dialokasikan di heap.

Untuk sekarang, pegang ide utama bahwa **struct + pointer ke struct sejenis = dasar struktur data dinamis.**

---

## 8.7 Union: berbagi memori yang sama

**Union** terlihat mirip struct, tetapi maknanya berbeda. Dalam struct, setiap field punya ruang sendiri. Dalam union, semua field **berbagi lokasi memori yang sama**.

Ukuran union adalah ukuran field **terbesar**, bukan jumlah semua field. Pada satu waktu, kamu hanya boleh memakai satu field secara disiplin.

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
    printf("sebagai int   : %d\n", d.i);
    printf("sebagai float : %f\n", d.f);   // 1.000000, byte yang sama ditafsir beda
    printf("ukuran union  : %zu\n", sizeof(d));  // 4 (terbesar), bukan 12
    return 0;
}
```

Karena `i`, `f`, dan `bytes` menempati alamat yang sama, menulis `d.i` lalu membaca `d.f` berarti menafsirkan ulang byte yang sama sebagai tipe berbeda. Ini kembali ke prinsip Bab 2. Byte yang sama bisa dibaca dengan "kacamata" tipe yang berbeda.

Union berguna untuk:

1. **Menghemat memori** saat sebuah nilai hanya bisa menjadi salah satu dari beberapa tipe pada satu waktu.
2. **Type punning**, yaitu melihat representasi byte sebuah nilai, misalnya membongkar bit `float`. Untuk portabilitas, cara yang lebih aman biasanya memakai `memcpy`.
3. **Tagged union**, yaitu pola umum yang menggabungkan `enum` sebagai penanda tipe aktif dan `union` sebagai tempat datanya.

Contoh tagged union:

```c
typedef enum { TIPE_INT, TIPE_FLOAT, TIPE_STR } TipeNilai;

typedef struct {
    TipeNilai tipe;        // penanda: field union mana yang sedang aktif
    union {
        int    i;
        float  f;
        char  *s;
    } nilai;
} Variant;
```

Pola `enum + union` adalah cara C merepresentasikan "nilai yang bisa salah satu dari beberapa tipe", mirip `variant` atau `enum` di bahasa modern. Pola ini banyak dipakai di interpreter, parser, dan sistem tipe dinamis.

Bayangkan union seperti satu ruangan serbaguna. Ruangannya hanya satu, tetapi bisa dipakai untuk fungsi berbeda secara bergantian. Yang penting, kamu harus tahu fungsi apa yang sedang aktif.

> **Bahaya:** union tidak mengingat field mana yang terakhir kamu tulis. Jika kamu menulis `d.i` lalu membaca `d.f`, C tidak memberi error. Kamu hanya mendapatkan byte yang sama dengan interpretasi tipe lain. Karena itu tagged union memakai `enum` sebagai disiplin; programmer sendiri yang melacak tipe aktifnya.

---

## 8.8 Enum: nama untuk angka

**Enum** atau enumeration membuat sekumpulan konstanta integer bernama. Tujuannya adalah membuat kode lebih mudah dibaca dan menghindari "magic number".

```c
#include <stdio.h>

typedef enum {
    SENIN,      // 0  (default mulai dari 0)
    SELASA,     // 1
    RABU,       // 2
    KAMIS,      // 3
    JUMAT       // 4
} Hari;

int main(void) {
    Hari h = RABU;
    if (h == RABU) printf("Hari ini Rabu (nilai %d)\n", h);  // 2
    return 0;
}
```

Di balik layar, enum adalah integer. `SENIN` bernilai 0, `SELASA` bernilai 1, dan seterusnya. Namun `if (h == RABU)` jauh lebih jelas daripada `if (h == 2)`. Angka `2` sendirian tidak menjelaskan maksudnya.

Kamu juga bisa memberi nilai eksplisit:

```c
typedef enum {
    OK        = 0,
    ERR_FILE  = 1,
    ERR_MEM   = 2,
    ERR_NET   = 10
} StatusKode;
```

Enum sering dipakai untuk status, kode error, state dalam state machine, dan penanda tipe pada tagged union seperti di Bagian 8.7.

Dibanding `#define` yang akan dibahas di Bab 10, enum lebih cocok untuk sekumpulan konstanta yang saling berkaitan. Enum punya tipe, lebih terbaca oleh debugger, dan nilainya bisa otomatis berurutan.

---

## 8.9 Kenapa memory layout struct penting di system programming

Bab ini bukan sekadar membahas cara membuat wadah data. Di system programming, kamu sering berhadapan dengan byte yang layout-nya sudah ditentukan dari luar program.

Beberapa contoh:

1. **Membaca format file biner.** Header file seperti BMP, WAV, atau ELF dari Bab 1 punya layout byte yang baku. Jika kamu membaca header langsung ke struct, padding struct harus cocok dengan format file. Jika tidak, field yang dibaca bisa bergeser.
2. **Protokol jaringan.** Paket TCP/IP punya struktur byte yang persis. Struct yang merepresentasikannya harus mengikuti layout itu, dan endianness dari Bab 2 tetap perlu diperhatikan dengan fungsi seperti `htons` dan `htonl`.
3. **Register hardware di embedded.** Register peripheral sering dipetakan sebagai struct di alamat tertentu. Tiap field harus cocok dengan posisi register hardware.
4. **Berbagi data dengan kernel.** Banyak syscall menerima atau mengisi struct, misalnya `struct stat` dan `struct sockaddr`. Layout yang dipakai program harus cocok dengan yang diharapkan kernel.

Karena itu `sizeof`, `offsetof`, padding, dan alignment bukan trivia. Ini keterampilan praktis untuk membaca dan menulis data level rendah. Di Linux, tool seperti `pahole` bahkan dibuat khusus untuk memvisualisasikan layout dan padding struct.

---

## 8.10 Rangkuman model mental

1. **Struct** menyatukan beberapa field, termasuk field dengan tipe berbeda, menjadi satu tipe baru. Field diakses dengan `.` untuk variabel struct dan `->` untuk pointer ke struct. `typedef struct {...} Nama;` membuat pemakaian lebih ringkas.
2. Field struct berurutan di memori, tetapi compiler bisa menyelipkan **padding** agar tiap field memenuhi **alignment**, yaitu berada di alamat yang cocok dengan ukurannya.
3. `sizeof(struct)` bisa lebih besar dari jumlah ukuran field. **Urutan field memengaruhi ukuran**; mengurutkan field besar ke kecil sering mengurangi padding.
4. `p->field` sama dengan `(*p).field`. Struct besar sering dilewatkan lewat pointer agar murah dan agar fungsi bisa memodifikasi struct asli.
5. **Struct + pointer ke struct sejenis** adalah dasar struktur data dinamis seperti linked list dan tree. `struct Node *next;` legal; `struct Node next;` tidak.
6. **Union** membuat semua field berbagi memori yang sama. Ukurannya sama dengan field terbesar. Gunakan dengan disiplin, biasanya lewat tagged union (`enum` + `union`).
7. **Enum** memberi nama pada konstanta integer. Ini membuat kode lebih terbaca daripada magic number.
8. **Layout struct** melalui padding, alignment, dan offset penting untuk format file biner, protokol jaringan, register hardware, dan struct syscall.

---

## 8.11 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Buat `struct Contoh { char a; int b; char c; };` dan cetak `sizeof`-nya serta `offsetof` tiap field. Cocokkah dengan analisis di Bagian 8.3? Gambar sendiri diagram byte-nya.
2. Urutkan ulang field `struct Contoh` jadi `{ int b; char a; char c; }` dan ukur lagi. Berapa sekarang? Kenapa berbeda?
3. Buat struct berisi `double`, `char`, `int`, `char` dalam urutan acak. Prediksi `sizeof`-nya dengan menggambar padding-nya, lalu verifikasi. Setelah itu, urutkan field untuk meminimalkan ukuran.
4. Tambahkan `__attribute__((packed))` ke salah satu struct-mu dan ukur lagi. Apa yang berubah? (gcc/clang)
5. Tulis `typedef struct { ... } Orang;` dan fungsi `void ulang_tahun(Orang *p)` yang menambah umur lewat `->`. Buktikan struct asli di `main` berubah.
6. Buat `union Data { int i; float f; };`, set `d.i` ke suatu nilai, lalu baca `d.f`. Setelah itu coba sebaliknya. Hubungkan hasilnya dengan konsep "byte sama, kacamata beda" dari Bab 2.
7. Buat tagged union (`enum` + `union`) untuk menyimpan nilai yang bisa berupa `int`, `float`, atau string. Lalu tulis fungsi `void cetak(Variant v)` yang mencetak sesuai `v.tipe`.
8. Definisikan `enum` untuk hari dalam seminggu, lalu cetak nilai numerik tiap konstanta. Setelah itu, beri nilai eksplisit dan amati hasilnya.

**Pertanyaan refleksi:**

1. Kenapa `sizeof` sebuah struct bisa lebih besar dari jumlah ukuran field-nya? Apa nama fenomena ini?
2. Apa itu alignment, dan kenapa CPU peduli dengan posisi data di memori?
3. Kenapa urutan field memengaruhi ukuran struct? Bagaimana strategi mengurutkan field agar lebih hemat memori?
4. Kapan kamu memilih melewatkan struct lewat pointer daripada by value? Sebutkan dua alasan.
5. Kenapa `struct Node next;` ilegal tetapi `struct Node *next;` legal? Apa hubungannya dengan ukuran?
6. Apa beda mendasar struct dan union dalam hal penggunaan memori? Kapan union berguna?
7. Kenapa enum lebih baik daripada magic number atau `#define` untuk sekumpulan konstanta yang saling berkaitan?
8. Sebutkan tiga situasi system programming di mana layout byte struct, padding, atau alignment menjadi krusial.

---

Kita sudah membahas cara membentuk dan menata data majemuk. Di Bab 9, kita masuk ke **manajemen memori manual** dengan `malloc`, `free`, cara kerja allocator di balik layar, dan bug klasik seperti memory leak, dangling pointer, serta double free. Bab itu juga akan memakai struct dan pointer untuk membangun linked list secara nyata.
