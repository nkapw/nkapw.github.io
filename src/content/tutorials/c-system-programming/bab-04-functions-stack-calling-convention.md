---
title: "Bab 4 — Functions, Stack & Calling Convention"
description: "Di Bab 2, kita membahas data. Di Bab 3, kita membahas eksekusi, branch, dan Instruction Pointer. Sekarang dua konsep itu bertemu saat kita membahas fungsi. Fungsi..."
tags: [c, system-programming]
order: 4
updated: 2026-06-21
---

> "Setiap kali fungsi dipanggil, CPU perlu tahu satu hal penting: setelah fungsi ini selesai, eksekusi harus kembali ke mana?"

Di Bab 2, kita membahas data. Di Bab 3, kita membahas eksekusi, branch, dan Instruction Pointer. Sekarang dua konsep itu bertemu saat kita membahas **fungsi**. Fungsi bukan hanya cara membuat blok kode yang bisa dipanggil ulang; setiap pemanggilan fungsi juga meninggalkan jejak di memori.

Di bab ini, beberapa konsep dasar C akan dipakai sekaligus: **stack frame**, **return address**, dan **calling convention**. Setelah memahaminya, kamu akan mengerti kenapa variabel lokal hilang setelah fungsi selesai, kenapa recursion bisa membuat program crash, dan nanti di Bab 21, kenapa buffer overflow bisa membajak alur program.

---

## 4.1 Kenapa kita butuh fungsi

Alasan praktis memakai fungsi cukup jelas. Fungsi menghindari pengulangan kode, memecah masalah besar menjadi bagian kecil, dan membuat program lebih mudah dibaca. Mari mulai dari bentuk dasarnya:

```c
#include <stdio.h>

// deklarasi (prototype): janji bahwa fungsi ini ada
int tambah(int a, int b);

int main(void) {
    int hasil = tambah(3, 4);
    printf("hasil = %d\n", hasil);
    return 0;
}

// definisi: implementasi sesungguhnya
int tambah(int a, int b) {
    int total = a + b;
    return total;
}
```

Beberapa istilah perlu dipakai dengan tepat:

- **Return type** (`int`) — tipe nilai yang dikembalikan fungsi.
- **Parameter** (`int a, int b`) — variabel yang menerima nilai saat fungsi dipanggil. Parameter adalah variabel lokal di dalam fungsi.
- **Argument** — nilai aktual yang dikirim saat pemanggilan, misalnya `3` dan `4`. Parameter adalah wadah; argumen adalah isi yang dimasukkan ke wadah itu.
- **Return value** — nilai yang dikirim kembali ke pemanggil lewat `return`.

Ingat dari Bab 1: **deklarasi** atau prototype adalah janji bahwa fungsi dengan bentuk tertentu tersedia. **Definisi** adalah kode fungsi yang sebenarnya. Prototype perlu terlihat sebelum fungsi dipanggil agar compiler bisa mengecek tipe argumen. Jika definisi `tambah` ditulis di atas `main`, prototype tidak wajib. Namun kebiasaan menulis prototype tetap berguna, terutama saat program dipecah menjadi banyak file di Bab 11.

---

## 4.2 Pass by value: C selalu mengirim salinan

Konsep ini perlu jelas sejak awal, karena banyak bug C berawal dari salah paham di sini.

> **Di C, argumen selalu dikirim sebagai salinan (pass by value). Fungsi bekerja pada salinan, bukan pada variabel asli milik pemanggil.**

```c
#include <stdio.h>

void coba_ubah(int x) {
    x = 999;            // ini mengubah SALINAN lokal, bukan asli
    printf("di dalam fungsi: x = %d\n", x);  // 999
}

int main(void) {
    int a = 5;
    coba_ubah(a);
    printf("setelah dipanggil: a = %d\n", a); // tetap 5!
    return 0;
}
```

Output:

```
di dalam fungsi: x = 999
setelah dipanggil: a = 5
```

`a` tetap bernilai `5`. Saat `coba_ubah(a)` dipanggil, nilai `5` disalin ke parameter `x`. `x` adalah variabel baru yang terpisah di memori. Mengubah `x` tidak menyentuh `a`.

Bayangkan kamu memberi teman fotokopi dokumen. Ia boleh mencoret-coret fotokopi itu, tetapi dokumen asli tetap tidak berubah. Begitu pula dengan pass by value.

Kalau kamu ingin fungsi mengubah variabel asli, yang dikirim bukan nilainya, melainkan **alamat**-nya. Itu berarti memakai pointer, dan akan kita bahas di Bab 6. Untuk sekarang, pegang aturan dasar bahwa **pemanggilan fungsi di C menyalin nilai argumen ke parameter.**

---

## 4.3 Stack: tempat fungsi hidup

Sekarang pertanyaannya, **di mana parameter `x`, variabel lokal `total`, dan variabel lokal lain disimpan?** Semuanya disimpan di region memori bernama **stack**, atau lebih lengkapnya **call stack**.

### Apa itu stack?

Stack adalah region memori yang dikelola dengan disiplin **LIFO** (Last In, First Out): yang terakhir masuk akan keluar lebih dulu. Bayangkan tumpukan piring. Piring baru ditaruh di atas, dan saat mengambil, kamu juga mengambil dari atas. Kamu tidak mengambil piring dari tengah tumpukan.

Dalam konteks fungsi, setiap pemanggilan fungsi menambahkan catatan baru di atas stack. Catatan itu berisi informasi yang dibutuhkan fungsi tersebut: variabel lokal, sebagian informasi register, dan alamat untuk kembali setelah fungsi selesai. Saat fungsi selesai, catatan paling atas dibuang, lalu eksekusi kembali ke pemanggil.

### Stack frame

Setiap kali sebuah fungsi dipanggil, satu ruang di stack dialokasikan untuk fungsi itu. Ruang ini disebut **stack frame** atau *activation record*. Satu stack frame berisi:

- **Parameter** fungsi, yaitu salinan argumen dari pemanggil.
- **Variabel lokal** fungsi.
- **Return address** — alamat instruksi di pemanggil yang harus dituju setelah fungsi selesai. Jika mengingat Instruction Pointer dari Bab 3, return address adalah nilai tujuan yang akan dipakai untuk mengembalikan IP.
- Beberapa nilai register yang perlu disimpan sementara (saved registers).

Saat fungsi melakukan `return`, frame-nya dibuang dari stack, lalu eksekusi melompat kembali ke return address. Inilah alasan variabel lokal hilang setelah fungsi selesai: variabel lokal hidup di stack frame, dan frame itu dibuang saat fungsi selesai. Memori tersebut kemudian bisa dipakai ulang oleh pemanggilan fungsi lain.

### Stack pointer

CPU melacak puncak stack dengan register khusus bernama **stack pointer**. Di x86-64, register ini bernama `rsp`. Operasi push menggeser `rsp` untuk membuat ruang baru; pop menggesernya kembali.

Ada juga **base pointer** atau **frame pointer** (`rbp`) yang menandai dasar frame saat ini. Ini memudahkan akses ke parameter dan variabel lokal relatif terhadap posisi frame.

> **Fakta penting:** di banyak arsitektur, termasuk x86-64, **stack tumbuh ke bawah**, yaitu ke arah alamat yang lebih kecil. Jadi push justru mengurangi nilai `rsp`. Ini adalah konvensi arsitektur, dan penting saat membaca debugger atau assembly.

---

## 4.4 Membongkar pemanggilan fungsi, langkah demi langkah

Sekarang kita runut apa yang terjadi saat `main` memanggil `tambah(3, 4)` dari Bagian 4.1. Penjelasan ini disederhanakan, tetapi mengikuti pola umum di x86-64.

**Sebelum pemanggilan:** stack berisi frame `main`.

```
  [ frame main ]   <- berisi variabel 'hasil', dll
  ...ruang kosong di bawah...   (stack tumbuh ke bawah, ke alamat kecil)
```

**Langkah 1 — siapkan argumen.** Calling convention di Linux x86-64 (System V ABI) menentukan bahwa argumen integer pertama dikirim lewat register `rdi`, argumen kedua lewat `rsi`, ketiga lewat `rdx`, lalu `rcx`, `r8`, dan `r9`. Argumen berikutnya baru memakai stack. Jadi nilai `3` ditaruh di `edi`, dan `4` ditaruh di `esi`. Untuk fungsi sederhana, argumen sering tidak perlu menyentuh stack sama sekali karena register lebih cepat.

**Langkah 2 — instruksi `call tambah`.** Instruksi `call` melakukan dua hal:

1. **Push return address** ke stack, yaitu alamat instruksi setelah `call` di dalam `main`.
2. Mengubah Instruction Pointer ke alamat awal fungsi `tambah`.

```
  [ frame main ]
  [ return address -> ke dalam main ]   <- baru di-push oleh 'call'
```

**Langkah 3 — prolog fungsi `tambah`.** Begitu masuk ke `tambah`, fungsi menjalankan instruksi pembuka atau prolog. Prolog biasanya menyimpan base pointer lama, membuat frame baru, dan menggeser stack pointer untuk memberi ruang bagi variabel lokal seperti `total`.

```
  [ frame main ]
  [ return address ]
  [ frame tambah ]   <- a, b, total tinggal di sini (atau di register)
```

**Langkah 4 — body berjalan.** `total = a + b` dihitung oleh ALU seperti yang dibahas di Bab 3. Nilai return, yaitu `7`, ditaruh di register `eax`. Konvensinya, nilai return integer dikembalikan lewat `rax` atau `eax`.

**Langkah 5 — epilog & `ret`.** Fungsi membereskan frame-nya lewat epilog, lalu menjalankan instruksi `ret`. Instruksi `ret`:

1. **Pop return address** dari stack.
2. Mengubah Instruction Pointer ke alamat itu, sehingga eksekusi kembali ke `main` tepat setelah `call`.

```
  [ frame main ]    <- frame tambah sudah hilang; kembali ke main
```

**Langkah 6 — `main` lanjut.** `main` mengambil nilai return dari `eax`, lalu menyimpannya ke variabel `hasil`.

Jadi, pemanggilan fungsi pada level mesin adalah rangkaian langkah konkret. CPU menyimpan return address, lompat ke fungsi, membuat stack frame, menjalankan body, lalu memakai `ret` untuk kembali ke alamat yang sudah disimpan. Stack menyimpan jalur pulang itu. Tanpa stack, pemanggilan bertingkat seperti A memanggil B, B memanggil C, lalu C kembali ke B dan B kembali ke A akan sulit dikelola.

> Kamu bisa melihat pola ini sendiri. Tulis kode Bagian 4.1, lalu compile dengan `gcc -S -O0` dan buka file `.s`. Cari `call tambah`, `push rbp` sebagai bagian dari prolog, `mov eax, ...` sebagai nilai return, `pop rbp`, dan `ret`. Kamu juga bisa memakai `gdb` di Bab 20: pasang `break tambah`, lalu jalankan `backtrace` untuk melihat tumpukan frame.

---

## 4.5 Calling convention: aturan main antar fungsi

**Calling convention** adalah kontrak yang mengatur cara fungsi saling memanggil. Kontrak ini menentukan bagaimana argumen dikirim, di mana nilai return diletakkan, siapa yang membersihkan stack, register mana yang boleh diubah fungsi, dan register mana yang harus dijaga.

Kontrak ini penting untuk beberapa alasan:

1. **Interoperability.** Fungsi hasil kompilasi `gcc` bisa memanggil fungsi dari library yang dikompilasi oleh compiler lain, selama keduanya mengikuti calling convention yang sama. Kontrak ini adalah bagian dari ABI, atau Application Binary Interface.
2. **Memahami crash & assembly.** Saat membaca disassembly atau men-debug program, kamu akan sering melihat pola seperti `rdi`, `rsi`, dan `rax`. Dengan mengetahui konvensinya, kamu bisa membaca apa yang sedang terjadi.
3. **Fondasi debugging dan keamanan tingkat lanjut.** Buffer overflow yang menimpa return address di Bab 21 hanya masuk akal kalau kamu memahami struktur stack frame dari Bagian 4.4.

Kamu tidak perlu menghafal detail ABI sekarang. Yang perlu dipahami adalah adanya aturan ketat di balik pemanggilan fungsi. Sebagian argumen lewat register tertentu, nilai return biasanya lewat `rax`, dan beberapa register punya aturan penyimpanan sendiri.

---

## 4.6 Recursion: fungsi memanggil dirinya sendiri

Karena setiap pemanggilan fungsi mendapat stack frame sendiri, sebuah fungsi bisa memanggil dirinya sendiri. Tiap level pemanggilan punya salinan parameter dan variabel lokalnya sendiri. Inilah **recursion**.

```c
#include <stdio.h>

int faktorial(int n) {
    if (n <= 1)            // base case: penghenti rekursi
        return 1;
    return n * faktorial(n - 1);   // recursive case
}

int main(void) {
    printf("%d\n", faktorial(4));  // 24
    return 0;
}
```

Saat `faktorial(4)` berjalan, stack menumpuk seperti ini. Setiap baris mewakili satu frame:

```
faktorial(4)  -> butuh hasil faktorial(3)
  faktorial(3)  -> butuh hasil faktorial(2)
    faktorial(2)  -> butuh hasil faktorial(1)
      faktorial(1)  -> base case, return 1
```

Setelah mencapai base case, hasil mulai kembali ke atas saat tiap frame selesai:

```
faktorial(1) = 1
faktorial(2) = 2 * 1 = 2
faktorial(3) = 3 * 2 = 6
faktorial(4) = 4 * 6 = 24
```

Setiap frame menyimpan nilai `n` sendiri. `n` di `faktorial(4)` adalah `4`, sementara `n` di `faktorial(3)` adalah `3`. Keduanya hidup di frame yang berbeda, sehingga tidak saling mengganggu. Karena itulah recursion bisa "mengingat" konteks tiap level.

**Base case harus ada.** Tanpa kondisi penghenti seperti `if (n <= 1)`, fungsi akan terus memanggil dirinya sendiri. Stack akan terus bertambah sampai habis, lalu program mengalami **stack overflow**.

---

## 4.7 Stack overflow: saat tumpukan kepenuhan

Stack bukan ruang tak terbatas. Sistem operasi memberi tiap program jatah stack tertentu. Di Linux, default-nya sering sekitar 8 MB, dan bisa dicek dengan:

```bash
ulimit -s
```

Kalau stack frame menumpuk melebihi batas itu, terjadilah **stack overflow**. Program biasanya langsung crash dengan `Segmentation fault`.

Dua penyebab umum:

1. **Recursion tak terbatas atau terlalu dalam.** Misalnya lupa base case, atau rekursi yang kedalamannya sangat besar.
   ```c
   int infinite(int n) {
       return infinite(n + 1);   // tak ada base case -> stack overflow -> crash
   }
   ```
2. **Variabel lokal raksasa.** Misalnya membuat array sangat besar di stack.
   ```c
   void boros(void) {
       int arr[10000000];   // ~40 MB di stack -> kemungkinan besar overflow
       arr[0] = 1;
   }
   ```
   Untuk kasus seperti ini, array besar sebaiknya dialokasikan di **heap** memakai `malloc`, yang akan dibahas di Bab 9.

Stack overflow bisa dibayangkan seperti tumpukan piring yang tingginya terbatas. Jika terus ditambah tanpa henti, akhirnya tumpukan itu melewati batas. Pada program, batas itu adalah jatah stack.

> Situs tanya-jawab programmer terkenal itu dinamai "Stack Overflow" karena error klasik ini.

---

## 4.8 Stack vs Heap: kenalan awal

Heap akan dibahas tuntas di Bab 9. Namun karena stack dan heap sudah disebut, kita perlu peta singkatnya terlebih dahulu:

| Aspek | **Stack** | **Heap** |
|-------|-----------|----------|
| Dikelola oleh | Otomatis (compiler/CPU, saat fungsi masuk/keluar) | Manual (kamu: `malloc`/`free`) |
| Kecepatan | Sangat cepat (cuma geser pointer) | Lebih lambat (cari blok kosong) |
| Ukuran | Terbatas (beberapa MB) | Besar (hampir sebesar RAM tersedia) |
| Umur data | Selama fungsi berjalan | Sampai kamu `free` |
| Untuk apa | Variabel lokal, parameter, return address | Data besar / yang umurnya melampaui satu fungsi |

Untuk sementara, pakai aturan praktis ini. **Variabel lokal biasa masuk stack** karena otomatis dan cepat. **Data besar atau data yang harus tetap hidup setelah fungsi selesai masuk heap**, tetapi harus dikelola manual.

Perbedaan umur data adalah bagian yang paling sering menyebabkan bug. Nilai di stack mengikuti umur fungsi: begitu fungsi selesai, frame-nya hilang. Nilai di heap tidak otomatis hilang saat fungsi return, sehingga bisa dipakai melewati batas satu fungsi, tetapi kamu juga bertanggung jawab memanggil `free` pada waktu yang tepat.

---

## 4.9 Bahaya klasik: mengembalikan alamat variabel lokal

Karena variabel lokal mati saat fungsi selesai, kode seperti ini adalah bug serius:

```c
int *bikin_angka(void) {
    int x = 42;
    return &x;        // BAHAYA: mengembalikan alamat variabel lokal!
}                     // x mati di sini; alamatnya jadi dangling
```

`x` hidup di stack frame `bikin_angka`. Begitu fungsi return, frame itu dibuang dan ruang memorinya bisa dipakai ulang oleh pemanggilan fungsi berikutnya. Alamat yang dikembalikan menunjuk ke memori yang sudah tidak valid. Ini disebut **dangling pointer**.

Memakai dangling pointer menghasilkan undefined behavior. Kadang program terlihat berjalan benar, kadang crash, kadang data korup. Kasus yang paling sulit dilacak biasanya justru yang terlihat benar cukup lama, lalu rusak saat kondisi berubah.

Compiler dengan `-Wall` biasanya memperingatkan kasus jelas seperti ini:

```text
warning: function returns address of local variable
```

Solusi yang benar bisa berupa mengembalikan nilai langsung, atau mengalokasikan data di heap. Kita bahas caranya di Bab 6 dan Bab 9. Untuk sekarang, pegang aturan ini: **jangan mengembalikan alamat variabel lokal.**

---

## 4.10 `void`, multiple return, dan scope singkat

**Fungsi `void`** tidak mengembalikan nilai. Biasanya dipakai untuk fungsi yang melakukan aksi, misalnya mencetak sesuatu atau mengubah state, bukan menghasilkan nilai.

```c
void sapa(void) { printf("halo\n"); }
```

Pada deklarasi `void sapa(void)`, `void` pertama berarti fungsi tidak punya return value. `void` di dalam parameter berarti fungsi tidak menerima argumen. Ini berbeda dari fungsi yang mengembalikan `int`, `char`, atau tipe lain.

**Satu nilai return saja.** `return` mengembalikan satu nilai. Jika ingin mengembalikan banyak nilai, kamu bisa memakai pointer seperti yang akan dibahas di Bab 6/7, atau `struct` seperti di Bab 8.

Pilihan ini bukan hanya soal gaya. Pointer cocok ketika fungsi perlu mengisi beberapa output lewat alamat yang diberikan pemanggil. `struct` cocok ketika beberapa nilai itu memang membentuk satu paket data yang masuk akal dikembalikan bersama.

**Scope (lingkup) variabel.** Variabel yang dideklarasikan di dalam blok `{ }` hanya terlihat di dalam blok itu. Variabel lokal fungsi tidak bisa diakses langsung dari fungsi lain. Ini konsisten dengan fakta bahwa variabel lokal hidup di stack frame fungsi tersebut.

Scope mengatur nama mana yang bisa dipakai oleh kode. Lifetime mengatur berapa lama objeknya hidup di memori. Untuk variabel lokal biasa, keduanya sering terasa berjalan bersama: namanya hanya terlihat di dalam fungsi atau blok, dan memorinya hanya valid selama frame itu masih hidup.

Ada juga variabel `static` lokal yang umurnya sepanjang program walaupun scope-nya tetap lokal. Kita akan membahas storage class seperti ini di Bab 11.

---

## 4.11 Rangkuman model mental

1. **C selalu pass by value.** Argumen disalin. Kalau ingin mengubah variabel asli, kirim alamatnya memakai pointer di Bab 6.
2. **Stack** adalah region memori LIFO untuk pemanggilan fungsi. Di x86-64, stack tumbuh ke bawah, ke arah alamat yang lebih kecil.
3. Setiap pemanggilan fungsi punya **stack frame** berisi parameter, variabel lokal, saved registers, dan **return address**.
4. **`call`** menyimpan return address lalu lompat ke fungsi. **`ret`** mengambil return address dan lompat balik. Stack menyimpan jalur pulang.
5. **Variabel lokal mati saat fungsi return** karena stack frame-nya dibuang. Jangan mengembalikan alamatnya.
6. **Calling convention (ABI)** adalah kontrak antar fungsi: argumen dikirim lewat register mana, return lewat register mana, dan register mana yang harus dijaga.
7. **Recursion** bekerja karena tiap level punya frame sendiri. Base case harus ada.
8. **Stack overflow** terjadi saat stack kepenuhan, biasanya karena rekursi tak terbatas atau variabel lokal raksasa.

---

## 4.12 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Jalankan contoh `coba_ubah` dari Bagian 4.2. Konfirmasi bahwa `a` tetap `5`. Lalu jelaskan ke dirimu sendiri, dengan istilah "salinan", kenapa hasilnya begitu.
2. Tulis fungsi `faktorial` rekursif, lalu compile dengan `gcc -S -O0` dan cari `call faktorial` di assembly-nya. Buktikan bahwa fungsi memang memanggil dirinya sendiri lewat `call`.
3. Pakai `gdb`: compile dengan `gcc -g`, lalu jalankan `break faktorial`, `run`, dan ketik `backtrace` beberapa kali sambil `continue`. Amati tumpukan frame bertambah. Ini baru perkenalan singkat dengan `gdb`; detailnya ada di Bab 20.
4. Tulis fungsi rekursif **tanpa** base case, atau dengan base case yang tidak pernah tercapai. Jalankan. Error apa yang muncul? Cek jatah stack-mu dengan `ulimit -s`.
5. Deklarasikan `int arr[10000000];` sebagai variabel lokal di sebuah fungsi dan jalankan. Apa yang terjadi? Lalu pindahkan ke `malloc` sebagai pemanasan sebelum Bab 9. Apakah hasilnya berubah?
6. Tulis fungsi yang melakukan `return &x;` dengan `x` sebagai variabel lokal. Compile dengan `-Wall`. Baca persis bunyi warning-nya.

**Pertanyaan refleksi:**

1. Kenapa mengubah parameter di dalam fungsi tidak mengubah variabel asli pemanggil? Jelaskan memakai konsep stack frame.
2. Apa isi sebuah stack frame? Bagian mana yang paling penting untuk kembali ke pemanggil?
3. Dengan kata-katamu sendiri, apa yang dilakukan `call` dan `ret` terhadap stack dan Instruction Pointer?
4. Kenapa recursion butuh base case? Apa hubungannya dengan stack overflow?
5. Kenapa mengembalikan `&x`, yaitu alamat variabel lokal, berbahaya walaupun kadang program terlihat berjalan?
6. Kenapa data besar sebaiknya disimpan di heap, bukan stack? Apa konsekuensinya kalau dipaksakan di stack?
7. Apa gunanya calling convention/ABI, dan kenapa ia membuat library dari pihak berbeda bisa saling dipanggil?

---

Kita sekarang punya fondasi tentang data, eksekusi, dan pemanggilan fungsi. Di Bab 5, kita mulai masuk ke inti C berikutnya: **arrays & strings**. Kita akan melihat bagaimana banyak data ditata berdampingan di memori, kenapa `array[i]` berhubungan dengan aritmetika alamat, dan kenapa string di C adalah array karakter yang diakhiri nol.
