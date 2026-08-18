# Otomatik TÜFE/Yİ-ÜFE Güncelleme — Kurulum

Bu kurulum **bir kez** yapılır; sonrasında sistem her ayın 3'ünde kendiliğinden çalışır, sizin elle bir şey yapmanız gerekmez.

## 1) GitHub reposu oluşturun (ücretsiz)

1. https://github.com adresinde ücretsiz bir hesap açın (yoksa).
2. Yeni bir **private veya public** repo oluşturun, örn. `kira-hesap-verisi`.
3. Bu klasördeki tüm dosyaları (`.github/`, `otomasyon/`, `data/`, `widget/`) o repoya yükleyin.

## 2) TCMB EVDS API anahtarı alın (ücretsiz)

1. https://evds2.tcmb.gov.tr adresine gidin, sağ üstten **Kayıt Ol** ile ücretsiz üye olun.
2. Üyelik onaylandıktan sonra "Profilim" bölümünden **API Anahtarınızı** kopyalayın.

## 3) TÜFE ve Yİ-ÜFE seri kodlarını doğrulayın (ÖNEMLİ)

Hukuki bir hesaplama aracı olduğu için bu adım atlanmamalıdır: `otomasyon/fetch-oranlar.mjs` dosyasının başındaki `TUFE_SERI_KODU` ve `YIUFE_SERI_KODU` değerleri en olası kodlarla dolduruldu, ancak EVDS arayüzünden **kendiniz doğrulamalısınız**:

1. https://evds2.tcmb.gov.tr adresinde "Seri Mağazası" arama kutusuna **"Tüketici Fiyat Endeksi Genel"** yazın, çıkan serinin kodunu not edin.
2. Aynı şekilde **"Yurt İçi Üretici Fiyat Endeksi Genel"** için de kodu not edin.
3. Kodlar dosyadakiyle aynıysa bir şey yapmanıza gerek yok. Farklıysa, GitHub repo secret'ı olarak `TUFE_SERI_KODU` ve `YIUFE_SERI_KODU` adlarıyla doğru kodları ekleyin (script önce ortam değişkenine bakar).

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
