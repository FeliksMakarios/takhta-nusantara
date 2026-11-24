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

/* [id, nama, pulau, bujur, lintang, pemilik 1830, komoditas, penduduk (ribu), medan, petak khusus] */
const REGION_DEFS = [
  // Sumatra
  ['kutaraja','Aceh Besar','SUM',95,5,'aceh','lada',200,'pesisir'],
  ['pidie','Pidie','SUM',96.3,5,'aceh','lada',180,'dataran'],
  ['acehtimur','Aceh Timur','SUM',97.6,4.6,'aceh','lada',150,'pesisir'],
  ['meulaboh','Pantai Barat Aceh','SUM',95.6,3.8,'aceh','lada',100,'hutan'],
  ['gayo','Dataran Tinggi Gayo','SUM',97,3.4,'aceh','kopi',60,'pegunungan'],
  ['deli','Deli dan Asahan','SUM',99,3.4,'siak','tembakau',110,'pesisir'],
  ['batak','Tanah Batak','SUM',98.2,2,'batak','kemenyan',300,'pegunungan'],
  ['toba','Toba dan Samosir','SUM',99.4,1.6,'batak','beras',140,'pegunungan', [[99,2],[99,1]]],
  ['minang','Darek Minangkabau','SUM',100,0.3,'minang','kopi',400,'pegunungan'],
  ['padang','Padang','SUM',100.3,-1.3,'belanda','kopi',150,'pesisir'],
  ['siak','Siak','SUM',101.8,0.8,'siak','lada',160,'hutan'],
  ['jambi','Jambi','SUM',103,-1.5,'jambi','lada',120,'hutan'],
  ['bengkulu','Bengkulu','SUM',102.3,-3.6,'belanda','lada',90,'pesisir'],
  ['palembang','Palembang','SUM',104.5,-2.8,'belanda','lada',250,'dataran'],
  ['lampung','Lampung','SUM',104.3,-4.8,'adat','lada',100,'hutan'],
  ['riau','Riau-Lingga','RIAU',104.6,0.6,'riau','gambir',60,'pulau'],
  ['bangka','Bangka-Belitung','BBL',106,-2,'belanda','timah',50,'pulau'],
  // Jawa dan Madura
  ['banten','Banten','JAV',105.5,-6.8,'belanda','beras',300,'pesisir',[[105,-7],[106,-6],[106,-7]]],
  ['batavia','Batavia','JAV',107,-6,'belanda','gula',350,'pesisir',[[107,-6]]],
  ['priangan','Priangan','JAV',107.5,-7.5,'belanda','kopi',600,'pegunungan',[[107,-7],[108,-7],[108,-8]]],
  ['cirebon','Cirebon','JAV',108.6,-6.2,'belanda','gula',500,'pesisir',[[108,-6],[109,-6]]],
  ['banyumas','Banyumas','JAV',109,-7.6,'belanda','nila',400,'dataran',[[109,-7],[109,-8]]],
  ['semarang','Semarang','JAV',110,-6,'belanda','gula',500,'pesisir',[[110,-6]]],
  ['kedu','Kedu','JAV',110,-7,'belanda','kopi',350,'pegunungan',[[110,-7]]],
  ['rembang','Rembang','JAV',111,-6,'belanda','jati',350,'hutan',[[111,-6]]],
  ['yogyakarta','Mataram (Yogyakarta)','JAV',110,-8,'yogya','gula',450,'dataran',[[110,-8]]],
  ['gunungkidul','Gunungkidul','JAV',111,-8,'yogya','jati',150,'pegunungan',[[111,-8]]],
  ['surakarta','Surakarta','JAV',111,-7,'surakarta','gula',500,'dataran',[[111,-7]]],
  ['sukowati','Sukowati','JAV',112,-7,'surakarta','nila',200,'dataran',[[112,-7]]],
  ['kediri','Kediri','JAV',112,-8,'belanda','gula',450,'dataran',[[112,-8]]],
  ['surabaya','Surabaya','JAV',113,-7,'belanda','gula',550,'pesisir',[[113,-7]]],
  ['pasuruan','Pasuruan','JAV',113,-8,'belanda','kopi',400,'pegunungan',[[113,-8]]],
  ['besuki','Besuki','JAV',114,-7.5,'belanda','tembakau',250,'hutan',[[114,-7],[114,-8]]],
  ['madura','Madura','MAD',113.5,-6,'belanda','beras',450,'pulau'],
  // Bali dan Nusa Tenggara
  ['bali','Bali','BALI',115,-8,'klungkung','beras',600,'pegunungan'],
  ['lombok','Lombok','LOM',116,-9,'klungkung','beras',350,'pulau'],
  ['sumbawa','Sumbawa','SBW',117.4,-9,'bima','kuda',80,'pulau'],
  ['bima','Bima','SBW',118.8,-9,'bima','kuda',100,'pulau'],
  ['manggarai','Manggarai','FLO',120.5,-9,'bima','hutan',90,'pegunungan'],
  ['larantuka','Larantuka','FLO',122.6,-9,'portugis','cendana',60,'pesisir'],
  ['sumba','Sumba','SBA',119.5,-10,'adat','kuda',80,'pulau'],
  ['kupang','Kupang','TIM',123.6,-10,'belanda','cendana',80,'pesisir'],
  ['dili','Timor Timur','TIM',126,-9,'portugis','cendana',150,'pegunungan'],
  // Kalimantan
  ['sabah','Sabah','KAL',116.8,5.3,'brunei','hutan',40,'hutan'],
  ['brunei','Brunei','KAL',114.6,4.4,'brunei','dagang',50,'pesisir'],
  ['sarawak','Sarawak','KAL',111.5,2,'brunei','hutan',80,'hutan'],
  ['sambas','Sambas','KAL',109.5,1.2,'pontianak','emas',60,'pesisir'],
  ['pontianak','Pontianak','KAL',109.5,-0.3,'pontianak','dagang',90,'pesisir'],
  ['ketapang','Matan (Ketapang)','KAL',110.3,-1.8,'adat','hutan',40,'hutan'],
  ['kapuas','Kapuas Hulu','KAL',112.5,0.5,'adat','hutan',60,'hutan'],
  ['apokayan','Apo Kayan','KAL',115,2.5,'adat','hutan',40,'hutan'],
  ['bulungan','Bulungan','KAL',117.5,2.8,'adat','hutan',30,'pesisir'],
  ['kutai','Kutai','KAL',116.6,-0.3,'kutai','emas',80,'hutan'],
  ['barito','Barito','KAL',113.8,-1.2,'adat','hutan',70,'hutan'],
  ['kotawaringin','Kotawaringin','KAL',111.8,-2.6,'banjar','hutan',40,'hutan'],
  ['banjarmasin','Banjarmasin','KAL',114.4,-3.2,'banjar','emas',220,'pesisir'],
  ['hulusungai','Hulu Sungai','KAL',115.4,-2.2,'banjar','lada',180,'dataran'],
  // Sulawesi
  ['manado','Minahasa','SUL',124.6,1,'belanda','kopi',100,'pegunungan'],
  ['gorontalo','Gorontalo','SUL',122.6,1,'adat','emas',80,'pesisir'],
  ['kaili','Tanah Kaili','SUL',119.6,0,'adat','hutan',80,'hutan'],
  ['poso','Poso','SUL',121,-1,'adat','hutan',60,'hutan'],
  ['banggai','Banggai','SUL',123,-1,'ternate','dagang',40,'pulau'],
  ['mandar','Mandar','SUL',119,-2.2,'adat','dagang',120,'pesisir'],
  ['toraja','Tana Toraja','SUL',120,-2,'adat','kopi',150,'pegunungan'],
  ['luwu','Luwu','SUL',121.6,-2,'luwu','emas',120,'hutan'],
  ['ajatappareng','Ajatappareng','SUL',119,-3,'adat','beras',120,'dataran'],
  ['wajo','Wajo','SUL',120,-3,'wajo','dagang',180,'dataran'],
  ['soppeng','Soppeng','SUL',119,-4,'bone','beras',120,'dataran'],
  ['bone','Bone','SUL',120,-4,'bone','dagang',250,'pesisir'],
  ['makassar','Makassar','SUL',119,-5,'belanda','dagang',120,'pesisir'],
  ['gowa','Gowa','SUL',120,-5,'gowa','dagang',220,'dataran'],
  ['selayar','Selayar','SUL',120,-6,'gowa','dagang',50,'pulau'],
  ['konawe','Konawe','SUL',122.5,-3.5,'adat','hutan',70,'hutan'],
  ['buton','Buton','SUL',122.5,-5,'buton','dagang',90,'pulau'],
  // Maluku
  ['ternate','Ternate','TERN',127,1,'ternate','rempah',45,'pulau'],
  ['halut','Halmahera Utara','HALM',128.2,1.5,'ternate','rempah',60,'hutan'],
  ['tidore','Tidore','TIDO',127,0,'tidore','rempah',25,'pulau'],
  ['halsel','Halmahera Selatan','HALM',128.2,-0.5,'tidore','rempah',30,'hutan'],
  ['sula','Kepulauan Sula','SULA',125.5,-2,'ternate','hutan',25,'pulau'],
  ['buru','Buru','BURU',126,-3,'belanda','hutan',15,'pulau'],
  ['seram','Seram','SERAM',129,-3,'adat','rempah',50,'hutan'],
  ['ambon','Ambon','AMBON',128,-4,'belanda','rempah',50,'pulau'],
  ['banda','Banda','BANDA',130,-5,'belanda','rempah',8,'pulau'],
  ['kei','Kepulauan Kei','KEI',132,-6,'adat','hutan',25,'pulau'],
  ['aru','Kepulauan Aru','ARU',134,-6.5,'adat','dagang',20,'pulau'],
  ['tanimbar','Tanimbar','TANI',131,-8,'adat','hutan',20,'pulau'],
  // Papua
  ['rajaampat','Raja Ampat dan Sorong','PAP',131.5,-1.2,'tidore','dagang',30,'pulau'],
  ['kepalaburung','Kepala Burung','PAP',133.8,-1.4,'adat','hutan',40,'hutan'],
  ['onin','Onin (Fakfak)','PAP',133,-3,'tidore','rempah',25,'pesisir'],
  ['biak','Biak','BIAK',136,-1,'adat','dagang',30,'pulau'],
  ['teluk','Teluk Cenderawasih','PAP',136.2,-3.2,'adat','hutan',30,'hutan'],
  ['pantaiutara','Pantai Utara Papua','PAP',140,-2.6,'adat','hutan',40,'hutan'],
  ['pegunungan','Pegunungan Tengah','PAP',139,-4.2,'adat','hutan',60,'pegunungan'],
  ['mimika','Mimika','PAP',136,-4.8,'adat','hutan',25,'hutan'],
  ['asmat','Pantai Selatan (Asmat)','PAP',138.6,-6.3,'adat','hutan',30,'hutan'],
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
    blurb:'Kesultanan merdeka di ujung Sumatra. Kaya lada, berani, dan sejak lama dilirik Belanda.' },
  yogya:{ name:'Kesultanan Ngayogyakarta Hadiningrat', short:'Yogyakarta', color:'#a65a2a', culture:'jawa', kind:'kerajaan',
    playable:true, unlock:null, capital:'yogyakarta', kas:320, army:1500, quality:0.8, overlord:'belanda', rel:{belanda:25},
    title:'Sri Sultan', regnal:'Hamengkubuwono', startRegnal:5, bonus:{id:'keraton', n:'Keraton Agung', d:'Penduduk padat, wibawa keraton tinggi, tetapi harus membayar upeti kepada Belanda.'},
    blurb:'Keraton besar yang baru saja melewati Perang Jawa. Berstatus bawahan, wibawanya masih kuat.' },
  bone:{ name:'Kesultanan Bone', short:'Bone', color:'#c23b32', culture:'bugis', kind:'kerajaan',
    playable:true, unlock:null, capital:'bone', kas:320, army:2600, quality:0.9, rel:{belanda:5},
    title:'Arumpone', bonus:{id:'pelaut', n:'Pelaut Bugis', d:'Jangkauan laut lebih jauh dan penghasilan niaga naik 20 persen.'},
    blurb:'Kekuatan Bugis di Sulawesi Selatan. Kecil di darat, tetapi armada dagangnya menjangkau seluruh Nusantara.' },
  banjar:{ name:'Kesultanan Banjar', short:'Banjar', color:'#d9a21b', culture:'banjar', kind:'kerajaan',
    playable:true, unlock:{level:2}, capital:'banjarmasin', kas:360, army:2500, quality:0.9, rel:{belanda:10},
    title:'Sultan', bonus:{id:'tambang', n:'Tambang dan Sungai', d:'Emas, intan, dan lada memberi penghasilan 15 persen lebih besar.'},
    blurb:'Kerajaan sungai di Kalimantan Selatan dengan tambang emas dan intan yang menggiurkan.' },
  klungkung:{ name:'Kerajaan Klungkung', short:'Klungkung', color:'#8a4fb0', culture:'bali', kind:'kerajaan',
    playable:true, unlock:{badge:'generasi'}, capital:'bali', kas:260, army:3200, quality:0.9, rel:{belanda:0},
    title:'Dewa Agung', bonus:{id:'puputan', n:'Semangat Puputan', d:'Pertahanan di ibu kota jauh lebih kuat dan legitimasi sulit runtuh.'},
    blurb:'Penguasa tertinggi raja-raja Bali, juga membawahi Lombok. Penduduknya padat dan setia.' },
  siak:{ name:'Kesultanan Siak Sri Indrapura', short:'Siak', color:'#2a77b4', culture:'melayu', kind:'kerajaan',
    playable:true, unlock:{badge:'saudagar'}, capital:'siak', kas:360, army:1100, quality:0.85, rel:{belanda:10},
    title:'Sultan', bonus:{id:'bandar', n:'Bandar Selat', d:'Dekat dengan Selat Malaka. Semua penghasilan niaga naik 15 persen.'},
    blurb:'Kesultanan Melayu di tepi Selat Malaka yang juga membawahi Deli.' },
  ternate:{ name:'Kesultanan Ternate', short:'Ternate', color:'#169c86', culture:'maluku', kind:'kerajaan',
    playable:true, unlock:{level:3}, capital:'ternate', kas:300, army:900, quality:0.85, rel:{belanda:15},
    title:'Sultan', bonus:{id:'rempah', n:'Kuasa Rempah', d:'Harga rempah lebih tinggi dan jangkauan laut lebih jauh.'},
    blurb:'Pewaris kejayaan rempah Maluku dengan wilayah yang tersebar di banyak pulau.' },
  surakarta:{ name:'Kasunanan Surakarta Hadiningrat', short:'Surakarta', color:'#6e4a3a', culture:'jawa', kind:'kerajaan',
    playable:true, unlock:{badge:'dinasti'}, capital:'surakarta', kas:360, army:1500, quality:0.8, overlord:'belanda', rel:{belanda:30},
    title:'Sri Susuhunan', regnal:'Pakubuwono', startRegnal:7, bonus:{id:'diplomasi', n:'Diplomasi Halus', d:'Peluang berhasil dalam diplomasi naik dan hubungan dengan Belanda lebih mudah dijaga.'},
    blurb:'Saudara tua Yogyakarta. Berstatus bawahan Belanda dan pandai bermain di belakang layar.' },
  gowa:{ name:'Kesultanan Gowa', short:'Gowa', color:'#b23a78', culture:'makassar', kind:'kerajaan',
    playable:true, unlock:{badge:'panglima'}, capital:'gowa', kas:300, army:1400, quality:0.9, rel:{belanda:-5},
    title:'Somba', bonus:{id:'benteng', n:'Benteng Makassar', d:'Semua wilayah dimulai dengan benteng tingkat 2.'},
    blurb:'Bekas kekuatan laut terbesar di timur, kini bertetangga langsung dengan benteng Belanda di Makassar.' },
  batak:{ name:'Tanah Batak (Sisingamangaraja)', short:'Batak', color:'#4b5aa0', culture:'batak', kind:'kerajaan',
    playable:true, unlock:{level:4}, capital:'batak', kas:160, army:2200, quality:0.85, rel:{belanda:0},
    title:'Raja', regnal:'Sisingamangaraja', startRegnal:11, bonus:{id:'tanahtinggi', n:'Tanah Tinggi', d:'Pegunungan memberi pertahanan tambahan dan Belanda lebih lama melirik wilayah ini.'},
    blurb:'Pemimpin spiritual dan politik orang Batak di pedalaman Sumatra Utara yang sulit dijangkau.' },

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
  adat:{ name:'Wilayah adat', short:'Wilayah adat', color:'#c8bfa6', culture:null, kind:'adat' }
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
