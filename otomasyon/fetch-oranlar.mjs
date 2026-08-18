#!/usr/bin/env node
// TÜFE / Yİ-ÜFE "12 Aylık Ortalamalara Göre % Değişim" değerini TCMB EVDS'ten
// çekip data/oranlar.json içine yazar. Her ayın 3'ünde GitHub Actions ile
// otomatik çalışır (bkz. .github/workflows/aylik-veri-guncelle.yml).
//
// ÖNEMLİ - BİR KEZLİK KURULUM GEREKİYOR:
//   1) https://evds2.tcmb.gov.tr adresinden ücretsiz kayıt olup bir API
//      anahtarı alın, GitHub repo secret'ı olarak EVDS_API_KEY adıyla ekleyin.
//   2) EVDS'in "Seri Mağazası" arama kutusuna "Tüketici Fiyat Endeksi Genel"
//      yazıp bulduğunuz serinin kodunu TUFE_SERI_KODU'na, "Yurt İçi Üretici
//      Fiyat Endeksi Genel" için bulduğunuz kodu YIUFE_SERI_KODU'na yapıştırın.
//      Aşağıdaki değerler tahminidir, EVDS arayüzünden MUTLAKA doğrulayın -
//      hukuki bir hesaplama aracı olduğu için yanlış seri kodu sessizce
//      yanlış sonuç üretebilir. Ayrıntılar için ../otomasyon/KURULUM.md.
// Her iki kod da EVDS arayüzünden (Tablo Oluştur -> sütun başlığı) doğrulandı.
const TUFE_SERI_KODU = process.env.TUFE_SERI_KODU || "TP.GENENDEKS.T1";
const YIUFE_SERI_KODU = process.env.YIUFE_SERI_KODU || "TP.TUFE1YI.T1";

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERI_DOSYASI = path.join(__dirname, "..", "data", "oranlar.json");

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

function evdsTarih(d) {
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  return `${gun}-${ay}-${d.getFullYear()}`;
}

// EVDS'ten ham endeks serisini (aylık, dönüşümsüz) çeker.
async function evdsEndeksVerisiCek(seriKodu, apiKey, ayGeriGit = 30) {
  const bitis = new Date();
  const baslangic = new Date();
  baslangic.setMonth(baslangic.getMonth() - ayGeriGit);

  const url = `https://evds2.tcmb.gov.tr/service/evds/series=${encodeURIComponent(seriKodu)}` +
    `&startDate=${evdsTarih(baslangic)}&endDate=${evdsTarih(bitis)}&type=json`;

  // 05.04.2024 itibarıyla EVDS API anahtarı URL'de değil, HTTP header'ında gönderiliyor.
  const res = await fetch(url, { headers: { key: apiKey } });
  if (!res.ok) {
    throw new Error(`EVDS isteği başarısız (${seriKodu}): HTTP ${res.status} ${res.statusText}`);
  }
  const gövde = await res.json();
  const kayitlar = gövde.items || [];
  if (kayitlar.length === 0) {
    throw new Error(`EVDS boş veri döndürdü (${seriKodu}). Seri kodunu kontrol edin.`);
  }

  const alanAdi = Object.keys(kayitlar[kayitlar.length - 1]).find((k) => k.startsWith(seriKodu.replace(/\./g, "_")));
  if (!alanAdi) {
    throw new Error(`EVDS yanıtında beklenen alan bulunamadı (${seriKodu}). Yanıt: ${JSON.stringify(kayitlar[0])}`);
  }

  return kayitlar
    .map((k) => Number(k[alanAdi]))
    .filter((v) => Number.isFinite(v));
}

// TÜİK'in "12 Aylık Ortalamalara Göre % Değişim" metodolojisi:
// (son 12 ayın endeks ortalaması) / (ondan önceki 12 ayın endeks ortalaması) - 1
function onIkiAylikOrtalamaDegisim(endeksSerisi) {
  if (endeksSerisi.length < 24) {
    throw new Error(`Hesaplama için en az 24 aylık endeks verisi gerekli, ${endeksSerisi.length} ay geldi.`);
  }
  const sonBolum = endeksSerisi.slice(-12);
  const oncekiBolum = endeksSerisi.slice(-24, -12);
  const ort = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const degisim = (ort(sonBolum) / ort(oncekiBolum) - 1) * 100;
  return Math.round(degisim * 100) / 100;
}

function degerMantikliMi(deger) {
  return Number.isFinite(deger) && deger > -50 && deger < 500;
}

async function main() {
  const apiKey = process.env.EVDS_API_KEY;
  if (!apiKey) {
    console.error("HATA: EVDS_API_KEY ortam değişkeni tanımlı değil. Bkz. otomasyon/KURULUM.md");
    process.exit(1);
  }

  const simdi = new Date();
  const yil = String(simdi.getFullYear());
  const ayIndex = simdi.getMonth();

  console.log(`TÜFE/Yİ-ÜFE güncellemesi başlıyor: ${AYLAR[ayIndex]} ${yil}`);

  const [tufeSerisi, yiufeSerisi] = await Promise.all([
    evdsEndeksVerisiCek(TUFE_SERI_KODU, apiKey),
    evdsEndeksVerisiCek(YIUFE_SERI_KODU, apiKey),
  ]);

  const tufeOran = onIkiAylikOrtalamaDegisim(tufeSerisi);
  const yiufeOran = onIkiAylikOrtalamaDegisim(yiufeSerisi);

  if (!degerMantikliMi(tufeOran) || !degerMantikliMi(yiufeOran)) {
    console.error(`HATA: Hesaplanan değerler mantıksız görünüyor (TÜFE=${tufeOran}, Yİ-ÜFE=${yiufeOran}). ` +
      `Seri kodları yanlış olabilir, veri YAZILMADI. Lütfen TUFE_SERI_KODU / YIUFE_SERI_KODU değerlerini EVDS'ten doğrulayın.`);
    process.exit(1);
  }

  const dosya = JSON.parse(await readFile(VERI_DOSYASI, "utf-8"));
  if (!dosya.oranlar[yil]) {
    dosya.oranlar[yil] = Array.from({ length: 12 }, () => [0, 0]);
  }

  const oncekiDeger = dosya.oranlar[yil][ayIndex];
  dosya.oranlar[yil][ayIndex] = [tufeOran, yiufeOran];
  dosya._sonGuncelleme = simdi.toISOString();

  await writeFile(VERI_DOSYASI, JSON.stringify(dosya, null, 2) + "\n", "utf-8");

  console.log(`Güncellendi: ${AYLAR[ayIndex]} ${yil} -> TÜFE %${tufeOran}, Yİ-ÜFE %${yiufeOran} ` +
    `(önceki değer: ${JSON.stringify(oncekiDeger)})`);
}

main().catch((err) => {
  console.error("Otomatik güncelleme başarısız:", err.message);
  process.exit(1);
});
