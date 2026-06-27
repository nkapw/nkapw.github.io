---
title: "Bab 17 — Threads & Concurrency"
description: "Di Bab 14-16 kita bekerja dengan proses: relatif berat, terisolasi, dan membutuhkan IPC untuk berbagi data. Sekarang kita melihat alternatifnya, yaitu thread. Thread..."
tags: [c, system-programming]
order: 17
updated: 2026-06-20
---

> "Proses punya ruang memori sendiri. Thread hidup di dalam satu proses dan berbagi memori yang sama. Itu membuat komunikasi lebih ringan, tetapi juga membuat kesalahan satu thread bisa memengaruhi seluruh proses."

Di Bab 14-16 kita bekerja dengan **proses**: relatif berat, terisolasi, dan membutuhkan IPC untuk berbagi data. Sekarang kita melihat alternatifnya, yaitu **thread**. Thread adalah beberapa alur eksekusi di dalam **satu proses**, dengan memori yang sama dan bisa diakses langsung. Thread membuka jalan ke **concurrency**, yaitu beberapa pekerjaan yang berjalan "bersamaan", dengan biaya yang lebih ringan daripada membuat proses baru.

Namun, kemudahan itu punya konsekuensi. **Berbagi memori secara langsung itu praktis, tetapi membuka kelas masalah baru bernama race condition.** Bab ini membahas mengapa concurrency sulit, bagaimana bug bisa muncul dari urutan eksekusi yang tidak terprediksi, dan bagaimana mutex membantu mengatur akses ke data bersama.

---

## 17.1 Thread vs proses: apa bedanya

Ingat dari Bab 14: sebuah **proses** punya ruang memori terisolasi sendiri. Sebuah **thread** adalah alur eksekusi *di dalam* sebuah proses. Satu proses bisa punya banyak thread, dan inilah kuncinya:

> **Semua thread dalam satu proses berbagi ruang memori yang sama**, termasuk heap, variabel global, dan file descriptor. Namun, tiap thread punya **stack sendiri** untuk variabel lokal dan call frame-nya, serta register dan instruction pointer sendiri.

Tabel berikut merangkum perbedaannya.

| Aspek | **Proses** (Bab 14) | **Thread** |
|-------|---------------------|------------|
| Memori | terisolasi (sendiri) | **berbagi** (heap, global) dalam proses |
| Stack | sendiri | **sendiri** (tiap thread) |
| Pembuatan | mahal (`fork`, salin memori) | murah (cuma stack & sedikit state) |
| Komunikasi | butuh IPC (Bab 16) | **langsung** lewat memori bersama |
| Crash satu | tak menjatuhkan yang lain | **menjatuhkan seluruh proses** |
| Isolasi/keamanan | kuat | lemah (saling bisa rusak) |

Proses bisa dibayangkan seperti rumah-rumah terpisah. Tiap rumah punya perabotan dan dapur sendiri, sehingga berbagi barang harus lewat mekanisme seperti surat atau kurir, yang dalam konteks program berarti IPC. Thread lebih mirip beberapa orang yang tinggal di satu rumah. Mereka berbagi dapur, kulkas, dan ruang tamu, sehingga tidak perlu mengirim data lewat IPC. Namun, kalau satu orang merusak dapur, seluruh rumah terkena dampaknya. Dalam program, satu thread yang crash bisa menjatuhkan seluruh proses.

Thread cocok saat kamu butuh banyak alur eksekusi yang ringan dan sering berbagi data, misalnya server yang menangani banyak koneksi atau kerja paralel pada data bersama. Proses lebih cocok saat kamu butuh isolasi kuat, misalnya agar satu crash tidak menjatuhkan komponen lain, atau saat batas keamanan lebih penting.

---

## 17.2 Membuat thread dengan `pthreads`

Di Linux/UNIX, API thread standar adalah **POSIX threads (`pthreads`)**, di `<pthread.h>`. Perlu di-link dengan `-pthread`.

```c
#include <stdio.h>
#include <pthread.h>

// fungsi yang dijalankan thread: terima dan kembalikan void* (generik, Bab 6)
void *kerja(void *arg) {
    int id = *(int *)arg;                  // cast void* -> int* -> dereference
    printf("Thread %d sedang bekerja\n", id);
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    int id1 = 1, id2 = 2;

    // buat dua thread; masing-masing menjalankan 'kerja'
    pthread_create(&t1, NULL, kerja, &id1);   // <- function pointer 'kerja' (Bab 7)
    pthread_create(&t2, NULL, kerja, &id2);

    // tunggu kedua thread selesai (seperti wait() untuk proses, Bab 14)
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    printf("Semua thread selesai\n");
    return 0;
}
```

Compile dengan `gcc program.c -o program -pthread`.

Mari lihat dua fungsi pentingnya.

- **`pthread_create(&tid, attr, fungsi, arg)`** membuat thread baru yang langsung mulai menjalankan `fungsi(arg)`. `fungsi` adalah **function pointer** bertipe `void *(*)(void *)` (Bab 7; thread start routine adalah callback), dan `arg` adalah `void *` (pointer generik, Bab 6) untuk mengoper data ke thread.
- **`pthread_join(tid, &retval)`** memblokir sampai thread `tid` selesai. Ia mirip `wait` untuk proses (Bab 14), karena memastikan kita tidak keluar dari `main` sebelum thread selesai.

Thread `kerja` bisa langsung mengakses apa pun di memori proses, termasuk variabel global dan heap, **tanpa** IPC. Ini yang membuat thread praktis, sekaligus membuat akses bersama harus diatur dengan hati-hati.

---

## 17.3 Race condition: akar kesulitan concurrency

Sekarang kita masuk ke inti masalah concurrency. Karena thread berbagi memori, dua thread bisa mengakses dan memodifikasi **variabel yang sama secara bersamaan**. Ini terdengar tidak masalah sampai kamu melihat bahwa operasi yang terlihat seperti "satu langkah" di C sebenarnya bisa terdiri dari **beberapa langkah** di level CPU (Bab 3 dan Bab 4).

Lihat operasi sesederhana `counter++`:

```c
counter++;
```

Di level CPU, ini **bukan** satu instruksi atomik. Secara model sederhana, ia terdiri dari tiga langkah (ingat register dan ALU dari Bab 3).

```
1. LOAD   : baca nilai 'counter' dari memori ke register
2. ADD    : tambah 1 di register
3. STORE  : tulis hasil dari register kembali ke memori
```

Sekarang bayangkan dua thread menjalankan `counter++` bersamaan, dan kernel menjadwalkan keduanya secara berselang. Seperti di Bab 14, tidak ada jaminan urutan eksekusi antar alur.

```
counter = 5 (awal)

Thread A: LOAD counter (baca 5)
Thread B: LOAD counter (baca 5)      <- B juga baca 5, sebelum A sempat menulis!
Thread A: ADD -> 6
Thread B: ADD -> 6
Thread A: STORE counter (tulis 6)
Thread B: STORE counter (tulis 6)    <- menimpa; counter jadi 6, bukan 7!

Hasil akhirnya `counter = 6`, padahal seharusnya 7. Satu increment hilang.
```

Inilah **race condition**. Hasil program bergantung pada **timing atau urutan eksekusi yang tidak terprediksi** dari thread-thread yang sama-sama mengakses data bersama. Bug-nya **non-deterministik**. Kadang muncul, kadang tidak, tergantung penjadwalan kernel. Ini membuat race condition sulit di-debug: program bisa berjalan benar berkali-kali, lalu menghasilkan nilai salah tanpa perubahan kode.

```c
#include <stdio.h>
#include <pthread.h>

long counter = 0;          // variabel BERSAMA (global)

void *tambah(void *arg) {
    for (int i = 0; i < 1000000; i++)
        counter++;          // RACE: tak terlindungi!
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, tambah, NULL);
    pthread_create(&t2, NULL, tambah, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    printf("counter = %ld (harusnya 2000000)\n", counter);
    // Hasil sering kurang dari 2000000, dan bisa berbeda tiap run.
    return 0;
}
```

Jalankan beberapa kali. Kamu biasanya akan melihat angka yang **kurang** dari 2.000.000, dan nilainya bisa berbeda antar run. Increment yang hilang adalah bukti race condition.

Bayangkan dua orang berbagi satu catatan saldo. A membaca saldo Rp100, B juga membaca saldo Rp100. A menambah Rp50 dan menulis Rp150. B, yang tadi juga membaca Rp100, menambah Rp50 dan menulis Rp150. Padahal kalau dua penambahan dihitung benar, hasilnya harus Rp200. Update kedua "menimpa" update pertama karena keduanya membaca nilai lama. Inilah alasan akses ke data bersama perlu penguncian.

---

## 17.4 Critical section & mutex: mengatur giliran

Bagian kode yang mengakses data bersama dan **tidak boleh** dijalankan dua thread bersamaan disebut **critical section**. Solusinya adalah memastikan **hanya satu thread berada di critical section pada satu waktu**. Prinsip ini disebut **mutual exclusion**, dan alat yang umum dipakai adalah **mutex** (MUTual EXclusion lock).

Mutex bekerja seperti kunci untuk sebuah ruangan. Thread harus mengunci (`lock`) sebelum masuk critical section, lalu membuka kunci (`unlock`) setelah keluar. Kalau thread lain mencoba lock saat mutex sudah terkunci, thread itu **menunggu** sampai kuncinya dilepas.

```c
#include <stdio.h>
#include <pthread.h>

long counter = 0;
pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;   // mutex

void *tambah(void *arg) {
    for (int i = 0; i < 1000000; i++) {
        pthread_mutex_lock(&lock);     // kunci: tunggu giliran
        counter++;                     // critical section — aman, cuma satu thread di sini
        pthread_mutex_unlock(&lock);   // lepas kunci: beri giliran berikutnya
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, tambah, NULL);
    pthread_create(&t2, NULL, tambah, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("counter = %ld\n", counter);   // sekarang konsisten 2000000
    return 0;
}
```

Sekarang hasilnya konsisten 2.000.000. Mutex memastikan urutan LOAD-ADD-STORE satu thread tidak tersela thread lain, sehingga bagian itu menjadi efektif atomik. `pthread_mutex_lock` memblokir thread sampai mutex bebas, lalu menguncinya. `pthread_mutex_unlock` melepasnya.

> Aturan utama mutex adalah mengunci hanya di sekitar critical section dan menjaga bagian itu sependek mungkin. Selalu `unlock` di setiap jalur keluar, termasuk jalur error; pola `goto cleanup` dari Bab 13 sering membantu. Mutex yang terlalu lebar mengurangi manfaat concurrency karena thread terlalu sering antre. Mutex yang lupa di-unlock bisa membekukan program.

Dengan contoh saldo tadi, mutex membuat B harus menunggu A selesai membaca, menambah, dan menyimpan nilai baru. Setelah A menulis Rp150 dan melepas lock, B baru membaca saldo terbaru itu dan menambahnya menjadi Rp200. Urutannya menjadi terkontrol.

---

## 17.5 Deadlock: saat penguncian malah membekukan

Mutex menyelesaikan race condition, tetapi memperkenalkan bahaya baru: **deadlock**. Deadlock adalah situasi ketika thread-thread saling menunggu selamanya, sehingga tidak ada yang bisa maju.

Skenario klasiknya melibatkan dua thread dan dua mutex yang dikunci dalam urutan berlawanan.

```c
// Thread A:                    // Thread B:
pthread_mutex_lock(&lock1);     pthread_mutex_lock(&lock2);
pthread_mutex_lock(&lock2);     pthread_mutex_lock(&lock1);   // <- saling tunggu!
// ...                          // ...
```

Bayangkan A mengunci `lock1`, lalu B mengunci `lock2`. Setelah itu A ingin mengambil `lock2`, tetapi lock itu dipegang B, sehingga A menunggu. B ingin mengambil `lock1`, tetapi lock itu dipegang A, sehingga B juga menunggu. **Keduanya menunggu satu sama lain selamanya.** Program tidak crash, tetapi berhenti bergerak. Inilah deadlock.

Cara membayangkannya sederhana: A memegang resource yang dibutuhkan B, sementara B memegang resource yang dibutuhkan A. Selama tidak ada yang melepas resource lebih dulu, keduanya terkunci dalam saling tunggu.

Cara mencegah yang paling umum dan praktis adalah **selalu mengunci mutex dalam urutan global yang konsisten**. Kalau semua thread selalu mengunci `lock1` sebelum `lock2`, dan tidak pernah sebaliknya, skenario deadlock di atas tidak bisa terjadi. Ada strategi lain seperti `pthread_mutex_trylock`, timeout, dan lock hierarchy, tetapi urutan konsisten adalah fondasinya.

---

## 17.6 Sekilas alat sinkronisasi lain

Mutex adalah alat dasar, tetapi ada beberapa alat sinkronisasi lain yang perlu kamu kenal.

- **Condition variable** (`pthread_cond_t`) — untuk thread yang perlu menunggu sampai suatu kondisi terpenuhi tanpa *busy-waiting* (mengecek terus-menerus yang boros CPU). Contohnya, thread konsumen menunggu sampai ada data di antrian. Condition variable biasanya dipakai bersama mutex. Pola produsen-konsumen klasik dibangun dengan ini.
- **Semaphore** (`sem_t`) — penghitung untuk mengatur akses ke sejumlah resource (mis. "maksimal 5 thread boleh akses pool koneksi ini"). Mutex itu seperti semaphore dengan hitungan 1.
- **Atomic operations** (`<stdatomic.h>`, C11) — untuk operasi sederhana seperti `counter++`, ada tipe atomik (`atomic_long`) yang menjamin operasinya tidak terpecah **tanpa** overhead mutex. Atomic sering lebih cepat untuk kasus sederhana. `atomic_fetch_add(&counter, 1)` aman tanpa lock.

Kamu tidak perlu menguasai semuanya sekarang. Yang penting, kamu tahu alat-alat itu ada dan masalah apa yang biasanya diselesaikan masing-masing.

---

## 17.7 Mengapa concurrency itu sulit (dan menutup `errno`)

Concurrency sulit karena kita cenderung membaca kode secara berurutan, sedangkan thread berjalan **bersamaan dengan urutan yang tidak terprediksi**. Bug concurrency seperti race condition dan deadlock punya beberapa sifat yang membuatnya sulit ditangani.

- **Non-deterministik** — muncul tidak konsisten, sehingga sulit direproduksi.
- **Tergantung timing** — bisa hilang saat kamu menambahkan `printf` untuk debug, karena `printf` mengubah timing. Bug seperti ini sering disebut "Heisenbug".
- **Sulit terlihat dari satu alur saja** — kodenya bisa terlihat benar baris per baris, tetapi salah ketika beberapa thread menjalankannya bersamaan.

Tooling membantu. **ThreadSanitizer** (`gcc -fsanitize=thread`, Bab 20) bisa mendeteksi race condition secara otomatis. Untuk kode multi-thread, tool ini berperan seperti ASan untuk bug memori.

> Bagian ini juga menutup catatan dari Bab 13 tentang `errno` yang sebenarnya per-thread. Sekarang alasannya lebih jelas. Kalau `errno` adalah satu variabel global bersama, dua thread yang sama-sama gagal syscall bisa saling menimpa `errno`. Itu akan menjadi race condition pada pelaporan error. Karena itu C/POSIX membuat `errno` **thread-local**, sehingga tiap thread punya salinannya sendiri. Ini contoh nyata bahwa desain library harus memperhitungkan concurrency.

Prinsip desain praktisnya adalah meminimalkan data bersama. Cara terbaik menghindari race condition adalah **tidak berbagi data** kalau bisa. Misalnya, tiap thread bekerja pada datanya sendiri, lalu hasilnya digabung di akhir. Data bersama yang tidak bisa dihindari harus dilindungi dengan disiplin, misalnya memakai mutex atau atomic. *Shared mutable state* adalah sumber banyak kesulitan; kurangi sebisa mungkin.

---

## 17.8 Rangkuman model mental

1. **Thread** = alur eksekusi dalam satu proses. Semua thread **berbagi memori** (heap, global, fd), tetapi punya **stack sendiri**. Thread lebih ringan dan komunikasinya langsung dibanding proses, tetapi satu thread yang crash bisa menjatuhkan seluruh proses.
2. **`pthreads`** memakai `pthread_create(&tid, NULL, fungsi, arg)` (fungsi = function pointer, Bab 7; arg = `void *`, Bab 6); `pthread_join` menunggu thread selesai, mirip `wait`. Link dengan `-pthread`.
3. **Race condition** muncul ketika operasi "satu langkah" seperti `counter++` sebenarnya LOAD-ADD-STORE (Bab 3) yang bisa terinterleave antar thread. Hasilnya salah dan non-deterministik.
4. **Critical section** dilindungi **mutex** (`pthread_mutex_lock`/`unlock`) untuk menyediakan mutual exclusion, yaitu satu thread pada satu waktu. Lock sependek mungkin, selalu unlock.
5. **Deadlock** terjadi saat thread saling menunggu lock selamanya. Cegah dengan **urutan penguncian konsisten**.
6. Alat lain: condition variable (tunggu kondisi), semaphore (hitung resource), atomic (`<stdatomic.h>`, tanpa lock untuk operasi sederhana).
7. Concurrency sulit (bug non-deterministik); pakai **ThreadSanitizer**; **minimalkan data bersama**. (`errno` thread-local karena alasan ini — menutup Bab 13.)

---

## 17.9 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Tulis program yang membuat 3 thread, masing-masing mencetak ID-nya (oper lewat `arg`). Pakai `pthread_join` untuk menunggu semuanya. Compile dengan `-pthread`. Jalankan beberapa kali — apakah urutan output selalu sama? Kenapa?
2. Reproduksi race condition (Section 17.3): dua thread sama-sama `counter++` sejuta kali tanpa proteksi. Jalankan 10 kali dan catat hasilnya. Apakah selalu 2.000.000? Apakah angkanya sama tiap kali?
3. Perbaiki dengan mutex (Section 17.4). Jalankan 10 kali lagi — sekarang selalu benar? 
4. Bandingkan performa versi mutex vs versi atomic (`atomic_long` + `atomic_fetch_add` dari `<stdatomic.h>`). Mana lebih cepat? Kenapa?
5. Ciptakan deadlock sengaja (Section 17.5): dua thread, dua mutex, urutan terbalik. Jalankan — apakah program beku? Lalu perbaiki dengan menyamakan urutan lock. 
6. Jalankan versi race (latihan 2) dengan `gcc -fsanitize=thread`. Apakah ThreadSanitizer mendeteksi & melaporkan race-nya? Baca laporannya.
7. (Lanjutan) Implementasikan pola produsen-konsumen sederhana: satu thread menambah item ke buffer bersama, satu thread mengambilnya, dilindungi mutex (bonus: condition variable).

**Pertanyaan refleksi:**

1. Apa perbedaan utama thread dan proses dalam hal memori? Sebutkan satu kelebihan & satu kekurangan thread.
2. Kenapa `counter++` bisa menyebabkan race condition, padahal terlihat seperti satu operasi? Jelaskan dengan LOAD-ADD-STORE.
3. Apa yang membuat bug race condition begitu sulit di-debug dibanding bug biasa?
4. Apa itu critical section dan mutual exclusion? Bagaimana mutex menyediakannya?
5. Apa itu deadlock? Berikan skenarionya dan cara mencegah yang paling praktis.
6. Kenapa "minimalkan data bersama" adalah prinsip desain yang baik untuk program konkuren?
7. Hubungkan kembali ke Bab 13: kenapa `errno` harus thread-local? Apa yang terjadi kalau ia variabel global biasa di program multi-thread?

---

Dengan ini kita menutup **BAGIAN IV**, yang membahas interaksi dengan sistem operasi: file/IO, error, proses, signal, IPC, dan thread. Bagian ini menjadi dasar untuk memahami bagaimana program C berjalan sebagai bagian dari sistem yang lebih besar.

BAGIAN V membawa kita ke topik sistem yang lebih luas. Di **Bab 18**, kita keluar dari satu mesin dan masuk ke **networking level rendah** dengan **socket**: bagaimana program berbicara lewat jaringan, TCP vs UDP, model client-server, dan kenapa socket bisa dipahami sebagai "file descriptor yang ujungnya ada di komputer lain" (ingat "everything is a file").
