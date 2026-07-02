---
title: "Bab 4 - Fungsi, Stack, dan Konvensi Pemanggilan"
description: "Bab sebelumnya telah membahas data, eksekusi, dan percabangan. Bab ini menghubungkan konsep tersebut dengan fungsi, terutama apa yang terjadi di memori saat sebuah..."
tags: [c, systems-programming]
order: 4
updated: 2026-07-02
---
Bab sebelumnya telah membahas data, eksekusi, dan percabangan. Bab ini menghubungkan konsep tersebut dengan fungsi, terutama apa yang terjadi di memori saat sebuah fungsi dipanggil.

Fungsi bukan sekadar cara memecah program menjadi beberapa blok kode. Di balik pemanggilan fungsi, CPU dan compiler bekerja dengan stack frame, return address, register, dan aturan ABI. Pemahaman ini penting untuk menjelaskan mengapa variabel lokal hanya hidup selama fungsi berjalan, mengapa rekursi dapat membuat program crash, dan mengapa buffer overflow dapat mengubah alur eksekusi program.

---

## 4.1 Mengapa Fungsi Diperlukan

Fungsi membantu program tetap terstruktur. Kode yang berulang dapat dipindahkan ke satu tempat, masalah besar dapat dipecah menjadi bagian yang lebih kecil, dan maksud program menjadi lebih mudah dibaca.

Contoh sederhana.

```c
#include <stdio.h>

// deklarasi atau prototype
int tambah(int a, int b);

int main(void) {
    int hasil = tambah(3, 4);
    printf("hasil = %d\n", hasil);
    return 0;
}

// definisi fungsi
int tambah(int a, int b) {
    int total = a + b;
    return total;
}
```

Beberapa istilah perlu digunakan secara presisi.

- **Tipe kembalian** adalah tipe nilai yang dikembalikan fungsi. Pada contoh di atas, tipe kembalian fungsi `tambah` adalah `int`.
- **Parameter** adalah variabel yang menerima nilai saat fungsi dipanggil. Pada contoh di atas, `a` dan `b` adalah parameter.
- **Argumen** adalah nilai aktual yang dikirim saat fungsi dipanggil. Pada contoh di atas, `3` dan `4` adalah argumen.
- **Nilai kembalian** adalah nilai yang dikirim kembali ke pemanggil melalui `return`.

Deklarasi atau prototype memberi tahu compiler bahwa sebuah fungsi tersedia dengan bentuk tertentu. Definisi berisi implementasi fungsi tersebut. Prototype perlu diketahui compiler sebelum fungsi dipanggil agar tipe argumen dapat diperiksa. Jika definisi fungsi ditulis sebelum `main`, prototype tidak wajib. Namun, dalam program yang dibagi ke banyak file, prototype menjadi bagian penting dari struktur kode.

---

## 4.2 Pass by Value

C selalu mengirim argumen sebagai salinan. Fungsi bekerja pada salinan tersebut, bukan pada variabel asli milik pemanggil.

```c
#include <stdio.h>

void coba_ubah(int x) {
    x = 999;
    printf("di dalam fungsi, x = %d\n", x);
}

int main(void) {
    int a = 5;
    coba_ubah(a);
    printf("setelah dipanggil, a = %d\n", a);
    return 0;
}
```

Output program.

```text
di dalam fungsi, x = 999
setelah dipanggil, a = 5
```

Nilai `a` tetap `5`. Saat `coba_ubah(a)` dipanggil, nilai `5` disalin ke parameter `x`. Parameter `x` adalah variabel lokal baru yang terpisah dari `a`. Mengubah `x` tidak mengubah `a`.

Jika sebuah fungsi perlu mengubah variabel asli milik pemanggil, fungsi tersebut harus menerima alamat variabel melalui pointer. Pembahasan itu dimulai pada Bab 6. Untuk saat ini, hal terpenting adalah memahami bahwa pemanggilan fungsi di C selalu berbasis salinan.

---

## 4.3 Stack sebagai Tempat Kerja Fungsi

Parameter, variabel lokal, return address, dan beberapa data pendukung pemanggilan fungsi disimpan di region memori bernama **stack**. Dalam konteks pemanggilan fungsi, stack sering disebut **call stack**.

### Sifat stack

Stack dikelola dengan disiplin **LIFO** atau **Last In, First Out**. Data yang masuk paling akhir akan keluar paling awal. Pada pemanggilan fungsi, frame fungsi yang sedang berjalan berada di posisi paling atas secara logis. Saat fungsi selesai, frame tersebut dilepas dan eksekusi kembali ke pemanggil.

### Stack frame

Setiap pemanggilan fungsi mendapatkan area kerja sendiri di stack. Area ini disebut **stack frame** atau **activation record**. Isi tepatnya bergantung pada arsitektur, compiler, level optimisasi, dan calling convention, tetapi secara konseptual stack frame memuat beberapa bagian penting.

- Salinan parameter fungsi.
- Variabel lokal fungsi.
- **Return address**, yaitu alamat instruksi yang harus dijalankan setelah fungsi selesai.
- Register tertentu yang perlu disimpan sementara.

Saat fungsi menjalankan `return`, stack frame miliknya dilepas. Karena variabel lokal berada di dalam frame tersebut, variabel lokal tidak lagi valid setelah fungsi selesai.

### Stack pointer

CPU melacak posisi stack melalui register khusus bernama **stack pointer**. Pada x86-64, register ini bernama `rsp`. Operasi yang menambah data ke stack menggeser stack pointer untuk menyediakan ruang. Operasi yang melepas data dari stack menggesernya kembali.

Banyak fungsi juga menggunakan **base pointer** atau **frame pointer**. Pada x86-64, register yang umum digunakan adalah `rbp`. Register ini membantu compiler mengakses parameter dan variabel lokal dengan offset yang stabil dari awal frame.

Pada banyak arsitektur, termasuk x86-64, stack tumbuh ke arah alamat yang lebih kecil. Artinya, ketika ruang baru dialokasikan di stack, nilai `rsp` biasanya berkurang. Detail ini penting saat membaca assembly atau memeriksa memori dengan debugger.

---

## 4.4 Pemanggilan Fungsi Langkah demi Langkah

Bagian ini membahas apa yang terjadi saat `main` memanggil `tambah(3, 4)`. Penjelasan ini disederhanakan, tetapi tetap mengikuti pola umum pada Linux x86-64 dengan System V ABI.

Sebelum fungsi dipanggil, stack sudah berisi frame milik `main`.

```text
[ frame main ]
```

Langkah pertama adalah menyiapkan argumen. Pada System V ABI untuk x86-64, argumen integer pertama dikirim melalui `rdi`, argumen kedua melalui `rsi`, argumen ketiga melalui `rdx`, kemudian `rcx`, `r8`, dan `r9`. Argumen berikutnya menggunakan stack. Dalam contoh ini, nilai `3` masuk ke `edi` dan nilai `4` masuk ke `esi`.

Langkah kedua adalah menjalankan instruksi `call tambah`. Instruksi `call` menyimpan return address ke stack, lalu mengubah Instruction Pointer agar menunjuk ke awal fungsi `tambah`.

```text
[ frame main ]
[ return address ke main ]
```

Return address adalah alamat instruksi setelah `call` di fungsi pemanggil. Alamat inilah yang digunakan untuk melanjutkan eksekusi setelah `tambah` selesai.

Langkah ketiga adalah prolog fungsi. Saat `tambah` mulai berjalan, compiler dapat menghasilkan instruksi pembuka untuk menyimpan base pointer lama, membuat base pointer baru, dan menyediakan ruang bagi variabel lokal.

```text
[ frame main ]
[ return address ]
[ frame tambah ]
```

Langkah keempat adalah menjalankan isi fungsi. Ekspresi `a + b` dihitung, lalu hasilnya disiapkan sebagai nilai kembalian. Pada konvensi x86-64 yang umum, nilai kembalian integer diletakkan di `eax` atau `rax`.

Langkah kelima adalah epilog dan `ret`. Fungsi mengembalikan kondisi stack ke keadaan sebelum frame dibuat, lalu instruksi `ret` mengambil return address dari stack dan mengatur Instruction Pointer ke alamat tersebut.

```text
[ frame main ]
```

Langkah keenam adalah melanjutkan eksekusi di `main`. Nilai return diambil dari `eax` dan disimpan ke variabel `hasil`.

Secara ringkas, pemanggilan fungsi berarti menyimpan return address dan melompat ke fungsi yang dipanggil. Return berarti mengambil return address dan melompat kembali ke pemanggil. Stack menyediakan struktur yang memungkinkan pemanggilan fungsi bertingkat seperti A memanggil B, B memanggil C, dan C kembali ke B sebelum B kembali ke A.

Proses ini dapat diperiksa secara langsung dengan menghasilkan assembly dari contoh di atas.

```sh
gcc -S -O0 contoh.c
```

Di file assembly, cari instruksi seperti `call tambah`, `push rbp`, `mov eax, ...`, `pop rbp`, dan `ret`. Dengan `gdb`, perintah `backtrace` akan menampilkan urutan stack frame yang sedang aktif.

---

## 4.5 Konvensi Pemanggilan

Konvensi pemanggilan adalah aturan yang menentukan cara fungsi saling memanggil pada level mesin. Aturan ini mencakup lokasi argumen, register untuk nilai kembalian, tanggung jawab pembersihan stack, serta register yang harus dijaga oleh pemanggil atau oleh fungsi yang dipanggil.

Konvensi pemanggilan penting karena beberapa alasan.

- Fungsi hasil kompilasi satu compiler dapat memanggil fungsi dari pustaka lain selama keduanya mengikuti ABI yang sama.
- Proses debugging dan pembacaan assembly menjadi lebih masuk akal karena pola register seperti `rdi`, `rsi`, dan `rax` memiliki arti tertentu.
- Bug tingkat rendah seperti buffer overflow terhadap return address hanya dapat dipahami dengan benar jika struktur frame dan aturan pemanggilan fungsi sudah jelas.

ABI atau **Application Binary Interface** adalah kontrak biner yang membuat kode dari sumber berbeda dapat bekerja bersama. Detail ABI tidak perlu dihafal pada tahap ini. Hal yang penting adalah pemanggilan fungsi mengikuti aturan ketat, bukan keputusan bebas dari setiap fungsi.

---

## 4.6 Rekursi

Rekursi terjadi ketika sebuah fungsi memanggil dirinya sendiri. Ini dapat berjalan karena setiap pemanggilan fungsi mendapat stack frame sendiri. Variabel lokal pada satu level pemanggilan fungsi tidak sama dengan variabel lokal pada level lainnya.

```c
#include <stdio.h>

int faktorial(int n) {
    if (n <= 1)
        return 1;
    return n * faktorial(n - 1);
}

int main(void) {
    printf("%d\n", faktorial(4));
    return 0;
}
```

Saat `faktorial(4)` berjalan, urutan pemanggilan fungsi membentuk beberapa frame.

```text
faktorial(4) membutuhkan faktorial(3)
faktorial(3) membutuhkan faktorial(2)
faktorial(2) membutuhkan faktorial(1)
faktorial(1) mengembalikan 1
```

Setelah mencapai kondisi penghenti, hasil dikembalikan melalui frame yang masih aktif.

```text
faktorial(1) = 1
faktorial(2) = 2 * 1 = 2
faktorial(3) = 3 * 2 = 6
faktorial(4) = 4 * 6 = 24
```

Setiap frame menyimpan nilai `n` sendiri. `n` pada `faktorial(4)` bernilai `4`, sedangkan `n` pada `faktorial(3)` bernilai `3`. Keduanya berada pada frame yang berbeda.

Rekursi wajib memiliki **base case**, yaitu kondisi yang menghentikan pemanggilan fungsi berikutnya. Tanpa base case, fungsi akan terus memanggil dirinya sendiri sampai stack habis.

---

## 4.7 Stack Overflow

Stack memiliki ukuran terbatas. Sistem operasi memberi setiap program jatah stack tertentu. Pada banyak sistem Linux, nilai default sering berada di kisaran beberapa megabyte dan dapat diperiksa dengan `ulimit -s`.

**Stack overflow** terjadi ketika kebutuhan stack melebihi jatah tersebut. Program biasanya berhenti dengan error seperti `Segmentation fault`.

Dua penyebab umum stack overflow adalah rekursi yang terlalu dalam dan variabel lokal yang terlalu besar.

Contoh rekursi tanpa base case.

```c
int infinite(int n) {
    return infinite(n + 1);
}
```

Contoh variabel lokal berukuran besar.

```c
void boros(void) {
    int arr[10000000];
    arr[0] = 1;
}
```

Array pada contoh tersebut membutuhkan sekitar 40 MB jika `int` berukuran 4 byte. Ukuran ini sering melebihi jatah stack. Data besar sebaiknya dialokasikan di heap menggunakan `malloc`, yang dibahas pada Bab 9.

---

## 4.8 Stack dan Heap

Heap akan dibahas lebih lengkap pada Bab 9. Untuk saat ini, cukup pahami perbedaan dasarnya.

| Aspek | **Stack** | **Heap** |
|-------|-----------|----------|
| Pengelolaan | Otomatis saat fungsi masuk dan keluar | Manual dengan `malloc` dan `free` |
| Kecepatan | Sangat cepat karena cukup menggeser pointer | Lebih lambat karena allocator harus mencari dan mengelola blok |
| Ukuran | Terbatas | Jauh lebih besar, bergantung pada memori yang tersedia |
| Umur data | Selama fungsi atau blok terkait masih aktif | Sampai dilepas dengan `free` |
| Penggunaan umum | Variabel lokal, parameter, return address | Data besar atau data yang harus hidup melewati akhir fungsi |

Aturan praktisnya sederhana. Variabel lokal biasa cocok berada di stack. Data besar atau data yang harus tetap hidup setelah fungsi selesai sebaiknya berada di heap.

---

## 4.9 Bahaya Mengembalikan Alamat Variabel Lokal

Variabel lokal tidak valid setelah fungsi selesai. Karena itu, mengembalikan alamat variabel lokal adalah bug serius.

```c
int *buat_angka(void) {
    int x = 42;
    return &x;
}
```

`x` hidup di stack frame milik `buat_angka`. Setelah fungsi selesai, frame tersebut dilepas. Alamat yang dikembalikan menunjuk ke ruang stack yang sudah tidak lagi dimiliki oleh variabel `x`. Pointer seperti ini disebut **dangling pointer**.

Menggunakan dangling pointer menghasilkan **undefined behavior**. Program dapat terlihat berjalan, dapat crash, atau dapat menghasilkan data yang rusak. Perilaku tersebut tidak dapat dijadikan dasar program yang benar.

Compiler biasanya memberi peringatan untuk kasus yang jelas jika opsi seperti `-Wall` digunakan. Solusi yang benar adalah mengembalikan nilai secara langsung, mengisi memori milik pemanggil melalui pointer, atau mengalokasikan data di heap jika memang harus bertahan setelah fungsi selesai.

---

## 4.10 `void`, Return, dan Scope

Fungsi dengan tipe kembalian `void` tidak mengembalikan nilai. Fungsi seperti ini digunakan ketika tujuan utamanya adalah melakukan aksi, misalnya mencetak output atau mengubah keadaan melalui pointer.

```c
void sapa(void) {
    printf("halo\n");
}
```

Satu pernyataan `return` hanya dapat mengembalikan satu nilai. Jika program perlu mengembalikan beberapa data, gunakan pointer, array, atau `struct` sesuai kebutuhan. Pointer dibahas pada Bab 6 dan `struct` dibahas pada Bab 8.

Scope atau lingkup menentukan bagian program yang dapat mengakses sebuah variabel. Variabel yang dideklarasikan di dalam blok `{ }` hanya terlihat di dalam blok tersebut. Variabel lokal fungsi tidak dapat diakses langsung dari fungsi lain karena variabel tersebut berada di stack frame fungsi yang memilikinya.

Ada juga variabel lokal `static`. Scope-nya tetap lokal, tetapi umur datanya sepanjang program berjalan. Topik ini dibahas saat membahas storage class pada Bab 11.

---

## 4.11 Rangkuman Model Mental

1. C selalu menggunakan pass by value. Argumen disalin ke parameter fungsi.
2. Stack adalah region memori untuk pemanggilan fungsi dan bekerja dengan disiplin LIFO.
3. Setiap pemanggilan fungsi memiliki stack frame sendiri.
4. Stack frame secara konseptual berisi parameter, variabel lokal, return address, dan register yang perlu disimpan.
5. Instruksi `call` menyimpan return address dan melompat ke fungsi yang dipanggil.
6. Instruksi `ret` mengambil return address dan kembali ke pemanggil.
7. Variabel lokal tidak valid setelah fungsi selesai karena frame-nya sudah dilepas.
8. Calling convention atau ABI menentukan aturan pemanggilan fungsi pada level biner.
9. Rekursi bekerja karena setiap level pemanggilan fungsi memiliki frame sendiri.
10. Stack overflow terjadi ketika penggunaan stack melebihi batas yang tersedia.

---

## 4.12 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Jalankan contoh `coba_ubah` pada Bagian 4.2. Pastikan nilai `a` tetap `5`, lalu jelaskan alasannya dengan konsep salinan.
2. Tulis fungsi `faktorial` rekursif. Compile dengan `gcc -S -O0`, lalu cari instruksi `call faktorial` pada assembly yang dihasilkan.
3. Gunakan `gdb` dengan program yang dikompilasi memakai `gcc -g`. Pasang breakpoint pada `faktorial`, jalankan program, lalu gunakan `backtrace` untuk melihat stack frame yang aktif.
4. Tulis fungsi rekursif tanpa base case. Jalankan program dan amati error yang muncul. Periksa jatah stack dengan `ulimit -s`.
5. Deklarasikan `int arr[10000000];` sebagai variabel lokal di sebuah fungsi. Jalankan program, lalu bandingkan dengan versi yang menggunakan `malloc`.
6. Tulis fungsi yang mengembalikan `&x` ketika `x` adalah variabel lokal. Compile dengan `-Wall` dan baca peringatan dari compiler.

### Pertanyaan Refleksi

1. Mengapa mengubah parameter di dalam fungsi tidak mengubah variabel asli milik pemanggil?
2. Apa saja bagian penting dalam stack frame?
3. Bagian mana dari stack frame yang menentukan lokasi eksekusi setelah fungsi selesai?
4. Apa yang dilakukan `call` terhadap stack dan Instruction Pointer?
5. Apa yang dilakukan `ret` terhadap stack dan Instruction Pointer?
6. Mengapa rekursi membutuhkan base case?
7. Mengapa mengembalikan alamat variabel lokal berbahaya walaupun program kadang terlihat berjalan?
8. Mengapa data besar sebaiknya dialokasikan di heap, bukan di stack?
9. Apa fungsi calling convention atau ABI dalam kerja sama antara kode program dan library?

---

Bab ini membangun fondasi untuk memahami fungsi pada level mesin. Materi yang dibahas mencakup pass by value, stack frame, return address, calling convention, rekursi, stack overflow, dan perbedaan awal antara stack dan heap.

Pada Bab 5, pembahasan berlanjut ke array dan string. Topik tersebut menjelaskan bagaimana banyak data disusun berurutan di memori, mengapa `array[i]` berhubungan langsung dengan aritmetika alamat, dan mengapa string di C direpresentasikan sebagai array karakter yang diakhiri byte nol.

