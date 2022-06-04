---
redirect_from: "/"
---
[hello](hllo.md)

# PENGENALAN JAVA
## **1.1 Sejarah Singkat Java**

Pada 1991, sekelompok insinyur Sun dipimpin oleh Patrick Naughton dan James Gosling ingin merancang bahasa komputer untuk perangkat konsumer seperti cable TV Box. Dikarenakan perangkat tersebut tidak memiliki banyak memori, bahasa harus berukuran kecil dan mengandung kode yang liat. Juga karena manufaktur – manufaktur berbeda memilih processor yang berbeda pula, maka bahasa harus bebas dari manufaktur manapun. Proyek diberi nama kode **”Green”**.

Kebutuhan untuk fleksibilitas,  kecil,  liat dan kode yang netral terhadap platform  mengantar tim mempelajari implementasi Pascal yang pernah dicoba. Niklaus Wirth, pencipta bahasa Pascal telah merancang bahasa portabel yang menghasilkan intermediate code untuk mesin hipotesis. Mesin ini sering disebut dengan mesin maya (virtual machine). Kode ini kemudian dapat  digunakan  di  sembarang mesin yang memiliki interpreter. Proyek Green menggunakan mesin maya untuk mengatasi isu utama tentang netral terhadap arsitektur mesin.

Karena orang–orang  di  proyek  Green  berbasis  C++  dan  bukan  Pascal  maka kebanyakan sintaks diambil dari C++, serta mengadopsi orientasi objek dan bukan prosedural. Mulanya bahasa yang diciptakan diberi nama ”Oak” oleh James Gosling yang mendapat inspirasi dari sebuah pohon yang berada pada seberang kantornya, namun dikarenakan nama Oak sendiri merupakan nama bahasa pemrograman yang telah ada sebelumnya, kemudian SUN menggantinya dengan JAVA. Nama JAVA sendiri  terinspirasi  pada saat mereka  sedang menikmati secangkir kopi di sebuah kedai kopi yang kemudian dengan tidak sengaja salah  satu dari mereka menyebutkan kata JAVA yang mengandung arti asal bijih kopi. Akhirnya mereka sepakat untuk memberikan nama bahasa pemrograman tersebut dengan nama Java.

Produk pertama proyek Green adalah Star 7 (*7), sebuah kendali jarak jauh yang sangat cerdas. Dikarenakan pasar masih belum tertarik dengan produk konsumer cerdas  maka  proyek Green harus menemukan pasar lain dari teknologi yang diciptakan. Pada saat yang sama, implementasi WWW dan Internet sedang mengalami perkembangan pesat. Di lain  pihak, anggota dari proyek  Green  juga menyadari  bahwa  Java  dapat digunakan  pada pemrograman internet,  sehingga penerapan selanjutnya mengarah menjadi teknologi yang berperan di web.

## **1.2	Karakteristik Java**
Berdasarkan white paper resmi dari SUN, Java memiliki karakteristik berikut :
1.	Sederhana
Bahasa pemrograman Java menggunakan sintaks mirip dengan C++ namun sintaks pada Java  telah banyak  diperbaiki terutama  menghilangkan penggunaan pointer yang rumit dan multiple inheritance. Java juga menggunakan automatic memory  allocation dan memory garbage collection.

2. Berorientasi objek (Object Oriented)
Java mengunakan pemrograman berorientasi objek yang membuat program dapat dibuat secara modular dan dapat dipergunakan kembali. Pemrograman berorientasi objek memodelkan dunia nyata kedalam objek dan melakukan interaksi antar objek- objek tersebut.
3.	Dapat didistribusi dengan mudah
Java dibuat untuk membuat aplikasi terdistribusi secara mudah dengan adanya libraries networking yang terintegrasi pada Java.
4.	Interpreter
Program Java dijalankan menggunakan interpreter yaitu Java  Virtual Machine (JVM). Hal ini menyebabkan source code Java yang telah dikompilasi menjadi Java bytecodes dapat dijalankan pada platform yang berbeda-beda.
5.	Robust
Java mempuyai reliabilitas yang tinggi. Compiler pada Java mempunyai kemampuan mendeteksi error secara lebih teliti dibandingkan bahasa pemrograman lain. Java mempunyai runtime-Exception handling untuk membantu mengatasi error pada pemrograman.
6.	Aman
Sebagai bahasa  pemrograman  untuk  aplikasi  internet  dan  terdistribusi,  Java memiliki beberapa mekanisme keamanan untuk menjaga aplikasi tidak digunakan untuk merusak sistem komputer yang menjalankan aplikasi tersebut.
7.	Architecture Neutral
Program Java merupakan platform independent. Program cukup mempunyai satu buah versi yang dapat dijalankan pada platform yang berbeda dengan Java Virtual Machine.
8.	Portabel
Source code maupun program  Java dapat dengan mudah dibawa  ke platform yang berbeda-beda tanpa harus dikompilasi ulang.
9.	Performance
Performance pada Java sering dikatakan kurang tinggi. Namun performance Java dapat ditingkatkan  menggunakan  kompilasi  Java lain  seperti  buatan Inprise, Microsoft ataupun Symantec yang menggunakan Just In Time Compilers (JIT).
10.	Multithreaded
Java mempunyai  kemampuan  untuk  membuat  suatu  program  yang  dapat melakukan beberapa pekerjaan secara sekaligus dan simultan.
11.	Dinamis
Java didesain untuk dapat dijalankan pada lingkungan yang dinamis. Perubahan pada suatu class  dengan  menambahkan  properties  ataupun  method  dapat dilakukan tanpa menggangu program yang menggunakan class tersebut.

## **1.3	Sebagian Fitur dari JAVA**
### **1.3.1	Java Virtual Machine**
JVM adalah sebuah mesin imajiner (maya) yang bekerja dengan menyerupai aplikasi pada sebuah mesin nyata. JVM menyediakan spesifikasi hardware dan platform dimana kompilasi kode Java terjadi. Spesifikasi inilah yang membuat aplikasi berbasis Java menjadi bebas dari platform manapun karena proses kompilasi diselesaikan oleh JVM.

Aplikasi program Java diciptakan dengan file teks berekstensi  **.java**. Program ini dikompilasi menghasilkan satu berkas bytecode berekstensi **.class** atau lebih. Bytecode adalah serangkaian instruksi serupa instruksi kode mesin. Perbedaannya adalah kode mesin harus dijalankan pada sistem komputer dimana kompilasi ditujukan, sementara bytecode berjalan pada java interpreter yang tersedia di semua platform sistem komputer dan sistem operasi.

### **1.3.2	Garbage Collection**
Banyak bahasa pemrogaman lain yang mengijinkan seorang programmer mengalokasikan memori pada saat dijalankan. Namun, setelah menggunakan alokasi memori tersebut,  harus terdapat cara untuk menempatkan kembali blok memori tersebut supaya program lain dapat menggunakannya. Dalam C, C++ dan  bahasa lainnya,  adalah  programmer yang mutlak bertanggung jawab akan hal ini. Hal ini dapat menyulitkan bilamana programmer tersebut alpa untuk mengembalikan blok memori sehingga menyebabkan situasi yang dikenal dengan nama memory leaks.

Program Java  melakukan  garbage collection yang  berarti  program  tidak  perlu  menghapus sendiri objek–objek yang tidak digunakan  lagi. Fasilitas  ini mengurangi beban pengelolaan memori oleh programmer dan mengurangi atau mengeliminasi sumber kesalahan terbesar yang terdapat pada bahasa yang memungkinkan alokasi dinamis.

### **1.3.3	Code Security**
Code Security terimplementasi pada Java melalui penggunaan Java  Runtime Environment (JRE). Java menggunakan model pengamanan 3 lapis untuk melindungi sistem dari untrusted Java Code.
1.	Pertama, class-loader menangani pemuatan kelas Java ke runtime interpreter. Proses ini menyediakan pengamanan dengan memisahkan kelas–kelas yang berasal dari local disk dengan kelas–kelas yang diambil dari jaringan. Hal ini membatasi aplikasi Trojan karena kelas–kelas yang berasal dari local disk yang dimuat terlebih dahulu.
2.	Kedua, bytecode verifier membaca bytecode sebelum dijalankan dan menjamin bytecode memenuhi aturan–aturan dasar bahasa Java.
3.	Ketiga, manajemen keamanan menangani keamanan tingkat aplikasi dengan mengendalikan apakah program berhak mengakses sumber daya seperti sistem file, port jaringan, proses eksternal dan sistem windowing.
Setelah seluruh proses tersebut selesai dijalankan, barulah kode program di eksekusi.
Java juga menyediakan beragam teknik pengamanan lain :
1.	Bahasa dirancang untuk  mempersulit  eksekusi kode  perusak.  Peniadaan pointer  merupakan langkah besar pengamanan. Java tidak mengenal operasi pointer. Di tangan  programmer handal, operasi pointer merupakan hal yang luar biasa  untuk  optimasi  dan pembuatan program yang efisien serta mengagumkan. Namun mode ini dapat menjadi petaka di  hadapan programmer  jahat. Pointer merupakan sarana  luar biasa untuk pengaksesan tak diotorisasi. Dengan peniadaan operasi pointer, Java dapat menjadi bahasa yang lebih aman.
2.	Java memiliki beberapa pengaman terhadap applet. Untuk mencegah program bertindak mengganggu media penyimpanan, maka  applet tidak diperbolehkan melakukan open,  read ataupun write  terhadap berkas  secara sembarangan.  Karena  Java  applet dapat

membuka jendela browser yang baru, maka jendela mempunyai logo Java dan teks identifikasi terhadap jendela yang dibuka. Hal ini mencegah jendela pop-up menipu sebagai permintaan keterangan username dan password.


## **1.4	Fase Pemrograman JAVA**
Gambar 1.1 fase fase pemrogramman

1. Membuat Source Code program dengan menggunakan editor text atau software pihak ketiga lainnya yang dapat memudahkan dalam membuat program dengan bahasa java. Kode program yang dibuat kemudian disimpan dalam sebuah berkas berekstensi **.java**
2.	Proses kompilasi (Compile), proses ini memeriksa kode program terjadi kesalahan atau tidak.
3.	Hasil dari proses compile adalah sebuah berkas bytecode yang berekstensi **.class**
4.	Class hasil compile yang berupa bytecode dapat dijalankan pada semua platform  yang  memiliki **Java Virtual Machine.**

## **1.5	Token**
Token adalah elemen terkecil dari program yang masih memiliki arti bagi kompilator. Token didalam java terbagi menjadi 5 (lima).
Gambar 1.2 Token didalam java terbagi menjadi 5.


### **1.5.1	Identifier**
Java Identifier adalah suatu tanda yang mewakili nama-nama variabel, method, class, dsb. Pendeklarasian Java adalah case-sensitive. Hal ini berarti bahwa  Identifier  :  Hello  tidak  sama dengan hello. Identifier harus dimulai dengan salah satu huruf, underscore “_”, atau tanda dollar “$”. Hurufnya dapat berupa huruf besar maupun huruf kecil.  Karakter selanjutnya  dapat menggunakan nomor 0 smpai 9.

Syarat penamaan sebuah identifier:
1.	Tidak boleh dimulai dengan angka.
2.	Tidak boleh mengandung karakter khusus kecuali “_” dan ”$”.
3.	Tidak boleh mengandung karakter putih (white space).
4.	Tidak boleh menggunakan keyword java.

Tabel 1.1 Contoh Penulisan Identifier

### **1.5.2	Keyword**
Keyword (kata kunci) adalah identifier yang telah dipesan atau didefinisikan sebelumnya oleh Java untuk tujuan tertentu. Anda tidak dapat menggunakan  keyword  sebagai  nama variabel, class, method , dsb.
Berikut ini adalah daftar dari kata kunci dalam Java (Java Keywords):



|            |             |           |            |        |
| ---------- | ----------- | --------- | ---------- | ------ |
| abstract   | assert      | boolean   | break      | byte   | 
| case       | catch       | char      | class      | const  | 
| continue   | default     | do        | double     | else   | 
| enum       | extends     | final     | finally    | float  | 
| for        | if          | goto      | implements | import | 
| instanceof | int         | interfaca | long       | native | 
| new        | package     | private   | protected  | public | 
| return     | short       | static    | strictfp   | super  | 
| switch     | syncronized | this      | throw      | throws | 
| transient  | try         | void      | volatile   | while  | 


### **1.5.3	Literal**
Penulisan besaran untuk variabel adalah penting, literal Java terdiri dari angka, karakter, dan string. Angka terdiri dari bilangan bulat (integer), bilangan mengambang (floating point), dan boolean. Nilai boolean untuk true dan false direpresentasikan sebagai 1 dan 0. Karakter selalu mengacu ke karakter Unicode. String berisi rangkaian karakter. String literal merepresentasikan banyak karakter dan muncul di dalam pasangan tanda petik ganda (”...”).
Literal karakter direpresentasikan satu karakter Unicode tunggal dan muncul di pasangan tanda petik tunggal (‟...‟). Serupa C/C++, karakter khusus (seperti karakter kendali dan karakter yang tidak dapat dicetak) direpresentasikan dengan backslash (\) diikuti kode karakter.

### **1.5.4	Operator**
Operator menspesifikasikan evaluasi atau komputasi terhadap objek. Operan yang dioperasikan dapat berupa literal, variabel, atau nilai yang dikirim oleh metode atau fungsi.
Macam-macam operator pada java:
1.	Operator Aritmatika
2.	Operator Relasi
3.	Operator Logika
4.	Operator Kondisi

Tabel 1.3 Daftar Separotor pada Java


## **1.6	Program Sederhana Java**
Sebuah file kode sumber (dengan ekstensi java.) Memegang satu definisi kelas. Kelas tersebut merupakan bagian dari program, meskipun aplikasi yang sangat kecil mungkin perlu hanya satu kelas. Kelas harus memiliki sepasang kurung kurawal.

```java
public class Main{
  public static void main(String[] args){
    System.out.println("Hello world");
  }
}
```

## **1.7	Komentar Pada Java**
Komentar adalah  catatan  yang  ditulis  pada  kode  dengan  tujuan  sebagai  bahan dokumentasi. Komentar membantu programmer untuk mengkomunikasikan dan memahami program. Komentar tersebut bukan bagian dari program (bukan statement) dan diabaikan oleh kompiler sehingga tidak mempengaruhi jalannya program.

Terdapat 3 cara penulisan komentar pada java:
1.	Menggunakan dua garis miring (//)
Semua teks setelah tanda // dianggap sebagai komentar. Contoh:
```java
// ini adalah komentar satu baris single line comment
```

2.	Menggunakan sepasang /* dan */
Cara ini digunakan untuk membuat komentar dalam beberapa baris.
Diawali dengan /* dan diakhiri dengan */, semua teks yang berada diantara dua tanda tersebut dianggap sebagai komentar.
Contoh:
```java
/* ini adalah contoh komentar yang ditulis dalam 2 baris atau juga disebut dengan multilines comments */
```

3.	Komentar khusus javadoc
Komentar javadoc khusus digunakan untuk men-generate dokumentasi HTML untuk program Java Anda. Anda dapat menciptakan komentar javadoc dengan  memulai baris dengan __/**__ dan mengakhirinya dengan __*/__.
```java
/**
*	Write a description of class MateriTiga here.
*	@author (your name)
*	@version (a version number or a date)
*/
```
Gambar 1.2 Penjelasan Class Sederhana

## **Praktikum**
```java
/**
* Mengetahui cara menuliskan komentar pada java
* @author Teknik Informatika Unindra
*/

public class PraktikumDua{
  public static void main(String[] args){
  // Menampilkan NPM (Komentar Satu Baris)
  System.out.println(“NPM : ”);

  /* Contoh Komentar Lainnya */
  System.out.println(“Nama : ”);

  /* Komentar
  ini lebih
  Dari satu baris */
  System.out.println(“Teknik Informatika”);
  }
}
```


# **BAB 2 TIPE DATA, VARIABEL, KONSTANTA**
## **2.1	TIPE DATA**
Tipe data mendefinisikan metode penyimpanan untuk mereperesentasikan informasi dan cara informasi diinterprentasikan. Tipe data berkaitan erat dengan penyimpanan variabel di memori, karena tipe data variabel menentukan cara kompilator menginterpretasikan isi memori. Tipe data dalam Java dibagi 2 kategori; tipe data sederhana (primitive types) dan tipe data komposit (reference types).

### **2.1.1	Tipe data sederhana (primitive types)**
Bahasa pemrograman Java mendefinisikan delapan tipe data primitif. Mereka diantaranya adalah boolean (untuk bentuk logika), char (untuk bentuk tekstual), **byte**, **short**, **int**, **long** (integer), **double** and **float** (floating point).

a. Byte\
Tipe ini adalah tipe terkecil dari tipe integer. Tipe byte pada umumnya digunakan pada saat kita bekerja dengan sebuah data stream dari suatu file maupun jaringan, yaitu untuk keperluan proses membaca / menulis. Rentang nilai byte adalah `-128` s.d `127`.

Untuk mendeklarasikan variabel bertipe `byte`, perlu menggunakan kata kunci `byte`. Berikut ini contoh pendeklarasian tiga buah variabel bertipe `byte`.

    byte a;
    byte b, c = 20; 
    byte x = 121;

b.	Short\
Tipe ini merupakan tipe 16-bit yang berada pada rentang nilai `-32.768` s.d `32.767`. Untuk mendeklarasikan variabel bertipe `short`, perlu menggunakan kata kunci `short`. Berikut ini contoh pendeklarasian tiga buah variabel bertipe `short`.

    hort a;
    short b, c = 20; 
    short x = 121;

c.	Int\
Tipe ini adalah tipe yang paling banyak digunakan untuk merepresentasikan nilai integer. Karena dianggap paling efisien dibandingkan dengan tipe – tipe integer lainnya. Tipe data ini memiliki rentang nilai `-2147483648` s.d `2147483647`. Berikut ini contoh pendeklarasian tiga buah variabel bertipe `int`.
    
    int a;
    int b, c = 20; 
    int x = 32789;

d.	Long\
Long adalah tipe 64-bit bertanda. Tipe ini digunakan untuk kasus – kasus tertentu yang nilainya berada di luar rentang tipe `int`. Dengan kata lain, tipe `long` biasanya terpaksa digunakan

pada saat tipe int sudah tidak cukup lagi menampungnya. Berikut ini contoh pendeklarasian tiga buah variabel bertipe `long`.

    long a;
    int b, c = 24569845632; 
    int x = 327891345;

e.	Float\
Dispesifikasikan dengan kata kunci `float`, menggunakan 32-bit untuk menyimpan nilai. Ketelitian tunggal diolah lebih cepat pada sejumlah prosesor dan hanya mengambil ruang setengahnya, tetapi akan mulai tidak teliti jika nilai yang diolah terlalu besar atau terlalu kecil. Perhitungan sederhana  yang  membutuhkan  hanya  sedikit  ketelitian  pecahan,  misalkan perhitungan total suatu besaran, dimana kita hanya membutuhkan ketelitian sepersepuluh, dapat direperesentasikan dengan tepat, yaitu dengan `float`. Berikut contoh deklarasi variabel `float` :

    float a;
    float b, c = 0.56; 
    float x = 33.49;

f.	Double\
Dinyatakan dengan kata kunci double, menggunakan 64-bit untuk menyimpan nilai. Semua fungsi matematis transcendental, seperti sin, cos, dan sqrt, menghasilkan besaran double. Jika kita ingin menjaga ketelitian sampai banyak perulangan perhitungan atau mengolah bilangan besar, double adalah pilihan terbaik. Berikut contoh deklarasi variabel double :

    double luas;
    double pi = 3.1416; 
    double inch = 2.54;

Untuk lebih jelasnya lihat tabel dibawah ini:
Tabel 2.1 Daftar Tipe Data Sederhana

### **2.1.2	Tipe data komposit (reference types)**
Komposit, Tipe data komposit disusun dari tipe data sederhana atau tipe komposit lain yang telah ada. Tipe ini antara lain: `String`, `array`, `class`, dan `interface`.


## **2.2	VARIABEL**
Variabel adalah tempat menampung data atau menampung suatu nilai. Dikatakan variabel karena nilai yang ditugaskan kepadanya dapat diubah. Dalam pemrograman java, setiap variabel harus dideklarasikan (diperkenalkan) terlebih dahulu dengan memberitahukan kepada kompiler nama variabel dan tipe datanya. Bentuk umum deklarasi variabel adalah sebagai berikut:
    
    tipedata namaVariabel;

Berikut adalah beberapa contoh deklarasi variabel:

    int panjang; 
    int lebar; 
    double luas;
    float kelililingLingkaran;


Jika beberapa variabel bertipe sama, maka dapat dideklarasikan secara bersamaan, dengan dipisahkan tanda koma (,) sebagai berikut:

    int panjang, lebar, tinggi;
    double luasLingkaran, luasSegitiga;


Variabel seringkali memiliki nilai awal. Anda bisa mendeklarasikan suatu variabel dan sekaligus menginisialisasikannya. Sebagai contoh:

    int tinggi = 6;
    int tinggi = 6, panjang = 5;


Setiap pendeklarasian sebuah variabel harus diakhiri dengan sebuah semicolon „;‟. Semicolon dibutuhkan karena pendeklarasian sebuah variabel adalah sebuah statement di Java. Variabel merupakan sebuah identifier di java, maka syarat penamaan sebuah variabel mengikuti aturan penamaan identifier.


## **2.3	KONSTANTA**
Konstanta sama seperti variabel, tetapi suatu konstanta merepresentasikan data permanen yang tidak dapat diubah. Suatu konstanta harus dideklarasikan dan diinisialisasikan dalam statement yang sama. Kata  `final` merupakan kata kunci (keyword) dalam  java  untuk  mendeklarasikan suatu konstanta. Bentuk umum deklarasi konstanta adalah sebagai berikut:

    final tipedata NAMA_KONSTANTA = nilai;

Contoh deklarasi konstanta:

    final double PI = 3.14159;
    final String KAMPUS = “Unindra”;

Praktikum
```java
/*
* Praktikum Tiga
* Mengetahui cara penggunaan variabel dan menampilkannya
* @author Teknik Informatika Unindra
*/

public class PraktikumTiga{
  public static void main(String[] args){
  //membuat variabel panjang
  int panjang;

  //membuat variabel lebar dan langsung inisialisasi nilai
  int lebar = 8;

  //membuat variabel luas
  double luas;

  panjang = 10;
  luas = panjang * lebar;

  //Menampilkan (mencetak) data pada console
  System.out.println(“Panjang = “ + panjang);
  System.out.println(“Lebar = “ + lebar);
  System.out.println(“Luas = “ + luas);
  }
}

```

## **Latihan**
1.	Buatlah sebuah program untuk menghitung luas lingkaran yang didalamnya terdapat konstantan bernama PI (3.14159), dan menampilkan hasilnya pada console;

2.	Buatlah sebuah program untuk menghitung luas segitiga dan menampilkan hasilnya pada console;



# **OPERATOR**
Operator dapat diartikan juga simbol yang biasa digunakan dalam menulis suatu pernyataan dalam bahasa pemrograman. Operator akan melakukan suatu operasi terhadap operand sesuai dengan fungsinya. Operator ini mengikuti bermacam-macam prioritas yang pasti sehingga compilernya akan tahu yang mana operator untuk dijalankan lebih  dulu  dalam   kasus beberapa operator yang dipakai bersama-sama dalam satu pernyataan.

## 3.1	**Operator Penugasan**
Setelah suatu variabel dideklarasikan anda bisa menugaskan suatu nilai kepadannya menggunakan operator penugasan. Dalam java tanda “sama dengan” (=) digunakan sebagai operator penugasan. Contoh operator penugasan:

    int x = 1;          //penugasan 1 kepada variable x
    double luas = 1.0;  // penugasan 1.0 kepada luas 
    x = 5 * (2 + 4);

## 3.2	**Operator Aritmatika**
Operator aritmatika mencakup: penjumlahan (+), pengurangan (-), perkalian (*), pembagian (/), dan modulus (%).

| Operator |	Arti             |	Contoh  |	Hasil |
|----------|---------------------|----------|---------| 
| +	       | Penjumlahan	     | 5 + 4    |9        |
| -	       | Pengurangan	     | 10 – 7   |3        |
| *	       | Perkalian	         | 8 * 2    |16       |
| /	       | Pembagian	         | 10 / 5   |2        |
| %	       | Modulus (Sisa bagi) | 25 % 3   |1        |

Ketika dua operand dari operator pembagian adalah integer, maka hasilnya akan **integer**.
Bagian fraksional akan dibuang. Misalnya, 5/2 akan menghasilkan **2**, bukan **2.5**.

## 3.3	**Operator Penaikan dan Penurunan**
Operator ini biasa disebut dengan operator increment dan decrement. Operator ini digunakan untuk menaikkan atau menurunkan suatu nilai integer (bilangan bulat) sebanyak satu (1) satuan dan hanya dapat digunakan pada variabel.
Sebagai contoh, pernyataan

     hitung = hitung + 1; //menambahkan variabel hitung dengan 1 
sama dengan: 

    hitung++;

Tabel 3.2 Operator Increment dan Decrement


## 3.4	**Operator Relasional**
Operator ini digunakan untuk membandingkan dua buah nilai operand dan menghasilkan nilai Boolean, yaitu true atau false.
Java menyediakan enam operator relasional, seperti yang ditunjukkan pada tabel yang dapat digunakan untuk membandingkan dua nilai.

Tabel 3.3 Operator Relasional


## 3.5	**Operator Logika**
Operator logika memiliki satu atau lebih operand boolean yang menghasilkan nilai boolean, dengan kata lain operator ini hanya dapat digunakan untuk operand yang bertipe boolean.
Terdapat 6 operator logika dalam java, yaitu: `&&` (logika AND), `&` (boolean logika AND), `||`
(logika OR), | (boolean logika inclusive OR), `^` (boolean logika exclusive OR), dan `!` (logika NOT).

### 3.5.1	**Operator AND (&&) dan boolean logika AND (&)**
Hasil operator AND bernilai `true` jika dan hanya jika kedua operand memiliki nilai boolean
`true`. Berikut ini adalah tabel kebenaran untuk AND

Tabel 3.4 Tabel Kebenaran Operator AND

### 3.5.2	**Operator OR (||) dan boolean logika OR (|)**
Hasil operator OR bernilai `true` jika salah satu dari operand memiliki nilai boolean true.
Berikut ini adalah tabel kebenaran untuk OR:
Tabel 3.4 Tabel Kebenaran Operator AND

### 3.5.3	**Operator exclusive OR (^)**
Hasil operator exclusive OR bernilai true jika dan hanya jika kedua operand memiliki nilai boolean yang berbeda. Berikut ini adalah tabel kebenaran untuk exclusive OR:
Tabel 3.4 Tabel Kebenaran Operator OR
|  P1  |  P2  |  P1 ^ P2  |
|------|------|-----------|
|true  |true  |false      |
|false |true  |true       |
|true  |false |true       |
|false |false |false      |

### **3.5.4	Operator NOT (!)**
Logika NOT digunakan dalam satu argumen, dimana argumen tersebut dapat menjadi suatu pernyataan, variabel atau konstanta. Berikut adalah tabel kebenaran untuk NOT:
Tabel 3.4 Tabel Kebenaran Operator AND
|P1	   |!P1   |
|------|------|
|true  |false |
|false |true  |



