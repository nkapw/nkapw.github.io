---
title: "Proyek: Membangun `minish` - Shell-mu Sendiri"
description: "Ini proyek pertama buku ini, dan sengaja dipilih duluan karena ia menyatukan paling banyak bab sekaligus. Sebuah shell adalah \"lem\" sistem operasi: ia tidak..."
tags: [c, system-programming]
order: 26
updated: 2026-06-17
---

> "Shell itu terdengar sakti — ia menjalankan program apa pun, menyambung perintah dengan `|`, mengarahkan output ke file. Tapi begitu kamu membongkarnya, ternyata ia cuma loop sederhana di atas empat syscall: `fork`, `exec`, `wait`, dan `pipe`. Setelah bab ini kamu tak akan pernah melihat terminal dengan cara yang sama."

Ini proyek pertama buku ini, dan sengaja dipilih duluan karena ia **menyatukan paling banyak bab sekaligus**. Sebuah shell adalah "lem" sistem operasi: ia tidak menghitung apa-apa sendiri, tugasnya cuma **menjalankan dan menyambungkan proses lain**. Persis itulah inti system programming.

Yang akan kita pakai:

| Konsep | Dari bab | Dipakai untuk |
|--------|----------|---------------|
| `fork` / `exec` / `wait` | Bab 14 | menjalankan setiap perintah |
| `pipe` + `dup2` | Bab 16 | operator `\|` |
| `dup2` + `open` | Bab 12 | redirection `<` `>` `>>` |
| `sigaction` / `SIG_IGN` | Bab 15 | Ctrl-C tak membunuh shell |
| `errno` / `perror` / `strerror` | Bab 13 | melaporkan kegagalan |
| array of `char *` (argv) | Bagian II | menampung perintah + argumen |
| `getline` / `malloc`+`free` | Bab 9 & 12 | membaca baris input |

Kita bangun **bertahap**: mulai dari shell yang cuma bisa menjalankan satu perintah, lalu tambah fitur satu per satu sampai jadi `shell.c` lengkap di folder ini. Tiap versi bisa kamu compile dan coba sendiri.

> **Cara pakai folder ini:** baca walkthrough ini sambil membuka `shell.c`. Build dengan `make`, jalankan dengan `./minish`. Snippet di bawah adalah versi yang disederhanakan supaya jelas alurnya; `shell.c` adalah hasil rakitan akhir dari semua versi.

---

## Apa itu shell, sebenarnya?

Saat kamu mengetik `ls -l` di terminal lalu menekan Enter, shell (bash/zsh) melakukan tepat tiga hal:

1. **Baca** baris yang kamu ketik.
2. **Pecah** jadi kata-kata: `["ls", "-l"]`.
3. **Jalankan** programnya, **tunggu** selesai, lalu kembali ke langkah 1.

Itu disebut **REPL** — *Read, Eval, Print, Loop*. Seluruh shell, dari yang paling sederhana sampai zsh, hanyalah loop ini dengan makin banyak fitur di bagian "Eval". Kita mulai dari kerangkanya.

---

## v1 — Menjalankan satu perintah

Versi paling primitif: baca satu baris, jalankan sebagai satu perintah (belum ada argumen, pipe, apa pun).

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
        fflush(stdout);                       // prompt tanpa '\n', paksa keluar

        ssize_t n = getline(&line, &cap, stdin);
        if (n < 0) break;                     // EOF (Ctrl-D) -> keluar
        line[strcspn(line, "\n")] = '\0';     // buang newline di akhir
        if (line[0] == '\0') continue;        // baris kosong

        pid_t pid = fork();                   // <-- Bab 14
        if (pid == 0) {
            char *argv[] = { line, NULL };
            execvp(line, argv);               // ganti seluruh isi proses child
            perror("execvp");                 // hanya kalau exec gagal
            _exit(127);
        }
        waitpid(pid, NULL, 0);                // parent menunggu child
    }
    free(line);
    return 0;
}
```

Ini sudah shell yang **berfungsi**. Coba: ketik `ls`, `date`, `whoami`. Jalan!

**Kenapa `fork` dulu, baru `exec`?** Ingat Bab 14: `exec` **mengganti seluruh isi proses** dengan program baru — kalau shell langsung meng-`exec`, shell-nya sendiri akan lenyap, diganti `ls`, dan setelah `ls` selesai tak ada lagi yang bisa membaca perintah berikutnya. Maka kita `fork` dulu (bikin salinan proses), lalu **child** yang meng-`exec`. Shell asli (parent) tetap hidup, cukup `wait` sampai child selesai. Pola "fork lalu exec di child" inilah cara **setiap** program dijalankan di UNIX.

Kelemahan v1: `execvp(line, ...)` memperlakukan seluruh baris sebagai satu nama program. `ls -l` akan dicari sebagai program bernama `"ls -l"` (dengan spasi) — dan gagal. Kita butuh **tokenizer**.

---

## v2 — Memecah baris jadi argumen

`execvp` ingin `argv` berupa **array of `char *`** yang diakhiri `NULL`: `{"ls", "-l", NULL}`. Tugas kita memecah string jadi array itu. Cara termudah: `strtok` (Bab 5 — string).

```c
#define MAX_TOKEN 64

static int tokenize(char *line, char *tokens[], int max) {
    int n = 0;
    char *tok = strtok(line, " \t\r\n");      // delimiter: spasi, tab, newline
    while (tok != NULL && n < max - 1) {
        tokens[n++] = tok;
        tok = strtok(NULL, " \t\r\n");        // NULL = lanjut string yang sama
    }
    tokens[n] = NULL;                          // execvp butuh penutup NULL
    return n;
}
```

Sekarang di main:

```c
char *tokens[MAX_TOKEN];
int count = tokenize(line, tokens, MAX_TOKEN);
if (count == 0) continue;

pid_t pid = fork();
if (pid == 0) {
    execvp(tokens[0], tokens);                // tokens[0] = nama program
    perror(tokens[0]);
    _exit(127);
}
waitpid(pid, NULL, 0);
```

**Bagaimana `strtok` bekerja, dan kenapa harus hati-hati.** `strtok` tidak menyalin apa-apa — ia **menulis `\0`** di posisi tiap delimiter di dalam `line`, lalu mengembalikan pointer ke awal tiap potongan. Jadi `tokens[i]` menunjuk **ke dalam buffer `line` itu sendiri**. Akibatnya: (a) `line` tidak boleh dibebaskan/diubah selama `tokens` masih dipakai, dan (b) `strtok` menyimpan state internal (statis) sehingga tidak aman dipakai dua loop bersamaan atau di banyak thread. Untuk shell single-thread kita, ini sempurna.

Coba sekarang: `ls -l`, `echo halo dunia`, `gcc --version`. Argumen sudah jalan.

---

## v3 — Built-in: kenapa `cd` tidak bisa di-`fork`

Coba di v2: ketik `cd /tmp`, lalu `pwd`. Hasilnya? **Tetap di direktori semula.** Bug? Bukan — ini pelajaran penting.

`cd` dijalankan lewat `fork` + `exec`, artinya `chdir("/tmp")` terjadi **di dalam proses child**. Begitu child selesai, ia mati — dan perubahan direktorinya **ikut mati bersamanya**. Direktori si shell (parent) tak pernah tersentuh. Ingat Bab 14: tiap proses punya state sendiri, termasuk *current working directory*. Child tak bisa mengubah milik parent.

Solusinya: `cd` **harus dijalankan oleh shell sendiri**, tanpa `fork`. Perintah seperti ini disebut **built-in**. `exit` juga built-in karena alasan serupa (proses child yang `exit` tak akan menutup shell-nya).

```c
static int run_builtin(char *argv[]) {
    if (strcmp(argv[0], "exit") == 0) {
        exit(0);                               // hentikan shell-nya sendiri
    }
    if (strcmp(argv[0], "cd") == 0) {
        const char *dir = argv[1] ? argv[1] : getenv("HOME");  // 'cd' polos -> HOME
        if (dir == NULL) dir = "/";
        if (chdir(dir) != 0) perror("cd");     // Bab 13: laporkan kalau gagal
        return 1;                              // "sudah ditangani"
    }
    return 0;                                  // bukan built-in
}
```

Di main, cek built-in **sebelum** memutuskan fork:

```c
if (run_builtin(tokens)) continue;            // kalau built-in, selesai di sini
// ... selain itu baru fork + exec
```

Inilah jawaban teka-teki klasik: *"kenapa `cd` itu perintah built-in shell, bukan program `/bin/cd`?"* Karena tugasnya **mengubah state shell itu sendiri** — sesuatu yang menurut definisi tak bisa didelegasikan ke proses lain.

---

## v4 — Operator pipe `|`

Ini bagian paling memuaskan, dan kita sudah membangunnya di **Bab 16**. Saat kamu ketik `ls | wc -l`, shell menjalankan `ls` dan `wc -l` sebagai **dua proses**, lalu menyambung **stdout `ls` ke stdin `wc`** lewat pipe.

Pertama, deteksi `|` di antara token dan pisah jadi dua perintah:

```c
int pipe_at = -1;
for (int i = 0; i < count; i++)
    if (strcmp(tokens[i], "|") == 0) { pipe_at = i; break; }

if (pipe_at >= 0) {
    tokens[pipe_at] = NULL;                    // putus jadi dua argv
    launch_pipe(tokens, &tokens[pipe_at + 1]); // kiri, kanan
} else {
    launch(tokens);
}
```

Trik `tokens[pipe_at] = NULL` itu manis: dengan menimpa posisi `|` dengan `NULL`, bagian kiri `tokens` otomatis jadi argv yang valid (berakhir NULL), dan `&tokens[pipe_at + 1]` menunjuk awal argv kanan. Satu array, dipotong jadi dua tanpa menyalin apa pun.

Lalu jantungnya — sama persis seperti Bab 16:

```c
static void launch_pipe(char *left[], char *right[]) {
    int fd[2];
    pipe(fd);                                  // fd[0]=baca, fd[1]=tulis

    if (fork() == 0) {                         // CHILD KIRI
        dup2(fd[1], STDOUT_FILENO);            // stdout -> ujung tulis pipe
        close(fd[0]); close(fd[1]);
        execvp(left[0], left);
        _exit(127);
    }
    if (fork() == 0) {                         // CHILD KANAN
        dup2(fd[0], STDIN_FILENO);             // stdin <- ujung baca pipe
        close(fd[0]); close(fd[1]);
        execvp(right[0], right);
        _exit(127);
    }

    close(fd[0]); close(fd[1]);                // PARENT wajib tutup kedua ujung!
    wait(NULL); wait(NULL);                    // tunggu dua child
}
```

**Kenapa parent wajib `close(fd[0])` dan `close(fd[1])`?** Ini jebakan paling klasik dari Bab 16. `wc` (child kanan) membaca dari pipe sampai dapat **EOF**. Pipe baru mengirim EOF **setelah semua ujung tulis tertutup**. Kalau parent lupa menutup `fd[1]` miliknya, ujung tulis masih dianggap "terbuka", `wc` menunggu data selamanya, dan shell **menggantung**. Aturannya: *tiap proses menutup ujung pipe yang tak ia pakai.*

Coba: `ls | wc -l`, `cat /etc/passwd | grep root`, `ls -la | head -3`. Pipe-mu sendiri, bukan bash-nya!

---

## v5 — Redirection `<` `>` `>>` dan Ctrl-C

**Dua sentuhan terakhir** yang mengubah `minish` dari mainan jadi benar-benar berguna.

### Redirection (Bab 12)

`echo halo > file.txt` artinya: jalankan `echo halo`, tapi sambungkan **stdout-nya ke file** alih-alih layar. Mekanismenya sama dengan pipe — `dup2` — bedanya target-nya file hasil `open`, bukan pipe.

Logikanya kita taruh **di dalam child, sebelum exec**: pindai argv, temukan `>` / `<` / `>>`, buka file, `dup2`, lalu hapus operator + nama file dari argv supaya tak ikut dikirim ke program.

```c
static void apply_redirection(char *argv[]) {
    int i = 0, j = 0;
    while (argv[i] != NULL) {
        char *op = argv[i];
        if (strcmp(op, ">") == 0) {                       // tulis (timpa)
            int fd = open(argv[i+1], O_WRONLY|O_CREAT|O_TRUNC, 0644);
            if (fd < 0) { perror(argv[i+1]); _exit(1); }
            dup2(fd, STDOUT_FILENO); close(fd);
            i += 2;                                        // lewati op + nama file
        } else if (strcmp(op, "<") == 0) {                // baca dari file
            int fd = open(argv[i+1], O_RDONLY);
            if (fd < 0) { perror(argv[i+1]); _exit(1); }
            dup2(fd, STDIN_FILENO); close(fd);
            i += 2;
        } else {
            argv[j++] = argv[i++];                         // token biasa: simpan
        }
    }
    argv[j] = NULL;
}
```

(Versi di `shell.c` juga menangani `>>` untuk *append* dengan `O_APPEND`, dan mengecek kalau nama file-nya hilang.) Panggil `apply_redirection(argv)` di setiap child tepat sebelum `execvp`.

Yang elegan: `echo` **tak tahu apa-apa** soal redirection. Ia cuma menulis ke stdout (fd 1) seperti biasa. `dup2` yang diam-diam mengubah ke mana fd 1 menunjuk. Persis kekuatan abstraksi "everything is a file" (Bab 12) — program tak peduli ujung fd-nya layar, file, atau pipe.

### Ctrl-C yang sopan (Bab 15)

Di shell asli, menekan **Ctrl-C** saat ada program berjalan akan membunuh **program itu**, bukan shell-nya. Di `minish` polos, Ctrl-C membunuh segalanya termasuk shell. Perbaikannya: **shell mengabaikan `SIGINT`**, dan tiap child **mengembalikannya ke default**.

```c
// di awal main(): shell mengabaikan SIGINT
struct sigaction sa;
memset(&sa, 0, sizeof sa);
sa.sa_handler = SIG_IGN;
sigaction(SIGINT, &sa, NULL);

// di tiap child, sebelum exec: kembalikan ke perilaku default
signal(SIGINT, SIG_DFL);
```

Kenapa perlu reset di child? Karena child mewarisi pengaturan signal parent (`SIG_IGN`) lewat `fork`, dan `exec` mempertahankan yang di-ignore. Tanpa reset, program seperti `cat` yang menunggu input takkan bisa dihentikan dengan Ctrl-C. Dengan reset, Ctrl-C membunuh child (perilaku normal) sementara shell tetap hidup — persis seperti yang kamu harapkan dari terminal sungguhan.

---

## Hasil akhir

Rakit semua versi dan kamu dapat `shell.c` di folder ini (~200 baris). Build dan coba:

```sh
make            # compile -> ./minish
./minish
```

```
minish> echo halo dunia
halo dunia
minish> ls | wc -l
12
minish> cat /etc/hostname | tr a-z A-Z > /tmp/HOST.txt
minish> cat < /tmp/HOST.txt
MYHOST
minish> cd /tmp
minish> pwd
/tmp
minish> exit
```

Renungkan apa yang baru saja kamu bangun: sebuah program yang **menjalankan program lain**, menyambungnya dengan pipe, mengarahkan I/O-nya, dan menangani signal — semua lewat segelintir syscall. Inilah kerangka yang dipakai bash, zsh, dan `sh` pertama Ken Thompson tahun 1971. Mereka cuma punya jauh lebih banyak fitur di bagian "Eval".

---

## Latihan: kembangkan `minish`

Diurutkan dari mudah ke menantang:

1. **Built-in `pwd`.** Tambahkan built-in yang mencetak direktori sekarang dengan `getcwd`. (Mudah.)
2. **Tampilkan exit status.** Setelah `waitpid`, pakai `WIFEXITED`/`WEXITSTATUS` (Bab 14) untuk mencetak kode keluar perintah, mis. `[exit 1]`, kalau bukan 0.
3. **Background job dengan `&`.** Kalau token terakhir adalah `&`, jangan `waitpid` — biarkan perintah jalan di latar. (Hati-hati zombie! Panen dengan `waitpid(-1, ..., WNOHANG)` atau handler `SIGCHLD` — Bab 15.)
4. **Pipe berantai.** `minish` cuma mendukung satu `|`. Dukung `a | b | c | ...` dengan looping: untuk N perintah, buat N-1 pipe. (Ini lompatan nyata — butuh array fd dan loop fork yang rapi.)
5. **Operator tanpa spasi.** Sekarang `ls>out.txt` gagal karena tokenizer hanya pecah di spasi. Tulis tokenizer tangan (tanpa `strtok`) yang mengenali `|`, `<`, `>`, `>>` walau menempel ke kata lain.
6. **Variabel & `$HOME`.** Dukung ekspansi sederhana: ganti token yang diawali `$` dengan nilai `getenv`-nya.
7. **History.** Simpan perintah-perintah sebelumnya; tampilkan dengan built-in `history`. (Untuk panah-atas sungguhan, lihat library `readline` — tapi coba versi sederhananya dulu.)

---

## Pertanyaan refleksi

1. Kenapa shell harus `fork` dulu sebelum `exec`? Apa yang terjadi kalau shell langsung meng-`exec` tanpa fork?
2. Kenapa `cd` **wajib** built-in, sedangkan `ls` tidak boleh? Konsep Bab 14 mana yang jadi akarnya?
3. Saat menjalankan `ls | wc -l`, ada berapa proses yang terlibat selain shell? Gambar siapa menulis ke mana.
4. Kenapa parent (shell) **wajib** menutup kedua ujung pipe? Apa gejala persis kalau lupa?
5. Bagaimana `echo halo > file.txt` bisa bekerja padahal `echo` tak tahu apa-apa soal file? Konsep abstraksi mana yang membuatnya mungkin?
6. Kenapa child perlu me-reset `SIGINT` ke `SIG_DFL` padahal shell sengaja mengabaikannya?
7. `strtok` menulis `\0` ke dalam buffer input. Kenapa itu berarti kamu tak boleh membebaskan `line` selama `tokens` masih dipakai?

---

Setelah kamu nyaman dengan `minish`, kamu sudah benar-benar memahami "lem" yang menyatukan sebuah sistem UNIX. Proyek lanjutan yang bagus (lihat Bab 22): **custom allocator** (`malloc`-mu sendiri — Bab 9), **HTTP server mini** (socket — Bab 18), atau **interpreter ekspresi** (parsing + struct). Selamat ngoprek!
