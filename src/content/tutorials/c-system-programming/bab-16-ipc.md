---
title: "Bab 16 - Inter-Process Communication"
description: "Setiap proses memiliki ruang memori sendiri. Isolasi ini penting untuk keamanan dan stabilitas, tetapi membuat proses tidak dapat bertukar data hanya dengan berbagi..."
tags: [c, systems-programming]
order: 16
updated: 2026-07-02
---
Setiap proses memiliki ruang memori sendiri. Isolasi ini penting untuk keamanan dan stabilitas, tetapi membuat proses tidak dapat bertukar data hanya dengan berbagi variabel biasa. Ketika dua proses perlu bekerja sama, keduanya membutuhkan mekanisme Inter-Process Communication atau IPC.

Signal pada Bab 15 dapat memberi pemberitahuan asinkron, tetapi tidak cocok untuk mengirim aliran data. IPC menyediakan cara yang lebih jelas untuk mengirim byte, berbagi memori, atau menukar pesan antar proses.

Bab ini membahas tiga mekanisme penting. Pipe digunakan untuk mengalirkan data antar proses yang berkerabat. FIFO menyediakan pipe bernama yang dapat dipakai proses yang tidak berkerabat. Shared memory memungkinkan beberapa proses mengakses region memori yang sama.

---

## 16.1 Gambaran Mekanisme IPC

Ada beberapa mekanisme IPC dengan karakteristik berbeda.

| Mekanisme | Bentuk komunikasi | Proses yang dapat memakai | Catatan |
|-----------|-------------------|---------------------------|---------|
| Pipe anonim | Aliran byte satu arah | Biasanya parent dan child | Dipakai oleh operator `|` pada shell |
| FIFO | Aliran byte satu arah | Proses yang mengetahui path FIFO | Memiliki nama di filesystem |
| Shared memory | Region memori bersama | Proses yang memetakan objek yang sama | Cepat, tetapi butuh sinkronisasi |
| Message queue | Pesan terstruktur | Proses yang memakai queue yang sama | Cocok untuk batas pesan yang jelas |
| Socket | Aliran atau datagram dua arah | Proses lokal atau lintas mesin | Dipakai pada jaringan |
| Signal | Notifikasi asinkron | Proses yang dapat mengirim signal | Tidak cocok untuk data besar |

Pipe dan FIFO memindahkan data melalui kernel. Proses penulis menulis byte, kernel menampungnya, lalu proses pembaca mengambil byte tersebut. Shared memory memakai pendekatan berbeda. Kernel memetakan region fisik yang sama ke beberapa proses, sehingga proses dapat membaca dan menulis langsung ke area yang sama.

---

## 16.2 Pipe Anonim

Pipe anonim adalah saluran byte satu arah yang dibuat oleh kernel. Pipe memiliki satu ujung baca dan satu ujung tulis.

```c
#include <unistd.h>

int pipe(int fd[2]);
```

Jika berhasil, `pipe` mengisi dua file descriptor.

- `fd[0]` adalah ujung baca.
- `fd[1]` adalah ujung tulis.

Pipe diperlakukan seperti file descriptor biasa. Program memakai `read` untuk membaca dari ujung baca dan `write` untuk menulis ke ujung tulis.

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main(void) {
    int fd[2];

    if (pipe(fd) == -1) {
        perror("pipe");
        return 1;
    }

    const char *pesan = "Halo lewat pipe";
    if (write(fd[1], pesan, strlen(pesan) + 1) == -1) {
        perror("write");
        close(fd[0]);
        close(fd[1]);
        return 1;
    }

    char buf[100];
    if (read(fd[0], buf, sizeof(buf)) == -1) {
        perror("read");
        close(fd[0]);
        close(fd[1]);
        return 1;
    }

    printf("Diterima %s\n", buf);

    close(fd[0]);
    close(fd[1]);
    return 0;
}
```

Contoh tersebut hanya menunjukkan mekanisme dasar. Pipe menjadi lebih berguna ketika digunakan bersama `fork`, karena child mewarisi file descriptor milik parent.

---

## 16.3 Pipe Bersama `fork`

Ketika proses memanggil `fork`, child menerima salinan tabel file descriptor parent. Jika parent membuat pipe sebelum `fork`, parent dan child sama-sama memiliki file descriptor yang menunjuk ke pipe yang sama. Hal ini memungkinkan keduanya bertukar data.

```c
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    int fd[2];

    if (pipe(fd) == -1) {
        perror("pipe");
        return 1;
    }

    pid_t pid = fork();
    if (pid == -1) {
        perror("fork");
        close(fd[0]);
        close(fd[1]);
        return 1;
    }

    if (pid == 0) {
        close(fd[0]);

        const char *pesan = "Salam dari child";
        write(fd[1], pesan, strlen(pesan) + 1);

        close(fd[1]);
        _exit(0);
    }

    close(fd[1]);

    char buf[100];
    if (read(fd[0], buf, sizeof(buf)) == -1) {
        perror("read");
        close(fd[0]);
        wait(NULL);
        return 1;
    }

    printf("Parent menerima %s\n", buf);

    close(fd[0]);
    wait(NULL);
    return 0;
}
```

Pada contoh tersebut, child menjadi penulis dan parent menjadi pembaca. Karena pipe satu arah, proses yang tidak memakai salah satu ujung pipe harus menutup ujung tersebut.

Menutup file descriptor yang tidak dipakai bukan sekadar kerapian. `read` pada pipe mengembalikan `0` sebagai EOF hanya ketika semua ujung tulis sudah ditutup. Jika parent masih menyimpan ujung tulis yang tidak dipakai, pembacaan dapat terus menunggu karena kernel menganggap masih ada kemungkinan data baru ditulis.

Aturan praktisnya sederhana. Setiap proses menutup ujung pipe yang tidak digunakan. Penulis menutup ujung baca. Pembaca menutup ujung tulis. Parent yang hanya menunggu child juga harus menutup kedua ujung jika tidak ikut membaca atau menulis.

---

## 16.4 Menghubungkan Program dengan `dup2`

Operator `|` pada shell dibuat dengan pipe, `fork`, `dup2`, dan `exec`. Misalnya perintah berikut menghubungkan output `ls` ke input `grep`.

```bash
ls | grep .c
```

Shell membuat pipe, lalu membuat dua child. Child pertama menjalankan `ls` dan stdout-nya diarahkan ke ujung tulis pipe. Child kedua menjalankan `grep` dan stdin-nya diarahkan ke ujung baca pipe.

Fungsi `dup2` digunakan untuk mengarahkan ulang file descriptor.

```c
#include <unistd.h>

int dup2(int oldfd, int newfd);
```

Setelah `dup2(fd[1], STDOUT_FILENO)`, file descriptor `STDOUT_FILENO` menunjuk ke tujuan yang sama dengan `fd[1]`. Setiap output ke stdout akan masuk ke pipe.

```c
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    int fd[2];

    if (pipe(fd) == -1) {
        perror("pipe");
        return 1;
    }

    pid_t left = fork();
    if (left == -1) {
        perror("fork");
        close(fd[0]);
        close(fd[1]);
        return 1;
    }

    if (left == 0) {
        dup2(fd[1], STDOUT_FILENO);
        close(fd[0]);
        close(fd[1]);

        execlp("ls", "ls", (char *)NULL);
        perror("execlp ls");
        _exit(127);
    }

    pid_t right = fork();
    if (right == -1) {
        perror("fork");
        close(fd[0]);
        close(fd[1]);
        wait(NULL);
        return 1;
    }

    if (right == 0) {
        dup2(fd[0], STDIN_FILENO);
        close(fd[0]);
        close(fd[1]);

        execlp("grep", "grep", ".c", (char *)NULL);
        perror("execlp grep");
        _exit(127);
    }

    close(fd[0]);
    close(fd[1]);

    wait(NULL);
    wait(NULL);
    return 0;
}
```

Program `ls` tidak perlu mengetahui bahwa output-nya diarahkan ke pipe. Program tersebut hanya menulis ke stdout. Program `grep` juga hanya membaca dari stdin. Abstraksi file descriptor membuat terminal, file, dan pipe dapat diperlakukan dengan cara yang sama oleh program.

---

## 16.5 FIFO

Pipe anonim hanya mudah dibagikan kepada proses yang berkerabat, karena file descriptor diwariskan melalui `fork`. Jika dua proses yang tidak berkerabat perlu berkomunikasi, keduanya dapat memakai FIFO.

FIFO atau named pipe adalah pipe yang memiliki nama di filesystem. Proses yang mengetahui path FIFO dapat membukanya seperti membuka file.

```c
#include <sys/stat.h>

int mkfifo(const char *path, mode_t mode);
```

Contoh pembuatan FIFO.

```c
if (mkfifo("/tmp/saluran", 0666) == -1) {
    perror("mkfifo");
    return 1;
}
```

FIFO juga dapat dibuat dari shell.

```bash
mkfifo /tmp/saluran
```

Contoh proses penulis.

```c
#include <stdio.h>

int main(void) {
    FILE *f = fopen("/tmp/saluran", "w");
    if (f == NULL) {
        perror("fopen");
        return 1;
    }

    fprintf(f, "Halo lewat FIFO\n");
    fclose(f);
    return 0;
}
```

Contoh proses pembaca.

```c
#include <stdio.h>

int main(void) {
    FILE *f = fopen("/tmp/saluran", "r");
    if (f == NULL) {
        perror("fopen");
        return 1;
    }

    char buf[100];
    if (fgets(buf, sizeof(buf), f) != NULL) {
        printf("Diterima %s", buf);
    }

    fclose(f);
    return 0;
}
```

Walaupun FIFO muncul sebagai entri filesystem, data tidak disimpan sebagai isi file biasa. FIFO adalah saluran kernel dengan nama yang dapat ditemukan melalui filesystem. Membuka FIFO untuk baca dapat memblokir sampai ada proses yang membuka untuk tulis, dan sebaliknya.

Setelah tidak diperlukan, FIFO dapat dihapus dengan `unlink` atau `rm`.

---

## 16.6 Shared Memory

Shared memory memungkinkan beberapa proses memetakan region memori yang sama ke ruang alamat masing-masing. Setelah region dipetakan, proses dapat membaca dan menulis melalui pointer biasa.

Mekanisme ini cepat karena data tidak perlu disalin dari proses penulis ke buffer kernel lalu ke proses pembaca. Proses langsung mengakses memori yang sama. Namun, shared memory tidak menyediakan koordinasi otomatis. Jika dua proses menulis area yang sama pada waktu bersamaan, hasilnya dapat tidak konsisten.

Karena itu, shared memory biasanya dipakai bersama mekanisme sinkronisasi seperti semaphore atau mutex yang dirancang untuk antar proses. Tanpa sinkronisasi, program rentan mengalami race condition.

Contoh ringkas memakai POSIX shared memory.

```c
#include <fcntl.h>
#include <string.h>
#include <sys/mman.h>
#include <unistd.h>

int main(void) {
    int shm_fd = shm_open("/objku", O_CREAT | O_RDWR, 0666);
    if (shm_fd == -1) {
        return 1;
    }

    if (ftruncate(shm_fd, 4096) == -1) {
        close(shm_fd);
        shm_unlink("/objku");
        return 1;
    }

    void *ptr = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                     MAP_SHARED, shm_fd, 0);
    if (ptr == MAP_FAILED) {
        close(shm_fd);
        shm_unlink("/objku");
        return 1;
    }

    strcpy((char *)ptr, "data bersama");

    munmap(ptr, 4096);
    close(shm_fd);
    shm_unlink("/objku");
    return 0;
}
```

Langkah umumnya adalah membuat atau membuka objek shared memory dengan `shm_open`, menentukan ukurannya dengan `ftruncate`, memetakannya dengan `mmap`, lalu memakai pointer hasil `mmap`. Proses lain yang membuka objek yang sama dan melakukan `mmap` akan melihat region memori yang sama.

`mmap` juga dipakai untuk fungsi lain, seperti memory-mapped file dan alokasi memori besar oleh allocator. Pada konteks IPC, yang penting adalah pemetaan region bersama ke beberapa proses.

---

## 16.7 Memilih Mekanisme IPC

Pemilihan mekanisme IPC bergantung pada bentuk data, hubungan antar proses, kebutuhan performa, dan kompleksitas sinkronisasi yang dapat diterima.

- Gunakan pipe untuk aliran byte sederhana antara parent dan child.
- Gunakan FIFO jika proses tidak berkerabat tetapi dapat menyepakati path yang sama.
- Gunakan shared memory jika data besar atau performa penting, dan program siap mengelola sinkronisasi.
- Gunakan message queue jika batas antar pesan penting.
- Gunakan socket jika komunikasi perlu dua arah atau dapat melibatkan mesin lain.
- Gunakan signal untuk pemberitahuan singkat, bukan untuk aliran data.

Mulailah dari mekanisme paling sederhana yang memenuhi kebutuhan. Pipe sering cukup untuk menghubungkan output dan input. Shared memory sebaiknya dipilih ketika manfaat performanya lebih besar daripada biaya sinkronisasi dan kompleksitas tambahan.

---

## 16.8 Rangkuman Model Mental

1. Proses memiliki ruang memori terisolasi, sehingga pertukaran data membutuhkan IPC.
2. Pipe anonim menyediakan aliran byte satu arah melalui kernel.
3. `pipe(fd)` menghasilkan `fd[0]` sebagai ujung baca dan `fd[1]` sebagai ujung tulis.
4. Child hasil `fork` mewarisi file descriptor parent, sehingga pipe dapat dipakai untuk komunikasi parent dan child.
5. Setiap proses harus menutup ujung pipe yang tidak digunakan agar EOF dapat terdeteksi dan file descriptor tidak bocor.
6. Operator `|` pada shell dibangun dari pipe, `fork`, `dup2`, dan `exec`.
7. FIFO adalah pipe bernama yang dapat dipakai proses yang tidak berkerabat.
8. Shared memory memetakan region memori yang sama ke beberapa proses.
9. Shared memory cepat, tetapi membutuhkan sinkronisasi untuk mencegah race condition.
10. Mekanisme IPC dipilih berdasarkan kebutuhan aliran data, struktur pesan, hubungan antar proses, dan performa.

---

## 16.9 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Buat pipe dalam satu proses, tulis string ke `fd[1]`, baca dari `fd[0]`, lalu cetak hasilnya.
2. Buat komunikasi parent ke child memakai pipe dan `fork`.
3. Buat komunikasi child ke parent memakai pipe dan `fork`.
4. Demonstrasikan masalah jika pembaca tidak menutup ujung tulis pipe yang tidak dipakai, lalu perbaiki dengan `close` yang benar.
5. Bangun program yang menjalankan pola `ls | grep .c` memakai pipe, `fork`, `dup2`, dan `exec`.
6. Ubah program sebelumnya menjadi pola `ls | wc -l`.
7. Buat FIFO dengan `mkfifo`, lalu uji memakai dua program C terpisah sebagai penulis dan pembaca.
8. Buat dua program yang memakai shared memory. Satu program menulis string dan program lain membacanya.
9. Buat counter di shared memory yang dinaikkan oleh dua proses tanpa sinkronisasi, lalu amati hasil akhirnya.

### Pertanyaan Refleksi

1. Mengapa proses membutuhkan IPC untuk bertukar data.
2. Apa perbedaan pipe anonim dan FIFO.
3. Mengapa setiap proses perlu menutup ujung pipe yang tidak digunakan.
4. Bagaimana `dup2` memungkinkan shell menghubungkan stdout satu proses ke stdin proses lain.
5. Mengapa program seperti `ls` tidak perlu mengetahui bahwa output-nya masuk ke pipe.
6. Mengapa FIFO dapat dipakai oleh proses yang tidak berkerabat.
7. Mengapa shared memory lebih cepat daripada pipe untuk data besar.
8. Mengapa shared memory membutuhkan sinkronisasi.
9. Dalam situasi apa socket lebih tepat daripada pipe atau FIFO.

---

Bab ini menunjukkan cara proses bertukar data meskipun ruang memorinya terisolasi. Bab 17 akan membahas thread dan concurrency, termasuk race condition serta mutex untuk mengatur akses bersama.

