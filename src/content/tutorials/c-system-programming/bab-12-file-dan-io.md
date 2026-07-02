---
title: "Bab 12 - File dan I/O"
description: "Sampai tahap ini, program yang dibuat terutama bekerja di memori. Program menghitung nilai, mengelola data, dan memanggil fungsi, tetapi belum banyak berinteraksi..."
tags: [c, systems-programming]
order: 12
updated: 2026-07-02
---
Sampai tahap ini, program yang dibuat terutama bekerja di memori. Program menghitung nilai, mengelola data, dan memanggil fungsi, tetapi belum banyak berinteraksi dengan sistem di luar prosesnya sendiri. Bab ini membahas cara program C membaca dan menulis file, serta cara konsep file digunakan secara luas pada sistem UNIX dan Linux.

Pembahasan berfokus pada dua lapisan I/O. Lapisan pertama adalah syscall seperti `open`, `read`, `write`, dan `close`, yang berinteraksi langsung dengan kernel. Lapisan kedua adalah `stdio`, seperti `fopen`, `fprintf`, dan `FILE*`, yang disediakan oleh C standard library sebagai antarmuka yang lebih nyaman. Hubungan antara kedua lapisan ini penting, terutama ketika membahas buffering.

---

## 12.1 Konsep File pada UNIX

Pada UNIX dan Linux, banyak sumber data diperlakukan melalui antarmuka file. File biasa di disk, terminal, pipe, socket, dan beberapa perangkat di `/dev` dapat dibaca atau ditulis dengan pola operasi yang serupa.

Gagasan ini membuat program dapat memakai fungsi yang sama untuk berbagai sumber data. Fungsi `read` dapat membaca dari file biasa, input terminal, pipe, atau socket. Fungsi `write` dapat menulis ke file, layar terminal, atau koneksi jaringan. Program tidak selalu perlu mengetahui detail perangkat di baliknya selama antarmuka yang digunakan sama.

Desain ini juga menjadi dasar redirection dan pipeline pada shell. Output sebuah program dapat diarahkan ke file atau diteruskan ke program lain tanpa mengubah kode program tersebut.

---

## 12.2 File Descriptor

Saat program membuka file, kernel memberikan sebuah **file descriptor** atau **fd**. File descriptor adalah integer non-negatif yang digunakan program untuk merujuk resource I/O tersebut.

```c
int fd = open("data.txt", O_RDONLY);
read(fd, buffer, 100);
close(fd);
```

Setiap proses memiliki tabel file descriptor sendiri yang dikelola oleh kernel. Nilai fd adalah indeks ke tabel tersebut. Entri tabel menunjuk ke struktur kernel yang menyimpan informasi file, posisi baca atau tulis saat ini, mode akses, dan informasi lain yang diperlukan.

```text
Proses                    Kernel
+------------------+
| fd table         |
| 0 -> stdin   ----+----> terminal input
| 1 -> stdout  ----+----> terminal output
| 2 -> stderr  ----+----> terminal error
| 3 -> data.txt ---+----> file di disk
+------------------+
```

### File Descriptor Standar

Setiap proses biasanya sudah memiliki tiga fd yang terbuka sejak awal.

| fd | Nama | Kegunaan |
|----|------|----------|
| 0 | **stdin** | Input standar, biasanya keyboard |
| 1 | **stdout** | Output normal, biasanya layar |
| 2 | **stderr** | Pesan error, biasanya layar |

Fungsi `printf` menulis ke stdout, sehingga outputnya muncul di layar karena fd 1 sudah tersedia. Shell dapat mengubah tujuan fd tersebut sebelum program dijalankan. Perintah `./program > out.txt` mengarahkan stdout ke file `out.txt`. Perintah `./program 2> error.txt` mengarahkan stderr ke file `error.txt`.

Pesan error dan informasi diagnostik sebaiknya ditulis ke stderr dengan `fprintf(stderr, ...)`, bukan ke stdout. Dengan cara ini, output normal tetap dapat diarahkan ke file tanpa tercampur dengan pesan error.

---

## 12.3 I/O Level Rendah dengan Syscall

Syscall I/O seperti `open`, `read`, `write`, dan `close` berada dekat dengan kernel. Deklarasinya tersedia melalui header seperti `<fcntl.h>` dan `<unistd.h>`.

```c
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>

int main(void) {
    int fd = open("output.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd == -1) {
        perror("open");
        return 1;
    }

    const char *pesan = "Halo dari syscall write!\n";
    ssize_t ditulis = write(fd, pesan, 25);
    if (ditulis == -1) {
        perror("write");
        close(fd);
        return 1;
    }

    printf("Berhasil menulis %zd byte\n", ditulis);

    close(fd);
    return 0;
}
```

Beberapa hal penting dari contoh tersebut.

- **`open(path, flags, mode)`** membuka file dan mengembalikan fd baru. Jika gagal, fungsi ini mengembalikan `-1`. `flags` dapat digabung dengan operator OR, misalnya `O_WRONLY`, `O_CREAT`, dan `O_TRUNC`. Nilai `0644` adalah permission file dalam bentuk oktal.
- **`write(fd, buf, n)`** menulis hingga `n` byte dari `buf` ke fd. Nilai kembaliannya adalah jumlah byte yang benar-benar ditulis, atau `-1` jika gagal. Pada kondisi tertentu, jumlah byte yang ditulis dapat lebih kecil dari `n`, sehingga kode produksi perlu menangani partial write.
- **`read(fd, buf, n)`** membaca hingga `n` byte ke `buf`. Nilai kembaliannya adalah jumlah byte yang dibaca, `0` saat mencapai akhir file, atau `-1` jika gagal.
- **`close(fd)`** menutup fd dan mengembalikannya ke kernel. File descriptor adalah resource terbatas, sehingga fd yang tidak lagi dipakai harus ditutup.
- **Konvensi error syscall** umumnya memakai nilai `-1`. Detail penyebab kegagalan dapat diperiksa melalui `errno`, yang dibahas pada Bab 13.

Pemanggilan `write` pada contoh tersebut langsung menyerahkan data ke kernel. Tidak ada buffering dari C standard library karena program menggunakan syscall secara langsung.

---

## 12.4 I/O Level Tinggi dengan `stdio`

Menggunakan syscall langsung sering membutuhkan lebih banyak kode. Program harus mengelola fd, jumlah byte, partial write, dan detail lain secara manual. C standard library menyediakan lapisan `stdio` melalui `<stdio.h>` untuk penggunaan yang lebih nyaman.

`stdio` menggunakan tipe `FILE*`. Tipe ini adalah pointer ke struktur internal library yang menyimpan fd, buffer, status error, dan informasi lain.

```c
#include <stdio.h>

int main(void) {
    FILE *f = fopen("output.txt", "w");
    if (f == NULL) {
        perror("fopen");
        return 1;
    }

    fprintf(f, "Halo dari stdio!\n");
    fputs("Baris kedua.\n", f);

    fclose(f);
    return 0;
}
```

Fungsi utama pada `stdio` meliputi hal berikut.

- **`fopen(path, mode)`** membuka file dan mengembalikan `FILE*`. Jika gagal, fungsi ini mengembalikan `NULL`. Mode yang umum adalah `"r"` untuk membaca, `"w"` untuk menulis dengan truncate, `"a"` untuk append, dan `"r+"` untuk membaca sekaligus menulis. Tambahan `"b"` digunakan untuk mode biner.
- **`fprintf` dan `fscanf`** melakukan I/O terformat ke atau dari file.
- **`fgets` dan `fputs`** membaca atau menulis string.
- **`fread` dan `fwrite`** membaca atau menulis blok data biner.
- **`fclose`** menutup stream dan melakukan flush pada buffer yang masih tersisa.

### Hubungan `stdio` dan Syscall

`stdio` dibangun di atas syscall. Fungsi seperti `fopen` pada akhirnya membuka file melalui mekanisme sistem operasi. Fungsi seperti `fprintf` dan `fputs` menulis data ke buffer, lalu data tersebut dikirim ke kernel melalui syscall seperti `write`.

```text
Kode program
   |
   | fprintf, fputs, fread
   v
FILE* dengan fd, buffer, dan state
   |
   | read, write
   v
Kernel
   |
   v
Disk, terminal, pipe, atau socket
```

Dengan demikian, `stdio` memberi kenyamanan dan buffering di user space, sedangkan syscall menjadi lapisan dasar untuk meminta layanan I/O dari kernel.

---

## 12.5 Buffering

Buffering adalah teknik menyimpan sementara data I/O di memori sebelum data benar-benar dikirim ke tujuan. Teknik ini digunakan untuk mengurangi jumlah syscall, karena berpindah dari user space ke kernel memiliki biaya yang lebih tinggi dibanding operasi biasa di memori.

Jika setiap karakter langsung dikirim dengan syscall terpisah, program akan melakukan terlalu banyak pemanggilan kernel. Dengan buffering, beberapa data dikumpulkan lebih dulu, lalu dikirim sekaligus. Hasilnya, I/O menjadi lebih efisien.

### Mode Buffering

`stdio` memiliki beberapa mode buffering.

1. **Fully buffered**. Buffer dikosongkan ketika penuh. Mode ini umum digunakan saat output menuju file.
2. **Line buffered**. Buffer dikosongkan ketika menemukan newline `\n`. Mode ini umum digunakan saat output menuju terminal.
3. **Unbuffered**. Data dikirim sesegera mungkin. Mode ini umum digunakan untuk stderr agar pesan error cepat terlihat.

Karena buffering, output dari `printf` tidak selalu langsung terlihat. Pada terminal, `printf("Halo")` tanpa newline dapat tertahan hingga buffer di-flush. Sebaliknya, `fprintf(stderr, ...)` biasanya langsung terlihat karena stderr umumnya tidak di-buffer.

### `fflush`

Fungsi `fflush(stream)` memaksa isi buffer stream dikirim saat itu juga.

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("Memproses");
    fflush(stdout);
    sleep(2);
    printf(" selesai\n");
    return 0;
}
```

Tanpa `fflush(stdout)`, teks `Memproses` dapat tertahan sampai newline berikutnya atau sampai program selesai secara normal.

### Output yang Hilang Saat Program Berhenti Tidak Normal

Buffer berada di memori proses. Jika program crash sebelum buffer di-flush, output yang sudah ditulis dengan `printf` dapat hilang.

```c
printf("sebelum crash");
int *p = NULL;
*p = 5;
```

Pada contoh tersebut, teks `sebelum crash` belum tentu muncul. Untuk debugging dengan `printf`, akhiri pesan dengan newline saat output menuju terminal, panggil `fflush(stdout)`, atau gunakan `fprintf(stderr, ...)`.

`fclose`, `return` dari `main`, dan `exit` melakukan flush pada stream `stdio` secara normal. Namun, `_exit`, `abort`, dan crash tidak menjamin buffer sempat dikirim.

---

## 12.6 Membaca File Baris demi Baris

Pola membaca file teks baris demi baris sering digunakan pada program C.

```c
#include <stdio.h>

int main(void) {
    FILE *f = fopen("data.txt", "r");
    if (f == NULL) {
        perror("fopen");
        return 1;
    }

    char baris[256];
    int nomor = 1;

    while (fgets(baris, sizeof(baris), f) != NULL) {
        printf("%4d | %s", nomor++, baris);
    }

    fclose(f);
    return 0;
}
```

Beberapa hal yang perlu diperhatikan.

- **`fgets(buf, size, f)`** membatasi jumlah karakter yang dibaca, sehingga tidak menulis melewati ukuran buffer. Fungsi `gets` berbahaya dan sudah dihapus dari standar C, sehingga tidak boleh digunakan.
- Loop berhenti ketika `fgets` mengembalikan `NULL`. Kondisi ini dapat berarti akhir file atau error.
- Gunakan `sizeof(baris)` sebagai batas ukuran agar nilai batas tetap sesuai ketika ukuran array berubah.

---

## 12.7 Memilih `stdio` atau Syscall Langsung

| Aspek | `stdio` dengan `FILE*` | Syscall dengan fd |
|-------|-------------------------|-------------------|
| Level | Lebih tinggi | Lebih rendah |
| Buffering | Otomatis | Tidak disediakan oleh library |
| Formatting | Tersedia melalui `fprintf` dan `fscanf` | Tidak tersedia |
| Portabilitas | Standar C | POSIX dan sistem sejenis UNIX |
| Kontrol | Lebih terbatas | Lebih rinci |
| Cocok untuk | File teks dan I/O umum | Socket, pipe, I/O khusus, atau kontrol penuh |

Untuk I/O file biasa, `stdio` biasanya menjadi pilihan awal karena lebih ringkas, portabel, dan memiliki buffering otomatis. Syscall langsung lebih sesuai ketika program membutuhkan kontrol rinci, bekerja dengan socket atau pipe, atau perlu mengatur perilaku I/O pada level yang lebih rendah.

Hal yang penting adalah memahami bahwa `stdio` berada di atas syscall. Dengan pemahaman ini, perilaku seperti buffering, flush, dan redirection dapat dianalisis dengan lebih tepat.

---

## 12.8 Rangkuman Model Mental

1. UNIX dan Linux memperlakukan banyak sumber data melalui antarmuka file yang seragam.
2. File descriptor adalah integer non-negatif yang menjadi indeks ke tabel fd milik proses.
3. Fd 0, 1, dan 2 biasanya sudah terbuka sebagai stdin, stdout, dan stderr.
4. Syscall I/O seperti `open`, `read`, `write`, dan `close` berinteraksi langsung dengan kernel.
5. Syscall umumnya memakai `-1` sebagai tanda gagal, dengan detail error melalui `errno`.
6. `stdio` menyediakan lapisan yang lebih nyaman melalui `FILE*`, `fopen`, `fprintf`, `fgets`, dan fungsi sejenis.
7. `stdio` dibangun di atas syscall dan menambahkan buffering serta formatting.
8. Buffering mengurangi jumlah syscall, tetapi dapat membuat output tertahan.
9. `fflush` memaksa buffer dikirim saat itu juga.
10. Output yang belum di-flush dapat hilang jika program berhenti tidak normal.
11. `stdio` cocok untuk I/O umum, sedangkan syscall langsung cocok untuk kontrol yang lebih rinci.

---

## 12.9 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Tulis program yang membuat file `output.txt` dan menulis beberapa baris ke file tersebut. Buat dua versi, satu memakai syscall `open`, `write`, dan `close`, lalu satu memakai `stdio` dengan `fopen`, `fprintf`, dan `fclose`.
2. Tulis program seperti `cat` sederhana. Baca nama file dari `argv[1]`, baca isinya baris demi baris dengan `fgets`, lalu cetak ke layar dengan nomor baris.
3. Demonstrasikan buffering dengan `printf("Halo")` tanpa newline, `sleep(3)`, lalu `printf(" dunia\n")`. Tambahkan `fflush(stdout)` setelah `printf("Halo")` dan amati perbedaannya.
4. Demonstrasikan output yang hilang saat crash dengan `printf("debug A")` tanpa newline, lalu dereference pointer `NULL`. Ulangi dengan newline atau `fprintf(stderr, ...)`.
5. Jalankan program dengan redirection menggunakan `./program > hasil.txt` dan `./program 2> error.txt`. Amati perbedaan tujuan stdout dan stderr.
6. Buka file yang tidak ada dengan `fopen(..., "r")`. Periksa nilai kembaliannya dan panggil `perror("fopen")`.
7. Gunakan `read` untuk membaca file ke buffer dan hitung jumlah byte yang terbaca. Bandingkan hasilnya dengan ukuran file dari `ls -l`.

### Pertanyaan Refleksi

1. Apa maksud antarmuka file yang seragam pada UNIX dan Linux?
2. Apa itu file descriptor dan apa hubungannya dengan tabel fd milik proses?
3. Apa peran fd 0, 1, dan 2?
4. Bagaimana hubungan antara `stdio` dan syscall?
5. Mengapa buffering digunakan pada `stdio`?
6. Mengapa `printf` tanpa newline kadang tidak langsung terlihat?
7. Mengapa output debug dapat hilang ketika program crash?
8. Kapan syscall langsung lebih tepat daripada `stdio`?

---

Bab ini menjelaskan cara program C berinteraksi dengan file dan layanan I/O sistem operasi. Pada Bab 13, pembahasan berlanjut ke error handling di C, termasuk konvensi return value, `errno`, `perror`, `strerror`, dan strategi menangani kegagalan secara teratur.

