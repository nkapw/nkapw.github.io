---
title: "Bab 21 - Undefined Behavior dan Keamanan"
description: "Dalam C, kesalahan program tidak selalu menghasilkan pesan error yang jelas. Kesalahan tertentu dapat membuat program tetap berjalan, menghasilkan nilai yang salah,..."
tags: [c, systems-programming]
order: 21
updated: 2026-07-02
---
Dalam C, kesalahan program tidak selalu menghasilkan pesan error yang jelas. Kesalahan tertentu dapat membuat program tetap berjalan, menghasilkan nilai yang salah, berhenti tiba-tiba, atau membuka celah keamanan. Salah satu sumber utama perilaku seperti ini adalah **undefined behavior**.

Sepanjang buku ini, undefined behavior sudah beberapa kali muncul. Bab 2 membahas overflow pada signed integer. Bab 5 membahas akses array di luar batas. Bab 6 dan Bab 9 membahas pointer `NULL`, dangling pointer, dan use-after-free. Bab ini menyatukan semuanya dalam konteks keamanan program.

Bab ini juga menjelaskan hubungan antara buffer overflow, layout stack, return address, dan mitigasi modern. Fokusnya adalah pemahaman defensif agar kamu dapat menulis kode C yang lebih aman dan memahami alasan di balik berbagai aturan keamanan.

> **Catatan etika dan tujuan**
>
> Materi ini ditujukan untuk memahami cara kerja kerentanan agar kamu mampu mencegahnya. Pembahasan berhenti pada level konsep, analisis, dan praktik pengamanan. Bab ini bukan panduan eksploitasi praktis.

---

## 21.1 Apa Itu Undefined Behavior

**Undefined behavior** adalah kondisi ketika standar bahasa C tidak mendefinisikan apa yang harus terjadi. Jika program memicu undefined behavior, compiler dan runtime tidak wajib memberikan hasil tertentu.

Undefined behavior berbeda dari error biasa. Program yang mengalami undefined behavior dapat berhenti, menghasilkan nilai yang salah, tampak berjalan normal, atau berubah perilakunya ketika compiler, opsi optimasi, platform, atau versi library berubah.

C memiliki undefined behavior karena bahasa ini dirancang untuk efisiensi dan kedekatan dengan mesin. Standar C tidak memaksa compiler untuk menangani semua kondisi yang tidak valid, seperti akses memori ilegal atau overflow tertentu. Dengan begitu, compiler dapat menghasilkan kode yang cepat. Konsekuensinya, tanggung jawab untuk menjaga validitas program berada pada programmer.

Contoh undefined behavior yang sudah dibahas sebelumnya antara lain sebagai berikut.

- **Signed integer overflow** seperti `INT_MAX + 1`.
- **Akses array di luar batas** seperti `arr[100]` pada array berisi 5 elemen.
- **Dereference pointer `NULL`, dangling pointer, atau wild pointer**.
- **Use-after-free dan double-free**.
- **Membaca variabel yang belum diinisialisasi**.
- **Data race** pada program multithread.

---

## 21.2 Mengapa Undefined Behavior Sangat Berbahaya

Undefined behavior sering disalahpahami sebagai kondisi yang hanya mungkin menyebabkan crash. Masalahnya lebih serius karena compiler boleh mengasumsikan bahwa undefined behavior tidak pernah terjadi.

Perhatikan contoh berikut.

```c
int cek(int *p) {
    int x = *p;
    if (p == NULL)
        return -1;
    return x;
}
```

Kode tersebut melakukan dereference terhadap `p` sebelum memeriksa apakah `p == NULL`. Jika `p` bernilai `NULL`, ekspresi `*p` sudah memicu undefined behavior. Karena standar C memperbolehkan compiler mengasumsikan undefined behavior tidak terjadi, compiler dapat menyimpulkan bahwa `p` pasti bukan `NULL` setelah baris `int x = *p;`.

Akibatnya, pemeriksaan `if (p == NULL)` dapat dianggap tidak perlu dan dihapus oleh optimasi. Hasil seperti ini bukan bug compiler. Ini adalah konsekuensi dari kontrak bahasa C yang menyatakan bahwa program valid tidak boleh memicu undefined behavior.

Pelajaran pentingnya adalah undefined behavior tidak hanya merusak satu baris kode. Efeknya dapat memengaruhi optimasi, mengubah alur program, menghapus pemeriksaan keamanan, dan menghasilkan perilaku yang berbeda pada konfigurasi build yang berbeda.

---

## 21.3 Buffer Overflow

Buffer overflow adalah salah satu konsekuensi paling penting dari akses memori di luar batas. Di Bab 5, kita membahas bahwa C tidak memeriksa batas array secara otomatis. Di Bab 4, kita melihat bahwa stack frame menyimpan variabel lokal dan return address. Dua konsep ini bertemu pada stack buffer overflow.

### Array di Stack dan Return Address

Saat sebuah fungsi dipanggil, stack frame berisi data yang dibutuhkan fungsi tersebut, termasuk variabel lokal dan informasi untuk kembali ke pemanggil. Salah satu informasi penting itu adalah return address, yaitu alamat instruksi yang akan dieksekusi setelah fungsi selesai.

Perhatikan kode berikut.

```c
#include <stdio.h>
#include <string.h>

void rentan(const char *input) {
    char buf[8];
    strcpy(buf, input);
    printf("%s\n", buf);
}

int main(int argc, char **argv) {
    rentan(argv[1]);
    return 0;
}
```

Fungsi `strcpy` menyalin string dari `input` ke `buf` tanpa mengetahui ukuran `buf`. Jika `input` lebih panjang dari kapasitas `buf`, penulisan akan melewati batas array. Data setelah `buf` di stack dapat ikut tertimpa.

Skema stack frame dapat digambarkan seperti ini.

```text
alamat rendah
   +------------------+
   |  buf[0..7]       |
   +------------------+
   |  saved rbp       |
   +------------------+
   |  return address  |
   +------------------+
alamat tinggi
```

Pada arsitektur dan ABI tertentu, penulisan yang melewati `buf` dapat mencapai saved frame pointer dan return address. Detail layout stack bergantung pada compiler, platform, opsi optimasi, dan mitigasi yang aktif, tetapi prinsip utamanya tetap sama. Menulis di luar batas array berarti menulis ke memori yang bukan milik array tersebut.

### Dampak terhadap Alur Eksekusi

Jika return address tertimpa, fungsi dapat kembali ke alamat yang salah. Dalam skenario eksploitasi, penyerang berusaha mengendalikan nilai tersebut agar eksekusi program berpindah ke lokasi yang mereka pilih.

Inilah inti dari stack buffer overflow. Bug yang awalnya tampak seperti kesalahan penyalinan string dapat berubah menjadi pengambilalihan alur eksekusi. Karena proses berjalan dengan hak akses tertentu, pengambilalihan proses dapat berdampak serius pada keamanan sistem.

Hal ini menjelaskan mengapa fungsi seperti `strcpy`, `strcat`, dan `sprintf` harus dihindari pada input yang tidak sepenuhnya terkendali. Masalahnya bukan hanya kemungkinan crash, tetapi juga kemungkinan rusaknya struktur memori yang menentukan alur program.

---

## 21.4 Pertahanan terhadap Buffer Overflow

Pertahanan terhadap buffer overflow harus dilakukan berlapis. Lapisan paling penting tetap berada pada kode sumber. Mitigasi compiler, sistem operasi, dan hardware membantu mengurangi risiko eksploitasi, tetapi tidak menggantikan kewajiban menulis kode yang benar.

### Lapis 1 - Menulis Kode yang Benar

Gunakan fungsi yang menerima batas ukuran buffer. Hindari penyalinan tanpa batas.

```c
char buf[8];
snprintf(buf, sizeof(buf), "%s", input);
```

Praktik yang perlu dibiasakan adalah sebagai berikut.

- Gunakan `snprintf` daripada `sprintf`.
- Gunakan `fgets(buf, sizeof(buf), stdin)` daripada `gets`.
- Pastikan setiap operasi penyalinan mengetahui ukuran tujuan.
- Validasi input dari luar, termasuk panjang, rentang nilai, dan format.
- Anggap semua input eksternal sebagai data yang tidak terpercaya.

Contoh perbandingan sederhana.

```c
char buf[8];

strcpy(buf, input);
snprintf(buf, sizeof(buf), "%s", input);
```

Baris pertama rentan karena tidak membatasi ukuran penyalinan. Baris kedua lebih aman karena ukuran `buf` diberikan secara eksplisit.

### Lapis 2 - Mitigasi Compiler dan Sistem Operasi

Sistem modern menyediakan beberapa mitigasi untuk mengurangi peluang eksploitasi.

- **Stack canary** menambahkan nilai penjaga di stack sebelum return address. Jika overflow menimpa nilai tersebut, program dapat dihentikan sebelum `ret` dijalankan.
- **ASLR** atau Address Space Layout Randomization mengacak alamat stack, heap, dan library setiap kali program berjalan. Ini membuat alamat target lebih sulit ditebak.
- **NX bit, DEP, dan W^X** mencegah area memori tertentu dieksekusi sebagai kode. Stack dan heap dapat ditulis, tetapi tidak dapat langsung dijalankan sebagai instruksi.

Mitigasi tersebut penting, tetapi tidak menjadikan bug aman. Mitigasi bertugas mengurangi peluang eksploitasi. Kode yang benar tetap menjadi pertahanan utama.

### Lapis 3 - Tooling saat Development

Tool seperti AddressSanitizer membantu menemukan overflow selama development.

```sh
cc -Wall -Wextra -fsanitize=address -g program.c -o program
```

Dengan sanitizer, banyak bug memori dapat terdeteksi lebih awal sebelum kode masuk ke lingkungan produksi.

---

## 21.5 Integer Overflow dan Keamanan Memori

Overflow integer sering menjadi akar dari kerentanan memori. Signed integer overflow adalah undefined behavior, sedangkan overflow pada unsigned integer menggunakan wrap around yang terdefinisi oleh standar. Keduanya tetap dapat berbahaya jika digunakan dalam perhitungan ukuran buffer atau alokasi.

Perhatikan contoh berikut.

```c
void salin(char *src, size_t n) {
    char *buf = malloc(n + 1);
    memcpy(buf, src, n);
    buf[n] = '\0';
}
```

Jika `n` bernilai `SIZE_MAX`, ekspresi `n + 1` pada tipe `size_t` akan menjadi 0 karena wrap around. Pemanggilan `malloc(0)` tidak mengalokasikan buffer sebesar `n + 1`. Setelah itu, `memcpy(buf, src, n)` tetap mencoba menyalin `n` byte. Hasilnya adalah penulisan jauh di luar kapasitas buffer.

Bug ini menunjukkan rantai masalah yang umum terjadi. Perhitungan ukuran yang salah dapat menghasilkan alokasi yang terlalu kecil, lalu operasi memori berikutnya memicu overflow.

Untuk mencegahnya, periksa overflow sebelum melakukan aritmetika ukuran.

```c
if (n == SIZE_MAX) {
    return;
}

char *buf = malloc(n + 1);
```

Untuk alokasi array, gunakan pemeriksaan yang sesuai sebelum menghitung `count * sizeof(T)`. Fungsi seperti `calloc` pada banyak implementasi melakukan pemeriksaan overflow untuk perkalian ukuran, tetapi programmer tetap harus memahami batas dan kontrak fungsi yang digunakan.

---

## 21.6 Kerentanan Memori Klasik di C

Berikut adalah beberapa kelas kerentanan yang sering muncul pada program C.

| Kerentanan | Akar Masalah | Dampak Umum |
|------------|--------------|-------------|
| **Stack buffer overflow** | Penulisan di luar batas array stack | Kerusakan stack dan potensi pengambilalihan alur eksekusi |
| **Heap buffer overflow** | Penulisan di luar batas alokasi heap | Kerusakan data heap dan metadata allocator |
| **Use-after-free** | Pointer masih digunakan setelah `free` | Akses ke memori yang sudah dapat dipakai ulang |
| **Double free** | Memori yang sama dibebaskan lebih dari sekali | Kerusakan struktur allocator |
| **Integer overflow** | Perhitungan ukuran melewati batas tipe | Alokasi terlalu kecil atau logika validasi salah |
| **Format string bug** | Data eksternal digunakan sebagai format `printf` | Pembacaan atau penulisan memori yang tidak semestinya |
| **Uninitialized read** | Membaca nilai yang belum diinisialisasi | Kebocoran data lama atau perilaku tidak terdefinisi |

Format string bug perlu mendapat perhatian khusus. Jangan menulis kode seperti ini.

```c
printf(input_user);
```

Gunakan string format literal yang kamu kendalikan.

```c
printf("%s", input_user);
```

Jika input berisi `%x`, `%s`, atau `%n`, `printf(input_user)` akan menafsirkannya sebagai format specifier. Ini dapat menyebabkan pembacaan memori, crash, atau pada kondisi tertentu penulisan memori.

Sebagian besar kerentanan di atas muncul karena C memberi akses langsung ke memori dan tidak melakukan pemeriksaan otomatis pada banyak operasi. Keunggulan ini membuat C sangat efisien, tetapi juga membuat disiplin programmer menjadi bagian penting dari keamanan.

---

## 21.7 Prinsip Menulis C yang Aman

Praktik defensif berikut perlu menjadi kebiasaan saat menulis C.

1. Hindari undefined behavior. Jangan mengandalkan perilaku yang hanya tampak berjalan pada satu compiler atau satu level optimasi.
2. Batasi semua operasi buffer. Gunakan `snprintf`, `fgets`, dan fungsi lain yang menerima ukuran tujuan.
3. Validasi semua input eksternal. Periksa panjang, rentang nilai, encoding, dan format.
4. Periksa overflow sebelum menghitung ukuran alokasi.
5. Kelola memori dengan disiplin. Setiap `malloc` harus memiliki kepemilikan yang jelas dan setiap `free` hanya dilakukan sekali.
6. Gunakan string format literal untuk keluarga fungsi `printf`.
7. Aktifkan warning compiler seperti `-Wall` dan `-Wextra`.
8. Gunakan sanitizer saat development, terutama AddressSanitizer dan UndefinedBehaviorSanitizer.
9. Pertahankan mitigasi default seperti stack protector, ASLR, dan NX.

Keamanan pada C bukan fitur yang muncul otomatis. Keamanan dibangun dari validasi, pembatasan ukuran, kepemilikan memori yang jelas, dan pengujian yang cukup.

---

## 21.8 Rangkuman Model Mental

1. Undefined behavior adalah kondisi yang tidak didefinisikan oleh standar C. Compiler boleh mengasumsikan kondisi tersebut tidak terjadi.
2. Efek undefined behavior dapat menyebar ke optimasi dan mengubah alur program, termasuk menghapus pemeriksaan yang terlihat penting di kode sumber.
3. Buffer overflow terjadi ketika program menulis melewati kapasitas buffer. Pada stack, kerusakan ini dapat mencapai data penting seperti saved frame pointer dan return address.
4. Stack buffer overflow dapat mengubah alur eksekusi jika data kontrol tertimpa.
5. Pertahanan utama adalah kode yang benar. Mitigasi seperti stack canary, ASLR, dan NX membantu, tetapi tidak menggantikan validasi dan pembatasan ukuran.
6. Integer overflow dapat menjadi awal dari bug memori, terutama saat digunakan untuk menghitung ukuran alokasi.
7. Format string harus selalu berupa literal yang dikendalikan programmer. Data pengguna tidak boleh digunakan langsung sebagai format.
8. C memberi kendali besar atas memori. Kendali tersebut harus disertai disiplin yang konsisten.

---

## 21.9 Latihan dan Pertanyaan Refleksi

Lakukan eksperimen berikut hanya pada program milik sendiri dan pada lingkungan yang kamu kendalikan. Tujuannya adalah memahami bug dan mitigasi dari sisi defensif.

### Latihan Praktik

1. Tulis program yang menghitung `INT_MAX + 1`. Compile dengan `-O0`, lalu dengan `-O2`, dan bandingkan hasilnya. Jalankan juga dengan `-fsanitize=undefined`.
2. Tulis fungsi `cek` dari bagian 21.2. Compile dengan `-O2 -Wall`, lalu amati apakah pemeriksaan `NULL` masih terlihat pada assembly atau perilaku program.
3. Buat program kecil dengan `char buf[8]; strcpy(buf, argv[1]);`. Jalankan dengan input pendek dan input sangat panjang. Ulangi dengan `-fsanitize=address`.
4. Perbaiki program tersebut menggunakan `snprintf(buf, sizeof(buf), "%s", argv[1])`. Jalankan kembali dengan input panjang dan amati hasil pemotongannya.
5. Cetak alamat variabel lokal menggunakan operator `&`, lalu jalankan program beberapa kali. Amati apakah alamat berubah karena ASLR.
6. Hitung `n + 1` ketika `n = SIZE_MAX`. Jelaskan mengapa hasilnya berbahaya jika digunakan untuk `malloc(n + 1)`.
7. Bandingkan `printf(s)` dan `printf("%s", s)` ketika `s` berisi `"%x %x %x"`. Gunakan eksperimen ini hanya untuk memahami risiko format string.

### Pertanyaan Refleksi

1. Apa perbedaan undefined behavior dengan error biasa?
2. Mengapa compiler boleh mengasumsikan undefined behavior tidak terjadi?
3. Bagaimana undefined behavior dapat membuat pemeriksaan keamanan dihapus oleh optimasi?
4. Bagaimana stack buffer overflow dapat memengaruhi return address?
5. Mengapa `strcpy` berbahaya pada input yang panjangnya tidak dibatasi?
6. Apa peran `snprintf` dalam membatasi penulisan ke buffer?
7. Mengapa mitigasi seperti stack canary, ASLR, dan NX tetap tidak cukup tanpa kode yang benar?
8. Bagaimana integer overflow dapat menyebabkan alokasi buffer yang terlalu kecil?
9. Mengapa `printf(input_user)` berbahaya?

---

Bab ini menutup pembahasan tentang risiko utama dalam pemrograman C modern. Bab berikutnya membahas arah belajar setelah menguasai dasar-dasar C, termasuk sistem operasi, kernel, embedded, dan bare-metal programming.

