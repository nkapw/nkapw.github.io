---
title: "Bab 15 — Signals"
description: "Di Bab 14 kita melihat proses lahir, berubah wujud, dan selesai. Selama hidupnya, proses juga bisa menerima gangguan dari luar. Kamu bisa menekan Ctrl+C untuk..."
tags: [c, system-programming]
order: 15
updated: 2026-06-21
---

> "Signal itu seperti seseorang menepuk pundakmu saat kamu sedang fokus bekerja. Kamu terpaksa berhenti sejenak, menengok, menangani tepukan itu, lalu (kalau beruntung) kembali ke pekerjaanmu. Bedanya, tepukan ini bisa datang kapan saja — bahkan di tengah satu baris kode."

Di Bab 14 kita melihat proses lahir, berubah wujud, dan selesai. Selama hidupnya, proses juga bisa menerima gangguan dari luar. Kamu bisa menekan **Ctrl+C** untuk menghentikannya, menjalankan `kill` dari terminal, atau membuat kernel mengirim pemberitahuan karena proses melakukan akses memori ilegal (ingat segfault dari Bab 6). Mekanisme di balik semua ini adalah **signal**.

Signal adalah cara sederhana bagi satu proses, atau kernel, untuk memberi notifikasi ke proses lain. Ia adalah bentuk komunikasi dan kontrol yang asinkron. Bab ini juga memperdalam dua hal yang sudah kita temui, yaitu **function pointer** dari Bab 7, karena signal handler adalah callback, dan **segmentation fault** dari Bab 6, yang ternyata dikirim sebagai signal.

---

## 15.1 Apa itu signal?

> **Signal adalah notifikasi asinkron yang dikirim ke sebuah proses untuk memberitahukan bahwa suatu kejadian terjadi.** Bentuknya angka kecil. Tiap signal punya nomor dan nama, lalu bisa menginterupsi alur normal proses.

Kata kuncinya adalah **asinkron**. Signal bisa tiba **kapan saja**, tidak peduli proses sedang melakukan apa, bahkan di tengah-tengah sebuah perhitungan atau satu baris kode. Ini berbeda dari pemanggilan fungsi biasa yang urutannya kamu kendalikan.

Sifat asinkron inilah yang membuat signal berguna, tetapi juga membuat signal handler perlu ditulis sangat hati-hati (Bagian 15.6). Handler bisa berjalan pada saat program utama sedang berada di kondisi sementara yang belum stabil, misalnya saat library sedang mengubah buffer internal.

Saat signal tiba, proses bisa bereaksi dengan salah satu dari tiga cara.

1. **Default action** — perilaku bawaan signal itu (sering: terminate proses).
2. **Ignore** — abaikan signal (untuk signal yang boleh diabaikan).
3. **Catch / handle** — jalankan fungsi khusus buatanmu (**signal handler**) saat signal tiba.

Signal bisa dibayangkan seperti pemberitahuan mendadak dari luar proses. Untuk beberapa pemberitahuan, proses boleh mengabaikannya. Untuk yang lain, proses mengikuti perilaku default, misalnya berhenti. Proses juga bisa memasang rencana khusus, seperti menandai bahwa ia harus berhenti, lalu membiarkan alur utama menyimpan state atau menutup file sebelum keluar.

---

## 15.2 Signal-signal yang perlu dikenal

Ada puluhan signal. Tabel berikut berisi signal yang paling sering kamu temui.

| Signal | Nomor (umum) | Dipicu oleh | Default action |
|--------|--------------|-------------|----------------|
| `SIGINT` | 2 | Ctrl+C di terminal | terminate |
| `SIGTERM` | 15 | `kill <pid>` (default) | terminate (sopan) |
| `SIGKILL` | 9 | `kill -9 <pid>` | terminate — **tidak bisa ditangkap/diabaikan** |
| `SIGSEGV` | 11 | akses memori ilegal (dereference NULL/dangling!) | terminate + core dump |
| `SIGCHLD` | 17 | child process selesai (Bab 14!) | ignore |
| `SIGSTOP` | 19 | Ctrl+Z (suspend) | stop — **tidak bisa ditangkap** |
| `SIGALRM` | 14 | timer (`alarm()`) habis | terminate |
| `SIGPIPE` | 13 | menulis ke pipe yang ujungnya tertutup (Bab 16) | terminate |

Beberapa catatan penting perlu diperhatikan.

- **`SIGSEGV`** — inilah "Segmentation fault" yang sudah muncul sejak Bab 6. Saat kamu dereference `NULL` atau dangling pointer, **CPU (lewat MMU) mendeteksi akses memori ilegal dan memberitahu kernel, yang lalu mengirim `SIGSEGV` ke prosesmu.** Default action-nya adalah terminate proses dan membuat **core dump** jika dikonfigurasi. Core dump adalah snapshot memori untuk debugging (Bab 20). Jadi "segfault" sebenarnya adalah signal.

- **`SIGKILL` dan `SIGSTOP` tidak bisa ditangkap, diabaikan, atau di-handle.** Ini disengaja karena sistem perlu punya cara pasti untuk menghentikan proses yang tidak merespons. `kill -9` (`SIGKILL`) membuat proses langsung dihentikan kernel tanpa kesempatan membersihkan diri. Karena itu, kirim `SIGTERM` dulu agar proses punya kesempatan cleanup sebelum memakai `SIGKILL`.

- **`SIGTERM` vs `SIGKILL`** membedakan permintaan berhenti yang bisa ditangani dari penghentian paksa. `SIGTERM` adalah permintaan "tolong berhenti" yang **bisa** ditangkap, sehingga proses bisa menyimpan data dulu lalu keluar. `SIGKILL` adalah paksaan yang tidak bisa ditolak. `kill <pid>` mengirim `SIGTERM`; `kill -9 <pid>` mengirim `SIGKILL`.

---

## 15.3 Mengirim signal

Dari **terminal**, kamu bisa memakai perintah berikut.
```bash
kill <pid>          # kirim SIGTERM (default)
kill -9 <pid>       # kirim SIGKILL
kill -SIGINT <pid>  # kirim signal tertentu berdasarkan nama
# Ctrl+C  -> SIGINT ke proses foreground
# Ctrl+Z  -> SIGSTOP
```

Dari **dalam program**, fungsi terkait tersedia lewat `<signal.h>`.
```c
#include <signal.h>
int kill(pid_t pid, int sig);   // kirim signal 'sig' ke proses 'pid'
int raise(int sig);             // kirim signal ke proses sendiri
```

Walau namanya `kill`, fungsi ini sebenarnya berarti "kirim signal". Signal yang dikirim tidak harus mematikan proses. Namanya historis, dan memang agak menyesatkan. Ini cara satu proses memberi signal ke proses lain, termasuk parent memberi signal ke child, atau sebaliknya.

Perintah `kill` di shell dan fungsi `kill()` di C mengikuti gagasan yang sama. Keduanya mengirim signal ke target; apakah target berhenti atau tidak bergantung pada signal yang dikirim dan cara proses target menanganinya.

---

## 15.4 Menangkap signal: signal handler

Di sinilah function pointer dari Bab 7 muncul kembali. Kamu bisa mendaftarkan **signal handler**, yaitu fungsi yang dipanggil saat signal tiba. Fungsi ini adalah **callback**, dan kamu mendaftarkannya lewat alamat fungsi tersebut (function pointer).

Cara modern yang disarankan adalah **`sigaction`**, karena lebih portabel dan lebih terkontrol daripada fungsi lama `signal`.

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>

volatile sig_atomic_t berhenti = 0;   // flag (lihat Bagian 15.5 soal tipe ini)

void handler(int signo) {              // signal handler: terima nomor signal
    berhenti = 1;                      // hanya set flag (alasan di Bagian 15.6)
}

int main(void) {
    struct sigaction sa = {0};
    sa.sa_handler = handler;            // <- function pointer ke handler kita
    sigaction(SIGINT, &sa, NULL);       // daftarkan: "kalau SIGINT, panggil handler"

    printf("Tekan Ctrl+C untuk berhenti dengan rapi...\n");
    while (!berhenti) {
        printf("bekerja...\n");
        sleep(1);
    }
    printf("\nSIGINT diterima. Membersihkan & keluar dengan rapi.\n");
    return 0;
}
```

Jalankan program itu, lalu tekan **Ctrl+C**. Alih-alih langsung mati mengikuti default action `SIGINT`, handler berjalan dan men-set `berhenti = 1`. Loop berhenti pada iterasi berikutnya, lalu program keluar **dengan rapi**. Dalam program nyata, titik ini bisa dipakai untuk menyimpan data, mem-`free` memori, atau menutup file.

Kegunaan utama signal handler adalah *graceful shutdown*. Program menangkap `SIGINT` atau `SIGTERM` agar bisa membersihkan diri, seperti menutup file, menyimpan state, dan melepas resource, sebelum benar-benar berhenti.

`sa.sa_handler = handler` adalah inti hubungannya dengan Bab 7. Kamu menyimpan **alamat fungsi** ke field struct, lalu mekanisme signal akan memanggil balik fungsi itu lewat alamatnya saat signal tiba. Ini konsep callback yang sama.

Perhatikan bahwa handler pada contoh tidak melakukan cleanup langsung. Ia hanya mengubah flag. Cleanup tetap dilakukan setelah loop utama keluar, dalam konteks eksekusi normal. Pola ini sengaja dipakai karena handler bisa berjalan pada waktu yang tidak bisa diprediksi.

---

## 15.5 `volatile sig_atomic_t`: kenapa flag-nya tipe aneh

Perhatikan deklarasi `volatile sig_atomic_t berhenti`. Kenapa bukan `int` biasa? Jawabannya ada pada dua bagian tipe tersebut.

- **`volatile`** — memberitahu compiler bahwa variabel ini bisa berubah di luar alur normal program, yaitu oleh handler. Karena itu, compiler tidak boleh menganggap nilainya selalu sama hanya karena tidak terlihat berubah di loop utama. Tanpa `volatile`, compiler mungkin melihat loop `while (!berhenti)` di mana `berhenti` "tidak pernah diubah di dalam loop", lalu mengoptimasinya menjadi loop tanpa akhir (`while(true)`). Akibatnya, handler-mu tidak akan pernah menghentikan loop. `volatile` mencegah optimasi yang salah ini.

- **`sig_atomic_t`** — tipe yang dijamin bisa dibaca dan ditulis dalam **satu operasi atomik**, sehingga tidak terinterupsi di tengah operasi. Karena signal bisa tiba kapan saja, penulisan variabel multi-byte berisiko terlihat setengah-jadi kalau terpotong di tengah. `sig_atomic_t` menjamin operasi baca/tulisnya utuh untuk kebutuhan flag sederhana seperti ini.

Gabungan keduanya penting. `volatile` berbicara ke compiler tentang optimasi, sedangkan `sig_atomic_t` berbicara tentang operasi baca/tulis yang aman untuk flag kecil. Keduanya tidak membuat semua operasi di handler menjadi aman; mereka hanya cukup untuk pola sederhana "handler set flag, loop utama membaca flag".

Detail ini menunjukkan kenapa sifat **asinkron** signal membuat signal handler perlu diperlakukan secara khusus.

---

## 15.6 Async-safety: kenapa signal handler harus dibatasi

Ini bagian yang perlu dibaca dengan cermat. Karena signal bisa tiba **kapan saja**, signal juga bisa datang saat program sedang berada di tengah-tengah `malloc`, `printf`, atau fungsi library lain. Akibatnya, signal handler tidak boleh diperlakukan seperti fungsi biasa.

Bayangkan skenario ini. Program utamamu sedang berada di tengah-tengah `malloc`, yang sedang memanipulasi struktur internal heap (Bab 9). Tiba-tiba signal tiba, dan handler-mu juga memanggil `malloc`. Sekarang `malloc` dipanggil ulang **saat pemanggilan sebelumnya belum selesai**. Struktur internal heap bisa berada dalam keadaan sementara yang belum konsisten. Hasilnya bisa berupa crash atau korupsi. Ini disebut masalah **reentrancy**.

> **Aturan utama signal handler adalah melakukan sesedikit mungkin.** Idealnya handler hanya men-set flag `volatile sig_atomic_t` seperti contoh di atas, atau menulis satu byte ke pipe. Pekerjaan sebenarnya dilakukan oleh loop utama setelah ia melihat flag berubah.

Fungsi yang **aman** dipanggil dari signal handler disebut **async-signal-safe**. Daftarnya pendek dan spesifik, misalnya `write`, `_exit`, dan `kill`. Fungsi yang **tidak aman** justru mencakup banyak fungsi yang sering dipakai sehari-hari.

- **`printf` tidak aman** karena memakai buffer dan lock internal. Kalau dipanggil dari handler saat program utama sedang berada di tengah `printf` lain, hasilnya bisa deadlock atau korupsi state internal. Contoh di Bagian 15.4 memakai `printf` di `main`, bukan di handler, sehingga bagian itu aman. Yang perlu dihindari adalah `printf` **di dalam handler**. Kalau butuh output dari handler, pakai `write(1, "pesan\n", 6)` yang async-signal-safe.
- **`malloc`/`free` tidak aman** karena menyentuh struktur internal heap dan rentan terhadap masalah reentrancy.
- Banyak fungsi stdio & library lain juga tidak aman.

Cara aman berpikir tentang signal handler adalah menganggapnya sebagai interupsi singkat, bukan tempat untuk mengerjakan logika utama. Handler cukup meninggalkan tanda yang aman, misalnya flag, lalu segera keluar. Loop utama yang berjalan dalam konteks normal membaca tanda itu dan mengerjakan cleanup, logging, atau perubahan state yang lebih kompleks.

Inilah kenapa pola "handler hanya set flag, main loop yang bekerja" menjadi standar. Pola ini mengubah masalah asinkron yang berbahaya menjadi pengecekan sinkron yang aman.

---

## 15.7 `SIGCHLD`: menutup lingkaran zombie (Bab 14)

Ingat masalah zombie di Bab 14. Parent harus `wait` child, tetapi kalau parent sedang sibuk mengerjakan hal lain, ia tidak selalu bisa berhenti dan memblokir di `wait`. Signal memberi mekanisme untuk menangani kasus ini.

Saat child selesai, kernel mengirim **`SIGCHLD`** ke parent. Parent bisa memasang handler untuk `SIGCHLD` yang memanggil `waitpid` untuk "memanen" child dan mencegah zombie, tanpa harus memblokir di `wait`.

```c
#include <sys/wait.h>
void sigchld_handler(int signo) {
    // panen semua child yang sudah selesai, tanpa blocking
    while (waitpid(-1, NULL, WNOHANG) > 0)
        ;   // (waitpid & write async-signal-safe; ini idiom umum & diterima)
}
```

`WNOHANG` membuat `waitpid` tidak memblokir. Kalau tidak ada child yang siap dipanen, `waitpid` langsung return. Loop dipakai karena beberapa child bisa selesai hampir bersamaan, dan satu signal `SIGCHLD` tidak selalu berarti hanya satu child yang selesai. Handler perlu memanen semua child yang sudah siap agar tidak ada zombie yang tertinggal.

Ini pola standar di server yang mem-`fork` banyak worker. Parent tetap melayani pekerjaan utama, sementara `SIGCHLD` handler membereskan child yang selesai di latar belakang. Bagian ini menutup lingkaran dengan Bab 14.

---

## 15.8 Rangkuman model mental

1. **Signal** adalah notifikasi **asinkron** ke proses. Ia berupa angka kecil bernama dan bisa menginterupsi alur normal kapan saja, bahkan di tengah satu baris kode.
2. Proses punya tiga reaksi terhadap signal: mengikuti **default action**, mengabaikan signal dengan **ignore**, atau menangkapnya dengan **signal handler** buatan sendiri.
3. Signal penting yang perlu dikenali adalah `SIGINT` (Ctrl+C), `SIGTERM` (permintaan berhenti yang sopan), `SIGKILL` (`-9`, tidak bisa ditangkap), `SIGSEGV` (akses memori ilegal, sehingga "segfault" adalah signal), dan `SIGCHLD` (child selesai). `SIGKILL` dan `SIGSTOP` sengaja tidak bisa di-handle.
4. Signal bisa dikirim dari terminal dengan `kill` atau shortcut seperti Ctrl+C, dan dari program dengan `kill()` atau `raise()`. Untuk menghentikan proses dengan rapi, pakai `SIGTERM` sebelum memakai `SIGKILL`.
5. **Signal handler** adalah callback yang didaftarkan melalui `sigaction`, memakai konsep function pointer dari Bab 7. Kegunaan utamanya adalah *graceful shutdown*, yaitu memberi program kesempatan cleanup sebelum berhenti.
6. Karena signal asinkron, handler harus mengikuti aturan **async-signal-safety**. Lakukan sesedikit mungkin, idealnya hanya set flag `volatile sig_atomic_t`. `printf` dan `malloc` tidak aman di handler; pakai `write` kalau benar-benar perlu output. Pekerjaan sebenarnya dikerjakan oleh loop utama.
7. **`SIGCHLD` + `waitpid(WNOHANG)`** adalah pola untuk memanen child yang sudah selesai tanpa membuat parent memblokir terus. Pola ini mencegah zombie dan menutup pembahasan Bab 14.

---

## 15.9 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program loop tanpa akhir yang menangkap `SIGINT` (Ctrl+C) dengan handler yang men-set flag `volatile sig_atomic_t`, lalu keluar rapi sambil mencetak pesan. Tekan Ctrl+C dan amati ia tidak langsung mati.
2. Buktikan `SIGKILL` tidak bisa ditangkap: coba pasang handler untuk `SIGKILL` (bukan `SIGINT`). Jalankan, lalu dari terminal lain `kill -9 <pid>`. Apakah handler-mu jalan? Kenapa tidak?
3. Hubungkan segfault dengan signal: tulis program yang dereference NULL untuk memicu `SIGSEGV`. Lalu pasang handler untuk `SIGSEGV` yang mencetak (pakai `write`!) "tertangkap" lalu `_exit`. Apa yang terjadi?
4. Demonstrasikan kenapa `volatile` penting: tulis loop `while (!berhenti)` dengan `berhenti` sebagai `int` biasa (tanpa `volatile`), compile dengan `-O2`, dan lihat apakah Ctrl+C bisa menghentikannya. Lalu tambahkan `volatile` — ada bedanya?
5. Sengaja langgar async-safety: panggil `printf` di dalam signal handler dan kirim banyak signal cepat (atau panggil `malloc` di handler). Apakah kamu bisa membuatnya berperilaku aneh/crash? (Mungkin tidak selalu terlihat — justru itu bahayanya.)
6. Tulis handler yang aman menggunakan `write(STDOUT_FILENO, "ditangkap\n", 10)` alih-alih `printf`. Bandingkan.
7. (Lanjutan) Gabungkan dengan Bab 14: program yang mem-`fork` beberapa child, dan pasang handler `SIGCHLD` dengan `waitpid(-1, NULL, WNOHANG)` untuk memanen mereka. Buktikan tak ada zombie dengan `ps`.

**Pertanyaan refleksi:**

1. Apa arti "signal itu asinkron", dan kenapa sifat ini yang membuat signal handler rumit?
2. Apa tiga cara proses bereaksi terhadap signal? Beri contoh kapan kamu memilih masing-masing.
3. Kenapa `SIGKILL` dan `SIGSTOP` sengaja tidak bisa ditangkap? Apa implikasinya saat kamu ingin menghentikan proses dengan rapi vs paksa?
4. "Segmentation fault" ternyata adalah signal apa, dan siapa yang mengirimnya? Jelaskan rantai kejadiannya dari dereference NULL.
5. Kenapa `volatile sig_atomic_t` dipakai untuk flag signal, bukan `int` biasa? Apa peran masing-masing kata kunci?
6. Apa itu async-signal-safety? Kenapa `printf` dan `malloc` tidak aman dipanggil di handler? Apa pola yang aman?
7. Bagaimana `SIGCHLD` menyelesaikan masalah zombie dari Bab 14 tanpa memaksa parent berhenti untuk `wait`?

---

Signal adalah bentuk komunikasi antar proses yang sangat sederhana. Ia hanya memberi notifikasi, tanpa membawa data yang lebih lengkap. Namun, proses sering perlu benar-benar **bertukar data**, misalnya mengirim aliran byte atau berbagi memori. Karena tiap proses memiliki memori terisolasi (Bab 14), kebutuhan ini memerlukan mekanisme khusus. Di **Bab 16**, kita masuk ke **Inter-Process Communication (IPC)**. Kita akan membahas **pipe** yang menyambung output satu proses ke input proses lain seperti di balik `|` di shell, lalu FIFO dan shared memory.
