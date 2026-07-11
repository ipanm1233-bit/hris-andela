// js/views/form-builder.js
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const db = getFirestore();

// State management
let currentFormId = null;
let formsList = [];
let approvalFlow = [];
let fieldsList = [];

// DOM Elements
const formListContainer = document.getElementById('formListContainer');
const configContainer = document.getElementById('configContainer');
const btnNewForm = document.getElementById('btnNewForm');
const btnInitForm = document.getElementById('btnInitForm');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const btnDeleteForm = document.getElementById('btnDeleteForm');
const btnAddApproval = document.getElementById('btnAddApproval');
const approvalFlowRender = document.getElementById('approvalFlowRender');
const btnAddField = document.getElementById('btnAddField');
const fieldsContainer = document.getElementById('fieldsContainer');

// UI Init
const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
document.getElementById("builderDateDisplay").innerText = new Date().toLocaleDateString('id-ID', optionsDate);

// The extensive list of input types from your screenshot
const inputTypes = [
    { value: "text", label: "Teks Singkat" },
    { value: "textarea", label: "Teks Panjang" },
    { value: "number", label: "Angka" },
    { value: "date", label: "Tanggal" },
    { value: "time", label: "Jam" },
    { value: "select", label: "Dropdown" },
    { value: "file", label: "Upload Dokumen" },
    { value: "employee", label: "Pilih Karyawan" },
    { value: "vehicle", label: "Pilih Kendaraan" },
    { value: "asset", label: "Pilih Barang Aset" },
    { value: "table", label: "Tabel Multi-Baris (Klaim)" },
    { value: "period", label: "Dropdown Periode Otomatis" },
    { value: "multi_text", label: "Multi-Input: Teks" },
    { value: "multi_number", label: "Multi-Input: Angka / Nominal" },
    { value: "multi_date", label: "Multi-Input: Tanggal" },
    { value: "multi_employee", label: "Multi-Input: Pilih Karyawan" }
];

// --- 1. Fetch & Render Form List ---
async function fetchForms() {
    formListContainer.innerHTML = '<div class="p-4 text-center text-gray-400 text-xs italic">Memuat...</div>';
    try {
        const querySnapshot = await getDocs(collection(db, "master_form"));
        formsList = [];
        querySnapshot.forEach((doc) => {
            formsList.push({ id: doc.id, ...doc.data() });
        });
        renderFormList();
    } catch (error) {
        console.error("Error fetching forms:", error);
        formListContainer.innerHTML = '<div class="p-4 text-center text-red-500 text-xs">Gagal memuat data.</div>';
    }
}

function renderFormList() {
    formListContainer.innerHTML = '';
    if (formsList.length === 0) {
        formListContainer.innerHTML = '<div class="p-4 text-center text-gray-400 text-xs italic">Belum ada form.</div>';
        return;
    }

    formsList.forEach(form => {
        const name = form.Nama_Form || form.ID_Form || 'Undefined Form';
        const item = document.createElement('div');
        // Styling matches your sidebar screenshot
        item.className = `p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${currentFormId === form.id ? 'border-l-4 border-l-red-600 bg-red-50 font-bold text-red-700' : 'text-gray-700 font-medium'}`;
        item.innerHTML = `<p class="text-sm truncate">${name}</p>`;
        item.onclick = () => loadFormConfig(form.id);
        formListContainer.appendChild(item);
    });
}

// --- 2. Load Form Configuration ---
async function loadFormConfig(id) {
    currentFormId = id;
    renderFormList(); // Update active styling
    configContainer.classList.remove('hidden');
    btnDeleteForm.classList.remove('hidden');

    const form = formsList.find(f => f.id === id);
    if (!form) return;

    // Populate Basic Info
    document.getElementById('cfgNamaForm').value = form.Nama_Form || '';
    document.getElementById('cfgIdForm').value = form.ID_Form || form.id || '';
    document.getElementById('cfgIdForm').readOnly = true; // Don't allow changing ID of existing form easily
    document.getElementById('cfgTipeForm').value = form.Tipe_Form || '';
    
    // Parse Approval Flow
    try {
        approvalFlow = typeof form.ApprovalFlowJson === 'string' ? JSON.parse(form.ApprovalFlowJson) : (form.ApprovalFlowJson || []);
    } catch(e) { approvalFlow = []; }
    renderApprovalFlow();

    // Parse Fields (DetailJSON)
    try {
        let rawFields = form.DetailJSON;
        if(typeof rawFields === 'string') rawFields = JSON.parse(rawFields);
        fieldsList = Array.isArray(rawFields) ? rawFields : [];
    } catch(e) { fieldsList = []; }
    renderFields();
}

// --- 3. New Form Logic ---
function initNewForm() {
    currentFormId = null;
    renderFormList(); // Clear active styling
    configContainer.classList.remove('hidden');
    btnDeleteForm.classList.add('hidden');

    document.getElementById('cfgNamaForm').value = '';
    document.getElementById('cfgIdForm').value = `F-${Date.now().toString().slice(-6)}`;
    document.getElementById('cfgIdForm').readOnly = false;
    document.getElementById('cfgTipeForm').value = '';
    
    approvalFlow = [];
    renderApprovalFlow();
    
    fieldsList = [];
    renderFields();
}

btnNewForm.addEventListener('click', initNewForm);
btnInitForm.addEventListener('click', initNewForm);

// --- 4. Approval Flow Builder ---
function renderApprovalFlow() {
    approvalFlowRender.innerHTML = '';
    if (approvalFlow.length === 0) {
        approvalFlowRender.innerHTML = '<span class="text-xs italic text-gray-400">Tidak membutuhkan persetujuan (Auto-Approve)</span>';
        return;
    }

    approvalFlow.forEach((role, index) => {
        const node = document.createElement('div');
        node.className = 'flex items-center';
        node.innerHTML = `
            <div class="bg-white border border-gray-300 px-3 py-1.5 rounded-lg shadow-sm flex items-center text-sm font-bold text-gray-700">
                <span class="text-gray-400 mr-2 text-xs">${index + 1}.</span> ${role}
                <button type="button" class="ml-2 text-gray-400 hover:text-red-500" onclick="removeApprovalNode(${index})">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            ${index < approvalFlow.length - 1 ? '<svg class="w-4 h-4 mx-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : ''}
        `;
        approvalFlowRender.appendChild(node);
    });
}

window.removeApprovalNode = (index) => {
    approvalFlow.splice(index, 1);
    renderApprovalFlow();
};

btnAddApproval.addEventListener('click', () => {
    const role = document.getElementById('addRoleSelect').value;
    approvalFlow.push(role);
    renderApprovalFlow();
});

// --- 5. Field Builder (The complex part) ---
function createFieldHTML(field, index) {
    const safeId = field.id || field.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Generate Options Dropdown
    let typeOptions = '';
    inputTypes.forEach(t => {
        const selected = t.value === field.type ? 'selected' : '';
        typeOptions += `<option value="${t.value}" ${selected}>${t.label}</option>`;
    });

    return `
        <div class="field-item bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group mb-4" data-index="${index}">
            <div class="flex gap-4 items-start mb-3">
                <div class="flex-1">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Label / Pertanyaan</label>
                    <input type="text" class="f-label w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-red-500" value="${field.label || ''}" placeholder="Contoh: Alasan">
                </div>
                <div class="w-48">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipe Jawaban</label>
                    <select class="f-type w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-red-500 bg-white">
                        ${typeOptions}
                    </select>
                </div>
                <div class="flex items-center mt-6">
                    <label class="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                        <input type="checkbox" class="f-req w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mr-2" ${field.required ? 'checked' : ''}>
                        Wajib
                    </label>
                </div>
                <button type="button" class="mt-6 ml-2 text-gray-400 hover:text-red-600 transition" onclick="removeField(${index})">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            
            <p class="text-[10px] text-gray-400 font-mono mb-3">ID Unik: [${safeId}]</p>

            <!-- Extra Config based on type (Options/Logic) -->
            ${['select', 'period'].includes(field.type) ? `
                <div class="mt-3 bg-gray-50 p-3 rounded border border-gray-200">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Opsi (Pisahkan dengan koma)</label>
                    <input type="text" class="f-options w-full px-3 py-2 border border-gray-300 rounded text-sm" value="${(field.options || []).join(', ')}" placeholder="Opsi 1, Opsi 2, Opsi 3">
                </div>
            ` : ''}

            <!-- Advanced Logic Section (From your screenshot 2) -->
            <div class="mt-4 border border-orange-200 bg-orange-50/30 rounded-lg p-4">
                <p class="text-[10px] font-bold text-orange-600 uppercase mb-3 flex items-center">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Logika Dinamis & Kalkulasi Otomatis
                </p>
                <div class="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <label class="block text-[9px] font-bold text-gray-500 mb-1">Munculkan jika field berikut:</label>
                        <input type="text" class="f-show-if w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white" placeholder="Ketik ID Unik (Cth: akomodasi)" value="${field.logic_show_if || ''}">
                    </div>
                    <div>
                        <label class="block text-[9px] font-bold text-gray-500 mb-1">Bernilai:</label>
                        <input type="text" class="f-show-val w-full px-3 py-1.5 border border-gray-300 rounded text-xs bg-white" placeholder="Cth: Hotel" value="${field.logic_show_val || ''}">
                    </div>
                </div>
                <div>
                     <label class="block text-[9px] font-bold text-gray-500 mb-1">Rumus Otomatis (Gunakan tanda [] untuk ID Unik)</label>
                     <input type="text" class="f-calc w-full px-3 py-1.5 border border-green-200 rounded text-xs bg-green-50/50 text-green-800" placeholder="Cth: ([km_akhir] - [km_awal]) * (10000/25)" value="${field.logic_calc || ''}">
                </div>
            </div>
        </div>
    `;
}

function renderFields() {
    fieldsContainer.innerHTML = '';
    if (fieldsList.length === 0) {
        fieldsContainer.innerHTML = '<p class="text-center text-gray-400 text-sm italic py-4">Belum ada kolom isian. Klik "+ Tambah Field".</p>';
        return;
    }
    
    fieldsList.forEach((field, index) => {
        fieldsContainer.insertAdjacentHTML('beforeend', createFieldHTML(field, index));
    });

    // Attach event listeners for type changes to re-render that specific field block
    document.querySelectorAll('.f-type').forEach(select => {
        select.addEventListener('change', (e) => {
            syncFieldsListFromDOM(); // Save current state
            const index = e.target.closest('.field-item').dataset.index;
            fieldsList[index].type = e.target.value;
            renderFields(); // Re-render to show/hide options input
        });
    });
}

// Sync DOM values back to fieldsList array before saving or re-rendering
function syncFieldsListFromDOM() {
    const items = document.querySelectorAll('.field-item');
    let newFieldsList = [];
    items.forEach((item) => {
        const label = item.querySelector('.f-label').value;
        const type = item.querySelector('.f-type').value;
        const required = item.querySelector('.f-req').checked;
        
        let fieldData = { label, type, required };
        fieldData.id = label.toLowerCase().replace(/[^a-z0-9]/g, '_'); // Auto generate ID
        
        const optionsInput = item.querySelector('.f-options');
        if(optionsInput) {
            fieldData.options = optionsInput.value.split(',').map(s => s.trim()).filter(s => s);
        }

        // Advanced logic sync
        fieldData.logic_show_if = item.querySelector('.f-show-if').value;
        fieldData.logic_show_val = item.querySelector('.f-show-val').value;
        fieldData.logic_calc = item.querySelector('.f-calc').value;

        newFieldsList.push(fieldData);
    });
    fieldsList = newFieldsList;
}

window.removeField = (index) => {
    syncFieldsListFromDOM();
    fieldsList.splice(index, 1);
    renderFields();
};

btnAddField.addEventListener('click', () => {
    syncFieldsListFromDOM();
    fieldsList.push({ label: 'Pertanyaan Baru', type: 'text', required: false });
    renderFields();
});


// --- 6. Save Configuration ---
btnSaveConfig.addEventListener('click', async () => {
    syncFieldsListFromDOM();
    
    const namaForm = document.getElementById('cfgNamaForm').value.trim();
    const idForm = document.getElementById('cfgIdForm').value.trim().toUpperCase();
    const tipeForm = document.getElementById('cfgTipeForm').value.trim().toUpperCase();

    if (!namaForm || !idForm) {
        alert("Nama Form dan ID Form wajib diisi!");
        return;
    }

    btnSaveConfig.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Menyimpan...';
    btnSaveConfig.disabled = true;

    const payload = {
        ID_Form: idForm,
        Nama_Form: namaForm,
        Tipe_Form: tipeForm,
        ApprovalFlowJson: JSON.stringify(approvalFlow),
        DetailJSON: JSON.stringify(fieldsList),
        isActive: true
        // Note: Tembusan & Role allow list need dedicated DB fields if you want them functional in routing.
    };

    try {
        await setDoc(doc(db, "master_form", idForm), payload);
        alert("Konfigurasi Form berhasil disimpan!");
        await fetchForms(); // Refresh list
        loadFormConfig(idForm); // Reload saved config
    } catch (error) {
        console.error("Error saving form:", error);
        alert("Gagal menyimpan form. Periksa koneksi.");
    } finally {
        btnSaveConfig.innerHTML = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg> Simpan Konfigurasi';
        btnSaveConfig.disabled = false;
    }
});

// --- 7. Delete Form ---
btnDeleteForm.addEventListener('click', async () => {
    if(!currentFormId) return;
    if(!confirm("Anda yakin ingin menghapus formulir ini secara permanen?")) return;

    try {
        await deleteDoc(doc(db, "master_form", currentFormId));
        alert("Formulir berhasil dihapus.");
        initNewForm(); // Reset UI
        fetchForms(); // Refresh list
    } catch(error) {
        alert("Gagal menghapus formulir.");
    }
});

// Initial Fetch
fetchForms();
