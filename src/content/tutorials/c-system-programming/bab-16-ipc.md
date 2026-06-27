---
title: "Bab 16 — Inter-Process Communication (IPC)"
description: "Di Bab 14 kita belajar fakta penting: tiap proses punya ruang memori terisolasi. Proses A tidak bisa membaca variabel proses B begitu saja. Ini bagus untuk keamanan..."
tags: [c, system-programming]
order: 16
updated: 2026-06-21
---

> "Dua proses hidup di ruang memori yang terpisah. Kalau keduanya perlu bertukar data, harus ada mekanisme yang disediakan sistem operasi: pipe, FIFO, shared memory, atau bentuk IPC lain."

Di Bab 14 kita belajar fakta penting: **tiap proses punya ruang memori terisolasi**. Proses A tidak bisa membaca variabel proses B begitu saja. Ini bagus untuk keamanan dan stabilitas, tetapi menimbulkan pertanyaan baru. Bagaimana kalau dua proses *memang perlu* bekerja sama dan bertukar data? Signal (Bab 15) hanya memberi notifikasi sederhana. Untuk benar-benar mengalirkan data, kita butuh **Inter-Process Communication (IPC)**.

Bab ini menjawab pertanyaan yang sering muncul saat memakai shell: **apa yang sebenarnya terjadi saat kamu mengetik `ls | grep .c`?** Tanda `|` itu adalah pipe, salah satu mekanisme IPC paling tua di UNIX. Kita akan melihat cara kerjanya di level file descriptor, lalu membangun versi sederhananya sendiri.

---

## 16.1 Peta mekanisme IPC

Ada beberapa cara proses berkomunikasi, masing-masing dengan trade-off berbeda.

| Mekanisme | Bentuk | Antar proses | Catatan |
|-----------|--------|--------------|---------|
| **Pipe** (anonymous) | aliran byte 1 arah | yang berkerabat (parent-child) | yang ada di balik `\|` shell |
| **FIFO** (named pipe) | aliran byte 1 arah | proses mana pun | punya nama di filesystem |
| **Shared memory** | memori bersama | proses mana pun | tercepat; butuh sinkronisasi sendiri |
| **Message queue** | pesan terstruktur | proses mana pun | berbasis pesan, bukan aliran |
| **Socket** | aliran/datagram 2 arah | bahkan lintas mesin | Bab 18 (networking) |
| **Signal** | notifikasi (tanpa data) | proses mana pun | Bab 15 |

Kita fokus pada tiga mekanisme yang paling mendasar untuk bab ini: **pipe**, **FIFO**, dan **shared memory**. Ketiganya mewakili dua pendekatan berbeda yang perlu kamu pahami.

Pipe dan FIFO memakai **aliran data**. Kernel menjadi perantara yang mengangkut byte dari satu proses ke proses lain. Shared memory memakai **memori bersama**. Dalam model ini, beberapa proses membaca dan menulis region memori yang sama secara langsung, sehingga koordinasinya menjadi tanggung jawab program.

---

## 16.2 Pipe: selang byte satu arah

**Pipe** adalah saluran byte searah di dalam kernel. Satu ujung dipakai untuk **menulis**, dan ujung lainnya dipakai untuk **membaca**. Apa yang ditulis di satu ujung bisa dibaca di ujung lain, sementara kernel mengurus buffer di tengahnya.

```c
#include <unistd.h>
int pipe(int fd[2]);   // buat pipe; isi fd[0]=ujung baca, fd[1]=ujung tulis
```

`pipe(fd)` mengisi array dua fd. Ingat file descriptor dari Bab 12; prinsip "everything is a file" juga berlaku di sini.

- **`fd[0]`** — ujung **baca** (read end).
- **`fd[1]`** — ujung **tulis** (write end).

Cara mengingatnya mengikuti fd standar: `0` seperti `stdin` (input/baca), sedangkan `1` seperti `stdout` (output/tulis).

Pipe bisa dibayangkan seperti saluran satu arah. Kamu menulis byte di ujung `fd[1]`, lalu byte itu mengalir dan bisa dibaca dari ujung `fd[0]`. Arah alirannya tidak berbalik. Kalau kamu butuh komunikasi dua arah, kamu biasanya membutuhkan dua pipe.

Pipe tidak membawa struktur pesan bawaan. Ia hanya mengalirkan byte. Kalau programmu ingin mengirim "pesan" yang punya batas jelas, kamu perlu membuat format sendiri di atas aliran byte itu, atau memilih mekanisme lain seperti message queue.

### Pipe sederhana dalam satu proses (untuk paham mekanismenya)

```c
#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main(void) {
    int fd[2];
    if (pipe(fd) == -1) { perror("pipe"); return 1; }

    const char *pesan = "Halo lewat pipe!";
    write(fd[1], pesan, strlen(pesan) + 1);   // tulis ke ujung tulis

    char buf[100];
    read(fd[0], buf, sizeof(buf));            // baca dari ujung baca
    printf("Diterima: %s\n", buf);            // Halo lewat pipe!

    close(fd[0]);
    close(fd[1]);
    return 0;
}
```

Kode ini memakai syscall `write` dan `read` biasa (Bab 12), karena pipe diperlakukan seperti file. Pipe dalam satu proses berguna untuk memahami mekanismenya, tetapi kegunaan utamanya muncul saat digabung dengan `fork`.

---

## 16.3 Pipe + fork: komunikasi parent-child

Inilah pola yang lebih nyata. Kunci memahaminya adalah perilaku `fork` dari Bab 14. Saat `fork`, child mewarisi salinan tabel file descriptor parent. Jadi setelah `fork`, parent dan child **sama-sama punya `fd[0]` dan `fd[1]` yang menunjuk pipe yang sama**. Pipe menjadi jembatan antara keduanya.

```c
#include <stdio.h>
#include <unistd.h>
#include <string.h>

int main(void) {
    int fd[2];
    if (pipe(fd) == -1) { perror("pipe"); return 1; }

    pid_t pid = fork();
    if (pid == -1) { perror("fork"); return 1; }

    if (pid == 0) {
        // child jadi penulis; tutup ujung baca yang tidak dipakai
        close(fd[0]);
        const char *pesan = "Salam dari child!";
        write(fd[1], pesan, strlen(pesan) + 1);
        close(fd[1]);
        _exit(0);
    } else {
        // parent jadi pembaca; tutup ujung tulis yang tidak dipakai
        close(fd[1]);
        char buf[100];
        read(fd[0], buf, sizeof(buf));
        printf("Parent menerima: %s\n", buf);   // Salam dari child!
        close(fd[0]);
        wait(NULL);   // panen child (Bab 14)
    }
    return 0;
}
```

### Kenapa harus menutup ujung yang tak dipakai?

Perhatikan child `close(fd[0])` dan parent `close(fd[1])`. Ini **bukan** sekadar kerapian. Ada dua alasan teknis yang membuat penutupan fd ini penting.

1. **Pipe searah punya peran jelas.** Di sini child adalah penulis, parent adalah pembaca. Child tidak butuh ujung baca; parent tidak butuh ujung tulis. Menutup yang tidak dipakai mencegah kebingungan dan fd leak.

2. **`read` tahu kapan berhenti hanya jika semua ujung tulis ditutup.** `read` pada pipe akan mengembalikan `0` (EOF, tanda "data habis") **hanya setelah semua write-end ditutup**. Kalau parent **tidak** menutup `fd[1]`-nya sendiri, write-end masih dianggap terbuka oleh parent. Akibatnya, `read` parent bisa **menggantung selamanya** menunggu data yang tidak akan pernah datang. Ini deadlock.

Aturannya sederhana: setiap proses harus menutup ujung pipe yang tidak ia gunakan. Aturan ini bukan hanya soal kebersihan resource, tetapi juga bagian dari protokol EOF pada pipe.

---

## 16.4 Membangun `ls | grep` sendiri

Sekarang kita terapkan pipe ke kasus yang sering kamu pakai. Saat kamu mengetik `ls | grep .c`, shell menjalankan `ls` dan `grep` sebagai **dua proses**, lalu menyambungkan **stdout `ls` ke stdin `grep`** lewat pipe. Caranya memakai `dup2`, yang menyambung ulang file descriptor.

`dup2(oldfd, newfd)` membuat `newfd` menjadi salinan `oldfd`, sehingga keduanya menunjuk hal yang sama. Bagian kuncinya adalah **`dup2(fd[1], STDOUT_FILENO)` membuat stdout (fd 1) menunjuk ke ujung tulis pipe**. Setelah itu, apa pun yang program tulis ke stdout, termasuk lewat `printf`, sebenarnya masuk ke pipe.

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    int fd[2];
    pipe(fd);

    if (fork() == 0) {
        // child 1 jadi "ls"; output-nya diarahkan ke ujung tulis pipe
        dup2(fd[1], STDOUT_FILENO);   // stdout -> pipe write end
        close(fd[0]); close(fd[1]);   // tutup fd asli (sudah diduplikasi ke stdout)
        execlp("ls", "ls", (char *)NULL);   // ls menulis ke "stdout" = pipe
        perror("execlp ls"); _exit(127);
    }

    if (fork() == 0) {
        // child 2 jadi "grep .c"; input-nya dari ujung baca pipe
        dup2(fd[0], STDIN_FILENO);    // stdin -> pipe read end
        close(fd[0]); close(fd[1]);
        execlp("grep", "grep", ".c", (char *)NULL);   // grep membaca dari "stdin" = pipe
        perror("execlp grep"); _exit(127);
    }

    // parent menutup kedua ujung; parent tidak ikut komunikasi
    close(fd[0]); close(fd[1]);
    wait(NULL); wait(NULL);
    return 0;
}
```

Jalankan program ini. Outputnya sama dengan `ls | grep .c` di shell. Inilah pola yang dipakai shell setiap kali kamu memakai `|`, dan pola ini menyatukan beberapa konsep dari bab sebelumnya.

- **`ls` tidak tahu** outputnya pergi ke pipe alih-alih layar. Ia hanya menulis ke stdout (fd 1) seperti biasa. `dup2` yang mengarahkan fd 1 ke pipe. Inilah kekuatan abstraksi "everything is a file" (Bab 12): `ls` tidak peduli ujungnya layar, file, atau pipe.
- **`grep` tidak tahu** inputnya datang dari pipe. Ia hanya membaca stdin (fd 0). Karena itu tool UNIX bisa disambung lewat `|`; masing-masing cukup berbicara dengan stdin/stdout, tanpa perlu tahu siapa di ujung sana.
- Parent (shell) menutup kedua ujung dan menunggu. Ini pola Bab 14 ditambah aturan `close` dari Bagian 16.3.

Filosofi UNIX yang sering disebut "tiap program melakukan satu hal dengan baik, lalu disambung lewat pipe" punya mekanisme konkret di level syscall. Shell membuat pipe, membuat proses dengan `fork`, menyambung fd dengan `dup2`, menjalankan program dengan `exec`, lalu menunggu dengan `wait`.

---

## 16.5 FIFO (named pipe): pipe yang punya nama

Pipe biasa (`pipe()`) bersifat **anonymous**. Ia mudah dibagi antar proses yang **berkerabat** lewat `fork`, karena fd-nya diwariskan. Namun, ada kasus lain. Dua proses yang **sama sekali tidak berkerabat**, misalnya dijalankan dari terminal berbeda, juga bisa saja perlu berkomunikasi lewat saluran mirip pipe.

Solusinya adalah **FIFO** (First In First Out), alias **named pipe**. Ia seperti pipe, tetapi punya **nama di filesystem**. Karena punya nama, proses mana pun bisa membukanya lewat path tersebut, seperti membuka file biasa.

```c
#include <sys/stat.h>
mkfifo("/tmp/saluran", 0666);   // buat named pipe di filesystem
```

Atau dari terminal: `mkfifo /tmp/saluran`. Setelah itu:

```c
// Proses A (penulis) — di satu terminal
FILE *f = fopen("/tmp/saluran", "w");
fprintf(f, "Halo lewat FIFO!\n");
fclose(f);

// Proses B (pembaca) — di terminal lain, proses terpisah
FILE *f = fopen("/tmp/saluran", "r");
char buf[100];
fgets(buf, sizeof(buf), f);
printf("Diterima: %s", buf);
fclose(f);
```

Kamu bahkan bisa mencobanya tanpa C. Jalankan `mkfifo /tmp/s`, lalu di satu terminal jalankan `cat > /tmp/s` dan di terminal lain jalankan `cat /tmp/s`. Apa yang kamu ketik di terminal pertama akan muncul di terminal kedua.

Walau FIFO muncul sebagai "file" di filesystem (`ls -l` menampilkannya dengan tipe `p`), ia **bukan file biasa**. Tidak ada data yang disimpan permanen di disk. FIFO tetap pipe, yaitu saluran di kernel. Nama filesystem-nya hanya menjadi titik temu agar proses yang tidak berkerabat bisa menemukannya.

Ada satu perilaku penting yang sering mengejutkan saat pertama kali memakai FIFO. Membuka FIFO untuk baca akan **memblokir** sampai ada proses yang membuka untuk tulis, dan sebaliknya. Keduanya harus hadir agar aliran data terjadi. Ini berbeda dari file biasa, yang bisa dibuka untuk baca tanpa menunggu proses lain.

Kalau pipe anonymous hanya mudah dibagi dalam keluarga proses parent-child, FIFO menyediakan titik temu dengan **alamat publik** seperti `/tmp/saluran`. Siapa pun yang punya izin dan tahu path-nya bisa membuka saluran itu.

---

## 16.6 Shared memory: berbagi papan tulis (tercepat)

Pipe dan FIFO mengalirkan data **lewat kernel**. Tiap byte disalin dari proses penulis ke buffer kernel, lalu dari kernel ke proses pembaca. Untuk data besar atau komunikasi yang sangat sering, penyalinan ini bisa menjadi overhead. **Shared memory** memakai pendekatan yang berbeda.

> **Shared memory membuat sepetak memori fisik yang sama dipetakan ke ruang alamat virtual beberapa proses sekaligus. Mereka benar-benar membaca dan menulis memori yang sama, tanpa perantara kernel untuk setiap akses.**

Ingat Bab 14: tiap proses punya ruang virtual terisolasi. Shared memory adalah pengecualian yang disengaja. Kernel memetakan satu region fisik ke dalam ruang virtual dua proses atau lebih. Alamat virtualnya bisa berbeda di tiap proses, tetapi mengarah ke memori fisik yang sama. Apa yang ditulis proses A ke region itu langsung terlihat oleh proses B, karena backing memory-nya memang sama.

Ini biasanya menjadi **mekanisme IPC tercepat** karena tidak ada penyalinan data antar proses untuk setiap akses; mereka langsung mengakses memori bersama. Trade-off-nya adalah kamu kehilangan koordinasi otomatis yang diberikan pipe.

Shared memory bisa dibayangkan seperti papan tulis yang terlihat dari dua ruangan. Proses A menulis di papan, proses B langsung melihatnya tanpa ada yang mengantar pesan. Ini cepat, tetapi juga menimbulkan masalah. Kalau A dan B menulis di tempat yang sama **bersamaan**, hasil akhirnya bisa kacau.

### Masalah sinkronisasi (intip Bab 17)

Inilah harga shared memory. Karena dua proses bisa mengakses memori yang sama **kapan saja dan bersamaan**, kamu bisa terkena **race condition**. Hasil program bergantung pada "siapa kebetulan menulis duluan", dan urutan itu tidak terprediksi.

Pipe tidak punya masalah yang sama dalam bentuk ini karena kernel men-serialize aliran byte. Shared memory, sebaliknya, memberi akses langsung. Kecepatan itu datang bersama tanggung jawab koordinasi yang lebih besar.

Kamu butuh mekanisme **sinkronisasi** seperti semaphore atau mutex untuk mengatur giliran akses. Konsep race condition dan mutex akan dibahas lebih lengkap di Bab 17 (threads), tetapi prinsipnya sama: **memori yang dibagi butuh aturan giliran.**

### Gambaran API (POSIX shared memory)

```c
#include <sys/mman.h>
#include <fcntl.h>

// 1. buat/buka objek shared memory bernama
int shm_fd = shm_open("/objku", O_CREAT | O_RDWR, 0666);
ftruncate(shm_fd, 4096);                 // set ukurannya

// 2. petakan ke ruang alamat proses -> dapat pointer biasa!
void *ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, shm_fd, 0);

// 3. pakai 'ptr' seperti memori biasa — tapi proses lain yang mmap objek
//    yang sama akan melihat perubahan yang sama
strcpy((char *)ptr, "data bersama");

// 4. selesai
munmap(ptr, 4096);
close(shm_fd);             // tutup fd-nya
shm_unlink("/objku");      // hapus objek shared memory dari sistem
```

Yang menarik adalah setelah `mmap`, kamu mendapat **pointer biasa** (`ptr`) yang dipakai seperti memori normal (Bab 6 dan Bab 9). Bedanya, memori di balik pointer itu dibagi dengan proses lain. `mmap` (memory map) sendiri adalah syscall penting yang juga dipakai untuk memetakan file ke memori dan, seperti disebut di Bab 9, oleh `malloc` untuk mengambil wilayah besar dari kernel.

Kamu tidak perlu menghafal detail API-nya sekarang. Yang penting adalah model mentalnya. Ada satu memori fisik yang dipetakan ke banyak proses, aksesnya langsung, dan setiap akses bersama membutuhkan aturan sinkronisasi.

---

## 16.7 Memilih mekanisme IPC

Panduan praktis berikut bisa dipakai untuk memilih mekanisme IPC.

- **Pipe** — komunikasi searah sederhana antara parent-child; aliran data; tidak perlu koordinasi rumit. Default untuk "sambung output ke input".
- **FIFO** — sama seperti pipe, tetapi antara proses tidak berkerabat yang bisa menyepakati sebuah nama path.
- **Shared memory** — data besar atau performa kritis di mana penyalinan lewat kernel terlalu mahal; siap mengelola sinkronisasi sendiri.
- **Message queue** — saat kamu butuh batas pesan yang jelas (bukan aliran byte mentah) dengan prioritas.
- **Socket** (Bab 18) — komunikasi dua arah, terutama kalau ada kemungkinan lintas mesin.

Prinsip umumnya adalah **mulai dari mekanisme paling sederhana yang cukup**. Sering kali pipe sudah memadai. Naik ke shared memory hanya saat performa benar-benar menuntutnya, dan saat kamu siap mengelola kompleksitas sinkronisasi.

---

## 16.8 Rangkuman model mental

1. Karena memori proses terisolasi (Bab 14), proses membutuhkan **IPC** untuk bertukar data. Dua pendekatan besarnya adalah **aliran data lewat kernel** seperti pipe/FIFO dan **berbagi memori langsung** seperti shared memory.
2. **Pipe** adalah saluran byte searah di kernel. `pipe(fd)` menghasilkan `fd[0]` sebagai ujung baca dan `fd[1]` sebagai ujung tulis. Karena pipe diperlakukan seperti file, proses memakai `read` dan `write` biasa.
3. **Pipe + fork** memungkinkan komunikasi parent-child karena child mewarisi fd pipe dari parent. Tiap proses harus menutup ujung yang tidak dipakai; kalau tidak, `read` bisa tidak pernah mendapat EOF dan program mengalami deadlock.
4. **`|` di shell** dibangun dari `pipe`, `fork`, `dup2`, `exec`, dan `wait`. Shell menyambung stdout proses pertama ke stdin proses kedua. Masing-masing program tetap hanya berbicara lewat stdin/stdout, sehingga tidak perlu tahu ada pipe di antaranya.
5. **FIFO (named pipe)** adalah pipe dengan nama di filesystem (`mkfifo`). Nama ini memungkinkan proses yang tidak berkerabat saling menemukan saluran. FIFO bukan file biasa; data tetap mengalir lewat kernel.
6. **Shared memory** (`mmap`/`shm_open`) memetakan satu memori fisik ke banyak proses. Mekanisme ini sangat cepat karena tidak menyalin data per akses dan bisa dipakai lewat pointer biasa. Namun, shared memory rawan **race condition** sehingga membutuhkan **sinkronisasi** (Bab 17).

---

## 16.9 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Buat pipe dalam satu proses (Bagian 16.2): tulis sebuah string ke `fd[1]`, baca dari `fd[0]`, cetak. Pastikan jalan.
2. Buat komunikasi parent→child lewat pipe + fork: parent menulis, child membaca & mencetak. Lalu balik arahnya (child menulis, parent membaca).
3. Demonstrasikan deadlock: di program pipe+fork, **lupa** menutup write-end di pembaca. Apakah `read` menggantung selamanya? Lalu perbaiki dengan `close` yang benar — jelaskan kenapa berhasil.
4. Bangun `ls | grep .c` versimu sendiri (Bagian 16.4). Bandingkan output-nya dengan `ls | grep .c` asli di shell. Lalu modifikasi jadi `ls | wc -l`.
5. Buat FIFO dengan `mkfifo /tmp/s` di terminal, lalu uji dengan dua `cat` di dua terminal (`cat > /tmp/s` dan `cat /tmp/s`). Amati. Lalu tulis versi C-nya (penulis & pembaca terpisah).
6. (Lanjutan) Coba contoh shared memory: dua program terpisah, satu menulis ke `mmap`-ed shared memory, satu membacanya. Buktikan perubahan dari satu proses terlihat oleh yang lain.
7. (Eksperimen race) Di shared memory, buat dua proses sama-sama menambah sebuah counter bersama ribuan kali tanpa sinkronisasi. Apakah hasil akhirnya sesuai harapan? Kenapa tidak? (Pengantar Bab 17.)

**Pertanyaan refleksi:**

1. Kenapa proses butuh IPC, padahal fungsi biasa bisa berbagi variabel? Akar masalahnya di konsep Bab 14 yang mana?
2. Apa beda filosofis antara pipe (aliran lewat kernel) dan shared memory (berbagi langsung)? Apa trade-off masing-masing?
3. Kenapa setiap proses harus menutup ujung pipe yang tidak dipakai? Apa akibat kalau lupa?
4. Jelaskan langkah demi langkah apa yang terjadi saat shell menjalankan `ls | grep .c`. Peran `pipe`, `fork`, `dup2`, `exec` masing-masing apa?
5. Kenapa `ls` "tidak tahu" outputnya masuk ke pipe? Bagaimana ini mencerminkan filosofi "everything is a file"?
6. Apa beda pipe anonim dan FIFO? Kapan kamu butuh FIFO?
7. Kenapa shared memory tercepat, tapi juga paling "berbahaya"? Masalah apa yang ia timbulkan yang tidak ada di pipe?

---

Kita sudah bisa membuat banyak proses bekerja sama. Namun, proses relatif berat. Ia punya ruang memori sendiri, biaya pembuatannya lebih besar, dan komunikasinya membutuhkan IPC. Kalau kita ingin **banyak alur eksekusi dalam satu proses** yang berbagi memori secara langsung, konsep berikutnya adalah **thread**. Di **Bab 17**, kita masuk ke **threads & concurrency**. Kita akan membahas `pthreads`, kenapa berbagi memori antar-thread itu mudah sekaligus berbahaya (**race condition**), dan cara mengatur giliran akses dengan **mutex**.
