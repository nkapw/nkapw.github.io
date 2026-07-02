---
title: "Bab 17 - Thread dan Konkurensi"
description: "Pada Bab 14 sampai Bab 16 kita membahas proses, komunikasi antarproses, dan cara program C berinteraksi dengan sistem operasi. Proses memberi isolasi yang kuat,..."
tags: [c, systems-programming]
order: 17
updated: 2026-07-02
---
Pada Bab 14 sampai Bab 16 kita membahas proses, komunikasi antarproses, dan cara program C berinteraksi dengan sistem operasi. Proses memberi isolasi yang kuat, tetapi berbagi data antarproses membutuhkan mekanisme IPC dan biaya eksekusi yang lebih besar.

Bab ini membahas **thread**, yaitu beberapa alur eksekusi di dalam satu proses. Thread memungkinkan pekerjaan berjalan secara konkuren dan berbagi memori secara langsung. Kemudahan ini membuat program lebih ringan dan responsif, tetapi juga membuka masalah baru seperti **race condition**, **critical section**, dan **deadlock**.

Tujuan utama bab ini adalah memahami model memori thread, cara membuat thread dengan POSIX threads, serta disiplin sinkronisasi yang diperlukan agar program konkuren tetap benar.

---

## 17.1 Perbedaan Thread dan Proses

Sebuah **proses** memiliki ruang memori sendiri yang terisolasi dari proses lain. Sebuah **thread** adalah alur eksekusi di dalam sebuah proses. Satu proses dapat memiliki banyak thread.

Semua thread dalam satu proses berbagi ruang memori yang sama, termasuk heap, variabel global, dan file descriptor. Namun, setiap thread tetap memiliki stack sendiri untuk variabel lokal, call frame, register, dan instruction pointer.

| Aspek | **Proses** | **Thread** |
|-------|------------|------------|
| Memori | Terisolasi | Berbagi heap dan variabel global dalam proses yang sama |
| Stack | Masing-masing proses memiliki stack sendiri | Masing-masing thread memiliki stack sendiri |
| Pembuatan | Relatif mahal karena melibatkan proses baru | Relatif murah karena hanya menambah alur eksekusi |
| Komunikasi | Membutuhkan IPC | Dapat dilakukan langsung melalui memori bersama |
| Dampak crash | Umumnya tidak menjatuhkan proses lain | Dapat menjatuhkan seluruh proses |
| Isolasi | Kuat | Lemah |

Thread cocok digunakan ketika beberapa alur kerja perlu berbagi data dengan cepat, misalnya server yang menangani banyak koneksi atau program yang memproses data secara paralel. Proses lebih tepat ketika isolasi dan keamanan lebih penting, misalnya ketika kegagalan satu komponen tidak boleh memengaruhi komponen lain.

---

## 17.2 Membuat Thread dengan `pthreads`

Di Linux dan sistem UNIX lain, API thread standar adalah **POSIX threads** atau **pthreads**. Header yang digunakan adalah `<pthread.h>`, dan program perlu dikompilasi dengan opsi `-pthread`.

```c
#include <stdio.h>
#include <pthread.h>

// Fungsi yang dijalankan oleh thread menerima dan mengembalikan void *.
void *kerja(void *arg) {
    int id = *(int *)arg;
    printf("Thread %d sedang bekerja\n", id);
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    int id1 = 1, id2 = 2;

    // Membuat dua thread yang menjalankan fungsi kerja.
    pthread_create(&t1, NULL, kerja, &id1);
    pthread_create(&t2, NULL, kerja, &id2);

    // Menunggu kedua thread selesai.
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    printf("Semua thread selesai\n");
    return 0;
}
```

Kompilasi dengan perintah berikut.

```sh
gcc program.c -o program -pthread
```

`pthread_create(&tid, attr, fungsi, arg)` membuat thread baru dan langsung menjalankan `fungsi(arg)`. Parameter `fungsi` adalah function pointer bertipe `void *(*)(void *)`, sedangkan `arg` adalah `void *` untuk mengirim data ke thread.

`pthread_join(tid, &retval)` memblokir eksekusi sampai thread `tid` selesai. Fungsinya mirip dengan `wait` pada proses. Pemanggilan ini memastikan `main` tidak selesai sebelum thread yang dibuatnya selesai bekerja.

Thread dapat mengakses variabel global, heap, dan file descriptor proses tanpa IPC. Inilah alasan thread efisien, sekaligus alasan mengapa sinkronisasi menjadi penting.

---

## 17.3 Race Condition sebagai Masalah Utama Konkurensi

Karena thread berbagi memori, dua thread dapat membaca dan menulis variabel yang sama pada waktu yang saling tumpang tindih. Operasi yang terlihat sederhana di C sering kali terdiri dari beberapa instruksi di level CPU.

Contohnya adalah `counter++`.

```c
counter++;
```

Operasi tersebut biasanya dapat diuraikan menjadi tiga langkah.

```text
1. LOAD    baca nilai counter dari memori ke register
2. ADD     tambah nilai register dengan 1
3. STORE   tulis hasil dari register kembali ke memori
```

Jika dua thread menjalankan `counter++` pada waktu yang hampir bersamaan, urutannya dapat menjadi seperti berikut.

```text
counter = 5 pada awal eksekusi

Thread A membaca counter dan mendapat nilai 5
Thread B membaca counter dan mendapat nilai 5
Thread A menambah nilai menjadi 6
Thread B menambah nilai menjadi 6
Thread A menulis 6 ke counter
Thread B menulis 6 ke counter

Hasil akhir counter adalah 6, padahal seharusnya 7.
```

Kondisi ini disebut **race condition**. Hasil program bergantung pada urutan eksekusi thread yang tidak dapat diprediksi. Bug seperti ini bersifat non-deterministik, sehingga bisa muncul pada satu eksekusi dan hilang pada eksekusi berikutnya.

```c
#include <stdio.h>
#include <pthread.h>

long counter = 0;

void *tambah(void *arg) {
    for (int i = 0; i < 1000000; i++)
        counter++;
    return NULL;
}

int main(void) {
    pthread_t t1, t2;

    pthread_create(&t1, NULL, tambah, NULL);
    pthread_create(&t2, NULL, tambah, NULL);

    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    printf("counter = %ld, seharusnya 2000000\n", counter);
    return 0;
}
```

Program di atas kemungkinan besar menghasilkan nilai kurang dari 2.000.000, dan nilainya dapat berbeda pada setiap eksekusi. Increment yang hilang terjadi karena beberapa thread membaca nilai lama sebelum thread lain selesai menulis nilai baru.

---

## 17.4 Critical Section dan Mutex

Bagian kode yang mengakses data bersama dan tidak boleh dijalankan oleh lebih dari satu thread pada waktu yang sama disebut **critical section**. Untuk melindungi bagian ini, program menggunakan **mutual exclusion**. Mekanisme yang paling umum adalah **mutex**.

Thread harus mengunci mutex sebelum masuk ke critical section, lalu melepasnya setelah keluar. Jika thread lain mencoba mengunci mutex yang sedang terkunci, thread tersebut akan menunggu sampai mutex dilepas.

```c
#include <stdio.h>
#include <pthread.h>

long counter = 0;
pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;

void *tambah(void *arg) {
    for (int i = 0; i < 1000000; i++) {
        pthread_mutex_lock(&lock);
        counter++;
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;

    pthread_create(&t1, NULL, tambah, NULL);
    pthread_create(&t2, NULL, tambah, NULL);

    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    printf("counter = %ld\n", counter);
    return 0;
}
```

Dengan mutex, hasil program selalu menjadi 2.000.000. Mutex memastikan operasi baca, tambah, dan tulis pada `counter` tidak diselingi thread lain.

Aturan penting saat memakai mutex adalah mengunci hanya bagian yang benar-benar membutuhkan proteksi, menjaga critical section tetap pendek, dan memastikan `pthread_mutex_unlock` selalu dipanggil pada setiap jalur keluar. Mutex yang terlalu luas mengurangi manfaat konkurensi, sedangkan mutex yang tidak pernah dilepas dapat membuat program berhenti menunggu selamanya.

---

## 17.5 Deadlock akibat Penguncian yang Salah

Mutex menyelesaikan race condition, tetapi dapat menimbulkan masalah lain. **Deadlock** terjadi ketika beberapa thread saling menunggu resource yang tidak akan pernah dilepas.

Skenario umum terjadi ketika dua thread mengunci dua mutex dalam urutan yang berbeda.

```c
// Thread A
pthread_mutex_lock(&lock1);
pthread_mutex_lock(&lock2);

// Thread B
pthread_mutex_lock(&lock2);
pthread_mutex_lock(&lock1);
```

Jika Thread A sudah memegang `lock1` dan Thread B sudah memegang `lock2`, maka Thread A akan menunggu `lock2`, sedangkan Thread B akan menunggu `lock1`. Keduanya tidak dapat melanjutkan eksekusi.

Cara paling praktis untuk mencegah kasus ini adalah menetapkan urutan penguncian global yang konsisten. Jika semua thread selalu mengunci `lock1` sebelum `lock2`, maka pola saling menunggu seperti di atas tidak terjadi.

Strategi lain seperti `pthread_mutex_trylock`, timeout, dan lock hierarchy juga dapat digunakan. Namun, disiplin urutan penguncian yang konsisten tetap menjadi dasar yang paling penting.

---

## 17.6 Alat Sinkronisasi Lain

Mutex adalah alat sinkronisasi dasar, tetapi beberapa mekanisme lain juga sering digunakan.

- **Condition variable** (`pthread_cond_t`) digunakan ketika thread perlu menunggu sampai suatu kondisi terpenuhi tanpa melakukan busy-waiting. Contoh umum adalah thread konsumen yang menunggu sampai ada data di antrian. Condition variable biasanya digunakan bersama mutex.
- **Semaphore** (`sem_t`) adalah penghitung yang mengatur akses ke sejumlah resource. Contohnya adalah membatasi maksimal lima thread yang boleh memakai connection pool pada waktu yang sama.
- **Atomic operations** dari `<stdatomic.h>` menyediakan operasi yang tidak dapat diselingi untuk kasus sederhana. Contohnya adalah `atomic_fetch_add(&counter, 1)` pada tipe `atomic_long`.

Tidak semua mekanisme ini perlu dikuasai sekaligus. Yang penting adalah memahami kapan masing-masing alat dibutuhkan dan apa masalah yang diselesaikannya.

---

## 17.7 Mengapa Konkurensi Sulit

Program konkuren sulit dianalisis karena urutan eksekusi thread tidak sepenuhnya berada di bawah kendali programmer. Scheduler kernel dapat menghentikan satu thread dan menjalankan thread lain di titik yang berbeda-beda.

Bug konkurensi memiliki beberapa karakteristik yang membuatnya sulit ditemukan.

- **Non-deterministik** karena tidak selalu muncul pada setiap eksekusi.
- **Bergantung pada timing** karena perubahan kecil seperti menambahkan `printf` dapat mengubah urutan eksekusi.
- **Sulit terlihat dari pembacaan kode biasa** karena setiap baris dapat terlihat benar saat dilihat secara terpisah.

Tool seperti **ThreadSanitizer** dapat membantu mendeteksi race condition secara otomatis. Pada GCC dan Clang, program dapat dikompilasi dengan opsi `-fsanitize=thread` untuk memeriksa akses data bersama yang tidak tersinkronisasi.

Bab 13 menyebut bahwa `errno` bersifat per-thread. Alasannya berkaitan langsung dengan konkurensi. Jika `errno` adalah satu variabel global biasa, dua thread yang sama-sama mengalami kegagalan syscall dapat saling menimpa nilai error. Karena itu, C dan POSIX membuat `errno` sebagai data thread-local agar setiap thread memiliki salinannya sendiri.

Prinsip desain yang penting adalah meminimalkan data bersama. Jika sebuah thread dapat bekerja pada datanya sendiri dan hasilnya baru digabungkan di akhir, risiko race condition jauh lebih kecil. Data bersama yang tidak dapat dihindari harus dilindungi dengan mutex, atomic operation, atau mekanisme sinkronisasi lain yang sesuai.

---

## 17.8 Rangkuman Model Mental

1. **Thread** adalah alur eksekusi di dalam satu proses. Semua thread berbagi heap, variabel global, dan file descriptor, tetapi masing-masing memiliki stack sendiri.
2. **Thread lebih ringan daripada proses**, tetapi isolasinya lebih lemah. Crash pada satu thread dapat menjatuhkan seluruh proses.
3. **`pthreads`** menyediakan `pthread_create` untuk membuat thread dan `pthread_join` untuk menunggu thread selesai. Program perlu dikompilasi dengan `-pthread`.
4. **Race condition** terjadi ketika hasil program bergantung pada urutan akses thread terhadap data bersama.
5. **Critical section** harus dilindungi agar hanya satu thread yang menjalankannya pada satu waktu.
6. **Mutex** menyediakan mutual exclusion melalui `pthread_mutex_lock` dan `pthread_mutex_unlock`.
7. **Deadlock** terjadi ketika thread saling menunggu lock yang tidak pernah dilepas. Pencegahan paling praktis adalah urutan penguncian yang konsisten.
8. **Condition variable**, **semaphore**, dan **atomic operation** adalah alat sinkronisasi tambahan untuk kebutuhan yang berbeda.
9. **Data bersama yang dapat berubah** harus diminimalkan karena merupakan sumber utama bug konkurensi.

---

## 17.9 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Tulis program yang membuat 3 thread. Setiap thread mencetak ID-nya melalui nilai yang dikirim lewat `arg`. Gunakan `pthread_join` untuk menunggu semuanya selesai. Kompilasi dengan `-pthread`, lalu jalankan beberapa kali dan amati apakah urutan output selalu sama.
2. Reproduksi race condition dari bagian 17.3. Buat dua thread yang sama-sama menjalankan `counter++` sebanyak satu juta kali tanpa proteksi. Jalankan 10 kali dan catat hasilnya.
3. Perbaiki program pada latihan sebelumnya dengan mutex. Jalankan 10 kali lagi dan pastikan hasilnya selalu benar.
4. Bandingkan performa versi mutex dengan versi atomic menggunakan `atomic_long` dan `atomic_fetch_add` dari `<stdatomic.h>`.
5. Buat deadlock secara sengaja dengan dua thread dan dua mutex yang dikunci dalam urutan terbalik. Setelah program berhenti menunggu, perbaiki dengan menyamakan urutan lock.
6. Jalankan versi race condition dengan `gcc -fsanitize=thread` dan baca laporan yang dihasilkan ThreadSanitizer.
7. Implementasikan pola produsen-konsumen sederhana. Satu thread menambah item ke buffer bersama, satu thread mengambil item, dan akses ke buffer dilindungi mutex. Sebagai latihan lanjutan, gunakan condition variable.

### Pertanyaan Refleksi

1. Apa perbedaan utama thread dan proses dalam hal memori.
2. Mengapa `counter++` dapat menyebabkan race condition meskipun terlihat seperti satu operasi.
3. Apa yang membuat race condition lebih sulit di-debug dibanding bug biasa.
4. Apa yang dimaksud dengan critical section dan mutual exclusion.
5. Bagaimana mutex mencegah dua thread memasuki critical section secara bersamaan.
6. Apa itu deadlock dan bagaimana urutan penguncian yang konsisten dapat mencegahnya.
7. Mengapa meminimalkan data bersama merupakan prinsip desain yang baik untuk program konkuren.
8. Mengapa `errno` harus bersifat thread-local pada program multi-thread.

---

Dengan bab ini, BAGIAN IV selesai. Kita telah membahas file dan I/O, error handling, proses, signal, IPC, serta thread.

Bab 18 melanjutkan pembahasan ke networking level rendah dengan socket. Topiknya mencakup cara program berkomunikasi melalui jaringan, perbedaan TCP dan UDP, model client-server, serta peran socket sebagai file descriptor untuk komunikasi jaringan.

