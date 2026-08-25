/**
 * Eğitim ekranlarının veri kaynağı.
 *
 * Bugün demo verisini olduğu gibi geçiriyor. Faz E5'in son diliminde burası
 * ortama göre dallanacak: demo modunda demo verisi, production'da gerçek
 * (bugün boş) veri. Ekranların tek bir yerden beslenmesinin sebebi o anahtarın
 * tek bir dosyada çevrilebilmesi.
 */
export {
  classes,
  dayPlanEventsByRole,
  paymentRows,
  schedule,
  students,
} from "./demoData";
