# Kira Artış Hesaplama — Revizyon

Bu klasör, fulyahukuk.com'daki kira artış hesaplama widget'ının revize edilmiş halini ve otomatik TÜFE/Yİ-ÜFE güncelleme sistemini içerir.

## Klasör yapısı

```
widget/kira-hesap-widget.html      Mevcut aracın revize edilmiş hali (tam geçmiş + fark takibi)
widget/kira-basit-hesap.html       Yeni: tek artış dönemi için basit hesaplayıcı
data/oranlar.json                  TÜFE/Yİ-ÜFE veri kaynağı — HER İKİ widget da bunu okur
.github/ISSUE_TEMPLATE/oran-guncelle.yml   Aylık veri girişi formu (tek giriş noktası)
.github/workflows/oran-girisini-isle.yml   Formu işleyip data/oranlar.json'u güncelleyen iş akışı
otomasyon/veri-isle.mjs            Form gövdesini ayrıştırıp dosyayı güncelleyen script
otomasyon/fetch-oranlar.mjs        (DURAKLATILDI) TCMB EVDS'ten otomatik çekim script'i
otomasyon/KURULUM.md               Bir kezlik kurulum adımları
```

## 1) Aylık veri girişi — tek nokta, iki araç

TCMB'nin EVDS sistemini 2026'da "EVDS3" ile yenilemesiyle, eskiden kullanılan herkese açık/anahtarlı API kapatıldı; yeni sistem oturum açmayı gerektiriyor ve belgelenmiş bir API sunmuyor (ayrıntı için sohbet geçmişine bakılabilir). Bu yüzden tam otomatik çekim yerine **tek bir, çok basit manuel giriş noktası** kuruldu:

1. Repo'da **Issues → New Issue → "Aylık TÜFE / Yİ-ÜFE Oranı Girişi"** formu açılır.
2. Ay, yıl ve TÜİK'in açıkladığı iki oran (TÜFE, Yİ-ÜFE) girilip gönderilir.
3. `.github/workflows/oran-girisini-isle.yml` bunu otomatik yakalar, `otomasyon/veri-isle.mjs` ile `data/oranlar.json`'a yazar, commit'ler ve issue'yu "✅ Güncellendi" yorumuyla kapatır. Değer mantıksız görünüyorsa (biçim hatası, aralık dışı vb.) issue **açık** kalır ve hata yorumu bırakılır — sessizce yanlış veri yazılmaz.
4. `widget/kira-hesap-widget.html` **ve** `widget/kira-basit-hesap.html` aynı `data/oranlar.json`'u okuduğu için, tek giriş her iki araca da otomatik yansır.

Ayda bir kez, ~30 saniyelik bu form doldurma dışında elle yapılacak bir şey yok. Kurulum: **[otomasyon/KURULUM.md](otomasyon/KURULUM.md)**.

**Not — EVDS otomasyonu duraklatıldı:** `otomasyon/fetch-oranlar.mjs` ve onu tetikleyen zamanlanmış iş akışı (`aylik-veri-guncelle.yml`) şu an **kapalı** (yalnızca elle tetiklenebilir durumda), çünkü TCMB'nin yeni EVDS3'ü basit bir API anahtarıyla çalışmıyor. TCMB'nin resmi bir API yayınlayıp yayınlamadığı ayda bir otomatik olarak kontrol ediliyor (Claude'un zamanlanmış rutini); resmi bir API çıkarsa bu script güncellenip otomasyon yeniden açılabilir.

## 2) Kod incelemesi — tekrar eden / yavaşlatan kısımlar

Orijinal kodda tespit edilip düzeltilen noktalar:

- **`innerHTML +=` döngü içinde**: Yıllık/aylık dökümü üretirken her ay için `detayListesi.innerHTML += ...` çağrılıyordu; bu her seferinde tüm HTML'i yeniden parse ettiriyor, uzun kiralık geçmişlerinde (10+ yıl) gözle görülür yavaşlığa yol açıyordu. Artık tüm satırlar bir diziye toplanıp tek seferde `.join('')` ile yazılıyor.
- **Döngü içinde tekrarlanan `querySelector`**: Her zam yılında `widget.querySelector('.kira-dinamik-input[data-yil=...]')` ile DOM'da arama yapılıyordu. Artık hesaplamadan önce bir kere `Map<yil, tutar>`'a çevriliyor.
- **`new Date()` tekrarı**: Aynı "bugünün yılı/ayı" bilgisi birden fazla fonksiyonda ayrı ayrı hesaplanıyordu; tek bir `simdikiTarih()` yardımcısına toplandı.
- **Hesaplama ile render iç içeydi**: Aynı fonksiyon hem kira/fark hesaplıyor hem DOM string'i üretiyordu, bu da hem okumayı zorlaştırıyor hem de tek bir yerde hata riski yaratıyordu (madde 3'teki revizyonla doğrudan ilgili). Artık `gecmisiHesapla()` saf veri döndürüyor, `kayitlariRenderEt()` bunu HTML'e çeviriyor — hesap mantığı tek doğruluk kaynağı.
- **Oran seçimi değişince `<select>` içeriği tamamen yeniden kuruluyordu**: Konut/İş Yeri arasında geçince kullanıcının "Özel Oran" seçimi bile sıfırlanıyordu. Artık Yİ-ÜFE seçeneği `hidden`/`disabled` ile gizleniyor, diğer seçim korunuyor.
- **Sayfa yüklendiğinde ilk senkronizasyon eksikti**: Varsayılan "Konut" seçiliyken Yİ-ÜFE seçeneği ilk açılışta görünür kalıyordu (yalnızca `change` olayında gizleniyordu). Artık kurulumda bir kere de elle çağrılıyor.
- **175 satırlık veri tablosu script içine gömülüydü**: Artık `data/oranlar.json`'a taşındı; hem otomasyonu mümkün kılıyor hem de widget kodunu küçültüyor (çevrimdışı yedek olarak küçük bir kopyası hâlâ gömülü).

## 3) Geçmişten bugüne fark hesaplama revizyonu

Hesaplama artık yukarıdaki `gecmisiHesapla()` fonksiyonunda tek bir yerde, ay ay ilerleyerek yapılıyor: her yıl kullanıcının o yıl için girdiği "fiilen ödenen" tutar ile TÜİK oranına göre olması gereken tutar karşılaştırılıyor, hem yıllık hem de kira başlangıcından bugüne toplam birikmiş fark ("eksik/fazla ödeme") hesaplanıyor. Mantık aynı kaldı (pandemi dönemi %25 sınırı dahil), sadece koddaki dağınıklık giderildi ve veri kaynağı otomasyona bağlandı.

## 4) Yeni: Basit tek-dönem hesaplayıcı

`widget/kira-basit-hesap.html` — çoğu ziyaretçinin aslında istediği, tam geçmiş girmeden "mevcut kiram X, hangi ayda ne kadar artabilir?" sorusuna hızlı cevap veren, ayrı ve sade bir araç. Mevcut kira, mülk türü, artış ayı/yılı ve kriter (TÜFE/Yİ-ÜFE/Özel) girilip tek tıkla yeni yasal kira tutarı hesaplanıyor; geçmiş/fark takibi yapmıyor, ana araçtan bağımsız olarak istenen sayfaya yapıştırılabilir.

## Not: `id` → `class`

Orijinal koddaki tek `id="dinamik-odenen-alanlar"` alanı `class="kira-dinamik-odenen-alanlar"` ile değiştirildi (istendiği gibi) — bu sayede aynı sayfada widget birden fazla kez kullanılırsa `id` çakışması yaşanmıyor. Zaten kodun geri kalanı class tabanlıydı.

## Duyarlı (responsive) tasarım

Grid'ler `auto-fit`/`minmax` ile otomatik daralıyor, başlık ve sonuç rakamları `clamp()` ile ekrana göre ölçekleniyor, 768px ve 420px için ayrı kırılma noktaları eklendi, dokunma hedefleri (buton min-height 48px, radio/checkbox 18px) büyütüldü. iPhone SE gibi dar ekranlardan geniş masaüstüne kadar test edildi (bkz. sohbetteki tarayıcı testleri).
