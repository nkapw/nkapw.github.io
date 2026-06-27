---
title: "Proyek: Chat Server Multi-Client (`chatd`)"
description: "Proyek ini menjawab keterbatasan terbesar httpd (proyek sebelumnya): ia melayani satu koneksi pada satu waktu. chatd melayani banyak client serentak — semua orang..."
tags: [c, system-programming]
order: 29
updated: 2026-06-18
---

> "Sebuah server yang melayani satu orang itu mudah. Yang bikin pusing: melayani seribu orang **sekaligus** dengan satu proses, satu thread, tanpa salah satu pun saling menunggu. Jawabannya bukan 'bikin thread per orang' — melainkan satu trik bernama `select()`: tidur sampai *salah satu dari sekian banyak* koneksi punya kabar, lalu layani yang itu saja. Begitu kamu paham event loop ini, kamu paham cara kerja diam-diam nginx, Redis, dan Node.js."

Proyek ini menjawab keterbatasan terbesar `httpd` (proyek sebelumnya): ia melayani **satu** koneksi pada satu waktu. `chatd` melayani **banyak** client serentak — semua orang yang terhubung bisa mengobrol, dan tiap pesan disiarkan ke semua yang lain. Dan ia melakukannya tanpa thread: satu utas, satu `select()` loop.

Yang dipakai:

| Konsep | Dari bab | Dipakai untuk |
|--------|----------|---------------|
| `select()`, event loop, I/O multiplexing | Bab 17 | melayani N client dengan 1 thread |
| `socket`/`bind`/`listen`/`accept` | Bab 18 | menerima tiap koneksi |
| "semua client adalah fd", `read`/`write` | Bab 12 | I/O seragam ke tiap client |
| `SIGPIPE`, `SO_REUSEADDR` | Bab 15 & 18 | server tahan banting |
| array of struct, manajemen slot | Bab 8 | melacak siapa saja yang online |

File: `chatd.c` (~180 baris). Build `make`, jalankan `./chatd`, sambung dengan `nc localhost 9000` dari beberapa terminal.

```sh
make
./chatd
# di terminal lain (boleh beberapa sekaligus):
nc localhost 9000
```

---

## Masalah inti: satu utas, banyak percakapan

`httpd` punya pola sederhana: `accept` satu client, layani sampai selesai, `accept` berikutnya. Untuk chat itu mustahil — kalau server "menunggu pesan dari Alice" lewat `read(alice_fd)`, ia **memblokir** di situ; Bob yang mengetik di saat bersamaan tak terlayani sampai Alice mengirim sesuatu. Server jadi tuli ke semua orang kecuali satu.

Ada tiga jalan keluar klasik:

| Pendekatan | Ide | Kekurangan |
|------------|-----|------------|
| Thread per client | tiap client dapat thread sendiri | mahal di skala besar; sinkronisasi rumit (Bab 17) |
| Proses per client (`fork`) | tiap client dapat proses sendiri | lebih mahal lagi; berbagi data susah (Bab 14) |
| **`select()` / event loop** | **satu utas menunggu SEMUA fd sekaligus** | **logika sedikit berbeda — tapi ringan & elegan** |

Kita pakai yang ketiga. Kuncinya satu syscall: `select()` mengambil sekumpulan file descriptor dan **tidur sampai salah satunya siap dibaca**, lalu memberitahu yang mana. Tak ada pemblokiran pada satu client; tak ada busy-loop yang membakar CPU. Inilah fondasi *asynchronous server* modern.

---

## v1 — Melacak siapa yang online (Bab 8)

Sebelum event loop, kita butuh "buku tamu": daftar client yang sedang terhubung. Sebuah array of struct sudah cukup; slot kosong ditandai `fd == -1`:

```c
typedef struct {
    int  fd;                  /* -1 = slot kosong          */
    char name[NAME_LEN];      /* "tamu1", "tamu2", ...     */
} Client;
static Client clients[MAX_CLIENTS];
```

Pola "array + nilai sentinel untuk slot kosong" ini muncul di mana-mana di sistem (Bab 8). Saat client masuk kita cari slot `fd == -1` pertama; saat keluar kita kembalikan slotnya ke `-1`. Sederhana dan tanpa alokasi dinamis.

---

## v2 — Event loop: jantung `select()` (Bab 17)

Inilah inti proyek. Tiap putaran loop melakukan tiga hal: **susun** daftar fd yang kita pedulikan, **tidur** di `select` sampai ada yang siap, lalu **layani** yang siap.

```c
for (;;) {
    fd_set readfds;
    FD_ZERO(&readfds);
    FD_SET(listen_fd, &readfds);          /* selalu pantau socket pendengar */
    int maxfd = listen_fd;

    for (int i = 0; i < MAX_CLIENTS; i++)  /* + semua client yang online    */
        if (clients[i].fd != -1) {
            FD_SET(clients[i].fd, &readfds);
            if (clients[i].fd > maxfd) maxfd = clients[i].fd;
        }

    select(maxfd + 1, &readfds, NULL, NULL, NULL);   /* TIDUR sampai ada kabar */
    /* ...begitu bangun, cek fd mana yang siap... */
}
```

Empat makro adalah seluruh "API" `select`, dan namanya menjelaskan dirinya:

- **`FD_ZERO`** — kosongkan himpunan.
- **`FD_SET(fd, &set)`** — "tolong pantau fd ini".
- **`select(maxfd+1, &set, ...)`** — tidur; saat kembali, `set` sudah dimodifikasi hanya berisi fd yang **siap**.
- **`FD_ISSET(fd, &set)`** — "apakah fd ini termasuk yang siap?".

> **Kenapa `maxfd + 1`?** `select` memindai fd dari 0 sampai argumen pertama **dikurangi satu**. Jadi kita beri tahu "fd tertinggi + 1". Detail kecil yang kalau salah bikin client dengan fd tinggi tak pernah terlayani — bug yang membingungkan kalau tak tahu.

Setelah `select` kembali, kita periksa dua kemungkinan.

**(A) Socket pendengar siap → ada koneksi baru.** `accept`, cari slot kosong, sambut, lalu umumkan ke yang lain:

```c
if (FD_ISSET(listen_fd, &readfds)) {
    int cfd = accept(listen_fd, NULL, NULL);
    /* taruh di slot kosong, beri nama "tamuN" */
    broadcast("[+] tamuN bergabung\n", cfd);   /* beritahu semua KECUALI dia */
}
```

**(B) Socket client siap → ia mengirim pesan, atau memutus.** `read` membedakan keduanya: `> 0` berarti ada teks; `<= 0` (khususnya `0`) berarti client menutup koneksi (Bab 12 & 18):

```c
ssize_t n = read(fd, buf, sizeof buf - 1);
if (n <= 0) {                                  /* 0 = koneksi ditutup */
    close(fd);
    clients[i].fd = -1;                         /* kosongkan slot      */
    broadcast("[-] ... keluar\n", -1);
} else {
    buf[n] = '\0';
    buf[strcspn(buf, "\r\n")] = '\0';           /* buang newline (Bab 5) */
    /* siarkan "nama: pesan" ke semua kecuali pengirim */
}
```

Perhatikan: di sini `accept`, `read`, dan `write` adalah operasi yang **sama** seperti di `httpd`. Yang berubah cuma *kerangka* di sekelilingnya — dari "satu client sampai selesai" jadi "putar terus, layani siapa pun yang siap". Itulah inti event-driven programming.

---

## v3 — `broadcast`: menyiarkan ke semua (kecuali pengirim)

Fitur khas chat: pesan satu orang muncul di layar semua orang lain. Cukup loop pada daftar client dan kirim ke tiap fd yang aktif, melewati pengirim:

```c
static void broadcast(const char *msg, int except) {
    size_t len = strlen(msg);
    for (int i = 0; i < MAX_CLIENTS; i++)
        if (clients[i].fd != -1 && clients[i].fd != except)
            send_all(clients[i].fd, msg, len);
    printf("%s", msg);          /* server ikut mencatat ke layar */
}
```

Parameter `except` itulah yang membuat pesanmu sendiri tak terpantul balik ke layarmu. Untuk pengumuman server (join/leave), kita panggil dengan `except = -1` supaya sampai ke semua. Dan `send_all` (pembungkus `write` yang mengulang sampai semua byte terkirim) memastikan pesan utuh meski TCP mengirim parsial — pelajaran yang sama dari `httpd` (Bab 18).

---

## v4 — Tahan banting: `SIGPIPE` (Bab 15)

Sama seperti `httpd`: kalau sebuah client mati mendadak saat kita sedang `write` ke socket-nya, kita kena `SIGPIPE` yang—secara default—mematikan **seluruh server**, menjatuhkan semua orang gara-gara satu koneksi buruk. Satu baris di awal `main` mencegahnya:

```c
signal(SIGPIPE, SIG_IGN);   /* write yang gagal sekadar return error, bukan membunuh proses */
```

Plus `SO_REUSEADDR` agar bisa restart server seketika tanpa `bind: Address already in use`.

---

## Coba jalankan

Buka **tiga** terminal. Di terminal pertama:

```sh
make
./chatd
```

Di terminal kedua dan ketiga:

```sh
nc localhost 9000
```

Ketik di salah satu — pesannya langsung muncul di yang lain:

```
(terminal 2)                      (terminal 3)
Selamat datang, tamu1! ...        Selamat datang, tamu2! ...
[+] tamu2 bergabung
halo dari tamu1                   tamu1: halo dari tamu1
tamu2: hai!                       hai!
```

Sementara itu terminal server mencatat semuanya:

```
[+] tamu1 bergabung
[+] tamu2 bergabung
tamu1: halo dari tamu1
tamu2: hai!
[-] tamu2 keluar
```

> Tak punya `nc`? Pakai `python3 -c 'import socket,sys,threading; ...'` atau dua tab browser via `telnet localhost 9000`. Port 9000 dipakai? Override saat compile (Bab 10): `gcc -Wall -Wextra -DPORT=9100 -o chatd chatd.c`.

---

## Latihan: kembangkan sendiri

Urut dari paling mudah:

1. **Perintah `/nick <nama>`.** Kalau pesan diawali `/nick `, ganti `clients[i].name` alih-alih menyiarkannya. Pintu masuk ke "command parsing".
2. **Perintah `/who`.** Balas ke si peminta sebuah daftar semua nama yang online (loop array `clients`).
3. **Perintah `/quit`.** Tutup koneksi dengan rapi dari sisi server.
4. **Cegah pesan tercampur (framing).** Sekarang kita anggap satu `read` = satu pesan. Kalau dua pesan tiba dalam satu `read` (`"halo\nhai\n"`), keduanya jadi satu. Perbaiki: simpan buffer per-client, pisah per `\n`. Ini pelajaran "TCP itu stream, bukan pesan" dari Bab 18 yang terasa nyata.
5. **Ganti `select` dengan `poll`** lalu **`epoll`** (Linux). `select` punya batas `FD_SETSIZE` (≈1024) dan O(n) tiap panggilan; `epoll` skala ke puluhan ribu koneksi — inilah yang dipakai server produksi. Bandingkan ketiganya.
6. **Ruang/channel.** Beri tiap client sebuah "room"; `broadcast` hanya ke client di room yang sama. Sekarang kamu punya Slack mini.

Benang merahnya: kamu sudah punya **kerangka setiap server jaringan modern** — terima koneksi, pantau banyak fd, reaksi atas event. Database, message broker, game server, semuanya varian dari loop yang baru saja kamu tulis. Itulah kekuatan menguasai `select()`.
