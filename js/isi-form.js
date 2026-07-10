// js/isi-form.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
    
    // --- 1. OTENTIKASI & RBAC ---
    const userNIK = localStorage.getItem("userNIK");
    const namaKaryawan = localStorage.getItem("userNameLengkap");
    if (!userNIK) { window.location.href = "/index.html"; return; }

    const role = (localStorage.getItem("userRole") || "").toUpperCase();
    const jabatan = (localStorage.getItem("userJabatan") || "").toUpperCase();
    const isAtasan = localStorage.getItem("isAtasan") === "YES";
    
    if (role.includes("HRD") || jabatan.includes("HR")) {
        document.getElementById("menu-manajerial").classList.remove("hidden");
        document.getElementById("menu-hrd").classList.remove("hidden");
    } else if (role.includes("FINANCE") || role.includes("CASHIER") || role.includes("GM") || role.includes("SPV") || isAtasan) {
        document.getElementById("menu-manajerial").classList.remove("hidden");
    }

    const sidebar = document.getElementById('sidebar');
    document.getElementById('btnToggleSidebar')?.addEventListener('click', () => {
        if (window.innerWidth >= 1024) { sidebar.classList.toggle('lg:w-0'); sidebar.classList.toggle('lg:w-64'); }
        else { sidebar.classList.toggle('-translate-x-full'); document.getElementById('sidebarOverlay').classList.toggle('hidden'); }
    });


    // --- 2. AMBIL ID DARI URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('id'); // Contoh: F-ISO-01

    if (!formId) {
        document.getElementById("formLoader").classList.add("hidden");
        document.getElementById("errorState").classList.remove("hidden");
        return;
    }


    // --- 3. TARIK SKEMA FORM DARI FIREBASE ---
    const renderArea = document.getElementById("renderArea");
    let currentFormConfig = null;

    try {
        const docRef = doc(db, "master_form", formId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentFormConfig = docSnap.data();
            
            // Set Header Info
            document.getElementById("lblIdForm").innerText = currentFormConfig.ID_Form || formId;
            document.getElementById("lblNamaForm").innerText = currentFormConfig.Nama_Form || "Formulir";

            // Render Approval Flow 
            let flowArr = [];
            try {
                // Parsing jika format JSON string dari Excel
                flowArr = typeof currentFormConfig.ApprovalFlowJson === "string" 
                    ? JSON.parse(currentFormConfig.ApprovalFlowJson || "[]") 
                    : (currentFormConfig.ApprovalFlowJson || []);
            } catch (e) { flowArr = ["HRD"]; }
            
            const flowHtml = flowArr.map(f => `<span class="bg-white border border-gray-300 px-3 py-1 rounded shadow-sm">${f}</span>`).join('<span class="text-red-400">➔</span>');
            document.getElementById("approvalFlowArea").innerHTML = flowHtml || '<span class="italic text-gray-400">Tidak membutuhkan persetujuan (Auto-Approve)</span>';

            // Mesin Render Input Dinamis
            let detailFields = [];
            const rawDetail = currentFormConfig.DetailJSON;
            
            if (typeof rawDetail === 'string') {
                try {
                    detailFields = JSON.parse(rawDetail);
                } catch (e) {
                    console.error("Gagal mem-parsing JSON String:", e);
                    // Coba perbaikan jika string mengandung escape character yang salah
                    try {
                        detailFields = JSON.parse(rawDetail.replace(/\\"/g, '"').replace(/^"|"$/g, ''));
                    } catch(e2) {
                        renderArea.innerHTML = `<p class="text-red-500 italic">Format JSON tidak valid di database.</p>`;
                    }
                }
            } else if (Array.isArray(rawDetail)) {
                detailFields = rawDetail; // Sudah array
            } else if (typeof rawDetail === 'object' && rawDetail !== null) {
                // Jika tersimpan sebagai objek, kita jadikan array
                detailFields = Object.values(rawDetail);
            }
            
            // Lanjutkan proses render jika detailFields sudah terisi
            if (detailFields.length > 0) {
                renderArea.innerHTML = ""; 
                detailFields.forEach((field, index) => {
                    // ... (kode rendering input tetap sama seperti sebelumnya)
                    const reqStar = field.required ? '<span class="text-red-500 ml-1">*</span>' : '';
                    const fieldId = `input_${index}`;
                    let inputHtml = '';
            
                    if (field.type === "textarea") {
                        inputHtml = `<textarea id="${fieldId}" name="${field.label}" ${field.required ? 'required' : ''} class="w-full px-4 py-3 rounded-lg border border-gray-300"></textarea>`;
                    } else if (field.type === "select") {
                        // Pastikan options ada dan array
                        const opts = Array.isArray(field.options) ? field.options : [];
                        const options = opts.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                        inputHtml = `<select id="${fieldId}" name="${field.label}" class="w-full px-4 py-3 rounded-lg border border-gray-300"><option value="">-- Pilih --</option>${options}</select>`;
                    } else {
                        inputHtml = `<input type="${field.type || 'text'}" id="${fieldId}" name="${field.label}" class="w-full px-4 py-3 rounded-lg border border-gray-300">`;
                    }
                    
                    renderArea.insertAdjacentHTML("beforeend", `<div><label class="block text-sm font-bold text-gray-700 mb-1">${field.label} ${reqStar}</label>${inputHtml}</div>`);
                });
            }

            // Tampilkan Form, Hilangkan Loader
            document.getElementById("formLoader").classList.add("hidden");
            document.getElementById("formContainer").classList.remove("hidden");

        } else {
            throw new Error("Form tidak ditemukan di database.");
        }
    } catch (error) {
        console.error(error);
        document.getElementById("formLoader").classList.add("hidden");
        document.getElementById("errorState").classList.remove("hidden");
    }


    // --- 4. LOGIKA SUBMIT FORM KE DATA_PENGAJUAN ---
    const dynamicForm = document.getElementById("dynamicForm");
    const btnSubmit = document.getElementById("btnSubmitForm");

    if (dynamicForm) {
        dynamicForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            btnSubmit.innerText = "Memproses Pengajuan...";
            btnSubmit.disabled = true;

            try {
                // Kumpulkan semua data yang diisi
                let payloadDetail = {};
                const inputs = dynamicForm.querySelectorAll("input, textarea, select");
                inputs.forEach(input => {
                    if (input.name) {
                        payloadDetail[input.name] = input.value;
                    }
                });

                // Buat ID Transaksi Unik
                const transactionId = `TRX-${Date.now()}`;
                
                // Siapkan struktur untuk data_pengajuan
                const payloadFinal = {
                    ID: transactionId,
                    Tgl: new Date().toISOString(),
                    NIK: parseInt(userNIK) || userNIK,
                    NamaPemohon: namaKaryawan,
                    Form_ID: currentFormConfig.ID_Form || formId,
                    NamaForm: currentFormConfig.Nama_Form || "Formulir",
                    DetailJSON: JSON.stringify(payloadDetail), // Data isian masuk sini
                    ApprovalFlowJson: currentFormConfig.ApprovalFlowJson || "[]",
                    ApprovalStepsJSON: "[]", // Akan diisi saat persetujuan berjalan
                    StatusFinal: "PENDING",
                    CatatanPenolakan: ""
                };

                // Lempar ke Firestore
                await setDoc(doc(db, "data_pengajuan", transactionId), payloadFinal);
                
                alert("Pengajuan Berhasil Dikirim!");
                window.location.href = "dashboard.html"; // Balik ke halaman utama

            } catch (error) {
                console.error("Gagal submit:", error);
                alert("Terjadi kesalahan saat mengirim pengajuan. Periksa internet Anda.");
                btnSubmit.innerText = "Kirim Pengajuan";
                btnSubmit.disabled = false;
            }
        });
    }

});
