# Aylık Veri Girişi — Kurulum ve Kullanım

## Kurulum (tek seferlik)

Repo zaten GitHub'a yüklendiyse ek bir kurulum gerekmiyor — `.github/ISSUE_TEMPLATE/oran-guncelle.yml` ve `.github/workflows/oran-girisini-isle.yml` dosyaları repoda olduğu sürece sistem hazırdır. Sadece şunu bir kez kontrol edin:

1. [github.com/fulyahukuk-sys/kira-hesap-verisi/settings/actions](https://github.com/fulyahukuk-sys/kira-hesap-verisi/settings/actions) sayfasında **Actions**'ın etkin olduğundan emin olun (genelde varsayılan olarak açıktır).
2. Aynı sayfada **"Workflow permissions"** altında **"Read and write permissions"** seçili olmalı (iş akışının commit atabilmesi için).

## Her ay yapılacak (tek adım, ~30 saniye)

TÜİK her ayın 3'ünde (bazen birkaç gün gecikebilir) "12 Aylık Ortalamalara Göre % Değişim" oranını açıklar — bu rakam aynı gün haberlerde de çıkar.

1. [github.com/fulyahukuk-sys/kira-hesap-verisi/issues/new/choose](https://github.com/fulyahukuk-sys/kira-hesap-verisi/issues/new/choose) adresine gidin.
2. **"Aylık TÜFE / Yİ-ÜFE Oranı Girişi"** formunu seçin.
3. Ay, yıl ve TÜFE (varsa Yİ-ÜFE) yüzdesini girip **"Submit new issue"** butonuna basın.
4. Birkaç dakika içinde (genelde 30-60 saniye) sistem otomatik işler; issue'da "✅ Güncellendi" yorumunu görünce iş tamamdır — issue kendiliğinden kapanır.
5. Bir hata olursa (örn. sayı yanlış yazıldıysa) issue **açık kalır** ve neyin yanlış gittiği yorum olarak yazılır; o issue'yu kapatıp doğru değerlerle yeni bir form gönderin.

Bu tek giriş, hem tam geçmiş hesaplayıcıya hem basit hesaplayıcıya otomatik yansır (ikisi de aynı `data/oranlar.json` dosyasını okuyor).

## EVDS otomasyonu (şu an duraklatılmış, referans için)

`otomasyon/fetch-oranlar.mjs`, TCMB'nin eski EVDS API'sinden otomatik çekim yapacak şekilde yazılmıştı. TCMB'nin 2026'da EVDS'i "EVDS3" ile yenilemesiyle bu eski API kapandı ve yeni sistem basit bir API anahtarıyla değil oturum açarak çalışıyor gibi görünüyor. Bu yüzden ilgili zamanlanmış iş akışı (`aylik-veri-guncelle.yml`) şimdilik yalnızca elle tetiklenebilir durumda bırakıldı.

TCMB'nin resmi/belgelenmiş bir API yayınlayıp yayınlamadığı ayda bir otomatik olarak kontrol ediliyor. Böyle bir API bulunursa `fetch-oranlar.mjs` güncellenip zamanlayıcı tekrar açılabilir — o zaman bu KURULUM.md dosyası da güncellenecek. Şimdilik yukarıdaki Issue Form yöntemi kullanılmalı.
