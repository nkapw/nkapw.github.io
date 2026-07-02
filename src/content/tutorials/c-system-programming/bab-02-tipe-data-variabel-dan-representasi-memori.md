---
title: "Bab 2 - Tipe Data, Variabel, dan Representasi Memori"
description: "Di komputer, data disimpan sebagai bit. Makna dari bit tersebut ditentukan oleh cara program membacanya."
tags: [c, systems-programming]
order: 2
updated: 2026-07-02
---
> Di komputer, data disimpan sebagai bit. Makna dari bit tersebut ditentukan oleh cara program membacanya.

Pada Bab 1, kita membahas bagaimana source code diterjemahkan menjadi program executable. Pada bab ini, fokusnya adalah data. Kita akan membahas apa itu `int`, `char`, `float`, dan `double`, bagaimana variabel disimpan, serta bagaimana nilai direpresentasikan di memori.

Pembahasan ini penting karena banyak perilaku C yang terlihat aneh sebenarnya berasal dari cara data direpresentasikan. Overflow, keterbatasan floating point, endianness, dan konversi signed atau unsigned semuanya berhubungan langsung dengan bit dan byte.

---

## 2.1 Memori sebagai Deretan Byte

Memori utama atau RAM dapat dipahami sebagai deretan byte yang masing-masing memiliki alamat. Satu byte terdiri dari 8 bit, dan pada kebanyakan sistem, byte adalah unit terkecil yang memiliki alamat sendiri.

Contoh isi memori dapat digambarkan sebagai berikut.

```text
alamat   1000   1001   1002   1003   1004   1005
       +------+------+------+------+------+------+
isi    | 0x48 | 0x61 | 0x6C | 0x6F | 0x00 | ...  |
       +------+------+------+------+------+------+
```

Setiap alamat menyimpan satu byte, yaitu nilai dari 0 sampai 255. Memori tidak mengetahui apakah byte tersebut adalah karakter, angka, bagian dari instruksi, atau bagian dari struktur data. Memori hanya menyimpan nilai biner.

Makna dari byte ditentukan oleh tipe data dan instruksi yang digunakan program. Ketika menulis `int x;`, programmer meminta compiler menyediakan sejumlah byte dan memperlakukan byte tersebut sebagai integer. Ketika menulis `char c;`, byte yang tersedia dibaca sebagai karakter atau integer kecil.

Prinsip penting pada bab ini adalah bahwa byte yang sama dapat memiliki makna berbeda, tergantung tipe yang digunakan untuk membacanya.

### Bit, Byte, dan Word

- Bit adalah unit data terkecil yang bernilai 0 atau 1.
- Byte terdiri dari 8 bit dan biasanya menjadi unit terkecil yang memiliki alamat.
- Word adalah ukuran data yang alami bagi CPU tertentu. Pada mesin 64-bit, word sering berukuran 8 byte atau 64 bit.

Ukuran word berkaitan dengan register CPU, lebar operasi tertentu, dan cara hardware memproses data secara efisien.

---

## 2.2 Variabel sebagai Nama untuk Lokasi Memori

Perhatikan deklarasi berikut.

```c
int umur = 25;
```

Secara konseptual, compiler menyiapkan ruang sebesar `sizeof(int)` byte untuk menyimpan nilai tersebut. Pada banyak sistem modern, `int` berukuran 4 byte. Nama `umur` digunakan oleh programmer untuk merujuk ke lokasi memori tersebut.

CPU tidak bekerja dengan nama variabel seperti `umur`. Setelah program dikompilasi, nama variabel diterjemahkan menjadi alamat, offset, atau register tertentu. Nama variabel terutama berguna pada level source code.

Contoh berikut menunjukkan nilai, ukuran, dan alamat sebuah variabel.

```c
#include <stdio.h>

int main(void) {
    int umur = 25;
    printf("nilai   = %d\n", umur);
    printf("ukuran  = %zu byte\n", sizeof(umur));
    printf("alamat  = %p\n", (void *)&umur);
    return 0;
}
```

Beberapa hal penting dari contoh tersebut.

- `sizeof(umur)` menghasilkan ukuran variabel dalam byte.
- `&umur` mengambil alamat memori dari variabel `umur`.
- `%p` digunakan untuk mencetak alamat pointer.
- `%zu` digunakan untuk mencetak nilai bertipe `size_t`, yaitu tipe hasil dari `sizeof`.

Jika program dijalankan beberapa kali, alamat variabel dapat berubah. Salah satu penyebabnya adalah ASLR atau Address Space Layout Randomization, fitur keamanan sistem operasi yang mengacak tata letak alamat memori proses.

---

## 2.3 Tipe Dasar C dan Ukurannya

C menyediakan beberapa tipe dasar. Ukuran tipe tidak selalu sama di semua platform. Standar C menetapkan ukuran minimum dan hubungan relatif antar tipe, tetapi tidak selalu menetapkan ukuran pasti dalam byte.

Pada sistem x86-64 Linux yang umum, ukuran tipe biasanya seperti berikut.

| Tipe | Ukuran umum | Kegunaan |
|------|-------------|----------|
| `char` | 1 byte | Karakter atau byte mentah |
| `short` | 2 byte | Integer kecil |
| `int` | 4 byte | Integer umum |
| `long` | 8 byte pada Linux 64-bit | Integer besar |
| `long long` | 8 byte | Integer besar |
| `float` | 4 byte | Bilangan pecahan presisi tunggal |
| `double` | 8 byte | Bilangan pecahan presisi ganda |

Karena ukuran tipe dapat berbeda antarplatform, system programmer sering menggunakan tipe dari `<stdint.h>` ketika membutuhkan ukuran yang pasti. Contohnya adalah `int8_t`, `uint8_t`, `int16_t`, `int32_t`, dan `uint64_t`.

Tipe berukuran pasti penting saat membaca format file biner, protokol jaringan, data hardware, atau struktur data yang harus memiliki ukuran tertentu.

Program berikut dapat digunakan untuk memeriksa ukuran tipe di mesin yang digunakan.

```c
#include <stdio.h>

int main(void) {
    printf("char       = %zu\n", sizeof(char));
    printf("short      = %zu\n", sizeof(short));
    printf("int        = %zu\n", sizeof(int));
    printf("long       = %zu\n", sizeof(long));
    printf("long long  = %zu\n", sizeof(long long));
    printf("float      = %zu\n", sizeof(float));
    printf("double     = %zu\n", sizeof(double));
    return 0;
}
```

---

## 2.4 Representasi Integer dalam Biner

Komputer menyimpan integer dalam basis 2. Angka desimal `13` dapat ditulis sebagai `1101` dalam biner.

```text
desimal 13 = 8 + 4 + 1 = 1101

posisi bit  ...  8   4   2   1
                  1   1   0   1
```

Sebuah `unsigned char` berukuran 8 bit. Nilai terkecilnya adalah `00000000`, yaitu 0. Nilai terbesarnya adalah `11111111`, yaitu 255.

### Heksadesimal

Heksadesimal atau basis 16 sering digunakan karena satu digit heksadesimal mewakili tepat 4 bit. Dengan demikian, byte dan nilai biner panjang lebih mudah dibaca.

```text
biner 1101       = hex D
biner 1111       = hex F
biner 1111 1111  = hex FF = desimal 255
```

Di C, nilai heksadesimal ditulis dengan awalan `0x`. Contohnya, `0xFF` bernilai 255 dan `0x10` bernilai 16. Beberapa compiler juga mendukung awalan `0b` untuk literal biner, meskipun dukungan ini bergantung pada standar dan compiler yang digunakan.

### Signed dan Unsigned

Tipe unsigned menggunakan seluruh bit untuk merepresentasikan nilai non-negatif. Contohnya, `unsigned char` berukuran 8 bit dapat menyimpan nilai 0 sampai 255.

Tipe signed dapat menyimpan nilai negatif dan positif. Pada hampir semua komputer modern, representasi signed integer menggunakan two's complement.

### Two's Complement

Two's complement adalah cara umum untuk merepresentasikan bilangan negatif. Pada representasi ini, bit paling kiri atau most significant bit memiliki bobot negatif.

Untuk integer 8 bit, bobot tiap bit dapat dilihat sebagai berikut.

```text
bobot  -128   64   32   16    8    4    2    1
```

Contoh nilai `-1` dalam 8 bit.

```text
bit      1     1    1    1    1    1    1    1
nilai  -128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = -1
```

Cara umum untuk mendapatkan representasi negatif adalah membalik semua bit, lalu menambahkan 1.

```text
 5   = 0000 0101
NOT  = 1111 1010
+1   = 1111 1011
```

Hasil `1111 1011` adalah representasi 8 bit untuk `-5`.

Keunggulan two's complement adalah operasi penjumlahan dapat menggunakan mekanisme hardware yang sama untuk nilai positif dan negatif.

```text
  0000 0101
+ 1111 1011
-----------
1 0000 0000
```

Jika hanya 8 bit yang disimpan, bit ke-9 dibuang dan hasilnya menjadi `0000 0000`, yaitu 0.

### Rentang Nilai

Untuk tipe N-bit, rentang nilai unsigned adalah `0` sampai `2^N - 1`.

Untuk tipe signed two's complement, rentangnya adalah `-2^(N-1)` sampai `2^(N-1) - 1`.

Sebagai contoh, `int` signed 32 bit dapat menyimpan nilai dari `-2.147.483.648` sampai `2.147.483.647`. Sisi negatif memiliki satu nilai lebih banyak karena nilai nol termasuk dalam sisi non-negatif.

---

## 2.5 Overflow

Setiap tipe integer memiliki jumlah bit terbatas. Jika hasil operasi melewati rentang yang dapat disimpan, terjadi overflow.

```c
#include <stdio.h>
#include <limits.h>

int main(void) {
    unsigned char u = 255;
    u = u + 1;
    printf("u = %u\n", u);

    printf("INT_MAX = %d\n", INT_MAX);
    return 0;
}
```

Pada `unsigned char` 8 bit, nilai 255 direpresentasikan sebagai `11111111`. Jika ditambah 1, hasil matematisnya membutuhkan 9 bit. Karena variabel hanya menyimpan 8 bit, hasil akhirnya kembali menjadi `00000000`.

Untuk unsigned integer, perilaku ini terdefinisi. Hasil operasi mengikuti aritmetika modulo `2^N`, dengan N sebagai jumlah bit tipe tersebut.

Untuk signed integer, overflow adalah undefined behavior dalam C. Compiler boleh mengasumsikan signed overflow tidak terjadi dan dapat menghasilkan optimasi yang tidak sesuai dengan dugaan programmer jika asumsi itu dilanggar.

Karena itu, jangan mengandalkan signed overflow. Gunakan tipe yang cukup besar, lakukan validasi batas, atau gunakan pendekatan lain ketika operasi berpotensi melewati rentang tipe.

---

## 2.6 `char` sebagai Integer Kecil

`char` adalah tipe integer berukuran 1 byte. Nama `char` menunjukkan penggunaan umum sebagai karakter, tetapi nilainya tetap disimpan sebagai angka.

Hubungan antara angka dan karakter ditentukan oleh encoding. Untuk karakter dasar seperti huruf Latin, encoding yang umum dibahas adalah ASCII. Dalam ASCII, nilai 65 merepresentasikan `'A'`, nilai 66 merepresentasikan `'B'`, nilai 97 merepresentasikan `'a'`, dan nilai 48 merepresentasikan `'0'`.

```c
#include <stdio.h>

int main(void) {
    char c = 'A';
    printf("sebagai char = %c\n", c);
    printf("sebagai int  = %d\n", c);
    printf("c + 1        = %c\n", c + 1);

    char digit = '7';
    int nilai = digit - '0';
    printf("digit jadi angka = %d\n", nilai);
    return 0;
}
```

Pada contoh tersebut, `'A'` dan 65 merepresentasikan byte yang sama. Perbedaannya terletak pada format yang digunakan untuk menampilkan nilai. `%c` menampilkan karakter, sedangkan `%d` menampilkan nilai integer.

Ekspresi `digit - '0'` sering digunakan untuk mengubah karakter digit menjadi nilai numeriknya. Ini bekerja karena karakter `'0'` sampai `'9'` tersusun berurutan dalam ASCII.

Perlu diperhatikan bahwa `char` biasa dapat bersifat signed atau unsigned tergantung platform. Jika perilakunya harus pasti, gunakan `signed char` atau `unsigned char` secara eksplisit.

---

## 2.7 Floating Point

Bilangan pecahan seperti `float` dan `double` menggunakan representasi yang berbeda dari integer. Standar yang umum digunakan adalah IEEE 754.

Perhatikan contoh berikut.

```c
#include <stdio.h>

int main(void) {
    double a = 0.1 + 0.2;
    printf("%.17f\n", a);
    printf("%s\n", (a == 0.3) ? "sama" : "berbeda");
    return 0;
}
```

Output yang umum terlihat adalah nilai yang sangat dekat dengan 0.3, tetapi tidak sama persis.

```text
0.30000000000000004
berbeda
```

Hal ini terjadi karena tidak semua pecahan desimal dapat direpresentasikan secara tepat dalam biner. Nilai `0.1` memiliki representasi biner berulang. Karena `double` memiliki jumlah bit terbatas untuk menyimpan pecahan, nilai tersebut harus dibulatkan ke representasi terdekat yang tersedia.

Secara umum, `double` 64 bit terdiri dari bit tanda, exponent, dan mantissa. Bentuknya mengikuti gagasan notasi ilmiah dalam basis 2.

```text
nilai = (-1)^sign * 1.mantissa * 2^exponent
```

Karena ada pembulatan pada representasi, hasil operasi floating point juga dapat mengandung selisih kecil.

Konsekuensi praktis yang perlu diingat.

1. Jangan membandingkan floating point dengan `==` untuk nilai hasil perhitungan. Gunakan toleransi.

   ```c
   #include <math.h>

   if (fabs(a - b) < 1e-9) {
       /* dianggap sama */
   }
   ```

2. Jangan menggunakan `float` atau `double` untuk uang jika presisi satuan terkecil harus dijaga. Gunakan integer, misalnya menyimpan nilai dalam satuan sen atau rupiah terkecil.
3. `float` biasanya memiliki sekitar 7 digit desimal signifikan. `double` biasanya memiliki sekitar 15 sampai 16 digit desimal signifikan.

Dalam program C umum, gunakan `double` sebagai pilihan awal untuk bilangan pecahan kecuali ada alasan kuat untuk memilih `float`.

---

## 2.8 Endianness

Endianness adalah urutan penyimpanan byte untuk tipe yang berukuran lebih dari 1 byte. Misalnya, `int` 32 bit terdiri dari 4 byte. Byte tersebut dapat disimpan dalam urutan yang berbeda tergantung arsitektur.

Little-endian menyimpan byte paling rendah atau least significant byte pada alamat terendah. Arsitektur x86 dan x86-64 menggunakan urutan ini.

Big-endian menyimpan byte paling tinggi atau most significant byte pada alamat terendah. Urutan ini juga dikenal sebagai network byte order pada banyak protokol jaringan.

Misalnya terdapat nilai berikut.

```c
int x = 0x12345678;
```

Pada little-endian, byte disimpan dari alamat rendah ke alamat tinggi seperti berikut.

```text
alamat  1000  1001  1002  1003
isi     0x78  0x56  0x34  0x12
```

Pada big-endian, urutannya menjadi `0x12 0x34 0x56 0x78`.

Program berikut dapat digunakan untuk memeriksa endianness mesin.

```c
#include <stdio.h>

int main(void) {
    unsigned int x = 0x12345678;
    unsigned char *p = (unsigned char *)&x;

    for (int i = 0; i < 4; i++) {
        printf("byte %d alamat +%d = 0x%02X\n", i, i, p[i]);
    }
    return 0;
}
```

Pada mesin little-endian, output byte biasanya dimulai dari `0x78`, lalu `0x56`, `0x34`, dan `0x12`.

Endianness penting saat program menulis data biner ke file, membaca data dari file biner, atau mengirim data melalui jaringan. Jika dua sistem menggunakan urutan byte yang berbeda, nilai yang sama dapat dibaca sebagai angka yang berbeda. Pada pemrograman jaringan, fungsi seperti `htonl` dan `ntohl` digunakan untuk mengonversi antara host byte order dan network byte order.

---

## 2.9 Konversi Tipe

Ketika beberapa tipe digunakan dalam satu ekspresi, C dapat melakukan konversi tipe. Konversi dapat terjadi secara implicit atau melalui cast eksplisit.

```c
#include <stdio.h>

int main(void) {
    int a = 7, b = 2;
    printf("%d\n", a / b);
    printf("%f\n", (double)a / b);

    double pi = 3.99;
    int n = (int)pi;
    printf("%d\n", n);

    unsigned int u = 1;
    int s = -1;

    if (s < u)
        printf("s lebih kecil\n");
    else
        printf("s tidak lebih kecil\n");

    return 0;
}
```

Pada pembagian `a / b`, kedua operand bertipe integer, sehingga hasilnya juga integer. Bagian pecahan dibuang. Jika salah satu operand dikonversi menjadi `double`, pembagian dilakukan sebagai pembagian floating point.

Konversi dari `double` ke `int` membuang bagian pecahan. Proses ini disebut truncation, bukan rounding. Jika ingin membulatkan, gunakan fungsi seperti `round()` dari `<math.h>`.

Perbandingan signed dan unsigned perlu diperhatikan. Jika `int` dibandingkan dengan `unsigned int`, nilai signed dapat dikonversi menjadi unsigned. Dalam banyak sistem, nilai `-1` akan berubah menjadi nilai unsigned yang sangat besar. Akibatnya, hasil perbandingan dapat berbeda dari dugaan awal.

Aturan praktis yang perlu diingat.

- Pembagian integer menghasilkan integer.
- Cast salah satu operand ke `double` jika membutuhkan hasil pecahan.
- Konversi `double` ke `int` melakukan truncation.
- Hindari mencampur signed dan unsigned dalam perbandingan atau aritmetika jika tidak benar-benar diperlukan.
- Aktifkan warning compiler seperti `-Wall` dan `-Wextra`.

---

## 2.10 `const`

`const` digunakan untuk menyatakan bahwa sebuah nilai tidak boleh diubah setelah diinisialisasi.

```c
const double PI = 3.14159;
/* PI = 4.0; tidak valid */
```

Penggunaan `const` membantu compiler mendeteksi perubahan yang tidak disengaja. Selain itu, `const` membuat maksud kode lebih jelas bagi pembaca.

Pada bab tentang pointer, `const` akan dibahas lebih dalam karena posisinya dapat memengaruhi apakah pointer, data yang ditunjuk, atau keduanya tidak boleh diubah.

---

## 2.11 Rangkuman Model Mental

Beberapa gagasan utama dari bab ini perlu diingat.

1. Memori menyimpan byte, bukan tipe. Tipe ditentukan oleh kode yang membaca atau menulis byte tersebut.
2. Byte yang sama dapat ditafsirkan berbeda tergantung tipe dan format yang digunakan.
3. Integer disimpan dalam biner. Bilangan negatif pada sistem modern umumnya menggunakan two's complement.
4. Overflow terjadi karena jumlah bit terbatas. Unsigned overflow terdefinisi, sedangkan signed overflow adalah undefined behavior.
5. Floating point tidak selalu merepresentasikan pecahan desimal secara tepat. Gunakan toleransi saat membandingkan hasil perhitungan.
6. Endianness menentukan urutan byte di memori dan penting pada file biner serta jaringan.
7. Konversi tipe dapat menjadi sumber bug, terutama pada perbandingan signed dan unsigned.

---

## 2.12 Latihan dan Pertanyaan Refleksi

Kerjakan latihan berikut dengan mengetik dan menjalankan programnya sendiri.

### Latihan Praktik

1. Tulis program yang mencetak `sizeof` semua tipe dasar. Tambahkan `int8_t`, `int32_t`, dan `int64_t` dari `<stdint.h>`, lalu bandingkan hasilnya.
2. Buat `unsigned char c = 200;`, lalu jalankan `c = c + 100;`. Cetak hasilnya dengan `%u` dan jelaskan mengapa nilainya berubah seperti itu.
3. Tulis program yang mengubah karakter `'a'` sampai `'z'` menjadi huruf besar tanpa fungsi library, hanya dengan aritmetika karakter.
4. Jalankan program pemeriksa endianness pada bagian 2.8. Tentukan apakah mesin yang digunakan little-endian atau big-endian.
5. Cetak hasil `0.1 + 0.2` dengan `printf("%.17f\n", ...)`. Buat pengecekan kesamaan dengan `0.3` menggunakan epsilon.
6. Jalankan contoh signed dan unsigned pada bagian 2.9. Kompilasi dengan `-Wall -Wextra` dan amati warning yang muncul.

### Pertanyaan Refleksi

1. Mengapa gagasan bahwa memori tidak memiliki tipe penting untuk memahami C?
2. Bagaimana two's complement membantu menyederhanakan operasi aritmetika pada hardware?
3. Mengapa signed overflow berbahaya dalam C?
4. Mengapa nilai uang sebaiknya tidak disimpan menggunakan `float` atau `double`?
5. Pada situasi apa endianness menjadi masalah nyata dalam program?
6. Apa perbedaan truncation dan rounding ketika `double` dikonversi menjadi `int`?

---

Sampai di sini, kita sudah membahas tipe data, variabel, dan representasi memori. Pada bab berikutnya, kita akan membahas operator, percabangan, dan loop dengan melihat bagaimana instruksi tersebut dijalankan oleh komputer.

