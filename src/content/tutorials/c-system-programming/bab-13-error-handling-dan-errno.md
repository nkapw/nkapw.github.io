---
title: "Bab 13 — Error Handling & `errno`"
description: "Ini bab terpendek sejauh ini, tetapi isinya penting untuk menulis C yang bisa dipercaya. Di bahasa seperti Python atau Java, error bisa muncul lewat exception; kalau..."
tags: [c, system-programming]
order: 13
updated: 2026-06-21
---

> "C tidak punya `try/catch`. Di C, error adalah nilai biasa yang dikembalikan fungsi, dan tugas pemanggil adalah memeriksanya. Kode yang tidak memeriksa error bukan kode yang lebih bersih; ia hanya menunda masalah."

Ini bab terpendek sejauh ini, tetapi isinya penting untuk menulis C yang bisa dipercaya. Di bahasa seperti Python atau Java, error bisa muncul lewat exception; kalau kamu tidak menangkapnya, program berhenti dengan pesan yang cukup jelas. Di C, **tidak ada mekanisme itu**.

Error adalah nilai return biasa. Kalau kamu mengabaikannya, program tetap lanjut, sering kali dengan state yang sudah tidak valid.

Kamu sudah melihat polanya sejak Bab 9 (`if (p == NULL)`) dan Bab 12 (`if (fd == -1) perror(...)`). Bab ini merapikan pola tersebut menjadi model mental yang utuh.

---

## 13.1 C tidak punya exception: error adalah return value

Filosofi error handling C sederhana dan tegas.

> **Fungsi melaporkan kegagalan lewat nilai return-nya. Pemanggil harus memeriksa nilai itu. Kalau tidak diperiksa, error lewat tanpa suara, dan program lanjut dengan data atau state yang rusak.**

Tidak ada `try`, tidak ada `catch`, dan tidak ada stack unwinding otomatis. Kalau `malloc` gagal dan kamu tidak mengecek, program bisa lanjut memakai pointer `NULL` lalu crash beberapa baris kemudian, jauh dari sumber masalah. Kalau `fopen` gagal dan kamu tidak cek, pemanggilan berikutnya ke `fprintf(NULL, ...)` bisa langsung bermasalah.

Error yang tidak diperiksa di C tidak menghilang. Ia hanya berpindah ke tempat yang lebih sulit ditelusuri.

C tidak menyediakan pengaman otomatis untuk setiap langkah. Tiap pemanggilan fungsi yang bisa gagal harus kamu cek sendiri lewat return value. Kebebasan C selalu datang bersama tanggung jawab eksplisit di sisi pemanggil.

---

## 13.2 Konvensi return value yang umum

Karena tidak ada aturan bahasa yang memaksa satu bentuk error handling, C mengandalkan **konvensi**. Beberapa pola berikut akan sering kamu temui, dan sebaiknya kamu ikuti juga saat merancang fungsi sendiri.

**1. Return `-1` saat gagal (umum di syscall).** Nilai non-negatif menunjukkan sukses atau hasil operasi, sedangkan `-1` menunjukkan gagal.
```c
int fd = open(...);
if (fd == -1) { /* tangani error */ }
ssize_t n = read(...);
if (n == -1) { /* error */ }
```

**2. Return `NULL` saat gagal (umum di fungsi yang mengembalikan pointer).**
```c
char *p = malloc(n);
if (p == NULL) { /* gagal alokasi */ }
FILE *f = fopen(...);
if (f == NULL) { /* gagal buka */ }
```

**3. Return `0` saat sukses, non-`0` saat error.** Pola ini umum pada fungsi yang melakukan sesuatu tanpa mengembalikan hasil utama. Ingat bahwa `main` mengembalikan `0` untuk sukses (Bab 1). Banyak library memakai pola "return kode error, `0` berarti OK".
```c
int hasil = lakukan_sesuatu();
if (hasil != 0) { /* hasil adalah kode error */ }
```

**4. Status lewat return, hasil lewat pointer (output parameter).** Ingat Bab 6: fungsi mengembalikan status sukses/gagal, lalu hasil utamanya diisi ke pointer yang kamu kirim.
```c
int nilai;
if (parse_int("123", &nilai) == 0) {   // 0 = sukses; nilai terisi
    printf("%d\n", nilai);
}
```

Tidak ada satu konvensi yang selalu cocok untuk semua situasi. Yang penting adalah **konsisten** dalam satu basis kode, dengan konvensi fungsi yang **terdokumentasi**. Saat memakai fungsi dari library, baca dokumentasinya untuk tahu cara fungsi itu melaporkan error.

Dokumentasi ini harus menjawab dua hal: nilai apa yang berarti sukses, dan nilai apa yang berarti gagal. Kalau fungsi mengembalikan pointer, tulis apakah `NULL` berarti gagal. Kalau fungsi mengembalikan integer, tulis apakah `0`, `-1`, atau nilai lain yang dipakai sebagai status.

---

## 13.3 `errno`: detail kenapa gagal

Return `-1` memberitahu *bahwa* terjadi error, tetapi tidak memberitahu *kenapa*. Penyebabnya bisa berbeda-beda: file tidak ada, izin kurang, disk penuh, argumen tidak valid, atau syscall disela signal.

Untuk kebutuhan itu, C menyediakan **`errno`**, variabel di `<errno.h>` yang diisi kernel atau library dengan **kode error** saat sebuah panggilan gagal. Secara praktis ia terlihat seperti variabel global, tetapi di program multi-thread ia sebenarnya per-thread (lihat Bagian 13.6).

```c
#include <stdio.h>
#include <errno.h>      // errno dan konstanta E*
#include <string.h>     // strerror
#include <fcntl.h>

int main(void) {
    int fd = open("tidak_ada.txt", O_RDONLY);
    if (fd == -1) {
        printf("errno = %d\n", errno);              // mis. 2
        printf("artinya: %s\n", strerror(errno));   // "No such file or directory"
        return 1;
    }
    close(fd);
    return 0;
}
```

`errno` adalah integer; nilainya mewakili jenis error. Angka konkretnya tidak perlu dihafal karena `<errno.h>` menyediakan konstanta bernama:

| Konstanta | Arti |
|-----------|------|
| `ENOENT` | No such file or directory (file/dir tak ada) |
| `EACCES` | Permission denied (tak punya izin) |
| `ENOMEM` | Out of memory |
| `EINVAL` | Invalid argument |
| `EEXIST` | File already exists |
| `EINTR` | Interrupted system call (disela signal — Bab 15) |

Kamu bisa membandingkan `errno` dengan konstanta ini untuk bereaksi spesifik:
```c
if (fd == -1) {
    if (errno == ENOENT)      printf("File tidak ditemukan.\n");
    else if (errno == EACCES) printf("Tidak punya izin.\n");
    else                      printf("Error lain: %s\n", strerror(errno));
}
```

Pola ini berguna ketika program bisa melakukan tindakan berbeda untuk error berbeda. File yang tidak ada mungkin bisa dibuat ulang, sedangkan izin yang kurang mungkin harus dilaporkan ke pengguna. Keduanya sama-sama gagal, tetapi respons programnya tidak harus sama.

---

## 13.4 Mencetak error: `perror` dan `strerror`

Dua fungsi standar dipakai untuk mengubah `errno` jadi pesan manusiawi.

**`perror(prefix)`** mencetak ke **stderr**. Output-nya berisi `prefix`, lalu `": "`, lalu pesan teks dari `errno` saat ini, lalu newline. Ini cara paling ringkas untuk menampilkan error.
```c
FILE *f = fopen("data.txt", "r");
if (f == NULL) {
    perror("fopen data.txt");   // -> "fopen data.txt: No such file or directory"
    return 1;
}
```

**`strerror(errno)`** mengembalikan **string** pesan untuk sebuah kode error, supaya kamu bisa memformat sendiri, misalnya dengan `fprintf`.
```c
if (f == NULL) {
    fprintf(stderr, "Gagal buka data.txt: %s\n", strerror(errno));
    return 1;
}
```

Error sebaiknya ditulis ke **stderr**, konsisten dengan Bab 12. Output normal pergi ke stdout, sedangkan pesan error pergi ke stderr.

Perbedaan praktisnya sederhana. Pakai `perror` saat format bawaannya sudah cukup. Pakai `strerror` saat kamu ingin menyusun pesan sendiri, menambahkan konteks lain, atau menyimpan pesan itu ke log dengan format tertentu.

---

## 13.5 Aturan emas memakai `errno` (sering salah)

`errno` punya beberapa jebakan halus yang perlu kamu ingat.

**1. `errno` hanya bermakna setelah sebuah panggilan melaporkan gagal.** Jangan memeriksa `errno` tanpa konteks. Nilainya valid kalau fungsi sebelumnya memang baru saja menandakan error, misalnya lewat return `-1` atau `NULL`. Fungsi yang **sukses tidak menjamin** mengembalikan `errno` ke 0.

```c
// salah:
fopen("a.txt", "r");
if (errno != 0) { ... }   // errno mungkin sisa dari operasi lain sebelumnya!

// benar:
FILE *f = fopen("a.txt", "r");
if (f == NULL) {          // cek return value dulu
    perror("fopen");       // baru errno bermakna di sini
}
```

> Urutan yang aman dimulai dari cek return value fungsi. Kalau return value itu menandakan gagal, baru baca `errno`. Jangan membalik urutannya.

**2. `errno` mudah tertimpa.** Hampir semua fungsi library bisa mengubah `errno`. Kalau kamu memanggil fungsi lain, termasuk `printf`, antara titik error dan titik kamu membaca `errno`, nilainya bisa sudah berubah. Karena itu, **simpan `errno` ke variabel segera** setelah error, sebelum melakukan apa pun.

```c
int fd = open(...);
if (fd == -1) {
    int saved = errno;            // simpan segera
    fprintf(stderr, "gagal\n");   // fprintf bisa mengubah errno!
    fprintf(stderr, "%s\n", strerror(saved));   // pakai yang tersimpan
}
```

**3. Tidak semua fungsi memakai `errno`.** Ini konvensi syscall & banyak fungsi POSIX/libc, tapi tidak universal. Fungsi seperti `strtol` punya cara pelaporan sendiri. Selalu cek dokumentasi.

Dengan kata lain, `errno` bukan mekanisme error global untuk seluruh bahasa C. Ia adalah konvensi yang dipakai banyak API sistem dan library, tetapi setiap fungsi tetap harus dibaca sesuai kontraknya sendiri.

---

## 13.6 Catatan: `errno` di program multi-thread

Sekilas, "variabel global `errno`" terdengar bermasalah di program multi-thread (Bab 17). Kalau dua thread sama-sama menulis `errno`, apakah nilainya saling menimpa?

C dan POSIX menyelesaikan ini. Di sistem modern, **`errno` sebenarnya bukan variabel global biasa; ia per-thread** (thread-local). Tiap thread punya `errno`-nya sendiri, jadi error di satu thread tidak mengacak `errno` thread lain.

Kamu tetap menulis `errno` seperti biasa. Implementasinya yang mengurus pemisahan antar-thread.

---

## 13.7 Strategi error handling yang waras

Bahasa tanpa exception bisa membuat error handling bertele-tele kalau tidak ditata. Beberapa pola praktis berikut sering dipakai di kode C yang matang.

### Pola 1: cek dan return lebih awal (early return / guard clauses)

Tangani error di awal dan keluar cepat, supaya alur "sukses" tetap rata dan terbaca.

```c
int proses_file(const char *path) {
    FILE *f = fopen(path, "r");
    if (f == NULL) {
        perror("fopen");
        return -1;               // keluar cepat saat gagal
    }

    char *buf = malloc(1024);
    if (buf == NULL) {
        fclose(f);               // bersihkan yang sudah dibuka!
        return -1;
    }

    // ... alur sukses di sini, tak perlu nested berlapis ...

    free(buf);
    fclose(f);
    return 0;
}
```

Saat `malloc` gagal, kita **`fclose(f)` dulu** sebelum return. Kalau tidak, file descriptor di balik `FILE *` itu bocor. Inilah tantangan utama error handling di C, yaitu **membersihkan resource yang sudah terlanjur didapat** (file, memori) di setiap jalur keluar.

Semakin banyak resource yang dibuka, semakin mudah ada jalur error yang lupa membersihkan salah satunya. Karena itu, error handling di C tidak hanya soal mendeteksi gagal, tetapi juga soal memastikan setiap jalur keluar meninggalkan program dalam keadaan rapi.

### Pola 2: `goto cleanup` (idiom resmi di C, termasuk kernel Linux)

Untuk fungsi dengan banyak resource dan banyak titik gagal, membersihkan di tiap return menjadi berulang dan rawan lupa. Idiom yang **diterima luas** (dan banyak dipakai di kernel Linux) adalah `goto` ke label cleanup di akhir.

```c
int proses(void) {
    int rc = -1;
    FILE *f = NULL;
    char *buf = NULL;

    f = fopen("data.txt", "r");
    if (f == NULL) goto cleanup;

    buf = malloc(1024);
    if (buf == NULL) goto cleanup;

    // ... kerja utama; kalau gagal di tengah, goto cleanup juga ...

    rc = 0;            // sampai sini berarti sukses

cleanup:
    free(buf);         // free(NULL) aman (Bab 9); fclose dengan cek
    if (f) fclose(f);
    return rc;
}
```

Ya, ini `goto`, yang biasanya dihindari. Tetapi untuk **cleanup error**, pola ini justru bersih dan umum di C. Ada satu tempat pembersihan yang dilewati semua jalur, tanpa duplikasi. Resource dibebaskan dalam urutan terbalik dari alokasi, sehingga dependensi antar-resource lebih mudah dijaga. Kamu akan melihat pola ini di banyak kode sistem.

### Pola 3: fungsi melaporkan, pemanggil memutuskan

Fungsi level rendah sebaiknya **melaporkan** error (return kode/`-1`), bukan langsung memutuskan untuk `exit()`. Biarkan pemanggil yang punya konteks lebih luas memutuskan apakah perlu mencoba lagi, memakai default, atau menghentikan program.

Library yang memanggil `exit()` sendiri saat error akan sulit dipakai ulang, karena ia mengambil keputusan untuk seluruh program. Pengecualian tetap ada. Di `main` atau program kecil, langsung `exit`/`return` saat error fatal masih wajar.

---

## 13.8 Rangkuman model mental

1. **C tidak punya exception.** Error dilaporkan lewat nilai return yang harus diperiksa. Kalau diabaikan, program bisa lanjut diam-diam dengan state yang salah.
2. **Konvensi return** harus diikuti secara konsisten. Pola yang umum adalah `-1` untuk gagal pada syscall, `NULL` untuk gagal pada fungsi yang mengembalikan pointer, `0` untuk sukses dengan non-`0` sebagai kode error, atau status lewat return dengan hasil lewat output parameter.
3. **`errno`** (`<errno.h>`) menyimpan **kode** kenapa sebuah panggilan gagal. Bandingkan nilainya dengan konstanta `E*` seperti `ENOENT` atau `EACCES` saat program perlu bereaksi spesifik.
4. **`perror(prefix)`** dan **`strerror(errno)`** mengubah `errno` menjadi pesan manusiawi. Pesan error sebaiknya ditulis ke **stderr**.
5. **Aturan `errno`** dimulai dari cek return value lebih dulu, baru baca `errno`. Simpan `errno` segera sebelum memanggil fungsi lain, karena nilainya bisa tertimpa. Tidak semua fungsi memakai `errno`.
6. `errno` aman di multi-thread karena implementasinya thread-local.
7. **Strategi error handling yang rapi** memakai early return dengan cleanup resource di tiap jalur, atau idiom **`goto cleanup`** untuk fungsi yang mengelola banyak resource. Fungsi level rendah sebaiknya melapor, lalu pemanggil yang memutuskan responsnya.

---

## 13.9 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program yang mencoba `fopen` file yang tidak ada. Cetak `errno` (angka), lalu `strerror(errno)`, lalu pakai `perror`. Bandingkan ketiga output.
2. Buat tiga skenario error berbeda dan amati `errno`/`strerror`-nya: (a) buka file tak ada (`ENOENT`), (b) buka file yang tak punya izin baca (`EACCES` — bikin file lalu `chmod 000`), (c) `malloc` ukuran absurd besar.
3. Tulis fungsi `int aman_buka(const char *path)` yang membuka file, dan saat gagal mencetak pesan spesifik berbeda untuk `ENOENT` vs `EACCES` vs error lain (pakai `if (errno == ...)`).
4. Demonstrasikan jebakan "errno ketimpa": setelah `open` gagal, panggil `printf("...")` lalu baca `errno`. Apakah masih akurat? Lalu perbaiki dengan menyimpan `errno` ke variabel segera.
5. Tulis fungsi yang membuka file **dan** mengalokasikan buffer, dengan dua versi error handling: (a) early return dengan cleanup manual di tiap jalur, (b) idiom `goto cleanup`. Bandingkan keterbacaannya. Jalankan dengan valgrind untuk pastikan tak ada leak di jalur error.
6. Sengaja **abaikan** return value `malloc` (jangan cek NULL) dan pakai pointernya. Dengan alokasi normal mungkin "kelihatan jalan" — tapi jelaskan kenapa ini bom waktu.

**Pertanyaan refleksi:**

1. Apa beda fundamental cara C menangani error dibanding bahasa dengan exception? Apa risikonya?
2. Sebutkan empat konvensi return value yang umum di C. Kenapa "konsisten & terdokumentasi" lebih penting daripada "memilih yang benar"?
3. Apa peran `errno`, dan kenapa ia tidak cukup sendirian (kenapa harus cek return value dulu)?
4. Kenapa kamu harus menyimpan `errno` ke variabel segera setelah error? Apa yang bisa terjadi kalau tidak?
5. Kenapa `goto cleanup` — yang biasanya dihindari — justru dianggap pola yang baik untuk error handling di C?
6. Kenapa fungsi level rendah sebaiknya "melaporkan" error ketimbang langsung memanggil `exit()`?
7. Apa tantangan terbesar error handling di C dibanding bahasa ber-`try/catch`? (Petunjuk: pikirkan resource.)

---

Kita sekarang punya cara yang rapi untuk menangani kegagalan. Di **Bab 14**, kita masuk ke dunia **proses (process)**. Pembahasannya mencakup apa itu proses, bagaimana layout memorinya melengkapi peta dari Bab 9, dan tiga syscall inti yang menjadi dasar cara program dijalankan di UNIX: **`fork()`** (menggandakan proses), **`exec()`** (mengganti program), dan **`wait()`** (menunggu anak).
