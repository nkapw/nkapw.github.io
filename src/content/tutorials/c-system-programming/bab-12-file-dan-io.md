---
title: "Bab 12 — File & I/O"
description: "Sampai di sini, program kita masih banyak bekerja di dalam memorinya sendiri: menghitung, mengatur data, dan menyusun kode menjadi executable. Mulai bab ini, program..."
tags: [c, system-programming]
order: 12
updated: 2026-06-21
---

> "Di UNIX, banyak hal diperlakukan seperti file: dokumen di disk, terminal, koneksi jaringan, sampai perangkat hardware. Kunci aksesnya sering berupa satu angka kecil: file descriptor."

Sampai di sini, program kita masih banyak bekerja di dalam memorinya sendiri: menghitung, mengatur data, dan menyusun kode menjadi executable. Mulai bab ini, program mulai **berinteraksi dengan dunia luar**. Program akan membaca file, menulis file, dan berbicara dengan sistem operasi.

Di sistem UNIX, kata "file" punya arti lebih luas daripada dokumen di disk. Terminal, pipe, socket, dan beberapa device juga bisa diakses lewat antarmuka yang mirip file.

Bab ini membahas dua lapis I/O. Lapis pertama adalah **syscall** (`open`/`read`/`write`), yang berbicara langsung ke kernel. Lapis kedua adalah **`stdio`** (`fopen`/`printf`/`FILE*`), yaitu lapisan nyaman dari C standard library di atas syscall. Memahami hubungan keduanya, terutama soal **buffering**, akan menjelaskan banyak perilaku I/O yang sering terasa membingungkan.

---

## 12.1 Filosofi UNIX: "everything is a file"

Sebelum masuk ke teknis, pegang satu ide besar:

> **Di UNIX/Linux, banyak hal yang berbeda diperlakukan dengan antarmuka yang sama — seolah-olah file.** Dokumen di disk adalah file. Terminal/keyboard, layar, koneksi jaringan (socket, Bab 18), pipe antar proses (Bab 16), dan beberapa device hardware (`/dev/...`) juga bisa diperlakukan dengan model yang mirip.

Keuntungannya, kamu bisa memakai **fungsi yang sama** (`read`, `write`) untuk membaca dari file, keyboard, pipe, atau koneksi jaringan. Program yang menulis ke "file" tidak harus peduli apakah ujungnya disk, layar, atau socket. Antarmuka seragam seperti ini menjadi salah satu alasan tool UNIX mudah disambung dengan pipe (`|`).

---

## 12.2 File descriptor: angka kecil untuk resource

Saat program membuka sebuah file, koneksi, atau resource I/O lain, kernel memberinya sebuah **file descriptor (fd)**. Bentuknya **integer kecil non-negatif** yang menjadi pegangan untuk merujuk ke resource itu. Setiap operasi I/O berikutnya memakai fd ini.

```c
int fd = open("data.txt", O_RDONLY);   // fd mungkin bernilai 3
read(fd, buffer, 100);                  // baca lewat fd
close(fd);                              // tutup, kembalikan fd ke kernel
```

### Di balik layar: tabel file descriptor

Tiap proses punya **tabel file descriptor** sendiri yang dikelola kernel. fd hanyalah **indeks** ke tabel itu. Entri tabel menunjuk ke struktur kernel yang menyimpan informasi file sebenarnya, seperti lokasi, posisi baca saat ini, mode, dan detail lain.

Karena tabel ini dimiliki per proses, fd bernilai `3` di satu proses tidak harus merujuk ke file yang sama dengan fd `3` di proses lain. Angkanya hanya bermakna di dalam proses yang memegangnya.

```
Proses-mu                  Kernel
+------------------+
| fd table         |
| 0 -> stdin   ----+----> terminal (input)
| 1 -> stdout  ----+----> terminal (output)
| 2 -> stderr  ----+----> terminal (error)
| 3 -> data.txt ---+----> file di disk (posisi, mode, dll)
+------------------+
```

Cara membacanya sederhana. Program memegang angka fd, sementara kernel menyimpan pemetaan dari angka itu ke resource yang sebenarnya. Untuk operasi berikutnya, program cukup menyerahkan fd tersebut ke `read`, `write`, atau `close`.

### Tiga fd istimewa: 0, 1, 2

Setiap proses, saat lahir, otomatis sudah punya tiga fd terbuka (diwariskan dari shell):

| fd | Nama | Untuk |
|----|------|-------|
| 0 | **stdin** (standard input) | input — biasanya keyboard |
| 1 | **stdout** (standard output) | output normal — biasanya layar |
| 2 | **stderr** (standard error) | pesan error — biasanya layar |

Inilah kenapa `printf`, yang menulis ke stdout/fd 1, langsung muncul di layar tanpa kamu membuka file apa pun. fd 1 sudah terbuka sejak awal.

Mekanisme yang sama dipakai oleh **redirection** shell. Perintah `./program > out.txt` membuat shell mengarahkan fd 1 ke file `out.txt`, bukan ke layar. Pemisahan stdout (1) dan stderr (2) memungkinkan `./program 2> error.txt`: pesan error masuk ke file, sementara output normal tetap ke layar.

> Praktik baik: kirim pesan error dan diagnostik ke **stderr** (`fprintf(stderr, ...)`), bukan stdout. Dengan begitu, error tetap terlihat walaupun output normal di-redirect ke file, dan data output tidak tercampur pesan diagnostik. Kamu sudah melihat pola `fprintf(stderr, ...)` sejak Bab 9.

---

## 12.3 Level rendah: syscall I/O langsung

Mari mulai dari lapisan yang paling dekat ke kernel: syscall `open`, `read`, `write`, dan `close`, yang deklarasinya ada di `<fcntl.h>` dan `<unistd.h>`. Ini cara langsung berbicara dengan kernel.

```c
#include <fcntl.h>      // open, O_* flags
#include <unistd.h>     // read, write, close
#include <string.h>     // strlen
#include <stdio.h>

int main(void) {
    // buka file untuk ditulis; buat kalau belum ada; truncate kalau sudah ada
    int fd = open("output.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd == -1) {                          // syscall gagal -> return -1
        perror("open");                       // cetak pesan error (Bagian 12.6 / Bab 13)
        return 1;
    }

    const char *pesan = "Halo dari syscall write!\n";
    ssize_t ditulis = write(fd, pesan, strlen(pesan));   // tulis seluruh isi pesan ke fd
    if (ditulis == -1) {
        perror("write");
        close(fd);
        return 1;
    }
    printf("Berhasil menulis %zd byte\n", ditulis);

    close(fd);                                // tutup, kembalikan fd
    return 0;
}
```

Perhatikan poin-poin pentingnya:

- **`open(path, flags, mode)`** mengembalikan fd baru, atau **`-1` kalau gagal**. `flags` digabung dengan OR (ingat bitmask Bab 3): `O_WRONLY` (write-only), `O_CREAT` (buat kalau belum ada), `O_TRUNC` (kosongkan kalau sudah ada). `0644` adalah **permission** file (oktal: rw-r--r--) yang dipakai kalau file baru dibuat.
- **`write(fd, buf, n)`** menulis sampai `n` byte dari `buf` ke fd. Ia mengembalikan jumlah byte yang **benar-benar** ditulis (`ssize_t`), atau `-1`. Penting: `write` bisa menulis **kurang** dari `n` (partial write), sehingga kode produksi harus mengulang sampai semua data tertulis.
- **`read(fd, buf, n)`** (tak di contoh ini) membaca sampai `n` byte ke `buf`, mengembalikan jumlah byte terbaca, `0` kalau **end-of-file**, atau `-1` kalau error. `read` juga boleh membaca kurang dari `n` byte walaupun belum error; jumlah yang dikembalikan harus selalu dipakai sebagai fakta, bukan diasumsikan sama dengan ukuran buffer.
- **`close(fd)`** mengembalikan fd ke kernel. fd itu resource terbatas. Jika program lupa memanggil `close`, fd bisa bocor sebagai **fd leak**, mirip memory leak tetapi untuk handle I/O.
- **Konvensi error** untuk hampir semua syscall adalah return value **`-1`** saat gagal, dengan detail di `errno` (Bab 13). Selalu cek return value.

Partial read dan partial write sering tidak terlihat pada file kecil di disk, sehingga mudah diremehkan. Namun pada pipe, socket, terminal, file besar, atau sistem yang sedang sibuk, operasi I/O bisa menyelesaikan sebagian saja. Itu sebabnya kode level rendah biasanya memakai loop yang terus membaca atau menulis sampai jumlah byte yang diinginkan benar-benar selesai, EOF tercapai, atau error terjadi.

Hal pentingnya, `write` di sini adalah **syscall**. Ia menyeberang ke kernel tiap kali dipanggil (mekanismenya dibahas di Bab 19). Tidak ada buffering dari C standard library. Data yang kamu berikan ke `write` langsung diserahkan ke kernel.

---

## 12.4 Level tinggi: `stdio` dan `FILE*`

Menulis dengan syscall langsung cukup repot. Kamu harus mengurus fd, partial write, dan jumlah byte secara manual. Karena itu C standard library menyediakan lapisan yang lebih nyaman, yaitu **`stdio`** (`<stdio.h>`), berbasis tipe **`FILE*`**. `FILE*` adalah pointer ke struktur yang membungkus fd, buffer, dan state I/O.

Versi `stdio` dari program di atas:

```c
#include <stdio.h>

int main(void) {
    FILE *f = fopen("output.txt", "w");   // "w" = write, buat/truncate
    if (f == NULL) {                       // gagal -> NULL (bukan -1!)
        perror("fopen");
        return 1;
    }

    fprintf(f, "Halo dari stdio!\n");      // tulis terformat (seperti printf)
    fputs("Baris kedua.\n", f);

    fclose(f);                             // tutup + flush buffer
    return 0;
}
```

Fungsi-fungsi utama `stdio`:
- **`fopen(path, mode)`** → buka file, kembalikan `FILE*` (atau `NULL` kalau gagal). Mode: `"r"` (read), `"w"` (write/truncate), `"a"` (append), `"r+"` (read+write), tambah `"b"` untuk biner (`"rb"`).
- **`fprintf` / `fscanf`** — seperti `printf`/`scanf` tapi ke/dari file.
- **`fgets` / `fputs`** — baca/tulis baris (string).
- **`fread` / `fwrite`** — baca/tulis blok biner mentah.
- **`fclose`** — tutup file, **dan flush buffer** (penting, lihat Bagian 12.5).

### `stdio` dibangun di atas syscall

Hubungan kuncinya:

> **`FILE*` (stdio) adalah pembungkus (wrapper) di atas file descriptor.** Di dalam struktur `FILE` ada fd-nya, ditambah **buffer** dan state. `fprintf` pada akhirnya memanggil `write` (syscall), sedangkan `fopen` pada akhirnya membuka file lewat mekanisme kernel. `stdio` berada di user space sebagai lapisan kenyamanan; syscall adalah pintu masuk ke kernel.

```
Kode-mu
   |
   | fprintf, fputs, fread ...   <- stdio (libc, user space): + BUFFER, + format
   v
FILE* { fd, buffer, ... }
   |
   | write, read ...             <- syscall: menyeberang ke kernel
   v
Kernel -> disk/terminal/socket
```

Jadi `printf` sebenarnya `fprintf(stdout, ...)`. Byte yang dicetak ditampung dulu di buffer, lalu pada saat tertentu `stdio` memanggil `write(1, ...)`. Pemahaman lapisan ini langsung menjelaskan topik berikutnya, yaitu buffering.

---

## 12.5 Buffering: kenapa output kadang "tertahan"

Pernah mengalami `printf` yang tidak langsung muncul? Atau output yang hilang saat program crash? Itu terkait **buffering**.

### Kenapa buffering ada

Memanggil syscall `write` itu relatif **mahal** karena program harus menyeberang ke kernel (Bab 19). Kalau tiap karakter dari `printf("Halo")` memicu satu `write`, ada beberapa syscall untuk output yang sangat kecil. Itu boros.

Karena itu, `stdio` menumpuk output di **buffer** terlebih dahulu, lalu baru memanggil `write` saat buffer penuh atau pada momen tertentu. Banyak byte bisa dikirim dengan satu syscall, sehingga lebih efisien.

Buffer membuat banyak output kecil bisa dikumpulkan lebih dulu, lalu dikirim sekaligus. Dengan begitu, program tidak perlu masuk ke kernel untuk setiap karakter atau potongan kecil.

### Tiga mode buffering

`stdio` punya tiga mode, dan default-nya bergantung ke mana output pergi:

1. **Fully buffered** — buffer dikosongkan (flush) hanya saat penuh. Default saat output ke **file**.
2. **Line buffered** — flush tiap ketemu newline (`\n`). Default saat output ke **terminal** (interaktif).
3. **Unbuffered** — langsung flush tiap operasi. Default untuk **stderr**, karena pesan error sebaiknya segera terlihat.

Inilah kenapa `stderr` biasanya tidak tertahan, tetapi `stdout` ke file bisa. Ini juga menjelaskan kenapa di terminal `printf("Halo")` *tanpa* `\n` kadang tidak langsung muncul: buffer-nya line-buffered dan menunggu newline.

### `\n` bukan jaminan; `fflush` adalah

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("Memproses");        // tanpa \n -> mungkin tertahan di buffer
    // (saat ini layar mungkin masih kosong!)
    fflush(stdout);             // paksa flush buffer ke kernel sekarang
    sleep(2);                   // jeda; sekarang "Memproses" sudah terlihat
    printf(" selesai\n");       // \n di terminal memicu flush
    return 0;
}
```

`fflush(stream)` **memaksa** buffer dikosongkan saat itu juga. Coba hapus `fflush` dan jalankan. "Memproses" bisa baru muncul setelah jeda, atau bersamaan dengan " selesai", karena sebelumnya tertahan di buffer.

### Jebakan klasik: output hilang saat crash

Karena buffer berada di memori proses, kalau program **crash** (segfault) sebelum buffer di-flush, output yang sudah di-`printf` tetapi belum di-flush bisa hilang. Ini menyesatkan saat debug: kamu bisa mengira `printf` debug-mu tidak pernah jalan, padahal outputnya hanya tertahan di buffer yang tidak sempat dikosongkan.

```c
printf("sebelum crash");   // tanpa \n, fully/line buffered -> di buffer
int *p = NULL;
*p = 5;                    // crash -> "sebelum crash" mungkin tidak pernah muncul
```

> Saat melacak crash dengan `printf`, akhiri pesan dengan `\n` (di terminal ini memicu flush), panggil `fflush(stdout)`, atau pakai `fprintf(stderr, ...)` yang biasanya unbuffered. Kalau tidak, kamu bisa salah menyimpulkan lokasi crash.

> `fclose` dan keluar normal dari `main` (`return`/`exit`) otomatis mem-flush buffer stdio. Namun `_exit`, `abort`, dan crash **tidak**. Karena itu, buffer yang belum di-flush biasanya menjadi masalah saat program berhenti tidak normal.

---

## 12.6 Contoh lengkap: membaca file baris demi baris

Pola berikut sangat umum: membaca file teks baris demi baris.

```c
#include <stdio.h>

int main(void) {
    FILE *f = fopen("data.txt", "r");
    if (f == NULL) {
        perror("fopen");            // mis. "fopen: No such file or directory"
        return 1;
    }

    char baris[256];
    int nomor = 1;
    // fgets membaca satu baris (termasuk \n) sampai 255 char; berhenti di EOF -> NULL
    while (fgets(baris, sizeof(baris), f) != NULL) {
        printf("%4d | %s", nomor++, baris);   // baris sudah termasuk \n
    }

    fclose(f);
    return 0;
}
```

Catatan penting:
- **`fgets(buf, size, f)`** aman karena dibatasi `size`. Fungsi ini tidak akan menulis melewati buffer. Ini berbeda dari `gets`, yang **berbahaya** dan sudah dihapus dari standar; jangan pernah pakai `gets`. Ingat pelajaran buffer overflow dari Bab 5.
- Loop berhenti saat `fgets` mengembalikan `NULL` — yang terjadi di **EOF** (akhir file) atau error.
- Pakai `sizeof(baris)` sebagai batas, jangan tulis angka `256` keras-keras (kalau ukuran array berubah, batas ikut otomatis).

Ada satu detail praktis yang sering muncul saat memakai `fgets`: kalau satu baris lebih panjang dari ukuran buffer, `fgets` hanya membaca potongan pertama. Sisa baris akan terbaca pada iterasi berikutnya. Jadi ukuran buffer tetap perlu dipilih sesuai kebutuhan, terutama saat memproses file teks yang barisnya bisa panjang.

---

## 12.7 Kapan pakai yang mana: `stdio` vs syscall langsung

| Aspek | **`stdio` (`FILE*`)** | **syscall (`fd`)** |
|-------|----------------------|---------------------|
| Level | tinggi (nyaman) | rendah (mentah) |
| Buffering | otomatis (efisien) | tidak ada (kamu urus sendiri) |
| Formatting | ada (`fprintf`/`fscanf`) | tidak (byte mentah) |
| Portability | standar C (lintas OS) | POSIX (UNIX-like) |
| Kontrol presisi | kurang | penuh |
| Cocok untuk | I/O file teks/umum sehari-hari | I/O performa-kritis, non-file (socket, pipe), kontrol penuh |

Untuk pekerjaan file biasa, default yang baik adalah **`stdio`**. Lapisan ini lebih mudah, lebih portable, dan buffering-nya membantu efisiensi. Turun ke syscall langsung saat kamu butuh kontrol presisi atas kapan data benar-benar ditulis, bekerja dengan socket/pipe (Bab 16 dan 18), atau ingin menghindari overhead/perilaku buffering `stdio`.

Hal yang perlu dipegang adalah posisi lapisannya. `stdio` berada di atas syscall, sehingga perilaku `printf`, `fprintf`, `fgets`, dan `fclose` tetap berakhir pada operasi I/O yang dikelola kernel.

---

## 12.8 Rangkuman model mental

1. **"Everything is a file"** berarti file, terminal, socket, pipe, dan device dapat diakses lewat antarmuka file yang seragam (`read`/`write`).
2. **File descriptor (fd)** adalah integer kecil yang menjadi indeks ke tabel fd milik proses. fd `0`, `1`, dan `2` sudah terbuka sejak awal sebagai stdin, stdout, dan stderr; ini menjadi dasar redirection shell.
3. **Syscall I/O** (`open`/`read`/`write`/`close`) adalah lapisan dasar yang berbicara langsung ke kernel tanpa buffer dari C standard library. Saat gagal, syscall umumnya mengembalikan **`-1`** dan detailnya disimpan di `errno`. Return value harus dicek, dan fd yang sudah tidak dipakai harus ditutup.
4. **`stdio`** (`fopen`/`fprintf`/`FILE*`) adalah lapisan nyaman **di atas** syscall. Ia menambah **buffer** dan formatting. Saat gagal membuka file, `fopen` mengembalikan **`NULL`**.
5. **Buffering** ada untuk efisiensi karena mengurangi jumlah syscall yang mahal. Mode umumnya adalah fully buffered untuk file, line buffered untuk terminal, dan unbuffered untuk stderr. Output bisa **tertahan**; `\n` di terminal atau **`fflush`** dapat memaksa buffer keluar. Jika program crash sebelum flush, output yang masih di buffer bisa hilang.
6. Untuk file biasa, gunakan **`stdio`** sebagai default. Pilih **syscall** saat butuh kontrol presisi, bekerja dengan socket atau pipe, atau ingin mengelola sendiri perilaku I/O level rendah.

---

## 12.9 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program yang membuat file `output.txt` dan menulis beberapa baris dengannya, **dua versi**: satu pakai syscall (`open`/`write`/`close`), satu pakai stdio (`fopen`/`fprintf`/`fclose`). Bandingkan mana yang lebih ringkas.
2. Tulis program "cat" sederhana: baca file (nama dari `argv[1]`) baris demi baris dengan `fgets` dan cetak ke layar dengan nomor baris. (Gabungkan dengan `argv` dari Bab 7!)
3. Demonstrasikan buffering: `printf("Halo");` **tanpa** `\n`, lalu `sleep(3)`, lalu `printf(" dunia\n");`. Jalankan. Kapan "Halo" muncul? Lalu tambahkan `fflush(stdout)` setelah "Halo" — apa bedanya?
4. Buktikan output hilang saat crash: `printf("debug A");` (tanpa `\n`), lalu dereference NULL untuk crash. Apakah "debug A" muncul? Lalu ubah jadi `printf("debug A\n");` atau `fprintf(stderr, "debug A");` — sekarang muncul?
5. Jalankan program-mu dengan redirection: `./program > hasil.txt` dan `./program 2> error.txt`. Amati ke mana stdout vs stderr pergi. Hubungkan dengan fd 1 vs 2.
6. Buka file yang tidak ada dengan `fopen(..., "r")`. Cek return `NULL` dan panggil `perror("fopen")`. Apa pesannya?
7. (Lanjutan) Pakai `read` mentah untuk membaca file ke buffer dan hitung berapa byte. Bandingkan jumlahnya dengan ukuran file (`ls -l`).

**Pertanyaan refleksi:**

1. Apa maksud "everything is a file" di UNIX, dan kenapa desain ini berguna?
2. Apa itu file descriptor, dan apa hubungannya dengan tabel fd milik proses? Apa peran fd 0, 1, 2?
3. Jelaskan hubungan antara `stdio` (`FILE*`) dan syscall (`fd`). Yang mana di atas yang mana?
4. Kenapa buffering ada? Apa trade-off-nya?
5. Kenapa `printf` tanpa `\n` kadang tak langsung muncul di terminal, tapi `fprintf(stderr, ...)` selalu muncul?
6. Kenapa output debug bisa "hilang" saat program crash, dan bagaimana cara mencegah salah-paham ini saat debugging?
7. Kapan kamu memilih syscall mentah ketimbang `stdio`? Sebutkan dua situasi.

---

Kita sudah memakai I/O untuk berbicara dengan kernel, dan kamu sudah beberapa kali melihat pola `if (... == -1) perror(...)`.

Di Bab 13, kita akan membahas **error handling di C**. Fokusnya adalah konvensi return value, variabel **`errno`**, fungsi `perror`/`strerror`, dan strategi menangani error di bahasa yang tidak punya exception.
