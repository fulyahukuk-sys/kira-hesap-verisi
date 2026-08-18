# Otomatik TÜFE/Yİ-ÜFE Güncelleme — Kurulum

Bu kurulum **bir kez** yapılır; sonrasında sistem her ayın 3'ünde kendiliğinden çalışır, sizin elle bir şey yapmanız gerekmez.

## 1) GitHub reposu oluşturun (ücretsiz)

1. https://github.com adresinde ücretsiz bir hesap açın (yoksa).
2. Yeni bir **private veya public** repo oluşturun, örn. `kira-hesap-verisi`.
3. Bu klasördeki tüm dosyaları (`.github/`, `otomasyon/`, `data/`, `widget/`) o repoya yükleyin.

## 2) TCMB EVDS API anahtarı alın (ücretsiz)

1. https://evds2.tcmb.gov.tr adresine gidin, sağ üstten **Kayıt Ol** ile ücretsiz üye olun.
2. Üyelik onaylandıktan sonra "Profilim" bölümünden **API Anahtarınızı** kopyalayın.

## 3) TÜFE ve Yİ-ÜFE seri kodları (doğrulandı ✓)

`otomasyon/fetch-oranlar.mjs` dosyasındaki kodlar, EVDS3 arayüzünde "Tablo Oluştur" ile üretilen gerçek sütun başlıklarından bizzat doğrulandı (18.08.2026):

- TÜFE → **Tüketici Fiyat Endeksi (TÜİK) → Genel Endeks (2003=100)** → `TP.GENENDEKS.T1`
- Yİ-ÜFE → **Yurt İçi Üretici Fiyat Endeksi (TÜİK) → 1.Yurt İçi Üretici Fiyat Endeksi** → `TP.TUFE1YI.T1`

Ekstra bir işlem gerekmiyor. TÜİK ileride bu serileri değiştirir/yeni taban yılına geçerse (örn. 2003=100'den 2025=100'e geçiş süreci gibi), aynı yöntemle (EVDS'te seriyi bulup "Tablo Oluştur" ile sütun başlığını okuyarak) yeni kodu bulup GitHub repo secret'ı olarak `TUFE_SERI_KODU` / `YIUFE_SERI_KODU` adlarıyla eklemeniz yeterli (script önce ortam değişkenine bakar, dosyadaki varsayılanı ezer).

> Script, ham endeks verisinden TÜİK'in resmi yöntemiyle ("son 12 ayın ortalaması / önceki 12 ayın ortalaması") oranı kendisi hesaplar. Bu sayede TÜİK'in ilan ettiği yüzdeyle bire bir örtüşür. Hesaplanan değer mantıksız görünürse (negatif, %500 üzeri vb.) script veri **yazmadan** hata ile durur — repo Actions sekmesinde kırmızı çarpı olarak görünür ve GitHub size otomatik e-posta atar.

## 4) API anahtarını GitHub'a secret olarak ekleyin

Repo sayfasında: **Settings → Secrets and variables → Actions → New repository secret**
- Name: `EVDS_API_KEY`
- Value: (2. adımda aldığınız anahtar)

## 5) Actions'ı etkinleştirin

Repo sayfasında **Actions** sekmesine girip iş akışlarını etkinleştirin (genelde ilk yüklemede otomatik açıktır). `.github/workflows/aylik-veri-guncelle.yml` artık her ayın 3'ünde otomatik çalışacak. Elle test etmek isterseniz Actions sekmesinden "Aylık TÜFE/Yİ-ÜFE Güncelleme" iş akışını **Run workflow** ile tetikleyebilirsiniz.

## 6) Widget'ı canlı veriye bağlayın

`widget/kira-hesap-widget.html` ve `widget/kira-basit-hesap.html` içindeki şu satırı bulup kendi bilgilerinizle değiştirin:

```js
const ORANLAR_JSON_URL = "https://raw.githubusercontent.com/KULLANICI_ADI/REPO_ADI/main/data/oranlar.json";
```

`KULLANICI_ADI` ve `REPO_ADI` kısmını GitHub kullanıcı adınız ve repo adınızla değiştirin (repo **public** olmalı, aksi halde raw.githubusercontent.com erişemez).

## Bundan sonra ne oluyor?

- Her ayın 3'ünde saat 10:15, 12:15, 15:15 ve 18:15'te (TÜİK'in açıklama saatine göre birkaç deneme) sistem otomatik çalışır, `data/oranlar.json` dosyasını günceller ve GitHub'a otomatik commit'ler.
- Widget'lar sayfa her açıldığında bu dosyayı doğrudan GitHub'dan çeker; siz hiçbir şey yapmazsınız.
- Bir ay veri çekilemezse (TÜİK gecikirse, seri kodu bozulursa vb.) Actions sekmesinde başarısız çalışma görünür ve GitHub hesabınıza otomatik e-posta gelir — sessizce yanlış veri asla yazılmaz.
- CDN kaynağına geçici olarak ulaşılamazsa widget'lar otomatik olarak kendi içine gömülü yedek tabloyu kullanır ve kullanıcıya küçük bir not gösterir.
