---
title: "Proyek Membangun Allocator Sederhana"
description: "Proyek ini menerapkan materi Bab 9 dengan membuat fungsi my_malloc, my_free, my_calloc, dan my_realloc. Implementasi dibuat di atas sbrk agar struktur internal..."
tags: [c, systems-programming, projects, memory]
order: 25
updated: 2026-07-02
---
Proyek ini menerapkan materi Bab 9 dengan membuat fungsi `my_malloc`, `my_free`, `my_calloc`, dan `my_realloc`. Implementasi dibuat di atas `sbrk` agar struktur internal allocator dapat dipahami secara langsung.

Tujuan proyek ini bukan menggantikan allocator produksi seperti glibc. Tujuannya adalah memahami metadata blok, free list, splitting, coalescing, integer overflow pada ukuran alokasi, dan risiko keamanan yang muncul dari manajemen memori manual.

Konsep yang digunakan dalam proyek ini adalah sebagai berikut.

| Konsep | Bab | Kegunaan |
|--------|-----|----------|
| Heap, `brk`, `sbrk`, dan allocator internals | 9 | Dasar implementasi allocator |
| Pointer arithmetic, `void *`, dan cast | 6 | Menghubungkan header dan payload |
| Struct dan memory layout | 8 | Menyimpan metadata setiap blok |
| `size_t` dan integer overflow | 2 dan 21 | Membuat `my_calloc` lebih aman |
| `memcpy` dan `memset` | 5 | Implementasi `calloc` dan `realloc` |

File utama proyek ini adalah sebagai berikut.

- `myalloc.h` berisi deklarasi API.
- `myalloc.c` berisi implementasi allocator.
- `demo.c` berisi contoh penggunaan dan visualisasi heap.

Build dan jalankan demo dengan perintah berikut.

```sh
make run
```

---

## Masalah Dasar Allocator

Kernel dapat memperbesar wilayah heap sebuah proses melalui `brk` atau `sbrk`. Fungsi `sbrk` menggeser program break dan mengembalikan alamat awal dari area baru yang diberikan ke proses.

```c
#include <unistd.h>

void *sbrk(intptr_t increment);
```

`sbrk(n)` menambah ukuran heap sebesar `n` byte. `sbrk(0)` mengembalikan posisi program break saat ini tanpa mengubah ukuran heap.

Allocator perlu melakukan pekerjaan yang tidak dilakukan oleh kernel. Allocator harus mencatat ukuran blok, status bebas atau terpakai, lokasi blok berikutnya, serta cara memakai ulang blok yang sudah dibebaskan.

---

## v1 Bump Allocator

Versi paling sederhana dari allocator hanya memanggil `sbrk` setiap kali ada permintaan alokasi.

```c
void *my_malloc(size_t size) {
    void *p = sbrk(size);
    if (p == (void *)-1) return NULL;
    return p;
}

void my_free(void *ptr) {
    (void)ptr;
}
```

Strategi ini disebut bump allocator. Implementasinya sederhana dan cepat, tetapi tidak dapat memakai ulang memori yang sudah dibebaskan. Setelah banyak alokasi dan pembebasan, konsumsi heap terus bertambah.

Agar memori dapat dipakai ulang, allocator harus menyimpan metadata untuk setiap blok.

---

## v2 Header Blok

Setiap blok memori membutuhkan metadata. Metadata tersebut diletakkan tepat sebelum payload yang dikembalikan kepada pemakai.

```c
typedef struct block {
    size_t        size;
    int           free;
    struct block *next;
} block_t;
```

Layout satu blok dapat digambarkan seperti ini.

```text
+----------------+-------------------------------+
| header         | payload                       |
+----------------+-------------------------------+
^                ^
block_t *        pointer yang dikembalikan
```

Pointer yang dikembalikan oleh `my_malloc` menunjuk ke payload, bukan ke header.

```c
return (void *)(b + 1);
```

Saat `my_free(ptr)` dipanggil, allocator dapat kembali ke header dengan menggeser pointer satu `block_t` ke belakang.

```c
block_t *b = (block_t *)ptr - 1;
```

Operasi `b + 1` tidak maju satu byte. Karena `b` bertipe `block_t *`, ekspresi tersebut maju sebesar `sizeof(block_t)`. Ini adalah pointer arithmetic yang sudah dibahas pada Bab 6.

Semua blok dihubungkan dalam linked list agar allocator dapat mencari blok bebas.

```c
static block_t *find_free(size_t size) {
    for (block_t *b = heap_head; b != NULL; b = b->next) {
        if (b->free && b->size >= size) {
            return b;
        }
    }

    return NULL;
}
```

Strategi di atas disebut first-fit karena allocator mengambil blok bebas pertama yang cukup besar.

---

## v3 Reuse dan Split

Jika allocator menemukan blok bebas 64 byte untuk permintaan 16 byte, memberikan seluruh blok 64 byte akan membuang ruang. Solusinya adalah membagi blok tersebut menjadi dua bagian. Bagian pertama dipakai untuk alokasi baru, sedangkan sisanya menjadi blok bebas baru.

```c
static void split_block(block_t *b, size_t size) {
    if (b->size >= size + HEADER_SIZE + 8) {
        block_t *rest = (block_t *)((char *)b + HEADER_SIZE + size);

        rest->size = b->size - size - HEADER_SIZE;
        rest->free = 1;
        rest->next = b->next;

        b->size = size;
        b->next = rest;
    }
}
```

Split hanya dilakukan jika sisa blok cukup untuk menyimpan header baru dan payload minimal. Jika sisa terlalu kecil, blok diberikan utuh agar tidak menghasilkan fragmen yang tidak berguna.

`my_malloc` kemudian memiliki dua jalur utama. Jika ada blok bebas yang cukup, blok tersebut dipakai ulang dan mungkin di-split. Jika tidak ada blok bebas yang sesuai, allocator meminta blok baru dari kernel melalui `sbrk`.

---

## v4 Coalescing

Fragmentation terjadi ketika memori bebas tersebar dalam banyak blok kecil. Total memori bebas mungkin cukup besar, tetapi tidak tersedia sebagai satu blok yang dapat memenuhi permintaan alokasi besar.

Untuk mengurangi masalah tersebut, allocator menggabungkan blok bebas yang bersebelahan secara fisik. Proses ini disebut coalescing.

```c
static void coalesce(void) {
    block_t *b = heap_head;

    while (b != NULL && b->next != NULL) {
        char *end_of_b = (char *)b + HEADER_SIZE + b->size;

        if (b->free && b->next->free && end_of_b == (char *)b->next) {
            b->size += HEADER_SIZE + b->next->size;
            b->next = b->next->next;
        } else {
            b = b->next;
        }
    }
}
```

Pemeriksaan `end_of_b == (char *)b->next` penting karena allocator hanya boleh menggabungkan blok yang benar-benar bersebelahan di memori. Tanpa pemeriksaan tersebut, allocator dapat merusak struktur heap.

---

## v5 `calloc` dan `realloc`

`calloc(n, size)` mengalokasikan `n * size` byte lalu mengisi seluruh area dengan nol. Perhitungan `n * size` harus diperiksa agar tidak overflow.

```c
void *my_calloc(size_t n, size_t size) {
    if (size != 0 && n > SIZE_MAX / size) return NULL;

    size_t total = n * size;
    void *p = my_malloc(total);

    if (p != NULL) memset(p, 0, total);
    return p;
}
```

Jika perkalian overflow, nilai `total` dapat menjadi lebih kecil dari ukuran yang sebenarnya diminta. Akibatnya, program dapat mengira memiliki buffer besar padahal allocator hanya menyediakan buffer kecil. Ini dapat menyebabkan heap buffer overflow.

`realloc` mempertahankan isi lama jika perlu memindahkan blok.

1. Jika `ptr == NULL`, perilakunya sama seperti `malloc`.
2. Jika `size == 0`, blok lama dibebaskan.
3. Jika blok lama sudah cukup besar, pointer lama dikembalikan.
4. Jika blok lama terlalu kecil, allocator membuat blok baru, menyalin isi lama, lalu membebaskan blok lama.

Jika alokasi baru gagal, blok lama harus tetap valid. Ini adalah bagian penting dari kontrak `realloc`.

---

## Membaca Output `heap_dump`

Fungsi `heap_dump` mencetak daftar blok yang sedang dikelola allocator. Jalankan `make run` untuk melihat perubahan heap pada setiap langkah.

Contoh awal dari tiga alokasi berurutan.

```text
== 1. Tiga alokasi berurutan, masing-masing 64 byte ==
  [0] hdr=0x...000  size=  64  TERPAKAI  payload=0x...018
  [1] hdr=0x...058  size=  64  TERPAKAI  payload=0x...070
  [2] hdr=0x...0b0  size=  64  TERPAKAI  payload=0x...0c8
```

Setelah blok tengah dibebaskan, blok tersebut ditandai bebas.

```text
== 2. Free blok tengah ==
  [0] size=64  TERPAKAI
  [1] size=64  BEBAS
  [2] size=64  TERPAKAI
```

Ketika ada permintaan alokasi yang lebih kecil, blok bebas dapat dipakai ulang dan di-split.

```text
== 3. my_malloc(16), pakai ulang blok bebas dan split sisanya ==
  [0] size=64  TERPAKAI
  [1] size=16  TERPAKAI
  [2] size=24  BEBAS
  [3] size=64  TERPAKAI
```

Setelah semua blok dibebaskan, coalescing menggabungkan blok yang bersebelahan.

```text
== 4. Free a, d, c lalu coalesce ==
  [0] size= 240  BEBAS
```

Output ini menunjukkan bagaimana metadata, free list, split, dan coalescing bekerja pada heap.

---

## Hubungan dengan Bug Memori

Setelah memahami struktur internal allocator, beberapa bug memori menjadi lebih mudah dijelaskan.

- **Memory leak** terjadi ketika program melakukan alokasi tetapi tidak pernah membebaskannya. Blok tetap ditandai terpakai dan tidak bisa dipakai ulang.
- **Use-after-free** terjadi ketika program memakai pointer setelah `free`. Blok tersebut mungkin sudah digunakan kembali untuk alokasi lain.
- **Double free** terjadi ketika blok yang sama dibebaskan lebih dari sekali. Pada allocator nyata, ini dapat merusak free list dan metadata.
- **Heap buffer overflow** terjadi ketika program menulis melewati payload dan merusak metadata blok berikutnya.

Bug di atas berbahaya karena tidak hanya merusak data aplikasi, tetapi juga dapat merusak struktur internal allocator.

---

## Latihan Pengembangan

Latihan berikut dapat dikerjakan setelah memahami implementasi dasar.

1. Tambahkan fungsi statistik heap yang menghitung total byte terpakai, total byte bebas, dan jumlah blok.
2. Ganti first-fit dengan best-fit, lalu bandingkan fragmentation pada pola alokasi yang sama.
3. Tambahkan deteksi double-free di `my_free`.
4. Tambahkan field `magic` di header untuk mendeteksi corruption sederhana.
5. Gunakan `mmap` untuk alokasi besar dan `munmap` saat blok besar dibebaskan.
6. Ubah fungsi menjadi `malloc`, `free`, `calloc`, dan `realloc`, lalu build sebagai shared library untuk dicoba dengan `LD_PRELOAD`.

Saat mencoba `LD_PRELOAD`, hindari pemanggilan fungsi yang dapat memanggil `malloc` dari dalam allocator, termasuk beberapa bentuk logging. Jika allocator memanggil fungsi yang kembali membutuhkan allocator, program dapat masuk ke rekursi yang tidak diinginkan.

---

## Pertanyaan Refleksi

1. Mengapa header diletakkan sebelum payload?
2. Bagaimana `(b + 1)` dan `(block_t *)ptr - 1` bekerja?
3. Mengapa `b + 1` maju sebesar `sizeof(block_t)`?
4. Kapan `split_block` tidak melakukan split?
5. Apa perbedaan internal fragmentation dan external fragmentation?
6. Mengapa coalescing harus memastikan dua blok bersebelahan secara fisik?
7. Mengapa `my_calloc` perlu memeriksa overflow pada `n * size`?
8. Mengapa `realloc` tidak boleh membebaskan blok lama sebelum alokasi baru berhasil?
9. Pada situasi apa bump allocator tetap berguna?

---

Setelah menyelesaikan proyek ini, `malloc` tidak lagi dipahami sebagai operasi abstrak semata. Allocator bekerja dengan meminta memori dari kernel, membagi memori tersebut menjadi blok, menyimpan metadata, memakai ulang blok bebas, dan menggabungkan blok yang bersebelahan untuk mengurangi fragmentation.

