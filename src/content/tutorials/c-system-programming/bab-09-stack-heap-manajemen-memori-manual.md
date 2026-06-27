---
title: "Bab 9 — Stack vs Heap & Manajemen Memori Manual"
description: "Sampai sekarang, sebagian besar data yang kita pakai ukurannya sudah jelas saat kode ditulis: int x;, int arr[5];, atau sebuah struct. Namun dalam program nyata,..."
tags: [c, system-programming]
order: 9
updated: 2026-06-21
---

> "Di C, kamu mengelola memori sendiri. Tidak ada garbage collector yang otomatis membereskan alokasi; kamu yang meminta, memakai, lalu mengembalikannya."

Sampai sekarang, sebagian besar data yang kita pakai ukurannya sudah jelas saat kode ditulis: `int x;`, `int arr[5];`, atau sebuah struct. Namun dalam program nyata, ukuran data sering baru diketahui saat program berjalan. Misalnya, program membaca file dengan jumlah baris yang tidak diketahui, atau server menampung jumlah koneksi yang berubah-ubah.

Untuk kasus seperti itu, C menyediakan **dynamic memory allocation**, yaitu meminta memori dari **heap** saat runtime. Bab ini membahas cara memakai heap, cara kerja allocator di balik layar, dan bug memori yang paling sering muncul ketika alokasi tidak dikelola dengan disiplin.

---

## 9.1 Peta memori sebuah program: empat area besar

Saat program berjalan, OS memberinya ruang memori virtual yang terbagi menjadi beberapa area memori. Peta mentalnya seperti ini:

```
Alamat TINGGI
        +--------------------------+
        |        STACK             |  <- variabel lokal, parameter, return address
        |    (tumbuh ke BAWAH)     |     (otomatis; Bab 4)
        |           |              |
        |           v              |
        |                          |
        |    (ruang kosong)        |
        |                          |
        |           ^              |
        |           |              |
        |        HEAP              |  <- memori dinamis (malloc/free)
        |    (tumbuh ke ATAS)      |     (manual; bab ini)
        +--------------------------+
        |   BSS  (data tak diinit) |  <- variabel global/static tanpa nilai awal (=0)
        +--------------------------+
        |  DATA  (data terinit)    |  <- variabel global/static dengan nilai awal
        +--------------------------+
        |   TEXT / CODE            |  <- instruksi program (machine code; read-only)
        |                          |     juga string literal "..." (Bab 5!)
        +--------------------------+
Alamat RENDAH
```

Empat area utamanya:

- **Text (Code)** — machine code program hasil compile dari Bab 1, biasanya read-only. String literal `"..."` juga berada di sini; karena itu `char *b = "Halo"; b[0]='x';` bisa crash (Bab 5).
- **Data & BSS** — variabel **global** dan **static**. `Data` untuk yang punya nilai awal; `BSS` untuk yang tidak punya nilai awal dan otomatis di-nol-kan. Area ini hidup selama program berjalan.
- **Heap** — memori dinamis yang kamu minta lewat `malloc`. **Tumbuh ke atas**, yaitu ke arah alamat yang makin besar. Inilah fokus bab ini.
- **Stack** — variabel lokal dan frame fungsi (Bab 4). **Tumbuh ke bawah**, yaitu ke arah alamat yang makin kecil.

Heap dan stack tumbuh saling mendekat dari dua ujung ruang kosong di tengah. Pada sistem modern dengan virtual memory, detailnya ditangani lebih canggih, tetapi gambaran ini tetap berguna sebagai model awal.

---

## 9.2 Kenapa heap? Batasan stack

Kenapa tidak memakai stack saja untuk semuanya? Stack punya dua keterbatasan penting (ingat Bab 4):

1. **Umur terikat fungsi.** Variabel lokal mati saat fungsinya `return`, karena frame fungsi di-pop. Kamu tidak bisa membuat data di sebuah fungsi lalu memakainya setelah fungsi itu selesai, kecuali data tersebut ditempatkan di heap. Ini solusi untuk bahaya "return alamat variabel lokal" dari Bab 4.9.
2. **Ukuran harus diketahui dan terbatas.** Ukuran array stack biasanya harus sudah jelas, atau memakai VLA yang berisiko. Total stack juga terbatas, sering hanya beberapa MB. Array terlalu besar bisa menyebabkan stack overflow.

Heap memecahkan keduanya:

| | **Stack** | **Heap** |
|---|---|---|
| Alokasi | otomatis (masuk fungsi) | manual (`malloc`) |
| Dibebaskan | otomatis (keluar fungsi) | manual (`free`) — tanggung jawabmu |
| Umur | selama fungsi hidup | sampai kamu `free` (bisa lintas fungsi) |
| Ukuran | terbatas (MB), tetap | besar (≈ RAM), bisa ditentukan saat runtime |
| Kecepatan | sangat cepat (geser pointer) | lebih lambat (allocator harus cari blok) |

Trade-off-nya jelas: heap memberi fleksibilitas, baik untuk ukuran dinamis maupun umur data yang lebih panjang, tetapi dibayar dengan biaya performa dan **tanggung jawab manual**.

Artinya, heap bukan pengganti stack untuk semua hal. Untuk data kecil yang umurnya jelas hanya selama fungsi berjalan, stack tetap pilihan paling sederhana. Heap dipakai ketika kamu memang butuh ukuran yang baru diketahui saat runtime, data yang hidup melewati batas fungsi, atau struktur data yang tumbuh dan menyusut selama program berjalan.

---

## 9.3 `malloc` & `free`: meminjam dan mengembalikan

Fungsi inti ada di `<stdlib.h>`:

```c
void *malloc(size_t size);   // minta 'size' byte; kembalikan pointer ke awalnya (atau NULL kalau gagal)
void  free(void *ptr);       // kembalikan memori yang dulu di-malloc
```

Contoh dasar — mengalokasikan satu `int` di heap:

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof(int));   // minta 4 byte di heap
    if (p == NULL) {                // selalu cek: malloc bisa gagal
        fprintf(stderr, "alokasi gagal\n");
        return 1;
    }

    *p = 42;                        // pakai memorinya seperti pointer biasa
    printf("%d\n", *p);             // 42

    free(p);                        // kembalikan saat selesai
    p = NULL;                       // praktik baik: hindari dangling (Bagian 9.7)
    return 0;
}
```

Perhatikan poin-poin pentingnya:

- **`malloc(sizeof(int))`** meminta sejumlah byte. Pakai `sizeof` supaya portable; jangan menulis angka `4` langsung. `malloc` mengembalikan `void *` (Bab 6.8), yaitu pointer generik karena ia tidak tahu tipe data apa yang akan kamu simpan. Di C, hasil ini otomatis dikonversi ke tipe pointer tujuan, jadi tidak perlu cast eksplisit.
- **Cek `NULL`.** `malloc` bisa **gagal** ketika memori tidak tersedia dan mengembalikan `NULL`. Memakai hasil `malloc` tanpa cek membuka kemungkinan dereference `NULL` dan crash. Biasakan selalu cek.
- **`free(p)`** mengembalikan memori ke allocator agar bisa dipakai ulang. Kalau lupa `free`, terjadi **memory leak** (Bagian 9.7).
- **`p = NULL` setelah `free`** mencegah `p` tetap menjadi dangling pointer yang menunjuk memori mati (Bagian 9.7).

`malloc` bisa dibayangkan seperti menyewa ruang. Kamu meminta ukuran tertentu, lalu mendapat kunci berupa pointer ke ruang itu. Saat selesai, kamu harus mengembalikannya dengan `free`. Jika tidak, ruang itu tetap tercatat terpakai walaupun programmu sudah tidak punya cara berguna untuk memakainya.

Perhatikan juga bahwa `free` tidak menghapus variabel pointer-nya. `p` tetap variabel lokal biasa yang menyimpan sebuah alamat. Yang berubah adalah status blok heap di belakang alamat itu: setelah `free`, blok tersebut bukan lagi milik kode yang memegang `p`.

---

## 9.4 Alokasi dinamis yang sesungguhnya: array berukuran runtime

Kekuatan heap terasa saat ukuran data **baru diketahui saat runtime**:

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;
    printf("Berapa banyak angka? ");
    scanf("%d", &n);                       // n baru diketahui SAAT runtime

    int *arr = malloc(n * sizeof(int));    // alokasi array sebesar n int
    if (arr == NULL) return 1;

    for (int i = 0; i < n; i++)
        arr[i] = i * i;                    // pakai seperti array biasa (ingat arr[i]=*(arr+i))

    for (int i = 0; i < n; i++)
        printf("%d ", arr[i]);
    printf("\n");

    free(arr);                             // satu free untuk seluruh blok
    return 0;
}
```

Setelah `malloc`, `arr` dipakai persis seperti array biasa (`arr[i]`). Seperti di Bab 5 dan 6, `arr[i]` sama dengan `*(arr+i)`, dan `arr` hanyalah pointer ke blok memori contiguous.

Bedanya, blok ini berada di heap, ukurannya `n`, dan kamu yang bertanggung jawab mem-`free`-nya.

> **Hati-hati overflow perkalian:** `n * sizeof(int)` bisa overflow kalau `n` sangat besar (Bab 2). Akibatnya, alokasi bisa lebih kecil dari yang kamu kira dan berujung buffer overflow. Untuk array, `calloc` (Bagian 9.5) lebih aman karena ia mengecek overflow perkalian.

---

## 9.5 Saudara `malloc`: `calloc`, `realloc`, dan teman-temannya

```c
void *calloc(size_t jumlah, size_t ukuran);     // alokasi & NOL-kan
void *realloc(void *ptr, size_t ukuran_baru);   // ubah ukuran alokasi
```

**`calloc(n, size)`** mengalokasikan array berisi `n` elemen, masing-masing berukuran `size`, lalu **menginisialisasi semua byte ke 0**. Ini berbeda dari `malloc`, yang isi awalnya tidak terdefinisi. Selain itu, `calloc` mengecek overflow `n * size` secara internal.

```c
int *arr = calloc(n, sizeof(int));   // n int, semua sudah 0
```

> **Jebakan penting:** memori dari `malloc` **tidak** otomatis nol. Isinya adalah byte yang tidak terdefinisi. Membaca memori hasil `malloc` sebelum menulisinya berarti membaca nilai tidak valid, dan dalam beberapa kasus bisa membuka kebocoran data. Kalau butuh nilai awal nol, pakai `calloc` atau `memset(p, 0, size)`.

**`realloc(ptr, ukuran_baru)`** mengubah ukuran blok yang sudah dialokasikan, baik memperbesar maupun memperkecil. Ini berguna untuk array yang tumbuh, misalnya saat membaca data yang jumlahnya belum diketahui. Cara kerjanya:

- Kalau bisa, ia memperluas blok di tempat.
- Kalau tidak, ia **mengalokasikan blok baru yang lebih besar, menyalin isi lama ke sana, lalu mem-`free` yang lama**, dan mengembalikan pointer baru. Pointer baru itu **mungkin berbeda** dari yang lama.

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int kapasitas = 2;
    int *arr = malloc(kapasitas * sizeof(int));
    int jumlah = 0;

    for (int x = 1; x <= 5; x++) {
        if (jumlah == kapasitas) {              // penuh? perbesar dua kali lipat
            kapasitas *= 2;
            int *baru = realloc(arr, kapasitas * sizeof(int));
            if (baru == NULL) { free(arr); return 1; }  // realloc gagal: arr lama masih valid
            arr = baru;                          // arr mungkin pindah alamat
        }
        arr[jumlah++] = x;
    }
    for (int i = 0; i < jumlah; i++) printf("%d ", arr[i]);
    printf("\n");
    free(arr);
    return 0;
}
```

Pola "double the capacity" adalah cara umum membangun dynamic array, seperti `vector` di C++ atau `list` di Python di balik layar. Kapasitas tidak dinaikkan satu per satu karena itu akan membuat program terlalu sering memanggil allocator dan menyalin isi lama. Dengan menggandakan kapasitas, biaya penyalinan dibayar sesekali, bukan pada setiap elemen baru.

Ada dua jebakan `realloc`. Pertama, **jangan** menulis `arr = realloc(arr, ...)` langsung. Kalau gagal dan mengembalikan `NULL`, pointer lama hilang sehingga terjadi leak. Pakai variabel sementara seperti `baru`. Kedua, setelah `realloc` berhasil, pointer lama mungkin sudah tidak valid. Selalu pakai pointer baru yang dikembalikan.

Detail ini penting karena `realloc` adalah operasi yang terlihat sederhana tetapi memindahkan ownership alamat. Setelah sukses, blok lama dianggap sudah diurus oleh allocator, baik diperbesar di tempat maupun dipindahkan ke alamat baru. Kode setelahnya harus menganggap hanya pointer hasil `realloc` yang sah.

---

## 9.6 Cara kerja allocator di balik layar

Apa yang sebenarnya terjadi saat kamu memanggil `malloc`? Siapa yang mengelola heap?

### Kernel memberi area besar, allocator membagi-bagi

`malloc` **bukan** syscall langsung. Ia bagian dari **C standard library** (libc) dan berjalan di **user space**. Secara garis besar, libc melakukan dua hal:

1. **Meminta area besar dari kernel** sesekali, lewat syscall seperti `brk`/`sbrk` untuk menggeser "batas" heap, atau `mmap` untuk memetakan area memori. Memanggil kernel relatif mahal (Bab 19), jadi libc tidak ingin melakukannya untuk setiap `malloc`.
2. **Membagi-bagi area itu sendiri.** `malloc` dan `free` mengelola area tersebut di user space: membaginya menjadi blok-blok kecil sesuai permintaan, lalu melacak mana yang terpakai dan mana yang bebas.

Analogi sederhananya, kernel menyediakan area besar, lalu allocator membaginya menjadi ruang-ruang kecil untuk kode-mu. Karena itu, program tidak perlu masuk ke kernel setiap kali butuh alokasi kecil.

### Metadata: kenapa `free(p)` cukup tahu `p` saja

`free(p)` hanya menerima pointer, tanpa ukuran. Bagaimana ia tahu harus membebaskan berapa byte? Allocator menyimpan **metadata**, biasanya **tepat sebelum** blok yang ia kembalikan kepadamu.

Saat `malloc(32)`, allocator biasanya mengambil sedikit lebih banyak dari 32 byte, menulis informasi seperti "ukuran blok ini = 32, status = terpakai" di header tersembunyi, lalu memberimu pointer ke bagian setelah header itu.

```
     header tersembunyi        blok yang kamu pakai
   +--------------------+----------------------------------+
   | ukuran, flag, dll  | <- pointer dari malloc ada di sini|
   +--------------------+----------------------------------+
   ^                    ^
 allocator tahu ini    p (yang kamu terima)
```

Saat `free(p)`, allocator melihat sedikit ke belakang dari `p` untuk membaca header, sehingga tahu ukuran bloknya. Ini menjelaskan dua hal:

1. **Menulis melewati batas blok** (buffer overflow di heap) bisa merusak metadata blok tetangga. Hasilnya bisa berupa crash yang sulit dilacak atau celah keamanan (heap corruption).
2. Kamu **hanya boleh `free` pointer yang persis dikembalikan `malloc`**, bukan `free(p+1)`. Kalau tidak, allocator membaca "header" di tempat yang salah.

### Free list & fragmentation

Saat kamu `free`, blok itu biasanya tidak langsung dikembalikan ke kernel. Blok tersebut ditandai "bebas" dan dimasukkan ke **free list** allocator, siap dipakai ulang oleh `malloc` berikutnya.

Karena blok dialokasikan dan dibebaskan dengan ukuran beragam, lama-lama heap bisa berlubang-lubang: total ruang bebas mungkin cukup, tetapi terpecah menjadi kepingan kecil sehingga tidak ada satu blok yang cukup besar untuk permintaan baru. Ini disebut **fragmentation**.

Allocator modern seperti glibc malloc, jemalloc, dan tcmalloc punya strategi untuk meminimalkannya. Namun memahami konsepnya membantu menjelaskan kenapa pola alokasi tertentu bisa boros.

---

## 9.7 Tiga bug besar manajemen memori

Tiga bug berikut adalah sumber masalah klasik di program C. Karena itu, tools seperti Valgrind dan ASan (Bab 20) penting untuk dikuasai.

### Bug 1: Memory leak (lupa `free`)

Kamu memanggil `malloc`, tetapi tidak pernah memanggil `free`. Memori itu tetap dianggap terpakai walaupun kamu sudah kehilangan pointernya.

```c
void bocor(void) {
    int *p = malloc(1000);
    // ... lupa free(p)
}                          // p (pointer di stack) hilang; blok heap bocor
```

Untuk program kecil yang langsung selesai, OS akan membersihkan semua memori program saat exit, sehingga leak kecil mungkin tidak terasa. Namun untuk program yang berjalan lama, seperti server, daemon, atau GUI, leak akan menumpuk: memori habis, program melambat, lalu bisa mati. Leak adalah salah satu bug paling umum di C.

### Bug 2: Dangling pointer (pakai setelah `free`)

Kamu `free` memori, tapi masih memegang & memakai pointernya (**use-after-free**).

```c
int *p = malloc(sizeof(int));
*p = 5;
free(p);                   // memori dikembalikan ke allocator
printf("%d\n", *p);        // dangling: membaca memori yang sudah "mati" -> UB
*p = 10;                   // lebih parah: menulis ke memori yang mungkin sudah dipakai blok lain
```

Setelah `free(p)`, `p` menjadi **dangling pointer**: menunjuk memori yang tidak lagi sah untuk dipakai. Allocator mungkin sudah memberikan blok itu ke `malloc` lain. Use-after-free adalah salah satu **celah keamanan serius** di dunia nyata, termasuk pada browser dan kernel.

Pertahanan sederhana: set `p = NULL` segera setelah `free(p)`. Jika pointer itu dipakai lagi tanpa sengaja, program cenderung crash dengan dereference `NULL` yang lebih jelas, bukan korupsi memori diam-diam.

### Bug 3: Double free (free dua kali)

Mem-`free` pointer yang sama dua kali.

```c
free(p);
free(p);                   // double free -> merusak struktur internal allocator
```

Karena `free` memanipulasi metadata dan free list, mem-`free` blok yang sudah bebas bisa mengacaukan struktur internal allocator. Hasilnya bisa berupa crash atau celah keamanan.

Di sini, `p = NULL` setelah `free` juga membantu. `free(NULL)` itu **legal dan aman**; ia tidak melakukan apa-apa. Jadi setelah pointer diubah menjadi `NULL`, pemanggilan `free(p)` berikutnya tidak lagi menjadi double free.

> **Tiga aturan yang menutup mayoritas masalah:**
> 1. Setiap `malloc`/`calloc`/`realloc` harus berpasangan dengan **tepat satu** `free`.
> 2. Set pointer ke **`NULL` setelah `free`**.
> 3. Saat development, jalankan dengan `valgrind ./program` atau compile dengan `-fsanitize=address` (Bab 20). Tools ini mendeteksi leak, use-after-free, double-free, dan overflow secara otomatis. Jangan menebak; biarkan tools yang menemukan.

---

## 9.8 Mengembalikan memori dari fungsi (solusi bahaya Bab 4.9)

Ingat Bab 4: mengembalikan `&x`, yaitu alamat variabel lokal, berbahaya karena `x` mati saat fungsi `return`. Heap menyelesaikan masalah ini karena memori heap **tidak terikat umur fungsi**:

```c
#include <stdlib.h>

// bahaya (Bab 4): mengembalikan alamat lokal yang akan mati
int *salah(void) {
    int x = 42;
    return &x;          // dangling: x mati saat return
}

// benar: memori heap hidup sampai di-free, melampaui fungsi
int *benar(void) {
    int *p = malloc(sizeof(int));
    if (p) *p = 42;
    return p;           // valid; pemanggil yang nanti harus free
}
```

Namun ini memunculkan pertanyaan desain penting: **siapa yang bertanggung jawab mem-`free`?**

Saat sebuah fungsi mengembalikan pointer hasil `malloc`, kontraknya harus jelas: "pemanggil harus mem-`free` hasil ini." Ini disebut **ownership** atau kepemilikan memori. Karena C tidak punya mekanisme otomatis, ownership adalah **konvensi** yang harus didokumentasikan dan dipatuhi.

Banyak library menulis kontrak semacam ini secara eksplisit: fungsi tertentu mengembalikan memori yang harus dibebaskan dengan `xxx_free()`. Kebiasaan berpikir tentang ownership sejak awal akan membuat desain fungsi lebih jelas dan lebih aman.

Ownership juga membantu membaca kode. Jika sebuah fungsi menerima pointer, tanyakan apakah fungsi itu hanya meminjam data sementara, mengambil alih tanggung jawab `free`, atau justru mengembalikan memori baru yang harus dibebaskan pemanggil. Di C, perbedaan ini tidak terlihat dari tipe saja, sehingga nama fungsi, dokumentasi, dan pola pemakaian menjadi penting.

---

## 9.9 Membangun linked list sungguhan

Sekarang kita gabungkan struct (Bab 8), pointer (Bab 6), dan heap (bab ini) untuk membangun struktur data dinamis pertama kita: **singly linked list**. Ini melanjutkan ide dari Bab 8.6 tentang struct yang menunjuk struct sejenis.

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

// buat node baru di heap
Node *buat_node(int data) {
    Node *n = malloc(sizeof(Node));
    if (n == NULL) return NULL;
    n->data = data;
    n->next = NULL;
    return n;
}

// tambah node ke depan list (return head baru)
Node *push_depan(Node *head, int data) {
    Node *n = buat_node(data);
    if (n == NULL) return head;     // alokasi gagal: list tak berubah
    n->next = head;                 // node baru menunjuk head lama
    return n;                       // node baru jadi head
}

void cetak(Node *head) {
    for (Node *cur = head; cur != NULL; cur = cur->next)
        printf("%d -> ", cur->data);
    printf("NULL\n");
}

// bebaskan semua node
void hapus_semua(Node *head) {
    Node *cur = head;
    while (cur != NULL) {
        Node *berikut = cur->next;  // simpan dulu, sebelum cur di-free
        free(cur);
        cur = berikut;
    }
}

int main(void) {
    Node *head = NULL;
    head = push_depan(head, 30);
    head = push_depan(head, 20);
    head = push_depan(head, 10);

    cetak(head);                    // 10 -> 20 -> 30 -> NULL

    hapus_semua(head);              // bebaskan semua; tanpa ini -> leak 3 node
    head = NULL;
    return 0;
}
```

Poin-poin penting dari contoh ini:

- **Tiap node di-`malloc` terpisah.** List bisa tumbuh sesuai kebutuhan saat runtime, tidak seperti array statis. Node-node tersebar di heap dan disambung oleh pointer `next`.
- **`cur = cur->next`** berarti berjalan menyusuri list dengan mengikuti pointer. Inilah esensi traversal struktur data berbasis pointer.
- **`hapus_semua`** krusial: kita harus mem-`free` **setiap** node. Perhatikan kita menyimpan `cur->next` ke `berikut` *sebelum* `free(cur)`. Kalau `free(cur)` dilakukan lebih dulu, membaca `cur->next` menjadi dangling read.
- Tanpa `hapus_semua`, ketiga node bocor. Coba jalankan dengan `valgrind` dengan dan tanpa `hapus_semua`; kamu akan melihat laporan leak-nya.

Linked list juga menunjukkan trade-off heap secara nyata. Menambah node di depan murah karena cukup mengalokasikan satu node dan mengubah satu pointer. Namun traversal tidak se-cache-friendly array, karena node bisa tersebar di heap. Pilihan struktur data selalu membawa konsekuensi memori dan performa.

Ini fondasi banyak struktur data dinamis. Tree, hash table, dan graph memakai variasi dari ide yang sama: data ditempatkan di heap, lalu saling terhubung lewat pointer.

---

## 9.10 Rangkuman model mental

1. Memori program terbagi: **text** (kode + literal), **data/bss** (global/static), **heap** (dinamis, manual), **stack** (lokal, otomatis). Heap tumbuh ke atas, stack ke bawah.
2. **Heap** dipakai saat ukuran baru diketahui runtime atau data harus hidup melampaui satu fungsi.
3. **`malloc`** meminta memori dengan isi awal tidak terdefinisi, sedangkan **`free`** mengembalikannya. **Selalu cek `malloc` != NULL.** `calloc` menginisialisasi nol dan mengecek overflow; `realloc` mengubah ukuran dan bisa memindahkan alamat.
4. **Allocator (libc) berjalan di user space.** Ia meminta area besar dari kernel (`brk`/`mmap`) sesekali, lalu membagi-baginya sendiri. Ia menyimpan **metadata** (ukuran/flag) tepat sebelum blokmu; itu sebabnya `free(p)` cukup tahu `p`.
5. **Tiga bug besar:** memory leak (lupa free), dangling/use-after-free (pakai setelah free), double free. Pertahanan: satu malloc-satu free, `p = NULL` setelah free, jalankan Valgrind/ASan.
6. **Ownership** = konvensi siapa yang harus memanggil `free`. Dokumentasikan dan patuhi; C tidak mengurusnya untukmu.
7. **Heap memungkinkan struktur data dinamis** (linked list, tree, dll): struct ber-pointer yang tiap node-nya di-`malloc`.

---

## 9.11 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Alokasikan satu `int` dengan `malloc`, isi, cetak, lalu `free`. Tambahkan pengecekan `NULL`. Jalankan dengan `valgrind ./program` — pastikan "no leaks".
2. Minta `n` dari user, alokasikan array `int` sebesar `n`, isi dengan kuadrat, cetak, `free`. Apa yang terjadi kalau kamu **lupa** `free`? Konfirmasi dengan valgrind.
3. Bandingkan `malloc(10*sizeof(int))` lalu baca isinya sebelum ditulis, vs `calloc(10, sizeof(int))`. Apa beda isinya? Kenapa?
4. Implementasikan dynamic array yang tumbuh dengan `realloc` (pola "double capacity", Bagian 9.5). Baca angka dari user sampai dia masukkan 0, simpan semua, lalu cetak.
5. Sengaja buat use-after-free: `free(p)` lalu `*p = 5`. Jalankan biasa (mungkin "kelihatan jalan"?), lalu compile `-fsanitize=address` — apa kata ASan?
6. Sengaja buat double free. Jalankan. Apa pesan errornya? Lalu tambahkan `p = NULL;` setelah free pertama — kenapa double free jadi tak terjadi?
7. Implementasikan linked list lengkap (Bagian 9.9), tambahkan fungsi `push_belakang`, `hapus_nilai(head, x)`, dan `panjang(head)`. Jalankan dengan valgrind untuk memastikan tak ada leak.
8. Tulis fungsi `char *gabung(const char *a, const char *b)` yang mengalokasikan string baru hasil penggabungan `a` dan `b` di heap, dan kembalikan. Dokumentasikan ownership-nya. (Petunjuk: hitung panjang total + 1 untuk `'\0'`.)

**Pertanyaan refleksi:**

1. Sebutkan empat area memori program dan apa isi masing-masing. Di mana string literal tinggal?
2. Kenapa kita butuh heap, padahal sudah ada stack? Dua keterbatasan stack apa yang dipecahkan heap?
3. Kenapa `malloc` bisa mengembalikan `NULL`, dan apa akibatnya kalau kamu tak mengeceknya?
4. Dengan kata-katamu sendiri, bagaimana `free(p)` tahu harus membebaskan berapa byte, padahal cuma diberi `p`?
5. Apakah `malloc` itu syscall? Jelaskan hubungan antara allocator (libc) dan kernel.
6. Jelaskan tiga bug besar memori. Kenapa `p = NULL` setelah `free` membantu mencegah dua di antaranya?
7. Apa itu "ownership" memori, dan kenapa ia jadi konvensi penting dalam desain fungsi yang mengembalikan pointer?
8. Kenapa di `hapus_semua` kita harus menyimpan `cur->next` sebelum `free(cur)`?

---

Kita sekarang sudah melihat inti manajemen memori manual di C: meminta memori, memakai pointer ke blok tersebut, menentukan ownership, lalu membebaskannya pada waktu yang tepat.

Di Bab 10, kita mulai masuk ke cara program C nyata dibangun: **preprocessor & build system**. Kita akan membahas apa yang dilakukan `#define` dan macro, conditional compilation, header guard, serta otomatisasi build dengan `Makefile`.
