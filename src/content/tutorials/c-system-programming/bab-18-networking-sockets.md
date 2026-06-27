---
title: "Bab 18 — Networking Level Rendah (Sockets)"
description: "Kita masuk BAGIAN V. Sampai sekarang program kita hidup dalam satu mesin. Sekarang kita keluar dari batas itu: bagaimana program berbicara dengan program lain lewat..."
tags: [c, system-programming]
order: 18
updated: 2026-06-20
---

> "Socket itu file descriptor yang ujung satunya bisa berada di komputer lain. Kamu `write` ke sana, byte-nya dikirim ke mesin tujuan. Kamu `read` darinya, byte dari mesin lain masuk ke programmu."

Kita masuk BAGIAN V. Sampai sekarang program kita hidup dalam satu mesin. Sekarang kita keluar dari batas itu: bagaimana program berbicara dengan program lain **lewat jaringan**, baik di mesin yang sama maupun di mesin lain. Konsep ini menjadi dasar web, email, game online, API, dan database jarak jauh.

Banyak fondasinya sudah kamu punya. Ingat "everything is a file" dari Bab 12? **Socket adalah file descriptor**. Begitu koneksi terbentuk, kamu bisa `read`/`write` ke socket seperti ke file atau pipe. Bagian barunya adalah cara *membentuk* koneksi itu. Bab ini menyatukan file descriptor (Bab 12), endianness (Bab 2), dan model client-server.

---

## 18.1 Sedikit konteks: bagaimana jaringan bekerja (secukupnya)

Kamu tidak perlu menjadi ahli jaringan untuk memakai socket, tetapi beberapa konsep dasar perlu jelas lebih dulu.

**IP address** adalah alamat sebuah mesin di jaringan, misalnya `192.168.1.10` untuk IPv4 atau `::1` untuk IPv6. Anggap saja seperti alamat rumah. `127.0.0.1` (alias `localhost`) adalah alamat khusus yang berarti "mesin ini sendiri".

**Port** adalah angka (0-65535) yang mengidentifikasi *aplikasi/layanan* tertentu di dalam satu mesin. Satu mesin bisa menjalankan banyak layanan; port membedakannya. Misalnya, web server biasanya memakai port 80 (HTTP) atau 443 (HTTPS), sedangkan SSH memakai port 22. Kalau IP address adalah alamat gedung apartemen, port adalah nomor unit di dalamnya. Untuk mengirim data ke layanan tertentu, kamu butuh keduanya: IP + port.

**Protokol** adalah aturan komunikasi. Dua protokol fundamental yang perlu kamu kenal adalah TCP dan UDP.

| | **TCP** | **UDP** |
|---|---------|---------|
| Jenis | connection-oriented (ada "sambungan") | connectionless (kirim lepas) |
| Keandalan | **andal**: data dijamin sampai, urut, tanpa duplikat | **tak dijamin**: bisa hilang, tak urut |
| Analogi | telepon (sambung dulu, bicara, tutup) | kartu pos (kirim, harap sampai) |
| Overhead | lebih tinggi | rendah, cepat |
| Untuk | web, email, file transfer, SSH | streaming, game, DNS, VoIP |

TCP menjamin bahwa kalau kamu mengirim "ABCD", penerima mendapatkan "ABCD" secara utuh, berurutan, dan tanpa duplikasi. Di baliknya, TCP mengurus retransmisi paket yang hilang, pengurutan ulang, dan detail lain yang cukup kompleks tetapi tersembunyi dari programmu. UDP tidak memberi jaminan itu; sebagai gantinya, overhead-nya lebih rendah. Bab ini fokus ke TCP karena paling umum dan paling instruktif untuk mempelajari socket.

---

## 18.2 Socket = endpoint komunikasi (yang berupa fd)

**Socket** adalah satu "ujung" (endpoint) dari saluran komunikasi dua arah. Untuk membuatnya, panggil `socket()`:

```c
#include <sys/socket.h>
int sockfd = socket(AF_INET, SOCK_STREAM, 0);
//                   ^^^^^^^  ^^^^^^^^^^^
//                   IPv4     TCP (stream)
```

`socket()` mengembalikan sebuah **file descriptor** (Bab 12), sama jenisnya dengan fd dari `open`. Argumennya adalah:
- **`AF_INET`** — address family IPv4 (`AF_INET6` untuk IPv6).
- **`SOCK_STREAM`** — TCP (aliran byte andal). `SOCK_DGRAM` untuk UDP.
- Return `-1` kalau gagal (konvensi syscall, Bab 13).

Inti model mentalnya: **setelah koneksi terbentuk, socket itu fd biasa.** Kamu memakai `read(sockfd, ...)` dan `write(sockfd, ...)` (atau `recv`/`send` yang mirip) seperti pada file atau pipe. Abstraksi UNIX menyamakan jaringan, file, dan pipe sebagai aliran byte lewat fd. Yang membedakan socket adalah cara menyiapkan dan menyambungkan endpoint-nya.

---

## 18.3 Byte order: endianness datang menagih (Bab 2)

Sebelum masuk ke kode, ada satu jebakan penting dari Bab 2: **endianness**. Urutan byte di memori bisa berbeda antar mesin (little endian vs big endian). Dalam jaringan, mesin pengirim dan penerima bisa memiliki endianness yang berbeda. Kalau kamu mengirim angka port `8080` apa adanya, mesin lain bisa membacanya sebagai angka yang berbeda.

Solusinya, jaringan memakai standar baku: **"network byte order" = big-endian.** Sebelum mengirim angka seperti port atau IP, konversi dari host byte order ke network byte order. Saat menerima, lakukan konversi sebaliknya.

```c
#include <arpa/inet.h>
uint16_t htons(uint16_t x);   // Host TO Network Short (16-bit, mis. port)
uint32_t htonl(uint32_t x);   // Host TO Network Long  (32-bit, mis. IP)
uint16_t ntohs(uint16_t x);   // Network TO Host Short
uint32_t ntohl(uint32_t x);   // Network TO Host Long
```

Kamu akan sering melihat `htons(8080)` di kode socket. Fungsi itu mengubah port ke network byte order. Kalau konversi ini lupa dilakukan, koneksi bisa diarahkan ke port yang salah dan bug-nya terlihat membingungkan. Di sini endianness dari Bab 2 muncul sebagai kebutuhan praktis, bukan sekadar detail representasi memori.

---

## 18.4 Model client-server

Komunikasi TCP punya dua peran asimetris:

- **Server** — menunggu (listen) di sebuah port dan menerima koneksi yang masuk. Perannya pasif, seperti restoran yang buka dan menunggu pelanggan.
- **Client** — memulai koneksi ke server pada IP:port tertentu. Perannya aktif, seperti pelanggan yang datang ke restoran.

Tiap peran punya urutan syscall yang berbeda:

```
SERVER                          CLIENT
socket()    buat socket         socket()    buat socket
bind()      ikat ke port
listen()    mulai mendengar
accept()    <--- tunggu ------  connect()   sambung ke server
        (koneksi terbentuk)
read()/write() <--- data ---->  write()/read()
close()                         close()
```

Mari bedah syscall di sisi server, karena urutannya lebih banyak.

- **`bind(sockfd, addr, len)`** mengikat socket ke alamat dan port tertentu di mesin lokal, misalnya "aku akan melayani di port 8080". Di sinilah `htons(port)` dipakai.
- **`listen(sockfd, backlog)`** menandai socket sebagai pasif/listening, siap menerima koneksi. `backlog` adalah panjang antrian koneksi yang menunggu di-accept.
- **`accept(sockfd, ...)`** **memblokir** sampai ada client connect, lalu mengembalikan **fd baru** khusus untuk koneksi itu. Penting: `accept` mengembalikan fd terpisah; socket asli (`sockfd`) tetap mendengar untuk koneksi berikutnya. Inilah cara server melayani banyak client.

Client lebih sederhana: `socket()` lalu `connect(sockfd, server_addr, len)`, yang memblokir sampai tersambung atau gagal.

---

## 18.5 Server TCP minimal

Berikut contoh lengkap server yang mengirim satu pesan ke tiap client lalu menutup koneksi. Kodenya agak panjang karena API networking memang verbose, tetapi tiap langkah punya peran yang jelas.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>      // sockaddr_in, htons, inet_ntop

int main(void) {
    // 1. Buat socket (TCP/IPv4)
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd == -1) { perror("socket"); return 1; }

    // (opsional tapi umum) izinkan reuse port cepat setelah restart
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    // 2. Siapkan alamat: port 8080, terima dari semua interface
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;       // semua IP lokal
    addr.sin_port = htons(8080);             // <- network byte order (Bab 2!)

    // 3. Ikat socket ke port itu
    if (bind(server_fd, (struct sockaddr *)&addr, sizeof(addr)) == -1) {
        perror("bind"); return 1;
    }

    // 4. Mulai mendengar
    if (listen(server_fd, 5) == -1) { perror("listen"); return 1; }
    printf("Server mendengar di port 8080...\n");

    // 5. Loop melayani client
    while (1) {
        struct sockaddr_in client;
        socklen_t clen = sizeof(client);
        int client_fd = accept(server_fd, (struct sockaddr *)&client, &clen);
        if (client_fd == -1) { perror("accept"); continue; }

        // tampilkan IP client
        char ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &client.sin_addr, ip, sizeof(ip));
        printf("Client terhubung dari %s\n", ip);

        // 6. Kirim pesan — write ke fd, seperti file biasa!
        const char *pesan = "Halo dari server!\n";
        write(client_fd, pesan, strlen(pesan));

        close(client_fd);    // tutup koneksi ini; server_fd tetap mendengar
    }
    close(server_fd);
    return 0;
}
```

Perhatikan langkah 6: `write(client_fd, ...)` **sama seperti menulis ke file** (Bab 12). Itulah inti "socket = fd". Semua kerumitan di langkah 1-5 adalah untuk *membentuk* koneksi; setelah koneksi terbentuk, operasi I/O-nya sudah familiar.

`struct sockaddr_in` adalah struct (Bab 8) yang memuat alamat: family, IP (`sin_addr`), dan port (`sin_port`). Layout-nya baku. Ini berkaitan dengan pembahasan Bab 8 tentang pentingnya memory layout struct untuk protokol.

Tes server ini tanpa menulis client: jalankan, lalu di terminal lain ketik `nc localhost 8080` (netcat) atau `curl localhost:8080` — kamu akan lihat pesannya.

---

## 18.6 Client TCP minimal

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>

int main(void) {
    // 1. Buat socket
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == -1) { perror("socket"); return 1; }

    // 2. Siapkan alamat server: localhost:8080
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(8080);                       // network byte order
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);   // ubah string IP -> biner

    // 3. Sambung ke server
    if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) == -1) {
        perror("connect"); return 1;
    }

    // 4. Baca pesan dari server — read dari fd, seperti file biasa!
    char buf[256];
    ssize_t n = read(sock, buf, sizeof(buf) - 1);
    if (n > 0) {
        buf[n] = '\0';                  // null-terminate (Bab 5!) sebelum cetak sebagai string
        printf("Server berkata: %s", buf);
    }

    close(sock);
    return 0;
}
```

Jalankan server dulu (Section 18.5), lalu jalankan client ini. Client akan mencetak pesan dari server. Dengan dua program kecil ini, kamu sudah melihat komunikasi jaringan paling dasar: satu program menunggu koneksi, program lain menyambung, lalu byte dikirim lewat socket.

Perhatikan langkah 4: `read(sock, ...)` lalu `buf[n] = '\0'`. Kita harus null-terminate sendiri (Bab 5) karena data jaringan adalah **byte mentah**; tidak ada `'\0'` otomatis. `inet_pton` (presentation to network) mengubah string IP `"127.0.0.1"` menjadi bentuk biner, sedangkan `inet_ntop` (Section 18.5) melakukan kebalikannya.

---

## 18.7 Jebakan penting: TCP itu STREAM, bukan pesan

Ini salah satu kesalahpahaman paling umum saat mulai belajar networking, dan ia menghubungkan banyak konsep dari bab sebelumnya.

> **TCP adalah aliran byte (stream), BUKAN aliran pesan.** Satu `write` di pengirim **tidak** sama dengan satu `read` di penerima. Byte bisa "menyatu" atau "terpecah" di jalan.

Kalau pengirim melakukan `write("Halo")` lalu `write("Dunia")`, penerima mungkin membacanya sebagai satu `read` -> "HaloDunia", atau terpecah menjadi "Hal" lalu "oDunia", tergantung kondisi jaringan dan buffer. TCP hanya menjamin **urutan dan kelengkapan byte**, bukan batas pesan.

Konsekuensinya:
1. **`read` bisa mengembalikan lebih sedikit dari yang kamu minta** (partial read; ingat partial write di Bab 12). Kamu harus mengulang `read` dalam loop sampai mendapat semua byte yang dibutuhkan.
2. **Kamu butuh protokol aplikasi sendiri** untuk menandai batas pesan: entah dengan delimiter (mis. `\n` seperti HTTP), atau dengan mengirim panjang pesan dulu (length-prefix). Ini sebabnya HTTP, dll punya format yang jelas.

```c
// pola membaca yang BENAR: loop sampai cukup / EOF
ssize_t total = 0;
while (total < perlu) {
    ssize_t n = read(sock, buf + total, perlu - total);
    if (n <= 0) break;        // 0 = koneksi ditutup, -1 = error
    total += n;
}
```

`read` mengembalikan `0` saat koneksi ditutup oleh ujung lain (EOF), sama seperti pipe (Bab 16) dan file (Bab 12). Sekali lagi, abstraksi fd menyatukan semuanya.

> **Jebakan tambahan:** menulis ke socket yang ujungnya sudah ditutup memicu **`SIGPIPE`** (Bab 15), yang default-nya mematikan program. Server jaringan biasanya mengabaikan `SIGPIPE` (atau memakai flag `MSG_NOSIGNAL`) dan menangani error `write` lewat return value. Ini contoh bagaimana signal, error handling, dan socket saling terkait.

---

## 18.8 Melayani banyak client (gambaran)

Server di Section 18.5 melayani satu client pada satu waktu (`accept` -> layani -> `accept` lagi). Untuk melayani banyak client **bersamaan**, ada beberapa pendekatan. Semuanya memakai konsep dari bab-bab sebelumnya.

1. **Satu proses/thread per client** — setelah `accept`, `fork` (Bab 14) atau buat thread (Bab 17) untuk menangani client itu, sementara loop utama lanjut `accept` client berikutnya. Sederhana, tapi boros kalau client banyak (ribuan thread).
2. **I/O multiplexing** (`select`/`poll`/`epoll`) — satu thread mengawasi banyak fd sekaligus, bereaksi ke yang punya data siap. `epoll` (Linux) adalah fondasi server berperforma tinggi (nginx, Redis) yang menangani puluhan ribu koneksi dengan sedikit thread. Ini event-driven model.

Detail `epoll` di luar cakupan bab ini, tetapi fondasinya sudah mulai terlihat: fd, non-blocking I/O, dan event loop. Konsep ini menjadi jembatan ke high-performance networking.

---

## 18.9 Rangkuman model mental

1. **Socket = file descriptor** (Bab 12) untuk komunikasi jaringan. Setelah koneksi terbentuk, `read`/`write` bekerja seperti pada file atau pipe; abstraksi UNIX menyatukan semuanya.
2. **IP + port** mengidentifikasi layanan (gedung + nomor unit). **TCP** andal dan berurutan (telepon); **UDP** cepat tetapi tidak dijamin (kartu pos).
3. **Network byte order = big-endian**; pakai `htons`/`htonl` saat mengirim angka (port/IP), `ntohs`/`ntohl` saat menerima. Endianness dari Bab 2 dipakai langsung di sini.
4. **Server**: `socket` -> `bind` -> `listen` -> `accept` (return fd baru per koneksi). **Client**: `socket` -> `connect`. Setelah itu keduanya `read`/`write` -> `close`.
5. **TCP itu STREAM, bukan pesan**: satu `write` ≠ satu `read`; bisa partial/menyatu. Kamu butuh loop baca & protokol batas-pesan sendiri (delimiter / length-prefix). `read` return `0` = koneksi ditutup (EOF).
6. Banyak client: thread/proses per client (Bab 14/17) atau I/O multiplexing (`epoll`).
7. Networking menyatukan banyak bab: fd (12), endianness (2), struct layout (8), signal/`SIGPIPE` (15), error handling (13), partial I/O (12).

---

## 18.10 Latihan & Pertanyaan Refleksi

**Latihan praktik:**

1. Jalankan server minimal (Section 18.5). Tanpa menulis client, tes dengan `nc localhost 8080` atau `curl localhost:8080`. Apakah pesan muncul?
2. Tulis client minimal (Section 18.6) dan hubungkan ke server-mu. Buktikan dua program berkomunikasi. Lalu jalankan keduanya di... ya, satu mesin dulu (localhost).
3. Modifikasi server agar **membaca** pesan dari client (bukan cuma mengirim), lalu memantulkannya kembali (echo server). Modifikasi client untuk mengirim string dan mencetak balasannya.
4. Demonstrasikan endianness: cetak `htons(8080)` dan `8080`. Apakah berbeda? (Di mesin little-endian, ya.) Jelaskan kenapa.
5. Demonstrasikan "TCP itu stream": di client, kirim dua `write` terpisah cepat (`write(sock,"AAA",3); write(sock,"BBB",3);`). Di server, baca dengan satu `read` — apakah kamu dapat "AAABBB" sekaligus? 
6. Tangani partial read dengan benar: tulis loop `read` (Section 18.7) yang membaca tepat N byte. Uji dengan mengirim data lebih besar dari satu paket.
7. (Lanjutan) Buat server yang melayani banyak client dengan `fork` (Bab 14) atau thread (Bab 17) per koneksi. Hubungkan beberapa client sekaligus.

**Pertanyaan refleksi:**

1. Kenapa socket disebut "cuma file descriptor"? Bagian mana dari pemrograman socket yang benar-benar baru, dan bagian mana yang sudah kamu kenal?
2. Apa beda IP address dan port? Pakai analogi sendiri.
3. Kapan kamu memilih TCP, kapan UDP? Beri contoh aplikasi masing-masing.
4. Kenapa `htons`/`htonl` perlu? Hubungkan dengan endianness dari Bab 2.
5. Jelaskan urutan syscall server vs client. Kenapa `accept` mengembalikan fd baru, bukan memakai socket yang sudah ada?
6. Apa maksud "TCP itu stream, bukan pesan"? Apa dua konsekuensi praktisnya bagi cara kamu menulis kode baca?
7. Sebutkan dua cara server melayani banyak client bersamaan, dan kaitkan masing-masing dengan bab sebelumnya.

---

Kita sudah keluar dari satu mesin dan melihat bagaimana program berkomunikasi lewat socket. Sepanjang buku ini, kita juga terus menyebut `read`, `write`, `fork`, `open`, dan `socket` sebagai syscall, yaitu cara program memanggil kernel.

Di **Bab 19**, kita melihat apa yang sebenarnya terjadi saat syscall dipanggil: perbedaan **user space vs kernel space**, mekanisme **mode switch**, dan peran libc di balik fungsi seperti `printf`.
