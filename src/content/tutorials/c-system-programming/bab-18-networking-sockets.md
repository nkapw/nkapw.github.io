---
title: "Bab 18 - Networking Level Rendah dengan Socket"
description: "Pada bagian sebelumnya, program yang dibahas berjalan terutama di dalam satu mesin. Bab ini memperluas pembahasan ke komunikasi antarprogram melalui jaringan...."
tags: [c, systems-programming]
order: 18
updated: 2026-07-02
---
Pada bagian sebelumnya, program yang dibahas berjalan terutama di dalam satu mesin. Bab ini memperluas pembahasan ke komunikasi antarprogram melalui jaringan. Mekanisme ini menjadi dasar bagi web server, API, database jarak jauh, layanan internal, dan berbagai sistem terdistribusi.

Di UNIX dan Linux, socket direpresentasikan sebagai **file descriptor**. Setelah koneksi terbentuk, program dapat menggunakan `read` dan `write` pada socket seperti pada file atau pipe. Perbedaannya terletak pada proses pembuatan koneksi, pemilihan alamat, port, dan protokol jaringan.

Bab ini menghubungkan beberapa konsep sebelumnya, terutama file descriptor dari Bab 12, endianness dari Bab 2, layout struct dari Bab 8, error handling dari Bab 13, signal dari Bab 15, serta thread dan proses dari Bab 14 sampai Bab 17.

---

## 18.1 Konsep Dasar Jaringan

Beberapa konsep dasar perlu dipahami sebelum memakai socket.

**IP address** adalah alamat sebuah mesin di jaringan. Contohnya adalah `192.168.1.10` untuk IPv4. Alamat `127.0.0.1`, yang juga dikenal sebagai `localhost`, merujuk ke mesin yang sedang menjalankan program itu sendiri.

**Port** adalah angka dari 0 sampai 65535 yang mengidentifikasi layanan tertentu pada sebuah mesin. Satu mesin dapat menjalankan banyak layanan sekaligus, dan port membedakan layanan tersebut. Web server biasanya memakai port 80 untuk HTTP atau 443 untuk HTTPS, sedangkan SSH memakai port 22.

**Protokol** adalah aturan komunikasi yang digunakan oleh dua program. Dua protokol transport yang umum adalah TCP dan UDP.

| Aspek | **TCP** | **UDP** |
|-------|---------|---------|
| Model | Berbasis koneksi | Tanpa koneksi tetap |
| Keandalan | Data dijamin sampai, berurutan, dan tanpa duplikasi | Data dapat hilang, datang tidak berurutan, atau terduplikasi |
| Overhead | Lebih tinggi | Lebih rendah |
| Kegunaan umum | Web, email, file transfer, SSH | DNS, streaming, game, VoIP |

TCP mengurus retransmisi paket yang hilang, pengurutan ulang, dan kontrol aliran. Dengan TCP, program melihat data sebagai aliran byte yang andal. UDP memberi kontrol lebih besar kepada aplikasi, tetapi aplikasi harus menangani sendiri kehilangan paket, pengurutan, dan duplikasi bila hal itu penting.

Bab ini berfokus pada TCP karena lebih umum digunakan untuk komunikasi yang membutuhkan keandalan.

---

## 18.2 Socket sebagai Endpoint Komunikasi

**Socket** adalah endpoint komunikasi dua arah. Pada Linux dan UNIX, socket dibuat dengan fungsi `socket`.

```c
#include <sys/socket.h>

int sockfd = socket(AF_INET, SOCK_STREAM, 0);
```

`socket()` mengembalikan file descriptor, sama seperti `open()` saat membuka file. Nilai `-1` menunjukkan kegagalan.

Argumen penting pada contoh tersebut adalah sebagai berikut.

- **`AF_INET`** memilih address family IPv4. Untuk IPv6, gunakan `AF_INET6`.
- **`SOCK_STREAM`** memilih TCP sebagai aliran byte andal. Untuk UDP, gunakan `SOCK_DGRAM`.
- **`0`** meminta sistem memilih protokol default yang sesuai dengan address family dan tipe socket.

Setelah koneksi terbentuk, socket dapat digunakan dengan `read(sockfd, ...)` dan `write(sockfd, ...)`. Fungsi `recv` dan `send` juga tersedia untuk kebutuhan socket yang lebih spesifik. Abstraksi file descriptor membuat operasi I/O pada jaringan terasa dekat dengan operasi I/O pada file dan pipe.

---

## 18.3 Byte Order dan Endianness

Mesin yang berbeda dapat menyimpan byte dalam urutan yang berbeda. Perbedaan ini disebut **endianness**. Dalam komunikasi jaringan, angka seperti port dan alamat IP harus dikirim dalam format yang disepakati.

Standar jaringan menggunakan **network byte order**, yaitu big-endian. Karena itu, program perlu mengonversi angka dari host byte order ke network byte order sebelum mengirimnya, lalu mengonversinya kembali saat menerima.

```c
#include <arpa/inet.h>

uint16_t htons(uint16_t x);
uint32_t htonl(uint32_t x);
uint16_t ntohs(uint16_t x);
uint32_t ntohl(uint32_t x);
```

`htons` berarti host to network short dan biasanya dipakai untuk port. `htonl` berarti host to network long dan digunakan untuk nilai 32 bit seperti IPv4. Fungsi `ntohs` dan `ntohl` melakukan konversi sebaliknya.

Pada kode socket, port hampir selalu ditulis dengan `htons(port)`. Jika konversi ini dilupakan, program dapat mencoba memakai port yang salah pada mesin dengan endianness tertentu.

---

## 18.4 Model Client Server

Komunikasi TCP melibatkan dua peran.

- **Server** menunggu koneksi masuk pada alamat dan port tertentu.
- **Client** memulai koneksi ke alamat dan port server.

Urutan syscall pada server dan client berbeda.

```text
SERVER                          CLIENT
socket()    buat socket         socket()    buat socket
bind()      ikat ke port
listen()    mulai menerima koneksi
accept()    menunggu koneksi    connect()   menyambung ke server

koneksi terbentuk

read dan write                  write dan read
close                           close
```

Pada server, beberapa syscall utama yang digunakan adalah `bind`, `listen`, dan `accept`.

- **`bind(sockfd, addr, len)`** mengikat socket ke alamat dan port lokal tertentu.
- **`listen(sockfd, backlog)`** menandai socket sebagai socket pasif yang siap menerima koneksi. Nilai `backlog` menentukan ukuran antrian koneksi yang menunggu.
- **`accept(sockfd, ...)`** memblokir eksekusi sampai ada client yang terhubung, lalu mengembalikan file descriptor baru untuk koneksi tersebut.

File descriptor yang dikembalikan oleh `accept` digunakan untuk komunikasi dengan satu client. Socket asli tetap berada dalam mode listening dan dapat menerima koneksi berikutnya.

Pada client, urutannya lebih pendek. Program membuat socket dengan `socket()`, lalu memanggil `connect(sockfd, server_addr, len)` untuk menyambung ke server.

---

## 18.5 Server TCP Minimal

Contoh berikut adalah server TCP sederhana yang mengirim satu pesan ke setiap client, lalu menutup koneksi tersebut.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>

int main(void) {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd == -1) {
        perror("socket");
        return 1;
    }

    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(8080);

    if (bind(server_fd, (struct sockaddr *)&addr, sizeof(addr)) == -1) {
        perror("bind");
        return 1;
    }

    if (listen(server_fd, 5) == -1) {
        perror("listen");
        return 1;
    }

    printf("Server mendengar di port 8080\n");

    while (1) {
        struct sockaddr_in client;
        socklen_t clen = sizeof(client);
        int client_fd = accept(server_fd, (struct sockaddr *)&client, &clen);

        if (client_fd == -1) {
            perror("accept");
            continue;
        }

        char ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &client.sin_addr, ip, sizeof(ip));
        printf("Client terhubung dari %s\n", ip);

        const char *pesan = "Halo dari server\n";
        write(client_fd, pesan, strlen(pesan));

        close(client_fd);
    }

    close(server_fd);
    return 0;
}
```

Langkah pentingnya adalah sebagai berikut.

1. `socket` membuat socket TCP IPv4.
2. `setsockopt` dengan `SO_REUSEADDR` membantu server dapat dijalankan ulang tanpa menunggu port benar-benar bebas.
3. `bind` mengikat socket ke port 8080 pada semua interface lokal.
4. `listen` membuat socket siap menerima koneksi.
5. `accept` menunggu koneksi masuk dan menghasilkan file descriptor baru.
6. `write` mengirim byte ke client melalui file descriptor hasil `accept`.

`struct sockaddr_in` memuat address family, alamat IP, dan port. Field `sin_port` harus diisi dengan `htons(8080)` agar memakai network byte order.

Server dapat diuji dengan menjalankannya di satu terminal, lalu menjalankan perintah berikut di terminal lain.

```sh
nc localhost 8080
```

---

## 18.6 Client TCP Minimal

Contoh berikut adalah client TCP sederhana yang terhubung ke server pada `127.0.0.1` dan port 8080.

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>

int main(void) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == -1) {
        perror("socket");
        return 1;
    }

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(8080);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);

    if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) == -1) {
        perror("connect");
        return 1;
    }

    char buf[256];
    ssize_t n = read(sock, buf, sizeof(buf) - 1);
    if (n > 0) {
        buf[n] = '\0';
        printf("Server berkata %s", buf);
    }

    close(sock);
    return 0;
}
```

Jalankan server terlebih dahulu, lalu jalankan client. Client akan membaca pesan dari server melalui socket.

Data jaringan adalah byte mentah. Jika data akan diperlakukan sebagai string C, program harus menambahkan karakter null secara manual. Pada contoh di atas, hal itu dilakukan dengan `buf[n] = '\0'` sebelum isi buffer dicetak.

`inet_pton` mengubah alamat IP dalam bentuk teks menjadi bentuk biner yang dapat disimpan di `sin_addr`. Fungsi `inet_ntop` melakukan konversi sebaliknya dan digunakan pada contoh server.

---

## 18.7 TCP adalah Stream, Bukan Pesan

TCP menyajikan data sebagai aliran byte. Satu pemanggilan `write` pada pengirim tidak selalu berpasangan dengan satu pemanggilan `read` pada penerima.

Jika pengirim memanggil `write` dua kali secara berurutan, penerima dapat membacanya sebagai satu potongan data, beberapa potongan data, atau potongan dengan batas yang berbeda. TCP hanya menjamin urutan byte dan keandalan pengiriman, bukan batas pesan aplikasi.

Konsekuensi praktisnya adalah sebagai berikut.

1. `read` dapat mengembalikan jumlah byte yang lebih sedikit dari yang diminta.
2. Aplikasi perlu menentukan format pesan sendiri, misalnya dengan delimiter seperti newline atau dengan length prefix.

Pola berikut menunjukkan cara membaca sampai jumlah byte tertentu terkumpul.

```c
ssize_t total = 0;

while (total < perlu) {
    ssize_t n = read(sock, buf + total, perlu - total);
    if (n <= 0)
        break;
    total += n;
}
```

Nilai `0` dari `read` berarti ujung koneksi lain telah menutup koneksi. Nilai `-1` berarti terjadi error dan harus diperiksa melalui `errno`.

Hal lain yang perlu diperhatikan adalah `SIGPIPE`. Menulis ke socket yang sudah ditutup oleh ujung lain dapat memicu `SIGPIPE`, yang secara default menghentikan proses. Server jaringan biasanya mengabaikan `SIGPIPE` atau memakai `MSG_NOSIGNAL`, lalu menangani kegagalan melalui nilai balik `write` atau `send`.

---

## 18.8 Melayani Banyak Client

Server pada bagian 18.5 melayani satu client pada satu waktu. Setelah satu koneksi diterima, server mengirim pesan, menutup koneksi, lalu kembali ke `accept`.

Untuk melayani banyak client secara bersamaan, ada beberapa pendekatan umum.

1. **Satu proses atau thread per client**. Setelah `accept`, server membuat proses baru dengan `fork` atau thread baru dengan `pthread_create` untuk menangani client tersebut. Loop utama dapat kembali ke `accept` untuk menerima client berikutnya. Pendekatan ini mudah dipahami, tetapi dapat boros resource ketika jumlah client sangat besar.
2. **I/O multiplexing**. Fungsi seperti `select`, `poll`, atau `epoll` memungkinkan satu thread memantau banyak file descriptor sekaligus. Model ini banyak dipakai pada server berperforma tinggi karena dapat menangani banyak koneksi dengan jumlah thread yang lebih sedikit.

Pembahasan detail `epoll` berada di luar cakupan bab ini. Yang penting adalah memahami bahwa server jaringan yang melayani banyak client tetap dibangun di atas konsep file descriptor, blocking dan non-blocking I/O, serta event loop.

---

## 18.9 Rangkuman Model Mental

1. **Socket** adalah file descriptor untuk komunikasi jaringan.
2. Setelah koneksi terbentuk, `read` dan `write` pada socket bekerja seperti operasi I/O pada file descriptor lain.
3. **IP address** mengidentifikasi mesin, sedangkan **port** mengidentifikasi layanan pada mesin tersebut.
4. **TCP** memberi aliran byte yang andal dan berurutan, sedangkan **UDP** lebih ringan tetapi tidak memberi jaminan pengiriman.
5. **Network byte order** memakai big-endian. Gunakan `htons`, `htonl`, `ntohs`, dan `ntohl` untuk konversi angka yang dikirim melalui jaringan.
6. Server TCP memakai urutan `socket`, `bind`, `listen`, dan `accept`.
7. Client TCP memakai urutan `socket` dan `connect`.
8. `accept` mengembalikan file descriptor baru untuk koneksi client, sedangkan socket listening tetap dipakai untuk menerima koneksi berikutnya.
9. TCP adalah stream. Program tidak boleh menganggap satu `write` pasti diterima sebagai satu `read`.
10. Server multi-client dapat dibuat dengan proses, thread, atau I/O multiplexing.

---

## 18.10 Latihan dan Pertanyaan Refleksi

### Latihan Praktik

1. Jalankan server minimal dari bagian 18.5. Uji dengan `nc localhost 8080` dan pastikan pesan dari server muncul.
2. Tulis client minimal dari bagian 18.6 dan hubungkan ke server. Pastikan dua program dapat berkomunikasi.
3. Modifikasi server agar membaca pesan dari client, lalu mengirimkan kembali pesan yang sama sebagai echo server.
4. Modifikasi client agar mengirim string ke server dan mencetak balasan dari server.
5. Cetak hasil `htons(8080)` dan nilai `8080`. Jelaskan mengapa nilainya dapat berbeda pada mesin little-endian.
6. Demonstrasikan sifat TCP sebagai stream dengan mengirim dua `write` berurutan dari client, lalu membaca data di server dengan satu `read`.
7. Tulis fungsi pembacaan yang mengulang `read` sampai tepat N byte terkumpul.
8. Sebagai latihan lanjutan, buat server yang melayani banyak client dengan `fork` atau thread per koneksi.

### Pertanyaan Refleksi

1. Mengapa socket dapat diperlakukan sebagai file descriptor.
2. Apa perbedaan IP address dan port.
3. Kapan TCP lebih tepat digunakan daripada UDP.
4. Mengapa `htons` dan `htonl` diperlukan.
5. Apa urutan syscall utama pada server TCP.
6. Apa urutan syscall utama pada client TCP.
7. Mengapa `accept` mengembalikan file descriptor baru.
8. Apa arti pernyataan bahwa TCP adalah stream, bukan pesan.
9. Apa konsekuensi praktis dari partial read.
10. Apa dua pendekatan umum untuk membuat server melayani banyak client secara bersamaan.

---

Bab ini memperkenalkan socket sebagai dasar komunikasi jaringan pada C. Bab berikutnya membahas syscall secara lebih dalam, termasuk perbedaan user space dan kernel space, mekanisme mode switch, serta peran libc saat program memanggil fungsi seperti `read`, `write`, `open`, dan `socket`.

