---
title: "Bab 1 — Pengenalan C & Cara Kerja Compiler"
description: "Di bab pertama ini kita belum menulis kode yang rumit. Fokusnya adalah memahami apa itu C, kenapa bahasa ini penting, dan apa yang terjadi sejak kamu menulis source..."
tags: [c, system-programming]
order: 1
updated: 2026-06-20
---

> "Untuk mengerti C, kamu perlu berhenti melihat program hanya sebagai teks, lalu mulai melihatnya sebagai instruksi yang akhirnya dijalankan mesin."

Di bab pertama ini kita belum menulis kode yang rumit. Fokusnya adalah memahami apa itu C, kenapa bahasa ini penting, dan apa yang terjadi sejak kamu menulis source code sampai program benar-benar berjalan di komputer.

Banyak orang belajar C dengan langsung masuk ke `printf`. Itu tidak salah, tapi untuk buku ini kita mulai dari gambaran besarnya dulu. Kalau alur dari kode ke executable sudah jelas, bab-bab berikutnya akan jauh lebih mudah diikuti.

---

## 1.1 Kenapa C? Dan kenapa C itu spesial

Bayangkan bahasa pemrograman sebagai lapisan di atas hardware:

- **High-level (Python, JavaScript, Java)** — nyaman, banyak fasilitas, dan banyak detail teknis disembunyikan. Ada garbage collector, dynamic typing, runtime besar, dan library yang melimpah. Kamu bisa produktif, tapi biasanya jauh dari cara kerja mesin.
- **Assembly** — sangat dekat dengan CPU. Tiap instruksi yang ditulis hampir langsung mencerminkan instruksi mesin. Kuat, tapi melelahkan dan tidak portable karena tiap arsitektur CPU punya assembly sendiri.
- **C** — berada di tengah. C cukup dekat dengan hardware untuk mengakses memori dan memahami eksekusi program, tapi masih cukup terstruktur untuk ditulis dan dipindahkan ke berbagai mesin.

Karena posisi itu, C sering disebut **"portable assembly"**: bahasa yang rendah levelnya, tetapi masih bisa dibaca manusia. C memberi kontrol besar atas memori dan eksekusi, tanpa memaksa kita menulis instruksi CPU satu per satu.

### Kenapa ini penting buat system programming?

Banyak komponen penting di dunia komputasi ditulis dengan C, atau dengan bahasa yang sangat dekat dengannya:

- **Kernel Linux** — inti dari Android, server, dan supercomputer. Ditulis dominan dengan C.
- **Database** seperti PostgreSQL, SQLite, Redis; **web server** seperti nginx; dan **interpreter bahasa lain** seperti CPython.
- **Firmware & embedded** — kode di microcontroller, router, perangkat industri, kendaraan, dan banyak perangkat sehari-hari.

Kalau kamu ingin memahami bagaimana komputer bekerja di balik layar, C adalah lensa yang sangat bagus. Bukan karena C selalu menjadi pilihan terbaik untuk semua hal, tetapi karena C tidak banyak menyembunyikan detail penting: memori, alamat, byte, layout data, dan interaksi dengan sistem operasi. Kalau kamu salah mengelola memori, C tidak akan menyelamatkanmu. Justru dari situ kamu belajar bagaimana mesin sebenarnya bekerja.

### Sedikit sejarah

C dibuat sekitar **1972** oleh **Dennis Ritchie** di Bell Labs. Tujuan awalnya praktis: menulis ulang sistem operasi **UNIX** agar bisa dipindahkan ke berbagai komputer. Sebelumnya, sistem operasi banyak ditulis dengan assembly yang sangat bergantung pada satu jenis mesin.

Karena lahir dari kebutuhan system programming, desain C memang dekat dengan konsep hardware: memori, alamat, byte, dan instruksi. Itu bukan kebetulan; itu bagian dari karakter dasar bahasa ini.

---

## 1.2 Komputer cuma ngerti angka

Pegang ide ini sejak awal:

> **CPU tidak mengerti `int`, `printf`, `if`, atau `main`. CPU hanya mengerti angka biner: deretan 0 dan 1 yang mewakili instruksi dan data.**

Deretan instruksi biner yang bisa langsung dijalankan CPU disebut **machine code**. Tiap jenis CPU punya format machine code sendiri. x86-64 yang umum di PC/laptop dan ARM yang umum di ponsel atau Mac baru punya aturan instruksi masing-masing. Aturan itu disebut **Instruction Set Architecture (ISA)**.

Masalahnya, manusia tidak akan menulis `10111000 00000101...` dengan nyaman. Kita butuh alat yang menerjemahkan teks C menjadi machine code. Alat itu disebut **compiler**.

Cara membayangkannya: kamu menulis program dalam bahasa yang masih bisa dibaca manusia, lalu compiler menerjemahkan seluruh source code menjadi bentuk yang bisa dijalankan CPU.

> Catatan: ini berbeda dari **interpreter** seperti pada Python. Interpreter menjalankan program dengan menerjemahkan dan mengeksekusi kode saat program berjalan. Compiler menerjemahkan program lebih dulu menjadi executable, lalu executable itu dijalankan langsung oleh CPU. Ini salah satu alasan program C umumnya lebih cepat.

---

## 1.3 Program C pertama, dan kita bedah pelan-pelan

Kita mulai dari `hello world`. Bukan hanya menjalankannya, tapi juga membedah bagian-bagiannya.

Buat file bernama `hello.c`:

```c
#include <stdio.h>

int main(void) {
    printf("Halo, dunia!\n");
    return 0;
}
```

Jalankan di terminal Linux:

```bash
gcc hello.c -o hello
./hello
```

Contoh di buku ini memakai Linux atau lingkungan mirip Unix. Pastikan `gcc` sudah tersedia dengan menjalankan `gcc --version`. Kalau perintah itu tidak ditemukan, berarti compiler C belum terpasang di sistemmu.

Output:

```
Halo, dunia!
```

Sekarang kita lihat baris per baris.

### `#include <stdio.h>`

Tanda `#` di awal berarti baris ini adalah **directive** untuk **preprocessor**. Detailnya kita bahas di Section 1.4. Untuk sekarang, `#include <stdio.h>` berarti: sebelum kode dikompilasi, ambil isi file `stdio.h` dan tempelkan ke sini.

`stdio.h` adalah **header file**. `stdio` berarti standard input/output. Isinya antara lain **deklarasi** fungsi `printf`: informasi bahwa ada fungsi bernama `printf`, fungsi itu menerima argumen tertentu, dan mengembalikan nilai bertipe `int`. Tanpa deklarasi ini, compiler tidak memiliki informasi yang cukup saat melihat pemanggilan `printf`.

Header `stdio.h` berisi **deklarasi**, bukan **definisi** fungsi `printf`. Deklarasi adalah janji bahwa fungsi itu ada. Definisi adalah kode fungsi yang sebenarnya. Kode `printf` sudah tersedia dalam **C standard library**, dan akan disambungkan ke program kita saat tahap linking. Perbedaan deklarasi dan definisi akan sering muncul lagi di bab-bab berikutnya.

Dengan kata lain, `printf` bukan keyword khusus di C. Ia fungsi library biasa. Header memberi tahu compiler cara memanggilnya, sedangkan kode fungsi sebenarnya disediakan oleh library dan disambungkan saat program dibangun.

### `int main(void)`

Ini adalah **definisi fungsi** bernama `main`. Dalam program C biasa, `main` adalah titik masuk utama program. Saat program dijalankan, sistem operasi melalui kode startup akan memanggil `main`.

- `int` di depan berarti `main` mengembalikan nilai bertipe **integer**.
- `(void)` berarti `main` tidak menerima argumen. Nanti ada bentuk lain, `int main(int argc, char **argv)`, untuk membaca argumen command-line. Itu akan dibahas di bab proses.
- `{ ... }` adalah **body** fungsi, yaitu blok kode yang dijalankan.

### `printf("Halo, dunia!\n");`

Baris ini memanggil fungsi `printf` untuk mencetak teks ke layar. Lebih tepatnya, teks ditulis ke **standard output**, yang akan kita bahas lebih dalam di Bab 12.

- String diapit tanda kutip ganda `"..."`.
- `\n` adalah **escape sequence** untuk karakter newline. Itu satu karakter, walaupun ditulis dengan dua simbol.
- `;` menandai **akhir statement**. Di C, titik koma diperlukan. Compiler perlu tahu di mana satu perintah berakhir.

### `return 0;`

`main` mengembalikan `0` ke sistem operasi. Konvensinya, **`0` berarti sukses**, sedangkan nilai bukan nol berarti terjadi error. Nilai ini disebut **exit status** atau **exit code**.

Kamu bisa melihatnya di terminal setelah program dijalankan:

```bash
./hello
echo $?      # mencetak exit code program terakhir -> 0
```

Exit code bukan formalitas. Di scripting dan automation, program lain sering menentukan apakah sebuah perintah berhasil atau gagal dari angka ini.

---

## 1.4 Perjalanan dari `.c` ke program yang jalan

Saat kamu mengetik:

```bash
gcc hello.c -o hello
```

kelihatannya hanya ada satu langkah. Di balik layar, prosesnya terdiri dari empat tahap utama:

```
hello.c
   |
   |  [1] PREPROCESSING       -> hello.i   (masih teks C, sudah "dibersihkan")
   v
   |  [2] COMPILATION         -> hello.s   (assembly)
   v
   |  [3] ASSEMBLY            -> hello.o   (machine code, "object file")
   v
   |  [4] LINKING             -> hello     (executable, siap jalan)
   v
program jalan!
```

`gcc` berperan sebagai driver yang menjalankan tool lain untuk tiap tahap. Kita akan melihat tahap-tahap ini satu per satu, dan menghentikan `gcc` di tiap tahap agar hasil antaranya bisa diperiksa.

### Tahap 1 — Preprocessing

Yang bekerja di tahap ini adalah **preprocessor**. Tugasnya memanipulasi teks sebelum compiler benar-benar membaca kode C. Ia belum memahami tipe, fungsi, atau aturan semantik C. Pekerjaannya antara lain:

- Mengganti tiap `#include` dengan **isi** file header tersebut.
- Mengganti **macro** (`#define`) dengan nilainya.
- Membuang komentar.
- Memproses conditional compilation seperti `#ifdef`.

Coba jalankan:

```bash
gcc -E hello.c -o hello.i
```

Flag `-E` berarti berhenti setelah preprocessing.

Buka `hello.i`. File yang awalnya hanya beberapa baris bisa berubah menjadi ratusan atau ribuan baris, karena isi `stdio.h` dan header lain yang terkait ikut ditempelkan. Di bagian bawah file, kamu akan menemukan kode `main` milikmu, dengan deklarasi fungsi seperti `printf` muncul sebelumnya.

Pada titik ini, `#include <stdio.h>` sudah tidak terlihat sebagai `#include` lagi. Ia sudah diganti oleh isi header. Preprocessor tidak menjalankan program; ia hanya mengubah teks.

### Tahap 2 — Compilation

Yang bekerja di tahap ini adalah **compiler** dalam arti yang lebih sempit. Compiler mengambil teks C hasil preprocessing (`hello.i`) dan menerjemahkannya menjadi **assembly**: representasi instruksi mesin dalam bentuk teks yang masih bisa dibaca manusia.

Di sinilah compiler mem-parsing kode, mengecek syntax dan tipe, melakukan optimasi, lalu menghasilkan instruksi level rendah.

Coba jalankan:

```bash
gcc -S -masm=intel hello.c -o hello.s
```

Flag `-S` berarti berhenti setelah menghasilkan assembly. Flag `-masm=intel` meminta GCC menulis assembly dengan gaya Intel, yang lebih dekat dengan contoh di bawah. Tanpa flag ini, GCC di Linux biasanya memakai gaya AT&T; hasilnya tetap benar, tetapi bentuk penulisannya berbeda.

Buka `hello.s`. Isinya kira-kira seperti ini di x86-64 Linux. Hasil persisnya bisa berbeda tergantung compiler, versi, flag, dan platform:

```asm
main:
    push    rbp
    mov     rbp, rsp
    lea     rax, .LC0          ; alamat string "Halo, dunia!"
    mov     rdi, rax           ; siapkan argumen pertama untuk printf
    call    puts               ; panggil fungsi (gcc optimasi printf -> puts)
    mov     eax, 0             ; nilai return 0
    pop     rbp
    ret                        ; kembali ke pemanggil
.LC0:
    .string "Halo, dunia!"
```

Kamu belum perlu memahami tiap instruksi. Itu akan dibahas di Bab 3 dan Bab 4. Untuk sekarang, perhatikan bahwa kode C sudah diterjemahkan menjadi instruksi seperti `mov`, `call`, dan `ret`. Bahkan pemanggilan `printf` bisa dioptimasi menjadi `puts` karena string yang dicetak tidak memakai format khusus.

Compiler boleh mengubah bentuk instruksi selama perilaku program tetap sama. Itulah inti optimasi. Coba bandingkan:

```bash
gcc -S -masm=intel -O0 hello.c -o hello_O0.s
gcc -S -masm=intel -O2 hello.c -o hello_O2.s
```

Assembly yang dihasilkan bisa berbeda jauh.

### Tahap 3 — Assembly

Yang bekerja di tahap ini adalah **assembler** (`as`). Tugasnya mengubah teks assembly (`hello.s`) menjadi **machine code biner**, lalu membungkusnya dalam **object file** (`.o`).

```bash
gcc -c hello.c -o hello.o
```

`hello.o` sudah berisi instruksi mesin dalam bentuk biner. Jangan dibuka dengan text editor biasa, karena isinya bukan teks biasa. Gunakan tool seperti ini:

```bash
file hello.o          # -> ELF 64-bit relocatable
objdump -d hello.o    # disassemble: lihat machine code + assembly-nya
```

Namun `hello.o` belum bisa dijalankan. Penyebabnya: object file ini masih memiliki referensi yang belum diselesaikan. Ia memanggil `puts` atau `printf`, tetapi kode fungsi itu tidak ada di dalam `hello.o`. Kode tersebut ada di C standard library. Object file hanya mencatat bahwa pada titik tertentu ia membutuhkan fungsi bernama `puts` atau `printf`. Referensi seperti ini disebut **unresolved symbol**.

Dengan kata lain, `hello.o` sudah berisi bagian program milik kita, tetapi belum disambungkan dengan bagian-bagian dari library yang dibutuhkan.

### Tahap 4 — Linking

Yang bekerja di tahap ini adalah **linker** (`ld`). Linker menyambungkan object file dan library menjadi executable utuh.

Linker melakukan beberapa hal:

1. Mengambil object file kamu (`hello.o`).
2. Mengambil object code fungsi-fungsi yang dipakai dari **library**. Dalam contoh ini, `printf` atau `puts` berasal dari **C standard library** atau libc.
3. Menyelesaikan semua **unresolved symbol** dengan mengisi alamat fungsi yang benar.
4. Menambahkan **startup code**, sering disebut `crt0` atau `_start`. Kode ini berjalan sebelum `main`, menyiapkan lingkungan program, memanggil `main`, lalu setelah `main` selesai memanggil mekanisme `exit` dengan return value dari `main`.
5. Menghasilkan satu file **executable** yang siap dijalankan.

Penjelasan di atas adalah model awal yang paling mudah dibayangkan. Dalam praktik modern, banyak program Linux memakai **dynamic linking**. Artinya, executable tidak selalu membawa seluruh kode library di dalam filenya; ia bisa menyimpan informasi bahwa fungsi tertentu akan dicari dari shared library saat program dimuat. Untuk sekarang, cukup pahami bahwa linking menyelesaikan hubungan antara kode program dan kode library yang dipakai.

```bash
gcc hello.o -o hello     # tahap link (gcc memanggil linker)
./hello
```

Hal penting dari tahap ini: `main` bukan instruksi pertama yang berjalan. Yang pertama berjalan adalah `_start`, yaitu startup code yang ditambahkan saat linking. `_start` kemudian memanggil `main`. Karena itulah `main` bisa melakukan `return`: ia memang dipanggil oleh kode lain.

### Rangkuman pipeline dalam satu tabel

| Tahap | Program | Input | Output | Tugas singkat |
|-------|---------|-------|--------|---------------|
| 1. Preprocess | preprocessor (`cpp`) | `.c` | `.i` | Tempel `#include`, ganti macro, buang komentar |
| 2. Compile | compiler | `.i` | `.s` | Terjemah ke assembly + optimasi |
| 3. Assemble | assembler (`as`) | `.s` | `.o` | Assembly -> machine code biner |
| 4. Link | linker (`ld`) | `.o` + library | executable | Sambung semua, isi alamat, tambah startup |

Jadi, perintah:

```bash
gcc hello.c -o hello
```

menjalankan keempat tahap itu secara otomatis.

---

## 1.5 Apa yang terjadi saat `./hello` dijalankan?

Setelah source code berubah menjadi executable, pekerjaan berpindah ke sistem operasi. Detailnya akan dibahas lagi di Bab 14, tetapi gambaran awalnya seperti ini:

1. Kamu mengetik `./hello`.
2. Shell biasanya membuat proses anak dengan syscall `fork`.
3. Di proses anak itu, shell memanggil syscall `execve` untuk mengganti program yang sedang berjalan dengan isi executable `hello`.
4. Kernel membaca header executable. Di Linux, format executable umumnya adalah **ELF** (Executable and Linkable Format). Header ini berisi informasi seperti lokasi kode, lokasi data, dan alamat awal eksekusi (`_start`).
5. Kernel menyiapkan ruang memori virtual proses tersebut, memetakan isi file ke memori, menyiapkan **stack**, lalu menyerahkan kendali ke `_start`.
6. `_start` menjalankan kode startup dan memanggil `main`.
7. `main` berjalan. `printf` dieksekusi, dan di dalamnya pada akhirnya ada syscall `write` untuk menampilkan teks ke terminal.
8. `main` melakukan `return 0`. Startup code menerima nilai itu dan memanggil syscall `exit(0)`. Proses berakhir, lalu kernel membersihkan resource yang dipakai.

Jadi perjalanan program tidak berhenti di compiler. Setelah executable terbentuk, sistem operasi masih harus memuat file itu ke memori, menyiapkan proses, menyiapkan stack, dan memulai eksekusi dari entry point yang benar.

---

## 1.6 Flag `gcc` yang perlu kamu kenal sejak awal

Biasakan menyalakan warning sejak awal. Ini akan menangkap banyak kesalahan sebelum program dijalankan:

```bash
gcc -Wall -Wextra -g -O0 hello.c -o hello
```

- `-Wall` — menyalakan banyak warning umum. Namanya "Warning all", walaupun sebenarnya bukan semua warning.
- `-Wextra` — menyalakan warning tambahan yang lebih ketat.
- `-g` — menyertakan **debug info**, supaya program bisa diperiksa dengan `gdb` nanti. Kita bahas di Bab 20.
- `-O0` — mematikan optimasi. Ini bagus saat belajar atau debugging karena assembly dan alur eksekusinya lebih dekat dengan source code.
- `-o hello` — menentukan nama file output.
- `-std=c11` — opsional, untuk menetapkan versi standar C yang dipakai, misalnya C11 atau C17.

Anggap warning sebagai hal yang harus dibereskan, bukan sekadar pesan tambahan. Kalau ingin lebih ketat, kamu bisa memakai `-Werror` agar kompilasi gagal ketika ada warning. Banyak bug C dimulai dari warning yang diabaikan.

---

## 1.7 Model mental yang harus kamu bawa ke bab-bab berikutnya

Tiga ide ini akan terus dipakai:

1. **C dekat dengan hardware.** Banyak konstruksi C punya hubungan yang jelas dengan CPU dan memori. Kalau bingung, tanyakan: ini kira-kira menjadi instruksi atau layout memori seperti apa?
2. **Compiler menerjemahkan program sebelum dijalankan.** Tidak ada runtime besar yang menafsirkan program baris demi baris seperti pada bahasa interpreted. Yang dijalankan CPU adalah hasil terjemahan compiler, setelah melewati preprocessing, compilation, assembly, dan linking.
3. **C memberi kontrol, tetapi tidak memberi banyak perlindungan.** Kalau kamu salah mengelola memori, hasilnya bisa crash, data korup, atau bug yang sulit dilacak. C menganggap programmer tahu apa yang dilakukan.

---

## 1.8 Latihan & Pertanyaan Refleksi

Coba kerjakan, jangan hanya dibaca. Pemahaman C datang dari mengetik, menjalankan, merusakkan, lalu mengamati hasilnya.

**Latihan praktik:**

1. Tulis ulang `hello.c` dari nol, tanpa copy-paste. Compile dan jalankan. Lalu sengaja buat error: hapus titik koma setelah `printf(...)`. Baca pesan error dari `gcc`. Apa yang dikatakan compiler?
2. Jalankan keempat tahap secara manual dan amati tiap output:
   ```bash
   gcc -E hello.c -o hello.i
   gcc -S -masm=intel hello.c -o hello.s
   gcc -c hello.c -o hello.o
   gcc hello.o -o hello
   ```
   Berapa baris isi `hello.i`? Bisakah kamu menemukan deklarasi `printf` di dalamnya?
3. Buka `hello.s`. Temukan teks `"Halo, dunia!"` di dalamnya. Di bagian mana teks itu muncul?
4. Ganti `return 0;` menjadi `return 42;`. Compile, jalankan, lalu jalankan `echo $?`. Apa yang tercetak? Kenapa?
5. Jalankan `objdump -d hello.o` dan `file hello`. Apa perbedaan informasi yang ditampilkan untuk `.o` dan executable?

**Pertanyaan refleksi:**

1. Dengan kata-katamu sendiri, apa perbedaan **compiler** dan **interpreter**? Kenapa program C umumnya lebih cepat daripada Python?
2. Kenapa `hello.o` belum bisa dijalankan, padahal sudah berisi machine code? Apa yang masih kurang?
3. Apa perbedaan **deklarasi** dan **definisi** sebuah fungsi? `stdio.h` menyediakan yang mana?
4. Kalau kamu menghapus `#include <stdio.h>` tetapi tetap memakai `printf`, kira-kira tahap mana yang akan protes: preprocess, compile, atau link? Kenapa?
5. Siapa sebenarnya yang memanggil `main`? Apa artinya bagi pemahamanmu tentang kalimat "program mulai dari `main`"?

> Kalau pertanyaan nomor 4 membuatmu penasaran, langsung praktikkan dan amati pesannya. Cara belajar C yang efektif adalah membuat program rusak dengan sengaja, lalu memahami kenapa ia rusak.

---

Sampai di sini, kamu sudah melihat jalur lengkap dari file `.c` sampai program berjalan: preprocessing, compilation, assembly, linking, loading oleh sistem operasi, pemanggilan `main`, sampai exit code kembali ke shell.

Di Bab 2, kita turun ke bahan paling dasar yang dipakai program: data. Kita akan membahas bagaimana angka dan karakter disimpan sebagai bit dan byte di memori, kenapa `0.1 + 0.2 != 0.3`, dan apa itu two's complement.
