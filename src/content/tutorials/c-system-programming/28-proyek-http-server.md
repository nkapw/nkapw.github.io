---
title: "Proyek: Web Server Statis (`httpd`)"
description: "Proyek ini membangun web server beneran: ia mendengarkan di port 8080, melayani file dari folder www/, mengerti beberapa tipe konten, dan membalas 404/400/405 saat..."
tags: [c, system-programming]
order: 28
updated: 2026-06-18
---

> "Setiap kali kamu buka sebuah halaman, di seberang sana ada program yang `accept()` koneksimu, membaca beberapa baris teks yang kamu kirim, lalu membalas dengan beberapa baris teks plus isi sebuah file. Itu saja. 'Web server' kedengarannya raksasa, tapi inti HTTP-nya muat di satu sore. Begitu kamu menulisnya sendiri, address bar browser berhenti jadi sihir — kamu tahu persis byte apa yang lewat."

Proyek ini membangun **web server beneran**: ia mendengarkan di port 8080, melayani file dari folder `www/`, mengerti beberapa tipe konten, dan membalas `404`/`400`/`405` saat semestinya. Buka `http://localhost:8080` di browser sungguhan dan halaman yang kamu compile sendiri akan muncul.

Targetnya: melihat bahwa "server" hanyalah `socket → bind → listen → accept → read → write` di sekitar **file biasa**.

Yang dipakai:

| Konsep | Dari bab | Dipakai untuk |
|--------|----------|---------------|
| `socket`/`bind`/`listen`/`accept`, `htons` | Bab 18 | menerima koneksi TCP |
| "socket = file descriptor", `open`/`read` | Bab 12 | membaca file dari disk lalu memompanya ke socket |
| `perror`, kode status sebagai error | Bab 13 | gagal dengan anggun: 404/400/405, bukan crash |
| string: parse request line, cocokkan ekstensi | Bab 5 | `sscanf` request, `strrchr` untuk tipe konten |
| path traversal, `SIGPIPE` | Bab 21 & 15 | server yang aman dan tahan banting |

File: `server.c` (seluruh server, ~250 baris) dan `www/` (file contoh). Build `make`, jalankan `./httpd`, buka browser.

```sh
make
./httpd
# lalu di terminal/browser lain:
curl -i http://localhost:8080/
```

---

## Masalah inti: HTTP itu cuma teks bolak-balik

Sebelum socket, lihat dulu yang sebenarnya terjadi. Saat browser meminta sebuah halaman, ia mengirim teks polos seperti ini lewat TCP:

```
GET /index.html HTTP/1.1
Host: localhost:8080
User-Agent: ...
(baris kosong)
```

Dan server membalas dengan teks juga — sebuah **header**, satu baris kosong, lalu isi file:

```
HTTP/1.0 200 OK
Content-Type: text/html
Content-Length: 948
Connection: close
(baris kosong)
<!DOCTYPE html> ... isi file ...
```

Itu **seluruh** protokol yang kita butuhkan. Yang penting cuma tiga hal:

1. Baris pertama request memberi tahu kita **method** (`GET`) dan **path** (`/index.html`).
2. Balasan diawali baris status (`200 OK`, atau `404 Not Found`).
3. `Content-Length` memberi tahu client berapa byte isi yang menyusul — penting, karena TCP cuma aliran byte tanpa "batas pesan" (Bab 18).

Sisa pekerjaan kita: dengarkan koneksi, baca request, terjemahkan path jadi nama file, kirim file itu. Kita bangun bertahap.

---

## v1 — Socket: dari `socket()` sampai `accept()`

Lima panggilan membentuk fondasi setiap server TCP (Bab 18). Urutannya selalu sama:

```c
int server = socket(AF_INET, SOCK_STREAM, 0);   /* 1. buat endpoint TCP   */

struct sockaddr_in addr = {0};
addr.sin_family      = AF_INET;
addr.sin_addr.s_addr = INADDR_ANY;              /* semua IP lokal         */
addr.sin_port        = htons(PORT);             /* 2. port -> big-endian! */
bind(server, (struct sockaddr *)&addr, sizeof addr);

listen(server, 16);                             /* 3. jadi socket pasif   */

for (;;) {
    int client = accept(server, NULL, NULL);    /* 4. blokir s/d ada tamu */
    handle_client(client);                      /* 5. layani
    close(client);                              /*    lalu tutup koneksi  */
}
```

Tiga hal yang sering bikin pemula tersandung, dan ketiganya menagih bab sebelumnya:

- **`htons(PORT)`** — port harus dikirim dalam *network byte order* (big-endian). Lupa ini = koneksi "ke port yang salah" secara misterius. Inilah Bab 2 (endianness) menagih di dunia nyata.
- **`accept()` mengembalikan fd BARU.** `server` tetap mendengar; tiap koneksi dapat fd-nya sendiri (`client`). Memahami ini adalah kunci membedakan "socket yang mendengar" dari "socket sebuah percakapan".
- **`SO_REUSEADDR`.** Tanpa ini, restart server cepat-cepat sering kena `bind: Address already in use` (port masih "menggantung" sebentar). Satu `setsockopt` menyelesaikannya.

Di titik ini server sudah bisa menerima koneksi — tapi belum tahu cara membacanya.

---

## v2 — Membaca & mem-parse request (Bab 5)

Begitu `accept` memberi `client`, socket itu **fd biasa** — kita `read` darinya persis seperti file (Bab 12):

```c
char req[REQ_MAX];
ssize_t n = read(client, req, sizeof req - 1);
req[n] = '\0';            /* data jaringan = byte mentah; kita null-terminate sendiri (Bab 5) */
```

Kita hanya butuh baris pertama. `sscanf` memetiknya dengan rapi — dua `%s` untuk method dan path, dengan batas lebar agar tak overflow buffer (Bab 5 & 21):

```c
char method[16], rawpath[1024];
if (sscanf(req, "%15s %1023s", method, rawpath) != 2) {
    send_error(client, 400, "Bad Request");   /* request tak masuk akal */
    return;
}
```

Sekarang kita tahu maksud client: method `GET`, path `/index.html`. Dua pemeriksaan menjaga server tetap waras dan **aman**:

```c
if (strcmp(method, "GET") != 0)            /* cuma GET yang kita dukung */
    return send_error(client, 405, "Method Not Allowed");

if (strstr(rawpath, ".."))                 /* TOLAK path traversal!     */
    return send_error(client, 400, "Bad Request");
```

> **Kenapa cek `".."` itu kritis (Bab 21).** Tanpa baris itu, client jahat bisa minta `GET /../../../../etc/passwd` dan server-mu dengan patuh membacakan file rahasia di luar `www/`. Ini bug nyata bernama **path traversal** yang sudah membobol server sungguhan tak terhitung kali. Aturan emas server: **jangan pernah percaya input dari jaringan.** (Browser menormalkan `..` sendiri, tapi `curl --path-as-is` atau attacker tidak — pertahanan ada di server, bukan client.)

---

## v3 — Melayani file: "socket = fd" terbayar (Bab 12)

Path sudah aman, sekarang ubah jadi nama file lokal dan kirim isinya. `/` berarti `index.html`; sisanya ditempel ke `www/`:

```c
const char *urlpath = rawpath;
if (strcmp(urlpath, "/") == 0) urlpath = "/index.html";
char path[1100];
snprintf(path, sizeof path, "%s%s", WEBROOT, urlpath);   /* "www" + "/index.html" */
```

Inilah bagian yang menyatukan seluruh proyek. Kita `open` file (Bab 12), kirim header, lalu **memompa byte file ke socket** — dan karena socket itu fd, menyalin file ke jaringan tampak persis seperti menyalin file ke file:

```c
int filefd = open(path, O_RDONLY);
if (filefd < 0) { send_error(client, 404, "Not Found"); return; }   /* errno -> HTTP (Bab 13) */

/* fstat memberi ukuran -> jadi Content-Length, agar client tahu kapan berhenti */
struct stat st; fstat(filefd, &st);
/* ...kirim header "200 OK" + Content-Type + Content-Length... */

char buf[8192];
ssize_t n;
while ((n = read(filefd, buf, sizeof buf)) > 0)   /* baca dari FILE   */
    send_all(client, buf, n);                     /* tulis ke SOCKET  */
```

`read` di sisi kiri membaca dari disk; `send_all` di sisi kanan menulis ke jaringan. Loop yang sama persis bisa menyalin file ke file, file ke pipe, apa pun — karena di UNIX semuanya fd (Bab 12). Itulah keindahan yang dijanjikan Bab 18.

Tipe konten ditebak dari ekstensi dengan `strrchr` (cari `.` terakhir) lalu `strcmp` (Bab 5):

```c
const char *dot = strrchr(path, '.');
if (dot && strcmp(dot, ".html") == 0) return "text/html";
if (dot && strcmp(dot, ".css")  == 0) return "text/css";
/* ...dst... */
```

Tanpa `Content-Type` yang benar, browser mungkin menampilkan CSS sebagai teks mentah alih-alih menatanya.

---

## v4 — Tahan banting: `send_all` & `SIGPIPE` (Bab 18 & 15)

Dua jebakan klasik yang membedakan "jalan di laptopku" dari "jalan beneran":

**1. `write` bisa parsial.** Satu `write(fd, buf, 8000)` mungkin hanya mengirim sebagian; itu sah menurut TCP (Bab 18). Maka kita bungkus dalam loop yang mengulang sampai semua terkirim:

```c
static int send_all(int fd, const char *buf, size_t len) {
    size_t sent = 0;
    while (sent < len) {
        ssize_t n = write(fd, buf + sent, len - sent);
        if (n < 0) { if (errno == EINTR) continue; return -1; }
        sent += n;
    }
    return 0;
}
```

**2. `SIGPIPE` bisa membunuh server.** Kalau client menutup tab di tengah transfer, `write` ke socket itu memicu sinyal `SIGPIPE` yang—secara default—**mematikan prosesmu** (Bab 15). Satu client yang pergi tak boleh menjatuhkan server. Solusinya satu baris di `main`:

```c
signal(SIGPIPE, SIG_IGN);   /* abaikan; write akan sekadar gagal dengan errno, bukan membunuh */
```

Tanpa dua perbaikan ini server-mu "kelihatan jalan" sampai client pertama yang lambat atau yang pergi mendadak menjatuhkannya.

---

## Coba jalankan

```sh
make
./httpd
```

Lalu, dari terminal lain (atau browser):

```sh
curl -i http://localhost:8080/                 # 200, index.html
curl -i http://localhost:8080/about.txt        # 200, text/plain
curl -i http://localhost:8080/tidak-ada        # 404
curl -i -X POST http://localhost:8080/         # 405
curl -i --path-as-is http://localhost:8080/../server.c   # 400 (traversal ditolak)
```

Atau cukup buka **http://localhost:8080** di browser — kamu akan lihat halaman sambutan ber-CSS, semuanya dilayani oleh kode-mu. Setiap request tercetak di terminal server:

```
  GET /
  GET /style.css
  GET /about.txt
```

> Port 8080 dipakai? Server membaca `PORT` dari `#define` yang bisa di-override saat compile (Bab 10):
> `gcc -Wall -Wextra -DPORT=9000 -o httpd server.c` lalu buka `:9000`.

Alur baca yang disarankan di `server.c`: `main` (5 langkah socket) → `handle_client` (parse) → `serve_file` (open + pompa) → `send_all`/`content_type` (detail). Empat fungsi, satu server.

---

## Latihan: kembangkan sendiri

Urut dari paling mudah:

1. **Listing direktori.** Kalau path adalah folder (cek `S_ISDIR` dari `fstat`), bukan file, hasilkan HTML berisi daftar isi folder (`opendir`/`readdir`).
2. **Lebih banyak tipe konten:** `.svg`, `.ico`, `.pdf`, `.mp4`. Sekadar tambah baris di `content_type`.
3. **Halaman 404 kustom.** Daripada HTML inline, layani `www/404.html` kalau ada.
4. **Header `Date` dan `Server`.** Server sungguhan mengirimnya; tambahkan ke respons (`time` + `strftime`, Bab 12 dunia waktu).
5. **Banyak client sekaligus.** Saat ini server melayani satu koneksi pada satu waktu — client kedua menunggu. Perbaiki dengan `fork()` per koneksi (Bab 14) atau thread (Bab 17). *Pertanyaan:* kenapa `fork` per request itu sederhana tapi boros, dan kapan kamu memilih thread?
6. **Logging benar:** tulis tiap request ke file `access.log` dengan timestamp + status code (Bab 12).
7. **Keamanan lebih dalam:** sekarang kita tolak `".."` secara kasar. Lebih kokoh: bangun path absolut dengan `realpath()` lalu pastikan ia masih berada di dalam `realpath(WEBROOT)`. Kenapa ini lebih aman daripada sekadar mencari string `".."`?

Benang merahnya: server ini **sengaja minimalis** agar tiap baris terbaca. Tiap latihan menariknya satu langkah lebih dekat ke nginx — dan tiap langkah itu menyentuh bab yang sudah kamu kenal: proses (14), thread (17), file (12), waktu, keamanan (21). Itulah inti *system programming*: hal-hal besar tersusun dari primitif kecil yang sama.
