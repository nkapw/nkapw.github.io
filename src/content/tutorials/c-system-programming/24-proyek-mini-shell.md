---
title: "Proyek Membangun minish"
description: "minish adalah shell sederhana yang dibuat untuk menerapkan materi system programming dalam buku ini. Proyek ini menggabungkan proses, file descriptor, pipe,..."
tags: [c, systems-programming, projects, shell]
order: 24
updated: 2026-07-02
---
`minish` adalah shell sederhana yang dibuat untuk menerapkan materi system programming dalam buku ini. Proyek ini menggabungkan proses, file descriptor, pipe, redirection, signal, error handling, string, dan manajemen memori.

Shell tidak menghitung data sendiri seperti program aplikasi biasa. Tugas utamanya adalah membaca perintah, memecahnya menjadi argumen, menjalankan program lain, menghubungkan input dan output, lalu menunggu proses selesai.

Konsep yang digunakan dalam proyek ini adalah sebagai berikut.

| Konsep | Bab | Kegunaan |
|--------|-----|----------|
| `fork`, `exec`, `wait` | 14 | Menjalankan perintah eksternal |
| `pipe` dan `dup2` | 16 | Menghubungkan dua proses dengan operator `\|` |
| `open` dan `dup2` | 12 | Menangani redirection `<`, `>`, dan `>>` |
| `sigaction` dan `SIG_IGN` | 15 | Mengatur perilaku Ctrl-C |
| `errno`, `perror`, dan `strerror` | 13 | Melaporkan kegagalan syscall |
| Array `char *` | Bagian II | Menyusun `argv` untuk `execvp` |
| `getline`, `malloc`, dan `free` | 9 dan 12 | Membaca input dan mengelola buffer |

Proyek ini dibangun bertahap. Bagian berikut menjelaskan versi awal yang sederhana, lalu menambahkan argumen, built-in command, pipe, redirection, dan penanganan Ctrl-C. File `shell.c` berisi versi akhir yang sudah menggabungkan semua bagian tersebut.

---

## Cara Menjalankan

```sh
make
./minish
```

Contoh penggunaan.

```text
minish> echo halo dunia
halo dunia
minish> ls | wc -l
12
minish> echo halo > file.txt
minish> cat < file.txt
halo
minish> cd /tmp
minish> pwd
/tmp
minish> exit
```

---

## Gambaran Dasar Shell

Saat pengguna mengetik perintah seperti `ls -l`, shell melakukan langkah berikut.

1. Membaca baris input.
2. Memecah input menjadi token seperti `ls` dan `-l`.
3. Menjalankan program dengan argumen yang sesuai.
4. Menunggu program selesai.
5. Kembali membaca perintah berikutnya.

Pola tersebut disebut REPL, singkatan dari Read, Eval, Print, Loop. Shell modern memiliki banyak fitur tambahan, tetapi kerangka dasarnya tetap berpusat pada loop tersebut.

---

## v1 Menjalankan Satu Perintah

Versi pertama membaca satu baris dan menjalankannya sebagai nama program. Pada tahap ini belum ada argumen, pipe, atau redirection.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    char *line = NULL;
    size_t cap = 0;

    for (;;) {
        printf("minish> ");
        fflush(stdout);

        ssize_t n = getline(&line, &cap, stdin);
        if (n < 0) break;

        line[strcspn(line, "\n")] = '\0';
        if (line[0] == '\0') continue;

        pid_t pid = fork();
        if (pid == 0) {
            char *argv[] = { line, NULL };
            execvp(line, argv);
            perror("execvp");
            _exit(127);
        }

        waitpid(pid, NULL, 0);
    }

    free(line);
    return 0;
}
```

`fork` dibutuhkan karena `exec` mengganti isi proses saat ini dengan program baru. Jika shell langsung memanggil `exec`, shell akan hilang dan tidak dapat membaca perintah berikutnya. Karena itu, shell membuat child process dengan `fork`, lalu child menjalankan `exec`. Parent tetap hidup dan menunggu child selesai.

Kelemahan versi ini adalah seluruh baris dianggap sebagai satu nama program. Input `ls -l` akan dicari sebagai program bernama `ls -l`, bukan program `ls` dengan argumen `-l`. Untuk itu, shell membutuhkan tokenizer.

---

## v2 Memecah Baris Menjadi Argumen

`execvp` membutuhkan `argv`, yaitu array pointer string yang diakhiri `NULL`. Contohnya adalah `ls`, `-l`, lalu `NULL`.

```c
#define MAX_TOKEN 64

static int tokenize(char *line, char *tokens[], int max) {
    int n = 0;
    char *tok = strtok(line, " \t\r\n");

    while (tok != NULL && n < max - 1) {
        tokens[n++] = tok;
        tok = strtok(NULL, " \t\r\n");
    }

    tokens[n] = NULL;
    return n;
}
```

Pemanggilan `execvp` kemudian menggunakan token pertama sebagai nama program dan seluruh array token sebagai `argv`.

```c
char *tokens[MAX_TOKEN];
int count = tokenize(line, tokens, MAX_TOKEN);
if (count == 0) continue;

pid_t pid = fork();
if (pid == 0) {
    execvp(tokens[0], tokens);
    perror(tokens[0]);
    _exit(127);
}

waitpid(pid, NULL, 0);
```

`strtok` mengubah buffer input dengan menulis karakter `\0` pada posisi delimiter. Artinya, setiap elemen `tokens` menunjuk ke bagian dari buffer `line`, bukan ke salinan string baru. Buffer `line` tidak boleh dibebaskan atau diubah selama token masih digunakan.

---

## v3 Built-in Command

Perintah `cd` tidak dapat dijalankan seperti program eksternal biasa. Jika `cd` dijalankan di child process, perubahan direktori hanya terjadi di child. Setelah child selesai, direktori kerja shell sebagai parent tetap tidak berubah.

Karena itu, `cd` harus dijalankan oleh shell sendiri. Perintah seperti ini disebut built-in command. `exit` juga termasuk built-in karena tugasnya menghentikan shell.

```c
static int run_builtin(char *argv[]) {
    if (strcmp(argv[0], "exit") == 0) {
        exit(0);
    }

    if (strcmp(argv[0], "cd") == 0) {
        const char *dir = argv[1];
        if (dir == NULL) dir = getenv("HOME");
        if (dir == NULL) dir = "/";

        if (chdir(dir) != 0) perror("cd");
        return 1;
    }

    return 0;
}
```

Built-in perlu diperiksa sebelum shell memutuskan untuk menjalankan `fork`.

```c
if (run_builtin(tokens)) continue;
```

---

## v4 Operator Pipe

Perintah `ls | wc -l` membutuhkan dua proses. Proses pertama menjalankan `ls`, proses kedua menjalankan `wc -l`, dan stdout dari proses pertama dihubungkan ke stdin proses kedua melalui pipe.

Shell perlu mencari token `|`, lalu memisahkan array token menjadi dua `argv`.

```c
int pipe_at = -1;

for (int i = 0; i < count; i++) {
    if (strcmp(tokens[i], "|") == 0) {
        pipe_at = i;
        break;
    }
}

if (pipe_at >= 0) {
    tokens[pipe_at] = NULL;
    launch_pipe(tokens, &tokens[pipe_at + 1]);
} else {
    launch(tokens);
}
```

Fungsi `launch_pipe` membuat satu pipe dan dua child process.

```c
static void launch_pipe(char *left[], char *right[]) {
    int fd[2];
    pipe(fd);

    if (fork() == 0) {
        dup2(fd[1], STDOUT_FILENO);
        close(fd[0]);
        close(fd[1]);
        execvp(left[0], left);
        _exit(127);
    }

    if (fork() == 0) {
        dup2(fd[0], STDIN_FILENO);
        close(fd[0]);
        close(fd[1]);
        execvp(right[0], right);
        _exit(127);
    }

    close(fd[0]);
    close(fd[1]);
    wait(NULL);
    wait(NULL);
}
```

Parent wajib menutup kedua ujung pipe yang tidak digunakannya. Jika ujung tulis masih terbuka di parent, proses pembaca dapat terus menunggu EOF dan shell terlihat berhenti.

---

## v5 Redirection dan Ctrl-C

Redirection mengubah tujuan input atau output sebuah proses. Perintah `echo halo > file.txt` menjalankan `echo`, tetapi stdout proses tersebut diarahkan ke file.

Mekanismenya menggunakan `open` dan `dup2`. Redirection dilakukan di child sebelum `execvp`, agar hanya proses yang akan dijalankan yang terkena perubahan file descriptor.

```c
static void apply_redirection(char *argv[]) {
    int i = 0;
    int j = 0;

    while (argv[i] != NULL) {
        char *op = argv[i];

        if (strcmp(op, ">") == 0) {
            int fd = open(argv[i + 1], O_WRONLY | O_CREAT | O_TRUNC, 0644);
            if (fd < 0) {
                perror(argv[i + 1]);
                _exit(1);
            }

            dup2(fd, STDOUT_FILENO);
            close(fd);
            i += 2;
        } else if (strcmp(op, "<") == 0) {
            int fd = open(argv[i + 1], O_RDONLY);
            if (fd < 0) {
                perror(argv[i + 1]);
                _exit(1);
            }

            dup2(fd, STDIN_FILENO);
            close(fd);
            i += 2;
        } else {
            argv[j++] = argv[i++];
        }
    }

    argv[j] = NULL;
}
```

Versi lengkap di `shell.c` juga menangani `>>` untuk append dan memeriksa nama file yang hilang.

Untuk Ctrl-C, shell mengabaikan `SIGINT` agar tidak ikut mati ketika pengguna menekan Ctrl-C. Child process mengembalikan `SIGINT` ke perilaku default sebelum menjalankan program.

```c
struct sigaction sa;
memset(&sa, 0, sizeof sa);
sa.sa_handler = SIG_IGN;
sigaction(SIGINT, &sa, NULL);
```

```c
signal(SIGINT, SIG_DFL);
```

Tanpa reset di child, program seperti `cat` yang sedang menunggu input tidak dapat dihentikan dengan Ctrl-C karena mewarisi pengaturan signal dari shell.

---

## Hasil Akhir

File `shell.c` adalah hasil akhir dari semua tahap di atas. Build dan jalankan dengan perintah berikut.

```sh
make
./minish
```

Fitur yang didukung adalah sebagai berikut.

1. Menjalankan perintah eksternal.
2. Mendukung argumen.
3. Mendukung built-in `cd` dan `exit`.
4. Mendukung satu pipe.
5. Mendukung redirection `<`, `>`, dan `>>`.
6. Menjaga shell tetap hidup ketika pengguna menekan Ctrl-C.

---

## Latihan Pengembangan

Latihan berikut dapat dikerjakan setelah memahami versi lengkap.

1. Tambahkan built-in `pwd` menggunakan `getcwd`.
2. Tampilkan exit status setelah `waitpid` dengan `WIFEXITED` dan `WEXITSTATUS`.
3. Tambahkan background job dengan operator `&`.
4. Dukung pipe berantai seperti `a | b | c`.
5. Buat tokenizer yang mengenali operator tanpa spasi, misalnya `ls>out.txt`.
6. Tambahkan ekspansi variabel sederhana untuk token yang diawali `$`.
7. Tambahkan built-in `history`.

---

## Pertanyaan Refleksi

1. Mengapa shell harus memanggil `fork` sebelum `exec`?
2. Mengapa `cd` harus menjadi built-in command?
3. Berapa proses yang terlibat saat menjalankan `ls | wc -l`?
4. Mengapa parent harus menutup kedua ujung pipe setelah membuat child?
5. Bagaimana `dup2` membuat redirection bekerja tanpa mengubah kode program seperti `echo`?
6. Mengapa child perlu mengembalikan `SIGINT` ke `SIG_DFL`?
7. Mengapa buffer `line` tidak boleh dibebaskan saat `tokens` masih digunakan?

---

Setelah menyelesaikan `minish`, lanjutkan ke proyek lain seperti allocator sederhana, HTTP server mini, atau interpreter ekspresi. Proyek tersebut memperluas materi yang sama ke area memori, jaringan, parsing, dan desain API.

