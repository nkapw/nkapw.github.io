---
title: "Bab 5 - Array dan String"
description: "Bab ini membahas array dan string sebagai fondasi penting sebelum masuk ke pointer. Array di C bukan sekadar kumpulan nilai dengan satu nama. Array adalah blok memori..."
tags: [c, systems-programming]
order: 5
updated: 2026-07-02
---
Bab ini membahas **array** dan **string** sebagai fondasi penting sebelum masuk ke pointer. Array di C bukan sekadar kumpulan nilai dengan satu nama. Array adalah blok memori contiguous yang berisi elemen bertipe sama. String di C juga bukan tipe data khusus, melainkan array of `char` yang mengikuti konvensi null terminator.

Pemahaman tentang array akan langsung mengarah ke pointer. Ekspresi seperti `arr[i]`, `*(arr + i)`, `&arr[0]`, dan decay dari nama array menjadi pointer adalah konsep yang terus muncul pada bab berikutnya.

---

## 5.1 Masalah yang Dipecahkan Array

Jika program perlu menyimpan beberapa nilai bertipe sama, menulis satu variabel untuk setiap nilai akan cepat menjadi tidak praktis.

```c
int nilai0 = 80, nilai1 = 75, nilai2 = 90, nilai3 = 65, nilai4 = 88;
```

Array menyediakan satu nama untuk sekumpulan elemen bertipe sama.

```c
int nilai[5] = {80, 75, 90, 65, 88};
```

`nilai` adalah array berisi lima elemen bertipe `int`. Elemen diakses dengan **indeks** menggunakan kurung siku. Indeks array di C dimulai dari `0`.

```c
printf("%d\n", nilai[0]);
printf("%d\n", nilai[4]);
nilai[2] = 100;
```

Elemen pertama berada pada indeks `0`, bukan `1`. Alasannya berhubungan langsung dengan cara array dihitung di memori. Indeks menunjukkan jarak elemen dari alamat awal array. Elemen pertama berjarak nol elemen dari awal, sehingga indeksnya adalah `0`.

---

## 5.2 Array di Memori

Elemen array disimpan secara **contiguous**. Artinya, setiap elemen berada berdampingan di memori tanpa celah antar elemen.

Untuk `int nilai[5]`, jika `int` berukuran 4 byte dan elemen pertama berada di alamat 1000, susunan memorinya dapat digambarkan seperti ini.

```text
elemen    nilai[0]  nilai[1]  nilai[2]  nilai[3]  nilai[4]
alamat      1000      1004      1008      1012      1016
         +--------+--------+--------+--------+--------+
isi      |   80   |   75   |   90   |   65   |   88   |
         +--------+--------+--------+--------+--------+
```

Alamat naik 4 byte untuk setiap elemen karena ukuran satu `int` adalah 4 byte. Jika tipe elemennya berbeda, jarak antar elemen mengikuti ukuran tipe tersebut.

Susunan tersebut dapat diperiksa langsung dengan mencetak alamat setiap elemen.

```c
#include <stdio.h>

int main(void) {
    int nilai[5] = {80, 75, 90, 65, 88};

    for (int i = 0; i < 5; i++) {
        printf("nilai[%d] = %d di alamat %p\n", i, nilai[i], (void *)&nilai[i]);
    }

    printf("ukuran total array = %zu byte\n", sizeof(nilai));
    return 0;
}
```

Susunan contiguous penting karena dua alasan utama.

1. Akses elemen bersifat O(1). Untuk membaca `nilai[3]`, CPU cukup menghitung alamat awal ditambah `3 * sizeof(int)`.
2. Akses array biasanya cache-friendly. Saat CPU mengambil satu elemen dari memori, elemen di sekitarnya sering ikut masuk ke cache karena berada pada area memori yang berdekatan.

---

## 5.3 `arr[i]` dan Aritmetika Alamat

Dalam C, ekspresi `arr[i]` didefinisikan sebagai `*(arr + i)`. Artinya, program mengambil alamat awal array, maju sebanyak `i` elemen, lalu membaca nilai pada alamat tersebut.

Untuk `int nilai[5]`, ekspresi `nilai[3]` setara dengan membaca memori pada alamat awal `nilai` ditambah `3 * sizeof(int)`. Indeks tidak dihitung dalam byte, tetapi dalam satuan elemen. Compiler menggunakan tipe array untuk mengetahui ukuran satu langkah.

Karena `arr[i]` sama dengan `*(arr + i)`, ekspresi berikut valid secara bahasa C.

```c
int nilai[5] = {80, 75, 90, 65, 88};

printf("%d\n", nilai[2]);
printf("%d\n", 2[nilai]);
```

Kedua baris mencetak nilai yang sama. Namun, bentuk `2[nilai]` tidak layak digunakan dalam kode nyata karena merusak keterbacaan. Contoh ini hanya menunjukkan bahwa indexing adalah arithmetic alamat.

Pemahaman ini juga menjelaskan mengapa indeks dimulai dari `0`. Elemen pertama adalah `*(arr + 0)`, sehingga offset-nya nol elemen dari alamat awal.

---

## 5.4 Akses di Luar Batas

C tidak melakukan bounds checking pada array. Jika program mengakses indeks di luar rentang yang valid, compiler tetap dapat menerima kode tersebut.

```c
int nilai[5] = {80, 75, 90, 65, 88};

nilai[5] = 100;
nilai[100] = 7;
int x = nilai[-1];
```

Untuk array berukuran 5, indeks yang valid adalah `0` sampai `4`. Akses ke `nilai[5]`, `nilai[100]`, atau `nilai[-1]` adalah out-of-bounds.

Secara mekanis, `nilai[5]` diterjemahkan menjadi alamat awal `nilai` ditambah `5 * sizeof(int)`. Alamat itu dapat saja berada pada memori milik variabel lain, padding stack, metadata internal, atau area yang tidak boleh diakses. C tidak melindungi program dari kesalahan ini.

Akibat out-of-bounds dapat berupa beberapa hal.

1. Program crash dengan error seperti `Segmentation fault`.
2. Data lain tertimpa tanpa terlihat langsung.
3. Celah keamanan muncul, terutama jika write melewati batas buffer di stack dan menimpa return address.

Programmer C bertanggung jawab memastikan indeks selalu berada pada rentang yang benar. Untuk array berukuran `n`, rentang validnya adalah `0` sampai `n - 1`.

Saat development, gunakan tool seperti AddressSanitizer untuk mendeteksi akses di luar batas pada runtime.

```sh
gcc -fsanitize=address -g program.c
```

---

## 5.5 String di C

C tidak memiliki tipe `string` bawaan. String direpresentasikan sebagai array of `char` yang diakhiri dengan karakter null `'\0'`. Karakter ini disebut **null terminator** dan nilainya adalah `0`.

```c
char nama[] = "Budi";
```

Walaupun terlihat berisi empat karakter, array tersebut membutuhkan lima byte karena compiler menambahkan `'\0'` di akhir.

```text
indeks     0     1     2     3     4
         +-----+-----+-----+-----+-----+
isi      | 'B' | 'u' | 'd' | 'i' |'\0' |
         +-----+-----+-----+-----+-----+
nilai      66    117   100   105    0
```

Karakter `'\0'` berbeda dari karakter `'0'`. Karakter `'0'` memiliki nilai ASCII 48, sedangkan `'\0'` bernilai nol.

Fungsi seperti `printf` dengan `%s` dan `strlen` membaca string dari awal sampai menemukan `'\0'`. Karena panjang string tidak disimpan secara eksplisit, pencarian panjang string membutuhkan traversal dari karakter pertama sampai null terminator.

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    char nama[] = "Budi";

    printf("isi = %s\n", nama);
    printf("strlen = %zu\n", strlen(nama));
    printf("sizeof = %zu\n", sizeof(nama));
    return 0;
}
```

`strlen(nama)` menghasilkan `4` karena tidak menghitung null terminator. `sizeof(nama)` menghasilkan `5` karena menghitung seluruh ukuran array, termasuk `'\0'`.

Jika null terminator hilang atau tertimpa, fungsi string akan terus membaca memori sampai menemukan byte bernilai nol. Hasilnya dapat berupa output tidak valid, data bocor, atau crash.

---

## 5.6 Membaca String secara Manual

Kode berikut menunjukkan prinsip dasar yang digunakan fungsi string di C. Loop berjalan sampai menemukan `'\0'`.

```c
#include <stdio.h>

int main(void) {
    char nama[] = "Budi";

    for (int i = 0; nama[i] != '\0'; i++) {
        putchar(nama[i]);
    }

    putchar('\n');
    return 0;
}
```

Loop tidak mengetahui panjang string dari metadata tersembunyi. Batasnya ditentukan oleh null terminator.

---

## 5.7 String yang Dapat Diubah dan String Literal

Dua bentuk berikut terlihat mirip, tetapi maknanya berbeda.

```c
char a[] = "Halo";
char *b = "Halo";
```

Pada `char a[] = "Halo"`, compiler membuat array `char` dan menyalin isi string literal ke array tersebut. Array `a` adalah memori yang dapat dimodifikasi.

```c
char a[] = "Halo";
a[0] = 'h';
```

Pada `char *b = "Halo"`, `b` adalah pointer ke string literal. String literal biasanya ditempatkan pada read-only memory. Menulis ke sana menghasilkan undefined behavior.

```c
char *b = "Halo";
b[0] = 'h';
```

Jika string perlu diubah, gunakan array `char` atau alokasi heap. Jika hanya menunjuk ke string literal, gunakan `const char *` agar compiler dapat mencegah write yang tidak disengaja.

```c
const char *pesan = "Halo";
```

---

## 5.8 Fungsi String Standar

Header `<string.h>` menyediakan fungsi standar untuk operasi string dan memory.

| Fungsi | Kegunaan | Risiko |
|--------|----------|--------|
| `strlen(s)` | Menghitung panjang string tanpa `'\0'` | `s` harus null-terminated |
| `strcpy(dst, src)` | Menyalin string | Tidak memeriksa kapasitas `dst` |
| `strncpy(dst, src, n)` | Menyalin maksimal `n` byte | Dapat tidak menulis `'\0'` |
| `strcat(dst, src)` | Menambahkan `src` ke akhir `dst` | Tidak memeriksa kapasitas `dst` |
| `strcmp(a, b)` | Membandingkan isi string | Return `0` berarti sama |
| `strchr(s, c)` | Mencari karakter `c` | String harus valid |
| `memcpy(dst, src, n)` | Menyalin `n` byte mentah | Tidak peduli null terminator |

Contoh penggunaan.

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    char tujuan[20];

    strcpy(tujuan, "Halo, ");
    strcat(tujuan, "dunia");
    printf("%s\n", tujuan);

    printf("%d\n", strcmp("abc", "abc"));
    printf("%d\n", strcmp("abc", "abd"));
    return 0;
}
```

String tidak boleh dibandingkan dengan `==` jika yang ingin dibandingkan adalah isinya. Ekspresi `str1 == str2` membandingkan alamat, bukan karakter di dalam string. Untuk membandingkan isi string, gunakan `strcmp`.

`strcpy` dan `strcat` berisiko menyebabkan buffer overflow karena tidak mengetahui kapasitas buffer tujuan.

```c
char kecil[5];
strcpy(kecil, "teks terlalu panjang");
```

Kode tersebut menulis melewati batas `kecil`. Untuk membangun string dengan batas ukuran yang jelas, gunakan fungsi seperti `snprintf`.

```c
char buf[20];
snprintf(buf, sizeof(buf), "Halo, %s", "dunia");
```

Di C, program harus mengelola kapasitas buffer secara eksplisit. String tidak otomatis membesar ketika data yang disalin lebih panjang dari kapasitasnya.

---

## 5.9 Hubungan Array dan Pointer

Dalam kebanyakan ekspresi, nama array mengalami **decay** menjadi pointer ke elemen pertama. Saat menulis `nilai` tanpa indeks pada banyak konteks, ekspresi tersebut diperlakukan sebagai alamat `&nilai[0]`.

```c
int nilai[5] = {80, 75, 90, 65, 88};

printf("%p\n", (void *)nilai);
printf("%p\n", (void *)&nilai[0]);
```

Kedua alamat tersebut sama.

Ketika array dikirim ke fungsi, yang dikirim bukan salinan seluruh array. Yang dikirim adalah pointer ke elemen pertama.

```c
void cetak(int arr[], int n) {
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
}
```

Parameter `int arr[]` pada fungsi setara dengan `int *arr`. Karena itu, fungsi tidak mengetahui panjang array dari parameter tersebut. `sizeof(arr)` di dalam fungsi menghasilkan ukuran pointer, bukan ukuran array asli.

Panjang array harus dikirim sebagai argumen terpisah.

```c
void cetak(int arr[], int n);
```

Karena fungsi menerima pointer ke elemen pertama, fungsi dapat mengubah isi array milik pemanggil.

```c
void ubah(int arr[], int n) {
    if (n > 0) {
        arr[0] = 999;
    }
}
```

Perilaku ini berbeda dari pass by value untuk variabel biasa. Pada array, fungsi bekerja pada memori yang sama dengan pemanggil.

---

## 5.10 Array Multidimensi

Multidimensional array tetap disimpan secara contiguous. Pada C, susunannya menggunakan **row-major order**, yaitu elemen baris pertama disimpan lebih dulu, kemudian baris berikutnya.

```c
int matriks[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};

printf("%d\n", matriks[1][2]);
```

Susunan memorinya bersifat linear.

```text
[1][2][3][4][5][6]
```

Untuk `int matriks[2][3]`, ekspresi `matriks[i][j]` dihitung sebagai offset `i * 3 + j` dari elemen pertama. Konsepnya tetap arithmetic alamat, hanya dengan perhitungan offset yang melibatkan baris dan kolom.

---

## 5.11 Rangkuman Model Mental

1. Array adalah blok memori contiguous dengan elemen bertipe sama.
2. Indeks array dimulai dari `0` karena indeks adalah offset dari alamat awal.
3. Ekspresi `arr[i]` setara dengan `*(arr + i)`.
4. C tidak melakukan bounds checking pada array.
5. Out-of-bounds dapat menyebabkan crash, data corruption, atau security bug.
6. String di C adalah array of `char` yang diakhiri `'\0'`.
7. `strlen` menghitung karakter sebelum null terminator, sedangkan `sizeof` pada array menghitung ukuran total array.
8. `char a[] = "Halo"` membuat array yang dapat diubah.
9. `char *b = "Halo"` menunjuk ke string literal yang tidak boleh diubah.
10. String dibandingkan dengan `strcmp`, bukan `==`.
11. Array name biasanya decay menjadi pointer ke elemen pertama.
12. Fungsi yang menerima array perlu menerima panjang array sebagai argumen terpisah.

---

## 5.12 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Buat `int arr[5]`, isi dengan loop, lalu cetak nilai dan alamat setiap elemen menggunakan `&arr[i]`. Bandingkan selisih alamat dengan `sizeof(int)`.
2. Buktikan bahwa `arr[2]` dan `2[arr]` menghasilkan nilai yang sama. Jelaskan dengan definisi `*(arr + i)`.
3. Tulis versi sederhana dari `strlen` yang menghitung karakter sampai `'\0'`. Bandingkan hasilnya dengan `strlen`.
4. Akses `arr[10]` pada array berukuran 5. Jalankan program, lalu compile ulang dengan `gcc -fsanitize=address -g` dan amati laporan AddressSanitizer.
5. Jalankan `char *b = "Halo"; b[0] = 'h';`. Bandingkan dengan `char a[] = "Halo"; a[0] = 'h';`.
6. Buat buffer `char buf[10]`, lalu sambungkan string yang terlalu panjang dengan `strcat`. Tulis ulang versi yang lebih aman menggunakan `snprintf`.
7. Tulis fungsi `void dobel(int arr[], int n)` yang menggandakan setiap elemen. Buktikan bahwa array asli di `main` ikut berubah.

### Pertanyaan Refleksi

1. Mengapa array contiguous membuat akses elemen dapat dilakukan dalam O(1)?
2. Apa hubungan antara indeks mulai dari `0` dan ekspresi `*(arr + i)`?
3. Mengapa out-of-bounds berbahaya di C?
4. Apa fungsi null terminator pada string C?
5. Mengapa `sizeof` dan `strlen` dapat menghasilkan angka berbeda untuk string yang sama?
6. Mengapa `str1 == str2` tidak membandingkan isi string?
7. Mengapa fungsi yang menerima array juga perlu menerima panjang array?

---

Bab ini membangun dasar untuk memahami pointer. Array memperlihatkan bahwa banyak operasi di C bergantung pada alamat, offset, ukuran tipe, dan tanggung jawab programmer terhadap batas memori.

Pada Bab 6, pembahasan berlanjut ke pointer secara langsung. Materinya mencakup alamat, operator `*` dan `&`, hubungan pointer dengan argumen fungsi, serta alasan pointer menjadi salah satu konsep paling penting dalam C.

