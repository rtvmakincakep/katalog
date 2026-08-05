/**
 * A tiny, dependency-free PDF writer used to generate the built-in demo document.
 * Produces a valid PDF 1.4 file with multiple styled pages.
 */

type Accent = [number, number, number];

type SamplePage = {
  badge: string;
  title: string;
  intro: string;
  body: string[];
  accent: Accent;
};

const PW = 595;
const PH = 842;

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function circle(cx: number, cy: number, r: number) {
  const k = 0.5523 * r;
  return [
    `${cx - r} ${cy} m`,
    `${cx - r} ${cy + k} ${cx - k} ${cy + r} ${cx} ${cy + r} c`,
    `${cx + k} ${cy + r} ${cx + r} ${cy + k} ${cx + r} ${cy} c`,
    `${cx + r} ${cy - k} ${cx + k} ${cy - r} ${cx} ${cy - r} c`,
    `${cx - k} ${cy - r} ${cx - r} ${cy - k} ${cx - r} ${cy} c`,
    "f",
  ].join(" ");
}

function wrap(text: string, max: number) {
  const words = text.split(" ");
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      out.push(line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

function pageContent(p: SamplePage, index: number, total: number) {
  const [r, g, b] = p.accent;
  const ops: string[] = [];

  // paper
  ops.push(`q 1 1 1 rg 0 0 ${PW} ${PH} re f Q`);

  // header band + decorative circles
  ops.push(`q ${r} ${g} ${b} rg 0 662 ${PW} 180 re f Q`);
  ops.push(`q /GS1 gs 1 1 1 rg ${circle(505, 800, 120)} Q`);
  ops.push(`q /GS2 gs 1 1 1 rg ${circle(120, 672, 90)} Q`);
  ops.push(`q /GS1 gs 0 0 0 rg ${circle(430, 640, 60)} Q`);

  // badge pill
  ops.push(`q /GS3 gs 1 1 1 rg 48 776 ${18 + p.badge.length * 6.2} 22 re f Q`);
  ops.push(`BT /F2 10 Tf 1 1 1 rg 58 782 Td (${esc(p.badge.toUpperCase())}) Tj ET`);

  // title
  const titleLines = wrap(p.title, 30);
  titleLines.forEach((l, i) => {
    ops.push(`BT /F2 28 Tf 1 1 1 rg 48 ${734 - i * 32} Td (${esc(l)}) Tj ET`);
  });

  // intro paragraph
  ops.push(`BT /F1 12.5 Tf 0.35 0.36 0.44 rg 48 612 Td 18 TL`);
  wrap(p.intro, 74).forEach((l, i) => {
    ops.push(i === 0 ? `(${esc(l)}) Tj` : `T* (${esc(l)}) Tj`);
  });
  ops.push("ET");

  // body blocks
  let y = 548;
  p.body.forEach((para) => {
    const lines = wrap(para, 78);
    // accent bullet
    ops.push(`q ${r} ${g} ${b} rg ${circle(54, y + 4, 3.4)} Q`);
    ops.push(`BT /F1 11.5 Tf 0.16 0.17 0.24 rg 68 ${y} Td 17 TL`);
    lines.forEach((l, i) => ops.push(i === 0 ? `(${esc(l)}) Tj` : `T* (${esc(l)}) Tj`));
    ops.push("ET");
    y -= lines.length * 17 + 22;
  });

  // highlight card
  ops.push(`q /GS4 gs ${r} ${g} ${b} rg 48 ${y - 96} ${PW - 96} 86 re f Q`);
  ops.push(`q ${r} ${g} ${b} rg 48 ${y - 96} 4 86 re f Q`);
  ops.push(`BT /F2 12 Tf ${r * 0.6} ${g * 0.6} ${b * 0.6} rg 70 ${y - 38} Td (Tips) Tj ET`);
  ops.push(
    `BT /F1 11 Tf 0.25 0.26 0.34 rg 70 ${y - 58} Td (Geser halaman ke kiri atau kanan, atau tekan tombol panah.) Tj ET`,
  );
  ops.push(
    `BT /F1 11 Tf 0.25 0.26 0.34 rg 70 ${y - 76} Td (Gunakan mode Buku untuk membaca dua halaman sekaligus.) Tj ET`,
  );

  // footer
  ops.push(`q 0.88 0.88 0.92 rg 48 70 ${PW - 96} 1 re f Q`);
  ops.push(`BT /F1 9.5 Tf 0.55 0.56 0.62 rg 48 52 Td (LumenPDF - Demo Document) Tj ET`);
  ops.push(
    `BT /F2 9.5 Tf ${r} ${g} ${b} rg ${PW - 100} 52 Td (Halaman ${index} / ${total}) Tj ET`,
  );

  return ops.join("\n");
}

const PAGES: SamplePage[] = [
  {
    badge: "Selamat datang",
    title: "LumenPDF Reader",
    intro:
      "Pembaca PDF modern yang berjalan sepenuhnya di browser Anda. Tidak ada file yang diunggah ke server - semuanya diproses secara lokal dan privat.",
    body: [
      "Dokumen contoh ini dibuat langsung di dalam browser untuk memperlihatkan kemampuan pembaca: animasi balik halaman, mode gulir, panel thumbnail, pencarian teks, zoom, rotasi, dan tampilan layar penuh.",
      "Buka dokumen Anda sendiri lewat tombol Buka File di kanan atas, atau cukup seret dan lepas berkas PDF ke mana saja di halaman ini.",
      "Antarmuka menyesuaikan diri secara otomatis: di layar lebar Anda mendapat panel samping dan tampilan buku dua halaman, sedangkan di ponsel semuanya menjadi satu kolom penuh yang nyaman disentuh.",
    ],
    accent: [0.478, 0.361, 0.965],
  },
  {
    badge: "Fitur utama",
    title: "Membalik halaman terasa nyata",
    intro:
      "Animasi tiga dimensi dengan perspektif, bayangan dinamis, dan kilau cahaya membuat pengalaman membaca terasa seperti memegang buku sungguhan.",
    body: [
      "Mode Halaman menampilkan satu halaman penuh dengan efek balik 3D ke arah gerakan Anda.",
      "Mode Buku menyusun dua halaman berdampingan lengkap dengan lipatan tengah, cocok untuk layar lebar dan tablet.",
      "Mode Gulir memuat seluruh dokumen dalam satu aliran vertikal yang mulus, dengan pemuatan malas agar tetap ringan.",
      "Di perangkat sentuh, cukup geser ke kiri atau kanan. Di desktop gunakan tombol panah, spasi, atau roda gulir.",
    ],
    accent: [0.024, 0.714, 0.831],
  },
  {
    badge: "Navigasi",
    title: "Pintasan papan ketik",
    intro:
      "Semua kendali penting dapat diakses tanpa melepaskan tangan dari papan ketik.",
    body: [
      "Panah kanan atau spasi untuk halaman berikutnya, panah kiri untuk kembali.",
      "Tombol Home dan End melompat ke halaman pertama atau terakhir dokumen.",
      "Tombol plus dan minus untuk memperbesar dan memperkecil, angka 0 untuk mengembalikan ke ukuran pas.",
      "Huruf F untuk layar penuh, huruf T untuk membuka panel thumbnail, huruf D untuk mengubah tema terang atau gelap.",
    ],
    accent: [0.937, 0.325, 0.541],
  },
  {
    badge: "Privasi",
    title: "Dokumen Anda tetap milik Anda",
    intro:
      "Seluruh proses penguraian dan penggambaran halaman terjadi di dalam perangkat Anda menggunakan Web Worker.",
    body: [
      "Tidak ada permintaan jaringan yang mengirimkan isi dokumen ke luar. File hanya dibaca dari memori peramban.",
      "Karena berjalan di Web Worker, halaman berat sekalipun tidak membuat antarmuka tersendat.",
      "Tutup tab dan semua jejak dokumen hilang begitu saja - tidak ada penyimpanan tersembunyi.",
    ],
    accent: [0.055, 0.647, 0.435],
  },
  {
    badge: "Selesai",
    title: "Siap membaca dokumen Anda",
    intro:
      "Terima kasih sudah mencoba dokumen contoh ini. Sekarang giliran berkas PDF Anda sendiri.",
    body: [
      "Seret berkas PDF apa pun ke jendela ini untuk langsung membukanya.",
      "Gunakan panel thumbnail untuk melompat cepat ke bagian yang Anda cari.",
      "Kotak pencarian akan memindai teks di seluruh halaman dan menampilkan cuplikan konteksnya.",
      "Selamat membaca!",
    ],
    accent: [0.976, 0.451, 0.086],
  },
];

export function createSamplePdf(): Uint8Array {
  const n = PAGES.length;
  const fontRegular = 3 + n * 2;
  const fontBold = fontRegular + 1;
  const objs: string[] = [];

  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  objs.push(
    `<< /Type /Pages /Kids [${PAGES.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${n} >>`,
  );

  PAGES.forEach((p, i) => {
    const contentId = 4 + i * 2;
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> /ExtGState << /GS1 << /ca 0.13 >> /GS2 << /ca 0.18 >> /GS3 << /ca 0.25 >> /GS4 << /ca 0.08 >> >> >> /Contents ${contentId} 0 R >>`,
    );
    const stream = pageContent(p, i + 1, n);
    objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objs.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    out += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info << /Title (LumenPDF Demo) /Author (LumenPDF) >> >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}
