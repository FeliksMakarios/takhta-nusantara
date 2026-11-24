'use strict';
/* Takhta Nusantara: data dunia permainan.
   Peta memakai petak heksagonal 1 derajat (95 BT sampai 141 BT, 6 LU sampai 11 LS). */

const START_YEAR = 1830;
const END_YEAR = 1945;

/* Daratan per pulau: [lintang, bujur awal, bujur akhir] */
const LAND = {
  SUM: [[5,95,97],[4,95,98],[3,96,99],[2,97,100],[1,98,102],[0,99,103],[-1,100,104],[-2,101,104],[-3,102,105],[-4,102,105],[-5,103,105]],
  RIAU: [[1,104,105],[0,105,105]],
  BBL: [[-2,106,106],[-3,108,108]],
  JAV: [[-6,106,111],[-7,105,114],[-8,108,114]],
  MAD: [[-6,113,114]],
  BALI: [[-8,115,115]],
  LOM: [[-9,116,116]],
  SBW: [[-9,117,119]],
  FLO: [[-9,120,123]],
  SBA: [[-10,119,120]],
  TIM: [[-10,123,125],[-9,125,127]],
  KAL: [[6,116,117],[5,114,118],[4,113,118],[3,112,118],[2,110,118],[1,109,118],[0,109,117],[-1,109,117],[-2,110,116],[-3,111,116],[-4,114,116]],
  SUL: [[1,121,125],[0,119,121],[-1,119,123],[-2,119,122],[-3,119,120],[-3,122,123],[-4,119,120],[-4,122,123],[-5,119,120],[-5,122,123],[-6,120,120]],
  TERN: [[1,127,127]],
  TIDO: [[0,127,127]],
  HALM: [[2,128,128],[1,128,129],[0,128,129],[-1,128,128]],
  SULA: [[-2,125,126]],
  BURU: [[-3,126,126]],
  SERAM: [[-3,128,130]],
  AMBON: [[-4,128,128]],
  BANDA: [[-5,130,130]],
  KEI: [[-6,132,132]],
  ARU: [[-6,134,134],[-7,134,134]],
  TANI: [[-8,131,131]],
  BIAK: [[-1,136,136]],
  PAP: [[-1,131,134],[-2,132,134],[-2,137,141],[-3,133,141],[-4,134,141],[-5,136,141],[-6,137,141],[-7,138,141],[-8,138,141],[-9,140,141]]
};

const COMMODITIES = {
  beras:{n:'Beras',v:0.8}, lada:{n:'Lada',v:1.3}, kopi:{n:'Kopi',v:1.4}, gula:{n:'Gula',v:1.3},
  tembakau:{n:'Tembakau',v:1.1}, timah:{n:'Timah',v:1.6}, rempah:{n:'Pala dan cengkih',v:1.7},
  nila:{n:'Nila',v:1.2}, jati:{n:'Kayu jati',v:1.1}, cendana:{n:'Cendana',v:1.2},
  kemenyan:{n:'Kemenyan',v:1.0}, emas:{n:'Emas dan intan',v:1.5}, dagang:{n:'Perniagaan laut',v:1.3},
  hutan:{n:'Hasil hutan',v:0.7}, kuda:{n:'Kuda',v:1.0}, gambir:{n:'Gambir',v:1.1}
};

const TERRAIN = {
  dataran:{n:'Dataran',def:1.0}, pegunungan:{n:'Pegunungan',def:1.3}, hutan:{n:'Hutan lebat',def:1.2},
  pesisir:{n:'Pesisir',def:0.95}, pulau:{n:'Kepulauan',def:1.1}
};

/* [id, nama, pulau, bujur, lintang, pemilik 1830, komoditas, penduduk (ribu), medan]
   Bujur dan lintang adalah titik pusat wilayah. Petak peta dibagi ke wilayah terdekat di pulau yang sama (lihat tools/build-map.js). */
const REGION_DEFS = [
  // Sumatra
  ['kutaraja','Aceh Besar','SUM',95.4,5.45,'aceh','lada',200,'pesisir'],
  ['pidie','Pidie','SUM',96.0,5.15,'aceh','lada',180,'dataran'],
  ['acehtimur','Aceh Timur','SUM',97.6,4.9,'aceh','lada',150,'pesisir'],
  ['meulaboh','Pantai Barat Aceh','SUM',96.2,4.2,'aceh','lada',100,'hutan'],
  ['gayo','Dataran Tinggi Gayo','SUM',96.9,4.4,'aceh','kopi',60,'pegunungan'],
  ['deli','Deli dan Asahan','SUM',98.7,3.5,'siak','tembakau',110,'pesisir'],
  ['batak','Tanah Batak','SUM',99.1,2.0,'batak','kemenyan',300,'pegunungan'],
  ['toba','Toba dan Samosir','SUM',98.75,2.7,'batak','beras',140,'pegunungan'],
  ['minang','Darek Minangkabau','SUM',100.5,-0.4,'minang','kopi',400,'pegunungan'],
  ['padang','Padang','SUM',100.35,-1.0,'belanda','kopi',150,'pesisir'],
  ['siak','Siak','SUM',101.9,0.8,'siak','lada',160,'hutan'],
  ['jambi','Jambi','SUM',103.4,-1.7,'jambi','lada',120,'hutan'],
  ['indragiri','Indragiri','SUM',102.5,-0.45,'indragiri','lada',70,'hutan'],
  ['bengkulu','Bengkulu','SUM',102.4,-3.8,'belanda','lada',90,'pesisir'],
  ['palembang','Palembang','SUM',104.6,-3.0,'belanda','lada',250,'dataran'],
  ['lampung','Lampung','SUM',105.1,-5.1,'adat','lada',100,'hutan'],
  ['riau','Riau-Lingga','RIAU',104.5,0.9,'riau','gambir',60,'pulau'],
  ['bangka','Bangka-Belitung','BBL',106.1,-2.1,'belanda','timah',50,'pulau'],
  // Jawa dan Madura
  ['banten','Banten','JAV',106.1,-6.4,'belanda','beras',300,'pesisir'],
  ['batavia','Batavia','JAV',106.85,-6.25,'belanda','gula',350,'pesisir'],
  ['priangan','Priangan','JAV',107.6,-7.05,'belanda','kopi',600,'pegunungan'],
  ['cirebon','Cirebon','JAV',108.55,-6.8,'belanda','gula',500,'pesisir'],
  ['banyumas','Banyumas','JAV',109.2,-7.45,'belanda','nila',400,'dataran'],
  ['semarang','Semarang','JAV',110.4,-6.95,'belanda','gula',500,'pesisir'],
  ['kedu','Kedu','JAV',110.2,-7.45,'belanda','kopi',350,'pegunungan'],
  ['rembang','Rembang','JAV',111.4,-6.85,'belanda','jati',350,'hutan'],
  ['yogyakarta','Mataram (Yogyakarta)','JAV',110.36,-7.8,'yogya','gula',400,'dataran'],
  ['gunungkidul','Gunungkidul','JAV',110.65,-8.0,'yogya','jati',150,'pegunungan'],
  ['adikarta','Adikarta','JAV',110.12,-7.92,'pakualaman','beras',40,'pesisir'],
  ['surakarta','Surakarta','JAV',110.83,-7.57,'surakarta','gula',450,'dataran'],
  ['sukowati','Sukowati','JAV',111.1,-7.4,'surakarta','nila',200,'dataran'],
  ['wonogiri','Wonogiri (Mangkunegaran)','JAV',110.95,-7.85,'mangkunegaran','beras',180,'pegunungan'],
  ['kediri','Kediri','JAV',112.0,-7.85,'belanda','gula',450,'dataran'],
  ['surabaya','Surabaya','JAV',112.7,-7.35,'belanda','gula',550,'pesisir'],
  ['pasuruan','Pasuruan','JAV',112.9,-7.85,'belanda','kopi',400,'pegunungan'],
  ['besuki','Besuki','JAV',113.9,-7.95,'belanda','tembakau',250,'hutan'],
  ['bangkalan','Bangkalan','MAD',112.95,-7.05,'madura','beras',220,'pulau'],
  ['sumenep','Sumenep','MAD',113.85,-7.0,'madura','beras',230,'pulau'],
  // Bali dan Nusa Tenggara
  ['buleleng','Buleleng','BALI',115.05,-8.18,'buleleng','beras',110,'pesisir'],
  ['jembrana','Jembrana','BALI',114.65,-8.33,'buleleng','hutan',30,'hutan'],
  ['tabanan','Tabanan','BALI',115.05,-8.45,'tabanan','beras',100,'dataran'],
  ['mengwi','Mengwi','BALI',115.16,-8.5,'mengwi','beras',80,'dataran'],
  ['badung','Badung','BALI',115.2,-8.72,'badung','dagang',100,'pesisir'],
  ['gianyar','Gianyar','BALI',115.28,-8.5,'gianyar','beras',80,'dataran'],
  ['bangli','Bangli','BALI',115.35,-8.3,'bangli','beras',60,'pegunungan'],
  ['klungkung','Klungkung','BALI',115.45,-8.56,'klungkung','beras',60,'dataran'],
  ['karangasem','Karangasem','BALI',115.6,-8.36,'karangasem','beras',110,'pegunungan'],
  ['nusapenida','Nusa Penida','BALI',115.52,-8.73,'klungkung','hutan',15,'pulau'],
  ['lombok','Lombok','LOM',116.3,-8.6,'lombok','beras',300,'pulau'],
  ['sumbawa','Sumbawa','SBW',117.4,-8.65,'sumbawa','kuda',80,'pulau'],
  ['bima','Bima','SBW',118.7,-8.55,'bima','kuda',100,'pulau'],
  ['manggarai','Manggarai','FLO',120.3,-8.6,'bima','hutan',90,'pegunungan'],
  ['ende','Ende dan Lio','FLO',121.7,-8.75,'adat','hutan',80,'pegunungan'],
  ['larantuka','Larantuka','FLO',122.5,-8.5,'portugis','cendana',60,'pesisir'],
  ['sumba','Sumba','SBA',119.9,-9.65,'adat','kuda',80,'pulau'],
  ['kupang','Kupang','TIM',123.9,-10.0,'belanda','cendana',80,'pesisir'],
  ['timortengah','Timor Tengah','TIM',124.45,-9.55,'adat','cendana',120,'pegunungan'],
  ['dili','Timor Timur','TIM',125.7,-8.8,'portugis','cendana',150,'pegunungan'],
  // Kalimantan
  ['sabah','Sabah','KAL',116.6,5.4,'brunei','hutan',40,'hutan'],
  ['brunei','Brunei','KAL',114.9,4.6,'brunei','dagang',50,'pesisir'],
  ['sarawak','Sarawak','KAL',111.6,1.8,'brunei','hutan',80,'hutan'],
  ['sambas','Sambas','KAL',109.35,1.3,'sambas','emas',60,'pesisir'],
  ['pontianak','Pontianak','KAL',109.6,-0.2,'pontianak','dagang',90,'pesisir'],
  ['ketapang','Matan (Ketapang)','KAL',110.4,-1.7,'adat','hutan',40,'hutan'],
  ['kapuas','Kapuas Hulu','KAL',112.8,0.6,'adat','hutan',60,'hutan'],
  ['apokayan','Apo Kayan','KAL',115.3,2.4,'adat','hutan',40,'hutan'],
  ['bulungan','Bulungan','KAL',117.3,3.0,'bulungan','hutan',30,'pesisir'],
  ['berau','Berau','KAL',117.45,2.1,'berau','hutan',30,'pesisir'],
  ['kutai','Kutai','KAL',116.7,-0.3,'kutai','emas',80,'hutan'],
  ['paser','Paser','KAL',116.15,-1.85,'pasir','hutan',40,'hutan'],
  ['barito','Barito','KAL',114.2,-1.0,'adat','hutan',70,'hutan'],
  ['kotawaringin','Kotawaringin','KAL',111.6,-2.4,'banjar','hutan',40,'hutan'],
  ['banjarmasin','Banjarmasin','KAL',114.6,-3.3,'banjar','emas',220,'pesisir'],
  ['hulusungai','Hulu Sungai','KAL',115.3,-2.5,'banjar','lada',180,'dataran'],
  // Sulawesi
  ['manado','Minahasa','SUL',124.9,1.3,'belanda','kopi',100,'pegunungan'],
  ['gorontalo','Gorontalo','SUL',122.9,0.65,'adat','emas',80,'pesisir'],
  ['kaili','Tanah Kaili','SUL',119.9,-0.9,'adat','hutan',80,'hutan'],
  ['poso','Poso','SUL',120.75,-1.45,'adat','hutan',60,'hutan'],
  ['banggai','Banggai','SUL',122.8,-1.0,'ternate','dagang',40,'pulau'],
  ['mandar','Mandar','SUL',119.0,-3.0,'adat','dagang',120,'pesisir'],
  ['toraja','Tana Toraja','SUL',119.85,-3.0,'adat','kopi',150,'pegunungan'],
  ['luwu','Luwu','SUL',120.4,-2.8,'luwu','emas',120,'hutan'],
  ['ajatappareng','Ajatappareng','SUL',119.7,-3.95,'adat','beras',120,'dataran'],
  ['wajo','Wajo','SUL',120.1,-4.05,'wajo','dagang',180,'dataran'],
  ['soppeng','Soppeng','SUL',119.88,-4.35,'soppeng','beras',120,'dataran'],
  ['bone','Bone','SUL',120.3,-4.6,'bone','dagang',250,'pesisir'],
  ['sinjai','Sinjai','SUL',120.2,-5.1,'bone','beras',70,'pesisir'],
  ['makassar','Makassar','SUL',119.45,-5.15,'belanda','dagang',120,'pesisir'],
  ['gowa','Gowa','SUL',119.72,-5.25,'gowa','dagang',200,'dataran'],
  ['takalar','Polongbangkeng (Takalar)','SUL',119.45,-5.45,'gowa','beras',90,'dataran'],
  ['selayar','Selayar','SUL',120.45,-6.1,'belanda','dagang',50,'pulau'],
  ['konawe','Konawe','SUL',122.3,-3.9,'adat','hutan',70,'hutan'],
  ['buton','Buton','SUL',122.65,-5.3,'buton','dagang',90,'pulau'],
  // Maluku
  ['ternate','Ternate','TERN',127.35,0.8,'ternate','rempah',45,'pulau'],
  ['halut','Halmahera Utara','HALM',127.9,1.6,'ternate','rempah',60,'hutan'],
  ['tidore','Tidore','TIDO',127.4,0.67,'tidore','rempah',25,'pulau'],
  ['halsel','Halmahera Selatan','HALM',128.1,-0.4,'tidore','rempah',30,'hutan'],
  ['bacan','Bacan','HALM',127.5,-0.65,'bacan','rempah',25,'pulau'],
  ['sula','Kepulauan Sula','SULA',125.9,-1.9,'ternate','hutan',25,'pulau'],
  ['buru','Buru','BURU',126.6,-3.4,'belanda','hutan',15,'pulau'],
  ['seram','Seram','SERAM',129.5,-3.1,'adat','rempah',50,'hutan'],
  ['ambon','Ambon','AMBON',128.2,-3.65,'belanda','rempah',50,'pulau'],
  ['banda','Banda','BANDA',129.9,-4.53,'belanda','rempah',8,'pulau'],
  ['kei','Kepulauan Kei','KEI',132.7,-5.7,'adat','hutan',25,'pulau'],
  ['aru','Kepulauan Aru','ARU',134.4,-6.1,'adat','dagang',20,'pulau'],
  ['tanimbar','Tanimbar','TANI',131.3,-7.6,'adat','hutan',20,'pulau'],
  // Papua
  ['rajaampat','Raja Ampat dan Sorong','PAP',131.0,-0.9,'tidore','dagang',30,'pulau'],
  ['kepalaburung','Kepala Burung','PAP',133.0,-1.2,'adat','hutan',40,'hutan'],
  ['onin','Onin (Fakfak)','PAP',132.3,-2.9,'tidore','rempah',25,'pesisir'],
  ['biak','Biak','BIAK',136.0,-1.05,'adat','dagang',30,'pulau'],
  ['teluk','Teluk Cenderawasih','PAP',135.5,-3.3,'adat','hutan',30,'hutan'],
  ['pantaiutara','Pantai Utara Papua','PAP',140.3,-2.6,'adat','hutan',40,'hutan'],
  ['pegunungan','Pegunungan Tengah','PAP',138.8,-4.0,'adat','hutan',60,'pegunungan'],
  ['mimika','Mimika','PAP',136.9,-4.5,'adat','hutan',25,'hutan'],
  ['asmat','Pantai Selatan (Asmat)','PAP',138.4,-5.6,'adat','hutan',30,'hutan'],
  ['merauke','Merauke','PAP',140.4,-8,'adat','hutan',25,'dataran']
];

/* Kebudayaan dan nama */
const CULTURES = {
  aceh:{ m:['Muhammad','Ibrahim','Mahmud','Daud','Mansur','Husain','Abdullah','Ismail','Iskandar','Jauhar','Zainal','Hasyim','Ahmad','Yusuf','Usman'],
         f:['Fatimah','Aisyah','Zainab','Halimah','Nurul','Safiah','Mariam','Rahmah','Salmah','Khadijah'],
         pm:'Tuanku', pf:'Pocut', nm:'Teuku', nf:'Cut', place:'Aceh' },
  jawa:{ m:['Suryadi','Purbaya','Hadiwijaya','Notoprojo','Joyokusumo','Suryaputra','Wiroguno','Danurwenda','Mangkudirjo','Kusumayuda','Natakusuma','Prawiradirja','Sasradiningrat','Hadinagara'],
         f:['Kencana','Retno','Sekar','Ayu','Kusumawardani','Sasi','Galuh','Pembayun','Condrowati','Sulastri','Sriwulan'],
         pm:'Gusti Pangeran', pf:'Gusti Kanjeng Ratu', nm:'Raden Tumenggung', nf:'Raden Ayu', place:'Jawa' },
  bugis:{ m:['La Mappasessu','La Tenritappu','La Pabbenteng','La Massarasa','La Mallarangeng','La Pasompe','La Sangkilang','La Tenriawaru','La Mappangara','La Sibengngareng'],
          f:['We Tenriabeng','We Bacce','We Cudai','We Maniratu','We Tenrilekke','We Pancaitana','We Salmah','We Tenriwaru'],
          pm:'Arung', pf:'Datu', nm:'Arung', nf:'Daeng', place:'Bugis' },
  makassar:{ m:['I Mallingkaang','I Manggorai','I Mappadulu','I Kumala','I Makkulau','I Mannuntungi','I Bata','I Sangkala'],
          f:['I Rabiah','I Sitti','I Kare Tojeng','I Daeng Ngai','I Mannenung'],
          pm:'Karaeng', pf:'Karaeng', nm:'Karaeng', nf:'Daeng', place:'Makassar' },
  banjar:{ m:['Sulaiman','Kasuma','Nata','Abdurrahman','Hamid','Mangkubumi','Aminullah','Prabu Anom','Surianata','Muhammad Seman','Adam'],
           f:['Galuh','Nur Alam','Kumala Sari','Intan','Salamah','Jamilah'],
           pm:'Pangeran', pf:'Ratu', nm:'Kiai Adipati', nf:'Gusti', place:'Banjar' },
  bali:{ m:['Gede Agung','Putu Jelantik','Made Oka','Nyoman Rai','Ketut Anom','Gede Sakti','Putu Kusuma','Made Kaler','Gede Raka','Ketut Ngurah'],
         f:['Ayu Kencana','Istri Kanya','Ayu Mas','Istri Sayang','Ayu Rai','Istri Agung'],
         pm:'Cokorda', pf:'Dewa Ayu', nm:'I Gusti', nf:'I Gusti Ayu', place:'Bali' },
  melayu:{ m:['Ismail','Hasyim','Kasim','Ali','Abdul Jalil','Said','Yahya','Muhammad','Usman','Mahmud','Abdul Rahman'],
           f:['Fatimah','Mahrum','Latifah','Zubaidah','Embung','Aminah','Rugayah'],
           pm:'Tengku', pf:'Tengku', nm:'Datuk', nf:'Encik', place:'Melayu' },
  maluku:{ m:['Muhammad Zain','Arsyad','Ayanhar','Muhammad Ali','Kamaluddin','Ilham','Syamsuddin','Hamzah','Nuku','Iskandar'],
           f:['Rawe','Nursafa','Sahibah','Jamilah','Hamidah','Saidah'],
           pm:'Kaicil', pf:'Boki', nm:'Sangaji', nf:'Boki', place:'Maluku' },
  batak:{ m:['Patuan','Togar','Sahala','Martua','Bosar','Tunggul','Pardamean','Hasudungan','Mangaraja','Lumban'],
          f:['Situmorang','Simanjuntak','Pasaribu','Nainggolan','Sinaga','Siregar','Hutagalung'],
          pm:'Raja', pf:'Boru', nm:'Raja Huta', nf:'Boru', place:'Batak' }
};

/* Faksi. kind: kerajaan, kolonial, asing, adat */
const FACTION_DEFS = {
  aceh:{ name:'Kesultanan Aceh Darussalam', short:'Aceh', color:'#2f8a5b', culture:'aceh', kind:'kerajaan',
    playable:true, unlock:null, capital:'kutaraja', kas:420, army:4200, quality:1.0, rel:{belanda:-5},
    title:'Sultan', bonus:{id:'serambi', n:'Serambi Mekkah', d:'Legitimasi naik setiap tahun dan perang gerilya lebih tangguh.'},
    blurb:'Kesultanan merdeka di ujung Sumatra yang menguasai perdagangan lada. Sultan Muhammad Daud Syah memerintah dengan dukungan adiknya, Tuanku Ibrahim.' },
  yogya:{ name:'Kesultanan Ngayogyakarta Hadiningrat', short:'Yogyakarta', color:'#a65a2a', culture:'jawa', kind:'kerajaan',
    playable:true, unlock:null, capital:'yogyakarta', kas:320, army:1500, quality:0.8, overlord:'belanda', rel:{belanda:25},
    title:'Sri Sultan', regnal:'Hamengkubuwono', startRegnal:5, bonus:{id:'keraton', n:'Keraton Agung', d:'Penduduk padat, wibawa keraton tinggi, tetapi harus membayar upeti kepada Belanda.'},
    blurb:'Keraton besar yang baru saja melewati Perang Jawa. Sultannya baru berusia 10 tahun, sehingga pemerintahan dijalankan wali raja dan Patih Danurejo IV.' },
  bone:{ name:'Kesultanan Bone', short:'Bone', color:'#c23b32', culture:'bugis', kind:'kerajaan',
    playable:true, unlock:null, capital:'bone', kas:320, army:2600, quality:0.9, rel:{belanda:5},
    title:'Arumpone', bonus:{id:'pelaut', n:'Pelaut Bugis', d:'Jangkauan laut lebih jauh dan penghasilan niaga naik 20 persen.'},
    blurb:'Kekuatan Bugis di Sulawesi Selatan yang dipimpin seorang ratu, Sultanah Salimah Rajiatuddin. Bersekutu dengan Soppeng dan Wajo, bersaing dengan Gowa.' },
  banjar:{ name:'Kesultanan Banjar', short:'Banjar', color:'#d9a21b', culture:'banjar', kind:'kerajaan',
    playable:true, unlock:{level:2}, capital:'banjarmasin', kas:360, army:2500, quality:0.9, rel:{belanda:10},
    title:'Sultan', bonus:{id:'tambang', n:'Tambang dan Sungai', d:'Emas, intan, dan lada memberi penghasilan 15 persen lebih besar.'},
    blurb:'Kerajaan sungai di Kalimantan Selatan dengan tambang emas dan intan. Sultan Adam sudah tua, dan para cucunya kelak akan berebut takhta.' },
  klungkung:{ name:'Kerajaan Klungkung', short:'Klungkung', color:'#8a4fb0', culture:'bali', kind:'kerajaan',
    playable:true, unlock:{badge:'generasi'}, capital:'klungkung', kas:280, army:1600, quality:0.9, rel:{belanda:0},
    title:'Dewa Agung', regnal:'Putra', startRegnal:2, bonus:{id:'puputan', n:'Semangat Puputan', d:'Pertahanan di ibu kota jauh lebih kuat, legitimasi sulit runtuh, dan raja-raja Bali lain menghormati Dewa Agung.'},
    blurb:'Kerajaan kecil yang rajanya dihormati sebagai raja tertinggi Bali. Diperintah bersama oleh Dewa Agung Putra II dan kakaknya, Dewa Agung Istri Kanya.' },
  siak:{ name:'Kesultanan Siak Sri Indrapura', short:'Siak', color:'#2a77b4', culture:'melayu', kind:'kerajaan',
    playable:true, unlock:{badge:'saudagar'}, capital:'siak', kas:360, army:1100, quality:0.85, rel:{belanda:10},
    title:'Sultan', bonus:{id:'bandar', n:'Bandar Selat', d:'Dekat dengan Selat Malaka. Semua penghasilan niaga naik 15 persen.'},
    blurb:'Kesultanan Melayu di tepi Selat Malaka yang mengklaim Deli sebagai bawahannya. Sultan Syarif Ismail pandai bermain di antara Inggris dan Belanda.' },
  ternate:{ name:'Kesultanan Ternate', short:'Ternate', color:'#169c86', culture:'maluku', kind:'kerajaan',
    playable:true, unlock:{level:3}, capital:'ternate', kas:300, army:900, quality:0.85, rel:{belanda:15},
    title:'Sultan', bonus:{id:'rempah', n:'Kuasa Rempah', d:'Harga rempah lebih tinggi dan jangkauan laut lebih jauh.'},
    blurb:'Pewaris kejayaan rempah Maluku dengan wilayah yang tersebar dari Halmahera sampai Banggai. Bersaing sejak lama dengan Tidore.' },
  surakarta:{ name:'Kasunanan Surakarta Hadiningrat', short:'Surakarta', color:'#6e4a3a', culture:'jawa', kind:'kerajaan',
    playable:true, unlock:{badge:'dinasti'}, capital:'surakarta', kas:360, army:1500, quality:0.8, overlord:'belanda', rel:{belanda:30},
    title:'Sri Susuhunan', regnal:'Pakubuwono', startRegnal:7, bonus:{id:'diplomasi', n:'Diplomasi Halus', d:'Peluang berhasil dalam diplomasi naik dan hubungan dengan Belanda lebih mudah dijaga.'},
    blurb:'Pakubuwono VI baru saja dibuang ke Ambon karena membantu Diponegoro. Pamannya, Pakubuwono VII, naik takhta di bawah pengawasan Belanda.' },
  gowa:{ name:'Kesultanan Gowa', short:'Gowa', color:'#b23a78', culture:'makassar', kind:'kerajaan',
    playable:true, unlock:{badge:'panglima'}, capital:'gowa', kas:300, army:1400, quality:0.9, rel:{belanda:-5},
    title:'Somba', bonus:{id:'benteng', n:'Benteng Makassar', d:'Semua wilayah dimulai dengan benteng tingkat 2.'},
    blurb:'Bekas kekuatan laut terbesar di timur, kini bertetangga langsung dengan benteng Belanda di Makassar dan bersaing dengan Bone.' },
  batak:{ name:'Tanah Batak (Sisingamangaraja)', short:'Batak', color:'#4b5aa0', culture:'batak', kind:'kerajaan',
    playable:true, unlock:{level:4}, capital:'batak', kas:160, army:2200, quality:0.85, rel:{belanda:0},
    title:'Raja', regnal:'Sisingamangaraja', startRegnal:11, bonus:{id:'tanahtinggi', n:'Tanah Tinggi', d:'Pegunungan memberi pertahanan tambahan dan Belanda lebih lama melirik wilayah ini.'},
    blurb:'Raja-pendeta orang Batak di Bakkara. Sisingamangaraja XI baru naik takhta setelah ayahnya gugur diserang kaum Padri.' },

  belanda:{ name:'Hindia Belanda', short:'Belanda', color:'#e07b22', culture:null, kind:'kolonial', capital:'batavia' },
  jepang:{ name:'Pendudukan Jepang', short:'Jepang', color:'#d9cfc4', culture:null, kind:'kolonial', capital:'batavia' },
  inggris:{ name:'Kerajaan Inggris', short:'Inggris', color:'#5c6f99', culture:null, kind:'asing', capital:'sarawak' },
  portugis:{ name:'Timor Portugis', short:'Portugis', color:'#3d6b55', culture:null, kind:'asing', capital:'dili' },
  minang:{ name:'Kaum Padri Minangkabau', short:'Minangkabau', color:'#80903a', culture:'melayu', kind:'kerajaan', capital:'minang', army:3500, title:'Tuanku' },
  jambi:{ name:'Kesultanan Jambi', short:'Jambi', color:'#4f9a96', culture:'melayu', kind:'kerajaan', capital:'jambi', title:'Sultan' },
  riau:{ name:'Kesultanan Riau-Lingga', short:'Riau-Lingga', color:'#3a6aa8', culture:'melayu', kind:'kerajaan', capital:'riau', title:'Sultan' },
  pontianak:{ name:'Kesultanan Pontianak', short:'Pontianak', color:'#9b7b4d', culture:'melayu', kind:'kerajaan', capital:'pontianak', title:'Sultan', overlord:'belanda' },
  brunei:{ name:'Kesultanan Brunei', short:'Brunei', color:'#b98b56', culture:'melayu', kind:'kerajaan', capital:'brunei', title:'Sultan' },
  kutai:{ name:'Kesultanan Kutai Kartanegara', short:'Kutai', color:'#6f913a', culture:'banjar', kind:'kerajaan', capital:'kutai', title:'Sultan' },
  luwu:{ name:'Kedatuan Luwu', short:'Luwu', color:'#9c4d6b', culture:'bugis', kind:'kerajaan', capital:'luwu', title:'Datu' },
  wajo:{ name:'Kerajaan Wajo', short:'Wajo', color:'#c4704c', culture:'bugis', kind:'kerajaan', capital:'wajo', title:'Arung Matoa' },
  buton:{ name:'Kesultanan Buton', short:'Buton', color:'#5f80a0', culture:'bugis', kind:'kerajaan', capital:'buton', title:'Sultan', overlord:'belanda' },
  tidore:{ name:'Kesultanan Tidore', short:'Tidore', color:'#2b80a1', culture:'maluku', kind:'kerajaan', capital:'tidore', title:'Sultan' },
  bima:{ name:'Kesultanan Bima', short:'Bima', color:'#8f703f', culture:'melayu', kind:'kerajaan', capital:'bima', title:'Sultan' },
  indragiri:{ name:'Kesultanan Indragiri', short:'Indragiri', color:'#3f8f7f', culture:'melayu', kind:'kerajaan', capital:'indragiri', title:'Sultan' },
  pakualaman:{ name:'Kadipaten Pakualaman', short:'Pakualaman', color:'#c08a52', culture:'jawa', kind:'kerajaan', capital:'adikarta', title:'Kanjeng Gusti Pangeran Adipati Arya', regnal:'Paku Alam', startRegnal:2, overlord:'belanda' },
  mangkunegaran:{ name:'Kadipaten Mangkunegaran', short:'Mangkunegaran', color:'#8b5a3c', culture:'jawa', kind:'kerajaan', capital:'wonogiri', title:'Kanjeng Gusti Pangeran Adipati Arya', regnal:'Mangkunegara', startRegnal:2, overlord:'belanda' },
  madura:{ name:'Kerajaan-kerajaan Madura', short:'Madura', color:'#a8874a', culture:'jawa', kind:'kerajaan', capital:'sumenep', title:'Panembahan', overlord:'belanda' },
  buleleng:{ name:'Kerajaan Buleleng', short:'Buleleng', color:'#5e4fa8', culture:'bali', kind:'kerajaan', capital:'buleleng', title:'Raja' },
  karangasem:{ name:'Kerajaan Karangasem', short:'Karangasem', color:'#b05c9e', culture:'bali', kind:'kerajaan', capital:'karangasem', title:'Raja' },
  badung:{ name:'Kerajaan Badung', short:'Badung', color:'#c27ba0', culture:'bali', kind:'kerajaan', capital:'badung', title:'Raja' },
  tabanan:{ name:'Kerajaan Tabanan', short:'Tabanan', color:'#7a5c8e', culture:'bali', kind:'kerajaan', capital:'tabanan', title:'Raja' },
  mengwi:{ name:'Kerajaan Mengwi', short:'Mengwi', color:'#6f6aa8', culture:'bali', kind:'kerajaan', capital:'mengwi', title:'Raja' },
  gianyar:{ name:'Kerajaan Gianyar', short:'Gianyar', color:'#9e6fc9', culture:'bali', kind:'kerajaan', capital:'gianyar', title:'Raja' },
  bangli:{ name:'Kerajaan Bangli', short:'Bangli', color:'#a7849f', culture:'bali', kind:'kerajaan', capital:'bangli', title:'Raja' },
  lombok:{ name:'Kerajaan Mataram Lombok', short:'Mataram Lombok', color:'#4f7d9e', culture:'bali', kind:'kerajaan', capital:'lombok', title:'Raja' },
  sumbawa:{ name:'Kesultanan Sumbawa', short:'Sumbawa', color:'#9a7f55', culture:'melayu', kind:'kerajaan', capital:'sumbawa', title:'Sultan' },
  sambas:{ name:'Kesultanan Sambas', short:'Sambas', color:'#a58d3c', culture:'melayu', kind:'kerajaan', capital:'sambas', title:'Sultan' },
  pasir:{ name:'Kesultanan Paser', short:'Paser', color:'#6e8f5a', culture:'banjar', kind:'kerajaan', capital:'paser', title:'Sultan' },
  berau:{ name:'Kesultanan Berau', short:'Berau', color:'#5a8a8a', culture:'melayu', kind:'kerajaan', capital:'berau', title:'Sultan' },
  bulungan:{ name:'Kesultanan Bulungan', short:'Bulungan', color:'#8a9a4a', culture:'melayu', kind:'kerajaan', capital:'bulungan', title:'Sultan' },
  soppeng:{ name:'Kedatuan Soppeng', short:'Soppeng', color:'#b5524a', culture:'bugis', kind:'kerajaan', capital:'soppeng', title:'Datu' },
  bacan:{ name:'Kesultanan Bacan', short:'Bacan', color:'#3f9aa8', culture:'maluku', kind:'kerajaan', capital:'bacan', title:'Sultan' },
  adat:{ name:'Wilayah adat', short:'Wilayah adat', color:'#c8bfa6', culture:null, kind:'adat' }
};

/* Hubungan antarkerajaan pada 1830 (-100 sampai 100). Angka negatif yang besar bisa memicu perang antartetangga.
   Disusun dari persaingan dan persekutuan yang tercatat, misalnya persekutuan Tellumpoccoe (Bone, Soppeng, Wajo),
   persaingan Bone dan Gowa, Ternate dan Tidore, serta serangan kaum Padri ke Tanah Batak. */
const RELATIONS = [
  ['aceh','siak',-15],['aceh','batak',-10],['minang','batak',-35],['siak','indragiri',5],['riau','indragiri',20],['siak','riau',10],
  ['yogya','surakarta',0],['yogya','pakualaman',-10],['surakarta','mangkunegaran',-15],['yogya','mangkunegaran',-5],
  ['klungkung','gianyar',-25],['klungkung','karangasem',15],['klungkung','badung',25],['klungkung','bangli',10],['klungkung','tabanan',10],
  ['karangasem','buleleng',45],['karangasem','lombok',30],['badung','mengwi',-25],['tabanan','mengwi',-20],['gianyar','bangli',-30],['badung','tabanan',15],
  ['bima','sumbawa',-10],
  ['banjar','kutai',10],['banjar','pasir',15],['kutai','berau',-10],['berau','bulungan',-25],['sambas','pontianak',-20],['brunei','sambas',0],
  ['bone','gowa',-30],['bone','soppeng',45],['bone','wajo',30],['soppeng','wajo',30],['bone','luwu',-15],['wajo','luwu',10],['gowa','buton',-10],
  ['ternate','tidore',-30],['ternate','bacan',15],['tidore','bacan',-15]
];

/* Gubernur Jenderal Hindia Belanda (tahun mulai menjabat) */
const GOVERNORS = [
  [1830,'Johannes van den Bosch'],[1833,'Jean Chrétien Baud'],[1836,'Dominique Jacques de Eerens'],[1841,'Pieter Merkus'],[1845,'Jan Jacob Rochussen'],
  [1851,'Albertus Jacobus Duymaer van Twist'],[1856,'Charles Ferdinand Pahud'],[1861,'Ludolph Anne Jan Wilt Sloet van de Beele'],[1866,'Pieter Mijer'],
  [1872,'James Loudon'],[1875,'Johan Wilhelm van Lansberge'],[1881,"Frederik s'Jacob"],[1884,'Otto van Rees'],[1888,'Cornelis Pijnacker Hordijk'],
  [1893,'Carel Herman Aart van der Wijck'],[1899,'Willem Rooseboom'],[1904,'Joannes Benedictus van Heutsz'],[1909,'Alexander Willem Frederik Idenburg'],
  [1916,'Johan Paul van Limburg Stirum'],[1921,'Dirk Fock'],[1926,'Andries Cornelis Dirk de Graeff'],[1931,'Bonifacius Cornelis de Jonge'],
  [1936,'Alidius Warmoldus Lambertus Tjarda van Starkenborgh Stachouwer']
];

/* Penguasa kerajaan lain pada 1830 (hanya nama di layar diplomasi). Kerajaan yang tidak tercantum memakai nama rekaan. */
const AI_RULERS_1830 = {
  pontianak:'Sultan Syarif Usman', brunei:'Sultan Omar Ali Saifuddin II', bima:'Sultan Ismail Muhammad Syah', buton:'Sultan Muhammad Idrus Kaimuddin',
  riau:'Sultan Abdul Rahman Muazzam Syah', minang:'Tuanku Imam Bonjol', kutai:'Sultan Aji Muhammad Salehuddin', sambas:'Sultan Abubakar Tajuddin I'
};

/* Tokoh sejarah di istana kerajaan yang bisa dimainkan.
   b: tahun lahir, bp: tahun lahir berupa perkiraan, hd: tahun wafat menurut sejarah (bisa bergeser sedikit dalam permainan),
   ruler: penguasa pada 1830, heir: pewaris yang ditetapkan, spOf: pasangan dari tokoh lain, par: orang tua, born: lahir setelah 1830,
   role: peran di dewan (panglima, patih, duta), noble: bangsawan (bukan wangsa), full: nama lengkap untuk ditampilkan. */
const HIST_CHARS = {
  aceh: [
    { key:'daud', n:'Alauddin Muhammad Daud Syah', g:'L', b:1800, bp:true, hd:1838, ruler:true, mil:5, dip:6, adm:5, tr:['saleh'] },
    { key:'ibrahim', n:'Ibrahim', full:'Tuanku Ibrahim', g:'L', b:1805, bp:true, hd:1870, mil:7, dip:7, adm:6, tr:['cakap_perang','cerdik'], role:'panglima' },
    { key:'sulaiman', n:'Sulaiman', full:'Tuanku Sulaiman', g:'L', b:1836, bp:true, hd:1857, par:'daud', born:true, heir:true },
    { n:'Panglima Polem', full:'Panglima Polem (panglima sagi XXII Mukim)', g:'L', b:1790, bp:true, noble:true, mil:7, dip:4, adm:5, tr:['pemberani'] }
  ],
  yogya: [
    { key:'hb5', n:'Gathot Menol', g:'L', b:1820, hd:1855, ruler:true, mil:4, dip:6, adm:5, tr:['cerdik'] },
    { key:'kencono', n:'Kencono', full:'Gusti Kanjeng Ratu Kencono (ibu suri)', g:'P', b:1800, bp:true, hd:1859, mil:3, dip:7, adm:6, tr:['berwibawa'] },
    { key:'mustojo', n:'Mustojo', full:'Gusti Raden Mas Mustojo', g:'L', b:1821, hd:1877, heir:true, mil:5, dip:5, adm:6, tr:['cermat'] },
    { n:'Danurejo IV', full:'Kanjeng Raden Adipati Danurejo IV', g:'L', b:1790, bp:true, hd:1847, noble:true, role:'patih', mil:3, dip:6, adm:7, tr:['cermat'] },
    { n:'Mangkubumi', full:'Gusti Pangeran Haryo Mangkubumi', g:'L', b:1785, bp:true, noble:true, role:'duta', mil:5, dip:6, adm:5, tr:['berwibawa'] }
  ],
  bone: [
    { key:'salimah', n:'We Imaniratu Arung Data', full:'Sultanah Salimah Rajiatuddin (We Imaniratu Arung Data)', g:'P', b:1780, bp:true, hd:1835, ruler:true, mil:5, dip:6, adm:6, tr:['berwibawa'] },
    { key:'mappaseling', n:'La Mappaseling Arung Panynyili', g:'L', b:1790, bp:true, hd:1845, heir:true, mil:6, dip:5, adm:5, tr:['pemberani'], role:'panglima' },
    { key:'parenrengi', n:'La Parenrengi Arung Pugi', g:'L', b:1810, bp:true, hd:1857, mil:5, dip:6, adm:6, tr:['cerdik'] },
    { n:'We Tenriawaru Besse Kajuara', g:'P', b:1815, bp:true, hd:1871, spOf:'parenrengi', mil:7, dip:5, adm:5, tr:['pemberani'] }
  ],
  banjar: [
    { key:'adam', n:'Adam', full:'Sultan Adam al-Watsiq Billah', g:'L', b:1785, bp:true, hd:1857, ruler:true, mil:5, dip:6, adm:7, tr:['saleh','cermat'] },
    { key:'abdurrahman', n:'Abdurrahman', full:'Sultan Muda Abdurrahman', g:'L', b:1805, bp:true, hd:1852, par:'adam', heir:true, mil:4, dip:5, adm:5, tr:[] },
    { n:'Tamjidillah', full:'Pangeran Tamjidillah', g:'L', b:1817, hd:1867, par:'abdurrahman', mil:4, dip:6, adm:5, tr:['serakah'] },
    { n:'Hidayatullah', full:'Pangeran Hidayatullah', g:'L', b:1822, hd:1904, par:'abdurrahman', mil:6, dip:6, adm:6, tr:['berwibawa'] },
    { n:'Antasari', full:'Pangeran Antasari', g:'L', b:1809, hd:1862, noble:true, role:'panglima', mil:8, dip:6, adm:5, tr:['pemberani','cakap_perang'] }
  ],
  ternate: [
    { key:'zain', n:'Muhammad Zain', g:'L', b:1769, hd:1859, ruler:true, mil:4, dip:6, adm:5, tr:['saleh'] },
    { n:'Muhammad Arsyad', full:'Kaicil Muhammad Arsyad', g:'L', b:1810, bp:true, hd:1876, par:'zain', heir:true, mil:5, dip:5, adm:5, tr:[] }
  ],
  batak: [
    { key:'sohahuaon', n:'Ompu Sohahuaon', g:'L', b:1800, bp:true, hd:1867, ruler:true, mil:6, dip:6, adm:5, tr:['berwibawa'] },
    { n:'Patuan Bosar', full:'Patuan Bosar Ompu Pulo Batu', g:'L', b:1845, hd:1907, par:'sohahuaon', born:true, heir:true, mil:8, dip:6, adm:5, tr:['pemberani'] }
  ],
  klungkung: [
    { key:'putra2', n:'Putra', g:'L', b:1800, bp:true, hd:1850, ruler:true, mil:5, dip:6, adm:5, tr:['saleh'] },
    { n:'Istri Kanya', full:'Dewa Agung Istri Kanya', g:'P', b:1795, bp:true, hd:1868, role:'panglima', mil:8, dip:6, adm:6, tr:['pemberani','berwibawa'] }
  ],
  siak: [
    { key:'ismail', n:'Syarif Ismail', full:'Sultan Assyaidis Syarif Ismail Abdul Jalil Syaifuddin', g:'L', b:1800, bp:true, hd:1864, ruler:true, mil:4, dip:7, adm:6, tr:['cerdik'] },
    { n:'Syarif Kasim', full:'Tengku Syarif Kasim', g:'L', b:1835, bp:true, hd:1889, par:'ismail', born:true, heir:true, mil:5, dip:6, adm:6, tr:[] }
  ],
  gowa: [
    { key:'kumala', n:'I Kumala Karaeng Lembangparang', full:'Sultan Abdul Kadir Muhammad Aidid (I Kumala Karaeng Lembangparang)', g:'L', b:1805, bp:true, hd:1893, ruler:true, mil:6, dip:5, adm:6, tr:['berwibawa'] }
  ],
  surakarta: [
    { key:'pb7', n:'Malikis Solikin', g:'L', b:1796, hd:1858, ruler:true, mil:3, dip:7, adm:6, tr:['cerdik'] },
    { key:'kuseini', n:'Kuseini', full:'Gusti Raden Mas Kuseini', g:'L', b:1789, hd:1861, heir:true, mil:4, dip:6, adm:5, tr:[] },
    { n:'Duksino', full:'Raden Mas Duksino (putra Pakubuwono VI)', g:'L', b:1830, hd:1893, born:true, bm:12, mil:5, dip:6, adm:6, tr:['berwibawa'] },
    { n:'Sasradiningrat II', full:'Kanjeng Raden Adipati Sasradiningrat II', g:'L', b:1780, bp:true, hd:1846, noble:true, role:'patih', mil:3, dip:6, adm:7, tr:['cermat'] }
  ]
};

const PLAYABLE_ORDER = ['aceh','yogya','bone','banjar','ternate','batak','klungkung','siak','gowa','surakarta'];

const TRAITS = {
  cakap_perang:{n:'Cakap berperang', d:'Kepemimpinan perang +2', mil:2},
  cerdik:{n:'Cerdik', d:'Diplomasi +2', dip:2},
  cermat:{n:'Cermat mengelola', d:'Tata kelola +2', adm:2},
  saleh:{n:'Saleh', d:'Legitimasi +1 per tahun', legit:1},
  berwibawa:{n:'Berwibawa', d:'Legitimasi +2 per tahun', legit:2},
  pemberani:{n:'Pemberani', d:'Kekuatan tempur +10 persen', battle:0.1},
  peragu:{n:'Peragu', d:'Kekuatan tempur -10 persen', battle:-0.1},
  boros:{n:'Boros', d:'Penghasilan -10 persen', income:-0.1},
  pemarah:{n:'Pemarah', d:'Diplomasi -2', dip:-2},
  pembaharu:{n:'Pembaharu', d:'Sekolah lebih murah, mutu pasukan lebih mudah naik', reform:true},
  serakah:{n:'Serakah', d:'Kesetiaan bangsawan turun setiap tahun', greed:true},
  lemah:{n:'Sakit-sakitan', d:'Umur lebih pendek', frail:true}
};
const GOOD_TRAITS = ['cakap_perang','cerdik','cermat','saleh','berwibawa','pemberani','pembaharu'];
const BAD_TRAITS = ['peragu','boros','pemarah','serakah','lemah'];

const BADGES = {
  tahun1:{n:'Titah Pertama', d:'Menyelesaikan tahun pertama pemerintahan.', g:'I'},
  generasi:{n:'Satu Generasi', d:'Bertahan hingga tahun 1860.', g:'XXX'},
  abad:{n:'Melintasi Abad', d:'Bertahan hingga tahun 1900.', g:'C'},
  fajar:{n:'Fajar 1945', d:'Kerajaan masih berdiri ketika permainan berakhir pada 1945.', g:'45'},
  saudagar:{n:'Saudagar Agung', d:'Kas kerajaan mencapai 2.500 gulden.', g:'f'},
  panglima:{n:'Panglima Tangguh', d:'Memenangkan 5 pertempuran dalam satu permainan.', g:'V'},
  tegak:{n:'Tak Tertaklukkan', d:'Memaksa Hindia Belanda berdamai setelah perang.', g:'!'},
  dinasti:{n:'Tiga Generasi', d:'Tiga raja dari wangsa yang sama memerintah dalam satu permainan.', g:'III'},
  pemersatu:{n:'Pemersatu', d:'Menguasai 10 wilayah sekaligus.', g:'10'},
  pelita:{n:'Pelita Bangsa', d:'Memiliki 5 sekolah di seluruh wilayah.', g:'5'},
  besan:{n:'Ikatan Darah', d:'Menjalin 2 pernikahan politik dalam satu permainan.', g:'oo'},
  merdeka:{n:'Lepas dari Belenggu', d:'Melepaskan diri dari status bawahan Hindia Belanda.', g:'*'}
};

const LEVELS = [0, 400, 1000, 1800, 2800, 4000, 5500, 7500, 10000];
