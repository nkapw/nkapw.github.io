---
title: "Bab 15 - Signal"
description: "Pada Bab 14, proses dibahas sebagai program yang sedang berjalan dengan ruang memori, file descriptor, dan state eksekusi sendiri. Selama berjalan, proses dapat..."
tags: [c, systems-programming]
order: 15
updated: 2026-07-02
---
Pada Bab 14, proses dibahas sebagai program yang sedang berjalan dengan ruang memori, file descriptor, dan state eksekusi sendiri. Selama berjalan, proses dapat menerima pemberitahuan dari kernel, terminal, atau proses lain. Mekanisme pemberitahuan tersebut disebut signal.

Signal digunakan untuk banyak kejadian penting. Saat pengguna menekan Ctrl+C, proses foreground menerima `SIGINT`. Saat sebuah proses dihentikan dengan perintah `kill`, proses tersebut menerima signal. Saat program mengakses memori yang tidak valid, kernel mengirim `SIGSEGV`. Dengan memahami signal, kita dapat memahami cara proses dihentikan, diberi tahu, atau diminta membersihkan resource sebelum keluar.

---

## 15.1 Pengertian Signal

Signal adalah notifikasi asinkron yang dikirim ke proses untuk memberitahukan bahwa suatu kejadian terjadi. Setiap signal memiliki nomor dan nama. Signal dapat datang dari kernel, terminal, atau proses lain.

Kata asinkron penting karena signal dapat tiba di luar alur normal program. Program tidak memanggil signal seperti memanggil fungsi biasa. Signal dapat tiba ketika proses sedang menjalankan perhitungan, memanggil fungsi pustaka, menunggu I/O, atau berada di bagian lain dari kode.

Ketika signal diterima, proses dapat bereaksi dengan beberapa cara.

1. Mengikuti aksi bawaan signal.
2. Mengabaikan signal jika signal tersebut boleh diabaikan.
3. Menangkap signal dengan signal handler.

Signal handler adalah fungsi yang didaftarkan oleh program untuk dijalankan ketika signal tertentu diterima. Konsep ini berkaitan langsung dengan function pointer yang sudah dibahas pada Bab 7, karena alamat fungsi handler disimpan dan dipanggil kembali saat signal datang.

---

## 15.2 Signal yang Sering Dipakai

Berikut beberapa signal yang sering ditemui pada pemrograman sistem.

| Signal | Nomor umum | Pemicu | Aksi bawaan |
|--------|------------|--------|-------------|
| `SIGINT` | 2 | Ctrl+C pada terminal | Mengakhiri proses |
| `SIGTERM` | 15 | `kill <pid>` tanpa opsi khusus | Mengakhiri proses |
| `SIGKILL` | 9 | `kill -9 <pid>` | Mengakhiri proses secara paksa |
| `SIGSEGV` | 11 | Akses memori tidak valid | Mengakhiri proses dan dapat membuat core dump |
| `SIGCHLD` | 17 | Child process selesai | Biasanya diabaikan |
| `SIGSTOP` | 19 | Penghentian proses sementara | Menghentikan proses sementara |
| `SIGALRM` | 14 | Timer dari `alarm` habis | Mengakhiri proses |
| `SIGPIPE` | 13 | Menulis ke pipe yang ujung bacanya tertutup | Mengakhiri proses |

`SIGSEGV` adalah signal yang muncul ketika program melakukan akses memori ilegal. Contohnya adalah dereference pointer `NULL`, memakai dangling pointer, atau mengakses alamat yang tidak dimiliki proses. CPU dan MMU mendeteksi pelanggaran tersebut, kernel menerimanya, lalu kernel mengirim `SIGSEGV` ke proses.

`SIGTERM` adalah permintaan penghentian yang masih dapat ditangani oleh proses. Program dapat menangkap signal ini untuk menutup file, menyimpan state, atau membersihkan resource sebelum keluar.

`SIGKILL` tidak dapat ditangkap, diabaikan, atau ditangani. Kernel langsung menghentikan proses. Karena proses tidak mendapat kesempatan membersihkan resource internal, `SIGKILL` sebaiknya dipakai sebagai langkah terakhir setelah `SIGTERM` tidak berhasil.

`SIGSTOP` juga tidak dapat ditangkap atau diabaikan. Signal ini menghentikan proses sementara dan biasanya dikendalikan oleh job control pada shell.

---

## 15.3 Mengirim Signal

Signal dapat dikirim dari terminal.

```bash
kill <pid>
kill -9 <pid>
kill -SIGINT <pid>
```

Perintah `kill <pid>` mengirim `SIGTERM` secara default. Perintah `kill -9 <pid>` mengirim `SIGKILL`. Pengguna juga dapat menekan Ctrl+C untuk mengirim `SIGINT` ke proses foreground pada terminal.

Signal juga dapat dikirim dari program C.

```c
#include <signal.h>

int kill(pid_t pid, int sig);
int raise(int sig);
```

Fungsi `kill` mengirim signal ke proses dengan PID tertentu. Walaupun namanya `kill`, fungsi ini tidak selalu berarti mematikan proses. Signal yang dikirim ditentukan oleh argumen `sig`.

Fungsi `raise` mengirim signal ke proses itu sendiri. Fungsi ini sering dipakai untuk pengujian atau untuk memicu perilaku signal secara eksplisit dari dalam program.

---

## 15.4 Menangkap Signal dengan `sigaction`

Program dapat memasang signal handler untuk menangani signal tertentu. Cara yang disarankan adalah memakai `sigaction`, karena perilakunya lebih jelas dan lebih portabel daripada fungsi lama `signal`.

```c
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

volatile sig_atomic_t berhenti = 0;

void handler(int signo) {
    (void)signo;
    berhenti = 1;
}

int main(void) {
    struct sigaction sa = {0};
    sa.sa_handler = handler;
    sigemptyset(&sa.sa_mask);

    if (sigaction(SIGINT, &sa, NULL) == -1) {
        perror("sigaction");
        return 1;
    }

    printf("Tekan Ctrl+C untuk berhenti\n");

    while (!berhenti) {
        printf("bekerja\n");
        sleep(1);
    }

    printf("SIGINT diterima, program keluar dengan rapi\n");
    return 0;
}
```

Pada contoh tersebut, handler hanya mengubah flag `berhenti`. Loop utama membaca flag tersebut dan melakukan pekerjaan yang aman setelah signal diterima. Pola ini jauh lebih aman daripada melakukan banyak operasi langsung di dalam handler.

Field `sa.sa_handler` menyimpan alamat fungsi handler. Ini adalah pemakaian function pointer dalam konteks sistem operasi. Ketika `SIGINT` tiba, kernel dan runtime memanggil fungsi yang alamatnya sudah didaftarkan.

---

## 15.5 `volatile sig_atomic_t`

Flag yang dibaca oleh kode utama dan ditulis oleh signal handler sebaiknya memakai tipe `volatile sig_atomic_t`.

`volatile` memberi tahu compiler bahwa nilai variabel dapat berubah di luar alur normal program. Tanpa `volatile`, compiler dapat melakukan optimasi yang menganggap nilai flag tidak berubah di dalam loop, sehingga perubahan dari handler tidak terlihat seperti yang diharapkan.

`sig_atomic_t` adalah tipe yang dijamin dapat dibaca dan ditulis secara atomik untuk kebutuhan signal handler. Karena signal dapat tiba kapan saja, program perlu memakai tipe yang aman untuk operasi sederhana seperti mengubah flag.

Pemakaian yang disarankan adalah menulis nilai sederhana di handler, lalu membiarkan loop utama melakukan pekerjaan yang lebih kompleks.

```c
volatile sig_atomic_t berhenti = 0;

void handler(int signo) {
    (void)signo;
    berhenti = 1;
}
```

---

## 15.6 Async-signal-safety

Signal handler berjalan dalam konteks yang terbatas. Karena signal dapat tiba ketika program sedang menjalankan fungsi pustaka, handler tidak boleh memanggil sembarang fungsi.

Masalah utamanya adalah reentrancy. Jika program utama sedang berada di dalam `malloc`, lalu signal datang dan handler juga memanggil `malloc`, fungsi `malloc` dapat dipanggil ulang saat struktur internalnya belum selesai diperbarui. Hal yang sama dapat terjadi pada fungsi yang memakai lock, buffer internal, atau state global.

Fungsi yang aman dipanggil dari signal handler disebut async-signal-safe. Daftar fungsi yang aman relatif terbatas. Contoh fungsi yang umum dipakai adalah `write`, `_exit`, dan `kill`.

Fungsi berikut tidak aman dipanggil dari handler.

- `printf`
- `fprintf`
- `malloc`
- `free`
- Banyak fungsi stdio dan fungsi pustaka lain

Jika handler perlu memberi tanda ke program utama, cukup ubah flag bertipe `volatile sig_atomic_t`. Jika benar-benar perlu menulis pesan, gunakan `write` dengan buffer statis.

```c
#include <signal.h>
#include <unistd.h>

void handler(int signo) {
    (void)signo;
    write(STDOUT_FILENO, "signal diterima\n", 16);
}
```

Pola yang paling aman adalah membuat handler sesingkat mungkin. Handler memberi tanda, lalu kode utama yang melakukan cleanup, logging, alokasi memori, penutupan file, dan pekerjaan lain yang tidak aman dilakukan di handler.

---

## 15.7 `SIGCHLD` dan Child Process

Bab 14 menjelaskan bahwa parent perlu memanggil `wait` atau `waitpid` untuk mengambil status child. Jika tidak, child yang sudah selesai dapat menjadi zombie process.

Kernel mengirim `SIGCHLD` ke parent ketika child selesai. Parent dapat memasang handler untuk signal ini agar child yang selesai dapat segera diambil statusnya tanpa membuat parent berhenti menunggu secara blocking.

```c
#include <signal.h>
#include <sys/wait.h>

void sigchld_handler(int signo) {
    (void)signo;

    while (waitpid(-1, NULL, WNOHANG) > 0) {
    }
}
```

`waitpid` dengan `WNOHANG` tidak memblokir jika belum ada child yang selesai. Loop dipakai karena satu signal `SIGCHLD` dapat mewakili lebih dari satu child yang selesai dalam waktu berdekatan.

Pola ini sering dipakai pada server yang membuat banyak child process. Parent tetap dapat melanjutkan pekerjaan utamanya, sementara child yang selesai tetap diambil statusnya agar tidak menjadi zombie.

Dalam kode produksi, handler `SIGCHLD` tetap perlu ditulis hati-hati. Periksa error dari `waitpid` jika dibutuhkan, simpan `errno` jika perlu, dan hindari operasi yang tidak async-signal-safe.

---

## 15.8 Rangkuman Model Mental

1. Signal adalah notifikasi asinkron ke proses.
2. Signal dapat berasal dari kernel, terminal, atau proses lain.
3. Proses dapat mengikuti aksi bawaan, mengabaikan signal tertentu, atau menangkap signal dengan handler.
4. `SIGINT` biasanya berasal dari Ctrl+C.
5. `SIGTERM` adalah permintaan penghentian yang dapat ditangani.
6. `SIGKILL` dan `SIGSTOP` tidak dapat ditangkap atau diabaikan.
7. `SIGSEGV` muncul ketika proses melakukan akses memori ilegal.
8. Signal dapat dikirim dengan perintah `kill`, fungsi `kill`, atau fungsi `raise`.
9. `sigaction` adalah cara yang disarankan untuk memasang signal handler.
10. Handler sebaiknya hanya melakukan pekerjaan minimal seperti mengubah flag `volatile sig_atomic_t`.
11. `printf`, `malloc`, dan banyak fungsi pustaka lain tidak aman dipanggil dari handler.
12. `SIGCHLD` dapat dipakai bersama `waitpid(WNOHANG)` untuk mengambil status child tanpa blocking.

---

## 15.9 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Tulis program loop yang menangkap `SIGINT` dengan `sigaction`, mengubah flag `volatile sig_atomic_t`, lalu keluar dengan rapi dari loop utama.
2. Coba pasang handler untuk `SIGKILL`, lalu kirim `kill -9 <pid>` dari terminal lain. Amati bahwa handler tidak berjalan.
3. Tulis program yang melakukan dereference pointer `NULL` untuk memicu `SIGSEGV`. Setelah itu, pasang handler sederhana yang memakai `write` dan `_exit`.
4. Bandingkan flag bertipe `int` biasa dengan `volatile sig_atomic_t` pada program loop yang dikompilasi dengan optimasi.
5. Buat contoh handler yang memakai `write` untuk menulis pesan singkat ketika signal diterima.
6. Buat program yang memanggil `fork` beberapa kali, lalu pasang handler `SIGCHLD` dengan `waitpid(-1, NULL, WNOHANG)` untuk mencegah zombie.
7. Gunakan `ps` untuk memeriksa apakah child yang selesai masih muncul sebagai `<defunct>`.

### Pertanyaan Refleksi

1. Apa arti asinkron pada signal.
2. Mengapa sifat asinkron membuat signal handler harus ditulis sangat hati-hati.
3. Apa perbedaan `SIGTERM` dan `SIGKILL`.
4. Mengapa `SIGKILL` dan `SIGSTOP` tidak dapat ditangkap.
5. Bagaimana akses memori ilegal dapat berubah menjadi `SIGSEGV`.
6. Mengapa `volatile sig_atomic_t` lebih tepat daripada `int` biasa untuk flag handler.
7. Apa yang dimaksud async-signal-safe.
8. Mengapa `printf` dan `malloc` tidak aman dipanggil dari signal handler.
9. Bagaimana `SIGCHLD` membantu parent mencegah zombie process.

---

Signal memberi proses cara menerima pemberitahuan asinkron. Bab 16 akan membahas komunikasi antar proses yang membawa data secara lebih eksplisit, termasuk pipe, FIFO, dan shared memory.

