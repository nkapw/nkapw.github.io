---
title: "Bab 1 - Pengenalan C dan Cara Kerja Compiler"
description: "Untuk memahami C, kita perlu memahami hubungan antara kode, memori, compiler, sistem operasi, dan CPU."
tags: [c, systems-programming]
order: 1
updated: 2026-07-02
---
> Untuk memahami C, kita perlu memahami hubungan antara kode, memori, compiler, sistem operasi, dan CPU.

Bab ini membangun dasar sebelum kita menulis program yang lebih kompleks. Fokus utamanya adalah memahami apa itu bahasa C, mengapa C penting dalam system programming, dan apa yang terjadi sejak kode ditulis sampai program dapat dijalankan oleh komputer.

Pemahaman ini penting karena C tidak banyak menyembunyikan detail kerja komputer. Jika alur kompilasi dan eksekusi sudah jelas sejak awal, pembahasan tentang memori, pointer, proses, file, dan debugging pada bab berikutnya akan jauh lebih mudah diikuti.

---

## 1.1 Mengapa C Penting

C berada di antara bahasa tingkat tinggi dan assembly. Bahasa seperti Python, JavaScript, dan Java menyediakan banyak abstraksi yang memudahkan pengembangan aplikasi. Assembly berada sangat dekat dengan instruksi CPU, tetapi sulit ditulis, sulit dirawat, dan tidak mudah dipindahkan antararsitektur.

C menawarkan keseimbangan yang kuat. Bahasa ini cukup dekat dengan hardware sehingga programmer dapat mengatur memori, alamat, representasi data, dan alur eksekusi secara langsung. Pada saat yang sama, C tetap menyediakan sintaks yang terstruktur dan lebih mudah dibaca dibanding assembly.

Karena sifat tersebut, C sering digunakan untuk membangun perangkat lunak yang membutuhkan kontrol rendah terhadap sistem.

- Kernel sistem operasi seperti Linux
- Database seperti PostgreSQL, SQLite, dan Redis
- Web server seperti nginx
- Interpreter dan runtime bahasa pemrograman
- Firmware dan perangkat embedded
- Driver, toolchain, dan perangkat lunak infrastruktur

C bukan bahasa yang selalu paling nyaman untuk semua kebutuhan. Namun, C sangat penting ketika tujuan utamanya adalah memahami dan mengendalikan cara komputer bekerja pada level memori dan proses.

### Sejarah Singkat C

C dibuat pada awal 1970-an oleh Dennis Ritchie di Bell Labs. Salah satu alasan utama kemunculannya adalah kebutuhan untuk menulis ulang sistem operasi UNIX agar lebih mudah dipindahkan ke berbagai jenis komputer.

Sebelum itu, banyak sistem operasi ditulis menggunakan assembly. Pendekatan tersebut membuat sistem sangat bergantung pada satu jenis mesin. C membantu memisahkan logika sistem dari detail assembly tertentu, tanpa kehilangan kemampuan untuk mengakses konsep penting seperti byte, alamat memori, dan instruksi mesin.

Latar belakang ini menjelaskan mengapa desain C terasa dekat dengan hardware. Kedekatan itu bukan kebetulan, melainkan bagian dari tujuan awal bahasa ini.

---

## 1.2 Komputer Hanya Menjalankan Instruksi Biner

CPU tidak memahami `int`, `printf`, `if`, atau `main` sebagaimana kita membacanya di kode C. CPU menjalankan instruksi dalam bentuk biner, yaitu deretan nilai 0 dan 1 yang merepresentasikan instruksi dan data.

Instruksi biner yang dapat dijalankan langsung oleh CPU disebut machine code. Setiap keluarga CPU memiliki aturan instruksi sendiri yang disebut Instruction Set Architecture atau ISA. Contohnya adalah x86-64 pada banyak komputer desktop dan server, serta ARM pada banyak ponsel dan beberapa komputer modern.

Menulis program langsung dalam machine code hampir tidak praktis untuk manusia. Karena itu, kita menulis kode dalam bahasa C, lalu menggunakan compiler untuk menerjemahkannya menjadi machine code.

Compiler menerjemahkan source code menjadi program executable sebelum program dijalankan. Ini berbeda dari interpreter seperti yang umum ditemui pada Python, yang membaca dan menjalankan program melalui runtime saat program sedang berjalan.

Perbedaan ini menjadi salah satu alasan program C sering memiliki performa tinggi. Banyak pekerjaan analisis dan penerjemahan dilakukan sebelum program dijalankan, sehingga file executable dapat dijalankan langsung oleh sistem operasi dan CPU.

---

## 1.3 Program C Pertama

Kita mulai dengan program `hello world`.

Buat file bernama `hello.c`.

```c
#include <stdio.h>

int main(void) {
    printf("Halo, dunia!\n");
    return 0;
}
```

Kompilasi dan jalankan program tersebut.

```bash
gcc hello.c -o hello
./hello
```

Output yang dihasilkan.

```text
Halo, dunia!
```

Sekarang kita bahas setiap bagian program.

### `#include <stdio.h>`

Baris yang diawali `#` adalah directive untuk preprocessor. `#include <stdio.h>` meminta preprocessor mengambil isi header `stdio.h` sebelum proses kompilasi utama dilakukan.

`stdio.h` adalah header untuk standard input dan output. Di dalamnya terdapat deklarasi fungsi seperti `printf`. Deklarasi memberi tahu compiler bahwa fungsi tersebut ada, bentuk argumennya seperti apa, dan nilai baliknya bertipe apa.

Header tidak berisi implementasi lengkap dari `printf`. Implementasi sebenarnya berada di C standard library. Kode library tersebut akan dihubungkan ke program pada tahap linking.

Perbedaan antara deklarasi dan definisi akan sering muncul dalam C. Deklarasi menyatakan bahwa sesuatu tersedia. Definisi menyediakan isi atau implementasinya.

### `int main(void)`

`main` adalah fungsi utama program C. Saat program dijalankan, sistem operasi dan kode startup akan menyiapkan lingkungan eksekusi, lalu memanggil `main`.

Kata `int` menunjukkan bahwa `main` mengembalikan nilai bertipe integer. Nilai ini menjadi exit code program. Bagian `(void)` menunjukkan bahwa fungsi `main` pada contoh ini tidak menerima argumen.

Kurung kurawal `{ ... }` membentuk body fungsi. Semua statement di dalamnya dijalankan ketika fungsi tersebut dipanggil.

### `printf("Halo, dunia!\n");`

`printf` digunakan untuk menulis teks ke standard output, yang pada contoh ini terlihat sebagai terminal.

String ditulis di antara tanda kutip ganda. Urutan `\n` adalah escape sequence untuk newline, yaitu karakter pindah baris. Tanda titik koma `;` menandai akhir statement. Dalam C, titik koma wajib ditulis pada akhir banyak statement.

### `return 0;`

`return 0;` mengembalikan nilai 0 dari `main` ke sistem operasi. Secara umum, nilai 0 berarti program selesai dengan sukses. Nilai selain 0 biasanya digunakan untuk menandakan kegagalan atau kondisi khusus.

Exit code dapat diperiksa di terminal setelah program dijalankan.

```bash
./hello
echo $?
```

Exit code penting dalam scripting dan automation karena program lain dapat memeriksa apakah sebuah program berhasil dijalankan.

---

## 1.4 Dari File `.c` Menjadi Program Executable

Saat menjalankan perintah berikut, GCC melakukan beberapa tahap berurutan.

```bash
gcc hello.c -o hello
```

Secara umum, prosesnya terdiri dari empat tahap.

```text
hello.c
   |
   |  [1] preprocessing
   v
hello.i
   |
   |  [2] compilation
   v
hello.s
   |
   |  [3] assembly
   v
hello.o
   |
   |  [4] linking
   v
hello
```

GCC dapat dianggap sebagai driver yang memanggil komponen lain untuk menyelesaikan tiap tahap. Kita dapat menghentikan proses pada tahap tertentu untuk melihat hasil antara.

### Tahap 1 - Preprocessing

Preprocessor bekerja sebelum compiler utama membaca program C. Tugasnya adalah memproses directive seperti `#include`, mengganti macro, membuang komentar, dan menangani conditional compilation seperti `#ifdef`.

Jalankan perintah berikut untuk berhenti setelah preprocessing.

```bash
gcc -E hello.c -o hello.i
```

File `hello.i` masih berupa teks C, tetapi isinya sudah diperluas. Header seperti `stdio.h` sudah dimasukkan ke dalam file hasil preprocessing. Karena itu, file yang awalnya pendek dapat berubah menjadi ratusan atau ribuan baris.

Pada tahap ini, preprocessor belum memeriksa makna program secara mendalam. Ia hanya melakukan transformasi teks sesuai directive yang ditemukan.

### Tahap 2 - Compilation

Tahap compilation menerjemahkan hasil preprocessing menjadi assembly. Pada tahap ini compiler mulai memahami struktur program. Compiler memeriksa sintaks, tipe data, pemanggilan fungsi, dan melakukan optimasi tertentu.

Jalankan perintah berikut untuk menghasilkan assembly.

```bash
gcc -S hello.c -o hello.s
```

Isi `hello.s` adalah representasi instruksi mesin dalam bentuk teks. Bentuk persisnya dapat berbeda tergantung arsitektur CPU, sistem operasi, versi compiler, dan opsi optimasi.

Contoh ringkas pada sistem x86-64 dapat terlihat seperti ini.

```asm
main:
    push    rbp
    mov     rbp, rsp
    lea     rax, .LC0
    mov     rdi, rax
    call    puts
    mov     eax, 0
    pop     rbp
    ret
.LC0:
    .string "Halo, dunia!"
```

Belum perlu memahami semua instruksi assembly pada tahap ini. Hal pentingnya adalah melihat bahwa kode C diterjemahkan menjadi instruksi level rendah. Compiler juga dapat mengubah bentuk instruksi selama perilaku akhir program tetap sama menurut aturan bahasa C.

### Tahap 3 - Assembly

Assembler mengubah file assembly menjadi object file. Object file berisi machine code biner, tetapi belum menjadi program utuh yang siap dijalankan.

Jalankan perintah berikut.

```bash
gcc -c hello.c -o hello.o
```

File `hello.o` sudah berisi instruksi mesin. Namun, file ini biasanya belum dapat dijalankan secara langsung karena masih membutuhkan proses linking.

Salah satu alasannya adalah pemanggilan fungsi library seperti `printf` atau `puts`. Object file dapat mencatat bahwa fungsi tersebut dibutuhkan, tetapi alamat dan kode finalnya belum diselesaikan. Nama yang belum terselesaikan seperti ini disebut unresolved symbol.

Kita dapat memeriksa object file dengan beberapa tool.

```bash
file hello.o
objdump -d hello.o
```

### Tahap 4 - Linking

Linker menyatukan object file dengan library dan kode pendukung lain yang dibutuhkan. Pada tahap ini, unresolved symbol diselesaikan, alamat fungsi ditetapkan, dan executable akhir dibuat.

Jalankan perintah berikut untuk melakukan linking dari object file.

```bash
gcc hello.o -o hello
./hello
```

Linking juga melibatkan startup code. Kode ini berjalan sebelum `main`, menyiapkan lingkungan awal program, memanggil `main`, lalu mengakhiri program menggunakan nilai balik dari `main`.

Karena itu, secara teknis `main` bukan instruksi pertama yang dijalankan oleh proses. `main` adalah titik masuk utama bagi programmer C, tetapi eksekusi proses dimulai dari kode startup yang disiapkan oleh toolchain dan sistem operasi.

### Ringkasan Pipeline

| Tahap | Program | Input | Output | Tugas |
|-------|---------|-------|--------|-------|
| Preprocessing | preprocessor | `.c` | `.i` | Memproses include, macro, komentar, dan conditional compilation |
| Compilation | compiler | `.i` | `.s` | Menerjemahkan C menjadi assembly |
| Assembly | assembler | `.s` | `.o` | Mengubah assembly menjadi object file |
| Linking | linker | `.o` dan library | executable | Menyatukan object file, library, symbol, dan startup code |

Perintah `gcc hello.c -o hello` menjalankan seluruh tahap tersebut secara otomatis.

---

## 1.5 Saat Program Dijalankan

Setelah executable dibuat, sistem operasi bertanggung jawab menjalankannya sebagai proses.

Alur umumnya sebagai berikut.

1. Pengguna menjalankan `./hello` dari shell.
2. Shell meminta kernel menjalankan file tersebut melalui system call seperti `execve`.
3. Kernel membaca format executable. Pada Linux, format yang umum digunakan adalah ELF atau Executable and Linkable Format.
4. Kernel membuat process baru, menyiapkan memori virtual, memetakan bagian kode dan data, menyiapkan stack, lalu memulai eksekusi dari entry point.
5. Startup code menjalankan persiapan awal dan memanggil `main`.
6. `main` menjalankan kode program. Pada contoh ini, `printf` menulis teks ke output.
7. Nilai balik dari `main` digunakan sebagai exit code. Kernel kemudian membersihkan resource milik process.

Detail proses ini akan dibahas lebih dalam pada bab tentang sistem operasi dan proses. Untuk saat ini, yang perlu dipahami adalah bahwa executable tidak berjalan sendirian. Sistem operasi menyiapkan lingkungan eksekusi sebelum instruksi program dijalankan.

---

## 1.6 Opsi GCC yang Perlu Dikenal Sejak Awal

Saat belajar C, biasakan menyalakan warning. Warning membantu menemukan kesalahan yang sering sulit dilacak jika dibiarkan.

```bash
gcc -Wall -Wextra -g -O0 hello.c -o hello
```

Penjelasan opsi tersebut.

- `-Wall` mengaktifkan banyak warning umum.
- `-Wextra` mengaktifkan warning tambahan.
- `-g` menyertakan informasi debug agar program dapat dianalisis dengan debugger seperti `gdb`.
- `-O0` mematikan optimasi sehingga hasil kompilasi lebih mudah dikaitkan dengan source code saat debugging.
- `-o hello` menentukan nama file output.
- `-std=c11` dapat digunakan untuk menetapkan standar bahasa C yang dipakai.

Pada proyek nyata, warning sebaiknya dianggap serius. Banyak bug dalam C berawal dari warning yang diabaikan. Jika ingin lebih ketat, opsi `-Werror` dapat digunakan agar kompilasi gagal ketika ada warning.

---

## 1.7 Rangkuman Model Mental

Ada tiga hal penting yang perlu dibawa ke bab berikutnya.

1. C dekat dengan hardware. Banyak konsep C berkaitan langsung dengan memori, alamat, representasi data, dan instruksi mesin.
2. Compiler menerjemahkan program sebelum dijalankan. File executable adalah hasil dari proses preprocessing, compilation, assembly, dan linking.
3. C memberi kontrol besar kepada programmer. Kontrol ini membuat C sangat kuat, tetapi juga menuntut ketelitian. Kesalahan dalam pengelolaan memori atau tipe data dapat menyebabkan crash, data rusak, atau perilaku yang sulit diprediksi.

Dengan model mental ini, C tidak hanya terlihat sebagai kumpulan sintaks. C menjadi cara untuk memahami bagaimana program benar-benar bekerja di atas sistem operasi dan hardware.

---

## 1.8 Latihan dan Pertanyaan Refleksi

Kerjakan latihan berikut dengan mengetik sendiri programnya. Pemahaman C akan lebih kuat jika diperoleh melalui percobaan langsung.

### Latihan Praktik

1. Tulis ulang `hello.c` dari awal, kompilasi, lalu jalankan.
2. Hapus titik koma setelah `printf(...)`, lalu kompilasi kembali. Amati pesan error yang diberikan compiler.
3. Jalankan setiap tahap kompilasi secara manual.

   ```bash
   gcc -E hello.c -o hello.i
   gcc -S hello.c -o hello.s
   gcc -c hello.c -o hello.o
   gcc hello.o -o hello
   ```

4. Buka `hello.i` dan cari deklarasi `printf`.
5. Buka `hello.s` dan cari string `Halo, dunia!`.
6. Ubah `return 0;` menjadi `return 42;`, kompilasi ulang, jalankan program, lalu periksa exit code dengan `echo $?`.
7. Jalankan `file hello.o` dan `file hello`, lalu bandingkan hasilnya.
8. Jalankan `objdump -d hello.o` untuk melihat instruksi assembly dari object file.

### Pertanyaan Refleksi

1. Apa perbedaan compiler dan interpreter?
2. Mengapa `hello.o` belum menjadi program yang siap dijalankan?
3. Apa perbedaan deklarasi dan definisi fungsi?
4. Apa peran `stdio.h` dalam program yang menggunakan `printf`?
5. Mengapa `main` disebut titik masuk program, meskipun bukan instruksi pertama yang dijalankan oleh proses?

---

Sampai di sini, kita sudah memahami gambaran besar bahasa C dan proses kompilasi. Pada bab berikutnya, kita akan membahas bagaimana data seperti angka dan karakter disimpan sebagai bit dan byte di memori.

