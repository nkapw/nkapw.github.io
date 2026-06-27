---
title: "Proyek: Hexdump Mini (`hd`)"
description: "Proyek ini membangun versi mini dari hexdump -C / xxd: alat yang menampilkan isi mentah sebuah file dalam tiga kolom klasik — offset, hex, ASCII. Kecil (satu file,..."
tags: [c, system-programming]
order: 24
updated: 2026-06-18
---

> "Semua yang ada di komputer — teks, gambar, lagu, program — pada akhirnya cuma byte: angka 0 sampai 255. Kita biasanya melihatnya lewat 'kacamata' (sebagai huruf, sebagai piksel). `hexdump` melepas kacamata itu dan menunjukkan byte mentahnya. Begitu kamu bisa membaca hex, file biner berhenti jadi misteri — kamu bisa mengintip ke dalam apa saja."

Proyek ini membangun versi mini dari `hexdump -C` / `xxd`: alat yang menampilkan isi mentah sebuah file dalam tiga kolom klasik — **offset, hex, ASCII**. Kecil (satu file, ~60 baris) tapi mengubah cara kamu memandang data: Bab 2 (representasi) berhenti jadi teori dan jadi sesuatu yang bisa kamu *lihat*.

Yang dipakai:

| Konsep | Dari bab | Dipakai untuk |
|--------|----------|---------------|
| byte, hex, representasi | Bab 2 | inti: tiap byte jadi 2 digit hex |
| `char` printable vs tidak | Bab 5 | kolom ASCII (`isprint`) |
| file I/O, stdin sebagai stream | Bab 12 | baca file atau pipe |
| `perror`/errno | Bab 13 | gagal buka file dengan anggun |

File: `hd.c`. Build `make`, jalankan `./hd <file>`.

```sh
make
./hd hd.c | head -3
echo -n "Halo, C!" | ./hd      # dari pipe (stdin)
```

---

## Masalah inti: byte yang sama, banyak wajah

Ketik `A` di editor, dan yang tersimpan di disk sebenarnya angka **65** (`0x41`). Ketik `1`, tersimpan **49** (`0x31`), *bukan* 1. Sebuah file hanyalah deretan byte; "teks", "gambar", "program" cuma **cara kita menafsirkannya** (Bab 2).

`hexdump` menunjukkan dua tafsir berdampingan untuk tiap baris 16 byte:

```
00000000  48 61 6c 6f 2c 20 43 21  0a 42 79 74 65 20 6d 65  |Halo, C!.Byte me|
^^^^^^^^   ^^ ^^ ^^ ...                                     ^^^^^^^^...
offset     tiap byte sebagai hex (0x48 = 'H' = 72)          byte yg sama sebagai ASCII
```

Tiga kolom, tiga pekerjaan kecil. Mari rakit.

---

## v1 — Satu baris: offset, hex, ASCII

Inti seluruh program ada di satu fungsi yang mencetak **satu baris** dari maksimal 16 byte. Tiga bagian, persis seperti output-nya:

```c
static void print_line(unsigned long offset, const unsigned char *buf, size_t n) {
    printf("%08lx  ", offset);                 /* 1. offset: 8 digit hex */

    for (size_t i = 0; i < COLS; i++) {        /* 2. kolom hex          */
        if (i < n) printf("%02x ", buf[i]);    /*    byte -> 2 digit    */
        else       printf("   ");              /*    padding baris akhir */
        if (i == 7) putchar(' ');              /*    pemisah 8|8         */
    }

    printf(" |");                              /* 3. kolom ASCII        */
    for (size_t i = 0; i < n; i++)
        putchar(isprint(buf[i]) ? buf[i] : '.');
    printf("|\n");
}
```

Tiga detail kecil yang penting, dan tiap-tiapnya menyentuh sebuah bab:

- **`%02x`** (Bab 2) — cetak byte sebagai 2 digit hex dengan nol di depan. `10` jadi `0a`, bukan `a`. Tanpa `02`, kolomnya tak akan rapi sejajar.
- **`isprint(buf[i]) ? buf[i] : '.'`** (Bab 5) — byte yang bisa dicetak (huruf, angka, tanda baca) ditampilkan apa adanya; sisanya (newline `0a`, byte nol `00`, byte biner) jadi `.`. Inilah kenapa kolom kanan tetap terbaca walau isinya biner.
- **`unsigned char`** (Bab 2) — wajib `unsigned`. Kalau `char` biasa (yang bisa *signed*), byte ≥ 128 jadi angka negatif dan `%02x` mencetaknya sebagai `ffffff80`. Detail kecil yang jadi sumber bug klasik.

---

## v2 — Membaca stream apa pun (Bab 12)

Bagian baca sengaja dibuat menerima `FILE *` mana saja — file di disk **atau** `stdin` — sehingga `hd` bisa membaca pipe persis seperti alat UNIX sungguhan:

```c
static void dump(FILE *f) {
    unsigned char buf[COLS];                   /* 16 byte per baris */
    unsigned long offset = 0;
    size_t n;
    while ((n = fread(buf, 1, COLS, f)) > 0) { /* baca s/d 16 byte  */
        print_line(offset, buf, n);
        offset += n;                           /* offset maju sebanyak yg terbaca */
    }
    printf("%08lx\n", offset);                 /* baris penutup = ukuran total */
}
```

`fread(buf, 1, 16, f)` mencoba membaca 16 byte dan mengembalikan berapa yang **benar-benar** didapat — biasanya 16, tapi baris terakhir file bisa kurang. Itu sebabnya `print_line` menerima `n`: agar baris terakhir mencetak hex sebanyak yang ada tapi tetap rata kolomnya (lewat padding `"   "`).

Di `main`, pemilihan sumber cuma satu `if` — inilah pola "file atau stdin" yang dipakai hampir semua tool UNIX:

```c
if (argc < 2) { dump(stdin); return 0; }       /* tanpa argumen -> pipe */
FILE *f = fopen(argv[1], "rb");                /* "rb" = mode biner     */
if (!f) { perror(argv[1]); return 1; }         /* Bab 13: errno jelas   */
dump(f);
```

> **Kenapa `"rb"` (biner)?** Di UNIX tak ada bedanya, tapi di Windows mode teks diam-diam mengubah `\r\n` ↔ `\n` — fatal untuk hexdump yang harus melihat byte **apa adanya**. Kebiasaan baik (Bab 12).

---

## Coba jalankan

```sh
make
./hd /bin/ls | head -3        # intip header ELF sebuah program
```

```
00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|
00000010  03 00 3e 00 01 00 00 00  ...                      |..>.............|
```

Empat byte pertama setiap program Linux: `7f 45 4c 46` — yaitu `0x7f` diikuti ASCII `E`, `L`, `F`. Itulah **magic number** ELF, cara kernel mengenali "ini file program" (Bab 1 & 19). Kamu baru saja mengintip ke dalam format file dengan alat buatanmu sendiri.

Bandingkan output-mu dengan aslinya — harus identik:

```sh
hexdump -C /bin/ls | head -3
```

---

## Latihan: kembangkan sendiri

1. **Tekan baris kembar.** `hexdump` mencetak `*` untuk menggantikan baris-baris identik berturut-turut (umum di file penuh nol). Deteksi baris yang sama dengan sebelumnya dan ringkas.
2. **Mode ASCII saja (`-c`)** atau **hex saja (`-x`)** lewat argumen, seperti flag `xxd`.
3. **Tampilkan offset desimal** dengan flag `-d`, bukan hex.
4. **Warnai output:** byte nol abu-abu, printable hijau, sisanya putih (ANSI escape, Bab 5). Bikin pola dalam file biner langsung terlihat.
5. **Mode "patch":** baca format dump-mu sendiri kembali dan tulis ulang jadi biner (kebalikan `hd`) — seperti `xxd -r`. Ini melatih parsing (lihat proyek `calc`).

Kuncinya: hampir semua format file — gambar PNG, font, executable, paket jaringan — bisa kamu bedah dengan `hd`. Begitu byte tak lagi menakutkan, seluruh komputer terbuka untuk diintip.
