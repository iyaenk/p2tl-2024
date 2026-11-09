# My Maps Explorer — Mobile/PWA

Versi ini adalah Progressive Web App (PWA) yang dapat dipasang dari Chrome Android setelah di-host melalui HTTPS (misalnya GitHub Pages).

## Fitur
- Tampilan responsif untuk HP dan desktop.
- Instalasi ke layar utama Android melalui Chrome.
- Impor KML/KMZ dari Google My Maps.
- Pencarian, daftar layer, marker, garis, poligon, popup, GPS.
- App shell dapat dibuka dari cache setelah pernah dimuat.

## Catatan offline
Aplikasi shell disimpan di cache. Namun peta dasar, tile, dan library pihak ketiga masih memerlukan internet. File KML/KMZ yang diimpor saat ini dimuat di sesi browser dan belum disimpan permanen untuk pemakaian lintas sesi.

## Deploy ke GitHub Pages
1. Buat repository GitHub.
2. Unggah semua isi folder ini ke root repository.
3. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
4. Tunggu sampai GitHub Pages menerbitkan alamat HTTPS.
5. Buka alamat tersebut di Chrome Android.
6. Pilih menu Chrome → Install app / Tambahkan ke layar utama, atau gunakan tombol Pasang aplikasi jika muncul.

## Sumber data
Ekspor seluruh peta Google My Maps sebagai KML/KMZ, lalu impor melalui tombol di aplikasi.

## APK native
Paket ini belum berupa APK. Jika ingin APK native, proyek web ini dapat dibungkus dengan Capacitor dan dibangun menggunakan Android Studio. Untuk itu perlu konfigurasi Android dan proses build tersendiri.
