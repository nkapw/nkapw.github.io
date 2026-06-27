---
title: "Bab 5 — Arrays & Strings"
description: "Kita masuk ke Bagian II, inti C. Bab ini membahas array, yaitu banyak data sejenis yang disimpan berderet di memori, dan string, yang di C sebenarnya adalah array..."
tags: [c, system-programming]
order: 5
updated: 2026-06-21
---

> "Array bukan sekadar kumpulan variabel. Array adalah blok memori berurutan, dan `arr[i]` berarti mengambil elemen pada jarak `i` langkah dari awal."

Kita masuk ke Bagian II, inti C. Bab ini membahas **array**, yaitu banyak data sejenis yang disimpan berderet di memori, dan **string**, yang di C sebenarnya adalah array karakter dengan satu aturan tambahan.

Bab ini juga menjadi jembatan menuju pointer. Di akhir bab, kamu akan mulai melihat kenapa array dan pointer di C sering dibahas berdekatan, bahkan sering tertukar oleh pemula.

Fondasi di bab ini akan membuat Bab 6 tentang pointer lebih mudah diikuti.

---

## 5.1 Masalah yang dipecahkan array

Misalkan kamu ingin menyimpan nilai ujian 5 mahasiswa. Tanpa array, kodenya bisa seperti ini:

```c
int nilai0 = 80, nilai1 = 75, nilai2 = 90, nilai3 = 65, nilai4 = 88;
```

Untuk 5 data saja, bentuk ini sudah tidak nyaman dibaca. Bayangkan kalau datanya 1000. Array memecahkan masalah ini dengan memberi satu nama untuk banyak slot berurutan.

```c
int nilai[5] = {80, 75, 90, 65, 88};
```

`nilai` adalah array berisi 5 `int`. Elemen diakses dengan **index** dalam kurung siku, dan index dimulai dari 0:

```c
printf("%d\n", nilai[0]);   // 80  (elemen pertama)
printf("%d\n", nilai[4]);   // 88  (elemen kelima/terakhir)
nilai[2] = 100;             // ubah elemen ketiga
```

> **Index mulai dari 0, bukan 1.** Alasannya akan jelas saat kita melihat bahwa array adalah aritmetika alamat. Index berarti "berapa langkah dari awal". Elemen pertama berarti 0 langkah dari awal.

---

## 5.2 Array di memori: berderet rapat (kontigu)

Karakteristik utama array ada pada cara elemennya ditata di memori.

> **Elemen-elemen array disimpan di memori secara contiguous: berderet rapat tanpa celah, satu demi satu.**

Untuk `int nilai[5]`, anggap `int` berukuran 4 byte. Jika elemen pertama berada di alamat 1000, layout-nya kira-kira seperti ini:

```
elemen:   nilai[0]  nilai[1]  nilai[2]  nilai[3]  nilai[4]
alamat:    1000      1004      1008      1012      1016
          +--------+--------+--------+--------+--------+
isi:      |   80   |   75   |   90   |   65   |   88   |
          +--------+--------+--------+--------+--------+
            4 byte   4 byte   4 byte   4 byte   4 byte
```

Alamatnya naik 4 byte setiap elemen: 1000, 1004, 1008, dan seterusnya. Tidak ada celah di antara elemen. Itulah arti *contiguous*.

Buktikan sendiri:

```c
#include <stdio.h>

int main(void) {
    int nilai[5] = {80, 75, 90, 65, 88};
    for (int i = 0; i < 5; i++) {
        printf("nilai[%d] = %d  di alamat %p\n", i, nilai[i], (void *)&nilai[i]);
    }
    printf("ukuran total array: %zu byte\n", sizeof(nilai));  // 20 (5 x 4)
    return 0;
}
```

Kamu akan melihat alamatnya naik secara konstan, biasanya 4 byte tiap baris untuk array `int`. Array bisa dibayangkan seperti deretan loker yang menempel di tembok. Karena posisi dan ukuran tiap loker seragam, lokasi loker ke-i bisa dihitung dari lokasi loker pertama.

### Kenapa contiguous itu penting?

1. **Akses O(1) atau konstan.** Untuk mengambil `nilai[3]`, CPU tidak perlu mencari satu per satu. Ia langsung menghitung alamatnya: `alamat_awal + 3 * 4`. Tidak peduli array berisi 5 atau 5 juta elemen, akses ke elemen mana pun tetap satu perhitungan alamat.
2. **Cache-friendly.** CPU mengambil data dari RAM dalam blok yang disebut cache line. Karena elemen array berdekatan, saat `nilai[0]` diambil, elemen berikutnya seperti `nilai[1]` dan `nilai[2]` sering ikut masuk cache. Iterasi atas array jadi sangat cepat. Ini salah satu alasan loop atas array biasanya jauh lebih cepat daripada struktur data yang node-node-nya tersebar di memori.

---

## 5.3 `arr[i]` itu sebenarnya aritmetika alamat

Sekarang masuk ke ide yang akan menjadi dasar Bab 6:

> **`arr[i]` secara definisi sama dengan `*(arr + i)`: ambil alamat awal array, maju `i` elemen, lalu baca isinya.**

Compiler menerjemahkan `nilai[3]` dengan pola seperti ini. Ia mengambil alamat awal `nilai`, menambahkan `3 * sizeof(int)`, lalu membaca 4 byte di alamat itu.

Index `i` bukan berarti "byte ke-i", melainkan "elemen ke-i". Compiler otomatis mengalikan `i` dengan ukuran tipe elemen. Karena itu array harus tahu tipenya; compiler perlu tahu berapa besar satu langkah.

Ada satu konsekuensi yang sering membuat orang kaget. Karena `arr[i]` sama dengan `*(arr + i)`, dan `arr + i` setara dengan `i + arr`, maka **`arr[i]` sama dengan `i[arr]`**.

```c
int nilai[5] = {80, 75, 90, 65, 88};
printf("%d\n", nilai[2]);   // 90
printf("%d\n", 2[nilai]);   // 90 juga! (legal, tapi jangan pernah ditulis begini)
```

`2[nilai]` valid dalam C, dan kamu boleh mencobanya untuk membuktikan konsep ini. Namun jangan menulis gaya seperti itu di kode nyata. Tujuannya hanya untuk menunjukkan bahwa indexing adalah aritmetika alamat.

Begitu ide ini jelas, index mulai dari 0 menjadi masuk akal: elemen pertama berarti 0 langkah dari awal, yaitu `*(arr + 0)`.

---

## 5.4 Bahaya utama: out-of-bounds

Jebakan klasik dalam array C adalah akses di luar batas.

> **C tidak mengecek batas array. Kamu bisa mengakses index di luar array, dan compiler biasanya tetap diam. Akibatnya bisa crash, atau lebih buruk, data rusak diam-diam.**

```c
int nilai[5] = {80, 75, 90, 65, 88};
nilai[5] = 100;    // BAHAYA: index valid cuma 0..4. Ini di LUAR array.
nilai[100] = 7;    // BAHAYA lebih parah.
int x = nilai[-1]; // BAHAYA: index negatif pun "boleh".
```

Kenapa C membiarkan ini? Ingat Bagian 5.3. `nilai[5]` diterjemahkan menjadi `*(alamat_awal + 5*4)`. Secara aritmetika, itu tetap alamat.

Masalahnya, alamat tersebut tidak lagi berada di dalam array `nilai`. Bisa saja ia menunjuk ke variabel lain, bagian stack lain, atau bahkan return address seperti yang dibahas di Bab 4. C tidak mengecek batas ini setiap kali akses array dilakukan, karena pengecekan seperti itu punya biaya runtime dan C memilih memberi kontrol itu kepada programmer.

Akibatnya bisa berupa:

- **Crash** (`Segmentation fault`) jika alamatnya berada di luar memori sah milik program.
- **Data lain tertimpa diam-diam**. Ini jenis bug yang sulit dilacak, karena program terlihat berjalan, tetapi nilainya korup.
- **Celah keamanan.** Menulis melewati batas array, terutama array di stack, bisa menimpa return address dan membajak alur program. Ini adalah **buffer overflow** klasik yang akan dibahas di Bab 21.

Sebagai programmer C, kamu bertanggung jawab memastikan index berada dalam rentang `0` sampai `panjang - 1`. Tools seperti **AddressSanitizer** (`gcc -fsanitize=address`, Bab 20) bisa membantu mendeteksi out-of-bounds saat runtime, terutama saat belajar dan development.

Bayangkan array 5 elemen seperti loker bernomor 0 sampai 4. Mengakses `nilai[5]` berarti membuka area di sebelah loker yang bukan milik array itu. Kadang kosong, kadang berisi data penting, kadang menyebabkan program langsung gagal.

---

## 5.5 String: array karakter yang diakhiri nol

Sekarang kita masuk ke string. Hal pertama yang perlu jelas adalah bahwa **C tidak punya tipe `string` bawaan**. String di C adalah **array of `char`** dengan satu konvensi penting.

> **String di C adalah deretan karakter yang diakhiri karakter null (`'\0'`, nilainya 0). Karakter null ini menjadi penanda bahwa string berakhir.**

`'\0'` disebut **null terminator**. Ini berbeda dari karakter `'0'`, yang nilainya 48 dalam ASCII. `'\0'` benar-benar bernilai nol.

```c
char nama[] = "Budi";
```

Kelihatannya ada 4 karakter, tetapi di memori sebenarnya ada **5 byte**:

```
index:      0     1     2     3     4
          +-----+-----+-----+-----+-----+
isi:      | 'B' | 'u' | 'd' | 'i' |'\0' |
          +-----+-----+-----+-----+-----+
nilai:      66    117   100   105    0
```

Compiler otomatis menambahkan `'\0'` di akhir saat kamu memakai literal `"..."`. Karena itu `sizeof("Budi")` bernilai 5, bukan 4.

### Kenapa null terminator? (sejarah & konsekuensi)

C tidak menyimpan panjang string secara eksplisit. Jadi bagaimana `printf` atau `strlen` tahu di mana string berakhir? Mereka mulai dari karakter pertama, lalu berjalan maju sampai menemukan `'\0'`.

Desain ini hemat memori dan cocok dengan konteks era 1970-an, tetapi punya konsekuensi:

- Mencari panjang string adalah operasi **O(n)**, karena harus berjalan sampai menemukan null terminator. Bahasa lain sering menyimpan panjang string, sehingga panjang bisa dibaca O(1).
- Jika null terminator **hilang atau rusak**, fungsi string akan terus membaca memori sampai kebetulan menemukan byte 0. Hasilnya bisa sampah, data bocor, atau crash.

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    char nama[] = "Budi";
    printf("isi      : %s\n", nama);
    printf("strlen   : %zu\n", strlen(nama));   // 4  (TIDAK menghitung '\0')
    printf("sizeof   : %zu\n", sizeof(nama));   // 5  (TERMASUK '\0')
    return 0;
}
```

Perhatikan perbedaannya. **`strlen` menghitung jumlah karakter sebelum null terminator; `sizeof` pada array menghitung seluruh byte array, termasuk `'\0'`.** Ini sumber bug klasik.

### Mencetak string secara manual (agar paham `%s`)

Kode berikut menunjukkan ide di balik `printf("%s")`:

```c
#include <stdio.h>

int main(void) {
    char nama[] = "Budi";
    for (int i = 0; nama[i] != '\0'; i++) {   // berhenti saat ketemu null
        putchar(nama[i]);
    }
    putchar('\n');
    return 0;
}
```

Loop berhenti karena menemukan `'\0'`, bukan karena tahu bahwa panjang string adalah 4. Itulah pola dasar string C: berjalan sampai menemukan byte nol.

---

## 5.6 Membuat & memodifikasi string: dua cara yang berbeda

Dua baris berikut terlihat mirip, tetapi artinya sangat berbeda:

```c
char a[] = "Halo";    // (1) array di stack, isinya bisa diubah
char *b  = "Halo";    // (2) pointer ke string literal, jangan diubah
```

- **(1) `char a[]`** membuat array `char` di stack, lalu menyalin isi `"Halo"` ke dalamnya. `a` adalah memori milik array tersebut, sehingga kamu **boleh** memodifikasinya. Penulisan seperti `a[0] = 'h';` aman selama masih berada di dalam batas array.
- **(2) `char *b`** membuat pointer yang menunjuk ke **string literal**. String literal biasanya disimpan di region read-only. Mengubahnya dengan `b[0] = 'h';` adalah **undefined behavior** dan sering berakhir crash.

```c
char a[] = "Halo";
a[0] = 'h';        // OK -> "halo"

char *b = "Halo";
b[0] = 'h';        // BAHAYA: menulis ke memori read-only -> kemungkinan crash
```

Aturan praktisnya sederhana. Kalau kamu perlu string yang bisa diedit, pakai **array** (`char a[]`) atau alokasi heap di Bab 9. Jika menunjuk ke literal, pakai `const char *` agar compiler ikut mencegah penulisan yang tidak sengaja:

```c
const char *pesan = "Halo";   // const = janji tidak akan ditulis -> compiler menjaga
```

Detail pointer dan `const` akan dibahas di Bab 6 dan Bab 7. Untuk sekarang, cukup pahami bahwa `char a[] = "..."` dan `char *b = "..."` punya konsekuensi memori yang berbeda.

---

## 5.7 Fungsi-fungsi string standar (`<string.h>`)

Karena string di C adalah array `char`, operasi umum untuk string disediakan di `<string.h>`. Beberapa fungsi yang penting dikenali:

| Fungsi | Guna | Catatan bahaya |
|--------|------|----------------|
| `strlen(s)` | panjang string (tanpa `'\0'`) | s harus null-terminated |
| `strcpy(dst, src)` | salin string | **tak cek ukuran dst** -> overflow |
| `strncpy(dst, src, n)` | salin maks n byte | bisa tak menulis `'\0'`! |
| `strcat(dst, src)` | sambung src ke akhir dst | **tak cek ukuran** -> overflow |
| `strcmp(a, b)` | bandingkan (0 = sama) | **bukan** `==`! |
| `strchr(s, c)` | cari karakter c di s | |
| `memcpy(dst, src, n)` | salin n byte mentah | tak peduli `'\0'` |

Contoh:

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    char tujuan[20];
    strcpy(tujuan, "Halo, ");
    strcat(tujuan, "dunia");
    printf("%s\n", tujuan);                 // Halo, dunia

    printf("%d\n", strcmp("abc", "abc"));   // 0 (sama)
    printf("%d\n", strcmp("abc", "abd"));   // negatif (abc < abd)
    return 0;
}
```

> **Jangan bandingkan string dengan `==`.** `if (str1 == str2)` membandingkan alamat dua array atau pointer, bukan isi string-nya. Untuk membandingkan isi, pakai `strcmp`; hasil 0 berarti sama. Ini konsekuensi langsung dari fakta bahwa nama array berkaitan dengan alamat, yang kita bahas di Bagian 5.8.

### Bahaya `strcpy`/`strcat`: buffer overflow lagi

`strcpy(dst, src)` menyalin `src` ke `dst` **tanpa mengecek apakah `dst` cukup besar**. Jika `src` lebih panjang dari kapasitas `dst`, fungsi ini akan menulis melewati batas buffer. Itu buffer overflow, seperti yang dibahas di Bagian 5.4 dan akan diperdalam di Bab 21.

```c
char kecil[5];
strcpy(kecil, "ini string yang kepanjangan");   // bahaya: menulis jauh melewati 5 byte
```

Versi dengan `n`, seperti `strncpy`, `strncat`, dan `snprintf`, menerima batas ukuran dan bisa lebih aman. Namun beberapa di antaranya punya perilaku yang perlu dipahami. Misalnya, `strncpy` bisa tidak menambahkan `'\0'` jika sumbernya pas atau lebih panjang dari batas. Untuk membangun string dengan aman, `snprintf` sering menjadi pilihan yang lebih jelas:

```c
char buf[20];
snprintf(buf, sizeof(buf), "Halo, %s", "dunia");  // aman: dibatasi sizeof(buf), selalu null-terminated
```

Pelajaran utamanya jelas. **Di C, kamu bertanggung jawab atas ukuran buffer.** Tidak ada mekanisme otomatis yang memperbesar string saat ruangnya kurang.

---

## 5.8 Hubungan array & pointer (intip Bab 6)

Bagian ini menyiapkan Bab 6. Salah satu aturan penting dalam C adalah:

> **Dalam kebanyakan ekspresi, nama array "meluruh" (decay) menjadi pointer ke elemen pertamanya.**

Artinya, saat kamu menulis `nilai` tanpa index di banyak konteks, ia diperlakukan sebagai alamat elemen pertama, yaitu `&nilai[0]`.

```c
int nilai[5] = {80, 75, 90, 65, 88};
printf("%p\n", (void *)nilai);       // alamat elemen pertama
printf("%p\n", (void *)&nilai[0]);   // SAMA dengan di atas
```

Karena itu, saat array dikirim ke fungsi, yang dikirim sebenarnya hanya **alamat**, bukan salinan seluruh array:

```c
void cetak(int arr[], int n) {      // 'int arr[]' di sini sebenarnya 'int *arr'
    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);
}
```

Konsekuensinya perlu diingat:

1. Mengirim array ke fungsi itu **murah**, karena yang dikirim hanya alamat.
2. Fungsi **tidak tahu panjang array** hanya dari parameter `int arr[]`. `sizeof(arr)` di dalam fungsi memberi ukuran *pointer* (biasanya 8 byte), bukan ukuran array asli. Karena itu panjang array harus dikirim sebagai argumen terpisah, misalnya `int n`. Ini pola umum di C.
3. Karena fungsi menerima alamat, fungsi **bisa memodifikasi isi array asli** milik pemanggil. Ini berbeda dari pass-by-value variabel biasa di Bab 4. Mengubah `arr[0]` di dalam fungsi berarti mengubah memori array yang sama.

Kalau bagian ini belum sepenuhnya terasa jelas, tidak apa-apa. Bab 6 akan membahas pointer dari dasar, dan konsep ini akan muncul lagi dengan lebih lengkap.

---

## 5.9 Array multidimensi (singkat)

```c
int matriks[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};
printf("%d\n", matriks[1][2]);   // 6
```

Di memori, array 2D tetap disimpan **contiguous dan linier**. C memakai urutan **row-major**, artinya baris pertama disimpan dulu, lalu baris kedua:

```
memori: [1][2][3][4][5][6]
         <- baris 0 -><- baris 1 ->
```

`matriks[i][j]` diterjemahkan menjadi `*(alamat_awal + i*3 + j)`. Jadi array 2D tetap bisa dipahami sebagai array datar yang alamat elemennya dihitung dari baris dan kolom. Tidak ada yang istimewa di sini; tetap aritmetika alamat.

Angka `3` pada rumus itu berasal dari jumlah kolom. Untuk pindah dari baris 0 ke baris 1, alamat harus maju melewati 3 elemen terlebih dahulu. Setelah itu, `j` memilih posisi di dalam baris tersebut. Karena jumlah kolom menjadi bagian dari perhitungan alamat, array multidimensi di C tetap membutuhkan ukuran kolom yang jelas.

---

## 5.10 Rangkuman model mental

1. **Array adalah memori contiguous.** Elemen berderet rapat dengan ukuran seragam. Ini membuat akses O(1) dan cache-friendly.
2. **`arr[i]` sama dengan `*(arr + i)`**. Indexing adalah aritmetika alamat. Index berarti "berapa langkah dari awal", sehingga mulai dari 0.
3. **C tidak mengecek batas array.** Out-of-bounds bisa menyebabkan crash, korupsi diam-diam, atau celah keamanan. Kamu bertanggung jawab menjaga akses tetap di rentang `0..n-1`.
4. **String adalah array `char` yang diakhiri `'\0'`.** C tidak punya tipe string bawaan; panjang string dicari dengan berjalan sampai null terminator.
5. **`strlen` tidak menghitung null terminator; `sizeof` array menghitung seluruh byte array.**
6. `char a[] = "..."` bisa diubah, sedangkan `char *b = "..."` menunjuk ke literal yang tidak boleh diubah.
7. **Bandingkan string dengan `strcmp`, bukan `==`.** Hati-hati dengan `strcpy` dan `strcat`; untuk banyak kasus, `snprintf` lebih aman.
8. **Nama array decay menjadi pointer** ke elemen pertama. Akibatnya, fungsi tidak tahu panjang array kecuali panjangnya dikirim terpisah, dan fungsi bisa memodifikasi array asli.

---

## 5.11 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Buat `int arr[5]`, isi dengan loop, lalu cetak nilai **dan alamat** tiap elemen (`&arr[i]`). Berapa selisih alamat antar elemen? Cocokkah dengan `sizeof(int)`?
2. Buktikan `arr[2] == 2[arr]` dengan mencetak keduanya. Lalu jelaskan kenapa, memakai definisi `*(arr + i)`.
3. Tulis ulang `strlen` versimu sendiri: fungsi yang menghitung panjang string dengan berjalan sampai `'\0'`. Bandingkan hasilnya dengan `strlen` asli.
4. Sengaja akses `arr[10]` pada array berukuran 5, lalu jalankan. Apa yang terjadi? Lalu compile ulang dengan `gcc -fsanitize=address` dan jalankan lagi. Apa kata ASan?
5. Coba `char *b = "Halo"; b[0] = 'h';` dan jalankan. Apa yang terjadi? Lalu ganti menjadi `char a[] = "Halo"; a[0] = 'h';`. Kenapa yang ini aman?
6. Tulis program yang menyambung dua string ke buffer `char buf[10]` memakai `strcat`, dengan input yang terlalu panjang. Amati hasilnya. Lalu tulis ulang versi aman memakai `snprintf`.
7. Tulis fungsi `void dobel(int arr[], int n)` yang menggandakan tiap elemen. Buktikan array asli di `main` ikut berubah, lalu jelaskan kenapa dengan konsep decay ke pointer.

**Pertanyaan refleksi:**

1. Kenapa array contiguous membuat akses elemen O(1)? Apa hubungannya dengan cache CPU?
2. Jelaskan dengan kata-katamu sendiri kenapa index array mulai dari 0, dikaitkan dengan `*(arr + i)`.
3. Kenapa C tidak mengecek batas array? Apa tiga kemungkinan akibat akses out-of-bounds?
4. Apa peran `'\0'`? Apa yang terjadi kalau null terminator hilang dari sebuah "string"?
5. Kenapa `sizeof` dan `strlen` memberi angka berbeda untuk string yang sama?
6. Kenapa `str1 == str2` bukan cara membandingkan isi string? Apa yang sebenarnya dibandingkan?
7. Saat array dikirim ke fungsi, kenapa fungsi kehilangan informasi panjangnya? Apa konsekuensinya bagi desain fungsi?

---

Kamu sekarang sudah beberapa kali bertemu konsep alamat, array decay, dan bentuk `*(arr + i)`. Di Bab 6, kita masuk langsung ke konsep yang menjadi pusat banyak hal di C: **pointers**. Kita akan membahas apa itu alamat, arti operator `*` dan `&`, kenapa pointer memungkinkan fungsi mengubah variabel asli, dan bagaimana pointer membuat C sangat kuat sekaligus rawan bug.
