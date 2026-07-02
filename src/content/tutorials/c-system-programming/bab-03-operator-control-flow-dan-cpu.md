---
title: "Bab 3 - Operator, Control Flow, dan Eksekusi CPU"
description: "Control flow dalam C pada akhirnya diterjemahkan menjadi perbandingan, perubahan flag, dan lompatan ke alamat instruksi tertentu."
tags: [c, systems-programming]
order: 3
updated: 2026-07-02
---
> Control flow dalam C pada akhirnya diterjemahkan menjadi perbandingan, perubahan flag, dan lompatan ke alamat instruksi tertentu.

Pada Bab 2, kita membahas data dan representasinya di memori. Pada bab ini, kita membahas aksi yang dilakukan terhadap data. Fokusnya adalah operator, percabangan, loop, dan bagaimana konsep tersebut dieksekusi oleh CPU.

Tujuan bab ini bukan hanya memahami cara menulis `if`, `while`, atau `for`, tetapi juga memahami bentuk dasarnya di level mesin. Dengan begitu, konsep seperti register, instruction pointer, flags, dan branch akan menjadi lebih konkret.

---

## 3.1 Komponen Dasar CPU

Sebelum membahas operator dan control flow, kita perlu mengenal beberapa komponen penting di dalam CPU.

- Register adalah penyimpanan kecil dan sangat cepat di dalam CPU. Pada x86-64, register umum meliputi `rax`, `rbx`, `rcx`, `rdx`, dan beberapa register lain. Operasi aritmetika biasanya dilakukan dengan data yang sudah berada di register.
- ALU atau Arithmetic Logic Unit adalah bagian CPU yang melakukan operasi aritmetika dan logika, seperti penjumlahan, pengurangan, AND, OR, dan perbandingan.
- Instruction Pointer adalah register khusus yang menyimpan alamat instruksi berikutnya yang akan dijalankan. Pada x86-64, register ini disebut `rip`.
- Flags register menyimpan informasi tentang hasil operasi terakhir. Contohnya, Zero Flag menandakan hasil nol, sedangkan Sign Flag berkaitan dengan tanda hasil operasi.

CPU menjalankan instruksi secara berurutan, kecuali ada instruksi yang mengubah Instruction Pointer. Instruksi seperti jump dan branch digunakan untuk mengubah alur eksekusi ini.

Register penting karena CPU tidak selalu melakukan operasi langsung pada RAM. Data sering perlu dimuat ke register, diproses, lalu disimpan kembali jika diperlukan. Itulah sebabnya instruksi seperti `mov` sering muncul dalam assembly.

---

## 3.2 Siklus Dasar CPU

Secara sederhana, CPU menjalankan program melalui siklus berikut.

1. Fetch mengambil instruksi dari alamat yang ditunjuk Instruction Pointer.
2. Decode menerjemahkan instruksi agar CPU mengetahui operasi yang harus dilakukan.
3. Execute menjalankan instruksi tersebut.
4. Instruction Pointer diarahkan ke instruksi berikutnya.

Pada alur normal, Instruction Pointer maju ke instruksi selanjutnya. Namun, instruksi jump dapat mengubahnya ke alamat lain. Inilah dasar dari percabangan, loop, pemanggilan fungsi, dan banyak bentuk control flow lain.

Dengan model ini, `if`, `while`, dan `for` dapat dipahami sebagai cara terstruktur untuk menghasilkan instruksi perbandingan dan lompatan.

---

## 3.3 Operator Aritmetika

Operator aritmetika dasar dalam C meliputi `+`, `-`, `*`, `/`, dan `%`.

```c
#include <stdio.h>

int main(void) {
    int a = 17, b = 5;
    printf("a + b = %d\n", a + b);
    printf("a - b = %d\n", a - b);
    printf("a * b = %d\n", a * b);
    printf("a / b = %d\n", a / b);
    printf("a %% b = %d\n", a % b);
    return 0;
}
```

Jika `a` dan `b` bertipe `int`, maka `a / b` melakukan pembagian integer. Bagian pecahan dibuang. Untuk mencetak tanda `%` literal dalam `printf`, digunakan `%%`.

Pada level assembly, operasi seperti `a + b` biasanya melibatkan pemindahan data ke register, lalu operasi aritmetika.

```asm
mov   eax, [a]
add   eax, [b]
```

Instruksi `mov` memuat nilai ke register, sedangkan `add` melakukan penjumlahan. Hasilnya berada di register yang digunakan sebagai tujuan operasi.

Operator `%` menghasilkan sisa pembagian. Operator ini sering digunakan untuk memeriksa genap atau ganjil, membatasi indeks pada rentang tertentu, dan membangun struktur seperti circular buffer.

---

## 3.4 Operator Bitwise

Operator bitwise bekerja pada level bit individual. Operator ini sangat penting dalam system programming karena banyak data sistem direpresentasikan sebagai bit dan flag.

| Operator | Nama | Efek |
|----------|------|------|
| `&` | AND | Bit hasil bernilai 1 jika kedua bit bernilai 1 |
| `\|` | OR | Bit hasil bernilai 1 jika salah satu bit bernilai 1 |
| `^` | XOR | Bit hasil bernilai 1 jika kedua bit berbeda |
| `~` | NOT | Membalik semua bit |
| `<<` | Left shift | Menggeser bit ke kiri |
| `>>` | Right shift | Menggeser bit ke kanan |

```c
#include <stdio.h>

int main(void) {
    unsigned char a = 0b1100;
    unsigned char b = 0b1010;

    printf("a & b = %d\n", a & b);
    printf("a | b = %d\n", a | b);
    printf("a ^ b = %d\n", a ^ b);
    printf("a << 1 = %d\n", a << 1);
    printf("a >> 1 = %d\n", a >> 1);
    return 0;
}
```

Operator bitwise sering digunakan untuk bitmask. Satu nilai integer dapat menyimpan beberapa flag, dan setiap bit merepresentasikan satu kondisi.

```c
#define FLAG_BACA   (1 << 0)
#define FLAG_TULIS  (1 << 1)
#define FLAG_EKSEK  (1 << 2)

int izin = FLAG_BACA | FLAG_TULIS;

if (izin & FLAG_TULIS)
    printf("boleh menulis\n");
```

Operator `|` digunakan untuk menggabungkan flag, sedangkan `&` digunakan untuk memeriksa apakah flag tertentu aktif. Untuk mematikan flag, pola yang umum digunakan adalah `nilai &= ~FLAG`.

Pada pemrograman embedded, pola yang sama digunakan untuk membaca atau mengubah bit tertentu pada register hardware. Pada level sistem operasi, bitmask juga sering muncul pada permission, mode file, opsi konfigurasi, dan status internal.

Shift kiri pada integer unsigned sering setara dengan perkalian oleh 2 untuk setiap geseran. Shift kanan sering setara dengan pembagian oleh 2 untuk setiap geseran. Namun, detail perilaku shift pada signed integer perlu diperlakukan hati-hati, terutama jika melibatkan nilai negatif.

---

## 3.5 Operator Perbandingan dan Logika

Operator perbandingan meliputi `==`, `!=`, `<`, `>`, `<=`, dan `>=`. Hasilnya digunakan sebagai nilai kebenaran.

Dalam C, nilai 0 dianggap false. Nilai selain 0 dianggap true.

```c
printf("%d\n", 5 > 3);
printf("%d\n", 5 < 3);
printf("%d\n", 5 == 5);
```

Operator logika meliputi `&&`, `||`, dan `!`. Operator `&&` dan `||` memiliki sifat short-circuit evaluation.

Pada `A && B`, jika `A` false, maka `B` tidak dievaluasi karena hasil akhirnya sudah pasti false.

Pada `A || B`, jika `A` true, maka `B` tidak dievaluasi karena hasil akhirnya sudah pasti true.

Sifat ini sering digunakan untuk menjaga kode tetap aman.

```c
if (p != NULL && *p > 0) {
    /* gunakan *p */
}
```

Pada contoh tersebut, `*p` hanya dievaluasi jika `p` tidak bernilai `NULL`. Jika urutannya dibalik, program dapat mencoba melakukan dereference terhadap pointer `NULL`.

Perbedaan antara `=` dan `==` juga harus diperhatikan. Operator `=` digunakan untuk assignment, sedangkan `==` digunakan untuk perbandingan. Ekspresi seperti `if (x = 5)` valid secara sintaks dalam C, tetapi biasanya merupakan bug karena nilai `x` diubah dan hasil assignment digunakan sebagai kondisi.

---

## 3.6 `if` sebagai Lompatan Bersyarat

Perhatikan contoh berikut.

```c
int x = 7;
if (x > 5) {
    printf("besar\n");
} else {
    printf("kecil\n");
}
```

CPU tidak menjalankan konsep `if` secara langsung. Compiler menerjemahkannya menjadi instruksi perbandingan dan lompatan bersyarat.

Contoh assembly yang disederhanakan dapat terlihat seperti berikut.

```asm
        cmp   [x], 5
        jle   .blok_else
        lea   rdi, .str_besar
        call  puts
        jmp   .selesai
.blok_else:
        lea   rdi, .str_kecil
        call  puts
.selesai:
```

Instruksi `cmp` membandingkan nilai dan mengubah flags register. Instruksi `jle` membaca flags tersebut dan melompat ke `.blok_else` jika kondisi less or equal terpenuhi. Jika kondisi tidak terpenuhi, eksekusi berjalan ke instruksi berikutnya.

Setelah blok `if` selesai, instruksi `jmp .selesai` digunakan agar eksekusi tidak masuk ke blok `else`.

Dengan demikian, `if` dapat dipahami sebagai kombinasi antara perbandingan, perubahan flags, dan perubahan Instruction Pointer.

CPU modern juga memiliki branch predictor. Komponen ini mencoba memperkirakan cabang mana yang akan diambil agar pipeline CPU tetap terisi. Jika prediksi salah, CPU perlu membuang sebagian pekerjaan yang sudah dimulai. Detail ini tidak perlu dikuasai pada tahap awal, tetapi penting diketahui bahwa pola percabangan dapat memengaruhi performa.

---

## 3.7 `switch`

`switch` digunakan ketika satu nilai dibandingkan dengan beberapa kemungkinan.

```c
#include <stdio.h>

int main(void) {
    int pilihan = 2;
    switch (pilihan) {
        case 1:
            printf("satu\n");
            break;
        case 2:
            printf("dua\n");
            break;
        case 3:
            printf("tiga\n");
            break;
        default:
            printf("entah\n");
    }
    return 0;
}
```

`break` digunakan untuk keluar dari `switch`. Jika `break` tidak ditulis, eksekusi akan berlanjut ke `case` berikutnya. Perilaku ini disebut fallthrough. Fallthrough kadang digunakan secara sengaja, tetapi pada banyak kasus terjadi karena kelalaian.

Compiler dapat menerjemahkan `switch` dengan beberapa cara. Jika nilai `case` rapat dan jumlahnya cukup banyak, compiler dapat membuat jump table. Jump table adalah tabel alamat yang memungkinkan program langsung melompat ke blok yang sesuai. Jika nilai `case` jarang atau tidak berurutan, compiler dapat menggunakan rangkaian perbandingan.

---

## 3.8 Loop

Loop juga diterjemahkan menjadi kombinasi perbandingan dan jump. Perbedaannya, jump sering mengarah kembali ke bagian sebelumnya dari kode untuk mengulang eksekusi.

### `while`

```c
int i = 0;
while (i < 3) {
    printf("%d\n", i);
    i++;
}
```

Assembly yang disederhanakan dapat terlihat seperti berikut.

```asm
        mov   [i], 0
.cek:
        cmp   [i], 3
        jge   .selesai
        ; body loop
        add   [i], 1
        jmp   .cek
.selesai:
```

Instruksi `jge .selesai` digunakan untuk keluar dari loop jika kondisi tidak lagi terpenuhi. Instruksi `jmp .cek` membawa eksekusi kembali ke pengecekan kondisi.

### `for`

`for` dapat dipahami sebagai bentuk ringkas dari inisialisasi, pengecekan kondisi, body, dan update.

```c
for (inisialisasi; kondisi; update) {
    body
}
```

Bentuk tersebut setara secara konseptual dengan struktur berikut.

```c
inisialisasi;
while (kondisi) {
    body
    update;
}
```

Contoh penggunaan `for`.

```c
for (int i = 0; i < 3; i++) {
    printf("%d\n", i);
}
```

Gunakan `for` ketika jumlah iterasi atau pola update terlihat jelas. Gunakan `while` ketika perulangan lebih bergantung pada kondisi yang tidak selalu diketahui jumlah iterasinya sejak awal.

### `do-while`

`do-while` mengevaluasi kondisi di akhir. Karena itu, body selalu dijalankan setidaknya satu kali.

```c
int n;
do {
    printf("Masukkan angka positif ");
    scanf("%d", &n);
} while (n <= 0);
```

### `break` dan `continue`

`break` keluar dari loop. `continue` melewati sisa body dan langsung menuju iterasi berikutnya.

```c
for (int i = 0; i < 10; i++) {
    if (i == 5) break;
    if (i % 2 == 0) continue;
    printf("%d ", i);
}
```

Pada level mesin, keduanya diterjemahkan menjadi jump ke lokasi tertentu dalam struktur loop.

---

## 3.9 Operator Praktis Lain

Increment dan decrement digunakan untuk menambah atau mengurangi nilai sebesar 1. Bentuk `i++` disebut post-increment, sedangkan `++i` disebut pre-increment.

```c
int i = 5;
printf("%d\n", i++);
printf("%d\n", ++i);
```

Pada `i++`, nilai ekspresi adalah nilai lama, lalu `i` dinaikkan. Pada `++i`, nilai dinaikkan terlebih dahulu, lalu nilai baru menjadi hasil ekspresi. Jika digunakan sebagai statement berdiri sendiri, `i++` dan `++i` memiliki efek akhir yang sama.

Compound assignment seperti `+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, dan `>>=` menggabungkan operasi dengan assignment.

```c
x += 5;
```

Pernyataan tersebut setara dengan `x = x + 5`, tetapi lebih ringkas dan sering lebih jelas.

Operator ternary memilih salah satu dari dua ekspresi berdasarkan kondisi.

```c
int max = (a > b) ? a : b;
```

Operator ini cocok untuk pilihan sederhana. Untuk logika bercabang yang panjang, `if-else` biasanya lebih mudah dibaca.

---

## 3.10 Precedence Operator

Operator dalam C memiliki prioritas atau precedence. Perkalian dan pembagian dievaluasi sebelum penjumlahan dan pengurangan. Namun, beberapa operator lain memiliki aturan yang mudah disalahpahami.

```c
int x = 2 + 3 * 4;
```

Nilai `x` adalah 14 karena perkalian dievaluasi lebih dulu.

Contoh yang sering menimbulkan bug adalah kombinasi bitwise AND dengan perbandingan.

```c
if (a & MASK == 0) { }
if ((a & MASK) == 0) { }
```

Bentuk pertama dibaca sebagai `a & (MASK == 0)`, bukan `(a & MASK) == 0`. Bentuk kedua lebih jelas dan sesuai dengan maksud umum pemeriksaan bitmask.

Jangan mengandalkan ingatan terhadap seluruh tabel precedence. Gunakan tanda kurung ketika ekspresi melibatkan beberapa jenis operator atau ketika maksudnya perlu dibuat eksplisit.

---

## 3.11 Rangkuman Model Mental

Beberapa gagasan utama dari bab ini perlu diingat.

1. CPU menjalankan instruksi melalui siklus fetch, decode, dan execute.
2. Instruction Pointer menentukan instruksi berikutnya yang dijalankan.
3. Register adalah tempat penyimpanan cepat di dalam CPU, dan banyak operasi dilakukan dengan data yang berada di register.
4. `if` diterjemahkan menjadi perbandingan, perubahan flags, dan lompatan bersyarat.
5. Loop diterjemahkan menjadi perbandingan dan jump yang kembali ke bagian sebelumnya.
6. Operator bitwise penting untuk flag, bitmask, register hardware, dan data sistem.
7. Nilai 0 berarti false, sedangkan nilai selain 0 berarti true.
8. Short-circuit evaluation pada `&&` dan `||` dapat digunakan untuk menghindari evaluasi yang tidak aman.
9. Gunakan tanda kurung ketika precedence operator dapat menimbulkan ambiguitas.

---

## 3.12 Latihan dan Pertanyaan Refleksi

Kerjakan latihan berikut dengan mengetik dan menjalankan programnya sendiri.

### Latihan Praktik

1. Tulis kode `if (x > 5) { ... } else { ... }`, kompilasi dengan `gcc -S -O0`, lalu buka file assembly yang dihasilkan. Temukan instruksi `cmp` dan instruksi jump.
2. Tulis fungsi untuk mengecek apakah suatu `int` genap atau ganjil tanpa menggunakan `%`. Gunakan bitwise AND dengan `1`.
3. Buat sistem flag menggunakan `#define` dan bitmask. Gabungkan beberapa flag dengan `|`, periksa flag dengan `&`, lalu matikan salah satu flag dengan `&= ~FLAG`.
4. Buat contoh `switch` tanpa salah satu `break`. Amati outputnya, lalu kompilasi dengan `-Wall` untuk melihat apakah compiler memberi warning.
5. Gunakan `for`, `while`, dan `do-while` untuk mencetak angka 1 sampai 5. Setelah itu, ubah program agar mencetak angka 5 sampai 1.
6. Tulis `int x = 5; if (x = 0) printf("A"); else printf("B");`. Amati outputnya dan periksa warning compiler dengan `-Wall`.

### Pertanyaan Refleksi

1. Mengapa CPU membutuhkan register meskipun RAM memiliki kapasitas jauh lebih besar?
2. Bagaimana sebuah `if` diterjemahkan menjadi instruksi perbandingan dan lompatan?
3. Apa peran flags register dalam conditional jump?
4. Bagaimana short-circuit evaluation dapat mencegah kesalahan saat bekerja dengan pointer?
5. Kapan `while` lebih sesuai daripada `for`?
6. Mengapa precedence operator dapat menjadi sumber bug pada ekspresi bitwise?
7. Apa itu branch misprediction dan mengapa pola percabangan dapat memengaruhi performa?

---

Sampai di sini, kita sudah membahas operator, control flow, dan hubungannya dengan eksekusi CPU. Pada bab berikutnya, kita akan membahas function dan stack, termasuk pemanggilan fungsi, variabel lokal, return address, dan stack overflow.

