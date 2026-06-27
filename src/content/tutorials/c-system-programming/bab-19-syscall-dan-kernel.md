---
title: "Bab 19 — Syscall & Interaksi Langsung dengan Kernel"
description: "Sepanjang buku ini, kita terus menyebut \"syscall\" di banyak bab Bagian IV-V: read, write, open, fork, exec, mmap, socket. Kita sering menyebutnya sebagai \"memanggil..."
tags: [c, system-programming]
order: 19
updated: 2026-06-20
---

> "Setiap kali program perlu menyentuh dunia luar seperti membaca file, mengirim byte ke jaringan, mengalokasikan memori dari OS, atau membuat proses, ia tidak melakukannya sendiri. Program meminta kernel melakukan pekerjaan itu lewat syscall."

Sepanjang buku ini, kita terus menyebut "syscall" di banyak bab Bagian IV-V: `read`, `write`, `open`, `fork`, `exec`, `mmap`, `socket`. Kita sering menyebutnya sebagai "memanggil kernel", lalu langsung memakai fungsinya. Bab ini memperjelas apa yang sebenarnya terjadi saat pemanggilan itu dilakukan. Banyak konsep yang sudah kita bahas bertemu di mekanisme ini.

Bab ini lebih konseptual daripada penuh kode. Tujuannya adalah memberi model mental yang rapi tentang batas antara program biasa, libc, dan kernel.

---

## 19.1 Dua dunia: user space & kernel space

Komputer modern menjalankan kode di dua "dunia" dengan tingkat hak akses berbeda. Pemisahan ini adalah fondasi keamanan dan stabilitas sistem operasi.

- **User space (user mode)** adalah tempat program biasa berjalan, seperti hello world, browser, atau game. Hak aksesnya **terbatas**: tidak boleh mengakses hardware langsung, tidak boleh menyentuh memori proses lain, dan tidak boleh mengeksekusi instruksi CPU yang istimewa.
- **Kernel space (kernel mode)** adalah tempat **kernel** (inti OS) berjalan. Hak aksesnya **penuh**: bisa mengakses hardware, memori, dan instruksi CPU yang tidak tersedia untuk program biasa.

CPU sendiri punya **mode bit** (ring level di x86: ring 3 = user, ring 0 = kernel) yang menegakkan pembatasan ini di level hardware. Saat berada di user mode, CPU **menolak** menjalankan instruksi istimewa. Kalau program user mencoba melakukannya, misalnya mengakses hardware langsung, CPU memicu fault dan kernel mengambil alih. Dalam banyak kasus, kernel akan menghentikan program tersebut.

Pemisahan ini ada karena program biasa tidak boleh dipercaya untuk memegang kendali penuh atas mesin. Kalau setiap program bisa langsung mengakses hardware dan memori apa pun, satu program yang buggy atau jahat bisa menimpa memori OS, merusak disk, atau mematikan seluruh sistem. Pemisahan user/kernel menjadi tembok pelindung: program biasa berjalan di user space dengan kemampuan terbatas, dan satu-satunya cara melakukan operasi istimewa seperti I/O adalah dengan *meminta kernel* lewat syscall. Kernel memeriksa permintaan itu sebelum menjalankannya.

Analogi singkatnya: user space seperti area publik bank, sedangkan kernel space seperti ruang brankas. Program user tidak boleh masuk brankas sendiri. Jika perlu sesuatu, ia mengisi formulir dan menyerahkannya ke teller lewat syscall. Kernel yang punya akses ke brankas akan memeriksa permintaan itu, lalu menjalankannya atau menolaknya.

> **Ingat Bab 14:** "ruang memori terisolasi tiap proses" ditegakkan oleh kernel dan MMU. Itu bagian dari sistem perlindungan yang sama. Dari Bab 6, dereference NULL memicu `SIGSEGV` karena MMU mendeteksi akses memori terlarang, lalu kernel mengambil alih. Semuanya berada dalam satu sistem proteksi yang utuh.

---

## 19.2 Apa itu syscall, sebenarnya

> **System call (syscall) adalah gerbang resmi dari user space ke kernel space.** Ia adalah "API kernel": daftar layanan yang kernel sediakan untuk program user, seperti membuka file, membaca/menulis, membuat proses, meminta memori dari OS, dan mengirim data jaringan.

Tiap syscall punya **nomor**. Misalnya, di Linux x86-64: `read` = 0, `write` = 1, `open` = 2, dan seterusnya. Saat program ingin melakukan syscall, ia tidak sekadar "memanggil fungsi" seperti fungsi C biasa, yang hanya memakai `call` ke alamat lain di user space (Bab 4). Memanggil kernel berarti menyeberangi batas user -> kernel, dan itu membutuhkan mekanisme hardware khusus: **mode switch** (Section 19.3).

Daftar syscall adalah **kontrak** yang stabil. Inilah alasan program lama tetap bisa berjalan di kernel baru selama nomor dan perilaku syscall dijaga. Linux sangat ketat soal ini, dengan prinsip "don't break userspace".

---

## 19.3 Mekanisme syscall: bagaimana menyeberang ke kernel

Bagian ini adalah inti bab. Apa yang terjadi saat `write(1, "hi", 2)` benar-benar dieksekusi? Pada Linux x86-64, urutannya kira-kira seperti ini.

1. **Siapkan argumen di register.** Nomor syscall ditaruh di register `rax` (mis. 1 untuk `write`), argumen di `rdi`, `rsi`, `rdx`, ... (mirip calling convention Bab 4, tapi konvensi khusus syscall).
2. **Eksekusi instruksi `syscall`** (instruksi CPU khusus; dulu `int 0x80`). Inilah inti mekanismenya: instruksi ini **memicu transisi terkontrol ke kernel mode**. CPU:
   - Mengubah mode bit dari user (ring 3) ke kernel (ring 0).
   - Melompat ke **alamat tetap** yang sudah ditentukan kernel sebelumnya (syscall handler/entry point), bukan ke alamat sembarang yang dipilih program. Ini penting: program **tidak bisa** melompat ke titik sembarang di kernel; ia hanya bisa masuk lewat pintu resmi yang kernel kontrol.
3. **Kernel mengambil alih.** Handler membaca nomor syscall dari `rax`, mencari fungsi penanganannya di **syscall table**, memvalidasi argumen (mis. apakah pointer-nya sah? apakah fd-nya milik proses ini?), lalu menjalankan operasinya dengan hak akses penuh.
4. **Kembali ke user mode.** Setelah selesai, kernel menaruh nilai return di `rax`, mengembalikan mode bit ke user (ring 3), dan eksekusi lanjut di user space tepat setelah instruksi `syscall`.

```
USER SPACE                          KERNEL SPACE
write(1, "hi", 2)
  rax = 1 (nomor write)
  rdi = 1, rsi = ptr, rdx = 2
  instruksi 'syscall' ──────────►  [mode switch ke ring 0]
                                    syscall handler:
                                      - baca rax -> ini 'write'
                                      - validasi argumen
                                      - lakukan operasi tulis
                                      - taruh hasil di rax
  lanjut di sini  ◄─────────────── [mode switch balik ke ring 3]
  (return value di rax)
```

Model mental pentingnya: syscall **bukan** sekadar pemanggilan fungsi. Ia adalah **transisi mode terkontrol** yang ditegakkan hardware lewat satu pintu masuk yang kernel tentukan. Program tidak pernah bebas "menjalankan kode kernel" sesukanya. Program *meminta* kernel melakukan operasi, lalu kernel yang memutuskan dan mengeksekusinya dengan hak akses kernel.

Mode switch bisa dibayangkan seperti melewati gerbang imigrasi. Kamu tidak bisa menyeberang batas sembarangan; kamu harus lewat pos resmi (instruksi `syscall`), menunjukkan dokumen (nomor dan argumen di register), lalu petugas memeriksa permintaanmu (validasi kernel). Setelah operasi selesai, eksekusi kembali ke wilayah asalnya, yaitu user mode.

---

## 19.4 Kenapa syscall "mahal"

Sepanjang buku ini kita beberapa kali menyebut "syscall itu mahal", misalnya di Bab 9 saat membahas kenapa `malloc` tidak memanggil kernel tiap kali, dan di Bab 12 saat membahas kenapa stdio memakai buffering. Sekarang alasannya lebih jelas.

- **Mode switch punya overhead.** Transisi user <-> kernel membutuhkan penyimpanan dan pemulihan state CPU (register, dll), serta ada biaya hardware untuk perpindahan mode.
- **Validasi & keamanan.** Kernel harus memeriksa argumen tiap kali (apakah aman?).
- **Efek pada cache CPU & pipeline.** Masuk-keluar kernel bisa mengacak cache dan branch predictor (ingat Bab 3).

Dibanding pemanggilan fungsi biasa di user space (yang hanya `call`/`ret`, beberapa nanosekon), syscall jauh lebih lambat (ratusan nanosekon hingga lebih). Karena itu, strategi umum dalam system programming adalah **mengurangi jumlah syscall**. Inilah alasan teknis di balik beberapa pola yang sudah kamu lihat:

- **Buffering stdio (Bab 12)** — kumpulkan banyak `printf` jadi satu `write`, bukan satu syscall per karakter.
- **`malloc` mengambil wilayah besar sekaligus (Bab 9)** — minta blok besar dari kernel (`brk`/`mmap`) sekali, lalu membaginya sendiri di user space tanpa syscall untuk tiap alokasi kecil.
- **Membaca file dalam blok besar** ketimbang byte-per-byte.

Ketiganya memakai prinsip yang sama: hindari mode switch yang tidak perlu.

---

## 19.5 libc: perantara antara kamu dan syscall

Saat kamu menulis `write(1, "hi", 2)` di C, kamu biasanya tidak menulis instruksi `syscall` assembly sendiri. Kamu memanggil **fungsi `write` dari libc** (C standard library). libc berisi wrapper tipis yang menyiapkan register dan menjalankan instruksi `syscall`.

> **Hampir semua "syscall" yang kamu panggil di C sebenarnya adalah fungsi wrapper tipis di libc.** libc menyiapkan register, menjalankan instruksi `syscall`, lalu menerjemahkan hasilnya, misalnya dengan mengeset `errno` kalau gagal (Bab 13).

Ini menjelaskan beberapa hal yang tersebar di buku:

- **`errno` (Bab 13):** instruksi `syscall` mentah mengembalikan kode error sebagai nilai negatif di `rax`. Wrapper libc yang mengubahnya: kalau hasilnya menandakan error, ia mengeset `errno` dan mengembalikan `-1`. Jadi konvensi `-1` + `errno` adalah lapisan libc, bukan bentuk langsung dari kernel.
- **`printf` vs `write`:** `printf` (Bab 12) adalah fungsi libc tingkat tinggi yang memformat string dan melakukan buffering. Pada akhirnya, ia memanggil wrapper `write`, yang menjalankan syscall `write`. Lapisannya seperti ini:

```
printf("Nilai: %d\n", x)          <- libc: format + buffer (Bab 12)
   |
   v
write(1, buf, n)                  <- libc: wrapper syscall (thin)
   |
   | instruksi 'syscall'          <- menyeberang ke kernel
   v
sys_write di kernel               <- operasi sebenarnya
```

- **`malloc` (Bab 9):** sebagian besar adalah logika libc di user space. Ia *kadang* memanggil syscall `brk`/`mmap` untuk meminta wilayah dari kernel, tetapi mayoritas `malloc`/`free` tidak menyentuh kernel sama sekali.

Jadi peta lengkapnya: **kodemu -> libc (kenyamanan, buffering, errno) -> wrapper syscall -> instruksi `syscall` -> kernel.** libc adalah lapisan yang membuat pemanggilan kernel terasa seperti pemanggilan fungsi C biasa.

---

## 19.6 Mengintip syscall sungguhan dengan `strace`

Teori di atas menjadi lebih konkret dengan **`strace`**. Tool ini menampilkan **setiap syscall** yang dilakukan sebuah program, beserta argumen dan nilai return-nya. Dengan `strace`, kamu bisa melihat kapan program benar-benar berinteraksi dengan kernel.

```bash
strace ./hello
```

Untuk `hello world` Bab 1, kamu akan lihat (antara lain):

```
execve("./hello", ["./hello"], ...) = 0      <- program dimulai (Bab 14!)
brk(NULL)                          = 0x...   <- malloc/libc minta info heap (Bab 9!)
openat(..., "/lib/x86_64.../libc.so.6", ...) <- load shared library (Bab 11!)
mmap(...)                          = 0x...   <- petakan libc ke memori (Bab 16!)
write(1, "Halo, dunia!\n", 13)     = 13      <- printf akhirnya jadi write! (Bab 12)
exit_group(0)                      = ?        <- program selesai (Bab 1: return 0)
```

Contoh ini menyatukan banyak bab: `execve` (proses, Bab 14), `mmap`/load `libc.so` (linking, Bab 11 dan 16), `write` (I/O, Bab 12), dan `exit_group` (return 0 dari main, Bab 1). Satu `hello world` sederhana ternyata melakukan belasan syscall. Sebagian besar terjadi saat startup, seperti load libc, dan satu `write` dipakai untuk output sebenarnya.

Jalankan `strace` pada program-programmu dari bab-bab sebelumnya. Kamu akan melihat `fork`, `open`, `read`, `socket`, dan `connect` muncul sebagai syscall nyata. Konsep yang sebelumnya abstrak menjadi lebih mudah ditelusuri.

> `strace` juga alat debugging yang kuat. Kalau program gagal dengan cara yang tidak jelas, `strace` sering menunjukkan syscall mana yang gagal dan dengan `errno` apa, misalnya `openat(...) = -1 ENOENT` -> file tidak ada. Pasangannya, `ltrace`, melacak pemanggilan fungsi *library*, termasuk libc.

---

## 19.7 Rangkuman model mental

1. CPU berjalan di dua dunia: **user space** (program biasa, hak terbatas) dan **kernel space** (OS, hak penuh), ditegakkan **hardware** (mode/ring bit). Ini tembok pelindung sistem.
2. **Syscall** = gerbang resmi user -> kernel; "API kernel" untuk layanan istimewa seperti I/O, proses, memori, dan jaringan. Tiap syscall punya nomor.
3. **Mekanisme**: siapkan nomor + argumen di register -> instruksi **`syscall`** memicu **mode switch** terkontrol ke kernel (lewat pintu resmi, bukan alamat sembarang) -> kernel validasi dan jalankan -> mode switch balik ke user dengan hasil di `rax`. Ini bukan sekadar `call` fungsi.
4. **Syscall mahal** (mode switch + validasi + efek cache). Karena itu: buffering stdio (Bab 12), `malloc` mengambil wilayah besar sekaligus (Bab 9), baca/tulis dalam blok besar; semuanya untuk **mengurangi jumlah syscall**.
5. **libc** = lapisan wrapper antara kodemu dan syscall: ia menyiapkan register, menjalankan `syscall`, dan menerjemahkan hasil (mengeset **`errno`**, Bab 13). `printf` -> buffer -> `write` wrapper -> syscall -> `sys_write`.
6. **`strace`** menampilkan semua syscall sebuah program; berguna untuk melihat dan men-debug interaksi program dengan kernel.

---

## 19.8 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Jalankan `strace ./hello` pada hello world Bab 1. Identifikasi: syscall mana yang `write` output-mu? Berapa total syscall? Mana yang untuk startup (load libc) vs kerja sebenarnya?
2. `strace` sebuah program yang membuka & membaca file. Temukan `openat`, `read`, `close`. Cocokkan dengan kode C-mu.
3. Buktikan buffering mengurangi syscall: tulis program yang `printf` 1000 kali (dengan `\n`), jalankan `strace -c ./program` (mode hitung). Berapa kali `write` dipanggil? Apakah 1000 atau jauh lebih sedikit? Kenapa? (Bandingkan dengan `write` syscall langsung 1000 kali.)
4. `strace` program yang gagal (mis. buka file tak ada). Temukan syscall yang mengembalikan `-1` dan `errno`-nya (mis. `ENOENT`). Hubungkan dengan Bab 13.
5. `strace` program `fork`+`exec` dari Bab 14. Temukan syscall `clone`/`fork` dan `execve`. 
6. Bandingkan `strace` (syscall) vs `ltrace` (fungsi library) pada program yang sama. Apa bedanya yang terlihat?
7. (Pikir) Hitung kira-kira: kalau satu syscall ~300ns dan satu pemanggilan fungsi user ~2ns, berapa kali lebih lambat syscall? Kenapa ini memotivasi buffering?

**Pertanyaan refleksi:**

1. Kenapa ada pemisahan user space dan kernel space? Apa yang dilindunginya, dan bagaimana hardware menegakkannya?
2. Kenapa syscall bukan sekadar "pemanggilan fungsi biasa"? Apa yang istimewa dari instruksi `syscall`?
3. Jelaskan langkah-langkah mode switch saat `write` dipanggil, dari user space ke kernel dan kembali.
4. Kenapa program user tak bisa melompat ke "alamat sembarang" di kernel? Kenapa hanya lewat satu pintu resmi?
5. Kenapa syscall mahal? Sebutkan tiga strategi (dari bab-bab sebelumnya) untuk menguranginya, dan jelaskan masing-masing.
6. Apa peran libc di antara kodemu dan kernel? Bagaimana `errno` dan konvensi `-1` terkait dengan ini?
7. Apa yang `strace` tunjukkan, dan kenapa ia alat debugging yang ampuh?

---

Kita sudah menelusuri perjalanan dari kode C, ke memori, ke proses, ke jaringan, dan akhirnya ke gerbang kernel. Sepanjang jalan, kita juga beberapa kali menyebut tool seperti `gdb`, `valgrind`, `strace`, dan sanitizer.

Di **Bab 20**, kita mengumpulkan tooling itu dalam satu bab: cara men-debug, menganalisis, dan membongkar perilaku program C dengan alat yang tepat.
