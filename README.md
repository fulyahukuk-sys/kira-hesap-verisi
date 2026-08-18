# Kira Artış Hesaplama — Revizyon

Bu klasör, fulyahukuk.com'daki kira artış hesaplama widget'ının revize edilmiş halini ve otomatik TÜFE/Yİ-ÜFE güncelleme sistemini içerir.

## Klasör yapısı

```
widget/kira-hesap-widget.html   Mevcut aracın revize edilmiş hali (tam geçmiş + fark takibi)
widget/kira-basit-hesap.html    Yeni: tek artış dönemi için basit hesaplayıcı
data/oranlar.json               TÜFE/Yİ-ÜFE veri kaynağı (otomasyon tarafından güncellenir)
otomasyon/fetch-oranlar.mjs     TCMB EVDS'ten veri çekip data/oranlar.json'u güncelleyen script
otomasyon/KURULUM.md            Bir kezlik kurulum adımları (EVDS anahtarı, GitHub secret, vb.)
.github/workflows/              Her ayın 3'ünde otomatik çalışan GitHub Actions tanımı
```

## 1) Otomatik TÜFE/Yİ-ÜFE güncellemesi

Artık oranlar elle güncellenmiyor. `otomasyon/fetch-oranlar.mjs`, TCMB'nin resmi ve ücretsiz **EVDS** API'sinden TÜFE ve Yİ-ÜFE endeks verisini çekip TÜİK'in kendi yöntemiyle ("12 aylık ortalamalara göre % değişim") hesaplıyor ve `data/oranlar.json`'a yazıyor. `.github/workflows/aylik-veri-guncelle.yml` bunu her ayın 3'ünde, TÜİK'in açıklama saatine (~10:00) göre birkaç kez deneyerek otomatik çalıştırıyor; widget'lar bu dosyayı sayfa her açıldığında GitHub'dan çekiyor. Tamamen ücretsiz, sunucu gerektirmiyor, kurulumdan sonra elle müdahale gerekmiyor.

Kurulum adımları (yaklaşık 10 dakika, tek seferlik): **[otomasyon/KURULUM.md](otomasyon/KURULUM.md)**.

**Doğrulama gerekiyor:** Script'in kullandığı iki EVDS seri kodu en olası tahminlerle dolduruldu ama hukuki sonuçlara etkisi olduğu için EVDS arayüzünden bizzat doğrulanması gerekiyor — KURULUM.md'nin 3. adımına bakın. Doğrulanana kadar script hatalı/mantıksız bir değer hesaplarsa veri **yazmadan** duracak şekilde tasarlandı, yani "sessizce yanlış rakam" riski yok.

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
