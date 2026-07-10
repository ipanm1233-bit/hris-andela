// js/pengajuan.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", async () => {
    
    // --- 1. OTENTIKASI & RBAC SEDERHANA ---
    const userNIK = localStorage.getItem("userNIK");
    if (!userNIK) {
        alert("Sesi berakhir. Silakan login kembali.");
        window.location.href = "/index.html";
        return;
    }

    // Set Tanggal Hari Ini di Header Kanan
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById("topDateDisplay").innerText = new Date().toLocaleDateString('id-ID', optionsDate);

    // Sidebar Hak Akses (Sama seperti dashboard)
    const role = (localStorage.getItem("userRole") || "").toUpperCase();
    const jabatan = (localStorage.getItem("userJabatan") || "").toUpperCase();
    const isAtasan = localStorage.getItem("isAtasan") === "YES";
    
    if (role.includes("HRD") || jabatan.includes("HR")) {
        document.getElementById("menu-manajerial").classList.remove("hidden");
        document.getElementById("menu-hrd").classList.remove("hidden");
    } else if (role.includes("FINANCE") || role.includes("CASHIER") || role.includes("GM") || role.includes("SPV") || isAtasan) {
        document.getElementById("menu-manajerial").classList.remove("hidden");
    }

    // Tombol Toggle Sidebar
    const sidebar = document.getElementById('sidebar');
    const btnToggle = document.getElementById('btnToggleSidebar');
    if(btnToggle) {
        btnToggle.addEventListener('click', () => {
            if (window.innerWidth >= 1024) { sidebar.classList.toggle('lg:w-0'); sidebar.classList.toggle('lg:w-64'); }
            else { sidebar.classList.toggle('-translate-x-full'); document.getElementById('sidebarOverlay').classList.toggle('hidden'); }
        });
    }

    // Tombol Logout
    document.getElementById("btnLogout")?.addEventListener("click", () => {
        localStorage.clear(); window.location.href = "/index.html";
    });

    // --- 2. TARIK DATA KATALOG FORM DARI FIREBASE ---
    const gridFormulir = document.getElementById("gridFormulir");
    const noResultState = document.getElementById("noResultState");
    const inputSearch = document.getElementById("inputSearchForm");
    
    // Array untuk menyimpan seluruh form di memori browser (agar search cepat)
    let katalogForm = [];

    try {
        const formSnap = await getDocs(collection(db, "master_form"));
        
        if (formSnap.empty) {
            gridFormulir.innerHTML = "";
            noResultState.classList.remove("hidden");
            noResultState.querySelector("h3").innerText = "Katalog Form Kosong";
            noResultState.querySelector("p").innerText = "Belum ada skema form yang dibuat oleh HRD.";
            return;
        }

        formSnap.forEach((doc) => {
            const data = doc.data();
            katalogForm.push({
                idDoc: doc.id,
                idForm: data.ID_Form || data.ID || doc.id,
                namaForm: data.Nama_Form || "Formulir Tanpa Nama",
                tipeForm: (data.Tipe_Form || "").toUpperCase(),
                isActive: data.isActive !== false // Default true
            });
        });

        // Tampilkan katalog setelah data ditarik
        renderKatalog(katalogForm);

    } catch (error) {
        console.error("Gagal menarik katalog form:", error);
        gridFormulir.innerHTML = `<div class="col-span-full p-4 bg-red-50 text-red-600 rounded-lg text-center border border-red-200">Terjadi kesalahan teknis saat memuat formulir. Periksa koneksi internet Anda.</div>`;
    }


    // --- 3. FUNGSI RENDER KARTU FORM ---
    function renderKatalog(dataArray) {
        gridFormulir.innerHTML = ""; // Bersihkan skeleton/loader
        
        if (dataArray.length === 0) {
            noResultState.classList.remove("hidden");
            noResultState.classList.add("flex");
        } else {
            noResultState.classList.add("hidden");
            noResultState.classList.remove("flex");
            
            dataArray.forEach(form => {
                // Jangan tampilkan form yang dinonaktifkan HRD
                if(!form.isActive) return;

                // Tentukan warna ikon berdasarkan tipe (Opsional, agar lebih berwarna)
                let iconColor = "text-red-500 bg-red-50 border-red-100";
                if(form.tipeForm.includes("CUTI") || form.tipeForm.includes("IZIN")) iconColor = "text-red-500 bg-red-50 border-red-100";
                else if(form.tipeForm.includes("REIMBURSE") || form.tipeForm.includes("KAS")) iconColor = "text-blue-500 bg-blue-50 border-blue-100";
                else if(form.tipeForm.includes("ASET") || form.tipeForm.includes("PINJAM")) iconColor = "text-purple-500 bg-purple-50 border-purple-100";
                else if(form.tipeForm.includes("DINAS")) iconColor = "text-green-500 bg-green-50 border-green-100";

                const cardHTML = `
                    <div class="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:border-red-400 transition-all duration-300 cursor-pointer group flex flex-col justify-between" onclick="window.location.href='isi-form.html?id=${form.idDoc}'">
                        <div>
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 border ${iconColor}">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <h3 class="font-extrabold text-gray-800 text-base leading-tight group-hover:text-red-600 transition-colors">${form.namaForm}</h3>
                        </div>
                        <div class="mt-6 flex justify-between items-end">
                            <span class="text-[10px] font-mono text-gray-400 uppercase tracking-widest">${form.idForm}</span>
                            <svg class="w-5 h-5 text-gray-300 group-hover:text-red-500 transition-colors transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                    </div>
                `;
                gridFormulir.insertAdjacentHTML("beforeend", cardHTML);
            });
        }
    }


    // --- 4. FITUR LIVE SEARCH ---
    if(inputSearch) {
        inputSearch.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase();
            const filteredData = katalogForm.filter(form => 
                form.namaForm.toLowerCase().includes(keyword) || 
                form.idForm.toLowerCase().includes(keyword)
            );
            renderKatalog(filteredData);
        });
    }

});