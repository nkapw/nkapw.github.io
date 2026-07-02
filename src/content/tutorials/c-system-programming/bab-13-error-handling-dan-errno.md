---
title: "Bab 13 - Penanganan Error dan errno"
description: "C tidak memiliki mekanisme exception seperti try dan catch. Kegagalan fungsi biasanya dilaporkan melalui nilai return, lalu pemanggil bertanggung jawab memeriksa..."
tags: [c, systems-programming]
order: 13
updated: 2026-07-02
---
C tidak memiliki mekanisme exception seperti `try` dan `catch`. Kegagalan fungsi biasanya dilaporkan melalui nilai return, lalu pemanggil bertanggung jawab memeriksa nilai tersebut. Jika pemeriksaan diabaikan, program dapat terus berjalan dengan keadaan yang salah dan baru gagal pada bagian lain yang lebih sulit dilacak.

Pola ini sudah muncul pada bab sebelumnya. Alokasi memori perlu diperiksa dengan `if (p == NULL)`, pembukaan file perlu diperiksa dengan `if (fd == -1)`, dan setiap operasi I/O perlu dilihat nilai return-nya. Bab ini menyusun pola tersebut menjadi cara kerja error handling yang lebih konsisten.

---

## 13.1 Error di C Dilaporkan melalui Nilai Kembalian

Pada C, fungsi biasanya melaporkan kegagalan melalui nilai return. Pemanggil harus membaca nilai tersebut sebelum menggunakan hasil operasi. Tidak ada stack unwinding otomatis, tidak ada exception yang memaksa program berhenti pada titik kegagalan, dan tidak ada mekanisme bawaan yang menjamin error akan terlihat jika nilai return diabaikan.

Contoh sederhana berikut memperlihatkan risiko yang umum terjadi.

```c
FILE *f = fopen("data.txt", "r");
fprintf(f, "halo\n");    // salah jika fopen gagal dan f bernilai NULL
```

Kode di atas memakai `f` tanpa memeriksa apakah `fopen` berhasil. Jika file gagal dibuka, `f` bernilai `NULL` dan pemakaian berikutnya menghasilkan perilaku yang salah. Bentuk yang benar adalah memeriksa nilai return terlebih dahulu.

```c
FILE *f = fopen("data.txt", "r");
if (f == NULL) {
    perror("fopen");
    return 1;
}
```

Prinsip yang sama berlaku untuk `malloc`, `open`, `read`, `write`, `fgets`, `scanf`, dan banyak fungsi lain. Nilai return bukan detail tambahan. Nilai return adalah bagian utama dari kontrak fungsi.

---

## 13.2 Konvensi Nilai Kembalian yang Umum

C tidak menentukan satu bentuk pelaporan error untuk semua fungsi. Kode C mengandalkan konvensi yang perlu dibaca dari dokumentasi fungsi atau ditetapkan secara konsisten dalam satu basis kode.

### Return `-1` Saat Gagal

Pola ini umum pada system call POSIX. Nilai non-negatif biasanya berarti sukses atau berisi hasil operasi, sedangkan `-1` berarti gagal.

```c
int fd = open("data.txt", O_RDONLY);
if (fd == -1) {
    perror("open");
    return 1;
}

ssize_t n = read(fd, buf, sizeof(buf));
if (n == -1) {
    perror("read");
    close(fd);
    return 1;
}
```

### Return `NULL` Saat Gagal

Pola ini umum pada fungsi yang mengembalikan pointer.

```c
char *p = malloc(n);
if (p == NULL) {
    fprintf(stderr, "alokasi memori gagal\n");
    return 1;
}

FILE *f = fopen("data.txt", "r");
if (f == NULL) {
    perror("fopen");
    free(p);
    return 1;
}
```

### Return `0` untuk Sukses dan Nilai Selain `0` untuk Error

Pola ini umum pada fungsi yang mengembalikan status, bukan data utama.

```c
int rc = lakukan_sesuatu();
if (rc != 0) {
    fprintf(stderr, "operasi gagal dengan kode %d\n", rc);
    return rc;
}
```

### Status melalui Return dan Hasil melalui Parameter Keluaran

Jika fungsi perlu mengembalikan status sekaligus hasil, status dapat dikembalikan sebagai nilai return, sedangkan hasil ditulis melalui pointer yang dikirim pemanggil.

```c
int nilai;
if (parse_int("123", &nilai) != 0) {
    fprintf(stderr, "input bukan bilangan valid\n");
    return 1;
}

printf("%d\n", nilai);
```

Tidak ada satu pola yang paling benar untuk semua kasus. Yang penting adalah konsistensi, dokumentasi, dan pemeriksaan nilai return pada setiap pemanggilan yang dapat gagal.

---

## 13.3 `errno` Menjelaskan Penyebab Kegagalan

Nilai return seperti `-1` hanya menyatakan bahwa operasi gagal. Penyebabnya disimpan dalam `errno` untuk banyak fungsi POSIX dan fungsi pustaka C. `errno` dideklarasikan di `<errno.h>` dan berisi kode error terakhir yang relevan untuk thread saat ini.

```c
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main(void) {
    int fd = open("tidak_ada.txt", O_RDONLY);
    if (fd == -1) {
        printf("errno = %d\n", errno);
        printf("pesan = %s\n", strerror(errno));
        return 1;
    }

    close(fd);
    return 0;
}
```

Nilai `errno` berupa integer, tetapi kode sebaiknya tidak bergantung pada angka langsung. Gunakan konstanta yang disediakan oleh `<errno.h>`.

| Konstanta | Arti |
|-----------|------|
| `ENOENT` | File atau direktori tidak ada |
| `EACCES` | Izin akses ditolak |
| `ENOMEM` | Memori tidak cukup |
| `EINVAL` | Argumen tidak valid |
| `EEXIST` | File sudah ada |
| `EINTR` | System call terhenti karena signal |

Contoh penanganan berdasarkan jenis error.

```c
int fd = open("data.txt", O_RDONLY);
if (fd == -1) {
    if (errno == ENOENT) {
        fprintf(stderr, "file tidak ditemukan\n");
    } else if (errno == EACCES) {
        fprintf(stderr, "izin akses ditolak\n");
    } else {
        fprintf(stderr, "open gagal, %s\n", strerror(errno));
    }
    return 1;
}
```

---

## 13.4 `perror` dan `strerror`

Ada dua fungsi yang sering dipakai untuk mengubah kode error menjadi pesan yang dapat dibaca.

### `perror`

`perror` membaca `errno` saat ini dan mencetak pesan ke `stderr`. Fungsi ini cocok dipakai segera setelah fungsi lain melaporkan kegagalan.

```c
FILE *f = fopen("data.txt", "r");
if (f == NULL) {
    perror("fopen data.txt");
    return 1;
}
```

### `strerror`

`strerror` menerima kode error dan mengembalikan string pesan untuk kode tersebut. Fungsi ini berguna jika program perlu mengatur format pesan sendiri.

```c
FILE *f = fopen("data.txt", "r");
if (f == NULL) {
    fprintf(stderr, "gagal membuka data.txt, %s\n", strerror(errno));
    return 1;
}
```

Pesan error sebaiknya ditulis ke `stderr`, bukan `stdout`. `stdout` digunakan untuk output normal program, sedangkan `stderr` digunakan untuk diagnosis dan laporan kegagalan.

---

## 13.5 Aturan Penting Saat Memakai `errno`

`errno` sering disalahgunakan karena terlihat seperti variabel biasa. Ada beberapa aturan yang perlu diikuti.

### Baca `errno` Hanya Setelah Fungsi Melaporkan Gagal

`errno` bermakna jika fungsi baru saja melaporkan kegagalan melalui nilai return. Fungsi yang sukses tidak wajib mengembalikan `errno` ke `0`, sehingga membaca `errno` tanpa memeriksa return value dapat menghasilkan kesimpulan yang salah.

```c
fopen("data.txt", "r");
if (errno != 0) {
    /* salah, errno mungkin sisa operasi sebelumnya */
}
```

Bentuk yang benar adalah memeriksa nilai return lebih dulu.

```c
FILE *f = fopen("data.txt", "r");
if (f == NULL) {
    perror("fopen");
}
```

Urutannya selalu sama. Periksa nilai return fungsi. Jika nilai tersebut menandakan gagal, baru baca `errno`.

### Simpan `errno` Segera Setelah Error

Fungsi pustaka lain dapat mengubah `errno`. Jika program perlu melakukan pekerjaan tambahan sebelum mencetak pesan error, simpan nilai `errno` terlebih dahulu.

```c
int fd = open("data.txt", O_RDONLY);
if (fd == -1) {
    int saved_errno = errno;

    fprintf(stderr, "gagal membuka file\n");
    fprintf(stderr, "%s\n", strerror(saved_errno));
    return 1;
}
```

Kebiasaan ini penting pada kode yang lebih besar, karena pemanggilan fungsi lain di antara titik kegagalan dan titik pelaporan dapat mengganti nilai `errno`.

### Tidak Semua Fungsi Memakai `errno`

`errno` umum dipakai oleh system call POSIX dan banyak fungsi libc, tetapi tidak berlaku untuk semua API. Beberapa fungsi memakai nilai return sendiri, output parameter, atau aturan khusus. Fungsi seperti `strtol` misalnya memiliki pola pemakaian yang perlu dibaca dari dokumentasinya. Selalu ikuti kontrak fungsi yang sedang dipakai.

---

## 13.6 `errno` pada Program Multi-Thread

Pada sistem modern, `errno` bersifat thread-local. Setiap thread memiliki nilai `errno` sendiri. Error pada satu thread tidak langsung mengganti `errno` milik thread lain.

Program tetap menulis `errno` seperti variabel biasa, tetapi implementasi pustaka memastikan nilainya terpisah per thread. Detail ini penting saat nanti membahas thread, karena pelaporan error tetap dapat dilakukan dengan pola yang sama.

---

## 13.7 Strategi Error Handling yang Rapi

Error handling di C perlu memperhatikan dua hal. Pertama, kegagalan harus dideteksi sedekat mungkin dari sumbernya. Kedua, resource yang sudah diperoleh harus dibersihkan pada semua jalur keluar.

### Early Return

Early return membuat alur sukses tetap lurus dan mudah dibaca. Saat terjadi kegagalan, fungsi segera membersihkan resource yang sudah diperoleh lalu keluar.

```c
int proses_file(const char *path) {
    FILE *f = fopen(path, "r");
    if (f == NULL) {
        perror("fopen");
        return -1;
    }

    char *buf = malloc(1024);
    if (buf == NULL) {
        fclose(f);
        return -1;
    }

    /* proses file */

    free(buf);
    fclose(f);
    return 0;
}
```

Pada contoh tersebut, `fclose(f)` tetap dipanggil ketika `malloc` gagal. Tanpa pembersihan itu, file yang sudah dibuka akan bocor.

### `goto cleanup`

Jika sebuah fungsi memiliki beberapa resource dan banyak titik gagal, duplikasi pembersihan dapat membuat kode mudah salah. Idiom `goto cleanup` sering dipakai pada kode C sistem karena menyediakan satu jalur pembersihan di akhir fungsi.

```c
int proses(void) {
    int rc = -1;
    FILE *f = NULL;
    char *buf = NULL;

    f = fopen("data.txt", "r");
    if (f == NULL) {
        goto cleanup;
    }

    buf = malloc(1024);
    if (buf == NULL) {
        goto cleanup;
    }

    /* proses utama */

    rc = 0;

cleanup:
    free(buf);
    if (f != NULL) {
        fclose(f);
    }
    return rc;
}
```

Dalam pola ini, resource dibebaskan di satu tempat. Resource juga dibebaskan dalam urutan terbalik dari proses perolehannya. `free(NULL)` aman, tetapi `fclose` tetap perlu diberi pemeriksaan karena `fclose(NULL)` tidak valid.

`goto` tetap perlu dipakai secara terbatas. Penggunaannya untuk keluar menuju blok pembersihan berbeda dari penggunaan `goto` untuk membuat alur program meloncat tanpa struktur.

### Fungsi Level Rendah Melaporkan Error

Fungsi level rendah sebaiknya melaporkan error kepada pemanggil, bukan langsung memanggil `exit`. Pemanggil biasanya memiliki konteks yang lebih lengkap untuk memutuskan tindakan berikutnya, misalnya mencoba ulang, memakai nilai default, menutup resource lain, atau menghentikan program.

Memanggil `exit` langsung dari fungsi utilitas membuat kode sulit dipakai ulang. Pengecualian yang wajar adalah kode di `main` atau program kecil yang memang tidak memiliki lapisan pemanggil lain.

---

## 13.8 Rangkuman Model Mental

1. C tidak memiliki exception. Kegagalan fungsi biasanya dilaporkan melalui nilai return.
2. Nilai return harus diperiksa sebelum hasil operasi dipakai.
3. Konvensi yang umum adalah `-1` untuk gagal, `NULL` untuk gagal pada fungsi yang mengembalikan pointer, `0` untuk sukses, dan status melalui return dengan hasil melalui output parameter.
4. `errno` menyimpan kode penyebab kegagalan untuk banyak fungsi POSIX dan fungsi libc.
5. `errno` hanya bermakna setelah fungsi melaporkan gagal melalui nilai return.
6. Simpan `errno` segera jika ada kemungkinan fungsi lain dipanggil sebelum pesan error dicetak.
7. Tulis pesan error ke `stderr`.
8. Bersihkan resource pada semua jalur keluar.
9. `goto cleanup` adalah idiom yang wajar untuk fungsi C yang memiliki banyak resource.
10. Fungsi level rendah sebaiknya melaporkan error dan membiarkan pemanggil memutuskan tindakan berikutnya.

---

## 13.9 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Tulis program yang mencoba membuka file yang tidak ada. Cetak nilai `errno`, hasil `strerror(errno)`, dan pesan dari `perror`.
2. Buat beberapa skenario error, seperti membuka file yang tidak ada, membuka file tanpa izin baca, dan meminta alokasi memori yang sangat besar. Amati nilai `errno` yang muncul.
3. Tulis fungsi `int aman_buka(const char *path)` yang membuka file dan memberi pesan berbeda untuk `ENOENT`, `EACCES`, dan error lain.
4. Setelah `open` gagal, simpan `errno` ke variabel lokal sebelum memanggil fungsi lain. Bandingkan dengan versi yang membaca `errno` belakangan.
5. Tulis fungsi yang membuka file dan mengalokasikan buffer. Buat dua versi error handling, satu memakai early return dan satu memakai `goto cleanup`.
6. Jalankan program dengan alat seperti Valgrind untuk memastikan tidak ada resource leak pada jalur error.
7. Buat contoh yang mengabaikan hasil `malloc`, lalu jelaskan mengapa pemakaian pointer tanpa pemeriksaan berbahaya.

### Pertanyaan Refleksi

1. Apa perbedaan utama error handling di C dibanding bahasa yang memiliki exception.
2. Mengapa nilai return perlu diperiksa sebelum hasil operasi dipakai.
3. Sebutkan beberapa konvensi return value yang umum di C.
4. Apa peran `errno` dalam pelaporan error.
5. Mengapa `errno` tidak boleh dibaca sebelum nilai return diperiksa.
6. Mengapa nilai `errno` sebaiknya disimpan segera setelah error terjadi.
7. Mengapa `goto cleanup` dapat membuat error handling lebih rapi pada fungsi yang memiliki banyak resource.
8. Mengapa fungsi level rendah sebaiknya tidak langsung memanggil `exit`.

---

Bab ini memberi dasar untuk menangani kegagalan secara eksplisit. Bab 14 akan membahas proses, layout memori proses, serta system call `fork`, `exec`, dan `wait` yang menjadi dasar eksekusi program pada sistem UNIX.

