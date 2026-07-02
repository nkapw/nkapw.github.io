---
title: "Bab 19 - Syscall dan Interaksi dengan Kernel"
description: "Sepanjang bagian sebelumnya, kita sudah sering memakai istilah syscall saat membahas read, write, open, fork, exec, mmap, dan socket. Bab ini menjelaskan apa yang..."
tags: [c, systems-programming]
order: 19
updated: 2026-07-02
---
Sepanjang bagian sebelumnya, kita sudah sering memakai istilah **syscall** saat membahas `read`, `write`, `open`, `fork`, `exec`, `mmap`, dan `socket`. Bab ini menjelaskan apa yang terjadi saat program user space meminta layanan kepada kernel.

Syscall adalah mekanisme dasar yang menghubungkan program C dengan sistem operasi. Melalui syscall, program dapat membaca file, menulis output, membuat proses, mengalokasikan memori dari sistem operasi, dan berkomunikasi melalui jaringan.

Bab ini lebih konseptual daripada praktis, tetapi pemahaman di dalamnya penting untuk membaca perilaku program system programming secara utuh.

---

## 19.1 User Space dan Kernel Space

Sistem operasi modern memisahkan eksekusi program ke dalam dua mode utama.

- **User space** adalah tempat program biasa berjalan. Program di mode ini memiliki hak akses terbatas. Program tidak boleh mengakses hardware secara langsung, tidak boleh membaca atau menulis memori proses lain, dan tidak boleh menjalankan instruksi CPU tertentu yang bersifat istimewa.
- **Kernel space** adalah tempat kernel berjalan. Kernel memiliki hak akses penuh terhadap hardware, memori, scheduler, filesystem, jaringan, dan perangkat lain.

CPU menegakkan pemisahan ini melalui mode eksekusi hardware. Pada arsitektur x86, user space biasanya berjalan pada ring 3, sedangkan kernel berjalan pada ring 0. Saat program user mencoba menjalankan instruksi yang tidak diizinkan, CPU memicu fault dan menyerahkan penanganannya kepada kernel.

Pemisahan ini melindungi stabilitas dan keamanan sistem. Jika semua program dapat mengakses hardware dan memori secara langsung, satu program yang rusak atau berbahaya dapat merusak data proses lain, mengubah memori kernel, atau membuat seluruh sistem tidak stabil.

Karena itu, program user space tidak melakukan operasi istimewa sendiri. Program mengajukan permintaan melalui syscall, lalu kernel memeriksa permintaan tersebut dan menjalankannya bila valid.

Konsep ini juga terkait dengan bab sebelumnya. Ruang memori proses yang terisolasi ditegakkan oleh kernel dan MMU. Dereference pointer yang tidak valid dapat memicu `SIGSEGV` karena akses tersebut ditolak oleh mekanisme proteksi memori.

---

## 19.2 Pengertian Syscall

**System call** atau **syscall** adalah antarmuka resmi dari user space ke kernel space. Kernel menyediakan layanan seperti operasi file, manajemen proses, manajemen memori, jaringan, timer, dan sinkronisasi melalui daftar syscall.

Setiap syscall memiliki nomor. Pada Linux x86-64, `read` memiliki nomor 0, `write` memiliki nomor 1, dan syscall lain memiliki nomor masing-masing. Nomor ini digunakan kernel untuk memilih fungsi penanganan yang sesuai.

Syscall berbeda dari pemanggilan fungsi C biasa. Pemanggilan fungsi biasa hanya berpindah ke alamat lain di user space melalui instruksi seperti `call`. Syscall harus berpindah dari user mode ke kernel mode melalui instruksi CPU khusus.

Daftar syscall membentuk kontrak antara kernel dan program user space. Kernel Linux menjaga kompatibilitas kontrak ini agar program lama tetap dapat berjalan pada kernel baru.

---

## 19.3 Mekanisme Syscall

Saat program memanggil `write(1, "hi", 2)`, eksekusi tidak langsung masuk ke fungsi kernel biasa. Pada Linux x86-64, prosesnya secara umum berjalan seperti ini.

1. Program atau wrapper libc menaruh nomor syscall di register `rax`.
2. Argumen syscall diletakkan di register sesuai konvensi syscall, misalnya `rdi`, `rsi`, `rdx`, dan register berikutnya.
3. Instruksi CPU `syscall` dieksekusi.
4. CPU berpindah dari user mode ke kernel mode secara terkontrol.
5. CPU melompat ke entry point syscall yang sudah ditentukan oleh kernel.
6. Kernel membaca nomor syscall, mencari handler di syscall table, memvalidasi argumen, lalu menjalankan operasi yang diminta.
7. Kernel menaruh nilai hasil di register `rax`.
8. CPU kembali ke user mode dan program melanjutkan eksekusi setelah instruksi `syscall`.

Alurnya dapat diringkas sebagai berikut.

```text
USER SPACE                          KERNEL SPACE
write(1, "hi", 2)
rax berisi nomor write
rdi berisi fd
rsi berisi pointer buffer
rdx berisi panjang buffer
instruksi syscall  ------------>    mode switch ke kernel
                                    syscall handler membaca rax
                                    argumen divalidasi
                                    operasi write dijalankan
                                    hasil disimpan di rax
eksekusi berlanjut  <------------   mode switch kembali ke user
nilai return tersedia di rax
```

Syscall bukan pemanggilan fungsi biasa. Ia adalah transisi mode yang dikendalikan hardware dan kernel. Program user space tidak dapat melompat ke alamat kernel secara bebas. Program hanya dapat masuk melalui entry point yang disediakan untuk syscall, interrupt, exception, atau mekanisme kernel lain yang sah.

---

## 19.4 Mengapa Syscall Relatif Mahal

Syscall lebih mahal dibanding pemanggilan fungsi biasa karena melibatkan perpindahan dari user mode ke kernel mode dan kembali lagi. Biaya ini muncul dari beberapa hal.

- CPU perlu menyimpan dan memulihkan state eksekusi tertentu.
- Kernel perlu memvalidasi argumen untuk memastikan pointer, file descriptor, ukuran buffer, dan izin akses valid.
- Perpindahan antara user space dan kernel space dapat memengaruhi cache CPU, TLB, dan pipeline.
- Operasi kernel sering menyentuh struktur data global seperti tabel file descriptor, scheduler, filesystem, atau stack jaringan.

Karena itu, program system programming biasanya berusaha mengurangi jumlah syscall. Beberapa pola yang sudah muncul pada bab sebelumnya adalah sebagai berikut.

- **Buffering stdio** mengumpulkan banyak operasi output kecil menjadi lebih sedikit pemanggilan `write`.
- **Allocator seperti `malloc`** meminta wilayah memori besar dari kernel melalui `brk` atau `mmap`, lalu membagi wilayah tersebut di user space.
- **I/O dalam blok besar** lebih efisien daripada membaca atau menulis satu byte per syscall.

Prinsipnya adalah tidak memanggil kernel untuk pekerjaan kecil yang bisa dikumpulkan atau dikelola sementara di user space.

---

## 19.5 Peran libc

Saat program C memanggil `write(1, "hi", 2)`, program biasanya tidak menulis instruksi assembly `syscall` secara langsung. Program memanggil fungsi `write` dari libc. Fungsi tersebut adalah wrapper tipis yang menyiapkan register, menjalankan instruksi `syscall`, lalu menerjemahkan hasilnya ke konvensi C.

Wrapper libc menjelaskan beberapa perilaku penting.

- Syscall mentah di Linux mengembalikan kode error sebagai nilai negatif di register `rax`.
- Wrapper libc mengubah hasil error menjadi return value `-1`.
- Wrapper libc menyimpan kode error ke `errno`.
- Karena `errno` bersifat per-thread, wrapper libc juga bekerja dengan mekanisme thread-local storage.

Lapisan eksekusinya dapat digambarkan sebagai berikut.

```text
kode C
fungsi libc seperti printf, malloc, atau write
wrapper syscall di libc
instruksi syscall
handler syscall di kernel
```

Contoh pada `printf` menunjukkan lapisan tersebut.

```text
printf("Nilai %d\n", x)
formatting dan buffering dilakukan oleh libc
write(1, buf, n)
wrapper libc menyiapkan syscall write
instruksi syscall berpindah ke kernel
sys_write menjalankan operasi tulis sebenarnya
```

`malloc` juga tidak selalu memanggil kernel. Sebagian besar logika allocator berjalan di user space. Syscall seperti `brk` atau `mmap` hanya dipanggil ketika allocator membutuhkan wilayah memori baru dari sistem operasi.

---

## 19.6 Melihat Syscall dengan `strace`

`strace` adalah tool yang menampilkan syscall yang dilakukan oleh sebuah program, lengkap dengan argumen dan nilai return. Tool ini berguna untuk memahami interaksi program dengan kernel dan untuk debugging.

```sh
strace ./hello
```

Pada program hello world, output `strace` dapat memuat syscall seperti berikut.

```text
execve("./hello", ["./hello"], ...) = 0
brk(NULL) = 0x...
openat(..., "/lib/x86_64-linux-gnu/libc.so.6", ...) = 3
mmap(...) = 0x...
write(1, "Halo, dunia!\n", 13) = 13
exit_group(0) = ?
```

Beberapa syscall muncul untuk memulai program dan memuat library dinamis. Syscall `write` adalah operasi yang akhirnya menulis output ke terminal. Dengan `strace`, hubungan antara kode C, libc, loader, filesystem, dan kernel menjadi terlihat.

`strace` juga membantu debugging. Jika sebuah program gagal membuka file, output seperti `openat(...) = -1 ENOENT` menunjukkan bahwa syscall gagal karena file tidak ditemukan. Dengan informasi ini, penyebab kegagalan sering dapat diketahui tanpa menebak dari luar program.

Tool lain yang berkaitan adalah `ltrace`. Jika `strace` menampilkan syscall, `ltrace` menampilkan pemanggilan fungsi library. Keduanya berguna untuk melihat lapisan yang berbeda dari eksekusi program.

---

## 19.7 Rangkuman Model Mental

1. **User space** adalah tempat program biasa berjalan dengan hak terbatas.
2. **Kernel space** adalah tempat kernel berjalan dengan hak penuh terhadap hardware dan sumber daya sistem.
3. **Syscall** adalah antarmuka resmi untuk meminta layanan kernel dari user space.
4. Syscall memakai nomor tertentu agar kernel dapat memilih handler yang sesuai.
5. Instruksi `syscall` memicu perpindahan terkontrol dari user mode ke kernel mode.
6. Kernel memvalidasi argumen syscall sebelum menjalankan operasi.
7. Syscall lebih mahal daripada pemanggilan fungsi biasa karena melibatkan mode switch, validasi, dan interaksi dengan struktur data kernel.
8. Buffering, alokasi memori dalam blok besar, dan I/O dalam blok besar mengurangi jumlah syscall.
9. libc menyediakan wrapper yang membuat syscall terlihat seperti pemanggilan fungsi C biasa.
10. `strace` menampilkan syscall sebuah program dan sangat berguna untuk memahami serta men-debug interaksi program dengan kernel.

---

## 19.8 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Jalankan `strace ./hello` pada program hello world dari Bab 1. Identifikasi syscall yang menulis output ke terminal.
2. Jalankan `strace` pada program yang membuka dan membaca file. Temukan `openat`, `read`, dan `close`, lalu cocokkan dengan kode C yang ditulis.
3. Tulis program yang memanggil `printf` seribu kali. Jalankan `strace -c ./program` dan periksa berapa kali `write` dipanggil.
4. Bandingkan program pada latihan sebelumnya dengan program yang memanggil `write` langsung seribu kali.
5. Jalankan `strace` pada program yang gagal membuka file. Temukan syscall yang mengembalikan `-1` dan periksa kode error yang muncul.
6. Jalankan `strace` pada program `fork` dan `exec` dari Bab 14. Temukan syscall yang membuat proses dan syscall yang mengganti image program.
7. Bandingkan `strace` dan `ltrace` pada program yang sama. Catat perbedaan informasi yang ditampilkan.

### Pertanyaan Refleksi

1. Mengapa sistem operasi memisahkan user space dan kernel space.
2. Apa yang dilindungi oleh pemisahan tersebut.
3. Mengapa syscall tidak sama dengan pemanggilan fungsi biasa.
4. Apa yang terjadi saat instruksi `syscall` dijalankan.
5. Mengapa program user space tidak dapat melompat ke alamat kernel secara bebas.
6. Mengapa syscall relatif mahal.
7. Bagaimana buffering dapat mengurangi jumlah syscall.
8. Apa peran libc di antara kode C dan kernel.
9. Bagaimana wrapper libc menghubungkan hasil syscall dengan `errno`.
10. Informasi apa yang dapat diperoleh dari `strace`.

---

Bab ini menjelaskan jalur dari program C menuju kernel melalui syscall. Bab berikutnya membahas tooling yang sering dipakai dalam system programming, termasuk debugger, tracer, memory checker, dan sanitizer.

