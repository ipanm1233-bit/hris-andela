// js/form-builder.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAyFFFuXdnTUpxw9wW4uPKwqyeSpZNilRE",
    authDomain: "andela-hris.firebaseapp.com",
    projectId: "andela-hris",
    storageBucket: "andela-hris.firebasestorage.app",
    messagingSenderId: "504290269212",
    appId: "1:504290269212:web:830f76268842c38ad267d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. RBAC (Keamanan) ---
    const role = (localStorage.getItem("userRole") || "").toUpperCase();
    const jabatan = (localStorage.getItem("userJabatan") || "").toUpperCase();
    
    // Hanya HRD yang boleh mengakses halaman ini
    if (!role.includes("HRD") && !jabatan.includes("HR")) {
        alert("Akses Ditolak! Hanya administrator HRD yang dapat mengakses halaman Form Builder.");
        window.location.href = "dashboard.html";
        return;
    }

    // --- 2. LOGIKA BUILDER KOLOM DINAMIS ---
    const kolomContainer = document.getElementById("kolomContainer");
    const btnTambahKolom = document.getElementById("btnTambahKolom");

    let kolomCount = 0;

    // Fungsi Render Satu Baris Kolom
    function tambahBarisKolom() {
        kolomCount++;
        const idRow = `row-${kolomCount}`;
        const html = `
            <div id="${idRow}" class="flex gap-2 items-end bg-white p-3 rounded border border-gray-200 shadow-sm relative">
                <div class="flex-1">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase">Label / Pertanyaan</label>
                    <input type="text" class="input-label w-full p-2 border border-gray-300 rounded text-sm" placeholder="Contoh: Alasan Cuti">
                </div>
                <div class="w-32">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase">Tipe Input</label>
                    <select class="input-tipe w-full p-2 border border-gray-300 rounded text-sm">
                        <option value="text">Teks Singkat</option>
                        <option value="textarea">Teks Panjang</option>
                        <option value="number">Angka / Nominal</option>
                        <option value="date">Tanggal</option>
                        <option value="time">Jam / Waktu</option>
                        <option value="select">Pilihan (Dropdown)</option>
                    </select>
                </div>
                <div class="w-64 hidden input-opsi-container">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase">Opsi Pilihan (Pisahkan Koma)</label>
                    <input type="text" class="input-opsi w-full p-2 border border-gray-300 rounded text-sm" placeholder="Opsi A, Opsi B">
                </div>
                <div class="flex items-center pb-2 pl-2">
                    <input type="checkbox" class="input-wajib mr-1"> <span class="text-xs text-gray-600">Wajib Diisi</span>
                </div>
                <button onclick="document.getElementById('${idRow}').remove()" class="text-red-500 hover:text-red-700 pb-2 pl-2 text-sm font-bold">X</button>
            </div>
        `;
        kolomContainer.insertAdjacentHTML("beforeend", html);

        // Tampilkan/Sembunyikan kolom "Opsi Pilihan" jika tipe = select
        const rowElement = document.getElementById(idRow);
        const selectTipe = rowElement.querySelector('.input-tipe');
        const containerOpsi = rowElement.querySelector('.input-opsi-container');
        
        selectTipe.addEventListener('change', (e) => {
            if(e.target.value === 'select') containerOpsi.classList.remove('hidden');
            else containerOpsi.classList.add('hidden');
        });
    }

    btnTambahKolom.addEventListener("click", tambahBarisKolom);
    
    // Tambahkan 1 baris default saat halaman dimuat
    tambahBarisKolom();


    // --- 3. SIMPAN FORM RAKITAN KE DATABASE ---
    document.getElementById("btnSimpanForm").addEventListener("click", async () => {
        const idForm = document.getElementById("fbIdForm").value.trim().toUpperCase();
        const namaForm = document.getElementById("fbNamaForm").value.trim();
        const tipeForm = document.getElementById("fbTipeForm").value.trim().toUpperCase();
        const rawApproval = document.getElementById("fbApproval").value.trim().toUpperCase();

        if(!idForm || !namaForm) {
            alert("ID Form dan Nama Form wajib diisi!");
            return;
        }

        // Susun array Approval Flow
        const approvalFlowArr = rawApproval ? rawApproval.split(',').map(s => s.trim()) : ["HRD"];

        // Ekstrak data dari baris-baris kolom yang dibuat
        let detailArr = [];
        const barisKolom = document.querySelectorAll("#kolomContainer > div");
        
        barisKolom.forEach(row => {
            const label = row.querySelector(".input-label").value.trim();
            const type = row.querySelector(".input-tipe").value;
            const required = row.querySelector(".input-wajib").checked;
            
            if(label) {
                let colObj = { label, type, required };
                if (type === 'select') {
                    const rawOpsi = row.querySelector(".input-opsi").value;
                    colObj.options = rawOpsi ? rawOpsi.split(',').map(s => s.trim()) : [];
                }
                detailArr.push(colObj);
            }
        });

        // Simpan ke Firestore (master_form)
        try {
            document.getElementById("btnSimpanForm").innerText = "Menyimpan...";
            
            const payload = {
                ID_Form: idForm,
                Nama_Form: namaForm,
                Tipe_Form: tipeForm,
                Allowed_Roles: ["ALL"],
                ApprovalFlowJson: JSON.stringify(approvalFlowArr),
                DetailJSON: JSON.stringify(detailArr), // Wajib jadi JSON String
                isActive: true
            };

            await setDoc(doc(db, "master_form", idForm), payload);
            alert("Berhasil! Formulir telah ditambahkan ke Katalog Pengajuan.");
            
            // Reset input
            document.getElementById("fbIdForm").value = "";
            document.getElementById("fbNamaForm").value = "";
            kolomContainer.innerHTML = "";
            tambahBarisKolom();
            
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan form ke database.");
        } finally {
            document.getElementById("btnSimpanForm").innerText = "Simpan ke Database Formulir";
        }
    });


    // ====================================================================
    // 4. TOMBOL RAHASIA: GENERATOR FORM ISO MASSAL
    // ====================================================================
    const btnSuntikISO = document.getElementById("btnSuntikISO");
    
    // Database Skema Master Form ISO CV Andela Jaya
    const defaultISOForms = [
        {
            ID_Form: "F-HR-CUTI", Nama_Form: "Pengajuan Cuti / Izin / Sakit", Tipe_Form: "CUTI", Allowed_Roles: ["ALL"],
            ApprovalFlowJson: JSON.stringify(["ATASAN", "HRD"]), isActive: true,
            DetailJSON: JSON.stringify([
                { label: "Jenis Pengajuan", type: "select", options: ["Cuti Tahunan", "Cuti Khusus", "Sakit (Keterangan Dokter)", "Sakit (Tanpa Keterangan)", "Izin Terlambat", "Izin Pulang Cepat", "Izin Keluar Kantor", "Cuti Bersama"], required: true },
                { label: "Tanggal Mulai", type: "date", required: true },
                { label: "Tanggal Selesai", type: "date", required: true },
                { label: "Alasan / Keterangan Lengkap", type: "textarea", required: true }
            ])
        },
        {
            ID_Form: "F-OP-DINAS", Nama_Form: "Pengajuan Dinas Luar Kota", Tipe_Form: "DINAS", Allowed_Roles: ["ALL"],
            ApprovalFlowJson: JSON.stringify(["ATASAN", "HRD", "FINANCE"]), isActive: true,
            DetailJSON: JSON.stringify([
                { label: "Kota Tujuan Dinas", type: "text", required: true },
                { label: "Tanggal Berangkat", type: "date", required: true },
                { label: "Tanggal Kembali", type: "date", required: true },
                { label: "Tujuan / Agenda Dinas", type: "textarea", required: true },
                { label: "Estimasi Biaya / Cash Advance (Rp)", type: "number", required: true }
            ])
        },
        {
            ID_Form: "F-FIN-REIM", Nama_Form: "Pengajuan Reimbursement", Tipe_Form: "REIMBURSE", Allowed_Roles: ["ALL"],
            ApprovalFlowJson: JSON.stringify(["ATASAN", "FINANCE"]), isActive: true,
            DetailJSON: JSON.stringify([
                { label: "Kategori Reimburse", type: "select", options: ["Transportasi / Bensin", "Penginapan", "Medis / Kesehatan", "Entertain Klien", "Lainnya"], required: true },
                { label: "Nominal Klaim (Rp)", type: "number", required: true },
                { label: "Keterangan Pengeluaran", type: "textarea", required: true },
                { label: "Link Bukti Nota / Struk (G-Drive)", type: "text", required: true }
            ])
        },
        {
            ID_Form: "F-HR-LEMBUR", Nama_Form: "Perintah / Pengajuan Lembur", Tipe_Form: "LEMBUR", Allowed_Roles: ["ALL"],
            ApprovalFlowJson: JSON.stringify(["ATASAN", "HRD"]), isActive: true,
            DetailJSON: JSON.stringify([
                { label: "Tanggal Lembur", type: "date", required: true },
                { label: "Jam Mulai", type: "time", required: true },
                { label: "Jam Selesai", type: "time", required: true },
                { label: "Uraian Tugas / Target Lembur", type: "textarea", required: true }
            ])
        },
        {
            ID_Form: "F-GA-ASET", Nama_Form: "Peminjaman Inventaris Kendaraan/Barang", Tipe_Form: "ASET", Allowed_Roles: ["ALL"],
            ApprovalFlowJson: JSON.stringify(["ATASAN", "HRD"]), isActive: true,
            DetailJSON: JSON.stringify([
                { label: "Jenis Inventaris", type: "select", options: ["Kendaraan Operasional", "Laptop / IT", "Proyektor", "Alat Berat", "Lainnya"], required: true },
                { label: "Keterangan Barang yang Dipinjam", type: "text", required: true },
                { label: "Tanggal Mulai Pinjam", type: "date", required: true },
                { label: "Rencana Tanggal Pengembalian", type: "date", required: true }
            ])
        },
        {
            ID_Form: "F-HR-KPI", Nama_Form: "Evaluasi Kinerja Karyawan (KPI)", Tipe_Form: "EVALUASI", Allowed_Roles: ["MANAGER", "HRD"],
            ApprovalFlowJson: JSON.stringify(["HRD"]), isActive: true,
            DetailJSON: JSON.stringify([
                { label: "Nama Karyawan yang Dievaluasi", type: "text", required: true },
                { label: "Periode Penilaian", type: "select", options: ["Bulan Ini", "Q1", "Q2", "Q3", "Q4", "Tahunan"], required: true },
                { label: "Skor Kinerja (1-100)", type: "number", required: true },
                { label: "Catatan Evaluasi Atasan", type: "textarea", required: true }
            ])
        }
    ];

    if (btnSuntikISO) {
        btnSuntikISO.addEventListener("click", async () => {
            const konfirmasi = confirm("Sistem akan otomatis merakit 6 Form ISO standar (Cuti, Dinas, Lembur, Aset, Reimburse, KPI) ke database. Lanjutkan?");
            if (!konfirmasi) return;

            btnSuntikISO.innerText = "Sabar... Menyuntik data!";
            let sukses = 0;

            for (let form of defaultISOForms) {
                try {
                    await setDoc(doc(db, "master_form", form.ID_Form), form);
                    sukses++;
                } catch(e) { console.error("Gagal simpan:", form.ID_Form); }
            }

            alert(`Misi Berhasil! ${sukses} Formulir ISO telah mendarat di database. Silakan cek menu "Buat Pengajuan".`);
            btnSuntikISO.innerText = "🚀 Generate Default Form ISO";
            
            // Lempar HRD ke halaman pengajuan untuk melihat hasilnya
            window.location.href = "pengajuan.html";
        });
    }

});