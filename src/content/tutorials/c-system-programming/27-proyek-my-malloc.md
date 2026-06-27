---
title: "Proyek: Membangun `malloc` Sendiri"
description: "Proyek ini mewujudkan Bab 9 secara harfiah: kita tulis mymalloc, myfree, mycalloc, dan myrealloc sendiri, di atas satu syscall pengatur heap yaitu sbrk. Targetnya..."
tags: [c, system-programming]
order: 27
updated: 2026-06-17
---

> "`malloc` itu terasa seperti sihir: kamu minta sekian byte, ia kasih pointer; kamu `free`, byte-nya 'kembali'. Tapi tak ada sihir — di balik layar cuma ada **sepetak memori dari kernel** dan **buku catatan** tentang potongan mana yang terpakai dan mana yang bebas. Begitu kamu menulis allocator sendiri, `malloc` berhenti jadi kotak hitam selamanya."

Proyek ini mewujudkan **Bab 9** secara harfiah: kita tulis `my_malloc`, `my_free`, `my_calloc`, dan `my_realloc` sendiri, di atas satu syscall pengatur heap yaitu `sbrk`. Targetnya bukan ngalahin glibc — targetnya **paham**.

Yang dipakai:

| Konsep | Dari bab | Dipakai untuk |
|--------|----------|---------------|
| heap, `brk`/`sbrk`, allocator internals | Bab 9 | seluruh proyek |
| pointer arithmetic, `void*`, cast | Bab 6 | header ↔ payload, navigasi blok |
| struct & memory layout | Bab 8 | header metadata tiap blok |
| `size_t`, integer overflow | Bab 2 & 21 | `my_calloc` yang aman |
| `memcpy`/`memset` | Bab 5 | `calloc`/`realloc` |

File: `myalloc.h` (API), `myalloc.c` (implementasi), `demo.c` (pemakaian + visualisasi). Build `make`, jalankan `./demo`.

---

## Masalah inti: kernel cuma kasih "tanah", kita yang harus jadi "tukang kavling"

Kernel tidak tahu soal "objek 20 byte". Yang ia tahu cuma satu hal kasar: **memperbesar atau memperkecil wilayah heap sebuah proses**. Di Linux itu syscall `brk`/`sbrk`:

```c
#include <unistd.h>
void *sbrk(intptr_t increment);   // geser "program break" naik; kembalikan alamat LAMA
```

`sbrk(n)` mendorong batas atas heap (*program break*) naik `n` byte dan mengembalikan alamat batas yang **lama** — yaitu awal dari `n` byte baru yang sekarang jadi milikmu. `sbrk(0)` cuma memberi tahu posisi break sekarang tanpa mengubah apa-apa.

**Analogi:** kernel itu pemerintah yang menjual **sebidang tanah besar** (`sbrk`). Ia tak peduli kamu mau bangun apa. `malloc`-mu adalah **developer perumahan**: ia mengkavling tanah itu jadi kapling-kapling kecil (blok), mencatat siapa penghuninya, dan saat penghuni pindah (`free`) ia menandai kapling itu kosong supaya bisa ditempati lagi. Seluruh proyek ini adalah soal **pembukuan kavling**, bukan soal memori itu sendiri.

---

## v1 — Bump allocator: paling primitif yang mungkin

Versi paling sederhana: tiap `malloc` cukup `sbrk` sebanyak yang diminta dan kembalikan pointer-nya. `free`? Tidak melakukan apa-apa.

```c
void *my_malloc(size_t size) {
    void *p = sbrk(size);            // minta `size` byte dari kernel
    if (p == (void *)-1) return NULL;
    return p;
}
void my_free(void *ptr) { (void)ptr; /* ... tidak bisa apa-apa */ }
```

Ini **berfungsi** — dan sebenarnya ada nama resminya: *bump allocator*. Cepat luar biasa (cuma satu syscall, malah bisa tanpa syscall kalau di-batch). Tapi cacat fatalnya jelas: **memori tak pernah kembali**. Sekali `malloc`, byte itu hilang selamanya walau sudah di-`free`. Alokasi-bebas berulang akan menghabiskan memori. Untuk bisa **memakai ulang** memori yang sudah bebas, allocator harus **mengingat** blok mana yang bebas. Artinya: kita butuh metadata.

---

## v2 — Header: tiap blok membawa kartu identitasnya sendiri

Ide kuncinya: **simpan informasi tentang sebuah blok tepat SEBELUM blok itu di memori.** Setiap kali kita kasih payload ke pemakai, kita diam-diam menyisipkan sebuah *header* di depannya.

```c
typedef struct block {
    size_t        size;   // ukuran payload (byte), tak termasuk header
    int           free;   // 1 = bebas, 0 = terpakai
    struct block *next;   // blok berikutnya (urut alamat) -> linked list
} block_t;
```

Di memori, tiap blok jadi begini:

```
   +----------------+----------------------------------+
   |  header (24 B) |  payload (yang dilihat pemakai)   |
   +----------------+----------------------------------+
   ^                ^
   block_t*         pointer yang DIKEMBALIKAN ke pemakai
```

Dua trik pointer (Bab 6) yang jadi tulang punggung semuanya:

```c
return (void *)(b + 1);          // payload = tepat SETELAH header
                                 // (b+1 pada block_t* maju sebesar sizeof(block_t))

block_t *b = (block_t *)ptr - 1; // dari payload, MUNDUR 1 header ke metadata
```

Inilah rahasia kenapa `free(ptr)` cukup diberi pointer payload saja: allocator tinggal mundur `sizeof(block_t)` byte untuk menemukan kartu identitas blok itu — ada `size`-nya, ada flag `free`-nya. Header ini persis "metadata sebelum blok" yang disebut di Bab 9.

Semua blok kita rangkai jadi **linked list** lewat `next`, supaya `malloc` bisa menjelajahinya mencari blok bebas:

```c
static block_t *find_free(size_t size) {   // first-fit
    for (block_t *b = heap_head; b != NULL; b = b->next)
        if (b->free && b->size >= size)
            return b;
    return NULL;                            // tak ada -> harus sbrk lagi
}
```

Strategi "ambil blok bebas pertama yang muat" ini disebut **first-fit**. Ada juga *best-fit* (cari yang paling pas) dan *worst-fit* — masing-masing trade-off antara kecepatan dan fragmentation (lihat latihan).

---

## v3 — Pakai ulang & split: jangan boros

Saat `find_free` menemukan blok bebas 64 byte padahal kita cuma minta 16, memberikan seluruh 64 byte itu **boros** — 48 byte terbuang. Solusinya **split**: potong blok jadi dua — 16 byte dipakai, sisanya jadi blok bebas baru.

```c
static void split_block(block_t *b, size_t size) {
    // hanya split kalau sisa cukup untuk header + payload minimal
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

Perhatikan syaratnya: kita hanya split kalau sisanya **cukup untuk menampung header baru + sedikit payload**. Kalau blok bebas cuma sedikit lebih besar dari permintaan, split malah merugikan (sisanya tak cukup buat apa-apa, malah nambah header). Maka blok itu diberikan utuh — sedikit kelebihan ini disebut *internal fragmentation*.

`my_malloc` lengkapnya jadi: kalau ada blok bebas yang muat → split lalu pakai; kalau tidak → `sbrk` minta blok baru ke kernel dan sambungkan ke ekor list.

---

## v4 — Coalesce: menyembuhkan fragmentation

Bayangkan kamu `free` tiga blok kecil yang **bersebelahan**. Sekarang ada tiga blok bebas mungil berderet. Lalu datang permintaan `malloc` yang besar — gagal, padahal total memori bebasnya cukup! Memori bebas itu ada, tapi **terpecah-pecah**. Inilah *external fragmentation*.

Obatnya: setiap kali `free`, **gabungkan blok-blok bebas yang bersebelahan** jadi satu blok besar.

```c
static void coalesce(void) {
    block_t *b = heap_head;
    while (b != NULL && b->next != NULL) {
        char *end_of_b = (char *)b + HEADER_SIZE + b->size;
        if (b->free && b->next->free && end_of_b == (char *)b->next) {
            b->size += HEADER_SIZE + b->next->size;  // serap blok berikutnya
            b->next  = b->next->next;                // header tetangga ikut jadi payload
            // jangan maju: coba gabung lagi dengan tetangga baru
        } else {
            b = b->next;
        }
    }
}
```

Catat syarat `end_of_b == (char *)b->next`: kita **cuma** menggabung kalau dua blok benar-benar **bersebelahan secara fisik** di memori. Ini penting — tanpa cek ini, kita bisa keliru "menyerap" memori milik orang lain. Saat dua blok digabung, header blok kedua **lenyap**, berubah jadi bagian payload — itulah kenapa hasil gabungan lebih besar dari sekadar penjumlahan dua payload (selisihnya = satu header).

---

## v5 — `calloc` & `realloc` (dan satu pelajaran keamanan)

`calloc(n, size)` = `malloc(n * size)` lalu **nolkan** isinya. Tapi ada jebakan klasik di `n * size`:

```c
void *my_calloc(size_t n, size_t size) {
    if (size != 0 && n > SIZE_MAX / size) return NULL;  // cegah overflow (Bab 21!)
    size_t total = n * size;
    void *p = my_malloc(total);
    if (p != NULL) memset(p, 0, total);
    return p;
}
```

Kenapa cek `n > SIZE_MAX / size`? Kalau `n * size` **overflow** (Bab 21), `total` jadi kecil — `malloc` mengalokasikan sedikit, tapi pemakai mengira punya banyak, lalu menulis melewati batas → **heap buffer overflow**. Ini bukan teori: bug seperti ini sudah jadi sumber banyak CVE. Allocator yang benar **wajib** menolak ukuran yang overflow. Inilah kenapa `calloc` ada terpisah dari `malloc` — dia tahu tentang perkalian `n * size` dan bisa menjaganya.

`realloc` menjaga isi lama: kalau blok sekarang sudah cukup besar, kembalikan apa adanya; kalau tidak, alokasikan baru, `memcpy` isi lama, lalu `free` yang lama. Penting: kalau alokasi baru gagal, blok lama **harus tetap valid** (jangan keburu di-`free`) — kontrak `realloc` yang sering dilanggar pemula.

---

## `heap_dump`: melihat semuanya bergerak

Inilah alat belajar paling berharga di proyek ini — fungsi yang mencetak seluruh daftar blok. Jalankan `make run` dan amati heap berubah:

```
== 1. Tiga alokasi berurutan (masing-masing 64 byte) ==
  [0] hdr=0x...000  size=  64  TERPAKAI  payload=0x...018
  [1] hdr=0x...058  size=  64  TERPAKAI  payload=0x...070
  [2] hdr=0x...0b0  size=  64  TERPAKAI  payload=0x...0c8
```
Tiga blok berderet. Perhatikan jarak antar-header = 88 byte = 64 (payload) + 24 (header). Itu HEADER_SIZE-nya.

```
== 2. Free blok tengah (b) ==
  [0] size=64  TERPAKAI
  [1] size=64  BEBAS        <- lubang di tengah
  [2] size=64  TERPAKAI
```
`my_free(b)` cuma membalik flag jadi BEBAS. Memorinya belum kemana-mana — cuma "ditandai bisa dipakai lagi".

```
== 3. my_malloc(16): pakai ulang lubang tadi, lalu SPLIT ==
  [0] size=64  TERPAKAI
  [1] size=16  TERPAKAI     <- 16 byte diambil dari lubang 64
  [2] size=24  BEBAS        <- 24 byte SISA hasil split (64-16-24header)
  [3] size=64  TERPAKAI
```
First-fit menemukan lubang 64-byte, mengambil 16, dan **men-split** sisanya jadi blok bebas 24-byte baru. Tidak ada `sbrk` sama sekali — murni daur ulang.

```
== 4. Free a, d, c -> COALESCE ==
  [0] size= 240  BEBAS      <- 4 blok bersebelahan menyatu jadi satu!
```
Setelah semua di-`free`, `coalesce` menggabung keempat blok bersebelahan jadi **satu** blok 240-byte. Tiga header yang tadi memisah ikut terserap jadi payload. Fragmentasi: sembuh.

---

## Hubungan dengan "tiga dosa memori" (Bab 9)

Sekarang setelah kamu tahu struktur internalnya, tiga dosa di Bab 9 jadi gamblang:

- **Memory leak** — kamu `malloc` tapi tak pernah `free`. Header-nya selamanya `free=0`; blok itu tak pernah masuk lagi ke daftar yang bisa dipakai ulang. Memori "bocor".
- **Use-after-free** — kamu pakai pointer setelah `free`. Tapi blok itu mungkin sudah di-split/di-pakai-ulang untuk alokasi lain! Kamu menimpa data orang lain. Lebih jahat lagi: `my_free` menulis ke header (`free=1`) — kalau kamu `free` pointer yang sudah salah, kamu merusak metadata allocator.
- **Double free** — `free` dua kali. Di allocator nyata ini bisa mengacak free list sampai bisa di-eksploit (Bab 21). Coba sendiri: apa yang terjadi pada `coalesce` kalau sebuah blok di-`free` dua kali?

Kamu baru saja melihat *kenapa* bug-bug ini begitu berbahaya — bukan cuma "jangan lakukan", tapi persis apa yang rusak di tingkat metadata.

---

## Build & jalankan

```sh
make run          # compile + jalankan demo
```

---

## Latihan: kembangkan allocator-mu

Dari mudah ke menantang:

1. **Statistik heap.** Tambah fungsi yang mengembalikan total byte terpakai, total bebas, dan jumlah blok. Cetak di akhir demo.
2. **Best-fit.** Ganti `find_free` jadi mencari blok bebas yang ukurannya **paling pas** (selisih terkecil), bukan yang pertama. Bandingkan fragmentation-nya dengan first-fit pakai pola alokasi yang sama.
3. **Deteksi double-free.** Di `my_free`, kalau `b->free` sudah `1`, cetak peringatan dan jangan lakukan apa-apa. Allocator beneran sering punya pengaman ini di mode debug.
4. **Magic number (deteksi corruption).** Tambah field `unsigned magic` di header, isi nilai tetap (mis. `0xDEADBEEF`) saat alokasi. Di `free`, cek nilainya — kalau salah, berarti pemakai menulis melewati batas (buffer overflow, Bab 21) dan merusak header. Ini ide di balik *guard*/*canary* allocator nyata.
5. **`mmap` untuk blok besar.** Allocator nyata (glibc) memakai `sbrk` untuk yang kecil tapi `mmap` langsung untuk alokasi besar (mis. > 128 KB). Tambahkan jalur itu, dan `munmap` saat di-`free`.
6. **Jadikan pengganti `malloc` betulan.** Ganti nama fungsi jadi `malloc`/`free`/`calloc`/`realloc`, compile jadi shared library (`-fPIC -shared`, Bab 11), lalu jalankan program lain dengan `LD_PRELOAD=./myalloc.so ./program`. Allocator-mu kini melayani program apa pun! (Hati-hati: jangan pakai `printf` di dalam allocator-mu saat di-preload — `printf` sendiri butuh `malloc`.)

---

## Pertanyaan refleksi

1. Kenapa header diletakkan **sebelum** payload, bukan disimpan di tabel terpisah? Apa untungnya untuk `free`?
2. Jelaskan dua trik pointer `(b + 1)` dan `(block_t *)ptr - 1`. Kenapa `b + 1` melompat 24 byte, bukan 1 byte?
3. Kapan `split_block` memutuskan **tidak** men-split? Kenapa men-split blok yang cuma sedikit lebih besar dari permintaan justru merugikan?
4. Apa beda *internal* dan *external fragmentation*? Mana yang diobati oleh split, mana oleh coalesce?
5. Kenapa `coalesce` wajib mengecek `end_of_b == b->next` (bersebelahan fisik)? Apa yang bisa rusak tanpa cek itu?
6. Kenapa `my_calloc` perlu cek overflow padahal `my_malloc` tidak? Skenario serangan apa yang dicegahnya (Bab 21)?
7. Kenapa `realloc` tak boleh men-`free` blok lama sebelum alokasi baru berhasil?
8. Bump allocator (v1) tak bisa memakai ulang memori, tapi dipakai sungguhan di tempat tertentu (mis. arena per-frame di game/compiler). Kenapa di sana itu justru pilihan bagus?

---

Setelah ini, `malloc` bukan lagi kotak hitam. Kamu tahu persis: ia sepetak memori dari kernel + sebuah buku catatan berbentuk linked list of headers. Proyek lanjutan yang bagus (lihat [index proyek](/tutorial/c-system-programming/23-proyek-praktik/) & Bab 22): **HTTP server mini** (socket, Bab 18) atau **interpreter ekspresi** (parsing + struct + allocator-mu sendiri!).
