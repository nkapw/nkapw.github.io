---
title: "Proyek: Interpreter Ekspresi"
description: "Proyek ini membangun sebuah kalkulator yang sesungguhnya: bukan switch raksasa, tapi interpreter mungil yang memakai pola yang sama persis dengan compiler/interpreter..."
tags: [c, system-programming]
order: 25
updated: 2026-06-18
---

> "Ketik `3 + 4 * 2`, dapat `11` — bukan `14`. Komputer entah bagaimana 'tahu' bahwa perkalian dikerjakan duluan. Tapi tak ada yang ajaib: di balik layar, sepotong teks diubah jadi **pohon**, dan pohon itu dihitung dari daun ke akar. Begitu kamu menulis interpreter-mu sendiri, kamu berhenti memandang bahasa pemrograman sebagai sihir — kamu lihat persis bagaimana teks jadi makna."

Proyek ini membangun sebuah **kalkulator yang sesungguhnya**: bukan `switch` raksasa, tapi interpreter mungil yang memakai pola yang sama persis dengan compiler/interpreter beneran — *lexer → parser → evaluator*. Ia mengerti preseden operator, kurung, tanda negatif, dan variabel (`x = 10`, lalu `x * (x - 1)`).

Targetnya: setelah ini, kata "parser" dan "AST" berhenti terdengar menakutkan.

Yang dipakai:

| Konsep | Dari bab | Dipakai untuk |
|--------|----------|---------------|
| string, `strtod`, jalan di atas `char *` | Bab 5 | lexer (memecah teks jadi token) |
| pointer, struct yang menunjuk dirinya sendiri | Bab 6 & 7 | node pohon yang menunjuk anak |
| `enum` (tag) + `union` (varian) + `struct` | Bab 8 | bentuk node AST |
| `malloc` / `free`, rekursi pembebasan | Bab 9 | tiap node hidup di heap |
| pola error tanpa crash | Bab 13 | pesan error, bukan segfault |

File: `calc.h` (API & tipe AST), `calc.c` (otak: lexer + parser + eval), `main.c` (REPL). Build `make`, jalankan `./calc`.

```sh
make
./calc
> 3 + 4 * 2
  = 11
> x = 10
  = 10
> x * (x - 1)
  = 90
```

---

## Masalah inti: teks itu datar, makna itu berpohon

Manusia menulis ekspresi sebagai deretan karakter yang **datar**:

```
3 + 4 * 2
```

Tapi *arti*-nya tidak datar — ia **berhierarki**. "Kalikan 4 dan 2 dulu, baru tambahkan 3." Hierarki itu paling jujur digambarkan sebagai **pohon**:

```
        (+)
       /   \
      3    (*)
          /   \
         4     2
```

Hitung pohon ini dari bawah: `4*2 = 8`, lalu `3+8 = 11`. Pohon inilah yang otomatis "tahu" preseden — bukan karena ada aturan rumit, tapi karena **bentuknya** sudah menaruh `*` lebih dalam dari `+`.

Maka pekerjaan kita pecah jadi tiga langkah, dan ketiganya jadi tiga fungsi di `calc.h`:

```
  "3 + 4 * 2"   --lexer-->   [3] [+] [4] [*] [2]   --parser-->   pohon   --eval-->   11
     (teks)                       (token)                        (AST)            (angka)
```

Kita bangun ketiganya bertahap.

---

## v1 — Lexer: dari karakter ke token

Memparse langsung dari karakter itu menyiksa: kamu harus mengurus spasi, angka berbilang digit, desimal, di setiap tempat. Solusinya: satu lapisan tipis yang memecah teks jadi **token** — potongan bermakna terkecil. `"3.5 + x"` jadi `NUMBER(3.5)`, `PLUS`, `IDENT("x")`.

Token kita cukup sebuah struct dengan satu `enum` jenis dan dua slot data (Bab 8):

```c
typedef enum {
    T_NUM, T_IDENT,
    T_PLUS, T_MINUS, T_STAR, T_SLASH,
    T_LPAREN, T_RPAREN, T_ASSIGN,
    T_END, T_ERROR,
} TokType;

typedef struct {
    TokType type;
    double  num;                  /* valid bila T_NUM   */
    char    name[NAME_MAX_LEN];   /* valid bila T_IDENT */
} Token;
```

Inti lexer adalah `next_token` (lihat `calc.c`): lewati spasi, lalu lihat karakter pertama untuk memutuskan jenis token. Bagian terpenting adalah **angka**, dan di sini Bab 5 terbayar:

```c
if (isdigit((unsigned char)*p) || *p == '.') {
    char *end;
    t.type = T_NUM;
    t.num  = strtod(p, &end);   /* baca angka SEKALIGUS majukan pointer */
    ps->p  = end;               /* `end` menunjuk tepat setelah angka   */
    return t;
}
```

`strtod` (string-to-double) membaca selengkap mungkin sebuah angka dari posisi `p`, dan lewat parameter keduanya ia memberitahu **sampai mana** ia membaca. Kita tinggal pindahkan pointer ke situ. Satu fungsi pustaka menggantikan loop manual yang rawan bug.

Identifier (nama variabel) diperlakukan mirip: lahap huruf/digit/underscore selama masih ada. Sisanya — `+`, `(`, `=` — cukup `switch` satu karakter.

> **Kenapa pisahkan lexer dari parser?** Karena parser jadi jauh lebih bersih kalau ia berpikir dalam "token", bukan "karakter". Parser tak perlu tahu bahwa `42` itu dua digit atau bahwa ada spasi sebelum `+`. Pemisahan tugas ini (Bab 11 dalam semangat) adalah pola universal di semua compiler.

---

## v2 — AST: `enum` + `union`, jantung Bab 8

Sekarang token harus dirakit jadi pohon. Tiap simpul pohon (node) bisa berupa salah satu dari beberapa **jenis** yang sangat berbeda: angka punya nilai `double`; operasi biner punya operator dan dua anak; variabel punya nama. Satu node hanya pernah jadi **satu** jenis pada satu waktu.

Itulah definisi persis dari **tagged union** (Bab 8): sebuah `enum` jadi penanda jenis, dan sebuah `union` menampung payload yang hanya satu yang aktif:

```c
typedef enum {
    NODE_NUM, NODE_VAR, NODE_NEG, NODE_BINOP, NODE_ASSIGN,
} NodeType;

struct Node {
    NodeType type;                 /* tag: ini node jenis apa?        */
    union {                        /* payload: hanya SATU yang hidup  */
        double num;                            /* NODE_NUM   */
        char   name[NAME_MAX_LEN];             /* NODE_VAR   */
        struct { Node *child; }          neg;    /* NODE_NEG   */
        struct { char op; Node *l, *r; } binop;  /* NODE_BINOP */
        struct { char name[NAME_MAX_LEN]; Node *value; } assign;
    } as;
};
```

Perhatikan dua hal yang menyatukan banyak bab:

- **`union` menghemat memori dan menegaskan maksud** (Bab 8): sebuah node tak mungkin sekaligus angka *dan* operasi. Ukuran node = ukuran varian terbesar, bukan jumlah semuanya.
- **`Node *l, *r` — struct yang menunjuk dirinya sendiri** (Bab 7): inilah yang membuatnya jadi *pohon*. Sebuah `BINOP` menunjuk dua node lain, yang bisa jadi `BINOP` lagi, dan seterusnya. Rekursi tipe data inilah fondasi semua struktur berpohon.

Aturan emas tagged union: **selalu baca `tag` dulu, baru sentuh anggota union yang sesuai.** Membaca `as.binop` dari sebuah `NODE_NUM` adalah *undefined behavior* (Bab 21).

---

## v3 — Parser: recursive descent, di mana preseden "lahir"

Sekarang bagian yang paling sering ditakuti, padahal paling elegan. Kita pakai teknik **recursive descent**: tulis satu fungsi per aturan grammar, dan biarkan fungsi-fungsi itu saling memanggil. Grammar-nya:

```
expr    := term   (('+' | '-') term)*
term    := factor (('*' | '/') factor)*
factor  := ('+' | '-') factor | primary
primary := NUMBER | IDENT | '(' expr ')'
```

**Susunan lapisan inilah yang menanamkan preseden** — tak ada tabel, tak ada angka prioritas. `expr` menangani `+`/`-` di lapisan terluar (paling longgar); ia memanggil `term` untuk tiap operand-nya; `term` menangani `*`/`/` di lapisan lebih dalam (lebih erat). Karena `*` diproses lebih dalam dari `+`, ia otomatis "menempel" lebih kuat. Bentuk grammar **adalah** aturan preseden.

Tiap operator kiri-asosiatif memakai pola yang sama: parse satu operand, lalu selama token berikutnya masih operator level ini, terus lahap dan bangun node:

```c
static Node *parse_expr(Parser *ps) {
    Node *left = parse_term(ps);                  /* operand pertama */
    while (ps->cur.type == T_PLUS || ps->cur.type == T_MINUS) {
        char op = (ps->cur.type == T_PLUS) ? '+' : '-';
        advance(ps);
        Node *right = parse_term(ps);             /* operand berikutnya */
        Node *n = new_node(NODE_BINOP);
        n->as.binop.op = op;
        n->as.binop.l  = left;
        n->as.binop.r  = right;
        left = n;                                 /* hasil jadi sisi kiri berikutnya */
    }
    return left;
}
```

Dan kurung? Ajaibnya hampir gratis. Di `parse_primary`, saat ketemu `(`, kita panggil lagi `parse_expr` — kembali ke **pucuk** grammar:

```c
if (ps->cur.type == T_LPAREN) {
    advance(ps);                      /* lewati '(' */
    Node *inner = parse_expr(ps);     /* rekursi: isi kurung diparse penuh */
    if (ps->cur.type != T_RPAREN) { set_error(ps, "kurung ')' tidak ditemukan"); ... }
    advance(ps);                      /* lewati ')' */
    return inner;
}
```

Karena isi kurung diparse mulai dari `expr` lagi, apa pun di dalamnya (`(1 + 2) * 3`) jadi sub-pohon utuh yang menggantung di satu titik. Rekursi grammar = rekursi pohon = rekursi fungsi. Tiga rekursi yang sama.

> **`new_node` dan heap (Bab 9):** tiap node dialokasikan dengan `malloc`. Pohon untuk `3 + 4 * 2` adalah 5 alokasi terpisah yang saling menunjuk lewat pointer. Karena pohonnya dinamis (kita tak tahu sebesar apa ekspresi pengguna saat menulis kode), heap adalah satu-satunya rumah yang masuk akal.

---

## v4 — Evaluator: jalan-jalan di atas pohon

Setelah pohon jadi, menghitungnya nyaris sepele — dan itu pertanda desain yang benar. Evaluator cuma rekursi yang mengikuti bentuk pohon: untuk tiap node, lihat `tag`-nya, lalu lakukan hal yang sesuai. Untuk operasi biner: hitung kiri, hitung kanan, gabungkan.

```c
static double ev(Node *n, Eval *e) {
    switch (n->type) {
        case NODE_NUM:   return n->as.num;
        case NODE_NEG:   return -ev(n->as.neg.child, e);
        case NODE_BINOP: {
            double a = ev(n->as.binop.l, e);   /* rekursi ke anak kiri  */
            double b = ev(n->as.binop.r, e);   /* rekursi ke anak kanan */
            switch (n->as.binop.op) {
                case '+': return a + b;
                case '-': return a - b;
                case '*': return a * b;
                case '/': /* ...cek bagi-nol dulu... */ return a / b;
            }
        }
        /* NODE_VAR, NODE_ASSIGN: lihat tabel variabel */
    }
}
```

`return -ev(child)` untuk negasi adalah satu baris yang menyenangkan: seluruh sub-pohon di bawahnya dihitung dulu oleh rekursi, baru hasilnya dinegasikan. Inilah inti "tree-walking interpreter" — pola yang dipakai dari kalkulator mainan sampai bahasa beneran seperti Ruby versi awal.

---

## v5 — Variabel: sedikit *state*, sebuah mini-bahasa

Satu sentuhan terakhir mengubah kalkulator jadi terasa seperti bahasa: **variabel**. `x = 10` menyimpan, `x` membaca. Penyimpanannya cukup sederhana — array of struct dengan pencarian linear (Bab 8); untuk lusinan variabel ini lebih dari cukup:

```c
typedef struct { char name[NAME_MAX_LEN]; double value; } Var;
static Var   vars[MAX_VARS];
static size_t var_count = 0;
```

Tabel ini `static` di tingkat file sehingga **persist antar baris REPL** — itulah kenapa kamu bisa set `x` di satu baris dan memakainya di baris berikutnya. Penugasan jadi jenis node tersendiri (`NODE_ASSIGN`), dan saat dievaluasi ia memanggil `var_set` lalu mengembalikan nilainya (sehingga `y = x = 5` pun masuk akal).

Membedakan `x = 5` (penugasan) dari `x` (pembacaan) butuh **mengintip dua token**: IDENT lalu `=`. Lihat `parse_statement` di `calc.c` — ia menyimpan posisi, mengintip, dan **mundur** (backtrack) kalau ternyata bukan penugasan. Trik kecil yang dipakai parser sungguhan di mana-mana.

---

## Error: pesan, bukan segfault (Bab 13)

Interpreter yang crash saat input salah itu menyebalkan. Pengguna **pasti** mengetik `2 +`, `1 / 0`, atau `(3 + 4`. Maka di seluruh kode kita memakai pola error sederhana tanpa `setjmp`: sebuah flag `had_error` + buffer pesan dititipkan lewat struct `Parser`/`Eval`. Begitu ada masalah, kita catat pesan **pertama** dan fungsi-fungsi parse berikutnya langsung menyerah (mengembalikan `NULL`).

Coba sendiri:

```sh
> 2 +
  error: angka, variabel, atau '(' yang diharapkan
> 1 / 0
  error: pembagian dengan nol
> (3 + 4
  error: kurung ')' tidak ditemukan
> 2 2
  error: token berlebih di akhir ekspresi
```

Empat input rusak, empat pesan jelas, nol crash. Itulah selisih antara mainan dan alat.

---

## Coba jalankan

```sh
make
./calc                      # REPL interaktif
./calc "1 + 2 * 3"          # sekali jalan lewat argumen   -> 7
echo "(1+2)*(3+4)" | ./calc # lewat pipe (Bab 14/minish!)  -> 21
```

Lalu intip pohonnya sendiri: alur baca yang disarankan adalah `calc.h` (lihat bentuk node) → `next_token` (lexer) → `parse_expr`/`parse_term`/`parse_factor` (parser) → `ev` (evaluator). Empat fungsi itu adalah seluruh interpreter.

---

## Latihan: kembangkan sendiri

Urut dari paling mudah:

1. **Operator modulo `%`.** Tambahkan ke lexer (`T_PERCENT`), ke `parse_term` (level yang sama dengan `*`), dan ke evaluator. *Catatan:* `%` C hanya untuk integer — pakai `fmod` dari `<math.h>` untuk `double`.
2. **Pangkat `^`.** Ini menarik karena **kanan-asosiatif**: `2 ^ 3 ^ 2` = `2 ^ (3^2)` = 512, bukan 64. Butuh aturan grammar baru di antara `factor` dan `primary`. Pikirkan: kenapa rekursi kanan memberi asosiativitas kanan?
3. **Fungsi built-in:** `sqrt(2)`, `sin(x)`, `abs(-3)`. Di `parse_primary`, kalau setelah IDENT ada `(`, parse argumen lalu buat node `NODE_CALL`. `<math.h>` sudah ter-link (`-lm`).
4. **Konstanta** `pi` dan `e`: cukup isi tabel variabel di awal `main`.
5. **Cetak AST** (`--ast` flag): tulis fungsi `print_node` yang mencetak pohon dengan indentasi. Cara terbaik *melihat* preseden bekerja.
6. **Riwayat `ans`:** simpan hasil terakhir ke variabel `ans` setiap baris, supaya bisa `ans * 2`.

Lacak benang merahnya: hampir tiap fitur menyentuh **tiga** tempat yang sama — lexer (token baru), parser (aturan grammar baru), evaluator (arti baru). Begitu pola itu masuk ke tulang, kamu sudah paham kerangka **setiap** interpreter.
