---
title: "Bab 3 — Operator, Control Flow & Bagaimana CPU Mengeksekusinya"
description: "Di Bab 2, kita membahas data: apa yang disimpan dan bagaimana nilainya direpresentasikan di memori. Sekarang kita membahas aksi: operator untuk menghitung, dan..."
tags: [c, system-programming]
order: 3
updated: 2026-06-20
---

> "Sebuah `if` bukan pertanyaan bagi CPU. Di level mesin, `if` berubah menjadi perbandingan nilai dan lompatan ke alamat instruksi tertentu jika kondisinya terpenuhi."

Di Bab 2, kita membahas *data*: apa yang disimpan dan bagaimana nilainya direpresentasikan di memori. Sekarang kita membahas *aksi*: operator untuk menghitung, dan control flow seperti `if`, `while`, dan `for` untuk mengatur urutan eksekusi.

Kita tidak hanya melihat cara menulisnya di C. Di bab ini, kita juga melihat apa yang dilakukan CPU di balik layar. Dari sini konsep seperti register, instruction pointer, flags, dan branch mulai terasa nyata.

Pegang satu ide utama sepanjang bab ini. **CPU adalah mesin yang sangat sederhana, tetapi sangat cepat. Ia terus mengulang siklus ambil instruksi, pahami instruksi, jalankan instruksi, lalu ambil instruksi berikutnya.** Semua `if`, loop, dan ekspresi rumit pada akhirnya berubah menjadi rangkaian instruksi sederhana.

---

## 3.1 Model mental CPU: register, ALU, dan instruction pointer

Sebelum membahas operator, kita perlu mengenal beberapa komponen penting di dalam CPU.

- **Register** — tempat penyimpanan sangat kecil dan sangat cepat **di dalam** CPU, bukan di RAM. Jumlahnya sedikit. Di x86-64, register umum antara lain `rax`, `rbx`, `rcx`, dan `rdx`. Ukurannya biasanya sebesar word, yaitu 8 byte di mesin 64-bit. CPU hampir tidak menghitung langsung di RAM. Data biasanya dibawa dulu ke register, dihitung, lalu jika perlu disimpan kembali ke RAM.

- **ALU (Arithmetic Logic Unit)** — bagian CPU yang melakukan operasi aritmetika dan logika, seperti tambah, kurang, AND, OR, perbandingan, dan sebagainya. ALU bekerja dengan nilai yang ada di register.

- **Instruction Pointer (IP / di x86-64: `rip`)** — register khusus yang menyimpan **alamat instruksi yang sedang atau akan dijalankan**. Register ini menentukan instruksi mana yang dibaca CPU berikutnya.

- **Flags register** — kumpulan bit yang menyimpan informasi tentang hasil operasi terakhir. Misalnya **Zero Flag (ZF)** menyala jika hasil operasi terakhir adalah nol, dan **Sign Flag (SF)** menyala jika hasilnya negatif. Flags inilah yang membuat `if` dan lompatan bersyarat bisa bekerja.

Bayangkan CPU seperti seseorang yang bekerja di meja kecil:

- **Register** adalah beberapa kertas kecil di atas meja. Jumlahnya sedikit, tapi sangat cepat dipakai.
- **RAM** adalah lemari arsip besar di seberang ruangan. Kapasitasnya besar, tapi lebih lambat diakses.
- **ALU** adalah kalkulator di meja.
- **Instruction Pointer** adalah penunjuk ke baris instruksi yang sedang dibaca.
- **Flags** adalah catatan kecil tentang hasil operasi terakhir, misalnya nol, negatif, lebih besar, dan sebagainya.

CPU tidak menghitung langsung di lemari arsip. Nilai perlu dibawa dulu ke register, baru dihitung oleh ALU. Karena itu, instruksi seperti `mov` muncul di mana-mana dalam assembly: tugasnya memindahkan data antara RAM dan register.

---

## 3.2 Siklus dasar CPU: fetch-decode-execute

CPU menjalankan siklus yang sama terus-menerus, miliaran kali per detik.

1. **Fetch** — ambil instruksi dari alamat yang ditunjuk Instruction Pointer.
2. **Decode** — pahami jenis instruksinya, misalnya tambah, pindah data, lompat, dan seterusnya.
3. **Execute** — jalankan instruksi tersebut, misalnya memakai ALU atau memindahkan data.
4. **Majukan IP** ke instruksi berikutnya, kecuali instruksi yang dijalankan mengubah IP, seperti jump.

Poin keempat adalah kunci. Secara default, eksekusi berjalan lurus ke instruksi berikutnya. Satu-satunya cara membelokkan alur adalah dengan instruksi yang **mengubah Instruction Pointer**. Instruksi seperti itu disebut **branch** atau **jump**.

Semua control flow, termasuk `if`, `while`, `for`, dan pemanggilan fungsi, pada akhirnya dibangun dari perubahan Instruction Pointer.

---

## 3.3 Operator aritmetika & cara CPU menghitungnya

Operator aritmetika dasar di C adalah `+`, `-`, `*`, `/`, dan `%` (modulo / sisa bagi).

```c
#include <stdio.h>

int main(void) {
    int a = 17, b = 5;
    printf("a + b = %d\n", a + b);   // 22
    printf("a - b = %d\n", a - b);   // 12
    printf("a * b = %d\n", a * b);   // 85
    printf("a / b = %d\n", a / b);   // 3  (integer division, sisa dibuang)
    printf("a %% b = %d\n", a % b);  // 2  (sisa: 17 = 5*3 + 2)
    return 0;
}
```

Ingat dari Bab 2 bahwa `int / int` menghasilkan integer, sehingga bagian pecahan dibuang. Di `printf`, `%%` dipakai untuk mencetak tanda `%` literal.

Sekarang lihat apa yang terjadi di CPU untuk `a + b`. Anggap `a` dan `b` masih berada di memori. Assembly-nya kira-kira seperti ini:

```asm
mov   eax, [a]      ; salin nilai a dari RAM ke register eax
add   eax, [b]      ; eax = eax + b   (ALU bekerja di sini)
                    ; hasilnya sekarang ada di eax
```

`mov` membawa nilai dari RAM ke register. `add` menyuruh ALU menjumlahkan nilai. Alurnya sederhana: CPU mengambil data ke tempat kerjanya, menghitungnya, lalu menyimpan atau memakai hasilnya.

Operator `%` atau modulo sering dipakai dalam system programming. Contohnya untuk mengecek genap/ganjil (`x % 2`), membuat indeks berputar dalam circular buffer (`i % size`), dan berbagai kasus lain yang membutuhkan sisa pembagian.

---

## 3.4 Operator bitwise: berbicara langsung dalam bit

Operator bitwise jarang dipakai di kode aplikasi biasa, tetapi sangat sering muncul di system programming. Operator ini bekerja pada level bit individual.

| Operator | Nama | Efek |
|----------|------|------|
| `&` | AND | bit hasil 1 kalau **kedua** bit 1 |
| `\|` | OR | bit hasil 1 kalau **salah satu** bit 1 |
| `^` | XOR | bit hasil 1 kalau **berbeda** |
| `~` | NOT | balik semua bit |
| `<<` | left shift | geser bit ke kiri (x 2 per geseran) |
| `>>` | right shift | geser bit ke kanan (/ 2 per geseran) |

```c
#include <stdio.h>

int main(void) {
    unsigned char a = 0b1100;   // 12
    unsigned char b = 0b1010;   // 10

    printf("a & b = %d\n", a & b);   // 0b1000 = 8
    printf("a | b = %d\n", a | b);   // 0b1110 = 14
    printf("a ^ b = %d\n", a ^ b);   // 0b0110 = 6
    printf("a << 1 = %d\n", a << 1); // 0b11000 = 24 (sama dengan a * 2)
    printf("a >> 1 = %d\n", a >> 1); // 0b0110 = 6  (sama dengan a / 2)
    return 0;
}
```

### Kenapa ini penting buat system programming?

1. **Flags / bitmask.** Satu `int` sering dipakai untuk menyimpan banyak opsi on/off sekaligus. Ini hemat dan mudah diproses. Contoh nyatanya muncul saat membuka file dengan `open()`. Kamu bisa menulis `O_RDONLY | O_CREAT | O_TRUNC`, yang berarti beberapa flag digabung menjadi satu angka dengan OR. Kernel kemudian mengecek tiap bit dengan AND.

   ```c
   #define FLAG_BACA   (1 << 0)   // 0b001
   #define FLAG_TULIS  (1 << 1)   // 0b010
   #define FLAG_EKSEK  (1 << 2)   // 0b100

   int izin = FLAG_BACA | FLAG_TULIS;     // gabung: 0b011

   if (izin & FLAG_TULIS)                  // cek bit "tulis"
       printf("boleh menulis\n");
   ```

2. **Manipulasi hardware register.** Di embedded, kamu sering harus menyalakan atau mematikan bit tertentu di register hardware. Misalnya `REG |= (1 << 3);` untuk menyalakan bit ke-3, dan `REG &= ~(1 << 3);` untuk mematikannya.

3. **Efisiensi.** `x << 1` sama dengan mengalikan `x` dengan 2, dan operasi shift biasanya lebih murah daripada perkalian umum. Compiler modern sering melakukan optimasi seperti ini secara otomatis, tetapi memahami konsepnya tetap berguna.

Bitmask bisa dibayangkan seperti deretan saklar. Setiap bit adalah satu saklar. Operator `|` menyalakan bit tertentu, `& ~` mematikan bit tertentu, dan `&` mengecek apakah bit tertentu menyala. Satu byte berarti delapan saklar dalam satu angka.

---

## 3.5 Operator perbandingan & logika — dan kelahiran `if`

Operator perbandingan (`==`, `!=`, `<`, `>`, `<=`, `>=`) menghasilkan nilai boolean. C klasik tidak punya tipe `bool` asli sampai C99 menambahkan `<stdbool.h>`. Namun aturan dasarnya tetap sederhana.

> **`0` berarti false. Nilai selain nol berarti true.**

```c
printf("%d\n", 5 > 3);    // 1  (true)
printf("%d\n", 5 < 3);    // 0  (false)
printf("%d\n", 5 == 5);   // 1
```

Operator logika adalah `&&` (AND), `||` (OR), dan `!` (NOT). Dua operator pertama punya sifat penting bernama **short-circuit evaluation**:

- `A && B` — jika `A` sudah false, `B` **tidak dievaluasi**, karena hasil akhirnya pasti false.
- `A || B` — jika `A` sudah true, `B` **tidak dievaluasi**, karena hasil akhirnya pasti true.

Ini bukan hanya optimasi. Short-circuit sering dipakai untuk menulis kode yang aman:

```c
// kalau p NULL, bagian setelah && tidak dijalankan -> aman dari crash
if (p != NULL && *p > 0) { ... }
```

Kalau urutannya dibalik menjadi `*p > 0 && p != NULL`, program bisa crash, karena `*p` dijalankan lebih dulu saat `p` masih mungkin `NULL`. Dereference dan `NULL` akan dibahas tuntas di Bab 6, tetapi pola ini penting dikenali sejak sekarang.

> **Jangan keliru `=` dan `==`.** `=` adalah **assignment**, yaitu memberi nilai. `==` adalah **perbandingan**. `if (x = 5)` legal di C, tetapi hampir pasti bug. Baris itu mengisi `x` dengan 5, lalu hasil assignment bernilai 5, yang dianggap true. Akibatnya, blok `if` selalu berjalan. Compiler dengan `-Wall` biasanya akan memperingatkanmu.

---

## 3.6 `if`: di balik layar, ini adalah lompatan bersyarat

Sekarang masuk ke inti bab ini. Perhatikan `if` sederhana:

```c
int x = 7;
if (x > 5) {
    printf("besar\n");
} else {
    printf("kecil\n");
}
```

CPU tidak punya konsep `if` seperti yang kita lihat di C. Yang dimiliki CPU adalah instruksi **compare** seperti `cmp`, dan instruksi **conditional jump** seperti `jle`, `jg`, dan sejenisnya. Assembly-nya kira-kira seperti ini, disederhanakan:

```asm
        cmp   [x], 5          ; bandingkan x dengan 5 (mempengaruhi flags)
        jle   .blok_else      ; "Jump if Less or Equal": kalau x <= 5, lompat ke else
        ; --- blok if ---
        lea   rdi, .str_besar
        call  puts            ; printf("besar")
        jmp   .selesai        ; lompati blok else
.blok_else:
        lea   rdi, .str_kecil
        call  puts            ; printf("kecil")
.selesai:
        ; ... lanjut program
```

Alurnya bisa dibaca langkah demi langkah.

1. **`cmp [x], 5`** — CPU membandingkan `x` dengan 5. Secara internal, ini mirip menghitung `x - 5`, tetapi hasilnya tidak disimpan sebagai nilai biasa. Yang penting adalah efeknya terhadap **flags**.
2. **`jle .blok_else`** — ini instruksi lompat bersyarat. CPU membaca flags hasil `cmp`. Jika kondisi "less or equal" terpenuhi, Instruction Pointer diubah ke alamat `.blok_else`. Jika tidak, eksekusi lanjut lurus ke instruksi berikutnya, yaitu blok `if`.
3. Setelah blok `if` selesai, **`jmp .selesai`** dipakai untuk melompati blok `else`. Tanpa lompatan ini, blok `else` juga akan ikut dijalankan.

Jadi, `if/else` pada level CPU adalah kombinasi dari `cmp` yang mengatur flags dan conditional jump yang mengubah Instruction Pointer berdasarkan flags. Percabangan berarti CPU memilih alamat instruksi berikutnya.

Coba lihat sendiri. Tulis kode `if` di atas, lalu jalankan:

```bash
gcc -S -O0 file.c
```

Buka file `.s`, lalu cari `cmp` dan instruksi yang diawali `j`, seperti `jle`, `jg`, `je`, atau `jne`. Setelah melihat pola ini, control flow di C akan terasa jauh lebih konkret.

> **Catatan performa (branch prediction):** karena lompatan bersyarat sangat sering terjadi, CPU modern memiliki **branch predictor**. CPU mencoba menebak cabang mana yang akan diambil agar bisa mulai mengerjakan instruksi berikutnya lebih awal lewat pipeline. Jika tebakannya benar, eksekusi lebih cepat. Jika salah (**branch misprediction**), CPU harus membuang sebagian kerja dan mengulang dari jalur yang benar. Karena itu, pola percabangan bisa memengaruhi performa. Kamu belum perlu mendalami ini sekarang, tetapi konsepnya penting untuk nanti.

---

## 3.7 `switch`: tabel lompatan

`switch` adalah cara rapi untuk menulis banyak cabang berdasarkan satu nilai:

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
            break;          // <- penting; kalau lupa akan "jatuh" ke case berikutnya
        case 3:
            printf("tiga\n");
            break;
        default:
            printf("entah\n");
    }
    return 0;
}
```

Jebakan klasik di `switch` adalah `break`. Kalau kamu lupa menulis `break`, eksekusi akan **fall through**, yaitu lanjut menjalankan `case` di bawahnya. Kadang ini memang disengaja, tetapi lebih sering menjadi bug. Compiler dengan `-Wall` bisa membantu memberi peringatan.

Di balik layar, jika nilai `case` rapat seperti 1, 2, 3, dan seterusnya, compiler sering membuat **jump table**. Jump table adalah array berisi alamat instruksi. Nilai `pilihan` dipakai sebagai indeks untuk langsung lompat ke alamat yang sesuai. Pola ini O(1), lebih cepat daripada rantai `if-else` panjang yang harus diperiksa satu per satu.

Untuk nilai `case` yang jarang atau acak, compiler bisa memilih strategi lain, misalnya rantai perbandingan. Keputusan itu diambil compiler. Tugasmu adalah menulis `switch` yang jelas.

---

## 3.8 Loop: lompat ke belakang

Loop juga dibangun dari jump. Bedanya, loop melakukan lompatan ke **belakang**, ke alamat instruksi yang sudah dilewati, agar eksekusi bisa mengulang.

### `while`

```c
int i = 0;
while (i < 3) {
    printf("%d\n", i);
    i++;
}
```

Assembly-nya, disederhanakan, kira-kira seperti ini:

```asm
        mov   [i], 0
.cek:   cmp   [i], 3
        jge   .selesai      ; kalau i >= 3, keluar loop
        ; --- body ---
        ... printf ...
        add   [i], 1        ; i++
        jmp   .cek          ; LOMPAT KE BELAKANG, ulangi pengecekan
.selesai:
```

Instruksi `jmp .cek` di akhir membuat loop berulang. CPU kembali ke bagian pengecekan kondisi. Jadi loop adalah gabungan conditional branch untuk keluar dan unconditional branch untuk mengulang.

### `for`

`for` adalah bentuk yang lebih ringkas untuk pola loop yang punya inisialisasi, kondisi, dan update.

```c
for (inisialisasi; kondisi; update) {
    body
}
```

Secara konsep, bentuk itu setara dengan kode berikut.

```c
inisialisasi;
while (kondisi) {
    body
    update;
}
```

Berikut contoh `for` yang mencetak angka 0 sampai 2.

```c
for (int i = 0; i < 3; i++) {
    printf("%d\n", i);
}
```

Pakai `for` saat jumlah iterasi jelas atau mudah dihitung. Pakai `while` saat berhenti berdasarkan kondisi yang belum tentu diketahui sejak awal. Pada level assembly, keduanya tetap menjadi pola jump yang mirip.

### `do-while`

`do-while` mengecek kondisi **di akhir**, sehingga body dijamin berjalan **minimal sekali**.

```c
int n;
do {
    printf("Masukkan angka positif: ");
    scanf("%d", &n);
} while (n <= 0);
```

### `break` dan `continue`

- **`break`** — keluar paksa dari loop, yaitu lompat ke instruksi setelah loop.
- **`continue`** — melewati sisa body dan langsung lanjut ke iterasi berikutnya, yaitu lompat ke bagian update atau pengecekan kondisi.

Keduanya juga hanya bentuk lain dari jump ke alamat tertentu.

```c
for (int i = 0; i < 10; i++) {
    if (i == 5) break;       // berhenti total saat i == 5
    if (i % 2 == 0) continue; // lewati angka genap
    printf("%d ", i);         // cetak: 1 3
}
```

---

## 3.9 Operator-operator praktis lain

**Increment/decrement** adalah operator seperti `i++` (post-increment) dan `++i` (pre-increment). Keduanya menambah `i` dengan 1, tetapi nilai ekspresinya berbeda. `i++` menghasilkan nilai **lama** dulu, baru menambah. `++i` menambah dulu, lalu menghasilkan nilai baru.

```c
int i = 5;
printf("%d\n", i++);   // cetak 5, lalu i jadi 6
printf("%d\n", ++i);   // i jadi 7, lalu cetak 7
```

Jika dipakai sebagai statement berdiri sendiri seperti `i++;`, keduanya sama saja.

**Compound assignment** mencakup operator seperti `+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=`, dan `>>=`. Misalnya, `x += 5` sama dengan `x = x + 5`, tetapi lebih ringkas dan sering lebih jelas.

**Ternary operator** `? :` adalah bentuk `if-else` sebagai ekspresi.

```c
int max = (a > b) ? a : b;   // kalau a>b ambil a, kalau tidak ambil b
```

Operator ini cocok untuk pilihan sederhana. Hindari memakainya untuk logika berlapis, karena cepat menjadi sulit dibaca.

---

## 3.10 Operator precedence: siapa duluan

Seperti matematika, operator di C punya **precedence** atau prioritas. `*` dan `/` dikerjakan sebelum `+` dan `-`. Namun C punya banyak operator, dan beberapa aturan precedence tidak selalu intuitif, terutama saat bitwise bercampur dengan perbandingan.

```c
int x = 2 + 3 * 4;        // 14, bukan 20 (perkalian duluan)

// JEBAKAN: & punya precedence LEBIH RENDAH dari ==
if (a & MASK == 0) { }    // dibaca sebagai: a & (MASK == 0)  <- hampir pasti BUKAN maumu!
if ((a & MASK) == 0) { }  // ini yang benar
```

Jangan mengandalkan hafalan seluruh tabel precedence. Kalau ada keraguan, pakai tanda kurung `()`. Kurung membuat maksudmu eksplisit bagi compiler dan bagi manusia yang membaca kode, termasuk kamu sendiri beberapa bulan kemudian.

---

## 3.11 Rangkuman model mental

1. **CPU menjalankan siklus fetch-decode-execute.** Secara default, eksekusi berjalan lurus ke instruksi berikutnya, kecuali ada **jump/branch**.
2. **Register** adalah penyimpanan sangat cepat di dalam CPU. Perhitungan dilakukan di register lewat **ALU**, bukan langsung di RAM. Instruksi seperti `mov` memindahkan data antara RAM dan register.
3. **`if`** adalah kombinasi `cmp` untuk mengatur flags dan **conditional jump** untuk mengubah Instruction Pointer berdasarkan flags.
4. **Loop** adalah jump ke belakang untuk mengulang.
5. **Operator bitwise** (`& | ^ ~ << >>`) adalah alat penting dalam system programming untuk flag/bitmask, manipulasi register hardware, dan efisiensi.
6. **`0` berarti false, nilai selain nol berarti true.** Hati-hati membedakan `=` dan `==`.
7. **Short-circuit** pada `&&` dan `||` bisa dipakai untuk kode aman, misalnya mengecek `NULL` sebelum dereference.
8. Jika ragu tentang precedence, **pakai kurung**.

---

## 3.12 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis kode `if (x > 5) {...} else {...}`, compile dengan `gcc -S -O0`, dan buka `.s`-nya. Temukan instruksi `cmp` dan instruksi jump-nya. Cabang mana yang "lurus" dan mana yang "dilompati"?
2. Tulis fungsi yang mengecek apakah suatu `int` genap atau ganjil **tanpa** `%`, hanya dengan bitwise. Petunjuk: cek bit paling kanan dengan `& 1`.
3. Buat sistem flag pakai `#define` dan bitmask seperti contoh `FLAG_BACA` dan seterusnya. Gabungkan beberapa flag dengan `|`, lalu cek satu per satu dengan `&`. Tambahkan kode untuk **mematikan** satu flag dengan `&= ~`.
4. Tulis program yang sengaja fall through di `switch` dengan menghapus satu `break`. Amati outputnya. Lalu compile dengan `-Wall`. Apakah ada warning?
5. Bandingkan `for`, `while`, dan `do-while` untuk mencetak 1-5. Lalu ubah jadi mencetak mundur 5-1.
6. Tulis `int x = 5; if (x = 0) printf("A"); else printf("B");`. Apa yang tercetak, dan kenapa? Compile dengan `-Wall`. Apa kata compiler?

**Pertanyaan refleksi:**

1. Kenapa CPU butuh register, padahal sudah ada RAM yang jauh lebih besar?
2. Dengan kata-katamu sendiri, bagaimana sebuah `if` menjadi lompatan? Apa peran flags?
3. Apa itu short-circuit evaluation, dan bagaimana ia bisa mencegah crash saat bekerja dengan pointer?
4. Kapan kamu memilih `while` daripada `for`? Kapan `do-while`?
5. Kenapa `&` punya precedence lebih rendah dari `==`, dan kenapa ini sering jadi sumber bug? Bagaimana cara amannya?
6. Apa itu branch misprediction, dan kenapa pola percabangan bisa memengaruhi kecepatan program?

---

Di Bab 4, kita masuk ke salah satu topik yang paling penting dalam C: **functions dan stack**. Kita akan melihat apa yang terjadi saat sebuah fungsi dipanggil, di mana variabel lokal disimpan, apa itu return address, dan kenapa recursion yang terlalu dalam bisa menyebabkan **stack overflow**.
