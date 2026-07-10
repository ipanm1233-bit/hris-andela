// =======================================================================
// 0. FUNGSI HELPER: SMART DATE PARSER (Anti-Error Format Indonesia)
// =======================================================================
function formatTanggalAkurat(tglMentah) {
    if (!tglMentah || tglMentah === "-" || tglMentah === "") return "-";
    
    let dateObj;
    let strTgl = String(tglMentah).split(' ')[0];
    
    // 1. Cek Angka Serial Excel
    if (!isNaN(tglMentah) && Number(tglMentah) > 20000) {
        dateObj = new Date((Number(tglMentah) - 25569) * 86400 * 1000);
    } else {
        // 2. Biarkan sistem baca format default Excel (Bulan/Hari/Tahun)
        dateObj = new Date(strTgl);
        
        // 3. Jika Error (Invalid Date), berarti itu format Indonesia (Hari/Bulan), putar urutannya
        if (isNaN(dateObj) && (strTgl.includes('/') || strTgl.includes('-'))) {
            let parts = strTgl.split(/[-/]/);
            if (parts.length === 3) dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
        }
    }

    if (!isNaN(dateObj) && dateObj.getFullYear() > 1970) {
        return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return tglMentah;
}

// =======================================================================
// FIREBASE INITIALIZATION & IMPORTS
// =======================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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

// =======================================================================
// MAIN DASHBOARD LOGIC
// =======================================================================
document.addEventListener("DOMContentLoaded", async () => {
    
    const userNIK = localStorage.getItem("userNIK");
    if (!userNIK) {
        alert("Sesi berakhir. Silakan login kembali.");
        window.location.href = "/index.html";
        return;
    }

    // Deklarasi global profil untuk modal
    window.profilKaryawanSaatIni = {};

    // 1. LOGIKA UI SIDEBAR & MENU (SAMA SEPERTI SEBELUMNYA)
    const sidebar = document.getElementById('sidebar');
    const btnToggle = document.getElementById('btnToggleSidebar');
    if(btnToggle) {
        btnToggle.addEventListener('click', () => {
            if (window.innerWidth >= 1024) { sidebar.classList.toggle('lg:w-0'); sidebar.classList.toggle('lg:w-64'); }
            else { sidebar.classList.toggle('-translate-x-full'); document.getElementById('sidebarOverlay').classList.toggle('hidden'); }
        });
    }

    // HAK AKSES RBAC
    const role = (localStorage.getItem("userRole") || "").toUpperCase();
    const jabatan = (localStorage.getItem("userJabatan") || "").toUpperCase();
    const isAtasan = localStorage.getItem("isAtasan") === "YES";
    
    if (role.includes("HRD") || jabatan.includes("HR")) {
        document.getElementById("menu-manajerial").classList.remove("hidden");
        document.getElementById("menu-hrd").classList.remove("hidden");
    } else if (role.includes("FINANCE") || role.includes("CASHIER") || role.includes("GM") || role.includes("SPV") || isAtasan) {
        document.getElementById("menu-manajerial").classList.remove("hidden");
    }

    try {
        // 2. TARIK DATA PROFIL & PARSING TANGGAL
        const docRef = doc(db, "master_karyawan", userNIK);
        const docSnap = await getDoc(docRef);

        let jatahTahunan = 0, jatahKhusus = 0, jatahAkumulasi = 0;
        let namaKaryawan = "Tanpa Nama";

        if (docSnap.exists()) {
            const data = docSnap.data();
            window.profilKaryawanSaatIni = data; 
            
            namaKaryawan = data.Nama_Karyawan || data.Nama || "Tanpa Nama";
            const inisial = namaKaryawan.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            document.getElementById("userNameDisplayTop").innerText = namaKaryawan;
            document.getElementById("userAvatarTop").innerText = inisial;
            document.getElementById("profAvatar").innerText = inisial;
            document.getElementById("profNama").innerText = namaKaryawan;
            document.getElementById("profJabatan").innerText = data.JABATAN || data.Jabatan || "-";
            document.getElementById("profNIK").innerText = data.NIK_Karyawan || data.NIK || userNIK;
            document.getElementById("profCabang").innerText = data.CABANG || data.Cabang || "-";
            
            // Render Tanggal Gabung dengan Smart Parser
            let tglMasuk = data.TANGGAL_JOIN || data.TanggalJoin || data['Tgl Join'];
            document.getElementById("profTglJoin").innerText = formatTanggalAkurat(tglMasuk);

            jatahTahunan = parseFloat(data.jatah_tahunan) || parseFloat(data.SisaCutiTahunan) || 0;
            jatahKhusus = parseFloat(data.jatah_khusus) || 0;
            jatahAkumulasi = parseFloat(data.jatah_akumulasi) || 0;
        }

        // 3. KALKULASI SISA CUTI 3 KARTU (SAMA SEPERTI SEBELUMNYA)
        let potongTahunan = 0, potongKhusus = 0, potongAkumulasi = 0;
        const qCuti = query(collection(db, "master_cuti"), where("Nama_Karyawan", "==", namaKaryawan));
        const snapCuti = await getDocs(qCuti);

        snapCuti.forEach(docCuti => {
            const cuti = docCuti.data();
            const jml = parseFloat(cuti.Count) || parseFloat(cuti.COUNT) || 0;
            const tipe = (cuti.Potong_Jatah || cuti['Potong Jatah'] || "").toUpperCase();
            if (tipe.includes("TAHUNAN")) potongTahunan += jml;
            else if (tipe.includes("KHUSUS")) potongKhusus += jml;
            else if (tipe.includes("AKUMULASI")) potongAkumulasi += jml;
        });

        document.getElementById("cutiTahunanDisplay").innerText = jatahTahunan - potongTahunan;
        document.getElementById("cutiKhususDisplay").innerText = jatahKhusus - potongKhusus;
        document.getElementById("cutiAkumulasiDisplay").innerText = jatahAkumulasi - potongAkumulasi;

        // 4. TABEL HISTORI
        const qHistory = query(collection(db, "data_pengajuan"), where("NIK", "in", [userNIK, parseInt(userNIK)])); 
        const historySnap = await getDocs(qHistory);
        const tbody = document.getElementById("tableRiwayatBody");
        
        if (historySnap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500 italic">Belum ada riwayat pengajuan.</td></tr>`;
        } else {
            let trHTML = "";
            let riwayatArr = [];
            historySnap.forEach(d => riwayatArr.push(d.data()));
            riwayatArr.sort((a, b) => new Date(b.Tgl) - new Date(a.Tgl));

            riwayatArr.slice(0, 5).forEach(item => {
                let status = item.StatusFinal || item['Status Final'] || "PENDING";
                let badge = status.includes("APPROVED") ? `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">${status}</span>` : 
                            (status.includes("REJECT") || status.includes("TOLAK")) ? `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">${status}</span>` : 
                            `<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">${status}</span>`;
                
                trHTML += `<tr class="hover:bg-gray-50 border-b border-gray-100">
                    <td class="px-6 py-4 text-gray-600">${formatTanggalAkurat(item.Tgl || item.TGL)}</td>
                    <td class="px-6 py-4"><p class="font-bold text-gray-800">${item.NamaForm || item['Nama Form']}</p></td>
                    <td class="px-6 py-4">${badge}</td>
                    <td class="px-6 py-4 text-right"><button class="text-red-600 hover:underline font-bold text-sm">Detail</button></td>
                </tr>`;
            });
            tbody.innerHTML = trHTML;
        }

    } catch (error) {
        console.error("Gagal menarik data:", error);
    }

    // ==========================================
    // 5. ENGINE MODAL (ANTI-BUG TAILWIND)
    // ==========================================
    function bukaModal(elemen) {
        if(!elemen) return;
        elemen.classList.remove("hidden");
        elemen.classList.add("flex");
        setTimeout(() => { if(elemen.children[0]) elemen.children[0].classList.replace("scale-95", "scale-100"); }, 10);
    }
    function tutupModal(elemen) {
        if(!elemen) return;
        if(elemen.children[0]) elemen.children[0].classList.replace("scale-100", "scale-95");
        setTimeout(() => { elemen.classList.add("hidden"); elemen.classList.remove("flex"); }, 300);
    }

    // Modal Akun
    document.getElementById("btnPengaturanAkun")?.addEventListener("click", () => bukaModal(document.getElementById("modalAkun")));
    document.getElementById("btnTutupModal")?.addEventListener("click", () => tutupModal(document.getElementById("modalAkun")));

    // Modal Profil Karyawan (Pojok Kanan Atas)
    document.getElementById("btnProfilTop")?.addEventListener("click", () => {
        const data = window.profilKaryawanSaatIni;
        document.getElementById("dtlNama").innerText = data.Nama_Karyawan || data.Nama || "-";
        document.getElementById("dtlNIK").innerText = data.NIK_Karyawan || userNIK;
        document.getElementById("dtlJabatan").innerText = data.JABATAN || data.Jabatan || "-";
        document.getElementById("dtlEmail").innerText = data.EMAIL || data.Email || "-";
        document.getElementById("dtlHP").innerText = data['NO HP AKTIF'] || data.NoHP || "-";
        document.getElementById("dtlAlamat").innerText = data.ALAMAT || data.Alamat || "-";
        document.getElementById("dtlPendidikan").innerText = data.PENDIDIKAN || "-";
        bukaModal(document.getElementById("modalProfilKu"));
    });
    document.getElementById("btnCloseProfil")?.addEventListener("click", () => tutupModal(document.getElementById("modalProfilKu")));

    // Modal Pengajuan Perubahan Data
    document.getElementById("btnBukaUpdateData")?.addEventListener("click", () => {
        tutupModal(document.getElementById("modalProfilKu"));
        setTimeout(() => bukaModal(document.getElementById("modalUpdateData")), 300);
    });
    document.getElementById("btnTutupUpdateData")?.addEventListener("click", () => tutupModal(document.getElementById("modalUpdateData")));

    // Submit Pengajuan Perubahan
    const btnKirimUpdate = document.getElementById("btnKirimUpdateData");
    if (btnKirimUpdate) {
        btnKirimUpdate.addEventListener("click", async () => {
            const alasan = document.getElementById("inputPerubahan").value.trim();
            if (!alasan) { alert("Isi perubahan yang diinginkan!"); return; }
            
            btnKirimUpdate.innerText = "Mengirim..."; btnKirimUpdate.disabled = true;
            try {
                const idForm = `REQ-UPD-${Date.now()}`; 
                await setDoc(doc(db, "data_pengajuan", idForm), {
                    ID: idForm, Tgl: new Date().toISOString(), NIK: parseInt(userNIK) || userNIK,
                    NamaPemohon: window.profilKaryawanSaatIni.Nama_Karyawan || window.profilKaryawanSaatIni.Nama,
                    Form_ID: "F-UPDATE-PROFIL", NamaForm: "Pengajuan Perubahan Data Diri",
                    DetailJSON: JSON.stringify({ rincian: alasan }),
                    ApprovalFlowJson: JSON.stringify(["HRD"]), ApprovalStepsJSON: JSON.stringify([]),
                    StatusFinal: "PENDING", CatatanPenolakan: ""
                });
                alert("Pengajuan terkirim ke HRD!");
                document.getElementById("inputPerubahan").value = "";
                tutupModal(document.getElementById("modalUpdateData"));
                window.location.reload();
            } catch (error) {
                alert("Gagal mengirim pengajuan.");
            } finally {
                btnKirimUpdate.innerText = "Kirim Pengajuan"; btnKirimUpdate.disabled = false;
            }
        });
    }

    // Modal Simpan Akun
    document.getElementById("btnSimpanAkun")?.addEventListener("click", async () => {
        const u = document.getElementById("newUsername").value.trim().toUpperCase();
        const p = document.getElementById("newPassword").value.trim();
        if(!u || !p) { alert("Isi semua kolom!"); return; }
        
        try {
            await updateDoc(doc(db, "user_accounts", localStorage.getItem("accountDocID")), { Username: u, Password: p });
            alert("Berhasil! Gunakan username baru saat login nanti.");
            tutupModal(document.getElementById("modalAkun"));
        } catch (e) { alert("Gagal ubah akun"); }
    });

    document.getElementById("btnLogout")?.addEventListener("click", () => {
        localStorage.clear(); window.location.href = "/index.html";
    });
});
