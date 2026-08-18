#!/usr/bin/env node
// GitHub Issue Form ("Aylık TÜFE / Yİ-ÜFE Oranı Girişi") ile gönderilen ayı,
// yılı ve oranları ayrıştırıp data/oranlar.json içine yazar. Issue gövdesi
// GITHUB_EVENT_PATH üzerinden okunur (workflow bunu ortama koyar).
//
// TCMB'nin resmi/belgelenmiş bir API'si bulunana kadar bu, sistemin tek veri
// giriş noktasıdır; hem tam geçmiş hesaplayıcı hem basit hesaplayıcı aynı
// data/oranlar.json dosyasını okur, yani burada yapılan tek bir giriş
// otomatik olarak iki araca da yansır.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERI_DOSYASI = path.join(__dirname, "..", "data", "oranlar.json");

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

function alanDegeriniAl(gövde, baslik) {
  // GitHub issue formları gövdeyi "### Alan Adı\n\nDeğer\n\n" şeklinde render eder.
  const kacisliBaslik = baslik.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`### ${kacisliBaslik}\\s*\\n+([^\\n]+)`, "u");
  const m = gövde.match(re);
  return m ? m[1].trim() : "";
}

function ondalikAyristir(metin) {
  if (!metin) return NaN;
  return parseFloat(metin.replace(",", ".").replace("%", "").trim());
}

function degerMantikliMi(deger) {
  return Number.isFinite(deger) && deger > -50 && deger < 500;
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.error("HATA: GITHUB_EVENT_PATH tanımlı değil (bu script bir GitHub Actions issue event'i içinde çalışmalı).");
    process.exit(1);
  }

  const event = JSON.parse(await readFile(eventPath, "utf-8"));
  const gövde = event.issue?.body || "";

  const ayMetni = alanDegeriniAl(gövde, "Ay (bültenin açıklandığı ay)");
  const yilMetni = alanDegeriniAl(gövde, "Yıl");
  const tufeMetni = alanDegeriniAl(gövde, "TÜFE — 12 Aylık Ortalamalara Göre % Değişim");
  let yiufeMetni = alanDegeriniAl(gövde, "Yİ-ÜFE — 12 Aylık Ortalamalara Göre % Değişim (varsa)");
  if (yiufeMetni === "_No response_") yiufeMetni = ""; // GitHub boş opsiyonel alanları böyle işaretler

  const ayIndex = AYLAR.findIndex((a) => a.localeCompare(ayMetni, "tr", { sensitivity: "base" }) === 0);
  const yil = parseInt(yilMetni, 10);
  const tufe = ondalikAyristir(tufeMetni);
  const yiufe = ondalikAyristir(yiufeMetni); // boş bırakılmışsa NaN olur, sorun değil

  const hatalar = [];
  if (ayIndex === -1) hatalar.push(`Ay tanınamadı: "${ayMetni}"`);
  if (!Number.isInteger(yil) || yil < 2011 || yil > 2100) hatalar.push(`Yıl geçersiz: "${yilMetni}"`);
  if (!degerMantikliMi(tufe)) hatalar.push(`TÜFE değeri mantıksız görünüyor: "${tufeMetni}"`);
  if (yiufeMetni && !degerMantikliMi(yiufe)) hatalar.push(`Yİ-ÜFE değeri mantıksız görünüyor: "${yiufeMetni}"`);

  if (hatalar.length > 0) {
    console.error("HATA: Form verisi işlenemedi, veri YAZILMADI:\n- " + hatalar.join("\n- "));
    process.exit(1);
  }

  const dosya = JSON.parse(await readFile(VERI_DOSYASI, "utf-8"));
  const yilAnahtari = String(yil);
  if (!dosya.oranlar[yilAnahtari]) {
    dosya.oranlar[yilAnahtari] = Array.from({ length: 12 }, () => [0, 0]);
  }

  const oncekiKayit = dosya.oranlar[yilAnahtari][ayIndex];
  const yeniYiufe = yiufeMetni ? yiufe : oncekiKayit[1]; // Yİ-ÜFE boş bırakıldıysa eskisini koru
  dosya.oranlar[yilAnahtari][ayIndex] = [tufe, yeniYiufe];
  dosya._sonGuncelleme = new Date().toISOString();

  await writeFile(VERI_DOSYASI, JSON.stringify(dosya, null, 2) + "\n", "utf-8");

  console.log(`Güncellendi: ${AYLAR[ayIndex]} ${yil} -> TÜFE %${tufe}, Yİ-ÜFE %${yeniYiufe} (önceki: ${JSON.stringify(oncekiKayit)})`);

  // Sonraki workflow adımlarının (commit mesajı, issue yorumu) kullanması için.
  if (process.env.GITHUB_OUTPUT) {
    const cikti = `ozet=${AYLAR[ayIndex]} ${yil}: TÜFE %${tufe}, Yİ-ÜFE %${yeniYiufe}\n`;
    await writeFile(process.env.GITHUB_OUTPUT, cikti, { flag: "a" });
  }
}

main().catch((err) => {
  console.error("Veri işleme başarısız:", err.message);
  process.exit(1);
});
