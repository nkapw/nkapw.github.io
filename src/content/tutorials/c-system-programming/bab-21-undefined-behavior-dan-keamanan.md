---
title: "Bab 21 — Undefined Behavior & Keamanan"
description: "Sepanjang buku ini kita beberapa kali menyebut undefined behavior (UB). Kita melihatnya di Bab 2 (signed overflow), Bab 5 (out-of-bounds), Bab 6 (dereference..."
tags: [c, system-programming]
order: 21
updated: 2026-06-20
---

> "Di banyak bahasa, kesalahan tertentu menghasilkan error yang jelas. Di C, sebagian kesalahan masuk ke wilayah undefined behavior: standar tidak lagi memberi jaminan tentang apa yang terjadi. Program bisa tampak berjalan, crash, menghasilkan data salah, atau membuka celah keamanan."

Sepanjang buku ini kita beberapa kali menyebut **undefined behavior (UB)**. Kita melihatnya di Bab 2 (signed overflow), Bab 5 (out-of-bounds), Bab 6 (dereference NULL/dangling pointer), dan Bab 9 (use-after-free). Sekarang kita bahas langsung: apa sebenarnya UB, kenapa ia berbahaya, dan bagaimana bug C bisa berubah menjadi celah keamanan. Bab ini juga menghubungkan kembali pembahasan Bab 4 dan Bab 5 tentang buffer overflow.

> **Catatan etika & tujuan:** bab ini menjelaskan *bagaimana* kelas serangan tertentu bekerja agar kamu bisa menulis kode yang lebih aman dan memahami kenapa mitigasi ada. Pembahasannya bersifat defensif dan edukatif, bukan resep eksploitasi praktis.

---

## 21.1 Apa itu undefined behavior?

> **Undefined behavior adalah situasi di mana standar bahasa C secara sengaja tidak mendefinisikan apa yang harus terjadi. Compiler bebas membuat asumsi berdasarkan fakta bahwa UB tidak boleh terjadi di program yang valid.**

Ini berbeda dari "error" biasa. Kalau UB terjadi, tidak ada jaminan apa pun: program bisa crash, menghasilkan nilai ngawur, tampak benar, atau berperilaku berbeda pada compiler, level optimasi, atau platform yang berbeda. Standar C tidak menentukan hasilnya.

Kenapa C punya UB sama sekali? Salah satu alasannya adalah performa dan kesederhanaan implementasi. Dengan tidak mewajibkan compiler mengecek atau menangani kasus seperti overflow dan akses ilegal, C bisa menghasilkan kode yang sangat efisien dan dekat dengan hardware. Harganya adalah tanggung jawab besar di sisi programmer. Ini trade-off inti C yang sudah kita tekankan sejak Bab 1.

Contoh UB yang sudah kita temui:
- **Signed integer overflow** (Bab 2) — `INT_MAX + 1`.
- **Out-of-bounds array access** (Bab 5) — `arr[100]` pada array 5 elemen.
- **Dereference NULL/dangling/wild pointer** (Bab 6, 9).
- **Use-after-free & double-free** (Bab 9).
- **Membaca variabel tak-terinisialisasi**.
- **Data race** (Bab 17).

---

## 21.2 Kenapa UB lebih berbahaya dari yang kamu kira

Sering kali UB dibayangkan hanya sebagai "mungkin crash". Masalahnya lebih luas dari itu, karena **compiler boleh berasumsi UB tidak terjadi dan mengoptimasi berdasarkan asumsi tersebut.**

Contoh klasiknya:

```c
int cek(int *p) {
    int x = *p;            // dereference p
    if (p == NULL)         // cek NULL... SETELAH dereference
        return -1;
    return x;
}
```

Compiler dapat bernalar seperti ini: baris `*p` men-dereference `p`. Kalau `p` adalah NULL, itu UB. Karena compiler boleh berasumsi UB tidak terjadi, maka setelah dereference tersebut `p` dianggap pasti bukan NULL. Akibatnya, `if (p == NULL)` bisa dianggap selalu false dan pengecekan itu dapat dihapus. Program lalu crash pada kasus yang justru ingin kamu lindungi. Ini bukan bug compiler; ini konsekuensi dari aturan UB.

> **Pelajaran:** UB bukan hanya "perilaku saat itu salah". Efeknya bisa merembet ke optimasi compiler: kode dapat dihapus, alur dapat berubah, dan hasilnya bisa tampak tidak masuk akal tetapi tetap sah menurut standar. Karena itu, efek UB bisa muncul jauh dari titik kesalahan dan berubah antar versi compiler. Program yang "kelihatan jalan" hari ini belum tentu benar.

Cara membayangkannya: kode C yang valid adalah kontrak antara programmer dan compiler. Jika program melanggar kontrak lewat UB, compiler tetap boleh memakai asumsi bahwa kontrak itu tidak dilanggar. Optimasi yang dihasilkan bisa mengejutkan, tetapi berasal dari premis yang menurut standar dianggap sah.

---

## 21.3 Buffer overflow: membayar janji Bab 4 & 5

Bagian ini menggabungkan beberapa konsep penting. Di Bab 5 kita membahas bahwa out-of-bounds bisa menimpa data lain. Di Bab 4 kita membahas bahwa stack frame menyimpan return address. Buffer overflow di stack menghubungkan keduanya.

### Set-up: array di stack & return address

Ingat Bab 4: saat fungsi dipanggil, stack frame-nya berisi variabel lokal **dan** return address (alamat untuk kembali ke pemanggil). Stack tumbuh ke bawah, dan variabel lokal serta return address berada dalam area stack frame yang berdekatan.

Sekarang lihat kode rentan (pola yang dulu sangat umum):

```c
#include <stdio.h>
#include <string.h>

void rentan(const char *input) {
    char buf[8];               // buffer 8 byte di STACK
    strcpy(buf, input);        // BAHAYA: strcpy tak cek ukuran (Bab 5!)
    printf("%s\n", buf);
}

int main(int argc, char **argv) {
    rentan(argv[1]);           // input dari user/penyerang
    return 0;
}
```

`strcpy` (Bab 5: tidak mengecek ukuran destination) menyalin `input` ke `buf` tanpa peduli `buf` hanya muat 8 byte. Kalau `input` lebih panjang dari 8 byte, `strcpy` terus menulis **melewati** `buf`, menimpa apa pun yang ada setelahnya di stack, termasuk return address.

```
Stack frame 'rentan' (skema, ingat Bab 4):

alamat rendah
   +------------------+
   |  buf[0..7]       |  <- 8 byte buffer
   +------------------+
   |  (saved rbp)     |
   +------------------+
   |  RETURN ADDRESS  |  <- alamat kembali ke main!
   +------------------+
alamat tinggi

strcpy menulis dari buf ke ATAS (alamat naik). Input > 8 byte:
buf terisi, lalu LUBER ke saved rbp, lalu ke RETURN ADDRESS.
```

### Apa yang terjadi: membajak alur

Kalau input dibuat cukup panjang untuk **menimpa return address** dengan alamat tertentu, maka saat `rentan` selesai dan menjalankan `ret` (ingat Bab 4: `ret` = pop return address lalu lompat ke sana), CPU akan melompat ke alamat tersebut, bukan kembali ke `main`. Pada level konsep, inilah cara alur eksekusi program bisa dibajak.

Inilah **stack buffer overflow**, salah satu kelas kerentanan penting dalam sejarah keamanan komputer. Dengan teknik lanjutan, bug seperti ini dapat dipakai untuk mengarahkan eksekusi ke alur yang tidak dimaksudkan, mengambil alih proses, dan dalam kondisi tertentu berpengaruh ke sistem sesuai hak akses proses tersebut.

Sekarang alasan peringatan Bab 5 lebih jelas: "C tidak cek batas array", "`strcpy`/`strcat` berbahaya", dan "pakai `snprintf` atau fungsi berbatas ukuran" bukan sekadar soal crash. Ini soal menjaga agar data dari luar tidak bisa merusak state program dan mengubah alur eksekusinya.

Analogi singkatnya: `buf` seperti kotak surat berukuran tetap, dan di dekatnya ada instruksi "setelah selesai, kembali ke alamat X" (return address). Penyalinan tanpa batas seperti `strcpy` memaksa data sepanjang apa pun masuk ke kotak itu. Jika data terlalu panjang, ia meluber dan bisa menimpa instruksi kembali tersebut. CPU kemudian mengikuti alamat yang sudah rusak itu.

---

## 21.4 Pertahanan terhadap buffer overflow

Ada beberapa lapisan pertahanan, mulai dari kode, compiler, OS, sampai hardware.

### Lapis 1: tulis kode yang benar (paling penting)

- **Selalu batasi ukuran.** Pakai `snprintf` bukan `sprintf`, `strncpy`/`strlcpy` bukan `strcpy`, `fgets(buf, sizeof(buf), ...)` bukan `gets` (Bab 5 dan 12). Selalu sertakan ukuran buffer.
- **Validasi semua input** dari luar (panjang, rentang, format). Jangan pernah percaya input.
- **Pikirkan ukuran buffer** di setiap penyalinan. Ini disiplin harian C.

```c
// RENTAN:                    // AMAN:
char buf[8];                  char buf[8];
strcpy(buf, input);           snprintf(buf, sizeof(buf), "%s", input);
```

### Lapis 2: mitigasi compiler & OS (otomatis, tapi bukan jaminan)

Sistem modern menambahkan lapisan pertahanan **otomatis**. Memahaminya membantu melihat bagaimana compiler, OS, dan hardware bekerja sama.

- **Stack canary** (`-fstack-protector`, default di banyak distro) — compiler menyisipkan nilai "penjaga" (canary) tepat sebelum return address. Sebelum `ret`, ia mengecek apakah canary masih utuh; kalau tertimpa oleh overflow, program dihentikan. Namanya berasal dari analogi "kenari di tambang batu bara": perubahan pada canary menjadi tanda bahaya.
- **ASLR (Address Space Layout Randomization)** — ingat Bab 2, kenapa alamat variabel berubah tiap run? Inilah alasannya: OS mengacak alamat stack/heap/library tiap eksekusi, sehingga penyerang sulit menebak alamat target. Janji Bab 2 dibayar di sini.
- **NX bit / DEP (W^X)** — menandai region memori sebagai "writable XOR executable": stack/heap bisa ditulis tetapi **tidak bisa dieksekusi**. Jadi penyerang tidak bisa sekadar menulis kode ke stack lalu menjalankannya. Teknik serangan dan pertahanan terus berkembang, tetapi prinsip mitigasi ini tetap penting.

> Mitigasi ini sangat membantu, tetapi **bukan pengganti kode yang benar**. Mereka mempersulit eksploitasi, bukan membuat bug menjadi aman. Pertahanan terbaik tetap menghindari bug sejak awal.

### Lapis 3: tools (Bab 20)

AddressSanitizer (`-fsanitize=address`) menangkap overflow saat development — sebelum kode sampai ke produksi. Inilah kenapa Bab 20 menekankan sanitizer.

---

## 21.5 Integer overflow & masalahnya (Bab 2 menagih lagi)

Ingat signed overflow = UB (Bab 2)? Selain UB itu sendiri, integer overflow sering menjadi **akar** kerentanan memori. Pola klasiknya seperti ini:

```c
void salin(char *src, size_t n) {
    char *buf = malloc(n + 1);     // alokasi n+1 byte
    memcpy(buf, src, n);
    buf[n] = '\0';
}
```

Kalau `n` adalah `SIZE_MAX` (nilai unsigned terbesar), maka `n + 1` **overflow ke 0** (wrap around, Bab 2). `malloc(0)` mengembalikan buffer sangat kecil (atau NULL), lalu `memcpy(buf, src, n)` menyalin jumlah byte yang sangat besar ke buffer kecil -> **heap buffer overflow**. Bug integer dapat berubah menjadi bug memori, lalu menjadi celah keamanan.

Pelajaran: **periksa overflow sebelum aritmetika ukuran**, terutama untuk perhitungan ukuran alokasi (ingat juga peringatan `n * sizeof(int)` di Bab 9). Gunakan `calloc` (yang mengecek overflow perkalian) atau periksa manual. UBSan (Bab 20) menangkap signed overflow saat runtime.

---

## 21.6 Daftar kerentanan memori klasik di C

Untuk melengkapi peta mental, berikut kelas-kelas bug C yang sering menjadi celah keamanan. Sebagian besar sudah kita sentuh di bab-bab sebelumnya.

| Kerentanan | Akar (bab) | Akibat |
|------------|-----------|--------|
| **Stack buffer overflow** | out-of-bounds tulis (Bab 5) | bajak return address |
| **Heap buffer overflow** | out-of-bounds di heap (Bab 9) | rusak metadata allocator → bajak |
| **Use-after-free** | dangling pointer (Bab 9) | akses memori yang sudah dipakai ulang |
| **Double free** | (Bab 9) | rusak struktur allocator |
| **Integer overflow** | (Bab 2) | sering jadi akar overflow memori |
| **Format string** | `printf(input)` user | baca/tulis memori sembarang |
| **Uninitialized read** | (Bab 9) | bocor data lama / perilaku tak tentu |

> **Format string bug** (yang belum kita bahas): jangan pernah menulis `printf(input_user)`. Selalu gunakan `printf("%s", input_user)`. Kalau input berisi `%x`/`%n`, `printf` akan menafsirkannya sebagai format specifier dan dapat membaca/menulis memori. Aturannya: string format harus selalu literal yang kamu kendalikan, bukan data dari luar.

Mayoritas kelas ini adalah konsekuensi langsung dari model C: bahasa memberi kontrol besar kepada programmer dan melakukan sedikit pengecekan otomatis. Bahasa modern seperti Rust lahir sebagian untuk menutup celah-celah ini dengan jaminan di compile-time. Namun memahami C tetap penting untuk mengerti kenapa celah itu ada.

---

## 21.7 Prinsip menulis C yang aman

Rangkuman praktik defensif (menyatukan disiplin sepanjang buku):

1. **Jangan picu UB.** Kenali daftarnya (Section 21.1). Saat ragu, periksa standar atau gunakan tools. UB yang "kelihatan jalan" bukan berarti benar.
2. **Selalu batasi ukuran buffer.** `snprintf`, `fgets`, fungsi ber-`n`. Tak ada penyalinan tanpa batas.
3. **Validasi input.** Panjang, rentang, format. Input eksternal tidak boleh dipercaya begitu saja.
4. **Periksa overflow ukuran** sebelum alokasi/aritmetika size.
5. **Kelola memori dengan disiplin** (Bab 9): satu malloc-satu free, `p=NULL` setelah free, cek NULL.
6. **String format selalu literal.** Jangan `printf(input)`.
7. **Pakai tools** (Bab 20): `-Wall -Wextra -fsanitize=address,undefined` saat development; valgrind.
8. **Aktifkan mitigasi** (stack canary, ASLR, NX — biasanya default; jangan matikan tanpa alasan).

Prinsip payungnya: **C memberi kebebasan dan tanggung jawab besar. Keamanan bukan fitur yang otomatis menyala; ia hasil dari disiplin di setiap baris.**

---

## 21.8 Rangkuman model mental

1. **Undefined behavior** = standar C sengaja tidak mendefinisikan hasilnya; compiler boleh **berasumsi UB tidak terjadi** dan mengoptimasi berdasarkan asumsi itu, misalnya menghapus cek NULL. Efeknya bisa muncul jauh dari titik UB dan berubah antar compiler. Ada demi performa; harganya tanggung jawab programmer.
2. **Buffer overflow** (menghubungkan Bab 4 dan 5): menulis melewati buffer di stack bisa menimpa **return address** (Bab 4). Saat `ret`, CPU dapat lompat ke alamat yang sudah rusak atau dikendalikan input. Akar masalahnya: C tidak cek batas dan fungsi seperti `strcpy` tidak membatasi ukuran.
3. **Pertahanan berlapis:** kode benar (batasi ukuran, validasi input; paling penting) -> mitigasi otomatis (stack canary, **ASLR** dari Bab 2, NX bit) -> tools (ASan).
4. **Integer overflow** (Bab 2) sering jadi akar overflow memori (mis. `malloc(n+1)` yang wrap ke 0). Periksa overflow sebelum aritmetika ukuran.
5. Kelas kerentanan klasik: stack/heap overflow, use-after-free, double-free, integer overflow, **format string** (jangan `printf(input)`), uninitialized read. Semuanya terkait dengan minimnya pengecekan otomatis di C.
6. **Keamanan = disiplin di tiap baris**, bukan fitur otomatis. Mitigasi mempersulit eksploitasi, tetapi tidak menggantikan kode yang benar.

---

## 21.9 Latihan & Pertanyaan Refleksi

> Lakukan semua eksperimen ini **hanya pada programmu sendiri, di mesinmu sendiri**, untuk belajar. Konteksnya edukatif dan defensif.

**Latihan praktik:**

1. Demonstrasikan UB "kelihatan jalan tapi tak menjamin": tulis program dengan signed overflow (`INT_MAX + 1`). Compile `-O0` lalu `-O2`, bandingkan hasil. Lalu jalankan dengan `-fsanitize=undefined` — apa yang UBSan laporkan?
2. Demonstrasikan compiler menghapus cek karena UB: tulis fungsi `cek` dari Section 21.2. Compile dengan `-O2 -Wall`. Periksa apakah cek NULL "hilang" (lihat assembly dengan `objdump -d` atau amati perilakunya).
3. Reproduksi buffer overflow yang aman untuk diamati: `char buf[8]; strcpy(buf, argv[1]);`. Jalankan dengan argumen pendek (OK) lalu sangat panjang. Apa yang terjadi? Lalu compile dengan `-fsanitize=address` dan jalankan lagi — apa kata ASan? (Lihat ia menunjuk overflow tepat.)
4. Perbaiki program di atas dengan `snprintf(buf, sizeof(buf), "%s", argv[1])`. Jalankan dengan input panjang — apakah sekarang aman? Apa yang terjadi pada input (terpotong)?
5. Demonstrasikan ASLR: cetak `&` sebuah variabel lokal, jalankan beberapa kali. Apakah alamat berubah? (Bab 2!) Lalu matikan ASLR sementara (`setarch -R ./program`) — apakah jadi konsisten?
6. Demonstrasikan integer overflow → masalah ukuran: hitung `n + 1` di mana `n = SIZE_MAX`. Cetak hasilnya. Kenapa `malloc(n+1)` jadi berbahaya?
7. Demonstrasikan format string: bandingkan `printf(s)` vs `printf("%s", s)` di mana `s` berisi `"%x %x %x"`. Apa beda output? (Jangan pakai pola `printf(s)` ini di kode nyata!)

**Pertanyaan refleksi:**

1. Apa beda "undefined behavior" dan "error/bug biasa"? Kenapa UB lebih berbahaya?
2. Kenapa compiler boleh "berasumsi UB tidak terjadi"? Beri contoh bagaimana asumsi ini menghapus kode yang kamu tulis.
3. Jelaskan langkah demi langkah bagaimana buffer overflow di stack bisa membajak alur program. Konsep apa dari Bab 4 & 5 yang bersatu di sini?
4. Kenapa `strcpy` berbahaya tapi `snprintf` aman? Apa prinsip umum di balik penyalinan yang aman?
5. Sebutkan tiga lapisan pertahanan terhadap buffer overflow. Kenapa "kode yang benar" tetap yang paling penting meski ada mitigasi otomatis?
6. Bagaimana integer overflow (Bab 2) bisa menjadi akar kerentanan memori? Beri contoh.
7. Kenapa `printf(input_user)` berbahaya, dan apa cara amannya?
8. Mengapa banyak kelas kerentanan ini "khas C"? Apa hubungannya dengan filosofi C yang kita pelajari sejak Bab 1?

---

Kita sudah bergerak dari `hello world` di Bab 1, ke memori, pointer, proses, jaringan, kernel, tooling, dan keamanan. Tinggal satu bab lagi, yaitu **Bab 22**. Bab itu berbeda sifatnya: bukan materi teknis baru, melainkan peta jalan ke depan.

Di **Bab 22**, kita membahas arah belajar setelah fondasi ini: OS development, kernel, embedded, bare-metal, topik yang perlu dipelajari, dan sumber belajar yang relevan.
