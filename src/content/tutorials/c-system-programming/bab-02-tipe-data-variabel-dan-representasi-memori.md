---
title: "Bab 2 — Tipe Data, Variabel & Representasi di Memori"
description: "Di Bab 1, kita melihat perjalanan kode sampai menjadi program yang bisa dijalankan. Sekarang kita masuk ke bahan paling dasar yang dipakai program: data. Apa itu int?..."
tags: [c, system-programming]
order: 2
updated: 2026-06-20
---

> "Di komputer, tidak ada angka dalam arti manusiawi. Yang ada hanya bit. 'Angka' adalah cara kita menafsirkan bit-bit itu."

Di Bab 1, kita melihat perjalanan kode sampai menjadi program yang bisa dijalankan. Sekarang kita masuk ke bahan paling dasar yang dipakai program: **data**. Apa itu `int`? Apa itu `char`? Di mana nilainya disimpan, dan dalam bentuk apa?

Beberapa bagian bab ini memang sedikit matematis. Namun, begitu kamu paham bahwa semua data hanyalah deretan bit yang **diinterpretasikan** berdasarkan tipe, banyak perilaku C yang awalnya terasa aneh akan mulai masuk akal. Overflow, `float` yang tidak selalu presisi, dan bug karena konversi signed/unsigned semuanya berawal dari cara bit dibaca sebagai nilai tertentu.

---

## 2.1 Memori itu cuma deretan kotak bernomor

Bayangkan **memori (RAM)** sebagai deretan kotak yang sangat panjang. Setiap kotak:

- Berukuran **1 byte** (= 8 **bit**).
- Memiliki **alamat** unik, berupa angka: 0, 1, 2, 3, dan seterusnya.

```
alamat:   1000   1001   1002   1003   1004   1005  ...
        +------+------+------+------+------+------+
isi:    | 0x48 | 0x61 | 0x6C | 0x6F | 0x00 | ...  |
        +------+------+------+------+------+------+
```

Setiap kotak menyimpan satu byte, yaitu angka 0 sampai 255. **Hanya itu.** Memori tidak tahu apakah byte di alamat 1000 adalah huruf, bagian dari sebuah angka, atau potongan instruksi. Memori hanya menyimpan angka 0-255 per kotak.

Maknanya ditentukan oleh kode yang membaca byte tersebut. Dalam C, tipe data memberi tahu compiler bagaimana byte-byte itu harus diperlakukan. Saat kamu menulis `int x;`, kamu memberi tahu compiler untuk menyediakan beberapa byte berurutan, lalu memperlakukan byte-byte itu sebagai integer. Tipe adalah **cara membaca** byte mentah.

Ide utama bab ini adalah bahwa byte tidak membawa makna tunggal secara bawaan.

> **Byte yang sama persis bisa berarti hal berbeda, tergantung tipe yang dipakai untuk membacanya.**

Nanti kita akan membuktikannya dengan kode.

### Bit, byte, dan "word"

- **bit** — unit terkecil, nilainya hanya 0 atau 1.
- **byte** — 8 bit. Di kebanyakan sistem, byte adalah unit terkecil yang punya alamat sendiri. Satu byte bisa menyimpan 2^8 = 256 nilai berbeda, dari 0 sampai 255.
- **word** — ukuran "alami" yang nyaman diproses CPU dalam satu operasi. Di mesin 64-bit, word umumnya 8 byte atau 64 bit. Ini terkait dengan ukuran register CPU dan lebar bus.

---

## 2.2 Variabel: nama untuk sepetak memori

Saat kamu menulis:

```c
int umur = 25;
```

yang terjadi kira-kira seperti ini:

1. Compiler menyiapkan ruang sebesar `sizeof(int)` byte di memori. Di banyak mesin modern, `int` biasanya 4 byte.
2. Nama `umur` menjadi **label** yang dipakai programmer untuk merujuk ke ruang memori itu. CPU sendiri tidak mengenal nama `umur`; di machine code, yang dipakai adalah alamat atau register.
3. Nilai `25` ditulis ke byte-byte tersebut dalam bentuk biner.

Variabel bisa dibayangkan seperti loker yang diberi label. Lokernya, yaitu memori dan alamatnya, benar-benar ada. Labelnya, seperti `umur`, membantu manusia menulis program. Setelah program menjadi machine code, label itu tidak lagi dipakai oleh CPU sebagai nama; yang ada adalah alamat, offset, atau register.

Mari lihat ukuran dan alamat sebuah variabel:

```c
#include <stdio.h>

int main(void) {
    int umur = 25;
    printf("nilai   : %d\n", umur);
    printf("ukuran  : %zu byte\n", sizeof(umur));
    printf("alamat  : %p\n", (void *)&umur);
    return 0;
}
```

Beberapa hal penting dari kode ini:

- `sizeof(umur)` menghasilkan ukuran dalam byte. Operator `sizeof` dihitung saat **compile time**, bukan runtime.
- `&umur` memakai operator **address-of**, yaitu operator untuk mengambil **alamat** memori sebuah variabel. Ini akan menjadi dasar pointer di Bab 6.
- `%p` adalah format specifier untuk mencetak alamat atau pointer.
- `%zu` adalah format untuk tipe `size_t`, yaitu tipe hasil dari `sizeof`.

Jalankan program itu beberapa kali. `nilai` dan `ukuran` akan tetap sama, tetapi `alamat` bisa berubah setiap run. Salah satu penyebabnya adalah fitur keamanan OS bernama **ASLR** (Address Space Layout Randomization), yang mengacak alamat agar program lebih sulit diserang. Kita akan membahasnya lagi di Bab 21.

---

## 2.3 Tipe-tipe dasar C dan ukurannya

C punya beberapa tipe dasar. Satu hal yang sering membingungkan adalah bahwa **ukuran tipe tidak selalu dijamin sama di semua platform**. Standar C hanya menjamin ukuran minimum dan beberapa hubungan relatif antar tipe. Misalnya, `sizeof(char)` selalu 1 byte, tetapi ukuran `int`, `long`, dan pointer bisa berbeda antar arsitektur dan sistem operasi. Di x86-64 Linux yang umum dipakai, ukurannya biasanya seperti ini:

| Tipe | Ukuran umum (byte) | Untuk apa |
|------|--------------------|-----------|
| `char` | 1 | satu karakter / byte mentah |
| `short` | 2 | integer kecil |
| `int` | 4 | integer "default" |
| `long` | 8 (Linux 64-bit) | integer besar |
| `long long` | 8 | integer besar (dijamin >= 8) |
| `float` | 4 | bilangan pecahan, presisi tunggal |
| `double` | 8 | bilangan pecahan, presisi ganda |

> Karena ukuran tipe bisa berbeda antar platform, system programmer sering memakai tipe berukuran pasti dari `<stdint.h>`: `int8_t`, `uint8_t`, `int16_t`, `int32_t`, `uint64_t`, dan seterusnya. `uint32_t` selalu 32 bit. Ini penting saat membaca format file biner atau protokol jaringan, karena jumlah byte harus tepat.

Kamu bisa membuktikan ukuran tipe di mesinmu sendiri dengan `sizeof`.

```c
#include <stdio.h>

int main(void) {
    printf("char       : %zu\n", sizeof(char));
    printf("short      : %zu\n", sizeof(short));
    printf("int        : %zu\n", sizeof(int));
    printf("long       : %zu\n", sizeof(long));
    printf("long long  : %zu\n", sizeof(long long));
    printf("float      : %zu\n", sizeof(float));
    printf("double     : %zu\n", sizeof(double));
    return 0;
}
```

---

## 2.4 Integer: bagaimana angka disimpan sebagai biner

Komputer memakai **basis 2 (biner)**, bukan basis 10. Artinya, tiap posisi digit bernilai kelipatan dua, bukan kelipatan sepuluh. Angka desimal `13`, misalnya, bisa ditulis sebagai berikut.

```
desimal 13 = 8 + 4 + 1 = 1101 (biner)

posisi bit:   ...  8   4   2   1
                   1   1   0   1   = 13
```

Sebuah `unsigned char` berukuran 8 bit, sehingga bisa menyimpan nilai dari `00000000` (0) sampai `11111111` (255).

### Heksadesimal: cara cepat baca bit

Menulis deretan bit panjang itu melelahkan. Karena itu programmer sering memakai **hexadecimal (basis 16)**. Satu digit hex mewakili tepat 4 bit, sehingga lebih ringkas untuk membaca data biner.

```
biner   1101 = hex D
biner   1111 = hex F
biner   1111 1111 = hex FF = desimal 255
```

Di C, angka hex ditulis dengan awalan `0x`: `0xFF` berarti 255, `0x10` berarti 16. Awalan `0b` untuk biner juga tersedia di banyak compiler sebagai ekstensi, misalnya `0b1101`.

### `signed` vs `unsigned`

- **`unsigned`** — semua bit dipakai untuk menyimpan besaran. `unsigned char` bisa menyimpan 0 sampai 255. Tidak ada nilai negatif.
- **`signed`** — bisa menyimpan nilai negatif. `int` secara default adalah signed. Pertanyaannya: bagaimana tanda minus disimpan sebagai bit?

### Two's complement: trik menyimpan angka negatif

Hampir semua komputer modern menyimpan integer negatif dengan representasi **two's complement**.

Cara berpikirnya begini. Bit paling kiri, yaitu most significant bit atau **MSB**, bukan sekadar penanda negatif. Bit itu memiliki **bobot negatif**. Untuk 8 bit, bobot tiap posisi adalah sebagai berikut.

```
bobot:  -128  64  32  16   8   4   2   1
```

Contoh, `-1` dalam 8 bit:

```
   1    1   1   1   1   1   1   1
= -128 +64 +32 +16 +8 +4 +2 +1 = -1   ✓
```

Ada cara cepat untuk membuat representasi angka negatif dalam two's complement. Ambil nilai positifnya, balik semua bit (NOT), lalu tambah 1.

```
 5  = 0000 0101
NOT = 1111 1010
+1  = 1111 1011  = -5
```

Kenapa memakai cara ini? Karena dengan two's complement, **penjumlahan angka positif dan negatif bisa memakai rangkaian penjumlah (adder) yang sama**. CPU tidak perlu sirkuit khusus untuk pengurangan.

Contoh `5 + (-5)`:

```
  0000 0101   ( 5)
+ 1111 1011   (-5)
-----------
 10000 0000   -> bit ke-9 "dibuang" (overflow keluar), sisa 0000 0000 = 0  ✓
```

Jadi two's complement bukan sekadar trik matematika. Ia membuat hardware lebih sederhana.

### Range nilai

Untuk tipe N-bit:

- **unsigned**: `0` sampai `2^N - 1`
- **signed (two's complement)**: `-2^(N-1)` sampai `2^(N-1) - 1`

Contoh `int` 32-bit signed: `-2.147.483.648` sampai `2.147.483.647`. Sisi negatif punya satu nilai lebih banyak daripada sisi positif, karena nol mengambil satu slot di sisi non-negatif.

---

## 2.5 Overflow: saat angka "muter balik"

Setiap tipe punya jumlah bit terbatas, jadi selalu ada batas nilai yang bisa disimpan. Apa yang terjadi kalau batas itu dilewati?

```c
#include <stdio.h>
#include <limits.h>     // berisi INT_MAX, UCHAR_MAX, dll

int main(void) {
    unsigned char u = 255;   // nilai maksimum unsigned char
    u = u + 1;               // 256... tapi cuma muat 8 bit
    printf("u = %u\n", u);   // -> 0   (muter balik / wrap around)

    printf("INT_MAX = %d\n", INT_MAX);
    return 0;
}
```

`255 + 1` dalam biner adalah `1 0000 0000` atau 9 bit. Tetapi `unsigned char` hanya punya 8 bit. Bit ke-9 dibuang, sehingga yang tersisa adalah `0000 0000`, yaitu 0. Ini disebut **integer overflow** atau **wrap around**.

Ada dua aturan yang perlu dibedakan dengan jelas.

- Untuk **unsigned**, wrap-around ini *terdefinisi*. Nilainya memang berputar modulo 2^N, sehingga hasilnya bisa diprediksi.
- Untuk **signed**, overflow adalah **undefined behavior (UB)** di C. Compiler boleh berasumsi bahwa signed overflow tidak pernah terjadi, lalu menghasilkan kode berdasarkan asumsi itu. Ini bukan sekadar hasil angka yang salah; asumsi compiler bisa mengubah alur optimasi. Karena itu signed overflow bisa menjadi sumber bug dan celah keamanan serius. Kita bahas lebih dalam di Bab 21.

Bayangkan odometer 8-bit yang hanya bisa menghitung sampai 255. Setelah lewat batas itu, ia kembali ke 0. Informasi yang melebihi kapasitas hilang. Mirip jam 12 jam: 11 + 2 ditampilkan sebagai 1, bukan 13.

---

## 2.6 `char`: huruf itu sebenarnya angka

`char` di C menarik karena namanya berarti "character", tetapi secara teknis ia adalah integer kecil berukuran 1 byte. Hubungan antara angka dan huruf ditentukan oleh tabel **ASCII**. Misalnya, 65 = `'A'`, 66 = `'B'`, 97 = `'a'`, 48 = `'0'`, 32 = spasi, dan seterusnya.

```c
#include <stdio.h>

int main(void) {
    char c = 'A';
    printf("sebagai char : %c\n", c);    // A
    printf("sebagai int  : %d\n", c);    // 65
    printf("c + 1        : %c\n", c + 1); // B

    char digit = '7';
    int nilai = digit - '0';             // trik klasik: '7' - '0' = 7
    printf("digit jadi angka: %d\n", nilai);
    return 0;
}
```

`'A'` dan `65` adalah byte yang sama. Yang berubah hanya cara kita mencetaknya: `%c` membaca byte itu sebagai karakter, sedangkan `%d` mencetaknya sebagai angka desimal. Ini contoh konkret dari prinsip awal bab: tipe dan format adalah cara membaca byte yang sama.

Trik `digit - '0'` sering dipakai. Karena karakter `'0'` sampai `'9'` berurutan di ASCII (48 sampai 57), mengurangi `'0'` dari karakter digit akan menghasilkan nilai numeriknya.

> Catatan: apakah `char` secara default signed atau unsigned **tidak dijamin** oleh standar C. Itu tergantung platform. Kalau kamu butuh kepastian, tulis eksplisit `signed char` atau `unsigned char`.

---

## 2.7 Floating point: kenapa `0.1 + 0.2 != 0.3`

Bagian ini sering membuat orang bingung karena hasilnya bertentangan dengan intuisi matematika sehari-hari. Lihat kode berikut.

```c
#include <stdio.h>

int main(void) {
    double a = 0.1 + 0.2;
    printf("%.17f\n", a);          // 0.30000000000000004
    printf("%s\n", (a == 0.3) ? "sama" : "BEDA");  // BEDA
    return 0;
}
```

Kenapa `0.1 + 0.2` tidak tepat sama dengan `0.3`? Komputernya tidak rusak. Ini konsekuensi dari cara `float` dan `double` menyimpan bilangan pecahan dengan standar **IEEE 754**.

### Idenya: notasi ilmiah dalam basis 2

`float` dan `double` menyimpan angka mirip notasi ilmiah, tetapi dalam basis 2:

```
nilai = (-1)^sign  ×  1.mantissa  ×  2^exponent
```

Sebuah `double` berukuran 64 bit. Bit-bit itu dibagi menjadi **1 bit sign**, **11 bit exponent**, dan **52 bit mantissa (pecahan)**. Sign menentukan positif atau negatif, exponent menentukan skala, dan mantissa menyimpan bagian signifikan dari angkanya.

Masalahnya, sama seperti `1/3 = 0.3333...` tidak bisa ditulis tepat dalam desimal terbatas, **`0.1` tidak bisa ditulis tepat dalam biner terbatas**. Dalam basis 2, `0.1` menjadi:

```
0.0001100110011001100...
```

Pola itu berulang tak hingga. Karena mantissa hanya punya 52 bit, nilainya harus **dipotong atau dibulatkan**. Akibatnya, `0.1` yang tersimpan di memori sedikit berbeda dari 0.1 yang kita maksud secara matematika. Saat dua angka yang sudah sedikit meleset dijumlahkan, hasilnya juga bisa meleset sedikit.

Bayangkan kamu diminta menulis 1/3 dengan tepat, tetapi hanya boleh memakai 4 angka di belakang koma. Kamu menulis `0.3333`. Itu mendekati 1/3, tetapi bukan tepat 1/3. Jika dijumlahkan, selisih kecil itu ikut terbawa. Komputer mengalami masalah serupa, hanya saja dalam basis 2.

### Konsekuensi praktis

1. **Jangan bandingkan float dengan `==`.** Gunakan toleransi atau epsilon:
   ```c
   #include <math.h>
   if (fabs(a - b) < 1e-9) { /* anggap sama */ }
   ```
2. **Jangan pakai float untuk uang.** Pakai integer, misalnya hitung dalam satuan terkecil seperti sen, agar presisi.
3. **`float` (4 byte) punya sekitar 7 digit desimal signifikan; `double` (8 byte) sekitar 15-16 digit.** Gunakan `double` sebagai default, kecuali kamu punya alasan kuat untuk memakai `float`, misalnya batasan memori atau performa.

---

## 2.8 Endianness: urutan byte dalam memori

Untuk tipe yang lebih besar dari 1 byte, misalnya `int` yang biasanya 4 byte, muncul pertanyaan: byte-byte itu disimpan di memori dengan **urutan** seperti apa?

Ada dua urutan utama yang umum dibahas.

- **Little-endian** — byte paling kecil atau least significant disimpan di alamat **terkecil** lebih dulu. Ini dipakai x86/x86-64 dan kebanyakan ARM modern.
- **Big-endian** — byte paling besar atau most significant disimpan lebih dulu. Ini dipakai di beberapa arsitektur lama dan, yang penting, sebagai **network byte order** di protokol jaringan.

Misalnya, `int x = 0x12345678;` berukuran 4 byte. Di **little-endian**, isi memori dari alamat rendah ke alamat tinggi menjadi seperti ini.

```
alamat:  1000  1001  1002  1003
isi:     0x78  0x56  0x34  0x12     <- byte terkecil (0x78) duluan
```

Di **big-endian**, urutannya kebalikan: `0x12 0x34 0x56 0x78`.

Buktikan endianness mesinmu dengan kode berikut. Ini juga menjadi latihan pointer ringan:

```c
#include <stdio.h>

int main(void) {
    unsigned int x = 0x12345678;
    unsigned char *p = (unsigned char *)&x;  // baca x byte-per-byte

    for (int i = 0; i < 4; i++) {
        printf("byte %d (alamat +%d) = 0x%02X\n", i, i, p[i]);
    }
    return 0;
}
```

Di mesin x86-64 yang little-endian, outputnya akan menunjukkan urutan: `0x78, 0x56, 0x34, 0x12`.

Di sini prinsip utama bab ini muncul lagi. Kita mengambil byte mentah dari sebuah `int`, lalu membacanya ulang sebagai deretan `unsigned char`. Tipe `unsigned char *` memberi kita cara untuk melihat isi memori byte demi byte, tanpa mengubah nilai `x` itu sendiri.

Kenapa ini penting? Saat kamu menulis data biner ke file atau mengirim data lewat jaringan, mesin penerima mungkin memakai endianness berbeda. Kalau urutan byte tidak disepakati, nilai `0x12345678` bisa terbaca sebagai `0x78563412`. Karena itu ada fungsi konversi seperti `htonl` dan `ntohl` (host-to-network-long), yang akan kita pakai di bab networking.

---

## 2.9 Type conversion: saat tipe bertemu tipe

Saat kamu mencampur tipe, C melakukan **konversi**. Kadang konversi itu otomatis atau implicit; kadang kamu memaksanya secara explicit dengan cast. Banyak bug muncul dari bagian ini karena konversi tidak selalu mengikuti intuisi manusia. Compiler mengikuti aturan tipe C, bukan makna bisnis dari nilai yang sedang kamu olah.

```c
#include <stdio.h>

int main(void) {
    // 1. Integer division: hasilnya integer, sisa dibuang
    int a = 7, b = 2;
    printf("%d\n", a / b);            // 3  (bukan 3.5!)
    printf("%f\n", (double)a / b);    // 3.500000  (cast dulu -> float division)

    // 2. Truncation: double -> int membuang bagian pecahan (bukan membulatkan)
    double pi = 3.99;
    int n = (int)pi;                  // 3, bukan 4
    printf("%d\n", n);

    // 3. Jebakan signed vs unsigned
    unsigned int u = 1;
    int s = -1;
    if (s < u)
        printf("s lebih kecil\n");
    else
        printf("LOH? s tidak lebih kecil\n");  // <- ini yang tercetak!
    return 0;
}
```

Kasus ketiga adalah jebakan klasik. Saat `int` (signed) dibandingkan dengan `unsigned int`, C mengkonversi nilai signed menjadi unsigned. Nilai `-1` berubah menjadi angka unsigned yang sangat besar, misalnya `4294967295` pada unsigned 32-bit. Akibatnya, perbandingan `-1 < 1` justru dianggap salah.

Bagian yang berbahaya adalah perubahan ini terjadi diam-diam. Kodenya terlihat seperti membandingkan angka negatif dengan angka positif, tetapi aturan konversi C mengubah salah satu operand lebih dulu. Karena itu warning dari compiler perlu dibaca, bukan diabaikan.

Bug keamanan sering muncul dari kesalahan semacam ini. Karena itu, hati-hati saat mencampur signed dan unsigned, terutama dalam perbandingan dan perhitungan ukuran. Nyalakan `-Wall -Wextra`; compiler biasanya akan memberi peringatan.

Beberapa aturan praktis berikut membantu menghindari bug konversi.

- Integer ÷ integer menghasilkan integer. Sisa pecahan dibuang. Cast salah satu operand ke `double` kalau kamu ingin hasil pecahan.
- `double` → `int` berarti **memotong** bagian pecahan (truncate), bukan membulatkan. Gunakan `round()` dari `<math.h>` kalau kamu ingin membulatkan.
- Hindari mencampur signed dan unsigned dalam perbandingan atau aritmetika.

---

## 2.10 `const`: variabel yang janji tidak berubah

```c
const double PI = 3.14159;
// PI = 4.0;   // ERROR saat compile: tidak boleh mengubah const
```

`const` memberi tahu compiler dan pembaca kode bahwa nilai ini tidak boleh diubah setelah diinisialisasi. Manfaatnya ada dua: mencegah perubahan yang tidak sengaja dan membuat maksud kode lebih jelas.

Kita akan membahas `const` lebih dalam saat masuk ke pointer, misalnya `const char *`, di Bab 7.

---

## 2.11 Rangkuman model mental

1. **Memori adalah deretan byte bernomor.** Memori sendiri tidak punya tipe; tipe ada di kode, sebagai cara membaca byte.
2. **Byte yang sama bisa berarti hal berbeda** tergantung cara membacanya. Misalnya, `'A'` sama dengan `65`, dan sebuah `int` bisa dilihat ulang sebagai beberapa `char`.
3. **Integer disimpan dalam biner.** Nilai negatif hampir selalu memakai **two's complement**, yang membuat hardware penjumlahan lebih sederhana.
4. **Overflow terjadi karena jumlah bit terbatas.** Unsigned overflow wrap secara terdefinisi; signed overflow adalah **undefined behavior** dan berbahaya.
5. **Floating point tidak selalu presisi.** IEEE 754 menyimpan pecahan basis 2 dengan bit terbatas. Jangan bandingkan float dengan `==`, dan jangan pakai float untuk uang.
6. **Endianness adalah urutan byte.** Ini penting saat bekerja dengan I/O biner dan jaringan.
7. **Konversi tipe adalah sumber bug klasik**, terutama saat signed dan unsigned bercampur.

---

## 2.12 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program yang mencetak `sizeof` semua tipe dasar. Lalu tambahkan `int8_t`, `int32_t`, `int64_t` dari `<stdint.h>` dan bandingkan.
2. Buat `unsigned char c = 200;`, lalu tulis `c = c + 100;`. Cetak hasilnya dengan `%u`. Prediksi dulu hasilnya sebelum menjalankan. Kenapa hasilnya seperti itu?
3. Tulis program yang mengubah karakter `'a'`-`'z'` menjadi huruf besar **tanpa** memakai fungsi library, hanya dengan aritmetika. Berapa nilai `'A' - 'a'`?
4. Jalankan kode pembuktian endianness di Section 2.8. Apa output di mesinmu? Berarti mesinmu little-endian atau big-endian?
5. Cetak `0.1 + 0.2` dengan `printf("%.17f\n", ...)`. Berapa hasil persisnya? Lalu tulis pengecekan "sama dengan 0.3" yang benar memakai epsilon.
6. Eksperimen dengan jebakan signed/unsigned dari Section 2.9. Compile dengan `-Wall -Wextra`. Warning apa yang muncul?

**Pertanyaan refleksi:**

1. Kenapa ide "memori tidak punya tipe" penting? Bagaimana ide itu menjelaskan bahwa `char` bisa diperlakukan sebagai angka?
2. Jelaskan dengan kata-katamu sendiri kenapa two's complement membuat hardware lebih sederhana.
3. Kenapa signed overflow adalah undefined behavior, sedangkan unsigned overflow tidak? Apa risikonya kalau kamu mengandalkannya?
4. Kenapa uang sebaiknya tidak disimpan dalam `float` atau `double`? Apa alternatifnya?
5. Kapan endianness mulai menjadi masalah nyata dalam program yang kamu tulis?
6. Apa perbedaan **truncation** dan **rounding** saat `double` dikonversi ke `int`? Mana yang dilakukan C secara default?

---

Di Bab 3, kita naik ke level eksekusi: operator, percabangan (`if`), dan loop. Namun kita tidak hanya melihat cara menulisnya. Kita akan melihat bagaimana CPU menjalankannya lewat register, instruction pointer, branch, dan kenapa `if` pada akhirnya adalah lompatan.
