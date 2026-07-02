---
title: "Bab 9 - Stack, Heap, dan Manajemen Memori Manual"
description: "Dalam C, pengelolaan memori adalah bagian langsung dari tanggung jawab programmer. Bahasa ini tidak menyediakan garbage collector yang otomatis membebaskan memori..."
tags: [c, systems-programming]
order: 9
updated: 2026-07-02
---
Dalam C, pengelolaan memori adalah bagian langsung dari tanggung jawab programmer. Bahasa ini tidak menyediakan *garbage collector* yang otomatis membebaskan memori yang tidak lagi digunakan. Setiap alokasi dinamis harus dirancang dengan jelas, digunakan dengan hati-hati, lalu dibebaskan pada waktu yang tepat.

Pada bab sebelumnya, sebagian besar data dibuat dengan ukuran yang sudah diketahui saat kode ditulis, misalnya `int x`, `int arr[5]`, atau sebuah `struct`. Dalam program nyata, ukuran data sering baru diketahui saat program berjalan. Program dapat membaca file dengan jumlah baris yang tidak pasti, menerima masukan pengguna dengan panjang berbeda, atau mengelola koneksi yang jumlahnya berubah selama proses berjalan.

Kondisi seperti itu membutuhkan alokasi memori dinamis. Di C, alokasi ini dilakukan melalui heap dengan fungsi seperti `malloc`, `calloc`, `realloc`, dan `free`.

---

## 9.1 Peta Memori Program

Saat program berjalan, sistem operasi menyediakan ruang memori virtual untuk proses tersebut. Ruang ini biasanya dibagi menjadi beberapa wilayah utama.

```
Alamat tinggi
        +--------------------------+
        |        STACK             |  <- variabel lokal, parameter, return address
        |    tumbuh ke bawah       |
        |           |              |
        |           v              |
        |                          |
        |    ruang kosong          |
        |                          |
        |           ^              |
        |           |              |
        |        HEAP              |  <- memori dinamis
        |    tumbuh ke atas        |
        +--------------------------+
        |   BSS                    |  <- global dan static tanpa nilai awal
        +--------------------------+
        |   DATA                   |  <- global dan static dengan nilai awal
        +--------------------------+
        |   TEXT / CODE            |  <- instruksi program dan string literal
        +--------------------------+
Alamat rendah
```

Wilayah utama memori program dapat dipahami sebagai berikut.

- **Text atau Code** berisi instruksi program hasil kompilasi. Wilayah ini umumnya bersifat hanya-baca. String literal seperti `"Halo"` juga dapat berada di wilayah ini, sehingga mengubah isi string literal melalui pointer menghasilkan perilaku tidak terdefinisi.
- **Data dan BSS** berisi variabel global dan `static`. Data digunakan untuk variabel yang memiliki nilai awal, sedangkan BSS digunakan untuk variabel yang tidak diberi nilai awal dan akan diisi nol.
- **Heap** digunakan untuk memori dinamis yang dialokasikan saat program berjalan. Memori di heap dikelola secara manual oleh programmer.
- **Stack** digunakan untuk frame fungsi, parameter, alamat kembali, dan variabel lokal. Memori stack dikelola otomatis ketika fungsi dipanggil dan selesai.

Stack dan heap biasanya digambarkan tumbuh dari arah yang berlawanan. Model ini berguna untuk memahami konsep dasar, walaupun implementasi sistem operasi modern dapat lebih kompleks karena adanya memori virtual, proteksi halaman, dan strategi alokasi yang berbeda.

---

## 9.2 Mengapa Heap Diperlukan

Stack sangat cepat dan sederhana, tetapi memiliki batasan penting.

1. **Umur data terikat pada fungsi.** Variabel lokal tidak lagi valid setelah fungsi selesai. Jika sebuah data harus tetap hidup setelah fungsi mengembalikan nilai, data tersebut tidak boleh disimpan sebagai variabel lokal biasa.
2. **Ukuran stack terbatas.** Stack biasanya jauh lebih kecil daripada total memori yang tersedia. Array besar di stack dapat menyebabkan *stack overflow*.
3. **Ukuran data sering baru diketahui saat runtime.** Program sering membutuhkan jumlah elemen yang bergantung pada masukan pengguna, ukuran file, atau kondisi yang baru muncul saat program berjalan.

Heap menyelesaikan masalah tersebut dengan memberi ruang memori yang dapat dialokasikan secara dinamis dan tetap hidup sampai dibebaskan secara eksplisit.

| Aspek | Stack | Heap |
|---|---|---|
| Alokasi | Otomatis saat fungsi berjalan | Manual dengan `malloc`, `calloc`, atau `realloc` |
| Pembebasan | Otomatis saat fungsi selesai | Manual dengan `free` |
| Umur data | Selama frame fungsi masih aktif | Sampai dibebaskan dengan `free` |
| Ukuran | Terbatas dan biasanya kecil | Lebih besar dan fleksibel |
| Kecepatan | Sangat cepat | Lebih lambat karena dikelola allocator |

Heap memberi fleksibilitas, tetapi juga menambah tanggung jawab. Kesalahan kecil dalam pengelolaan heap dapat menyebabkan *memory leak*, korupsi memori, *use-after-free*, atau *crash* yang sulit dilacak.

---

## 9.3 `malloc` dan `free`

Fungsi dasar untuk alokasi dan pembebasan memori berada di `<stdlib.h>`.

```c
void *malloc(size_t size);
void  free(void *ptr);
```

`malloc` meminta sejumlah byte dari heap dan mengembalikan pointer ke awal blok memori tersebut. Jika alokasi gagal, `malloc` mengembalikan `NULL`.

`free` mengembalikan blok memori yang sebelumnya diperoleh dari fungsi alokasi dinamis. Pointer yang diberikan ke `free` harus pointer yang valid dan berasal dari alokasi yang sesuai.

Contoh alokasi satu `int` di heap.

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof(int));
    if (p == NULL) {
        fprintf(stderr, "alokasi gagal\n");
        return 1;
    }

    *p = 42;
    printf("%d\n", *p);

    free(p);
    p = NULL;
    return 0;
}
```

Beberapa hal penting perlu diperhatikan.

- Gunakan `sizeof` saat menentukan ukuran alokasi. Hindari menulis angka ukuran tipe secara langsung karena ukuran tipe dapat berbeda antarplatform.
- Selalu periksa apakah hasil `malloc` bernilai `NULL`. Mengakses pointer `NULL` menyebabkan perilaku tidak terdefinisi dan biasanya membuat program berhenti.
- Setiap blok yang berhasil dialokasikan harus dibebaskan dengan `free` tepat satu kali.
- Setelah `free(p)`, mengisi `p` dengan `NULL` membantu mencegah penggunaan pointer lama secara tidak sengaja.

Di C, hasil `malloc` bertipe `void *`. Pointer ini dapat dikonversi otomatis ke tipe pointer lain, sehingga cast eksplisit tidak diperlukan dalam kode C.

---

## 9.4 Alokasi Array dengan Ukuran Runtime

Salah satu penggunaan paling umum heap adalah membuat array yang ukurannya baru diketahui saat program berjalan.

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n;

    printf("Berapa banyak angka? ");
    if (scanf("%d", &n) != 1 || n <= 0) {
        fprintf(stderr, "masukan tidak valid\n");
        return 1;
    }

    int *arr = malloc((size_t)n * sizeof(int));
    if (arr == NULL) {
        fprintf(stderr, "alokasi gagal\n");
        return 1;
    }

    for (int i = 0; i < n; i++) {
        arr[i] = i * i;
    }

    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");

    free(arr);
    return 0;
}
```

Setelah alokasi berhasil, `arr` dapat digunakan seperti array biasa. Ekspresi `arr[i]` tetap setara dengan `*(arr + i)`. Perbedaannya terletak pada lokasi dan tanggung jawab pengelolaan memori. Blok tersebut berada di heap dan harus dibebaskan secara manual.

Perhatikan risiko overflow pada perhitungan ukuran. Ekspresi `n * sizeof(int)` dapat overflow jika `n` sangat besar. Jika overflow terjadi, program dapat mengalokasikan blok yang lebih kecil dari kebutuhan sebenarnya, lalu menulis melewati batas blok. Untuk alokasi array, `calloc` sering lebih aman karena menerima jumlah elemen dan ukuran elemen secara terpisah.

---

## 9.5 `calloc` dan `realloc`

Selain `malloc`, C menyediakan fungsi alokasi lain yang penting.

```c
void *calloc(size_t jumlah, size_t ukuran);
void *realloc(void *ptr, size_t ukuran_baru);
```

`calloc` mengalokasikan ruang untuk sejumlah elemen dan mengisi seluruh byte dengan nilai nol.

```c
int *arr = calloc((size_t)n, sizeof(int));
```

Berbeda dari `calloc`, memori dari `malloc` tidak otomatis berisi nol. Isinya tidak terdefinisi sampai program menuliskan nilai ke dalamnya. Membaca memori hasil `malloc` sebelum diinisialisasi adalah bug.

`realloc` digunakan untuk mengubah ukuran blok yang sudah dialokasikan. Fungsi ini dapat memperbesar blok di tempat yang sama, atau memindahkan isi lama ke blok baru lalu membebaskan blok lama.

Contoh dynamic array sederhana.

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int kapasitas = 2;
    int jumlah = 0;
    int *arr = malloc((size_t)kapasitas * sizeof(int));

    if (arr == NULL) {
        fprintf(stderr, "alokasi gagal\n");
        return 1;
    }

    for (int x = 1; x <= 5; x++) {
        if (jumlah == kapasitas) {
            kapasitas *= 2;

            int *baru = realloc(arr, (size_t)kapasitas * sizeof(int));
            if (baru == NULL) {
                free(arr);
                return 1;
            }

            arr = baru;
        }

        arr[jumlah++] = x;
    }

    for (int i = 0; i < jumlah; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");

    free(arr);
    return 0;
}
```

Jangan langsung menulis `arr = realloc(arr, ukuran_baru)`. Jika `realloc` gagal, fungsi ini mengembalikan `NULL` dan blok lama tetap valid. Jika hasilnya langsung ditimpa ke `arr`, pointer lama hilang dan memori tersebut tidak dapat dibebaskan. Gunakan variabel sementara seperti `baru`.

Setelah `realloc` berhasil, alamat blok dapat berubah. Semua akses berikutnya harus menggunakan pointer baru.

---

## 9.6 Cara Kerja Allocator

`malloc` bukan system call langsung. Fungsi ini disediakan oleh C standard library. Di balik pemanggilan `malloc`, library menggunakan allocator untuk mengelola wilayah heap di user space.

Allocator biasanya meminta wilayah memori yang lebih besar dari kernel menggunakan mekanisme seperti `brk`, `sbrk`, atau `mmap`. Setelah wilayah tersebut tersedia, allocator membaginya menjadi blok-blok yang lebih kecil sesuai permintaan program.

Pendekatan ini mengurangi jumlah pemanggilan ke kernel. Pemanggilan kernel relatif mahal, sehingga allocator tidak meminta memori ke kernel untuk setiap alokasi kecil.

### Metadata Blok

`free(p)` hanya menerima pointer, tetapi tetap dapat mengetahui ukuran blok yang harus dibebaskan. Hal ini terjadi karena allocator menyimpan metadata untuk setiap blok alokasi.

Metadata biasanya diletakkan di dekat blok yang diberikan ke program. Metadata dapat menyimpan ukuran blok, status blok, dan informasi internal lain yang diperlukan allocator.

```
   metadata internal        blok yang digunakan program
 +------------------+--------------------------------+
 | ukuran dan flag  | data yang diakses melalui p    |
 +------------------+--------------------------------+
                    ^
                    p
```

Konsekuensinya penting.

1. Menulis melewati batas blok heap dapat merusak metadata atau blok lain. Kesalahan ini dapat menyebabkan crash, data rusak, atau celah keamanan.
2. Pointer yang diberikan ke `free` harus persis pointer yang dikembalikan oleh fungsi alokasi. Memanggil `free(p + 1)` atau `free` pada pointer yang bukan hasil alokasi dinamis adalah kesalahan serius.

### Free List dan Fragmentation

Saat `free` dipanggil, allocator tidak selalu langsung mengembalikan memori ke kernel. Blok tersebut biasanya ditandai sebagai bebas dan dapat digunakan kembali oleh alokasi berikutnya.

Seiring waktu, heap dapat memiliki banyak blok kosong dengan ukuran berbeda. Total ruang kosong mungkin cukup besar, tetapi terpecah menjadi bagian-bagian kecil yang tidak sesuai dengan permintaan alokasi tertentu. Kondisi ini disebut *fragmentation*.

Allocator modern seperti glibc malloc, jemalloc, dan tcmalloc memiliki strategi untuk mengurangi fragmentation. Namun, pola alokasi program tetap memengaruhi efisiensi penggunaan memori.

---

## 9.7 Kesalahan Umum dalam Manajemen Memori

### Memory Leak

*Memory leak* terjadi ketika program mengalokasikan memori tetapi tidak pernah membebaskannya.

```c
void bocor(void) {
    int *p = malloc(1000);
    if (p == NULL) {
        return;
    }

    /* p tidak dibebaskan sebelum fungsi selesai */
}
```

Saat fungsi selesai, variabel lokal `p` hilang. Jika tidak ada pointer lain yang menyimpan alamat blok tersebut, program tidak lagi dapat memanggil `free` untuk blok itu.

Pada program kecil yang segera selesai, leak kecil mungkin tidak terlihat karena sistem operasi membersihkan memori proses saat program berakhir. Pada program yang berjalan lama seperti server, daemon, atau aplikasi GUI, leak dapat terus bertambah sampai memori habis.

### Dangling Pointer dan Use-After-Free

*Dangling pointer* adalah pointer yang masih menyimpan alamat memori yang tidak lagi valid. Salah satu penyebab paling umum adalah menggunakan pointer setelah `free`.

```c
int *p = malloc(sizeof(int));
if (p == NULL) {
    return 1;
}

*p = 5;
free(p);

printf("%d\n", *p);
*p = 10;
```

Setelah `free(p)`, blok memori tersebut tidak lagi menjadi milik program pada level logika alokasi. Allocator dapat memberikannya lagi untuk alokasi lain. Membaca atau menulis melalui `p` setelah `free` adalah perilaku tidak terdefinisi.

Praktik yang umum digunakan adalah mengisi pointer dengan `NULL` setelah `free`.

```c
free(p);
p = NULL;
```

Dengan begitu, penggunaan tidak sengaja lebih mudah terdeteksi karena akses melalui `NULL` biasanya langsung gagal, sementara akses melalui dangling pointer dapat merusak data secara diam-diam.

### Double Free

*Double free* terjadi ketika pointer yang sama dibebaskan lebih dari satu kali.

```c
free(p);
free(p);
```

Kesalahan ini dapat merusak struktur internal allocator. Dampaknya dapat berupa crash, korupsi memori, atau celah keamanan.

`free(NULL)` aman dan tidak melakukan apa pun. Karena itu, mengisi pointer dengan `NULL` setelah `free` dapat membantu mencegah double free pada pointer yang sama.

Aturan praktis yang perlu diterapkan.

1. Setiap alokasi yang berhasil harus memiliki satu jalur pembebasan yang jelas.
2. Jangan menggunakan pointer setelah bloknya dibebaskan.
3. Jangan membebaskan pointer yang sama lebih dari sekali.
4. Gunakan Valgrind atau AddressSanitizer saat pengembangan untuk mendeteksi leak, use-after-free, double free, dan overflow.

---

## 9.8 Mengembalikan Memori dari Fungsi

Mengembalikan alamat variabel lokal adalah kesalahan karena variabel tersebut tidak lagi valid setelah fungsi selesai.

```c
int *salah(void) {
    int x = 42;
    return &x;
}
```

Jika data harus tetap hidup setelah fungsi selesai, alokasikan data tersebut di heap.

```c
#include <stdlib.h>

int *benar(void) {
    int *p = malloc(sizeof(int));
    if (p != NULL) {
        *p = 42;
    }

    return p;
}
```

Fungsi di atas mengembalikan pointer ke memori heap. Pemanggil harus memeriksa apakah hasilnya `NULL`, menggunakan nilainya, lalu membebaskannya dengan `free`.

```c
int *nilai = benar();
if (nilai == NULL) {
    return 1;
}

printf("%d\n", *nilai);
free(nilai);
nilai = NULL;
```

Hal ini berkaitan dengan ownership. Dalam C, ownership berarti kejelasan tentang siapa yang bertanggung jawab membebaskan memori. Jika sebuah fungsi mengembalikan pointer hasil alokasi, dokumentasi fungsi harus menyatakan bahwa pemanggil wajib membebaskan hasil tersebut.

Library C yang baik biasanya menyediakan kontrak yang jelas. Ada fungsi yang mengembalikan pointer yang tidak boleh dibebaskan oleh pemanggil, dan ada fungsi yang mengembalikan memori baru yang harus dibebaskan dengan `free` atau fungsi khusus seperti `xxx_free`.

---

## 9.9 Linked List dengan Alokasi Heap

Heap memungkinkan struktur data yang jumlah elemennya dapat berubah saat program berjalan. Contoh dasar yang penting adalah singly linked list.

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

Node *buat_node(int data) {
    Node *n = malloc(sizeof(Node));
    if (n == NULL) {
        return NULL;
    }

    n->data = data;
    n->next = NULL;
    return n;
}

Node *push_depan(Node *head, int data) {
    Node *n = buat_node(data);
    if (n == NULL) {
        return head;
    }

    n->next = head;
    return n;
}

void cetak(Node *head) {
    for (Node *cur = head; cur != NULL; cur = cur->next) {
        printf("%d -> ", cur->data);
    }
    printf("NULL\n");
}

void hapus_semua(Node *head) {
    Node *cur = head;

    while (cur != NULL) {
        Node *berikut = cur->next;
        free(cur);
        cur = berikut;
    }
}

int main(void) {
    Node *head = NULL;

    head = push_depan(head, 30);
    head = push_depan(head, 20);
    head = push_depan(head, 10);

    cetak(head);

    hapus_semua(head);
    head = NULL;
    return 0;
}
```

Setiap node dialokasikan secara terpisah di heap. Node-node tersebut tidak harus berada bersebelahan di memori. Hubungan antar-node dibentuk melalui pointer `next`.

Fungsi `hapus_semua` harus membebaskan setiap node. Nilai `cur->next` disimpan lebih dahulu sebelum `free(cur)` dipanggil, karena setelah `cur` dibebaskan, membaca `cur->next` tidak lagi valid.

Tanpa `hapus_semua`, seluruh node yang sudah dialokasikan akan menjadi leak. Gunakan Valgrind atau AddressSanitizer untuk memeriksa bahwa seluruh node sudah dibebaskan dengan benar.

---

## 9.10 Rangkuman Model Mental

1. Memori program umumnya terdiri dari text, data, BSS, heap, dan stack.
2. Stack digunakan untuk data lokal yang umurnya mengikuti pemanggilan fungsi.
3. Heap digunakan ketika ukuran data baru diketahui saat runtime atau ketika data harus hidup melampaui satu fungsi.
4. `malloc` mengalokasikan byte tanpa inisialisasi, sedangkan `calloc` mengalokasikan dan mengisi byte dengan nol.
5. `realloc` mengubah ukuran blok dan dapat memindahkan blok ke alamat baru.
6. Setiap alokasi yang berhasil harus dibebaskan dengan tepat satu `free`.
7. Kesalahan umum dalam manajemen memori meliputi memory leak, use-after-free, dan double free.
8. Ownership harus jelas ketika pointer hasil alokasi berpindah dari satu fungsi ke fungsi lain.
9. Struktur data dinamis seperti linked list dibangun dengan node yang dialokasikan di heap dan dihubungkan melalui pointer.

---

## 9.11 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Alokasikan satu `int` dengan `malloc`, isi nilainya, cetak, lalu bebaskan dengan `free`. Tambahkan pengecekan `NULL`.
2. Minta nilai `n` dari pengguna, alokasikan array `int` sebesar `n`, isi dengan kuadrat indeks, cetak, lalu bebaskan.
3. Bandingkan hasil penggunaan `malloc(10 * sizeof(int))` dan `calloc(10, sizeof(int))`. Perhatikan perbedaan nilai awalnya.
4. Buat dynamic array yang tumbuh menggunakan `realloc`. Gunakan strategi kapasitas yang digandakan ketika array penuh.
5. Buat contoh use-after-free secara sengaja, lalu jalankan dengan AddressSanitizer untuk melihat laporan kesalahannya.
6. Buat contoh double free, lalu ubah kode dengan menambahkan `p = NULL` setelah `free` pertama.
7. Lengkapi linked list dengan fungsi `push_belakang`, `hapus_nilai`, dan `panjang`.
8. Tulis fungsi `char *gabung(const char *a, const char *b)` yang mengalokasikan string baru berisi gabungan dua string. Pastikan dokumentasi fungsi menjelaskan bahwa pemanggil wajib membebaskan hasilnya.

### Pertanyaan Refleksi

1. Apa saja wilayah utama memori program dan apa isi masing-masing wilayah.
2. Mengapa heap tetap diperlukan meskipun stack sudah tersedia.
3. Apa yang harus dilakukan setelah `malloc` mengembalikan `NULL`.
4. Mengapa `free(p)` dapat membebaskan blok tanpa menerima ukuran blok sebagai argumen.
5. Apa peran allocator dalam hubungan antara program dan kernel.
6. Apa perbedaan memory leak, use-after-free, dan double free.
7. Mengapa ownership penting dalam fungsi yang mengembalikan pointer.
8. Mengapa `hapus_semua` harus menyimpan `cur->next` sebelum memanggil `free(cur)`.

---

Setelah memahami stack, heap, dan pengelolaan memori manual, Anda sudah memiliki dasar penting untuk menulis program C yang lebih realistis. Bab berikutnya membahas preprocessor dan build system, termasuk `#define`, macro, conditional compilation, header guard, dan penggunaan `Makefile`.

