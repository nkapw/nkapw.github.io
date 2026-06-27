---
title: "Bab 14 — Proses (Process)"
description: "Sampai sekarang program kita selalu berjalan sebagai satu alur eksekusi dan satu wujud. Sekarang kita masuk ke salah satu konsep dasar sistem operasi, yaitu proses...."
tags: [c, system-programming]
order: 14
updated: 2026-06-21
---

> "Saat kamu mengetik sebuah perintah di shell dan menekan Enter, shell menggandakan dirinya sendiri, lalu salinannya berubah menjadi program yang kamu minta. Polanya adalah `fork`, lalu `exec`."

Sampai sekarang program kita selalu berjalan sebagai satu alur eksekusi dan satu wujud. Sekarang kita masuk ke salah satu konsep dasar sistem operasi, yaitu **proses**. Apa sebenarnya "program yang sedang berjalan" itu? Bagaimana satu program bisa menjalankan program lain? Bagaimana shell, yang juga hanya program biasa, bisa menjalankan `ls`, `gcc`, atau program buatanmu?

Jawabannya ada di tiga syscall yang menjadi dasar banyak perilaku UNIX, yaitu **`fork`**, **`exec`**, dan **`wait`**. Setelah memahaminya, perintah sederhana di shell akan terlihat sebagai rangkaian langkah yang konkret.

---

## 14.1 Apa itu proses?

Mari bedakan dua istilah yang sering tertukar:

- **Program** adalah file executable yang pasif di disk (hasil Bab 1 & 11). Isinya byte instruksi dan data, tetapi belum berjalan.
- **Proses** adalah program yang **sedang berjalan**. Ia merupakan instance hidup dari program, lengkap dengan memori, register, dan state-nya sendiri.

Program bisa dibayangkan seperti **resep** yang pasif di atas kertas. Proses adalah **kegiatan memasak yang sedang berlangsung** mengikuti resep itu, lengkap dengan dapur, bahan, dan kompor yang aktif. Satu resep bisa dipakai beberapa kali sekaligus oleh orang berbeda. Dengan cara yang sama, satu file program bisa menjadi banyak proses, misalnya ketika kamu membuka tiga terminal dan mendapatkan tiga proses `bash` dari satu program `bash`.

Setiap proses, dari sudut pandang kernel, punya:

- **PID (Process ID)** — nomor identitas unik. Kernel melacak tiap proses dengan PID-nya.
- **Ruang memori virtual sendiri** — text, data, heap, stack (peta lengkap dari Bab 9). Bagian ini penting karena **tiap proses punya ruang memori terisolasi sendiri**. Proses A tidak bisa sembarangan membaca atau menulis memori proses B. Ini fondasi keamanan dan stabilitas; satu program yang crash tidak otomatis menjatuhkan program lain.
- **Tabel file descriptor sendiri** (Bab 12) — fd 0/1/2 dan file yang ia buka.
- **State eksekusi** — isi register, instruction pointer (Bab 3), dll.
- **Parent** — proses yang membuatnya (tiap proses punya induk; membentuk pohon proses).

Lihat proses yang berjalan dengan `ps aux` atau `top`. PID 1 (`init`/`systemd`) adalah leluhur semua proses. Dari sana, proses lain lahir sebagai child, lalu bisa melahirkan child berikutnya, membentuk pohon proses.

---

## 14.2 Ruang memori terisolasi: ilusi yang berguna

Ide yang perlu kamu pegang adalah bahwa **setiap proses merasa memiliki seluruh memori untuk dirinya sendiri**.

Saat Bab 9 membahas "alamat 0x1000", dua proses berbeda bisa sama-sama punya data di "alamat 0x1000". Namun, itu adalah alamat **virtual**. Kernel dan hardware, lewat MMU (Memory Management Unit), menerjemahkan alamat virtual tiap proses ke alamat fisik RAM yang berbeda. Inilah **virtual memory**.

Bayangkan tiap proses tinggal di "apartemen" sendiri dan menomori ruangannya mulai dari 1. Apartemen A punya "kamar 1", apartemen B juga punya "kamar 1", tetapi keduanya adalah dua ruangan fisik berbeda di gedung yang sama, yaitu RAM. Pengelola gedung, dalam analogi ini kernel dan MMU, memetakan "kamar 1 milik A" ke lokasi fisik yang berbeda dari "kamar 1 milik B". Penghuni A tidak bisa masuk begitu saja ke apartemen B.

Konsekuensinya penting. Karena memori terisolasi, proses **tidak bisa** sekadar berbagi variabel seperti thread (Bab 17). Untuk berkomunikasi antar proses, mereka butuh mekanisme khusus, yaitu **IPC** seperti pipe dan shared memory (Bab 16). Simpan ide ini saat kita membahas `fork`.

Isolasi ini juga menjelaskan kenapa bug di satu proses biasanya berhenti di proses itu saja. Kalau sebuah proses menulis ke alamat yang tidak valid, kernel bisa menghentikan proses tersebut tanpa harus merusak memori proses lain.

---

## 14.3 `fork()`: menggandakan diri

`fork()` sering terasa membingungkan saat pertama kali ditemui karena efeknya tidak seperti pemanggilan fungsi biasa. **`fork()` menciptakan proses baru dengan cara menggandakan proses yang memanggilnya.**

```c
#include <unistd.h>
pid_t fork(void);
```

Setelah `fork`, ada **dua** proses yang nyaris identik berjalan. Proses pertama adalah **parent** (yang asli), dan proses kedua adalah **child** (salinan). Child mendapat **salinan** dari memori parent (text, data, heap, stack), tabel fd, dan posisi eksekusi. Keduanya melanjutkan dari **baris yang sama persis**, tepat setelah `fork`.

Bagian yang perlu diperhatikan adalah bahwa **`fork` dipanggil sekali, tetapi "return" dua kali**. Satu return terjadi di parent, satu lagi terjadi di child. Cara membedakan keduanya adalah dari **nilai return**.

- Di **parent**: `fork` mengembalikan **PID child** (angka positif).
- Di **child**: `fork` mengembalikan **0**.
- Kalau **gagal**: `fork` mengembalikan **-1** dan tidak ada child yang dibuat.

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("Sebelum fork (PID saya: %d)\n", getpid());

    pid_t pid = fork();          // <- di sini proses menggandakan diri

    if (pid == -1) {
        perror("fork");
        return 1;
    } else if (pid == 0) {
        // ini dijalankan oleh child
        printf("Saya CHILD. PID saya %d, parent saya %d\n", getpid(), getppid());
    } else {
        // ini dijalankan oleh parent
        printf("Saya PARENT. PID saya %d, child saya %d\n", getpid(), pid);
    }

    printf("Baris ini dicetak oleh KEDUANYA (PID %d)\n", getpid());
    return 0;
}
```

Jalankan beberapa kali. Kamu akan melihat baris terakhir dicetak **dua kali**, oleh parent dan child. Urutannya bisa berubah-ubah karena keduanya berjalan bersamaan dan kernel yang menjadwalkan kapan masing-masing mendapat giliran CPU. Tidak ada jaminan siapa yang mencetak lebih dulu. `getpid()` mengembalikan PID proses sendiri, sedangkan `getppid()` mengembalikan PID parent.

Untuk membayangkannya, anggap `fork` menggandakan satu proses menjadi dua proses yang memiliki memori awal yang sama. Sebelum `fork`, hanya ada satu alur eksekusi. Sesudah `fork`, ada dua alur eksekusi yang sama-sama berada tepat setelah pemanggilan `fork`. Satu-satunya cara kode mengetahui "saya parent atau child" adalah nilai return tadi: parent menerima PID child, sedangkan child menerima 0.

### Memori child adalah salinan, bukan berbagi

Bagian ini menghubungkan `fork` dengan Bagian 14.2. Setelah `fork`, child punya **salinan** memori parent, bukan memori yang sama. Mengubah variabel di child **tidak** mengubahnya di parent karena ruang memori proses terisolasi.

```c
int x = 100;
pid_t pid = fork();
if (pid == 0) {
    x = 999;                         // child mengubah salinannya
    printf("child: x = %d\n", x);    // 999
} else {
    sleep(1);
    printf("parent: x = %d\n", x);   // tetap 100!
}
```

> **Optimasi di balik layar — Copy-on-Write (COW):** menyalin seluruh memori parent setiap `fork` akan sangat boros, terutama kalau prosesnya besar. Karena itu, kernel memakai strategi yang lebih hemat. Pada awalnya, parent dan child **berbagi** halaman memori fisik yang sama, tetapi halaman itu ditandai read-only. Penyalinan sebenarnya baru terjadi **saat salah satu proses mencoba menulis** ke sebuah halaman. Pada saat itulah kernel membuat salinan halaman tersebut. Jadi `fork` tetap cepat dan hemat; memori yang hanya dibaca tidak perlu benar-benar disalin.

Perhatikan bedanya antara model yang terlihat oleh program dan optimasi di dalam kernel. Dari sudut pandang program C, parent dan child tetap punya memori masing-masing. Copy-on-Write hanya membuat implementasinya lebih efisien tanpa mengubah semantik bahwa perubahan di child tidak mengubah variabel di parent.

---

## 14.4 `exec()`: berubah wujud jadi program lain

`fork` membuat salinan diri. Namun, dalam banyak kasus, child tidak dibuat hanya untuk menjalankan kode yang sama dengan parent. Shell, misalnya, membuat child karena child itu akan menjalankan program **yang berbeda**, seperti `ls`, `gcc`, atau program buatanmu. Untuk kebutuhan ini, UNIX menyediakan keluarga **`exec`**.

> **`exec` mengganti seluruh isi proses saat ini dengan program baru.** Text, data, heap, stack, dan state program lama dibuang lalu diganti dengan program yang baru di-load. PID tetap sama, tetapi "isi" prosesnya menjadi program lain.

```c
#include <unistd.h>
int execlp(const char *file, const char *arg0, ..., (char *)NULL);
int execvp(const char *file, char *const argv[]);
// ... dan varian lain (execl, execv, execle, execve)
```

Bagian pentingnya adalah ini. **Kalau `exec` berhasil, ia tidak pernah return**, karena kode yang memanggilnya sudah tidak ada lagi. Kode lama sudah ditimpa oleh program baru. Kode setelah `exec` hanya tereksekusi kalau `exec` **gagal**.

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("Sebelum exec\n");

    // ganti proses ini dengan program "ls -l"
    execlp("ls", "ls", "-l", (char *)NULL);

    // baris di bawah hanya jalan kalau exec gagal
    perror("execlp");      // mis. program tak ditemukan
    printf("Baris ini tak akan tercetak kalau exec sukses\n");
    return 1;
}
```

Saat program ini dijalankan, kamu melihat "Sebelum exec", lalu output `ls -l`. Namun, baris setelah `execlp` **tidak** muncul kalau `exec` sukses, karena proses sudah berubah menjadi `ls` dan `ls` yang menyelesaikan eksekusi. Proses awal tidak kembali lagi ke kode lama.

Kalau `fork` menggandakan proses, `exec` mengganti program yang hidup di dalam proses. PID tetap sama karena prosesnya masih proses yang sama dari sudut pandang kernel. Namun kode, data, heap, stack, dan entry point program diganti oleh program baru. Karena itu, tidak ada konsep "kembali" dari `exec` yang sukses.

File descriptor yang tidak ditandai close-on-exec juga tetap terbuka melewati `exec`. Detail ini penting untuk shell dan redirection: shell bisa menyiapkan fd child terlebih dahulu, lalu child memanggil `exec`, dan program baru mewarisi fd yang sudah diarahkan.

Huruf di belakang nama varian `exec` menandakan bentuk argumennya. `l` berarti list, argumen ditulis satu per satu. `v` berarti vector, argumen diberikan sebagai array `argv`. `p` berarti nama program dicari lewat `PATH`. `e` berarti pemanggil menyediakan environment custom. Untuk menjalankan perintah seperti shell, `execvp` (vector + `PATH`) sangat sering dipakai.

---

## 14.5 `fork` + `exec`: pola universal menjalankan program

Sekarang kita gabungkan dua konsep tadi. Kalau kita memanggil `exec` langsung di proses utama, proses kita lenyap dan diganti menjadi program lain. Biasanya bukan itu yang kita inginkan. Shell, misalnya, perlu menjalankan `ls`, tetapi shell itu sendiri harus tetap hidup agar bisa kembali menampilkan prompt.

Caranya adalah **`fork` dulu untuk membuat child, lalu `exec` di child saja**. Parent tetap utuh; child berubah menjadi program baru. Inilah pola fundamental untuk menjalankan program di UNIX.

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    pid_t pid = fork();

    if (pid == -1) {
        perror("fork");
        return 1;
    } else if (pid == 0) {
        // child: berubah wujud jadi "ls -l"
        execlp("ls", "ls", "-l", (char *)NULL);
        perror("execlp");      // hanya jalan kalau exec gagal
        _exit(127);            // child harus keluar (pakai _exit, lihat catatan)
    } else {
        // parent: tunggu child selesai, lalu lanjut
        int status;
        wait(&status);         // tunggu child (Bagian 14.6)
        printf("Parent: child sudah selesai. Lanjut hidup.\n");
    }
    return 0;
}
```

Inilah yang shell lakukan setiap kali kamu mengetik perintah. Shell memanggil `fork` untuk membuat child. Child memanggil `exec` untuk menjadi program yang kamu minta. Parent, yaitu shell, memanggil `wait` sampai child selesai, lalu menampilkan prompt lagi. `bash`, `zsh`, dan shell lain mengikuti pola dasar ini.

Pemisahan ini membuat shell tetap hidup. Kalau shell langsung memanggil `exec("ls", ...)` tanpa `fork`, proses shell sendiri akan berubah menjadi `ls`, sehingga setelah `ls` selesai tidak ada shell yang kembali menampilkan prompt.

> **Kenapa `_exit` (underscore) di child, bukan `return` atau `exit`?** Setelah `fork`, child mewarisi salinan buffer stdio parent (Bab 12). Kalau child memanggil `exit` atau `return`, buffer stdio akan di-flush. Akibatnya, output yang sudah di-buffer parent bisa ter-flush dua kali: sekali oleh child, sekali oleh parent. Hasilnya bisa berupa output ganda. `_exit` keluar tanpa mem-flush buffer stdio, sehingga menghindari masalah ini. Detail ini kecil, tetapi penting karena menghubungkan `fork` dengan buffering dari Bab 12.

---

## 14.6 `wait()`: parent menunggu child & masalah zombie

Setelah `fork`, parent dan child berjalan bersamaan. Namun, sering kali parent perlu **menunggu** child selesai. Shell, misalnya, biasanya menunggu `ls` selesai sebelum menampilkan prompt berikutnya. Untuk itu ada **`wait`** dan **`waitpid`**.

```c
#include <sys/wait.h>
pid_t wait(int *status);                          // tunggu child mana saja selesai
pid_t waitpid(pid_t pid, int *status, int opts);  // tunggu child tertentu
```

`wait(&status)` memblokir parent sampai salah satu child-nya selesai. Setelah itu, `wait` mengisi `status` dengan informasi **bagaimana** child berakhir. Nilai `status` tidak dibaca langsung sebagai angka biasa; kamu membacanya dengan macro berikut.

Kalau parent punya lebih dari satu child, `wait` boleh mengembalikan child mana pun yang selesai lebih dulu. Saat kamu perlu menunggu child tertentu, gunakan `waitpid(pid, &status, 0)`.

```c
int status;
pid_t selesai = wait(&status);

if (WIFEXITED(status)) {
    printf("Child %d keluar normal dengan kode %d\n",
           selesai, WEXITSTATUS(status));   // exit code child (ingat return dari main, Bab 1!)
} else if (WIFSIGNALED(status)) {
    printf("Child %d dibunuh oleh signal %d\n",
           selesai, WTERMSIG(status));       // misal di-kill (Bab 15)
}
```

- `WIFEXITED(status)` — benar kalau child keluar normal (`return`/`exit`).
- `WEXITSTATUS(status)` — exit code-nya (0-255). Inilah yang "kembali" dari `return 0` di `main` child.
- `WIFSIGNALED(status)` / `WTERMSIG(status)` — kalau child dihentikan oleh signal (Bab 15).

### Zombie & orphan: dua keadaan aneh

**Zombie process** terdengar aneh, tetapi konsepnya sederhana. Saat child selesai, kernel **tidak langsung** membuang semua jejaknya. Kernel menyimpan sedikit informasi, terutama exit status, sampai parent memanggil `wait` untuk mengambil informasi tersebut. Child yang sudah selesai tetapi exit status-nya belum diambil parent disebut **zombie**. Ia sudah tidak berjalan, tetapi masih menempati satu entri di tabel proses kernel.

Kalau parent **tidak pernah** memanggil `wait`, zombie-zombie bisa menumpuk dan membocorkan entri tabel proses. Ini sejenis resource leak. Karena itu, parent yang me-`fork` child bertanggung jawab mem-`wait`-nya. Untuk child yang berjalan lama tanpa membuat parent memblokir terus, ada teknik seperti menangani signal `SIGCHLD` (Bab 15).

Bayangkan child yang selesai seperti paket yang sudah sampai di loker. Kernel menyimpan paket itu, yaitu exit status, sampai parent datang mengambilnya dengan `wait`. Kalau parent tidak pernah mengambilnya, paket menumpuk di loker. Dalam sistem operasi, "loker" itu adalah entri tabel proses.

**Orphan process** adalah keadaan sebaliknya. Kalau **parent** selesai duluan sebelum child, child menjadi **orphan**. Kernel tidak membiarkannya tanpa parent; proses itu akan diadopsi oleh `init` atau `systemd` (PID 1), yang kemudian akan mem-`wait`-nya. Jadi orphan biasanya bukan masalah. Zombie yang tidak pernah di-`wait` justru lebih berbahaya untuk resource proses.

---

## 14.7 Peta lengkap: siklus hidup proses

Sekarang kita satukan alurnya.

```
        fork()                    exec()                    exit()/return
parent ───┬──────► parent terus jalan ──────► wait() ◄── (ambil exit status)
          │                                      ▲
          └──► child (salinan) ──► child exec ───┘
                                   (jadi program baru) ──► selesai
```

1. Proses memanggil **`fork`** → muncul child (salinan, COW).
2. Child sering memanggil **`exec`** → menjelma jadi program berbeda (PID tetap).
3. Parent memanggil **`wait`** → memblokir sampai child selesai, mengambil exit status (mencegah zombie).
4. Child selesai dengan **`exit`/`return`** → exit status diteruskan ke parent lewat `wait`.

Siklus ini menjadi dasar cara sistem UNIX menjalankan banyak program. PID 1 mem-`fork` proses-proses awal. Proses-proses itu kemudian mem-`fork` dan `exec` proses lain lagi, sampai terbentuk pohon proses besar yang bisa kamu lihat dengan `ps` atau `pstree`.

> **Sekilas `argc`/`argv` (menutup Bab 7):** saat shell mem-`exec` programmu, ia mengoper daftar argumen yang menjadi `argv` di `main(int argc, char **argv)`. Dari sinilah `argv` berasal. Ia diteruskan oleh proses yang meng-`exec` programmu. `argv[0]` adalah nama program, seperti argumen pertama di `execlp("ls", "ls", ...)`.

---

## 14.8 Rangkuman model mental

1. **Program** adalah file pasif di disk, sedangkan **proses** adalah program yang sedang berjalan sebagai instance hidup dengan PID, memori, fd, dan state sendiri.
2. **Tiap proses punya ruang memori virtual terisolasi** lewat virtual memory dan MMU. Proses tidak bisa sembarang membaca memori proses lain; ini menjadi fondasi stabilitas dan keamanan. Untuk komunikasi antar proses, gunakan mekanisme IPC (Bab 16).
3. **`fork()`** menggandakan proses. Ia dipanggil sekali, tetapi return dua kali: parent mendapat PID child, child mendapat `0`, dan kegagalan ditandai dengan `-1`. Memori child adalah **salinan** yang dioptimasi dengan **Copy-on-Write**, bukan memori yang dibagi langsung.
4. **`exec()`** mengganti isi proses dengan program baru. Kalau sukses, ia tidak pernah return ke kode lama; kode setelah `exec` hanya jalan kalau `exec` gagal. PID proses tetap sama.
5. **`fork` + `exec`** adalah pola dasar menjalankan program di UNIX. Parent tetap hidup, child memanggil `exec` untuk berubah menjadi program yang diminta.
6. **`wait()`** membuat parent menunggu child dan mengambil **exit status** (`WIFEXITED`/`WEXITSTATUS`). Tanpa `wait`, child yang sudah selesai menjadi **zombie**. Kalau parent mati duluan, child menjadi **orphan** dan diadopsi PID 1.

---

## 14.9 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program `fork` dasar (Bagian 14.3) yang mencetak pesan berbeda di parent dan child, plus PID masing-masing. Jalankan beberapa kali — apakah urutan output selalu sama? Kenapa?
2. Buktikan memori terisolasi: deklarasikan `int x = 100;` sebelum `fork`, ubah jadi 999 di child, cetak di parent (beri `sleep(1)` di parent agar child sempat jalan). Apakah parent melihat 999 atau 100? Jelaskan.
3. Tulis program yang `fork`+`exec` untuk menjalankan `ls -l` (Bagian 14.5). Tambahkan `wait` di parent dan cetak pesan setelah child selesai. Amati urutannya.
4. Buat program yang menjalankan perintah dari `argv` (mini-shell): ambil `argv[1]`, `argv[2]`, ... sebagai perintah & argumen, `fork`+`execvp`, lalu `wait`. Jalankan `./mini ls -l` atau `./mini echo halo`.
5. Tangkap exit code child: bikin child yang `return 42;` (atau `exit(42)`), dan parent yang mencetak `WEXITSTATUS(status)`. Konfirmasi 42 muncul. Hubungkan dengan `echo $?` dari Bab 1.
6. Buat zombie sengaja: child langsung `exit`, parent `sleep(30)` **tanpa** `wait`. Saat parent tidur, jalankan `ps aux | grep defunct` di terminal lain — temukan zombie (`<defunct>`). Lalu tambahkan `wait` — apakah zombie hilang?
7. Buat orphan: parent `fork` lalu langsung selesai, child `sleep(5)` lalu cetak `getppid()`. Apakah PPID child berubah jadi 1 (atau PID `init`/`systemd`) setelah parent mati?

**Pertanyaan refleksi:**

1. Apa beda program dan proses? Berikan analogi sendiri.
2. Kenapa tiap proses punya ruang memori terisolasi? Apa manfaat keamanan/stabilitasnya, dan apa konsekuensinya untuk komunikasi antar proses?
3. Kenapa `fork` dikatakan "dipanggil sekali, return dua kali"? Bagaimana cara kode membedakan parent dan child?
4. Apa itu Copy-on-Write, dan masalah apa yang ia pecahkan?
5. Kenapa `exec` "tidak pernah return kalau sukses"? Kapan kode setelah `exec` tereksekusi?
6. Jelaskan pola `fork`+`exec`+`wait` dan kaitkan dengan apa yang shell lakukan saat kamu menjalankan perintah.
7. Apa itu zombie process, kenapa ia muncul, dan bagaimana mencegahnya? Bedakan dengan orphan.

---

Kita sudah membahas bagaimana proses lahir, berubah, dan selesai. Pertanyaan berikutnya adalah bagaimana proses bisa menerima gangguan dari luar, misalnya saat pengguna menekan Ctrl+C, saat proses di-`kill`, atau saat kernel perlu memberi tahu bahwa sesuatu terjadi. Itu wilayah **signal**. Di **Bab 15**, kita akan membahas signal sebagai interupsi software, signal handler yang terhubung dengan function pointer dari Bab 7, signal umum seperti `SIGINT`/`SIGSEGV`/`SIGKILL`, dan alasan menulis signal handler yang aman tidak sesederhana kelihatannya.
