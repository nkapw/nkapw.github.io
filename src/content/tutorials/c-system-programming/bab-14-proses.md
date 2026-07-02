---
title: "Bab 14 - Proses"
description: "Program C yang sudah dikompilasi menjadi file executable belum menjadi proses. File tersebut baru menjadi proses ketika sistem operasi memuatnya ke memori dan..."
tags: [c, systems-programming]
order: 14
updated: 2026-07-02
---
Program C yang sudah dikompilasi menjadi file executable belum menjadi proses. File tersebut baru menjadi proses ketika sistem operasi memuatnya ke memori dan menjalankannya. Pada bab ini, pembahasan berpindah dari program tunggal ke cara sistem operasi membuat, mengganti, menunggu, dan mengakhiri proses.

Konsep proses penting untuk memahami cara shell menjalankan perintah, cara program membuat program lain, dan cara sistem UNIX membangun pohon proses. Tiga system call utama yang perlu dipahami adalah `fork`, `exec`, dan `wait`.

---

## 14.1 Program dan Proses

Program adalah file executable yang tersimpan di disk. Isinya berupa instruksi mesin, data awal, metadata, dan informasi lain yang dibutuhkan loader. Selama belum dijalankan, program hanya berupa file pasif.

Proses adalah program yang sedang berjalan. Sebuah proses memiliki identitas, ruang memori, register, file descriptor, status eksekusi, dan hubungan dengan proses lain. Satu file program dapat dijalankan beberapa kali dan menghasilkan beberapa proses yang berbeda.

Setiap proses biasanya memiliki komponen berikut.

- `PID`, yaitu Process ID yang dipakai kernel untuk mengenali proses.
- Ruang memori virtual sendiri yang berisi text, data, heap, stack, dan area lain yang sudah dibahas pada Bab 9.
- Tabel file descriptor sendiri, termasuk `stdin`, `stdout`, dan `stderr`.
- State eksekusi, termasuk register dan instruction pointer.
- Parent process, yaitu proses yang membuatnya.

Proses membentuk struktur pohon. Proses awal sistem, seperti `init` atau `systemd`, biasanya memiliki PID 1 dan menjadi akar dari banyak proses lain. Daftar proses yang sedang berjalan dapat dilihat dengan perintah seperti `ps`, `top`, atau `pstree`.

---

## 14.2 Ruang Memori Virtual yang Terisolasi

Setiap proses memiliki ruang memori virtual sendiri. Dua proses dapat sama-sama memiliki alamat virtual yang terlihat sama, tetapi alamat tersebut tidak harus menunjuk ke lokasi fisik RAM yang sama.

Kernel dan perangkat keras melalui MMU menerjemahkan alamat virtual menjadi alamat fisik. Dengan cara ini, proses A tidak dapat langsung membaca atau menulis memori proses B. Isolasi tersebut menjadi dasar keamanan dan stabilitas sistem. Jika satu proses crash, proses lain tidak otomatis ikut rusak.

Konsekuensinya, proses tidak dapat berbagi variabel biasa. Jika dua proses perlu berkomunikasi, keduanya harus memakai mekanisme IPC seperti pipe, socket, shared memory, atau file. Mekanisme tersebut akan dibahas lebih lanjut pada bab berikutnya.

Isolasi ini juga penting ketika membahas `fork`. Setelah proses digandakan, parent dan child memiliki ruang memori masing-masing. Perubahan variabel pada child tidak mengubah variabel pada parent.

---

## 14.3 `fork`

`fork` membuat proses baru dengan menggandakan proses pemanggil.

```c
#include <unistd.h>

pid_t fork(void);
```

Setelah `fork` berhasil, ada dua proses yang melanjutkan eksekusi dari titik yang sama. Proses asli disebut parent. Proses baru disebut child. Keduanya memiliki salinan memori, salinan tabel file descriptor, dan state eksekusi yang berawal dari keadaan yang sama.

Hal penting dari `fork` adalah nilai return-nya berbeda pada parent dan child.

- Pada parent, `fork` mengembalikan PID child.
- Pada child, `fork` mengembalikan `0`.
- Jika gagal, `fork` mengembalikan `-1` dan child tidak dibuat.

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("Sebelum fork, PID saya %d\n", getpid());

    pid_t pid = fork();

    if (pid == -1) {
        perror("fork");
        return 1;
    } else if (pid == 0) {
        printf("Child, PID saya %d, parent saya %d\n",
               getpid(), getppid());
    } else {
        printf("Parent, PID saya %d, child saya %d\n",
               getpid(), pid);
    }

    printf("Baris ini dicetak oleh proses dengan PID %d\n", getpid());
    return 0;
}
```

Baris setelah `fork` dijalankan oleh parent dan child. Karena keduanya dijadwalkan oleh kernel, urutan output tidak selalu sama pada setiap eksekusi. Program tidak boleh bergantung pada urutan tersebut kecuali memakai mekanisme sinkronisasi seperti `wait`.

### Memori Child adalah Salinan

Setelah `fork`, child memiliki salinan memori parent. Jika child mengubah variabel, perubahan itu tidak terlihat oleh parent.

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    int x = 100;

    pid_t pid = fork();
    if (pid == -1) {
        perror("fork");
        return 1;
    }

    if (pid == 0) {
        x = 999;
        printf("child x = %d\n", x);
    } else {
        sleep(1);
        printf("parent x = %d\n", x);
    }

    return 0;
}
```

Parent tetap mencetak `100` karena perubahan `x` pada child terjadi di ruang memori child sendiri.

### Copy-on-Write

Menyalin seluruh memori parent setiap kali `fork` akan sangat mahal. Sistem modern memakai optimasi Copy-on-Write. Pada awalnya, parent dan child dapat berbagi halaman fisik yang sama selama halaman tersebut hanya dibaca. Ketika salah satu proses menulis ke halaman tersebut, kernel membuat salinan halaman untuk proses yang menulis.

Bagi programmer, perilakunya tetap terlihat seperti salinan memori terpisah. Optimasi ini hanya membuat `fork` lebih efisien tanpa mengubah model pemrogramannya.

---

## 14.4 `exec`

`exec` mengganti isi proses saat ini dengan program baru. PID proses tetap sama, tetapi kode, data, heap, stack, dan image program lama diganti oleh image program baru.

Ada beberapa varian `exec`. Dua yang sering dipakai adalah `execlp` dan `execvp`.

```c
#include <unistd.h>

int execlp(const char *file, const char *arg0, ..., (char *)NULL);
int execvp(const char *file, char *const argv[]);
```

Jika `exec` berhasil, fungsi tersebut tidak kembali ke pemanggil. Kode setelah pemanggilan `exec` hanya berjalan jika `exec` gagal.

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("Sebelum exec\n");

    execlp("ls", "ls", "-l", (char *)NULL);

    perror("execlp");
    return 1;
}
```

Jika `execlp` berhasil, proses ini diganti menjadi program `ls`. Karena kode lama sudah tidak ada, baris setelah `execlp` tidak dijalankan. Jika `execlp` gagal, misalnya karena program tidak ditemukan, baris `perror` dijalankan.

Huruf pada nama varian `exec` menunjukkan bentuk argumen.

- `l` berarti argumen diberikan sebagai daftar.
- `v` berarti argumen diberikan sebagai array seperti `argv`.
- `p` berarti nama program dicari melalui `PATH`.
- `e` berarti environment diberikan secara eksplisit.

Untuk menjalankan perintah seperti shell, `execvp` sering lebih praktis karena menerima array argumen dan mencari program melalui `PATH`.

---

## 14.5 Pola `fork`, `exec`, dan `wait`

Jika `exec` dipanggil langsung oleh proses utama, proses utama akan diganti oleh program baru. Shell tidak melakukan itu, karena shell harus tetap hidup setelah perintah selesai. Pola yang dipakai adalah membuat child dengan `fork`, menjalankan `exec` pada child, lalu parent menunggu child.

```c
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    pid_t pid = fork();

    if (pid == -1) {
        perror("fork");
        return 1;
    } else if (pid == 0) {
        execlp("ls", "ls", "-l", (char *)NULL);
        perror("execlp");
        _exit(127);
    } else {
        int status;
        wait(&status);
        printf("Parent lanjut setelah child selesai\n");
    }

    return 0;
}
```

Dalam pola ini, parent tetap menjadi program semula. Child diganti menjadi program lain melalui `exec`. Setelah child selesai, parent menerima status selesai melalui `wait`.

Shell memakai pola yang sama ketika menjalankan perintah biasa. Shell membuat child, child menjalankan program yang diminta, parent menunggu, lalu shell kembali menampilkan prompt.

### Mengapa Child Memakai `_exit`

Pada child hasil `fork`, jika `exec` gagal, child harus segera keluar. Contoh di atas memakai `_exit(127)` agar child keluar tanpa melakukan flush ulang pada buffer stdio yang diwarisi dari parent.

Jika child memakai `exit` atau `return`, buffer stdio yang sudah ada sebelum `fork` dapat ikut di-flush oleh child. Dalam kasus tertentu, output yang sama dapat tercetak dua kali. `_exit` menghindari masalah tersebut karena langsung keluar melalui kernel.

---

## 14.6 `wait` dan `waitpid`

Parent dan child berjalan secara bersamaan setelah `fork`. Jika parent perlu menunggu child selesai, gunakan `wait` atau `waitpid`.

```c
#include <sys/wait.h>

pid_t wait(int *status);
pid_t waitpid(pid_t pid, int *status, int options);
```

`wait` menunggu salah satu child selesai. `waitpid` dapat menunggu child tertentu atau memakai opsi tertentu. Keduanya mengisi `status` dengan informasi tentang cara child berakhir.

```c
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    pid_t pid = fork();
    if (pid == -1) {
        perror("fork");
        return 1;
    }

    if (pid == 0) {
        return 42;
    }

    int status;
    pid_t done = wait(&status);

    if (done == -1) {
        perror("wait");
        return 1;
    }

    if (WIFEXITED(status)) {
        printf("Child %d keluar normal dengan kode %d\n",
               done, WEXITSTATUS(status));
    } else if (WIFSIGNALED(status)) {
        printf("Child %d dihentikan oleh signal %d\n",
               done, WTERMSIG(status));
    }

    return 0;
}
```

Beberapa macro penting untuk membaca `status` adalah sebagai berikut.

- `WIFEXITED(status)` bernilai benar jika child keluar normal melalui `return` atau `exit`.
- `WEXITSTATUS(status)` mengambil exit code child.
- `WIFSIGNALED(status)` bernilai benar jika child dihentikan oleh signal.
- `WTERMSIG(status)` mengambil nomor signal yang menghentikan child.

Exit code child berada pada rentang yang dapat dibaca parent melalui `wait`. Nilai ini berkaitan dengan nilai yang dikembalikan dari `main` atau diberikan ke `exit`.

---

## 14.7 Zombie Process dan Orphan Process

Ketika child selesai, kernel tidak langsung membuang semua informasi tentang child tersebut. Kernel menyimpan sebagian informasi, terutama exit status, sampai parent memanggil `wait` atau `waitpid`. Child yang sudah selesai tetapi statusnya belum diambil disebut zombie process.

Zombie tidak lagi menjalankan kode, tetapi masih memakai satu entri pada tabel proses kernel. Jika parent membuat banyak child dan tidak pernah memanggil `wait`, entri zombie dapat menumpuk. Karena itu, proses yang membuat child bertanggung jawab mengambil status child.

Contoh berikut membuat zombie sementara.

```c
#include <stdlib.h>
#include <unistd.h>

int main(void) {
    pid_t pid = fork();
    if (pid == 0) {
        _exit(0);
    }

    sleep(30);
    return 0;
}
```

Selama parent tidur, child sudah selesai tetapi belum di-`wait`. Pada sistem UNIX, proses seperti ini dapat terlihat sebagai `<defunct>` melalui `ps`.

Orphan process terjadi ketika parent selesai lebih dulu, sementara child masih berjalan. Dalam kondisi ini, child akan diadopsi oleh proses lain yang bertugas mengambil statusnya, biasanya `init` atau `systemd`. Orphan bukan masalah yang sama dengan zombie. Zombie perlu ditangani oleh parent melalui `wait`, sedangkan orphan akan memiliki parent baru.

---

## 14.8 Siklus Hidup Proses

Siklus umum menjalankan program lain pada sistem UNIX dapat diringkas sebagai berikut.

```text
parent memanggil fork
parent tetap berjalan
child melanjutkan dari titik setelah fork
child memanggil exec
child menjadi program baru
child selesai dengan exit atau return
parent memanggil wait
parent mengambil exit status child
```

Urutan tersebut menjadi dasar cara shell menjalankan perintah. Parent, yaitu shell, tetap hidup. Child menjadi program yang diminta. Setelah program selesai, shell mengambil statusnya dan kembali menerima perintah.

Argumen program juga masuk melalui pola ini. Ketika sebuah proses memanggil `exec`, ia mengirim daftar argumen yang kemudian diterima program baru melalui `main(int argc, char **argv)`. Dengan demikian, `argv` berasal dari proses yang menjalankan program tersebut.

---

## 14.9 Rangkuman Model Mental

1. Program adalah file executable di disk, sedangkan proses adalah program yang sedang berjalan.
2. Setiap proses memiliki PID, ruang memori virtual, file descriptor, state eksekusi, dan parent.
3. Ruang memori proses terisolasi. Proses tidak dapat berbagi variabel biasa tanpa mekanisme IPC.
4. `fork` membuat child sebagai salinan proses pemanggil.
5. `fork` mengembalikan PID child pada parent, `0` pada child, dan `-1` saat gagal.
6. Memori child terlihat sebagai salinan dari parent. Optimasi Copy-on-Write membuat proses ini efisien.
7. `exec` mengganti isi proses saat ini dengan program baru. Jika berhasil, `exec` tidak kembali.
8. Pola umum menjalankan program adalah `fork`, lalu `exec` di child, lalu `wait` di parent.
9. `wait` dan `waitpid` dipakai untuk menunggu child serta mengambil exit status.
10. Zombie process muncul ketika child selesai tetapi parent belum mengambil statusnya.
11. Orphan process muncul ketika parent selesai lebih dulu dan child masih berjalan.

---

## 14.10 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Tulis program yang memanggil `fork` dan mencetak pesan berbeda pada parent dan child. Jalankan beberapa kali dan amati urutan output.
2. Buktikan isolasi memori dengan membuat variabel `int x = 100` sebelum `fork`, mengubahnya di child, lalu mencetaknya di parent.
3. Tulis program yang menjalankan `ls -l` memakai pola `fork`, `exec`, dan `wait`.
4. Buat program mini yang menjalankan perintah dari `argv`. Gunakan `argv[1]` sebagai nama program dan argumen berikutnya sebagai argumen program tersebut.
5. Buat child yang keluar dengan kode `42`, lalu cetak exit code tersebut dari parent memakai `WEXITSTATUS`.
6. Buat zombie sementara dengan child yang langsung keluar dan parent yang tidur tanpa memanggil `wait`. Amati hasilnya dengan `ps`.
7. Buat orphan dengan parent yang selesai lebih dulu dan child yang masih tidur. Cetak nilai `getppid` pada child setelah parent selesai.

### Pertanyaan Refleksi

1. Apa perbedaan program dan proses.
2. Mengapa setiap proses membutuhkan ruang memori virtual yang terisolasi.
3. Bagaimana `fork` membedakan parent dan child melalui nilai return.
4. Apa fungsi Copy-on-Write pada implementasi `fork`.
5. Mengapa kode setelah `exec` hanya berjalan jika `exec` gagal.
6. Mengapa shell memakai pola `fork`, `exec`, dan `wait`.
7. Apa penyebab zombie process dan bagaimana cara mencegahnya.
8. Apa perbedaan zombie process dan orphan process.

---

Bab ini menjelaskan bagaimana proses dibuat, diganti, ditunggu, dan diakhiri. Bab 15 akan membahas signal, yaitu mekanisme yang memungkinkan proses menerima pemberitahuan atau interupsi dari kernel maupun proses lain.

